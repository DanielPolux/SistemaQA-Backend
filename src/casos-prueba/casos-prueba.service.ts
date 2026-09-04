import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasoPrueba } from './entities/caso-prueba.entity';
import { Defecto } from '../defectos/entities/defecto.entity';
import { CreateCasoPruebaDto } from './dto/create-caso-prueba.dto';
import { UpdateCasoPruebaDto } from './dto/update-caso-prueba.dto';
import { QueryCasoPruebaDto } from './dto/query-caso-prueba.dto';
import { ImportarCasosPruebaDto } from './dto/importar-casos-prueba.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { userProjectFilter } from '../common/helpers/user-access.helper';
import { Rol } from '../usuarios/entities/usuario.entity';

const CAMPOS_AUDIT = [
  'nombre', 'codigo', 'tipo', 'descripcion', 'resultadoEsperado',
  'prioridad', 'requerimientoRf', 'requerimientoId', 'proyectoId',
];

@Injectable()
export class CasosPruebaService {
  constructor(
    @InjectRepository(CasoPrueba)
    private casosRepo: Repository<CasoPrueba>,
    @InjectRepository(Defecto)
    private defectosRepo: Repository<Defecto>,
    private auditoriaService: AuditoriaService,
  ) {}

  private async validarGestionProyecto(proyectoId: number, usuarioId: number, rol: Rol): Promise<void> {
    if (rol === Rol.ADMIN || rol === Rol.QA_LEAD) return;
    const [acceso] = await this.casosRepo.manager.query(
      `SELECT EXISTS (
         SELECT 1 FROM ciclos_prueba
         WHERE proyecto_id=$1 AND responsable_qa_id=$2
           AND estado::text IN ('Planificado','En ejecución')
       ) AS permitido`,
      [proyectoId, usuarioId],
    );
    if (!acceso?.permitido) {
      throw new ForbiddenException(
        'Solo puedes administrar casos de prueba de un proyecto con un ciclo activo asignado.',
      );
    }
  }

