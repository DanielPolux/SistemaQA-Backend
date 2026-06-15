import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proyecto } from './entities/proyecto.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { QueryProyectoDto } from './dto/query-proyecto.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectosRepo: Repository<Proyecto>,
  ) {}

  async findAll(query: QueryProyectoDto): Promise<PaginatedResponseDto<any>> {
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

    if (query.estado)         qb.andWhere('p.estado = :estado',              { estado:         query.estado });
    if (query.jefeProyectoId) qb.andWhere('p.jefeProyectoId = :jpId',        { jpId:           query.jefeProyectoId });
    if (query.jefeQaId)       qb.andWhere('p.jefeQaId = :jqId',              { jqId:           query.jefeQaId });
    if (query.responsableQaId)qb.andWhere('p.responsableQaId = :rqId',       { rqId:           query.responsableQaId });
    if (query.cliente)        qb.andWhere('p.cliente ILIKE :cliente',         { cliente:        `%${query.cliente}%` });
    if (query.busqueda) {
      qb.andWhere(
        '(p.nombre ILIKE :b OR p.codigo ILIKE :b OR p.sistema ILIKE :b OR p.proyecto ILIKE :b)',
        { b: `%${query.busqueda}%` },
      );
    }

    const [proyectos, total] = await qb.getManyAndCount();

    const datos = proyectos.map((p) => this.mapProyecto(p));
    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number): Promise<any> {
    const p = await this.proyectosRepo.findOne({
      where: { id },
      relations: ['jefeProyecto', 'jefeQa', 'responsableQa', 'creador'],
    });
    if (!p) throw new NotFoundException(`Proyecto #${id} no encontrado`);
    return this.mapProyecto(p);
  }

  async getResumen(id: number) {
    const proyecto = await this.findOne(id);

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
    const proyecto = this.proyectosRepo.create({ ...dto, creadoPor });
    return this.proyectosRepo.save(proyecto);
  }

  async update(id: number, dto: UpdateProyectoDto): Promise<Proyecto> {
    const proyecto = await this.proyectosRepo.findOne({ where: { id } });
    if (!proyecto) throw new NotFoundException(`Proyecto #${id} no encontrado`);
    Object.assign(proyecto, dto);
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
      jefeProyectoNombre:  p.jefeProyecto  ? `${p.jefeProyecto.nombre}  ${p.jefeProyecto.apellido}`  : null,
      jefeQaNombre:        p.jefeQa        ? `${p.jefeQa.nombre}        ${p.jefeQa.apellido}`        : null,
      responsableQaNombre: p.responsableQa ? `${p.responsableQa.nombre} ${p.responsableQa.apellido}` : null,
      jefeProyecto:  undefined,
      jefeQa:        undefined,
      responsableQa: undefined,
      creador:       undefined,
    };
  }
}
