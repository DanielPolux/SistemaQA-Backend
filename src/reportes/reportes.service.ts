import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportesService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  async getReporteProyecto(id: number, usuarioId: number, esAdmin: boolean) {
    const [proyecto] = await this.ds.query(
      `SELECT id, nombre, codigo, cliente, estado::text AS estado FROM proyectos WHERE id = $1`,
      [id],
    );
    if (!proyecto) throw new NotFoundException(`Proyecto #${id} no encontrado`);

    if (!esAdmin) {
      const [{ tiene_acceso }] = await this.ds.query(
        `SELECT (
          p.jefe_proyecto_id = $2 OR p.jefe_qa_id = $2 OR p.responsable_qa_id = $2
          OR EXISTS (SELECT 1 FROM casos_prueba cp WHERE cp.proyecto_id = p.id AND cp.responsable_qa_id = $2)
          OR EXISTS (SELECT 1 FROM defectos d    WHERE d.proyecto_id  = p.id AND (d.asignado_a = $2 OR d.reportado_por = $2))
        ) AS tiene_acceso FROM proyectos p WHERE p.id = $1`,
        [id, usuarioId],
      );
      if (!tiene_acceso) throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    const [
      resumenRows,
      casosPorEstado,
      resultadosEjecucion,
      defectosPorSeveridad,
      defectosPorEstado,
      defectosPorPrioridad,
      avancePorCiclo,
    ] = await Promise.all([
      this.ds.query(
        `SELECT
          COUNT(cp.id)::int                                                                            AS casos_totales,
          COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado')::int                              AS casos_ejecutados,
          COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado' AND cp.resultado::text = 'Aprobado')::int AS casos_aprobados,
          COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado' AND cp.resultado::text = 'Fallido')::int  AS casos_fallidos,
          (SELECT COUNT(*)::int FROM defectos WHERE proyecto_id = $1)                                  AS total_defectos,
          (SELECT COUNT(*)::int FROM defectos WHERE proyecto_id = $1
             AND estado::text NOT IN ('Cerrado','Resuelto','Rechazado'))                               AS defectos_abiertos,
          CASE WHEN COUNT(cp.id) = 0 THEN 0
               ELSE ROUND(COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado') * 100.0 / COUNT(cp.id))
          END::int AS porcentaje_avance,
          CASE WHEN COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado') = 0 THEN 0
               ELSE ROUND(
                 COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado' AND cp.resultado::text = 'Aprobado') * 100.0
                 / COUNT(cp.id) FILTER (WHERE cp.estado::text = 'Ejecutado')
               )
          END::int AS porcentaje_aprobacion
         FROM casos_prueba cp WHERE cp.proyecto_id = $1`,
        [id],
      ),

      this.ds.query(
        `SELECT estado::text AS label, COUNT(*)::int AS valor
         FROM casos_prueba WHERE proyecto_id = $1
         GROUP BY estado ORDER BY valor DESC`,
        [id],
      ),

      this.ds.query(
        `SELECT resultado::text AS label, COUNT(*)::int AS valor
         FROM ejecuciones_caso_prueba WHERE proyecto_id = $1
         GROUP BY resultado ORDER BY valor DESC`,
        [id],
      ),

      this.ds.query(
        `SELECT severidad::text AS label, COUNT(*)::int AS valor
         FROM defectos WHERE proyecto_id = $1
         GROUP BY severidad
         ORDER BY CASE severidad::text WHEN 'Crítico' THEN 1 WHEN 'Alto' THEN 2 WHEN 'Medio' THEN 3 WHEN 'Bajo' THEN 4 END`,
        [id],
      ),

      this.ds.query(
        `SELECT estado::text AS label, COUNT(*)::int AS valor
         FROM defectos WHERE proyecto_id = $1
         GROUP BY estado ORDER BY valor DESC`,
        [id],
      ),

      this.ds.query(
        `SELECT prioridad::text AS label, COUNT(*)::int AS valor
         FROM defectos WHERE proyecto_id = $1
         GROUP BY prioridad
         ORDER BY CASE prioridad::text WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 WHEN 'Baja' THEN 4 END`,
        [id],
      ),

      this.ds.query(
        `SELECT
          ci.nombre AS ciclo,
          COUNT(*) FILTER (WHERE e.resultado::text = 'Aprobado')::int  AS aprobados,
          COUNT(*) FILTER (WHERE e.resultado::text = 'Fallido')::int   AS fallidos,
          COUNT(*) FILTER (WHERE e.resultado::text = 'Bloqueado')::int AS bloqueados,
          COUNT(*) FILTER (WHERE e.resultado::text = 'Omitido')::int   AS omitidos,
          COUNT(*)::int AS total
         FROM ejecuciones_caso_prueba e
         JOIN ciclos_prueba ci ON ci.id = e.ciclo_id
         WHERE e.proyecto_id = $1
         GROUP BY ci.id, ci.nombre
         ORDER BY MIN(e.fecha) ASC
         LIMIT 10`,
        [id],
      ),
    ]);

    const r = resumenRows[0];
    return {
      proyecto,
      resumen: {
        casosTotales:        Number(r.casos_totales),
        casosEjecutados:     Number(r.casos_ejecutados),
        casosAprobados:      Number(r.casos_aprobados),
        casosFallidos:       Number(r.casos_fallidos),
        totalDefectos:       Number(r.total_defectos),
        defectosAbiertos:    Number(r.defectos_abiertos),
        porcentajeAvance:    Number(r.porcentaje_avance),
        porcentajeAprobacion:Number(r.porcentaje_aprobacion),
      },
      casosPorEstado,
      resultadosEjecucion,
      defectosPorSeveridad,
      defectosPorEstado,
      defectosPorPrioridad,
      avancePorCiclo: avancePorCiclo.map((c: any) => ({
        ciclo:     c.ciclo,
        aprobados: Number(c.aprobados),
        fallidos:  Number(c.fallidos),
        bloqueados:Number(c.bloqueados),
        omitidos:  Number(c.omitidos),
        total:     Number(c.total),
      })),
    };
  }
}
