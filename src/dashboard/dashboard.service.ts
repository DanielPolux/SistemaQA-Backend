import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  async getStats(usuarioId: number, rol: string) {
    const esAdmin = rol === 'Administrador';
    const esTester = rol === 'QA Tester';
    const [
      resumen, casosPorEstado, defectosPorSeveridad, defectosPorEstado,
      proyectosAvance, misCasos, misDefectosAsignados,
      misDefectosPendientesVerificacion, ultimosDefectos, ultimasEjecuciones,
      resultadosEjecucion,
    ] = await Promise.all([
      this.getResumen(usuarioId, esAdmin, esTester),
      this.getCasosPorEstado(usuarioId, esAdmin, esTester),
      this.getDefectosPorSeveridad(usuarioId, esAdmin),
      this.getDefectosPorEstado(usuarioId, esAdmin),
      this.getProyectosAvance(usuarioId, esAdmin, esTester),
      this.getMisCasos(usuarioId, esAdmin, esTester),
      this.getMisDefectosAsignados(usuarioId, esTester),
      this.getMisDefectosPendientesVerificacion(usuarioId, esTester),
      this.getUltimosDefectos(usuarioId, esAdmin),
      this.getUltimasEjecuciones(usuarioId, esAdmin),
      this.getResultadosEjecucion(usuarioId, esAdmin, esTester),
    ]);
    return {
      resumen, casosPorEstado, defectosPorSeveridad, defectosPorEstado,
      proyectosAvance, misCasos, misDefectosAsignados,
      misDefectosPendientesVerificacion, ultimosDefectos, ultimasEjecuciones,
      resultadosEjecucion,
    };
  }

  /** Incluye asignaciones actuales e históricas por ciclo. */
  private userProjectsIn(esAdmin: boolean, alias: string): string {
    if (esAdmin) return 'true';
    return `${alias}.proyecto_id IN (
      SELECT p.id FROM proyectos p
      WHERE p.jefe_proyecto_id=$1 OR p.jefe_qa_id=$1 OR p.responsable_qa_id=$1
        OR EXISTS (SELECT 1 FROM casos_prueba cp0 WHERE cp0.proyecto_id=p.id AND cp0.responsable_qa_id=$1)
        OR EXISTS (SELECT 1 FROM ciclos_prueba ci0 WHERE ci0.proyecto_id=p.id AND ci0.responsable_qa_id=$1)
        OR EXISTS (SELECT 1 FROM defectos d0 WHERE d0.proyecto_id=p.id AND (d0.asignado_a=$1 OR d0.reportado_por=$1))
    )`;
  }

  /**
   * Un ciclo operativo por proyecto y su alcance real. Para QA Tester se usan
   * únicamente sus ciclos asignados; el historial no contamina estas métricas.
   */
  private activeScopeCte(esAdmin: boolean, esTester: boolean): string {
    const access = esAdmin ? 'true' : `(
      p.jefe_proyecto_id=$1 OR p.jefe_qa_id=$1 OR p.responsable_qa_id=$1
      OR EXISTS (SELECT 1 FROM casos_prueba cp0 WHERE cp0.proyecto_id=p.id AND cp0.responsable_qa_id=$1)
      OR EXISTS (SELECT 1 FROM ciclos_prueba ci0 WHERE ci0.proyecto_id=p.id AND ci0.responsable_qa_id=$1)
      OR EXISTS (SELECT 1 FROM defectos d0 WHERE d0.proyecto_id=p.id AND (d0.asignado_a=$1 OR d0.reportado_por=$1))
    )`;
    const testerCycle = esTester ? 'AND ci.responsable_qa_id=$1' : '';
    return `WITH ciclos_activos AS (
      SELECT DISTINCT ON (ci.proyecto_id)
        ci.id AS ciclo_id, ci.proyecto_id, ci.nombre AS ciclo_nombre
      FROM ciclos_prueba ci JOIN proyectos p ON p.id=ci.proyecto_id
      WHERE ci.estado::text IN ('Planificado','En ejecución')
        AND p.estado::text IN ('Planificado','En Ejecución','Observado')
        AND ${access} ${testerCycle}
      ORDER BY ci.proyecto_id,
        CASE ci.estado::text WHEN 'En ejecución' THEN 0 ELSE 1 END,
        ci.fecha_inicio DESC NULLS LAST, ci.id DESC
    ), planificados AS (
      SELECT ca.ciclo_id, ca.proyecto_id, ccp.caso_prueba_id
      FROM ciclos_activos ca JOIN ciclo_casos_planificados ccp ON ccp.ciclo_id=ca.ciclo_id
    ), casos_plan AS (
      SELECT DISTINCT ca.ciclo_id, ca.proyecto_id, cp.id AS caso_prueba_id
      FROM ciclos_activos ca
      JOIN ciclos_prueba ci ON ci.id=ca.ciclo_id
      JOIN plan_requerimientos pr ON pr.plan_id=ci.plan_prueba_id
      JOIN casos_prueba cp ON cp.requerimiento_id=pr.requerimiento_id
      WHERE ci.plan_prueba_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM planificados px WHERE px.ciclo_id=ca.ciclo_id)
        AND (
          NOT EXISTS (SELECT 1 FROM plan_casos_prueba pcp WHERE pcp.plan_id=pr.plan_id AND pcp.requerimiento_id=pr.requerimiento_id)
          OR EXISTS (SELECT 1 FROM plan_casos_prueba pcp WHERE pcp.plan_id=pr.plan_id AND pcp.caso_prueba_id=cp.id)
        )
    ), alcance AS (
      SELECT ciclo_id, proyecto_id, caso_prueba_id FROM planificados
      UNION SELECT ciclo_id, proyecto_id, caso_prueba_id FROM casos_plan
      UNION
        SELECT ca.ciclo_id, ca.proyecto_id, cp.id
        FROM ciclos_activos ca JOIN casos_prueba cp ON cp.proyecto_id=ca.proyecto_id
        WHERE NOT EXISTS (SELECT 1 FROM planificados px WHERE px.ciclo_id=ca.ciclo_id)
          AND NOT EXISTS (SELECT 1 FROM casos_plan pcx WHERE pcx.ciclo_id=ca.ciclo_id)
      UNION
        SELECT ca.ciclo_id, ca.proyecto_id, e.caso_prueba_id
        FROM ciclos_activos ca
        JOIN ejecuciones_caso_prueba e ON e.ciclo_id=ca.ciclo_id AND e.proyecto_id=ca.proyecto_id
    ), ultima AS (
      SELECT DISTINCT ON (e.ciclo_id,e.caso_prueba_id)
        e.id, e.ciclo_id, e.caso_prueba_id, e.resultado
      FROM ejecuciones_caso_prueba e
      JOIN ciclos_activos ca ON ca.ciclo_id=e.ciclo_id AND ca.proyecto_id=e.proyecto_id
      ORDER BY e.ciclo_id,e.caso_prueba_id,e.creado_en DESC
    )`;
  }

  private async getResumen(usuarioId: number, esAdmin: boolean, esTester: boolean) {
    const rows = await this.ds.query(`${this.activeScopeCte(esAdmin, esTester)}
      SELECT
        (SELECT COUNT(*) FROM ciclos_activos)::int AS proyectos_activos,
        (SELECT COUNT(*) FROM alcance)::int AS casos_totales,
        (SELECT COUNT(*) FROM alcance a JOIN ultima u ON u.ciclo_id=a.ciclo_id AND u.caso_prueba_id=a.caso_prueba_id)::int AS casos_ejecutados,
        (SELECT COUNT(*) FROM defectos df WHERE ${this.userProjectsIn(esAdmin, 'df')}
          AND df.estado::text NOT IN ('Cerrado','Resuelto','Rechazado'))::int AS defectos_abiertos,
        CASE WHEN (SELECT COUNT(*) FROM alcance)=0 THEN 0 ELSE ROUND(
          (SELECT COUNT(*) FROM alcance a JOIN ultima u ON u.ciclo_id=a.ciclo_id AND u.caso_prueba_id=a.caso_prueba_id)*100.0/
          (SELECT COUNT(*) FROM alcance)) END::int AS avance_promedio,
        (SELECT COUNT(*) FROM alcance)::int AS mis_casos,
        (SELECT COUNT(*) FROM defectos WHERE asignado_a=$1 AND estado::text NOT IN ('Cerrado','Resuelto','Rechazado'))::int AS mis_defectos_abiertos,
        (SELECT COUNT(*) FROM defectos WHERE reportado_por=$1)::int AS mis_defectos_reportados,
        (SELECT COUNT(*) FROM defectos WHERE reportado_por=$1 AND estado::text='En Revisión')::int AS defectos_pendientes_verificacion
    `, [usuarioId]);
    return rows[0];
  }

  private async getCasosPorEstado(usuarioId: number, esAdmin: boolean, esTester: boolean) {
    return this.ds.query(`${this.activeScopeCte(esAdmin, esTester)}
      SELECT CASE WHEN u.id IS NULL THEN 'Pendiente' ELSE 'Ejecutado' END AS estado, COUNT(*)::int AS total
      FROM alcance a LEFT JOIN ultima u ON u.ciclo_id=a.ciclo_id AND u.caso_prueba_id=a.caso_prueba_id
      GROUP BY 1 ORDER BY total DESC`, [usuarioId]);
  }

  private async getDefectosPorSeveridad(usuarioId: number, esAdmin: boolean) {
    const filter = esAdmin ? '' : `AND ${this.userProjectsIn(false, 'd')}`;
    return this.ds.query(`
      SELECT severidad::text AS severidad, COUNT(*)::int AS total FROM defectos d
      WHERE d.estado::text NOT IN ('Cerrado','Resuelto','Rechazado') ${filter}
      GROUP BY severidad
      ORDER BY CASE severidad::text WHEN 'Crítico' THEN 1 WHEN 'Alto' THEN 2 WHEN 'Medio' THEN 3 WHEN 'Bajo' THEN 4 END
    `, esAdmin ? [] : [usuarioId]);
  }

  private async getDefectosPorEstado(usuarioId: number, esAdmin: boolean) {
    const filter = esAdmin ? '' : `WHERE ${this.userProjectsIn(false, 'd')}`;
    return this.ds.query(
      `SELECT estado::text AS estado, COUNT(*)::int AS total FROM defectos d ${filter} GROUP BY estado ORDER BY total DESC`,
      esAdmin ? [] : [usuarioId],
    );
  }

  private async getProyectosAvance(usuarioId: number, esAdmin: boolean, esTester: boolean) {
    return this.ds.query(`${this.activeScopeCte(esAdmin, esTester)}
      SELECT p.id,p.codigo,p.nombre,p.estado::text AS estado,ca.ciclo_id,ca.ciclo_nombre,
        CASE WHEN COUNT(a.caso_prueba_id)=0 THEN 0 ELSE ROUND(COUNT(u.id)*100.0/COUNT(a.caso_prueba_id)) END::int AS porcentaje_avance,
        COUNT(a.caso_prueba_id)::int AS casos_totales, COUNT(u.id)::int AS casos_ejecutados,
        (SELECT COUNT(*)::int FROM defectos d WHERE d.proyecto_id=p.id
          AND d.estado::text NOT IN ('Cerrado','Resuelto','Rechazado')) AS defectos_abiertos
      FROM ciclos_activos ca JOIN proyectos p ON p.id=ca.proyecto_id
      LEFT JOIN alcance a ON a.ciclo_id=ca.ciclo_id
      LEFT JOIN ultima u ON u.ciclo_id=a.ciclo_id AND u.caso_prueba_id=a.caso_prueba_id
      GROUP BY p.id,ca.ciclo_id,ca.ciclo_nombre
      ORDER BY porcentaje_avance DESC,p.nombre ASC LIMIT 6
    `, [usuarioId]);
  }

  private async getMisCasos(usuarioId: number, esAdmin: boolean, esTester: boolean) {
    if (!esTester) return [];
    return this.ds.query(`${this.activeScopeCte(esAdmin, true)}
      SELECT CASE WHEN u.id IS NULL THEN 'Pendiente' ELSE 'Ejecutado' END AS estado, COUNT(*)::int AS total
      FROM alcance a LEFT JOIN ultima u ON u.ciclo_id=a.ciclo_id AND u.caso_prueba_id=a.caso_prueba_id
      GROUP BY 1 ORDER BY total DESC`, [usuarioId]);
  }

  private async getMisDefectosAsignados(usuarioId: number, esTester: boolean) {
    if (esTester) {
      return this.ds.query(
        `SELECT estado::text AS estado,COUNT(*)::int AS total FROM defectos
         WHERE reportado_por=$1 AND estado::text NOT IN ('Cerrado','Resuelto','Rechazado')
         GROUP BY estado ORDER BY total DESC`, [usuarioId],
      );
    }
    return this.ds.query(`
      SELECT severidad::text AS severidad,COUNT(*)::int AS total FROM defectos
      WHERE asignado_a=$1 AND estado::text NOT IN ('Cerrado','Resuelto','Rechazado')
      GROUP BY severidad
      ORDER BY CASE severidad::text WHEN 'Crítico' THEN 1 WHEN 'Alto' THEN 2 WHEN 'Medio' THEN 3 WHEN 'Bajo' THEN 4 END
    `, [usuarioId]);
  }

  private async getMisDefectosPendientesVerificacion(usuarioId: number, esTester: boolean) {
    if (!esTester) return [];
    return this.ds.query(`
      SELECT d.id,d.codigo,d.codigo_proyecto AS "codigoProyecto",d.titulo,
        d.severidad::text AS severidad,d.estado_desarrollo::text AS "estadoDesarrollo",
        d.comentarios_desarrollo AS "comentariosDesarrollo",p.nombre AS proyecto_nombre,
        u.nombre||' '||u.apellido AS desarrollador_nombre,d.actualizado_en
      FROM defectos d LEFT JOIN proyectos p ON p.id=d.proyecto_id LEFT JOIN usuarios u ON u.id=d.asignado_a
      WHERE d.reportado_por=$1 AND d.estado::text='En Revisión'
      ORDER BY d.actualizado_en DESC LIMIT 10
    `, [usuarioId]);
  }

  private async getUltimosDefectos(usuarioId: number, esAdmin: boolean) {
    const filter = esAdmin ? '' : `WHERE ${this.userProjectsIn(false, 'd')}`;
    return this.ds.query(`
      SELECT d.id,d.codigo,d.titulo,d.severidad::text AS severidad,d.estado::text AS estado,
        d.prioridad::text AS prioridad,p.nombre AS proyecto_nombre,
        u.nombre||' '||u.apellido AS reportado_por_nombre,d.creado_en
      FROM defectos d LEFT JOIN proyectos p ON p.id=d.proyecto_id LEFT JOIN usuarios u ON u.id=d.reportado_por
      ${filter} ORDER BY d.creado_en DESC LIMIT 8
    `, esAdmin ? [] : [usuarioId]);
  }

  private async getUltimasEjecuciones(usuarioId: number, esAdmin: boolean) {
    const filter = esAdmin ? '' : `WHERE ${this.userProjectsIn(false, 'e')}`;
    return this.ds.query(`
      SELECT e.id,cp.codigo_cp AS caso_codigo,cp.nombre AS caso_nombre,e.resultado::text AS resultado,
        e.ambiente::text AS ambiente,e.fecha,u.nombre||' '||u.apellido AS tester_nombre,p.nombre AS proyecto_nombre
      FROM ejecuciones_caso_prueba e
      LEFT JOIN casos_prueba cp ON cp.id=e.caso_prueba_id
      LEFT JOIN usuarios u ON u.id=e.tester_id LEFT JOIN proyectos p ON p.id=e.proyecto_id
      ${filter} ORDER BY e.fecha DESC,e.creado_en DESC LIMIT 8
    `, esAdmin ? [] : [usuarioId]);
  }

  private async getResultadosEjecucion(usuarioId: number, esAdmin: boolean, esTester: boolean) {
    return this.ds.query(`${this.activeScopeCte(esAdmin, esTester)}
      SELECT u.resultado::text AS resultado,COUNT(*)::int AS total
      FROM ultima u GROUP BY u.resultado ORDER BY total DESC`, [usuarioId]);
  }
}
