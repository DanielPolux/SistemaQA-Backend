import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanPrueba, EstadoPlan } from './entities/plan-prueba.entity';
import { CreatePlanPruebaDto } from './dto/create-plan-prueba.dto';

@Injectable()
export class PlanesPruebaService {
  constructor(
    @InjectRepository(PlanPrueba)
    private repo: Repository<PlanPrueba>,
  ) {}

  async findAll(query: { proyectoId?: number; estado?: string; pagina?: number; porPagina?: number }, usuarioId?: number, esAdmin = true): Promise<any> {
    const pagina    = Number(query.pagina)    || 1;
    const porPagina = Number(query.porPagina) || 15;
    const skip      = (pagina - 1) * porPagina;

    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoin('p.proyecto',    'pr').addSelect(['pr.nombre', 'pr.codigo'])
      .leftJoin('p.responsable', 'u').addSelect(['u.nombre', 'u.apellido'])
      .orderBy('p.creadoEn', 'DESC')
      .skip(skip)
      .take(porPagina);

    if (query.proyectoId) qb.andWhere('p.proyectoId = :pid', { pid: query.proyectoId });
    if (query.estado)     qb.andWhere('p.estado = :estado', { estado: query.estado });

    if (!esAdmin && usuarioId) {
      qb.andWhere(
        `p.proyectoId IN (
          SELECT pr2.id FROM proyectos pr2
          WHERE pr2.jefe_proyecto_id = :uid OR pr2.jefe_qa_id = :uid OR pr2.responsable_qa_id = :uid
             OR EXISTS (SELECT 1 FROM casos_prueba cp2 WHERE cp2.proyecto_id = pr2.id AND cp2.responsable_qa_id = :uid)
             OR EXISTS (SELECT 1 FROM defectos d2    WHERE d2.proyecto_id  = pr2.id AND (d2.asignado_a = :uid OR d2.reportado_por = :uid))
        )`,
        { uid: usuarioId },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    const planIds = items.map(p => p.id);
    const [cicloStats, reqCounts] = await Promise.all([
      planIds.length ? this.getCicloStats(planIds) : {} as Record<number, any>,
      planIds.length ? this.getReqCounts(planIds)  : {} as Record<number, number>,
    ]);

    const datos = items.map(p => ({
      ...p,
      proyectoNombre:    p.proyecto?.nombre ?? p.proyectoNombre ?? null,
      proyectoCodigo:    p.proyecto?.codigo ?? null,
      responsableNombre: p.responsable
        ? `${p.responsable.nombre} ${p.responsable.apellido}`
        : (p.responsableNombre ?? null),
      totalCiclos:        cicloStats[p.id]?.totalCiclos        ?? 0,
      ciclosCerrados:     cicloStats[p.id]?.ciclosCerrados     ?? 0,
      totalEjecuciones:   cicloStats[p.id]?.totalEjecuciones   ?? 0,
      aprobados:          cicloStats[p.id]?.aprobados           ?? 0,
      fallidos:           cicloStats[p.id]?.fallidos            ?? 0,
      totalRequerimientos: reqCounts[p.id] ?? 0,
      proyecto:    undefined,
      responsable: undefined,
    }));

    return { datos, total, pagina, porPagina };
  }

  async findOne(id: number): Promise<any> {
    const p = await this.repo.findOne({
      where: { id },
      relations: ['proyecto', 'responsable'],
    });
    if (!p) throw new NotFoundException(`Plan #${id} no encontrado`);

    const [ciclos, requerimientos] = await Promise.all([
      this.repo.manager.query(
        `SELECT
           c.id,
           c.nombre,
           c.ambiente,
           c.estado,
           c.fecha_inicio   AS "fechaInicio",
           c.fecha_fin      AS "fechaFin",
           c.creado_en      AS "creadoEn",
           COUNT(e.id)::int                                                AS "totalEjecuciones",
           SUM(CASE WHEN e.resultado = 'Aprobado'               THEN 1 ELSE 0 END)::int AS aprobados,
           SUM(CASE WHEN e.resultado IN ('Fallido','Bloqueado')  THEN 1 ELSE 0 END)::int AS fallidos,
           SUM(CASE WHEN e.resultado = 'Omitido'                THEN 1 ELSE 0 END)::int AS omitidos
         FROM ciclos_prueba c
         LEFT JOIN ejecuciones_caso_prueba e ON e.ciclo_id = c.id
         WHERE c.plan_prueba_id = $1
         GROUP BY c.id
         ORDER BY c.creado_en DESC`,
        [id],
      ),
      this.repo.manager.query(
        `SELECT
           r.id,
           r.codigo,
           r.titulo,
           r.prioridad,
           r.estado                                                                   AS "estadoReq",
           COUNT(DISTINCT cp.id)::int                                                 AS "totalCasos",
           COUNT(DISTINCT CASE WHEN ult.resultado IS NOT NULL THEN cp.id END)::int    AS "casosEjecutados",
           COUNT(DISTINCT CASE WHEN ult.resultado = 'Aprobado' THEN cp.id END)::int  AS "casosAprobados",
           COUNT(DISTINCT CASE WHEN ult.resultado IN ('Fallido','Bloqueado') THEN cp.id END)::int AS "casosFallidos"
         FROM plan_requerimientos pr
         JOIN requerimientos r ON r.id = pr.requerimiento_id
         LEFT JOIN casos_prueba cp ON cp.requerimiento_id = r.id
         LEFT JOIN LATERAL (
           SELECT e.resultado
           FROM ejecuciones_caso_prueba e
           JOIN ciclos_prueba c ON c.id = e.ciclo_id
           WHERE e.caso_prueba_id = cp.id
             AND c.plan_prueba_id = $1
           ORDER BY e.creado_en DESC
           LIMIT 1
         ) ult ON true
         WHERE pr.plan_id = $1
         GROUP BY r.id, r.codigo, r.titulo, r.prioridad, r.estado
         ORDER BY r.codigo`,
        [id],
      ),
    ]);

    const requerimientosConEstado = requerimientos.map((r: any) => ({
      ...r,
      estadoValidacion: this.calcEstadoValidacion(r),
    }));

    return {
      ...p,
      proyectoNombre:    p.proyecto?.nombre ?? p.proyectoNombre ?? null,
      proyectoCodigo:    p.proyecto?.codigo ?? null,
      responsableNombre: p.responsable
        ? `${p.responsable.nombre} ${p.responsable.apellido}`
        : (p.responsableNombre ?? null),
      ciclos,
      requerimientos: requerimientosConEstado,
      requerimientoIds: requerimientos.map((r: any) => r.id),
      proyecto:    undefined,
      responsable: undefined,
    };
  }

  async create(dto: CreatePlanPruebaDto): Promise<any> {
    const [proyRow] = await this.repo.manager.query(
      `SELECT nombre FROM proyectos WHERE id = $1`, [dto.proyectoId],
    );
    if (!proyRow) throw new NotFoundException('Proyecto no encontrado');

    let responsableNombre: string | null = null;
    if (dto.responsableId) {
      const [uRow] = await this.repo.manager.query(
        `SELECT nombre, apellido FROM usuarios WHERE id = $1`, [dto.responsableId],
      );
      if (uRow) responsableNombre = `${uRow.nombre} ${uRow.apellido}`;
    }

    const { requerimientoIds, ...planData } = dto;
    const plan = this.repo.create({
      ...planData,
      sprint:            dto.sprint       ?? null,
      tipoPrueba:        dto.tipoPrueba   ?? null,
      ambiente:          dto.ambiente     ?? null,
      responsableId:     dto.responsableId ?? null,
      proyectoNombre:    proyRow.nombre,
      responsableNombre,
      estado:            EstadoPlan.BORRADOR,
    });
    const saved = await this.repo.save(plan);

    if (requerimientoIds?.length) {
      await this.syncRequerimientos(saved.id, requerimientoIds);
    }

    // Auto-advance state based on linked requerimientos
    const nuevoEstado = await this.recalcularEstado(saved.id);
    if (nuevoEstado !== saved.estado) {
      saved.estado = nuevoEstado;
      await this.repo.save(saved);
    }

    return this.findOne(saved.id);
  }

  async update(id: number, dto: Partial<CreatePlanPruebaDto>): Promise<any> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} no encontrado`);

    if (dto.responsableId !== undefined) {
      if (dto.responsableId) {
        const [uRow] = await this.repo.manager.query(
          `SELECT nombre, apellido FROM usuarios WHERE id = $1`, [dto.responsableId],
        );
        plan.responsableNombre = uRow ? `${uRow.nombre} ${uRow.apellido}` : null;
      } else {
        plan.responsableNombre = null;
      }
    }

    const { requerimientoIds, ...planData } = dto as any;
    Object.assign(plan, planData);
    await this.repo.save(plan);

    if (requerimientoIds !== undefined) {
      await this.syncRequerimientos(id, requerimientoIds ?? []);
    }

    // Auto-recalculate state unless manually closed
    if (plan.estado !== EstadoPlan.CERRADO) {
      const nuevoEstado = await this.recalcularEstado(id);
      if (nuevoEstado !== plan.estado) {
        await this.repo.update(id, { estado: nuevoEstado });
      }
    }

    return this.findOne(id);
  }

  async syncRequerimientos(planId: number, requerimientoIds: number[]): Promise<void> {
    await this.repo.manager.query(
      `DELETE FROM plan_requerimientos WHERE plan_id = $1`, [planId],
    );
    for (const reqId of requerimientoIds) {
      await this.repo.manager.query(
        `INSERT INTO plan_requerimientos (plan_id, requerimiento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [planId, reqId],
      );
    }
  }

  async cerrar(id: number): Promise<any> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} no encontrado`);
    plan.estado = EstadoPlan.CERRADO;
    await this.repo.save(plan);
    return this.findOne(id);
  }

  async reabrir(id: number): Promise<any> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} no encontrado`);
    plan.estado = await this.recalcularEstado(id);
    await this.repo.save(plan);
    return this.findOne(id);
  }

  // Called by CiclosPruebaService when a ciclo linked to this plan is created/reactivated
  async activarPorCiclo(planId: number): Promise<void> {
    await this.repo.manager.query(
      `UPDATE planes_prueba SET estado = $1 WHERE id = $2 AND estado != $3`,
      [EstadoPlan.EN_EJECUCION, planId, EstadoPlan.CERRADO],
    );
  }

  async getTrazabilidad(planId: number): Promise<any> {
    const plan = await this.repo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan #${planId} no encontrado`);

    const rows: any[] = await this.repo.manager.query(
      `SELECT
         r.id           AS "reqId",
         r.codigo       AS "reqCodigo",
         r.titulo       AS "reqTitulo",
         r.prioridad    AS "reqPrioridad",
         r.estado       AS "reqEstado",
         cp.id          AS "casoId",
         cp.codigo_cp   AS "casoCodigo",
         cp.nombre      AS "casoTitulo",
         cp.tipo        AS "casoTipo",
         cp.prioridad   AS "casoPrioridad",
         ult.resultado  AS "ultimoResultado",
         ult.creado_en  AS "ultimaEjecucionFecha"
       FROM plan_requerimientos pr
       JOIN requerimientos r ON r.id = pr.requerimiento_id
       LEFT JOIN casos_prueba cp ON cp.requerimiento_id = r.id
       LEFT JOIN LATERAL (
         SELECT e.resultado, e.creado_en
         FROM ejecuciones_caso_prueba e
         JOIN ciclos_prueba c ON c.id = e.ciclo_id
         WHERE e.caso_prueba_id = cp.id
           AND c.plan_prueba_id = $1
         ORDER BY e.creado_en DESC
         LIMIT 1
       ) ult ON true
       WHERE pr.plan_id = $1
       ORDER BY r.codigo, cp.codigo_cp`,
      [planId],
    );

    const casoIds = [...new Set(rows.filter(r => r.casoId).map(r => Number(r.casoId)))];
    const defectos: any[] = casoIds.length
      ? await this.repo.manager.query(
          `SELECT
             d.id,
             d.caso_prueba_id  AS "casoPruebaId",
             d.codigo_proyecto AS "codigoProyecto",
             d.titulo,
             d.estado,
             d.severidad
           FROM defectos d
           WHERE d.caso_prueba_id = ANY($1)
           ORDER BY d.creado_en DESC`,
          [casoIds],
        )
      : [];

    const defectosPorCaso = defectos.reduce((acc: Record<number, any[]>, d) => {
      (acc[d.casoPruebaId] ??= []).push(d);
      return acc;
    }, {});

    const reqMap = new Map<number, any>();
    for (const row of rows) {
      if (!reqMap.has(row.reqId)) {
        reqMap.set(row.reqId, {
          id:       row.reqId,
          codigo:   row.reqCodigo,
          titulo:   row.reqTitulo,
          prioridad: row.reqPrioridad,
          estado:   row.reqEstado,
          casos:    [],
        });
      }
      if (row.casoId) {
        reqMap.get(row.reqId).casos.push({
          id:                   row.casoId,
          codigo:               row.casoCodigo,
          titulo:               row.casoTitulo,
          tipo:                 row.casoTipo,
          prioridad:            row.casoPrioridad,
          ultimoResultado:      row.ultimoResultado      ?? null,
          ultimaEjecucionFecha: row.ultimaEjecucionFecha ?? null,
          defectos:             defectosPorCaso[row.casoId] ?? [],
        });
      }
    }

    return {
      planId,
      planNombre:     plan.nombre,
      proyectoNombre: plan.proyectoNombre,
      requerimientos: Array.from(reqMap.values()),
    };
  }

  async remove(id: number): Promise<void> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} no encontrado`);
    await this.repo.remove(plan);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async recalcularEstado(planId: number): Promise<EstadoPlan> {
    const [{ activeCiclos }] = await this.repo.manager.query(
      `SELECT COUNT(*)::int AS "activeCiclos"
       FROM ciclos_prueba
       WHERE plan_prueba_id = $1 AND estado = 'Activo'`,
      [planId],
    );
    if (activeCiclos > 0) return EstadoPlan.EN_EJECUCION;

    const [{ totalReqs }] = await this.repo.manager.query(
      `SELECT COUNT(*)::int AS "totalReqs"
       FROM plan_requerimientos
       WHERE plan_id = $1`,
      [planId],
    );
    return totalReqs > 0 ? EstadoPlan.PLANIFICADO : EstadoPlan.BORRADOR;
  }

  private calcEstadoValidacion(r: any): string {
    if (r.totalCasos      === 0) return 'Sin casos';
    if (r.casosEjecutados === 0) return 'Sin ejecutar';
    if (r.casosFallidos    > 0)  return 'Con fallas';
    if (r.casosAprobados  === r.totalCasos) return 'Validado';
    return 'En progreso';
  }

  private async getCicloStats(planIds: number[]): Promise<Record<number, any>> {
    if (!planIds.length) return {};
    const rows: any[] = await this.repo.manager.query(
      `SELECT
         c.plan_prueba_id                                               AS "planId",
         COUNT(DISTINCT c.id)::int                                      AS "totalCiclos",
         COUNT(DISTINCT CASE WHEN c.estado = 'Cerrado' THEN c.id END)::int AS "ciclosCerrados",
         COUNT(e.id)::int                                               AS "totalEjecuciones",
         SUM(CASE WHEN e.resultado = 'Aprobado'              THEN 1 ELSE 0 END)::int AS aprobados,
         SUM(CASE WHEN e.resultado IN ('Fallido','Bloqueado') THEN 1 ELSE 0 END)::int AS fallidos
       FROM ciclos_prueba c
       LEFT JOIN ejecuciones_caso_prueba e ON e.ciclo_id = c.id
       WHERE c.plan_prueba_id = ANY($1)
       GROUP BY c.plan_prueba_id`,
      [planIds],
    );
    return Object.fromEntries(rows.map(r => [r.planId, r]));
  }

  private async getReqCounts(planIds: number[]): Promise<Record<number, number>> {
    if (!planIds.length) return {};
    const rows: any[] = await this.repo.manager.query(
      `SELECT plan_id AS "planId", COUNT(*)::int AS total
       FROM plan_requerimientos
       WHERE plan_id = ANY($1)
       GROUP BY plan_id`,
      [planIds],
    );
    return Object.fromEntries(rows.map(r => [r.planId, r.total]));
  }
}
