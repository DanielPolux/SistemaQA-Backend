import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CicloPrueba, EstadoCiclo } from './entities/ciclo-prueba.entity';
import { CreateCicloPruebaDto } from './dto/create-ciclo-prueba.dto';
import { QueryCicloPruebaDto } from './dto/query-ciclo-prueba.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { userProjectFilter } from '../common/helpers/user-access.helper';
import { InformeCierreCiclo } from './entities/informe-cierre-ciclo.entity';
import { CerrarCicloDto } from './dto/cerrar-ciclo.dto';
import { MailService } from '../mail/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from 'docx';

@Injectable()
export class CiclosPruebaService {
  constructor(
    @InjectRepository(CicloPrueba)
    private repo: Repository<CicloPrueba>,
    @InjectRepository(InformeCierreCiclo)
    private informesRepo: Repository<InformeCierreCiclo>,
    private mailService: MailService,
    private auditoriaService: AuditoriaService,
  ) {}

  async findAll(query: QueryCicloPruebaDto, usuarioId?: number, esAdmin = true): Promise<PaginatedResponseDto<any>> {
    const pagina    = Number(query.pagina)    || 1;
    const porPagina = Number(query.porPagina) || 10;
    const skip      = (pagina - 1) * porPagina;

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoin('c.proyecto', 'p').addSelect(['p.nombre', 'p.codigo'])
      .leftJoin('c.creador',  'u').addSelect(['u.nombre', 'u.apellido'])
      .loadRelationCountAndMap('c.totalEjecuciones', 'c.ejecuciones')
      .orderBy('c.creadoEn', 'DESC')
      .skip(skip)
      .take(porPagina);

    if (query.proyectoId) qb.andWhere('c.proyectoId = :pid', { pid: query.proyectoId });
    if (query.estado)     qb.andWhere('c.estado = :estado', { estado: query.estado });

    if (!esAdmin && usuarioId) {
      qb.andWhere(userProjectFilter('c'), { uid: usuarioId });
    }

    const [items, total] = await qb.getManyAndCount();

    const datos = items.map(c => ({
      ...c,
      proyectoNombre:  c.proyecto?.nombre ?? null,
      proyectoCodigo:  c.proyecto?.codigo ?? null,
      creadoPorNombre: c.creador ? `${c.creador.nombre} ${c.creador.apellido}` : null,
      proyecto: undefined,
      creador:  undefined,
    }));


    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number): Promise<any> {
    const c = await this.repo.findOne({
      where: { id },
      relations: ['proyecto', 'creador'],
    });
    if (!c) throw new NotFoundException(`Ciclo #${id} no encontrado`);
    return {
      ...c,
      proyectoNombre:  c.proyecto?.nombre   ?? null,
      proyectoCodigo:  c.proyecto?.codigo   ?? null,
      creadoPorNombre: c.creador ? `${c.creador.nombre} ${c.creador.apellido}` : null,
      proyecto: undefined,
      creador:  undefined,
    };
  }

  async findActivoByProyecto(proyectoId: number): Promise<CicloPrueba | null> {
    return this.repo.findOne({
      where: { proyectoId, estado: EstadoCiclo.ACTIVO },
      order: { creadoEn: 'DESC' },
    });
  }

