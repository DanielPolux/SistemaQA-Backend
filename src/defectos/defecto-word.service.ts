import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { imageSize } from 'image-size';
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer,
  Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';
import { Defecto } from './entities/defecto.entity';
import { UPLOADS_ROOT } from '../uploads/uploads.constants';

export interface EvidenciaArchivo {
  url: string;
  nombre: string;
}

type TipoImagenDocx = 'png' | 'jpg' | 'gif' | 'bmp';

const EXT_A_TIPO_DOCX: Record<string, TipoImagenDocx> = {
  png: 'png', jpg: 'jpg', jpeg: 'jpg', gif: 'gif', bmp: 'bmp',
};

const EVIDENCIA_MAX_ANCHO = 500;
const EVIDENCIA_MAX_ALTO  = 380;

/**
 * Genera el mismo reporte de defecto (.docx) que arma el botón "Word" del frontend
 * (ver word-export-defecto.service.ts), pero corriendo en Node para poder adjuntarlo
 * al correo automático de notificación. Lee las evidencias directo del disco
 * (UPLOADS_ROOT) en vez de hacer fetch — el backend ya tiene acceso local a esos
 * archivos, sin necesidad de ida y vuelta por HTTP.
 */
@Injectable()
export class DefectoWordService {
  private readonly logger = new Logger(DefectoWordService.name);

  async generar(
    defecto: Defecto & { proyectoNombre?: string | null; casoPruebaCodigo?: string | null },
    evidencias: EvidenciaArchivo[],
    observacionesTester?: string | null,
  ): Promise<Buffer | null> {
    try {
      const fecha = defecto.creadoEn
        ? new Date(defecto.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 },
              children: [new TextRun({ text: 'SISTEMA QA TOTAL', size: 18, color: '6B7280' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [new TextRun({ text: 'REPORTE DE DEFECTO', size: 36, bold: true, color: '1E3A5F' })],
            }),

            this.sectionTitle('IDENTIFICACIÓN'),
            this.infoTable([
              ['Código',          defecto.codigoProyecto ?? defecto.codigo ?? '—'],
              ['Proyecto',        defecto.proyectoNombre ?? '—'],
              ['Caso de Prueba',  defecto.casoPruebaCodigo ?? '—'],
              ['Fecha Reporte',   fecha],
            ]),

            this.sectionTitle('CLASIFICACIÓN'),
            this.infoTable([
              ['Severidad', defecto.severidad],
              ['Prioridad', defecto.prioridad],
              ['Estado',    defecto.estado],
              ['Ambiente',  defecto.ambiente],
              ['Versión',   defecto.version],
            ]),

            this.sectionTitle('TÍTULO'),
            new Paragraph({
              spacing: { after: 280 },
              children: [new TextRun({ text: defecto.titulo, size: 24, bold: true })],
            }),

            this.sectionTitle('DESCRIPCIÓN'),
            ...this.multilineParagraphs(defecto.descripcion),

            this.sectionTitle('PASOS PARA REPRODUCIR'),
            ...this.multilineParagraphs(defecto.pasosReproduccion),

            this.sectionTitle('RESULTADO OBTENIDO'),
            ...this.multilineParagraphs(defecto.resultadoObtenido),

            this.sectionTitle('RESULTADO ESPERADO'),
            ...this.multilineParagraphs(defecto.resultadoEsperado),

            ...(observacionesTester?.trim()
              ? [this.sectionTitle('OBSERVACIÓN DEL TESTER'), ...this.multilineParagraphs(observacionesTester)]
              : []),

            this.sectionTitle('EVIDENCIAS'),
            ...await this.evidenciasParagraphs(evidencias),
          ],
        }],
      });

      return await Packer.toBuffer(doc);
    } catch (err) {
      this.logger.warn(`No se pudo generar el Word de evidencias para defecto#${defecto.id}: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  // ── Evidencias ──────────────────────────────────────────────────────────────

  private async evidenciasParagraphs(evidencias: EvidenciaArchivo[]): Promise<Paragraph[]> {
    if (!evidencias?.length) {
      return [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Sin evidencias adjuntas.', color: '9CA3AF', size: 18 })] })];
    }

    const bloques: Paragraph[] = [];
    for (const ev of evidencias) {
      const img = await this.leerImagen(ev);
      if (img) {
        bloques.push(new Paragraph({
          spacing: { before: 120, after: 60 },
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: img.width, height: img.height } })],
        }));
        bloques.push(new Paragraph({
          spacing: { after: 220 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: ev.nombre, size: 16, color: '6B7280', italics: true })],
        }));
      } else {
        bloques.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: `📎 ${ev.nombre} (adjunto no previsualizable en este documento — ver en el sistema)`, size: 18 })],
        }));
      }
    }
    return bloques;
  }

  private async leerImagen(
    ev: EvidenciaArchivo,
  ): Promise<{ data: Buffer; type: TipoImagenDocx; width: number; height: number } | null> {
    const ext = (ev.nombre.split('.').pop() ?? ev.url.split('.').pop() ?? '').toLowerCase();
    const type = EXT_A_TIPO_DOCX[ext];
    if (!type) return null;

    try {
      // La URL guardada es relativa al origen del backend, ej: "/api/uploads/2026-08/x.png"
      const rutaRelativa = ev.url.replace(/^\/api\/uploads\//, '');
      const data = await readFile(join(UPLOADS_ROOT, rutaRelativa));
      const dims = imageSize(data);
      if (!dims.width || !dims.height) return null;

      const escala = Math.min(EVIDENCIA_MAX_ANCHO / dims.width, EVIDENCIA_MAX_ALTO / dims.height, 1);
      return { data, type, width: Math.round(dims.width * escala), height: Math.round(dims.height * escala) };
    } catch (err) {
      this.logger.warn(`No se pudo leer la evidencia ${ev.nombre}: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  // ── Helpers de formato (mismo estilo que word-export.helpers.ts del frontend) ─

  private sectionTitle(text: string): Paragraph {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8D6E8', space: 4 } },
      children: [new TextRun({ text, bold: true, size: 22, color: '1E3A5F' })],
    });
  }

  private infoTable(rows: [string, string][]): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: { bottom: 240 },
      rows: rows.map(([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: 'EEF2F7' },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: '374151' })] })],
            }),
            new TableCell({
              width: { size: 72, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
            }),
          ],
        }),
      ),
    });
  }

  private multilineParagraphs(text: string): Paragraph[] {
    if (!text?.trim()) {
      return [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '—', color: '9CA3AF' })] })];
    }
    const lines = text.split('\n').filter((l) => l.trim());
    return lines.map((line, i) =>
      new Paragraph({
        spacing: { after: i === lines.length - 1 ? 200 : 80 },
        children: [new TextRun({ text: line.trim(), size: 20 })],
      }),
    );
  }
}
