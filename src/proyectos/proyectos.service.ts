import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
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
    const pagina = Number(query.pagina) || 1;
    const porPagina = Number(query.porPagina) || 10;
    const skip = (pagina - 1) * porPagina;

    const qb = this.proyectosRepo
      .createQueryBuilder('p')
      .leftJoin('p.responsable', 'r')
      .addSelect(['r.nombre', 'r.apellido'])
      .skip(skip)
      .take(porPagina)
      .orderBy('p.creadoEn', 'DESC');

    if (query.estado) qb.andWhere('p.estado = :estado', { estado: query.estado });
    if (query.responsableId) qb.andWhere('p.responsableId = :rid', { rid: query.responsableId });
    if (query.busqueda) {
      qb.andWhere('(p.nombre ILIKE :b OR p.codigo ILIKE :b)', { b: `%${query.busqueda}%` });
    }

    const [proyectos, total] = await qb.getManyAndCount();

    const datos = proyectos.map((p) => ({
      ...p,
      responsableNombre: p.responsable ? `${p.responsable.nombre} ${p.responsable.apellido}` : null,
      responsable: undefined,
    }));

    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number): Promise<any> {
    const proyecto = await this.proyectosRepo.findOne({
      where: { id },
      relations: ['responsable'],
    });
    if (!proyecto) throw new NotFoundException(`Proyecto #${id} no encontrado`);

    return {
      ...proyecto,
      responsableNombre: proyecto.responsable
        ? `${proyecto.responsable.nombre} ${proyecto.responsable.apellido}`
        : null,
      responsable: undefined,
    };
  }

  async getResumen(id: number) {
    const proyecto = await this.findOne(id);

    const result = await this.proyectosRepo.manager.query(
      `SELECT
        (SELECT COUNT(*) FROM requerimientos WHERE proyecto_id = $1) AS "totalRequerimientos",
        (SELECT COUNT(*) FROM casos_prueba WHERE proyecto_id = $1) AS "totalCasosPrueba",
        (SELECT COUNT(*) FROM defectos WHERE proyecto_id = $1) AS "totalDefectos",
        (SELECT COUNT(*) FROM defectos WHERE proyecto_id = $1 AND estado NOT IN ('Resuelto','Cerrado','Rechazado')) AS "defectosAbiertos"`,
      [id],
    );

    return {
      id: proyecto.id,
      nombre: proyecto.nombre,
      codigo: proyecto.codigo,
      estado: proyecto.estado,
      ...result[0],
    };
  }

  async create(dto: CreateProyectoDto, creadoPor: number): Promise<Proyecto> {
    const existe = await this.proyectosRepo.findOne({ where: { codigo: dto.codigo } });
    if (existe) throw new BadRequestException(`El código '${dto.codigo}' ya está en uso`);

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
}