  async getCasosDeCiclo(cicloId: number): Promise<any[]> {
    return this.repo.manager.query(
      `WITH planificados AS (
         SELECT caso_prueba_id
         FROM ciclo_casos_planificados
         WHERE ciclo_id = $1
       ),
       -- Alcance del Plan de Pruebas vinculado al ciclo (si tiene uno): los
       -- casos de sus requerimientos, respetando la selección específica por
       -- requerimiento en plan_casos_prueba (si no hay override, van TODOS
       -- los casos de ese requerimiento -- ver planes-prueba.service.ts).
       plan_casos AS (
         SELECT DISTINCT cp2.id AS caso_prueba_id
         FROM ciclos_prueba c
         JOIN plan_requerimientos pr ON pr.plan_id = c.plan_prueba_id
         JOIN casos_prueba cp2       ON cp2.requerimiento_id = pr.requerimiento_id
         WHERE c.id = $1
           AND c.plan_prueba_id IS NOT NULL
           AND (
             NOT EXISTS (
               SELECT 1 FROM plan_casos_prueba pcp
               WHERE pcp.plan_id = pr.plan_id AND pcp.requerimiento_id = pr.requerimiento_id
             )
             OR EXISTS (
               SELECT 1 FROM plan_casos_prueba pcp
               WHERE pcp.plan_id = pr.plan_id AND pcp.caso_prueba_id = cp2.id
             )
           )
       ),
       ultima_ejec AS (
         SELECT DISTINCT ON (e.caso_prueba_id)
           e.caso_prueba_id,
           e.resultado,
           e.version,
           e.id          AS ejecucion_id,
           e.creado_en
         FROM ejecuciones_caso_prueba e
         WHERE e.ciclo_id = $1
         ORDER BY e.caso_prueba_id, e.creado_en DESC
       )
       SELECT
         cp.id,
         cp.codigo_cp          AS codigo,
         cp.nombre,
         cp.tipo,
         cp.prioridad,
         cp.estado,
         cp.descripcion,
         cp.pasos,
         cp.resultado_esperado AS "resultadoEsperado",
         cp.proyecto_id        AS "proyectoId",
         cp.requerimiento_id   AS "requerimientoId",
         r.codigo              AS "requerimientoCodigo",
         r.titulo              AS "requerimientoTitulo",
         r.estado              AS "requerimientoEstado",
         ue.resultado          AS "resultadoCiclo",
         ue.version            AS "ultimaVersion",
         (SELECT COUNT(*)::int FROM ejecuciones_caso_prueba ec
          WHERE ec.caso_prueba_id = cp.id AND ec.ciclo_id = $1) AS "totalEjecucionesCiclo",
         ue.ejecucion_id       AS "ejecucionId",
         ue.creado_en          AS "fechaEjecucion"
       FROM casos_prueba cp
       LEFT JOIN requerimientos r  ON r.id = cp.requerimiento_id
       LEFT JOIN planificados pl ON pl.caso_prueba_id = cp.id
       LEFT JOIN ultima_ejec ue  ON ue.caso_prueba_id = cp.id
       WHERE (
         -- 1) Selección explícita de re-ejecución (checklist al crear el ciclo)
         (EXISTS (SELECT 1 FROM planificados) AND pl.caso_prueba_id IS NOT NULL)
         OR
         -- 2) Ya tiene una ejecución registrada en este ciclo: se conserva
         --    aunque el alcance del plan haya cambiado después
         ue.caso_prueba_id IS NOT NULL
         OR
         -- 3) Sin selección explícita: alcance del Plan de Pruebas vinculado (si tiene)
         (NOT EXISTS (SELECT 1 FROM planificados)
          AND EXISTS (SELECT 1 FROM plan_casos)
          AND cp.id IN (SELECT caso_prueba_id FROM plan_casos))
         OR
         -- 4) Sin selección explícita ni plan con requerimientos: todos los casos del proyecto
         (NOT EXISTS (SELECT 1 FROM planificados)
          AND NOT EXISTS (SELECT 1 FROM plan_casos)
          AND cp.proyecto_id = (SELECT proyecto_id FROM ciclos_prueba WHERE id = $1))
       )
       ORDER BY cp.codigo_cp`,
      [cicloId],
    );
  }

  async getCasosPrevios(proyectoId: number): Promise<{ tieneHistorial: boolean; casos: any[] }> {
    const totalCiclos = await this.repo.count({ where: { proyectoId } });
    if (totalCiclos === 0) return { tieneHistorial: false, casos: [] };

    const casos: any[] = await this.repo.manager.query(
      `SELECT DISTINCT ON (cp.id)
          cp.id,
          cp.codigo_cp  AS codigo,
          cp.nombre,
          e.resultado,
          ci.nombre     AS "cicloNombre"
       FROM casos_prueba cp
       INNER JOIN ejecuciones_caso_prueba e  ON e.caso_prueba_id = cp.id
       INNER JOIN ciclos_prueba            ci ON ci.id            = e.ciclo_id
       WHERE cp.proyecto_id = $1
         AND e.resultado IN ('Aprobado','Fallido','Bloqueado','Omitido')
       ORDER BY cp.id, e.creado_en DESC`,
      [proyectoId],
    );

    return { tieneHistorial: casos.length > 0, casos };
  }

