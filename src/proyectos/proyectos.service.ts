import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EstadoProyecto, Proyecto } from './entities/proyecto.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { QueryProyectoDto } from './dto/query-proyecto.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { SharepointService } from '../sharepoint/sharepoint.service';
import { MailService } from '../mail/mail.service';

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
  private readonly logger = new Logger(ProyectosService.name);

  constructor(
    @InjectRepository(Proyecto)
    private proyectosRepo: Repository<Proyecto>,
    private sharepointService: SharepointService,
    private mailService: MailService,
    private config: ConfigService,
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
    const saved = await this.proyectosRepo.save(proyecto);
    if (dto.responsableQaId) {
      this.enviarCorreoAsignacionQA(saved.id, false).catch(err =>
        this.logger.warn(`enviarCorreoAsignacionQA proyecto#${saved.id}: ${err?.message ?? err}`),
      );
    }
    return saved;
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
    const responsableAnterior = proyecto.responsableQaId;
    Object.assign(proyecto, dto);
    this.validarFechasReales(proyecto.estado, proyecto.fechaInicioReal, proyecto.fechaFinReal);
    const saved = await this.proyectosRepo.save(proyecto);
    if (dto.responsableQaId !== undefined && dto.responsableQaId !== responsableAnterior && dto.responsableQaId) {
      this.enviarCorreoAsignacionQA(saved.id, responsableAnterior != null).catch(err =>
        this.logger.warn(`enviarCorreoAsignacionQA (reasignación) proyecto#${saved.id}: ${err?.message ?? err}`),
      );
    }
    return saved;
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

  private async enviarCorreoAsignacionQA(proyectoId: number, esReasignacion: boolean): Promise<void> {
    const p = await this.proyectosRepo.findOne({
      where: { id: proyectoId },
      relations: ['responsableQa', 'jefeProyecto', 'jefeQa'],
    });
    if (!p?.responsableQa?.email) return;

    const cc: string[] = [];
    const emailQA = p.responsableQa.email;
    if (p.jefeProyecto?.email && p.jefeProyecto.email !== emailQA) cc.push(p.jefeProyecto.email);
    if (p.jefeQa?.email && p.jefeQa.email !== emailQA && p.jefeQa.email !== p.jefeProyecto?.email) {
      cc.push(p.jefeQa.email);
    }

    const subject = esReasignacion
      ? `[Proyecto Reasignado] ${p.codigo ?? p.nombre} — Responsable QA`
      : `[Proyecto Asignado] ${p.codigo ?? p.nombre} — Responsable QA`;

    try {
      await this.mailService.send({
        to: emailQA,
        cc: cc.length ? cc : undefined,
        subject,
        html: this.plantillaAsignacionQA(p, esReasignacion),
      });
    } catch (err) {
      this.logger.warn(`enviarCorreoAsignacionQA send error proyecto#${p.id}: ${(err as Error)?.message ?? err}`);
    }
  }

  private plantillaAsignacionQA(p: Proyecto, esReasignacion: boolean): string {
    const color = '#20c997';
    const icono = esReasignacion ? '🔄' : '✅';
    const titulo = esReasignacion ? 'Reasignado como Responsable QA' : 'Asignado como Responsable QA';
    const mensaje = esReasignacion
      ? `Has sido reasignado/a como <strong>Responsable QA</strong> en el siguiente proyecto.`
      : `Has sido asignado/a como <strong>Responsable QA</strong> en el siguiente proyecto.`;
    const qa = p.responsableQa!;
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const linkProyecto = `${frontendUrl}/proyectos/${p.id}`;

    const filas: [string, string][] = [
      ['Código',          p.codigo                                               ?? '—'],
      ['Proyecto',        p.nombre],
      ['Cliente',         p.cliente],
      ['Estado',          p.estado],
      ['Jefe de Proyecto', p.jefeProyecto ? `${p.jefeProyecto.nombre} ${p.jefeProyecto.apellido}` : '—'],
      ['Jefe QA',         p.jefeQa       ? `${p.jefeQa.nombre} ${p.jefeQa.apellido}`             : '—'],
    ];
    if (p.fechaInicioPlanificada) filas.push(['Inicio Planificado', String(p.fechaInicioPlanificada)]);
    if (p.fechaFinPlanificada)    filas.push(['Fin Planificado',    String(p.fechaFinPlanificada)]);

    const tableRows = filas.map(([label, value], i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
        <td style="padding:8px;border:1px solid #dee2e6;font-weight:bold;width:35%">${label}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${value}</td>
      </tr>`).join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:${color};padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">${icono} ${titulo}</h2>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
          <p>Hola <strong>${qa.nombre} ${qa.apellido}</strong>,</p>
          <p>${mensaje}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">${tableRows}</table>
          <div style="background:#d1f2eb;border-left:4px solid ${color};border-radius:0 6px 6px 0;padding:14px;margin:16px 0">
            <strong>Responsabilidades:</strong> Como Responsable QA tendrás a cargo la gestión de casos de prueba, ejecuciones y defectos del proyecto.
          </div>
          <div style="margin:24px 0;text-align:center">
            <a href="${linkProyecto}" style="background:${color};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver Proyecto en el Sistema</a>
          </div>
          <hr style="margin:16px 0;border:none;border-top:1px solid #dee2e6">
          <p style="color:#6c757d;font-size:12px">Sistema QA — notificación automática</p>
        </div>
      </div>`;
  }
}
