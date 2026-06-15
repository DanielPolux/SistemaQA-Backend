import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasoPrueba } from './entities/caso-prueba.entity';
import { CreateCasoPruebaDto } from './dto/create-caso-prueba.dto';
import { UpdateCasoPruebaDto } from './dto/update-caso-prueba.dto';
import { QueryCasoPruebaDto } from './dto/query-caso-prueba.dto';
import { ImportarCasosPruebaDto } from './dto/importar-casos-prueba.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class CasosPruebaService {
  constructor(
    @InjectRepository(CasoPrueba)
    private casosRepo: Repository<CasoPrueba>,
  ) {}

  async findAll(query: QueryCasoPruebaDto): Promise<PaginatedResponseDto<any>> {
    const pagina    = Number(query.pagina)    || 1;
    const porPagina = Number(query.porPagina) || 10;
    const skip      = (pagina - 1) * porPagina;

    const qb = this.casosRepo
      .createQueryBuilder('c')
      .leftJoin('c.proyecto',      'p' ).addSelect(['p.nombre'])
      .leftJoin('c.requerimiento', 'r' ).addSelect(['r.codigo'])
      .leftJoin('c.responsableQa', 'rq').addSelect(['rq.nombre', 'rq.apellido'])
      .leftJoin('c.creador',       'u' ).addSelect(['u.nombre', 'u.apellido'])
      .skip(skip)
      .take(porPagina)
      .orderBy('c.creadoEn', 'DESC');

    if (query.proyectoId)    qb.andWhere('c.proyectoId     = :pid',      { pid:    query.proyectoId });
    if (query.requerimientoId) qb.andWhere('c.requerimientoId = :rid',   { rid:    query.requerimientoId });
    if (query.estado)        qb.andWhere('c.estado          = :estado',   { estado: query.estado });
    if (query.resultado)     qb.andWhere('c.resultado       = :res',      { res:    query.resultado });
    if (query.tipo)          qb.andWhere('c.tipo            = :tipo',     { tipo:   query.tipo });
    if (query.prioridad)     qb.andWhere('c.prioridad       = :pr',       { pr:     query.prioridad });
    if (query.responsableQaId) qb.andWhere('c.responsableQaId = :rqId',  { rqId:   query.responsableQaId });
    if (query.busqueda) {
      qb.andWhere('(c.nombre ILIKE :b OR c.codigo ILIKE :b OR c.requerimientoRf ILIKE :b)', {
        b: `%${query.busqueda}%`,
      });
    }

    const [casos, total] = await qb.getManyAndCount();

    const datos = casos.map((c) => this.mapCaso(c));
    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number): Promise<any> {
    const c = await this.casosRepo.findOne({
      where: { id },
      relations: ['proyecto', 'requerimiento', 'responsableQa', 'creador'],
    });
    if (!c) throw new NotFoundException(`Caso de prueba #${id} no encontrado`);
    return this.mapCaso(c);
  }

  async findByProyecto(proyectoId: number): Promise<CasoPrueba[]> {
    return this.casosRepo.find({ where: { proyectoId }, order: { creadoEn: 'DESC' } });
  }

  async create(dto: CreateCasoPruebaDto, creadoPor: number): Promise<CasoPrueba> {
    const caso = this.casosRepo.create({ ...dto, creadoPor });
    return this.casosRepo.save(caso);
  }

  async update(id: number, dto: UpdateCasoPruebaDto): Promise<CasoPrueba> {
    const caso = await this.casosRepo.findOne({ where: { id } });
    if (!caso) throw new NotFoundException(`Caso de prueba #${id} no encontrado`);
    Object.assign(caso, dto);
    return this.casosRepo.save(caso);
  }

  async remove(id: number): Promise<void> {
    const caso = await this.casosRepo.findOne({ where: { id } });
    if (!caso) throw new NotFoundException(`Caso de prueba #${id} no encontrado`);
    await this.casosRepo.remove(caso);
  }

  async importar(
    dto: ImportarCasosPruebaDto,
    creadoPor: number,
  ): Promise<{ importados: number; errores: { fila: number; mensaje: string }[] }> {
    let importados = 0;
    const errores: { fila: number; mensaje: string }[] = [];

    for (let i = 0; i < dto.casos.length; i++) {
      try {
        await this.create(dto.casos[i], creadoPor);
        importados++;
      } catch (e: any) {
        errores.push({ fila: i + 1, mensaje: e?.message ?? 'Error desconocido' });
      }
    }

    return { importados, errores };
  }

  private mapCaso(c: CasoPrueba) {
    return {
      ...c,
      proyectoNombre:      c.proyecto      ? c.proyecto.nombre                                      : null,
      requerimientoCodigo: c.requerimiento ? c.requerimiento.codigo                                 : null,
      responsableQaNombre: c.responsableQa ? `${c.responsableQa.nombre} ${c.responsableQa.apellido}`: null,
      creadoPorNombre:     c.creador       ? `${c.creador.nombre} ${c.creador.apellido}`            : null,
      proyecto:      undefined,
      requerimiento: undefined,
      responsableQa: undefined,
      creador:       undefined,
    };
  }
}
