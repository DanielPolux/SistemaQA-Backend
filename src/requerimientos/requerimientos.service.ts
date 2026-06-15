import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requerimiento } from './entities/requerimiento.entity';
import { CreateRequerimientoDto } from './dto/create-requerimiento.dto';
import { UpdateRequerimientoDto } from './dto/update-requerimiento.dto';
import { QueryRequerimientoDto } from './dto/query-requerimiento.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class RequerimientosService {
  constructor(
    @InjectRepository(Requerimiento)
    private requerimientosRepo: Repository<Requerimiento>,
  ) {}

  async findAll(query: QueryRequerimientoDto): Promise<PaginatedResponseDto<any>> {
    const pagina = Number(query.pagina) || 1;
    const porPagina = Number(query.porPagina) || 10;
    const skip = (pagina - 1) * porPagina;

    const qb = this.requerimientosRepo
      .createQueryBuilder('r')
      .leftJoin('r.proyecto', 'p')
      .addSelect(['p.nombre'])
      .leftJoin('r.creador', 'u')
      .addSelect(['u.nombre', 'u.apellido'])
      .skip(skip)
      .take(porPagina)
      .orderBy('r.creadoEn', 'DESC');

    if (query.proyectoId) qb.andWhere('r.proyectoId = :pid', { pid: query.proyectoId });
    if (query.tipo) qb.andWhere('r.tipo = :tipo', { tipo: query.tipo });
    if (query.estado) qb.andWhere('r.estado = :estado', { estado: query.estado });
    if (query.prioridad) qb.andWhere('r.prioridad = :p', { p: query.prioridad });
    if (query.busqueda) {
      qb.andWhere('(r.titulo ILIKE :b OR r.codigo ILIKE :b)', { b: `%${query.busqueda}%` });
    }

    const [reqs, total] = await qb.getManyAndCount();

    const datos = reqs.map((r) => ({
      ...r,
      proyectoNombre: r.proyecto?.nombre ?? null,
      creadoPorNombre: r.creador ? `${r.creador.nombre} ${r.creador.apellido}` : null,
      proyecto: undefined,
      creador: undefined,
    }));

    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number): Promise<any> {
    const r = await this.requerimientosRepo.findOne({
      where: { id },
      relations: ['proyecto', 'creador'],
    });
    if (!r) throw new NotFoundException(`Requerimiento #${id} no encontrado`);

    return {
      ...r,
      proyectoNombre: r.proyecto?.nombre ?? null,
      creadoPorNombre: r.creador ? `${r.creador.nombre} ${r.creador.apellido}` : null,
      proyecto: undefined,
      creador: undefined,
    };
  }

  async findByProyecto(proyectoId: number): Promise<Requerimiento[]> {
    return this.requerimientosRepo.find({
      where: { proyectoId },
      order: { creadoEn: 'DESC' },
    });
  }

  async create(dto: CreateRequerimientoDto, creadoPor: number): Promise<Requerimiento> {
    const req = this.requerimientosRepo.create({ ...dto, creadoPor });
    return this.requerimientosRepo.save(req);
  }

  async update(id: number, dto: UpdateRequerimientoDto): Promise<Requerimiento> {
    const req = await this.requerimientosRepo.findOne({ where: { id } });
    if (!req) throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    Object.assign(req, dto);
    return this.requerimientosRepo.save(req);
  }

  async remove(id: number): Promise<void> {
    const req = await this.requerimientosRepo.findOne({ where: { id } });
    if (!req) throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    await this.requerimientosRepo.remove(req);
  }
}
