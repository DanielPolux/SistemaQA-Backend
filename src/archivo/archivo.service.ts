import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { access, unlink } from 'fs/promises';
import { join } from 'path';
import * as archiver from 'archiver';
import { Response } from 'express';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { Defecto } from '../defectos/entities/defecto.entity';
import { DefectoWordService, EvidenciaArchivo } from '../defectos/defecto-word.service';
import { UPLOADS_ROOT } from '../uploads/uploads.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';

interface FilaEjecucion {
  id: number;
  fecha: Date;
  resultado: string;
  ambiente: string;
  observaciones: string | null;
  evidencias: EvidenciaArchivo[] | null;
  caso_codigo: string;
  caso_titulo: string;
  tester_nombre: string | null;
}

interface FilaDefecto {
  id: number;
  codigo: string;
  codigo_proyecto: string | null;
  titulo: string;
  estado: string;
  severidad: string;
  prioridad: string;
  caso_codigo: string | null;
  creado_en: Date;
}

/**
 * Fase 3 — archivar proyecto: generar el paquete descargable (zip) y, una vez
 * confirmado que se descargó, purgar del disco los archivos de evidencia del
 * proyecto para liberar espacio. Los registros de BD (ejecuciones, defectos,
 * y las columnas `evidencias` con nombre/url) nunca se borran — solo los
 * archivos físicos bajo UPLOADS_ROOT.
 */
@Injectable()
export class ArchivoService {
  private readonly logger = new Logger(ArchivoService.name);

  constructor(
    @InjectRepository(Proyecto) private proyectosRepo: Repository<Proyecto>,
    @InjectRepository(Defecto) private defectosRepo: Repository<Defecto>,
    private defectoWordService: DefectoWordService,
    private auditoriaService: AuditoriaService,
  ) {}

  private async obtenerEjecuciones(proyectoId: number): Promise<FilaEjecucion[]> {
    return this.proyectosRepo.manager.query(
      `SELECT e.id, e.fecha, e.resultado, e.ambiente, e.observaciones, e.evidencias,
              cp.codigo_cp AS caso_codigo, cp.nombre AS caso_titulo,
              u.nombre || ' ' || u.apellido AS tester_nombre
         FROM ejecuciones_caso_prueba e
         JOIN casos_prueba cp ON cp.id = e.caso_prueba_id
         LEFT JOIN usuarios u ON u.id = e.tester_id
        WHERE e.proyecto_id = $1
        ORDER BY e.fecha`,
      [proyectoId],
    );
  }

  private async obtenerDefectos(proyectoId: number): Promise<FilaDefecto[]> {
    return this.proyectosRepo.manager.query(
      `SELECT d.id, d.codigo, d.codigo_proyecto, d.titulo, d.estado, d.severidad, d.prioridad,
              d.creado_en, cp.codigo_cp AS caso_codigo
         FROM defectos d
         LEFT JOIN casos_prueba cp ON cp.id = d.caso_prueba_id
        WHERE d.proyecto_id = $1
        ORDER BY d.creado_en`,
      [proyectoId],
    );
  }

  private async obtenerContextoDefecto(
    defectoId: number,
  ): Promise<{ evidencias: EvidenciaArchivo[]; observaciones: string | null }> {
    const filas: { evidencias: EvidenciaArchivo[] | null; observaciones: string | null }[] =
      await this.proyectosRepo.manager.query(
        `SELECT evidencias, observaciones FROM ejecuciones_caso_prueba WHERE defecto_id = $1 ORDER BY fecha DESC`,
        [defectoId],
      );
    return {
      evidencias: filas.flatMap((f) => f.evidencias ?? []),
      observaciones: filas.find((f) => f.observaciones)?.observaciones ?? null,
    };
  }

  /** Arma el CSV resumen del proyecto (casos ejecutados + defectos) — se incluye en el zip. */
  private construirManifiesto(ejecuciones: FilaEjecucion[], defectos: FilaDefecto[]): string {
    const csvEscape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas: string[] = [];

    lineas.push('=== EJECUCIONES ===');
    lineas.push(['Caso', 'Título del Caso', 'Fecha', 'Resultado', 'Ambiente', 'Tester', 'Observación', 'Evidencias'].map(csvEscape).join(','));
    for (const e of ejecuciones) {
      lineas.push([
        e.caso_codigo, e.caso_titulo, new Date(e.fecha).toLocaleString('es-PE'), e.resultado, e.ambiente,
        e.tester_nombre ?? '—', e.observaciones ?? '', (e.evidencias ?? []).map((ev) => ev.nombre).join('; '),
      ].map(csvEscape).join(','));
    }

    lineas.push('');
    lineas.push('=== DEFECTOS ===');
    lineas.push(['Código', 'Caso', 'Título', 'Estado', 'Severidad', 'Prioridad', 'Fecha Reporte'].map(csvEscape).join(','));
    for (const d of defectos) {
      lineas.push([
        d.codigo_proyecto ?? d.codigo, d.caso_codigo ?? '—', d.titulo, d.estado, d.severidad, d.prioridad,
        new Date(d.creado_en).toLocaleString('es-PE'),
      ].map(csvEscape).join(','));
    }

    // BOM para que Excel detecte UTF-8 y no rompa las tildes/ñ
    return '﻿' + lineas.join('\n');
  }

