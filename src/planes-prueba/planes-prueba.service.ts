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

  async findAll(query: { proyectoId?: number; estado?: string; pagina?: number; porPagina?: number }): Promise<any> {
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
      responsableId:     dto.responsableId     ?? null,
      proyectoNombre:    proyRow.nombre,
      responsableNombre,
      estado:            EstadoPlan.ACTIVO,
    });
    const saved = await this.repo.save(plan);

    if (requerimientoIds?.length) {
      await this.syncRequerimientos(saved.id, requerimientoIds);
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

  async cerrar(id: number): Promise<PlanPrueba> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} no encontrado`);
    plan.estado = EstadoPlan.CERRADO;
    return this.repo.save(plan);
  }

  async reabrir(id: number): Promise<PlanPrueba> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} no encontrado`);
    plan.estado = EstadoPlan.ACTIVO;
    return this.repo.save(plan);
  }

  async remove(id: number): Promise<void> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan #${id} no encontrado`);
    await this.repo.remove(plan);
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