  async findAll(query: QueryCasoPruebaDto, usuarioId?: number, esAdmin = true): Promise<PaginatedResponseDto<any>> {
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
      .orderBy('c.codigo', 'ASC');

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

    if (!esAdmin && usuarioId) {
      qb.andWhere(userProjectFilter('c', 'c.responsableQaId = :uid'), { uid: usuarioId });
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
    return this.casosRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.requerimiento', 'r')
      .leftJoinAndSelect('c.responsableQa', 'rq')
      .where('c.proyectoId = :pid', { pid: proyectoId })
      .orderBy('c.codigo', 'ASC')
      .getMany();
  }

  async nextCodigo(proyectoId: number): Promise<{ codigo: string }> {
    const [{ max_num }] = await this.casosRepo.manager.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_cp FROM 3) AS INTEGER)), 0) AS max_num
       FROM casos_prueba
       WHERE proyecto_id = $1 AND codigo_cp ~ '^CP[0-9]+$'`,
      [proyectoId],
    );
    return { codigo: `CP${String(Number(max_num) + 1).padStart(3, '0')}` };
  }

  async create(dto: CreateCasoPruebaDto, creadoPor: number, usuarioNombre?: string, rol: Rol = Rol.QA_TESTER): Promise<CasoPrueba> {
    await this.validarGestionProyecto(dto.proyectoId, creadoPor, rol);
    let codigo: string;
    if (dto.codigo?.trim()) {
      codigo = dto.codigo.trim();
    } else {
      const [{ max_num }] = await this.casosRepo.manager.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_cp FROM 3) AS INTEGER)), 0) AS max_num
         FROM casos_prueba
         WHERE proyecto_id = $1 AND codigo_cp ~ '^CP[0-9]+$'`,
        [dto.proyectoId],
      );
      codigo = `CP${String(Number(max_num) + 1).padStart(3, '0')}`;
    }

    const caso = this.casosRepo.create({ ...dto, creadoPor, codigo });
    let saved: CasoPrueba;
    try {
      saved = await this.casosRepo.save(caso);
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new BadRequestException(
          `El código "${codigo}" ya está en uso en este proyecto. Intenta de nuevo.`,
        );
      }
      throw e;
    }

    await this.auditoriaService.registrar({
      entidad:       'CasoPrueba',
      entidadId:     saved.id,
      usuarioId:     creadoPor,
      usuarioNombre: usuarioNombre,
      accion:        'Creado',
    });

    return saved;
  }

  async update(
    id: number,
    dto: UpdateCasoPruebaDto,
    usuarioId?: number,
    usuarioNombre?: string,
    rol: Rol = Rol.QA_TESTER,
  ): Promise<CasoPrueba> {
    const caso = await this.casosRepo.findOne({ where: { id } });
    if (!caso) throw new NotFoundException(`Caso de prueba #${id} no encontrado`);
    await this.validarGestionProyecto(dto.proyectoId ?? caso.proyectoId, usuarioId!, rol);

    const anterior: Record<string, any> = {};
    for (const campo of CAMPOS_AUDIT) {
      anterior[campo] = (caso as any)[campo] ?? null;
    }

    Object.assign(caso, dto);
    const saved = await this.casosRepo.save(caso);

    const nuevo: Record<string, any> = {};
    for (const campo of CAMPOS_AUDIT) {
      nuevo[campo] = (saved as any)[campo] ?? null;
    }

    await this.auditoriaService.registrarCambios(
      'CasoPrueba', id, usuarioId, usuarioNombre, anterior, nuevo, CAMPOS_AUDIT,
    );

    return saved;
  }

  async remove(id: number, usuarioId: number, rol: Rol): Promise<void> {
    const caso = await this.casosRepo.findOne({ where: { id } });
    if (!caso) throw new NotFoundException(`Caso de prueba #${id} no encontrado`);
    await this.validarGestionProyecto(caso.proyectoId, usuarioId, rol);

    const totalDefectos = await this.defectosRepo.count({ where: { casoPruebaId: id } });
    if (totalDefectos > 0)
      throw new BadRequestException(
        `No se puede eliminar el caso de prueba porque tiene ${totalDefectos} defecto(s) asociado(s).`,
      );

    await this.casosRepo.remove(caso);
  }

  async removeMany(ids: number[], usuarioId: number, rol: Rol): Promise<{ eliminados: number[]; bloqueados: { id: number; nombre: string; motivo: string }[] }> {
    const eliminados: number[] = [];
    const bloqueados: { id: number; nombre: string; motivo: string }[] = [];

    for (const id of ids) {
      const caso = await this.casosRepo.findOne({ where: { id } });
      if (!caso) { bloqueados.push({ id, nombre: `#${id}`, motivo: 'No encontrado' }); continue; }
      await this.validarGestionProyecto(caso.proyectoId, usuarioId, rol);

      const totalDefectos = await this.defectosRepo.count({ where: { casoPruebaId: id } });
      if (totalDefectos > 0) {
        bloqueados.push({ id, nombre: caso.nombre, motivo: `Tiene ${totalDefectos} defecto(s) asociado(s)` });
        continue;
      }

      await this.casosRepo.remove(caso);
      eliminados.push(id);
    }

    return { eliminados, bloqueados };
  }

  async importar(
    dto: ImportarCasosPruebaDto,
    creadoPor: number,
    usuarioNombre?: string,
    rol: Rol = Rol.QA_TESTER,
  ): Promise<{ importados: number; errores: { fila: number; mensaje: string }[] }> {
    let importados = 0;
    const errores: { fila: number; mensaje: string }[] = [];

    // Build lookup map requerimientoRf → requerimientoId for all projects in the batch
    const rfMap = new Map<string, number>(); // key: "proyectoId:rfCodigo"
    const casosConRf = dto.casos.filter(c => c.requerimientoRf && !c.requerimientoId);
    if (casosConRf.length > 0) {
      const proyIds = [...new Set(casosConRf.map(c => c.proyectoId))];
      const reqs: { id: number; codigo: string; proyecto_id: number }[] =
        await this.casosRepo.manager.query(
          `SELECT id, codigo, proyecto_id FROM requerimientos WHERE proyecto_id = ANY($1::int[])`,
          [proyIds],
        );
      for (const r of reqs) {
        rfMap.set(`${r.proyecto_id}:${r.codigo}`, r.id);
      }
    }

    for (let i = 0; i < dto.casos.length; i++) {
      const caso = { ...dto.casos[i] };

      // Resolve requerimientoId from requerimientoRf if not already provided
      if (caso.requerimientoRf && !caso.requerimientoId) {
        const rid = rfMap.get(`${caso.proyectoId}:${caso.requerimientoRf}`);
        if (rid) {
          caso.requerimientoId = rid;
        } else {
          errores.push({ fila: i + 1, mensaje: `Requerimiento "${caso.requerimientoRf}" no existe en el proyecto` });
          continue;
        }
      }

      try {
        await this.create(caso, creadoPor, usuarioNombre, rol);
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
      requerimientoTitulo: c.requerimiento ? c.requerimiento.titulo                                 : null,
      responsableQaNombre: c.responsableQa ? `${c.responsableQa.nombre} ${c.responsableQa.apellido}`: null,
      creadoPorNombre:     c.creador       ? `${c.creador.nombre} ${c.creador.apellido}`            : null,
      proyecto:      undefined,
      requerimiento: undefined,
      responsableQa: undefined,
      creador:       undefined,
    };
  }
}
