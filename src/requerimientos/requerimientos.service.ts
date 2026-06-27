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

  async findAll(query: QueryRequerimientoDto, usuarioId?: number, esAdmin = true): Promise<PaginatedResponseDto<any>> {
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

    if (!esAdmin && usuarioId) {
      qb.andWhere(
        `r.proyectoId IN (
          SELECT pr.id FROM proyectos pr
          WHERE pr.jefe_proyecto_id = :uid OR pr.jefe_qa_id = :uid OR pr.responsable_qa_id = :uid
             OR EXISTS (SELECT 1 FROM casos_prueba cp2 WHERE cp2.proyecto_id = pr.id AND cp2.responsable_qa_id = :uid)
             OR EXISTS (SELECT 1 FROM defectos d2    WHERE d2.proyecto_id  = pr.id AND (d2.asignado_a = :uid OR d2.reportado_por = :uid))
        )`,
        { uid: usuarioId },
      );
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
    return this.requerimientosRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.creador', 'u')
      .where('r.proyectoId = :pid', { pid: proyectoId })
      .orderBy('r.creadoEn', 'DESC')
      .getMany();
  }

  async nextCodigo(proyectoId: number): Promise<{ codigo: string }> {
    const [{ max_num }] = await this.requerimientosRepo.manager.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 4) AS INTEGER)), 0) AS max_num
       FROM requerimientos
       WHERE proyecto_id = $1 AND codigo ~ '^RF-[0-9]+$'`,
      [proyectoId],
    );
    return { codigo: `RF-${String(Number(max_num) + 1).padStart(2, '0')}` };
  }

  async create(dto: CreateRequerimientoDto, creadoPor: number): Promise<Requerimiento> {
    const { codigo: codigoGenerado } = await this.nextCodigo(dto.proyectoId);
    const req = this.requerimientosRepo.create({ ...dto, creadoPor, codigo: codigoGenerado });
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
