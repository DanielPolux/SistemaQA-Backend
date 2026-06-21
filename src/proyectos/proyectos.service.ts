import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoProyecto, Proyecto } from './entities/proyecto.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { QueryProyectoDto } from './dto/query-proyecto.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { SharepointService } from '../sharepoint/sharepoint.service';

const TRANSICIONES_ESTADO: Record<EstadoProyecto, EstadoProyecto[]> = {
  [EstadoProyecto.POR_ESTIMAR]:   [EstadoProyecto.ESTIMADO],
  [EstadoProyecto.ESTIMADO]:      [EstadoProyecto.PLANIFICADO],
  [EstadoProyecto.PLANIFICADO]:   [EstadoProyecto.EN_EJECUCION],
  [EstadoProyecto.EN_EJECUCION]:  [EstadoProyecto.FINALIZADO, EstadoProyecto.OBSERVADO],
  [EstadoProyecto.OBSERVADO]:     [EstadoProyecto.EN_EJECUCION],
  [EstadoProyecto.FINALIZADO]:    [EstadoProyecto.EN_PRODUCCION],
  [EstadoProyecto.EN_PRODUCCION]: [],
};

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectosRepo: Repository<Proyecto>,
    private sharepointService: SharepointService,
  ) {}

  async findAll(
    query: QueryProyectoDto,
    usuarioId?: number,
    esAdmin = true,
  ): Promise<PaginatedResponseDto<any>> {
    const pagina    = Number(query.pagina)    || 1;
    const porPagina = Number(query.porPagina) || 10;
    const skip      = (pagina - 1) * porPagina;

    const qb = this.proyectosRepo
      .createQueryBuilder('p')
      .leftJoin('p.jefeProyecto', 'jp').addSelect(['jp.nombre', 'jp.apellido'])
      .leftJoin('p.jefeQa',       'jq').addSelect(['jq.nombre', 'jq.apellido'])
      .leftJoin('p.responsableQa','rq').addSelect(['rq.nombre', 'rq.apellido'])
      .skip(skip)
      .take(porPagina)
      .orderBy('p.creadoEn', 'DESC');

    if (!esAdmin && usuarioId) {
      qb.andWhere(
        `(p.jefe_proyecto_id = :uid
          OR p.jefe_qa_id = :uid
          OR p.responsable_qa_id = :uid
          OR EXISTS (
            SELECT 1 FROM casos_prueba cp
            WHERE cp.proyecto_id = p.id AND cp.responsable_qa_id = :uid
          )
          OR EXISTS (
            SELECT 1 FROM defectos d
            WHERE d.proyecto_id = p.id AND (d.asignado_a = :uid OR d.reportado_por = :uid)
          ))`,
        { uid: usuarioId },
      );
    }

    if (query.estado)         qb.andWhere('p.estado = :estado',              { estado:         query.estado });
    if (query.jefeProyectoId) qb.andWhere('p.jefeProyectoId = :jpId',        { jpId:           query.jefeProyectoId });
    if (query.jefeQaId)       qb.andWhere('p.jefeQaId = :jqId',              { jqId:           query.jefeQaId });
    if (query.responsableQaId)qb.andWhere('p.responsableQaId = :rqId',       { rqId:           query.responsableQaId });
    if (query.cliente)        qb.andWhere('p.cliente ILIKE :cliente',         { cliente:        `%${query.cliente}%` });
    if (query.busqueda) {
      qb.andWhere(
        '(p.nombre ILIKE :b OR p.codigo ILIKE :b OR p.sistema ILIKE :b OR p.proyecto ILIKE :b OR p.cliente ILIKE :b)',
        { b: `%${query.busqueda}%` },
      );
    }

    const [proyectos, total] = await qb.getManyAndCount();

    let progressMap: Record<number, { avance: number; aprobacion: number }> = {};
    if (proyectos.length > 0) {
      const ids = proyectos.map((p) => p.id);
      const rows: Array<{ id: string; avance: string; aprobacion: string }> =
        await this.proyectosRepo.manager.query(
          `SELECT p.id,
            CASE WHEN COUNT(cp.id) = 0 THEN 0
                 ELSE ROUND(COUNT(CASE WHEN cp.estado = 'Ejecutado' THEN 1 END) * 100.0 / COUNT(cp.id))
            END AS avance,
            CASE WHEN COUNT(CASE WHEN cp.estado = 'Ejecutado' THEN 1 END) = 0 THEN 0
                 ELSE ROUND(COUNT(CASE WHEN cp.estado = 'Ejecutado' AND cp.resultado = 'Aprobado' THEN 1 END) * 100.0
                       / COUNT(CASE WHEN cp.estado = 'Ejecutado' THEN 1 END))
            END AS aprobacion
           FROM proyectos p
           LEFT JOIN casos_prueba cp ON cp.proyecto_id = p.id
           WHERE p.id = ANY($1::int[])
           GROUP BY p.id`,
          [ids],
        );
      progressMap = Object.fromEntries(
        rows.map((r) => [Number(r.id), { avance: Number(r.avance), aprobacion: Number(r.aprobacion) }]),
      );
    }

    const datos = proyectos.map((p) => ({
      ...this.mapProyecto(p),
      porcentajeAvance:     progressMap[p.id]?.avance     ?? 0,
      porcentajeAprobacion: progressMap[p.id]?.aprobacion ?? 0,
    }));
    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number, usuarioId?: number, esAdmin = true): Promise<any> {
    const p = await this.proyectosRepo.findOne({
      where: { id },
      relations: ['jefeProyecto', 'jefeQa', 'responsableQa', 'creador'],
    });
    if (!p) throw new NotFoundException(`Proyecto #${id} no encontrado`);

    if (!esAdmin && usuarioId) {
      const [acceso]: Array<{ tiene_acceso: boolean }> =
        await this.proyectosRepo.manager.query(
          `SELECT (
            p.jefe_proyecto_id = $2
            OR p.jefe_qa_id = $2
            OR p.responsable_qa_id = $2
            OR EXISTS (SELECT 1 FROM casos_prueba cp WHERE cp.proyecto_id = p.id AND cp.responsable_qa_id = $2)
            OR EXISTS (SELECT 1 FROM defectos d    WHERE d.proyecto_id  = p.id AND (d.asignado_a = $2 OR d.reportado_por = $2))
          ) AS tiene_acceso
          FROM proyectos p WHERE p.id = $1`,
          [id, usuarioId],
        );
      if (!acceso?.tiene_acceso) throw new NotFoundException(`Proyecto #${id} no encontrado`);
    }

    const [row]: Array<{ avance: string; aprobacion: string }> =
      await this.proyectosRepo.manager.query(
        `SELECT
          CASE WHEN COUNT(cp.id) = 0 THEN 0
               ELSE ROUND(COUNT(CASE WHEN cp.estado = 'Ejecutado' THEN 1 END) * 100.0 / COUNT(cp.id))
          END AS avance,
          CASE WHEN COUNT(CASE WHEN cp.estado = 'Ejecutado' THEN 1 END) = 0 THEN 0
               ELSE ROUND(COUNT(CASE WHEN cp.estado = 'Ejecutado' AND cp.resultado = 'Aprobado' THEN 1 END) * 100.0
                     / COUNT(CASE WHEN cp.estado = 'Ejecutado' THEN 1 END))
          END AS aprobacion
         FROM casos_prueba cp WHERE cp.proyecto_id = $1`,
        [id],
      );

    return {
      ...this.mapProyecto(p),
      porcentajeAvance:     row ? Number(row.avance)    : 0,
      porcentajeAprobacion: row ? Number(row.aprobacion): 0,
    };
  }

  async getResumen(id: number, usuarioId?: number, esAdmin = true) {
    const proyecto = await this.findOne(id, usuarioId, esAdmin);

    const [result] = await this.proyectosRepo.manager.query(
      `SELECT
        (SELECT COUNT(*) FROM requerimientos WHERE proyecto_id = $1)                                     AS "totalRequerimientos",
        (SELECT COUNT(*) FROM casos_prueba   WHERE proyecto_id = $1)                                     AS "totalCasosPrueba",
        (SELECT COUNT(*) FROM defectos       WHERE proyecto_id = $1)                                     AS "totalDefectos",
        (SELECT COUNT(*) FROM defectos       WHERE proyecto_id = $1
           AND estado NOT IN ('Resuelto','Cerrado','Rechazado'))                                          AS "defectosAbiertos"`,
      [id],
    );

    return {
      id:                   proyecto.id,
      nombre:               proyecto.nombre,
      codigo:               proyecto.codigo,
      cliente:              proyecto.cliente,
      estado:               proyecto.estado,
      porcentajeAvance:     proyecto.porcentajeAvance,
      totalRequerimientos:  Number(result.totalRequerimientos),
      totalCasosPrueba:     Number(result.totalCasosPrueba),
      totalDefectos:        Number(result.totalDefectos),
      defectosAbiertos:     Number(result.defectosAbiertos),
    };
  }

  async create(dto: CreateProyectoDto, creadoPor: number): Promise<Proyecto> {
    if (dto.codigo) {
      const existe = await this.proyectosRepo.findOne({ where: { codigo: dto.codigo } });
      if (existe) throw new BadRequestException(`El código '${dto.codigo}' ya está en uso`);
    }
    this.validarFechasReales(dto.estado, dto.fechaInicioReal, dto.fechaFinReal);
    const proyecto = this.proyectosRepo.create({ ...dto, creadoPor });
    return this.proyectosRepo.save(proyecto);
  }

  async update(id: number, dto: UpdateProyectoDto): Promise<Proyecto> {
    const proyecto = await this.proyectosRepo.findOne({ where: { id } });
    if (!proyecto) throw new NotFoundException(`Proyecto #${id} no encontrado`);
    if (dto.codigo && dto.codigo !== proyecto.codigo) {
      const existe = await this.proyectosRepo.findOne({ where: { codigo: dto.codigo } });
      if (existe) throw new BadRequestException(`El código '${dto.codigo}' ya está en uso`);
    }
    if (dto.estado && dto.estado !== proyecto.estado) {
      this.validarTransicionEstado(proyecto.estado, dto.estado);
    }
    Object.assign(proyecto, dto);
    this.validarFechasReales(proyecto.estado, proyecto.fechaInicioReal, proyecto.fechaFinReal);
    return this.proyectosRepo.save(proyecto);
  }

  private validarTransicionEstado(estadoActual: EstadoProyecto, estadoNuevo: EstadoProyecto): void {
    const permitidos = TRANSICIONES_ESTADO[estadoActual] ?? [];
    if (!permitidos.includes(estadoNuevo)) {
      const permitidosStr = permitidos.length
        ? permitidos.join(', ')
        : 'ninguno (estado terminal)';
      throw new BadRequestException(
        `No se puede cambiar el estado de "${estadoActual}" a "${estadoNuevo}". ` +
        `Transiciones permitidas: ${permitidosStr}.`,
      );
    }
  }

  private validarFechasReales(estado: string | undefined, fechaInicio: unknown, fechaFin: unknown): void {
    if (estado === EstadoProyecto.EN_EJECUCION && (!fechaInicio || !fechaFin)) {
      throw new BadRequestException(
        'Para poner el proyecto En Ejecución debe ingresar la Fecha Inicio Real y Fecha Fin Real (Entrega).',
      );
    }
  }

  async subirDocumento(id: number, archivo: Express.Multer.File): Promise<Proyecto> {
    const proyecto = await this.proyectosRepo.findOne({ where: { id } });
    if (!proyecto) throw new NotFoundException(`Proyecto #${id} no encontrado`);

    const doc = await this.sharepointService.subirArchivo(
      proyecto.codigo ?? String(proyecto.id),
      proyecto.nombre,
      archivo.buffer,
      archivo.originalname,
      archivo.mimetype,
    );

    proyecto.documentosRequerimientos = [...(proyecto.documentosRequerimientos ?? []), doc];
    return this.proyectosRepo.save(proyecto);
  }

  async eliminarDocumento(id: number, itemId: string): Promise<Proyecto> {
    const proyecto = await this.proyectosRepo.findOne({ where: { id } });
    if (!proyecto) throw new NotFoundException(`Proyecto #${id} no encontrado`);

    await this.sharepointService.eliminarArchivo(itemId);
    proyecto.documentosRequerimientos = (proyecto.documentosRequerimientos ?? [])
      .filter(d => d.itemId !== itemId);
    return this.proyectosRepo.save(proyecto);
  }

  async remove(id: number): Promise<void> {
    const proyecto = await this.proyectosRepo.findOne({ where: { id } });
    if (!proyecto) throw new NotFoundException(`Proyecto #${id} no encontrado`);
    await this.proyectosRepo.remove(proyecto);
  }

  private mapProyecto(p: Proyecto) {
    return {
      ...p,
      jefeProyectoNombre:  p.jefeProyecto  ? `${p.jefeProyecto.nombre} ${p.jefeProyecto.apellido}`  : null,
      jefeQaNombre:        p.jefeQa        ? `${p.jefeQa.nombre} ${p.jefeQa.apellido}`              : null,
      responsableQaNombre: p.responsableQa ? `${p.responsableQa.nombre} ${p.responsableQa.apellido}` : null,
      jefeProyecto:  undefined,
      jefeQa:        undefined,
      responsableQa: undefined,
      creador:       undefined,
    };
  }
}
