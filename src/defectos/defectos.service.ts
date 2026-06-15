import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Defecto, EstadoDefecto, EstadoDesarrollo } from './entities/defecto.entity';
import { ComentarioDefecto } from './entities/comentario-defecto.entity';
import { CreateDefectoDto } from './dto/create-defecto.dto';
import { UpdateDefectoDto } from './dto/update-defecto.dto';
import { QueryDefectoDto } from './dto/query-defecto.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class DefectosService {
  constructor(
    @InjectRepository(Defecto)
    private defectosRepo: Repository<Defecto>,
    @InjectRepository(ComentarioDefecto)
    private comentariosRepo: Repository<ComentarioDefecto>,
  ) {}

  async findAll(query: QueryDefectoDto): Promise<PaginatedResponseDto<any>> {
    const pagina = Number(query.pagina) || 1;
    const porPagina = Number(query.porPagina) || 10;
    const skip = (pagina - 1) * porPagina;

    const qb = this.defectosRepo
      .createQueryBuilder('d')
      .leftJoin('d.proyecto', 'p').addSelect(['p.nombre'])
      .leftJoin('d.casoPrueba', 'cp').addSelect(['cp.codigo'])
      .leftJoin('d.asignado', 'a').addSelect(['a.nombre', 'a.apellido'])
      .leftJoin('d.reportador', 'r').addSelect(['r.nombre', 'r.apellido'])
      .skip(skip)
      .take(porPagina)
      .orderBy('d.creadoEn', 'DESC');

    if (query.proyectoId) qb.andWhere('d.proyectoId = :pid', { pid: query.proyectoId });
    if (query.casoPruebaId) qb.andWhere('d.casoPruebaId = :cid', { cid: query.casoPruebaId });
    if (query.estado) qb.andWhere('d.estado = :estado', { estado: query.estado });
    if (query.severidad) qb.andWhere('d.severidad = :s', { s: query.severidad });
    if (query.prioridad) qb.andWhere('d.prioridad = :pr', { pr: query.prioridad });
    if (query.asignadoA) qb.andWhere('d.asignadoA = :aa', { aa: query.asignadoA });
    if (query.busqueda) {
      qb.andWhere('(d.titulo ILIKE :b OR d.codigo ILIKE :b)', { b: `%${query.busqueda}%` });
    }

    const [defectos, total] = await qb.getManyAndCount();

    const datos = defectos.map((d) => ({
      ...d,
      proyectoNombre: d.proyecto?.nombre ?? null,
      casoPruebaCodigo: d.casoPrueba?.codigo ?? null,
      asignadoANombre: d.asignado ? `${d.asignado.nombre} ${d.asignado.apellido}` : null,
      reportadoPorNombre: d.reportador ? `${d.reportador.nombre} ${d.reportador.apellido}` : null,
      proyecto: undefined,
      casoPrueba: undefined,
      asignado: undefined,
      reportador: undefined,
    }));

    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number): Promise<any> {
    const d = await this.defectosRepo.findOne({
      where: { id },
      relations: ['proyecto', 'casoPrueba', 'asignado', 'reportador', 'comentarios', 'comentarios.usuario'],
    });
    if (!d) throw new NotFoundException(`Defecto #${id} no encontrado`);

    const comentarios = d.comentarios?.map((c) => ({
      id: c.id,
      defectoId: c.defectoId,
      usuarioId: c.usuarioId,
      usuarioNombre: c.usuario ? `${c.usuario.nombre} ${c.usuario.apellido}` : null,
      comentario: c.comentario,
      creadoEn: c.creadoEn,
    }));

    return {
      ...d,
      proyectoNombre: d.proyecto?.nombre ?? null,
      casoPruebaCodigo: d.casoPrueba?.codigo ?? null,
      asignadoANombre: d.asignado ? `${d.asignado.nombre} ${d.asignado.apellido}` : null,
      reportadoPorNombre: d.reportador ? `${d.reportador.nombre} ${d.reportador.apellido}` : null,
      comentarios,
      proyecto: undefined,
      casoPrueba: undefined,
      asignado: undefined,
      reportador: undefined,
    };
  }

  async findByCasoPrueba(casoPruebaId: number): Promise<Defecto[]> {
    return this.defectosRepo.find({ where: { casoPruebaId }, order: { creadoEn: 'DESC' } });
  }

  async create(dto: CreateDefectoDto, reportadoPor: number): Promise<Defecto> {
    const defecto = this.defectosRepo.create({ ...dto, reportadoPor });
    return this.defectosRepo.save(defecto);
  }

  async update(id: number, dto: UpdateDefectoDto): Promise<Defecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);
    Object.assign(defecto, dto);
    return this.defectosRepo.save(defecto);
  }

  async cambiarEstado(id: number, dto: CambiarEstadoDto, usuarioId: number): Promise<Defecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);

    defecto.estado = dto.estado;
    if (
      dto.estado === EstadoDefecto.RESUELTO ||
      dto.estado === EstadoDefecto.CERRADO
    ) {
      defecto.fechaResolucion = new Date();
    }

    await this.defectosRepo.save(defecto);

    if (dto.comentario) {
      await this.comentariosRepo.save(
        this.comentariosRepo.create({ defectoId: id, usuarioId, comentario: dto.comentario }),
      );
    }

    return defecto;
  }

  async agregarComentario(id: number, dto: CreateComentarioDto, usuarioId: number): Promise<ComentarioDefecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);

    const comentario = this.comentariosRepo.create({
      defectoId: id,
      usuarioId,
      comentario: dto.comentario,
    });
    return this.comentariosRepo.save(comentario);
  }

  async actualizarEstadoDesarrollo(id: number, estadoDesarrollo: EstadoDesarrollo): Promise<Defecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);
    defecto.estadoDesarrollo = estadoDesarrollo;
    return this.defectosRepo.save(defecto);
  }

  async remove(id: number): Promise<void> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);
    await this.defectosRepo.remove(defecto);
  }
}
