import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CicloPrueba, EstadoCiclo } from './entities/ciclo-prueba.entity';
import { CreateCicloPruebaDto } from './dto/create-ciclo-prueba.dto';
import { QueryCicloPruebaDto } from './dto/query-ciclo-prueba.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { userProjectFilter } from '../common/helpers/user-access.helper';

@Injectable()
export class CiclosPruebaService {
  constructor(
    @InjectRepository(CicloPrueba)
    private repo: Repository<CicloPrueba>,
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
       ultima_ejec AS (
         SELECT DISTINCT ON (e.caso_prueba_id)
           e.caso_prueba_id,
           e.resultado,
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
         r.estado              AS "requerimientoEstado",
         ue.resultado          AS "resultadoCiclo",
         ue.ejecucion_id       AS "ejecucionId",
         ue.creado_en          AS "fechaEjecucion"
       FROM casos_prueba cp
       LEFT JOIN requerimientos r  ON r.id = cp.requerimiento_id
       LEFT JOIN planificados pl ON pl.caso_prueba_id = cp.id
       LEFT JOIN ultima_ejec ue  ON ue.caso_prueba_id = cp.id
       WHERE (
         (EXISTS (SELECT 1 FROM planificados) AND pl.caso_prueba_id IS NOT NULL)
         OR
         (NOT EXISTS (SELECT 1 FROM planificados)
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

  async cerrar(id: number): Promise<CicloPrueba> {
    const ciclo = await this.findOne(id);
    ciclo.estado = EstadoCiclo.CERRADO;
    if (!ciclo.fechaFin) ciclo.fechaFin = new Date() as any;
    return this.repo.save(ciclo);
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
