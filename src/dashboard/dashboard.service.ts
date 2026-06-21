import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  async getStats(usuarioId: number, rol: string) {
    const esAdmin   = rol === 'Administrador';
    const esTester  = rol === 'QA Tester';

    const [
      resumen,
      casosPorEstado,
      defectosPorSeveridad,
      defectosPorEstado,
      proyectosAvance,
      misCasos,
      misDefectosAsignados,
      misDefectosPendientesVerificacion,
      ultimosDefectos,
      ultimasEjecuciones,
    ] = await Promise.all([
      this.getResumen(usuarioId, esAdmin),
      this.getCasosPorEstado(),
      this.getDefectosPorSeveridad(),
      this.getDefectosPorEstado(),
      this.getProyectosAvance(usuarioId, esAdmin),
      this.getMisCasos(usuarioId),
      this.getMisDefectosAsignados(usuarioId, esTester),
      this.getMisDefectosPendientesVerificacion(usuarioId, esTester),
      this.getUltimosDefectos(usuarioId, esTester),
      this.getUltimasEjecuciones(),
    ]);

    return {
      resumen,
      casosPorEstado,
      defectosPorSeveridad,
      defectosPorEstado,
      proyectosAvance,
      misCasos,
      misDefectosAsignados,
      misDefectosPendientesVerificacion,
      ultimosDefectos,
      ultimasEjecuciones,
    };
  }

  private async getResumen(usuarioId: number, esAdmin: boolean) {
    const proyectoFilter = esAdmin
      ? `estado::text IN ('Planificado','En Ejecución')`
      : `estado::text IN ('Planificado','En Ejecución') AND (
          jefe_proyecto_id = $1 OR jefe_qa_id = $1 OR responsable_qa_id = $1 OR
          id IN (SELECT DISTINCT proyecto_id FROM casos_prueba WHERE responsable_qa_id = $1) OR
          id IN (SELECT DISTINCT proyecto_id FROM defectos WHERE asignado_a = $1)
        )`;
    const rows = await this.ds.query(`
      SELECT
        (SELECT COUNT(*) FROM proyectos WHERE ${proyectoFilter})::int              AS proyectos_activos,
        (SELECT COUNT(*) FROM casos_prueba)::int                                   AS casos_totales,
        (SELECT COUNT(*) FROM casos_prueba WHERE estado::text = 'Ejecutado')::int  AS casos_ejecutados,
        (SELECT COUNT(*) FROM defectos WHERE estado::text NOT IN ('Cerrado','Resuelto','Rechazado'))::int AS defectos_abiertos,
        (SELECT COALESCE(ROUND(AVG(porcentaje_avance)), 0) FROM proyectos WHERE ${proyectoFilter})::int AS avance_promedio,
        (SELECT COUNT(*) FROM casos_prueba WHERE responsable_qa_id = $1)::int      AS mis_casos,
        (SELECT COUNT(*) FROM defectos WHERE asignado_a   = $1 AND estado::text NOT IN ('Cerrado','Resuelto','Rechazado'))::int AS mis_defectos_abiertos,
        (SELECT COUNT(*) FROM defectos WHERE reportado_por = $1)::int                                                          AS mis_defectos_reportados,
        (SELECT COUNT(*) FROM defectos WHERE reportado_por = $1 AND estado::text = 'En Revisión')::int                         AS defectos_pendientes_verificacion
    `, [usuarioId]);
    return rows[0];
  }

  private async getCasosPorEstado() {
    return this.ds.query(`
      SELECT estado::text AS estado, COUNT(*)::int AS total
      FROM casos_prueba
      GROUP BY estado
      ORDER BY total DESC
    `);
  }

  private async getDefectosPorSeveridad() {
    return this.ds.query(`
      SELECT severidad::text AS severidad, COUNT(*)::int AS total
      FROM defectos
      WHERE estado::text NOT IN ('Cerrado','Rechazado')
      GROUP BY severidad
      ORDER BY
        CASE severidad::text
          WHEN 'Crítico' THEN 1
          WHEN 'Alto'    THEN 2
          WHEN 'Medio'   THEN 3
          WHEN 'Bajo'    THEN 4
        END
    `);
  }

  private async getDefectosPorEstado() {
    return this.ds.query(`
      SELECT estado::text AS estado, COUNT(*)::int AS total
      FROM defectos
      GROUP BY estado
      ORDER BY total DESC
    `);
  }

  private async getProyectosAvance(usuarioId: number, esAdmin: boolean) {
    const userFilter = esAdmin
      ? ''
      : `AND (
          p.jefe_proyecto_id = $1 OR p.jefe_qa_id = $1 OR p.responsable_qa_id = $1 OR
          EXISTS (SELECT 1 FROM casos_prueba cp2 WHERE cp2.proyecto_id = p.id AND cp2.responsable_qa_id = $1) OR
          EXISTS (SELECT 1 FROM defectos d2   WHERE d2.proyecto_id  = p.id AND d2.asignado_a    = $1) OR
          EXISTS (SELECT 1 FROM defectos d2   WHERE d2.proyecto_id  = p.id AND d2.reportado_por = $1)
        )`;
    return this.ds.query(`
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.estado::text AS estado,
        p.porcentaje_avance,
        (SELECT COUNT(*)::int FROM casos_prueba cp WHERE cp.proyecto_id = p.id)                                                          AS casos_totales,
        (SELECT COUNT(*)::int FROM casos_prueba cp WHERE cp.proyecto_id = p.id AND cp.estado::text = 'Ejecutado')                        AS casos_ejecutados,
        (SELECT COUNT(*)::int FROM defectos d     WHERE d.proyecto_id  = p.id AND d.estado::text NOT IN ('Cerrado','Resuelto','Rechazado')) AS defectos_abiertos
      FROM proyectos p
      WHERE p.estado::text IN ('Planificado','En Ejecución')
      ${userFilter}
      ORDER BY p.porcentaje_avance DESC, p.nombre ASC
      LIMIT 6
    `, esAdmin ? [] : [usuarioId]);
  }

  private async getMisCasos(usuarioId: number) {
    return this.ds.query(`
      SELECT estado::text AS estado, COUNT(*)::int AS total
      FROM casos_prueba
      WHERE responsable_qa_id = $1
      GROUP BY estado
      ORDER BY total DESC
    `, [usuarioId]);
  }

  private async getMisDefectosAsignados(usuarioId: number, esTester: boolean) {
    if (esTester) {
      // Para testers: defectos que reportaron, agrupados por estado
      return this.ds.query(`
        SELECT estado::text AS estado, COUNT(*)::int AS total
        FROM defectos
        WHERE reportado_por = $1 AND estado::text NOT IN ('Cerrado','Rechazado')
        GROUP BY estado
        ORDER BY total DESC
      `, [usuarioId]);
    }
    return this.ds.query(`
      SELECT severidad::text AS severidad, COUNT(*)::int AS total
      FROM defectos
      WHERE asignado_a = $1 AND estado::text NOT IN ('Cerrado','Rechazado')
      GROUP BY severidad
      ORDER BY
        CASE severidad::text
          WHEN 'Crítico' THEN 1
          WHEN 'Alto'    THEN 2
          WHEN 'Medio'   THEN 3
          WHEN 'Bajo'    THEN 4
        END
    `, [usuarioId]);
  }

  private async getMisDefectosPendientesVerificacion(usuarioId: number, esTester: boolean) {
    if (!esTester) return [];
    return this.ds.query(`
      SELECT
        d.id,
        d.codigo,
        d.codigo_proyecto     AS "codigoProyecto",
        d.titulo,
        d.severidad::text     AS severidad,
        d.estado_desarrollo::text AS "estadoDesarrollo",
        d.comentarios_desarrollo  AS "comentariosDesarrollo",
        p.nombre              AS proyecto_nombre,
        u.nombre || ' ' || u.apellido AS desarrollador_nombre,
        d.actualizado_en
      FROM defectos d
      LEFT JOIN proyectos p ON p.id = d.proyecto_id
      LEFT JOIN usuarios  u ON u.id = d.asignado_a
      WHERE d.reportado_por = $1 AND d.estado::text = 'En Revisión'
      ORDER BY d.actualizado_en DESC
      LIMIT 10
    `, [usuarioId]);
  }

  private async getUltimosDefectos(usuarioId: number, esTester: boolean) {
    const whereClause = esTester ? 'WHERE d.reportado_por = $1' : '';
    const params      = esTester ? [usuarioId] : [];
    return this.ds.query(`
      SELECT
        d.id,
        d.codigo,
        d.titulo,
        d.severidad::text  AS severidad,
        d.estado::text     AS estado,
        d.prioridad::text  AS prioridad,
        p.nombre           AS proyecto_nombre,
        u.nombre || ' ' || u.apellido AS reportado_por_nombre,
        d.creado_en
      FROM defectos d
      LEFT JOIN proyectos p ON p.id = d.proyecto_id
      LEFT JOIN usuarios  u ON u.id = d.reportado_por
      ${whereClause}
      ORDER BY d.creado_en DESC
      LIMIT 8
    `, params);
  }

  private async getUltimasEjecuciones() {
    return this.ds.query(`
      SELECT
        e.id,
        cp.codigo_cp       AS caso_codigo,
        cp.nombre          AS caso_nombre,
        e.resultado::text  AS resultado,
        e.ambiente::text   AS ambiente,
        e.fecha,
        u.nombre || ' ' || u.apellido AS tester_nombre,
        p.nombre           AS proyecto_nombre
      FROM ejecuciones_caso_prueba e
      LEFT JOIN casos_prueba cp ON cp.id = e.caso_prueba_id
      LEFT JOIN usuarios     u  ON u.id  = e.tester_id
      LEFT JOIN proyectos    p  ON p.id  = e.proyecto_id
      ORDER BY e.fecha DESC
      LIMIT 8
    `);
  }
}
