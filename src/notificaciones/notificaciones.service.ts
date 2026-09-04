import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectDataSource() private ds: DataSource,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  // Todos los días a las 08:00 (hora de Lima). Solo se envía una vez por ciclo.
  @Cron('0 8 * * *', { name: 'recordatorio-inicio-ciclos', timeZone: 'America/Lima' })
  async enviarRecordatoriosInicioCiclo(): Promise<void> {
    const ciclos: any[] = await this.ds.query(
      `SELECT c.id, c.nombre, c.ambiente, c.fecha_inicio, c.fecha_fin,
              p.codigo AS proyecto_codigo, p.nombre AS proyecto_nombre,
              rqa.email, rqa.nombre AS responsable_nombre, rqa.apellido AS responsable_apellido,
              jq.email AS jefe_qa_email
       FROM ciclos_prueba c
       JOIN proyectos p ON p.id=c.proyecto_id
       JOIN usuarios rqa ON rqa.id=c.responsable_qa_id
       LEFT JOIN usuarios jq ON jq.id=p.jefe_qa_id
       WHERE c.estado='Planificado'
         AND c.recordatorio_inicio_enviado_en IS NULL
         AND c.fecha_inicio = ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date + 1)`,
    );
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200').replace(/\/$/, '');
    for (const c of ciclos) {
      const link = `${frontendUrl}/ciclos`;
      await this.mailService.send({
        to: c.email,
        cc: c.jefe_qa_email && c.jefe_qa_email !== c.email ? [c.jefe_qa_email] : undefined,
        subject: `[Recordatorio de inicio planificado] ${c.proyecto_codigo} - ${c.nombre}`,
        html: this.plantillaRecordatorioCiclo(c, link),
      });
      await this.ds.query(`UPDATE ciclos_prueba SET recordatorio_inicio_enviado_en=NOW() WHERE id=$1`, [c.id]);
      this.logger.log(`Recordatorio de ciclo #${c.id} → ${c.email}`);
    }
  }

  private plantillaRecordatorioCiclo(c: any, link: string): string {
    const color = '#2D4F72';
    return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937"><div style="background:${color};padding:22px 24px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0;font-size:21px">Recordatorio de inicio planificado</h2></div><div style="background:#f8fafc;padding:26px 24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px"><p>Estimado/a <strong>${c.responsable_nombre} ${c.responsable_apellido}</strong>:</p><p>El siguiente ciclo está programado para iniciar mañana. Esta notificación es un <strong>recordatorio de planificación</strong> y no confirma el inicio efectivo de las pruebas.</p><table style="width:100%;border-collapse:collapse;margin:18px 0"><tr><td style="padding:9px;border:1px solid #d9e0e7;font-weight:600;width:32%">Proyecto</td><td style="padding:9px;border:1px solid #d9e0e7">${c.proyecto_codigo} - ${c.proyecto_nombre}</td></tr><tr style="background:#fff"><td style="padding:9px;border:1px solid #d9e0e7;font-weight:600">Ciclo</td><td style="padding:9px;border:1px solid #d9e0e7">${c.nombre}</td></tr><tr><td style="padding:9px;border:1px solid #d9e0e7;font-weight:600">Inicio planificado</td><td style="padding:9px;border:1px solid #d9e0e7">${c.fecha_inicio}</td></tr><tr style="background:#fff"><td style="padding:9px;border:1px solid #d9e0e7;font-weight:600">Ambiente</td><td style="padding:9px;border:1px solid #d9e0e7">${c.ambiente ?? '—'}</td></tr></table><div style="background:#eaf0f6;border-left:4px solid ${color};padding:14px 16px;margin:18px 0"><strong>Antes de iniciar:</strong> verifique la disponibilidad del ambiente, datos de prueba, accesos y alcance del ciclo.</div><div style="margin:26px 0;text-align:center"><a href="${link}" style="background:${color};color:#fff;padding:12px 26px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Revisar ciclo de pruebas</a></div><p>Atentamente,<br><strong>Equipo de Aseguramiento de Calidad</strong></p><hr style="border:none;border-top:1px solid #d9e0e7"><p style="color:#6b7280;font-size:12px">Sistema QA — Notificación automática. Por favor, no responda este mensaje.</p></div></div>`;
  }

  // Lunes a viernes a las 18:00 (hora del servidor).
  // Ajusta el cron si el contenedor corre en UTC: p.ej. '0 23 * * 1-5' para Lima (UTC-5).
  @Cron('0 18 * * 1-5', { name: 'reporte-diario-pm' })
  async enviarReporteDiarioPM(): Promise<void> {
    this.logger.log('Iniciando reporte diario a Project Managers...');

    const pms: Array<{ id: number; nombre: string; apellido: string; email: string }> =
      await this.ds.query(
        `SELECT id, nombre, apellido, email
         FROM usuarios
         WHERE rol = 'Project Manager' AND activo = true AND email IS NOT NULL`,
      );

    for (const pm of pms) {
      await this.enviarReporteParaPM(pm);
    }

    this.logger.log(`Reporte diario completado (${pms.length} PMs procesados)`);
  }

  private async enviarReporteParaPM(pm: { id: number; nombre: string; apellido: string; email: string }): Promise<void> {
    const proyectos: any[] = await this.ds.query(
      `SELECT
         p.id,
         p.nombre,
         p.codigo,
         p.cliente,
         p.estado::text                                                                                           AS estado,
         COUNT(cp.id)::int                                                                                        AS casos_totales,
         COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado')::int                                           AS casos_ejecutados,
         COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado' AND cp.resultado::text = 'Aprobado')::int       AS casos_aprobados,
         COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado' AND cp.resultado::text = 'Fallido')::int        AS casos_fallidos,
         CASE WHEN COUNT(cp.id) = 0 THEN 0
              ELSE ROUND(COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado') * 100.0 / COUNT(cp.id))
         END::int                                                                                                  AS porcentaje_avance,
         CASE WHEN COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado') = 0 THEN 0
              ELSE ROUND(
                COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado' AND cp.resultado::text = 'Aprobado') * 100.0
                / COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado')
              )
         END::int                                                                                                  AS porcentaje_aprobacion,
         (SELECT COUNT(*)::int FROM defectos d
          WHERE d.proyecto_id = p.id AND d.estado::text NOT IN ('Cerrado','Resuelto','Rechazado'))                AS defectos_abiertos,
         (SELECT COUNT(*)::int FROM defectos d
          WHERE d.proyecto_id = p.id AND d.estado::text NOT IN ('Cerrado','Resuelto','Rechazado')
            AND d.severidad::text = 'Crítico')                                                                    AS defectos_criticos,
         (SELECT COUNT(*)::int FROM defectos d
          WHERE d.proyecto_id = p.id AND d.estado::text NOT IN ('Cerrado','Resuelto','Rechazado')
            AND d.severidad::text = 'Alto')                                                                       AS defectos_altos
       FROM proyectos p
       LEFT JOIN casos_prueba cp ON cp.proyecto_id = p.id
       WHERE p.estado::text = 'En Ejecución'
         AND (p.jefe_proyecto_id = $1 OR p.jefe_qa_id = $1 OR p.responsable_qa_id = $1)
       GROUP BY p.id
       ORDER BY p.nombre`,
      [pm.id],
    );

    if (!proyectos.length) return;

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const fecha = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    await this.mailService.send({
      to: pm.email,
      subject: `[Reporte Diario QA] ${fecha}`,
      html: this.plantillaReporteDiario(pm, proyectos, frontendUrl, fecha),
    });

    this.logger.log(`Reporte diario → ${pm.email} (${proyectos.length} proyectos)`);
  }

  private plantillaReporteDiario(
    pm: { nombre: string; apellido: string },
    proyectos: any[],
    frontendUrl: string,
    fecha: string,
  ): string {
    const filas = proyectos.map((p, i) => {
      const colorAvance = p.porcentaje_avance >= 80 ? '#28a745' : p.porcentaje_avance >= 50 ? '#fd7e14' : '#dc3545';
      const bg = i % 2 === 0 ? '#fff' : '#f8f9fa';

      let alertaDefectos: string;
      if (p.defectos_criticos > 0) {
        alertaDefectos = `<span style="color:#dc3545;font-weight:bold">🔴 ${p.defectos_criticos} Crítico${p.defectos_criticos > 1 ? 's' : ''}</span>`;
      } else if (p.defectos_altos > 0) {
        alertaDefectos = `<span style="color:#fd7e14;font-weight:bold">🟠 ${p.defectos_altos} Alto${p.defectos_altos > 1 ? 's' : ''}</span>`;
      } else if (p.defectos_abiertos > 0) {
        alertaDefectos = `<span style="color:#6c757d">${p.defectos_abiertos} abierto${p.defectos_abiertos > 1 ? 's' : ''}</span>`;
      } else {
        alertaDefectos = `<span style="color:#28a745">✓ Sin pendientes</span>`;
      }

      return `
        <tr style="background:${bg}">
          <td style="padding:10px 12px;border:1px solid #dee2e6;vertical-align:middle">
            <a href="${frontendUrl}/proyectos/${p.id}" style="color:#0d6efd;text-decoration:none;font-weight:bold">${p.nombre}</a>
            ${p.codigo ? `<br><span style="color:#6c757d;font-size:11px">${p.codigo}${p.cliente ? ' · ' + p.cliente : ''}</span>` : ''}
          </td>
          <td style="padding:10px 12px;border:1px solid #dee2e6;text-align:center;vertical-align:middle">
            <div style="font-size:20px;font-weight:bold;color:${colorAvance}">${p.porcentaje_avance}%</div>
            <div style="font-size:11px;color:#6c757d">${p.casos_ejecutados}/${p.casos_totales} casos</div>
          </td>
          <td style="padding:10px 12px;border:1px solid #dee2e6;text-align:center;vertical-align:middle">
            <div style="font-size:20px;font-weight:bold;color:#28a745">${p.porcentaje_aprobacion}%</div>
            <div style="font-size:11px;color:#6c757d">${p.casos_aprobados} aprobados · ${p.casos_fallidos} fallidos</div>
          </td>
          <td style="padding:10px 12px;border:1px solid #dee2e6;text-align:center;vertical-align:middle">
            ${alertaDefectos}
            ${p.defectos_abiertos > 0 ? `<br><span style="font-size:11px;color:#6c757d">${p.defectos_abiertos} total abiertos</span>` : ''}
          </td>
        </tr>`;
    }).join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto">
        <div style="background:#0d6efd;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">📊 Reporte Diario QA</h2>
          <p style="color:#cfe2ff;margin:6px 0 0;font-size:14px">${fecha}</p>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
          <p>Hola <strong>${pm.nombre} ${pm.apellido}</strong>,</p>
          <p>Este es el estado actual de tus proyectos <strong>En Ejecución</strong>:</p>

          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#0d6efd;color:#fff">
                <th style="padding:10px 12px;text-align:left;border:1px solid #0a58ca">Proyecto</th>
                <th style="padding:10px 12px;text-align:center;border:1px solid #0a58ca;width:140px">Avance</th>
                <th style="padding:10px 12px;text-align:center;border:1px solid #0a58ca;width:160px">Aprobación</th>
                <th style="padding:10px 12px;text-align:center;border:1px solid #0a58ca;width:160px">Defectos</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>

          <p style="font-size:13px;color:#6c757d;margin-top:8px">
            💡 Haz clic en el nombre del proyecto para ver el reporte completo.
          </p>
          <hr style="margin:16px 0;border:none;border-top:1px solid #dee2e6">
          <p style="color:#6c757d;font-size:12px">Sistema QA — reporte automático diario (lunes a viernes)</p>
        </div>
      </div>`;
  }
}