  /**
   * Genera el paquete completo del proyecto (evidencias originales + reportes Word
   * de cada defecto + manifiesto CSV) y lo transmite como zip directo a la respuesta
   * HTTP (sin guardarlo en disco). No borra nada — es solo la descarga.
   */
  async generarPaquete(proyectoId: number, res: Response): Promise<void> {
    const proyecto = await this.proyectosRepo.findOne({ where: { id: proyectoId } });
    if (!proyecto) throw new NotFoundException(`Proyecto #${proyectoId} no encontrado`);

    const [ejecuciones, defectos] = await Promise.all([
      this.obtenerEjecuciones(proyectoId),
      this.obtenerDefectos(proyectoId),
    ]);

    const slug = proyecto.nombre.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${slug || 'proyecto'}-paquete.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    // No relanzar el error dentro del listener: si un archivo de evidencia
    // faltara en disco (registro huérfano), archiver emite 'error' de forma
    // asíncrona -- relanzarlo ahí sería una excepción no capturada que tumba
    // todo el proceso Node, no solo esta descarga. Solo se loguea.
    archive.on('warning', (err) => this.logger.warn(`archiver warning (proyecto#${proyectoId}): ${err.message}`));
    archive.on('error', (err) => this.logger.error(`archiver error (proyecto#${proyectoId}): ${err.message}`));
    archive.pipe(res);

    archive.append(this.construirManifiesto(ejecuciones, defectos), { name: 'manifiesto.csv' });

    // Evidencias originales, organizadas por caso/ejecución. Se verifica que el
    // archivo exista antes de agregarlo -- un registro `evidencias` huérfano
    // (archivo ya borrado) no debe interrumpir el resto del paquete.
    for (const e of ejecuciones) {
      for (const ev of e.evidencias ?? []) {
        const rutaRelativa = ev.url.replace(/^\/api\/uploads\//, '');
        const rutaAbsoluta = join(UPLOADS_ROOT, rutaRelativa);
        try {
          await access(rutaAbsoluta);
          archive.file(rutaAbsoluta, { name: `evidencias/${e.caso_codigo}_ejec${e.id}/${ev.nombre}` });
        } catch {
          this.logger.warn(`Evidencia no encontrada en disco, se omite del paquete: ${rutaAbsoluta}`);
        }
      }
    }

    // Reportes Word de cada defecto (mismo formato que el botón "Word" de la lista)
    for (const d of defectos) {
      const defectoCompleto = await this.defectosRepo.findOne({ where: { id: d.id } });
      if (!defectoCompleto) continue;
      const { evidencias, observaciones } = await this.obtenerContextoDefecto(d.id);
      const buffer = await this.defectoWordService.generar(
        { ...defectoCompleto, proyectoNombre: proyecto.nombre, casoPruebaCodigo: d.caso_codigo } as any,
        evidencias,
        observaciones,
      );
      if (buffer) {
        archive.append(buffer, { name: `defectos/${d.codigo_proyecto ?? d.codigo}-reporte.docx` });
      }
    }

    await archive.finalize();
  }

  /**
   * Borra del disco los archivos de evidencia de todas las ejecuciones del
   * proyecto y marca el proyecto como archivado. Requiere confirmación
   * explícita del llamador (ver ArchivoController) — es irreversible.
   */
  async archivarEvidencias(proyectoId: number, usuarioId: number, usuarioNombre?: string): Promise<{ archivosEliminados: number }> {
    const proyecto = await this.proyectosRepo.findOne({ where: { id: proyectoId } });
    if (!proyecto) throw new NotFoundException(`Proyecto #${proyectoId} no encontrado`);
    if (proyecto.evidenciasArchivadasEn) {
      throw new BadRequestException('Las evidencias de este proyecto ya fueron archivadas anteriormente.');
    }

    const ejecuciones = await this.obtenerEjecuciones(proyectoId);
    let archivosEliminados = 0;

    for (const e of ejecuciones) {
      for (const ev of e.evidencias ?? []) {
        const rutaRelativa = ev.url.replace(/^\/api\/uploads\//, '');
        const rutaAbsoluta = join(UPLOADS_ROOT, rutaRelativa);
        try {
          await unlink(rutaAbsoluta);
          archivosEliminados++;
        } catch (err: any) {
          if (err?.code !== 'ENOENT') {
            this.logger.warn(`No se pudo borrar evidencia ${rutaAbsoluta}: ${err?.message ?? err}`);
          }
        }
      }
    }

    proyecto.evidenciasArchivadasEn = new Date();
    proyecto.evidenciasArchivadasPor = usuarioId;
    await this.proyectosRepo.save(proyecto);

    await this.auditoriaService.registrar({
      entidad: 'Proyecto',
      entidadId: proyectoId,
      usuarioId,
      usuarioNombre,
      accion: 'Evidencias Archivadas',
      campo: 'evidenciasArchivadasEn',
      valorNuevo: `${archivosEliminados} archivo(s) eliminado(s) del servidor`,
    });

    return { archivosEliminados };
  }
}