  async create(dto: CreateCicloPruebaDto, creadoPor: number): Promise<CicloPrueba> {
    const [proyecto] = await this.repo.manager.query(
      `SELECT estado FROM proyectos WHERE id = $1`,
      [dto.proyectoId],
    );
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const estadosPermitidos = ['Planificado', 'En Ejecución', 'Observado'];
    if (!estadosPermitidos.includes(proyecto.estado)) {
      throw new BadRequestException(
        `No se puede crear un ciclo para un proyecto en estado "${proyecto.estado}". ` +
        `El proyecto debe estar en estado Planificado, En Ejecución u Observado.`,
      );
    }

    const [{ total: totalReqs }] = await this.repo.manager.query(
      `SELECT COUNT(*)::int AS total FROM requerimientos WHERE proyecto_id = $1`,
      [dto.proyectoId],
    );
    if (totalReqs === 0) {
      throw new BadRequestException(
        'El proyecto no tiene requerimientos registrados. Crea al menos un requerimiento con su caso de prueba antes de generar un ciclo.',
      );
    }

    const reqsSinCasos: { codigo: string; titulo: string }[] = await this.repo.manager.query(
      `SELECT r.codigo, r.titulo
       FROM requerimientos r
       WHERE r.proyecto_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM casos_prueba cp WHERE cp.requerimiento_id = r.id
         )
       ORDER BY r.codigo`,
      [dto.proyectoId],
    );
    if (reqsSinCasos.length > 0) {
      const lista = reqsSinCasos.map(r => `${r.codigo} – ${r.titulo}`).join('; ');
      throw new BadRequestException(
        `Todos los requerimientos deben tener al menos un caso de prueba antes de crear un ciclo. ` +
        `Sin casos: ${lista}.`,
      );
    }

    const cicloActivo = await this.repo.findOne({
      where: { proyectoId: dto.proyectoId, estado: EstadoCiclo.ACTIVO },
    });
    if (cicloActivo) {
      throw new BadRequestException(
        `El proyecto ya tiene un ciclo activo: "${cicloActivo.nombre}". ` +
        `Debes cerrarlo antes de crear uno nuevo.`,
      );
    }

    // Resolve plan name if provided
    let planNombre: string | null = null;
    if (dto.planPruebaId) {
      const [planRow] = await this.repo.manager.query(
        `SELECT nombre FROM planes_prueba WHERE id = $1`, [dto.planPruebaId],
      );
      if (planRow) planNombre = planRow.nombre;
    }

    const { casosIds, ...cicloData } = dto;
    const ciclo = this.repo.create({
      ...cicloData,
      planPruebaId: dto.planPruebaId ?? null,
      planNombre,
      creadoPor,
      estado: EstadoCiclo.ACTIVO,
    });
    const saved = await this.repo.save(ciclo);

    // Auto-advance linked plan state to 'En ejecución'
    if (saved.planPruebaId) {
      await this.repo.manager.query(
        `UPDATE planes_prueba SET estado = 'En ejecución' WHERE id = $1 AND estado != 'Cerrado'`,
        [saved.planPruebaId],
      );
    }

    if (casosIds && casosIds.length > 0) {
      const { casos } = await this.getCasosPrevios(dto.proyectoId);
      const resultadoMap: Record<number, string> = Object.fromEntries(
        casos.map(c => [Number(c.id), c.resultado]),
      );
      for (const casoId of casosIds) {
        await this.repo.manager.query(
          `INSERT INTO ciclo_casos_planificados (ciclo_id, caso_prueba_id, resultado_anterior)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [saved.id, casoId, resultadoMap[casoId] ?? null],
        );
      }
    }

    return saved;
  }

  async update(id: number, dto: Partial<CreateCicloPruebaDto>): Promise<CicloPrueba> {
    const ciclo = await this.findOne(id);
    Object.assign(ciclo, dto);
    return this.repo.save(ciclo);
  }

  async cerrar(id: number, dto: CerrarCicloDto, usuarioId: number, usuarioNombre: string): Promise<any> {
    const ciclo = await this.findOne(id);
    const casos = await this.getCasosDeCiclo(id);
    if (!casos.length) {
      throw new BadRequestException('No se puede finalizar un ciclo sin casos de prueba.');
    }
    const pendientes = casos.filter(c => !c.resultadoCiclo).length;
    if (pendientes > 0) {
      throw new BadRequestException(`No se puede finalizar el ciclo: quedan ${pendientes} caso(s) pendientes.`);
    }
    const bloqueados = casos.filter(c => c.resultadoCiclo === 'Bloqueado').length;
    if (bloqueados > 0 && !dto.justificacionBloqueados?.trim()) {
      throw new BadRequestException('Debes justificar los casos bloqueados antes de finalizar el ciclo.');
    }
    const defectos = await this.getDefectosCiclo(id);
    const aprobados = casos.filter(c => c.resultadoCiclo === 'Aprobado').length;
    const fallidos = casos.filter(c => c.resultadoCiclo === 'Fallido').length;
    const omitidos = casos.filter(c => c.resultadoCiclo === 'Omitido').length;
    const criticosAltosAbiertos = defectos.filter(d => ['Crítico', 'Alto'].includes(d.severidad) && !['Cerrado', 'Rechazado'].includes(d.estado)).length;
    const resultadoGlobal = fallidos > 0 || bloqueados > 0 || criticosAltosAbiertos > 0
      ? 'No aprobado'
      : omitidos > 0 ? 'Aprobado con observaciones' : 'Aprobado';
    const ultimo = await this.informesRepo.findOne({ where: { cicloId: id }, order: { version: 'DESC' } });
    const resumen = {
      total: casos.length, aprobados, fallidos, bloqueados, omitidos,
      porcentajeAprobacion: Math.round(aprobados * 100 / casos.length),
      defectosAbiertos: defectos.filter(d => !['Cerrado', 'Rechazado'].includes(d.estado)).length,
      criticosAltosAbiertos,
      casos: casos.map(c => ({ codigo: c.codigo, nombre: c.nombre, resultado: c.resultadoCiclo, version: c.ultimaVersion })),
      defectos: defectos.map(d => ({ codigo: d.codigo, titulo: d.titulo, severidad: d.severidad, estado: d.estado })),
    };
    const informe = await this.informesRepo.save(this.informesRepo.create({
      cicloId: id, version: (ultimo?.version ?? 0) + 1, resultadoGlobal,
      recomendacionQa: dto.recomendacionQa, conclusionQa: dto.conclusionQa.trim(),
      justificacionBloqueados: dto.justificacionBloqueados?.trim() || null,
      resumen, generadoPor: usuarioId,
    }));
    ciclo.estado = EstadoCiclo.CERRADO;
    if (!ciclo.fechaFin) ciclo.fechaFin = new Date() as any;
    const saved = await this.repo.save(ciclo);
    await this.auditoriaService.registrar({ entidad: 'CicloPrueba', entidadId: id, usuarioId, usuarioNombre, accion: 'Cerrado', valorNuevo: `${resultadoGlobal} | ${dto.recomendacionQa} | Informe E${String(informe.version).padStart(2, '0')}` });
    await this.enviarInformeCierre(saved, informe).catch(() => undefined);
    return { ...saved, resultadoGlobal, recomendacionQa: informe.recomendacionQa, conclusionQa: informe.conclusionQa, informeVersion: informe.version, informeId: informe.id, resumen };
  }

  async listarInformes(cicloId: number): Promise<any[]> {
    const informes = await this.informesRepo.find({ where: { cicloId }, relations: ['generador'], order: { version: 'DESC' } });
    return informes.map(i => ({ ...i, generadoPorNombre: i.generador ? `${i.generador.nombre} ${i.generador.apellido}` : null, generador: undefined }));
  }

  async generarInformeWord(cicloId: number, informeId: number): Promise<{ buffer: Buffer; nombre: string }> {
    const ciclo = await this.findOne(cicloId);
    const informe = await this.informesRepo.findOne({ where: { id: informeId, cicloId }, relations: ['generador'] });
    if (!informe) throw new NotFoundException('Informe de cierre no encontrado');
    const r: any = informe.resumen;
    const filas = (items: any[][]) => new Table({ width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [2250, 6750], rows: items.map(([a, b]) => new TableRow({ children: [new TableCell({ width: { size: 2250, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: String(a), bold: true })] })] }), new TableCell({ width: { size: 6750, type: WidthType.DXA }, children: [new Paragraph(String(b ?? '—'))] })] })) });
    const titulo = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 }, children: [new TextRun({ text: t, bold: true, color: '1E3A5F' })] });
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'INFORME DE CIERRE DE CICLO DE PRUEBAS', bold: true, size: 32, color: '1E3A5F' })] }),
      titulo('IDENTIFICACIÓN'), filas([['Proyecto', `${ciclo.proyectoCodigo} - ${ciclo.proyectoNombre}`], ['Plan de pruebas', ciclo.planNombre], ['Ciclo', ciclo.nombre], ['Ambiente', ciclo.ambiente], ['Versión del informe', `E${String(informe.version).padStart(2, '0')}`], ['Fecha de cierre', new Date(informe.creadoEn).toLocaleString('es-PE')], ['Responsable del cierre', informe.generador ? `${informe.generador.nombre} ${informe.generador.apellido}` : '—']]),
      titulo('RESULTADO GLOBAL'), filas([['Resultado', informe.resultadoGlobal], ['Recomendación QA', informe.recomendacionQa], ['Aprobación', `${r.porcentajeAprobacion}%`], ['Casos aprobados', r.aprobados], ['Casos fallidos', r.fallidos], ['Casos bloqueados', r.bloqueados], ['Casos omitidos', r.omitidos], ['Defectos abiertos', r.defectosAbiertos], ['Críticos/altos abiertos', r.criticosAltosAbiertos]]),
      titulo('CONCLUSIÓN QA'), new Paragraph(informe.conclusionQa),
      ...(informe.justificacionBloqueados ? [titulo('JUSTIFICACIÓN DE BLOQUEOS'), new Paragraph(informe.justificacionBloqueados)] : []),
      titulo('CASOS DE PRUEBA'), ...r.casos.map((c: any) => new Paragraph(`${c.codigo} - ${c.nombre}: ${c.resultado} (${c.version ?? '—'})`)),
      titulo('DEFECTOS'), ...(r.defectos.length ? r.defectos.map((d: any) => new Paragraph(`${d.codigo} - ${d.titulo}: ${d.severidad} / ${d.estado}`)) : [new Paragraph('No se registraron defectos.')]),
    ] }] });
    return { buffer: await Packer.toBuffer(doc), nombre: `${ciclo.proyectoCodigo}-${ciclo.nombre}-INFORME-CIERRE-E${String(informe.version).padStart(2, '0')}.docx`.replace(/[^a-zA-Z0-9_.-]+/g, '-') };
  }

  private getDefectosCiclo(cicloId: number): Promise<any[]> {
    return this.repo.manager.query(`SELECT DISTINCT d.codigo_proyecto AS codigo, d.titulo, d.severidad, d.estado, u.email AS asignado_email FROM defectos d JOIN ejecuciones_caso_prueba e ON e.defecto_id = d.id LEFT JOIN usuarios u ON u.id = d.asignado_a WHERE e.ciclo_id = $1 ORDER BY d.codigo_proyecto`, [cicloId]);
  }

  private async enviarInformeCierre(ciclo: any, informe: InformeCierreCiclo): Promise<void> {
    const [proyecto] = await this.repo.manager.query(`SELECT p.codigo, p.nombre, jp.email AS jefe_proyecto_email, jq.email AS jefe_qa_email, rqa.email AS responsable_qa_email FROM proyectos p LEFT JOIN usuarios jp ON jp.id=p.jefe_proyecto_id LEFT JOIN usuarios jq ON jq.id=p.jefe_qa_id LEFT JOIN usuarios rqa ON rqa.id=p.responsable_qa_id WHERE p.id=$1`, [ciclo.proyectoId]);
    if (!proyecto?.jefe_proyecto_email) return;
    const defectos = await this.getDefectosCiclo(ciclo.id);
    const copia = [...new Set([proyecto.jefe_qa_email, proyecto.responsable_qa_email, ...defectos.map(d => d.asignado_email)].filter(Boolean))];
    const archivo = await this.generarInformeWord(ciclo.id, informe.id);
    await this.mailService.send({ to: proyecto.jefe_proyecto_email, cc: copia, subject: `[Cierre QA] ${proyecto.codigo} - ${ciclo.nombre}: ${informe.resultadoGlobal}`, html: `<p>Se finalizó el ciclo <strong>${ciclo.nombre}</strong>.</p><p><strong>Resultado:</strong> ${informe.resultadoGlobal}<br><strong>Recomendación QA:</strong> ${informe.recomendacionQa}</p><p>${informe.conclusionQa}</p>`, attachments: [{ filename: archivo.nombre, content: archivo.buffer }] });
    informe.correoEnviadoEn = new Date();
    await this.informesRepo.save(informe);
  }

  async reabrir(id: number): Promise<CicloPrueba> {
    const ciclo = await this.findOne(id);
    ciclo.estado = EstadoCiclo.ACTIVO;
    const saved = await this.repo.save(ciclo);

    // Auto-advance linked plan state to 'En ejecución'
    if (ciclo.planPruebaId) {
      await this.repo.manager.query(
        `UPDATE planes_prueba SET estado = 'En ejecución' WHERE id = $1 AND estado != 'Cerrado'`,
        [ciclo.planPruebaId],
      );
    }

    return saved;
  }

  async remove(id: number): Promise<void> {
    const ciclo = await this.findOne(id);
    await this.repo.remove(ciclo);
  }
}
