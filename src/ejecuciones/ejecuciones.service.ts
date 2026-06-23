import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EjecucionCasoPrueba, ResultadoEjecucion } from './entities/ejecucion-caso-prueba.entity';
import { CicloPrueba, EstadoCiclo } from '../ciclos-prueba/entities/ciclo-prueba.entity';
import { Defecto } from '../defectos/entities/defecto.entity';
import { CreateEjecucionDto } from './dto/create-ejecucion.dto';
import { QueryEjecucionDto } from './dto/query-ejecucion.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class EjecucionesService {
  constructor(
    @InjectRepository(EjecucionCasoPrueba)
    private repo: Repository<EjecucionCasoPrueba>,
    @InjectRepository(CicloPrueba)
    private ciclosRepo: Repository<CicloPrueba>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateEjecucionDto, reportadoPor?: number): Promise<EjecucionCasoPrueba & { defecto?: Defecto }> {
    const { defectoData, ...ejecucionFields } = dto;
    const esFallido = ejecucionFields.resultado === ResultadoEjecucion.FALLIDO;

    if (!esFallido || !defectoData) {
      return this.crearSoloEjecucion(ejecucionFields);
    }

    return this.dataSource.transaction(async (em) => {
      // Resolver ciclo activo dentro de la transacción
      let cicloId = ejecucionFields.cicloId ?? undefined;
      if (!cicloId && ejecucionFields.proyectoId) {
        const cicloActivo = await em.findOne(CicloPrueba, {
          where: { proyectoId: ejecucionFields.proyectoId, estado: EstadoCiclo.ACTIVO },
          order: { creadoEn: 'DESC' },
        });
        if (cicloActivo) cicloId = cicloActivo.id;
      }

      const ejecucion = em.create(EjecucionCasoPrueba, { ...ejecucionFields, cicloId });
      const ejecucionGuardada = await em.save(ejecucion);

      // Crear defecto con generación de códigos
      const defecto = em.create(Defecto, {
        ...defectoData,
        proyectoId:    ejecucionFields.proyectoId,
        casoPruebaId:  ejecucionFields.casoPruebaId,
        reportadoPor:  reportadoPor,
      });
      const defectoInsertado = await em.save(defecto);

      const [{ count }] = await em.query(
        'SELECT COUNT(*)::int AS count FROM defectos WHERE proyecto_id = $1',
        [ejecucionFields.proyectoId],
      );
      defectoInsertado.codigo         = `DEF-${String(defectoInsertado.id).padStart(4, '0')}`;
      defectoInsertado.codigoProyecto = `INC-${String(count).padStart(3, '0')}`;
      const defectoFinal = await em.save(defectoInsertado);

      // Vincular el defecto a la ejecución recién creada
      await em.query(
        'UPDATE ejecuciones_caso_prueba SET defecto_id = $1 WHERE id = $2',
        [defectoFinal.id, ejecucionGuardada.id],
      );

      return { ...ejecucionGuardada, defecto: defectoFinal };
    });
  }

  private async crearSoloEjecucion(fields: Omit<CreateEjecucionDto, 'defectoData'>): Promise<EjecucionCasoPrueba> {
    let cicloId = fields.cicloId ?? undefined;
    if (!cicloId && fields.proyectoId) {
      const cicloActivo = await this.ciclosRepo.findOne({
        where: { proyectoId: fields.proyectoId, estado: EstadoCiclo.ACTIVO },
        order: { creadoEn: 'DESC' },
      });
      if (cicloActivo) cicloId = cicloActivo.id;
    }
    const ejecucion = this.repo.create({ ...fields, cicloId });
    return this.repo.save(ejecucion);
  }

  async findAll(query: QueryEjecucionDto, usuarioId?: number, esAdmin = true): Promise<PaginatedResponseDto<any>> {
    const pagina    = Number(query.pagina)    || 1;
    const porPagina = Number(query.porPagina) || 20;
    const skip      = (pagina - 1) * porPagina;

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.casoPrueba',    'cp').addSelect(['cp.codigo', 'cp.nombre'])
      .leftJoin('e.proyecto',      'p' ).addSelect(['p.nombre',  'p.codigo'])
      .leftJoin('e.tester',        't' ).addSelect(['t.nombre',  't.apellido'])
      .leftJoin('e.defecto',       'd' ).addSelect(['d.codigo',  'd.codigoProyecto', 'd.titulo'])
      .leftJoin('e.ciclo',         'ci').addSelect(['ci.nombre', 'ci.estado'])
      .leftJoin('e.desarrollador', 'dv').addSelect(['dv.nombre', 'dv.apellido'])
      .orderBy('e.creadoEn', 'DESC')
      .skip(skip)
      .take(porPagina);

    if (query.casoPruebaId) qb.andWhere('e.casoPruebaId = :cpId', { cpId: query.casoPruebaId });
    if (query.proyectoId)   qb.andWhere('e.proyectoId   = :pid',  { pid:  query.proyectoId });
    if (query.resultado)    qb.andWhere('e.resultado     = :res',  { res:  query.resultado });
    if (query.ambiente)     qb.andWhere('e.ambiente      = :amb',  { amb:  query.ambiente });
    if (query.testerId)     qb.andWhere('e.testerId      = :tid',  { tid:  query.testerId });

    if (!esAdmin && usuarioId) {
      qb.andWhere(
        `(e.proyectoId IN (
          SELECT pr.id FROM proyectos pr
          WHERE pr.jefe_proyecto_id = :uid OR pr.jefe_qa_id = :uid OR pr.responsable_qa_id = :uid
             OR EXISTS (SELECT 1 FROM casos_prueba cp2 WHERE cp2.proyecto_id = pr.id AND cp2.responsable_qa_id = :uid)
             OR EXISTS (SELECT 1 FROM defectos d2    WHERE d2.proyecto_id  = pr.id AND (d2.asignado_a = :uid OR d2.reportado_por = :uid))
        ) OR e.testerId = :uid)`,
        { uid: usuarioId },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    const datos = items.map(e => this.mapEjecucion(e));
    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findByCasoPrueba(casoPruebaId: number): Promise<any[]> {
    const items = await this.repo
      .createQueryBuilder('e')
      .leftJoin('e.tester',        't' ).addSelect(['t.nombre',  't.apellido'])
      .leftJoin('e.defecto',       'd' ).addSelect(['d.codigo',  'd.codigoProyecto', 'd.titulo'])
      .leftJoin('e.ciclo',         'ci').addSelect(['ci.nombre', 'ci.estado'])
      .leftJoin('e.desarrollador', 'dv').addSelect(['dv.nombre', 'dv.apellido'])
      .where('e.casoPruebaId = :id', { id: casoPruebaId })
      .orderBy('e.creadoEn', 'DESC')
      .getMany();

    return items.map(e => this.mapEjecucion(e));
  }

  private mapEjecucion(e: EjecucionCasoPrueba) {
    return {
      ...e,
      casoPruebaCodigo:    e.casoPrueba?.codigo ?? null,
      casoPruebaNombre:    e.casoPrueba?.nombre ?? null,
      proyectoNombre:      e.proyecto?.nombre   ?? null,
      proyectoCodigo:      e.proyecto?.codigo   ?? null,
      testerNombre:        e.tester ? `${e.tester.nombre} ${e.tester.apellido}` : null,
      defectoCodigo:       e.defecto?.codigoProyecto ?? e.defecto?.codigo ?? null,
      defectoTitulo:       e.defecto?.titulo        ?? null,
      cicloNombre:         e.ciclo?.nombre          ?? null,
      cicloEstado:         e.ciclo?.estado          ?? null,
      desarrolladorNombre: e.desarrollador ? `${e.desarrollador.nombre} ${e.desarrollador.apellido}` : null,
      casoPrueba:    undefined,
      proyecto:      undefined,
      tester:        undefined,
      defecto:       undefined,
      ciclo:         undefined,
      desarrollador: undefined,
    };
  }
}
