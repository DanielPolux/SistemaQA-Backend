import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Defecto, EstadoDefecto, EstadoDesarrollo } from './entities/defecto.entity';
import { ComentarioDefecto } from './entities/comentario-defecto.entity';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { CreateDefectoDto } from './dto/create-defecto.dto';
import { UpdateDefectoDto } from './dto/update-defecto.dto';
import { QueryDefectoDto } from './dto/query-defecto.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { MailService } from '../mail/mail.service';
import { userProjectFilter } from '../common/helpers/user-access.helper';
import { AuditoriaService } from '../auditoria/auditoria.service';

const CAMPOS_AUDIT_DEFECTO = ['titulo', 'descripcion', 'severidad', 'prioridad', 'asignadoA', 'estado'];

@Injectable()
export class DefectosService {
  private readonly logger = new Logger(DefectosService.name);

  constructor(
    @InjectRepository(Defecto)
    private defectosRepo: Repository<Defecto>,
    @InjectRepository(ComentarioDefecto)
    private comentariosRepo: Repository<ComentarioDefecto>,
    @InjectRepository(Usuario)
    private usuariosRepo: Repository<Usuario>,
    @InjectRepository(Proyecto)
    private proyectosRepo: Repository<Proyecto>,
    private mailService: MailService,
    private auditoriaService: AuditoriaService,
    private config: ConfigService,
  ) {}

  async findAll(query: QueryDefectoDto, usuarioId?: number, esAdmin = true): Promise<PaginatedResponseDto<any>> {
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
    if (query.asignadoA)    qb.andWhere('d.asignadoA   = :aa', { aa: query.asignadoA });
    if (query.reportadoPor) qb.andWhere('d.reportadoPor = :rp', { rp: query.reportadoPor });
    if (query.busqueda) {
      qb.andWhere('(d.titulo ILIKE :b OR d.codigo ILIKE :b OR d.codigoProyecto ILIKE :b)', { b: `%${query.busqueda}%` });
    }

    if (!esAdmin && usuarioId) {
      qb.andWhere(userProjectFilter('d', 'd.asignadoA = :uid OR d.reportadoPor = :uid'), { uid: usuarioId });
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

  async create(dto: CreateDefectoDto, reportadoPor: number, usuarioNombre?: string): Promise<Defecto> {
    const { ...fields } = dto as any;
    delete fields.codigo;

    const saved = await this.defectosRepo.manager.transaction(async (em) => {
      const defecto = em.create(Defecto, { ...fields, reportadoPor });
      const inserted = await em.save(defecto);

      const [{ count }] = await em.query(
        'SELECT COUNT(*)::int AS count FROM defectos WHERE proyecto_id = $1',
        [dto.proyectoId],
      );

      inserted.codigo         = `DEF-${String(inserted.id).padStart(4, '0')}`;
      inserted.codigoProyecto = `INC-${String(count).padStart(3, '0')}`;
      const final = await em.save(inserted);

      // Auto-vincular la ejecución Fallida más reciente del caso que no tenga defecto asignado
      const [ultimaEjec] = await em.query(
        `SELECT id FROM ejecuciones_caso_prueba
         WHERE caso_prueba_id = $1 AND resultado = 'Fallido' AND defecto_id IS NULL
         ORDER BY fecha DESC LIMIT 1`,
        [dto.casoPruebaId],
      );
      if (ultimaEjec) {
        await em.query(
          'UPDATE ejecuciones_caso_prueba SET defecto_id = $1 WHERE id = $2',
          [final.id, ultimaEjec.id],
        );
      }

      return final;
    });

    await this.auditoriaService.registrar({
      entidad:       'Defecto',
      entidadId:     saved.id,
      usuarioId:     reportadoPor,
      usuarioNombre: usuarioNombre,
      accion:        'Creado',
    });

    this.enviarCorreoNuevoDefecto(saved).catch(err =>
      this.logger.warn(`enviarCorreoNuevoDefecto defecto#${saved.id}: ${err?.message ?? err}`),
    );
    return saved;
  }

  async update(
    id: number,
    dto: UpdateDefectoDto,
    usuarioId?: number,
    usuarioNombre?: string,
  ): Promise<Defecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);

    const asignadoAnterior = defecto.asignadoA;

    const anterior: Record<string, any> = {};
    for (const campo of CAMPOS_AUDIT_DEFECTO) {
      anterior[campo] = (defecto as any)[campo] ?? null;
    }

    Object.assign(defecto, dto);

    // Si el developer actualiza estadoDesarrollo, transicionar a En Revisión
    if (dto.estadoDesarrollo) {
      const estadosFinales = [EstadoDefecto.CERRADO, EstadoDefecto.RECHAZADO, EstadoDefecto.REABIERTO];
      if (!estadosFinales.includes(defecto.estado)) {
        defecto.estado = EstadoDefecto.EN_REVISION;
      }
    }

    const saved = await this.defectosRepo.save(defecto);

    const nuevo: Record<string, any> = {};
    for (const campo of CAMPOS_AUDIT_DEFECTO) {
      nuevo[campo] = (saved as any)[campo] ?? null;
    }

    await this.auditoriaService.registrarCambios(
      'Defecto', id, usuarioId, usuarioNombre, anterior, nuevo, CAMPOS_AUDIT_DEFECTO,
    );

    if (dto.asignadoA !== undefined && dto.asignadoA !== asignadoAnterior && dto.asignadoA) {
      this.enviarCorreoNuevoDefecto(saved, true).catch(err =>
        this.logger.warn(`enviarCorreoNuevoDefecto (reasignación) defecto#${saved.id}: ${err?.message ?? err}`),
      );
    }

    return saved;
  }

  async cambiarEstado(
    id: number,
    dto: CambiarEstadoDto,
    usuarioId: number,
    usuarioNombre?: string,
  ): Promise<Defecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);

    const estadoAnterior = defecto.estado;
    defecto.estado = dto.estado;

    if (dto.estado === EstadoDefecto.RESUELTO || dto.estado === EstadoDefecto.CERRADO) {
      defecto.fechaResolucion = new Date();
    }

    // Al reabrir (En Revisión → Asignado), limpiar respuesta del dev para que pueda volver a responder
    if (dto.estado === EstadoDefecto.ASIGNADO && estadoAnterior === EstadoDefecto.EN_REVISION) {
      defecto.estadoDesarrollo    = null;
      defecto.comentariosDesarrollo = null;
    }

    const saved = await this.defectosRepo.save(defecto);

    if (dto.comentario) {
      await this.comentariosRepo.save(
        this.comentariosRepo.create({ defectoId: id, usuarioId, comentario: dto.comentario }),
      );
    }

    const accion = dto.estado === EstadoDefecto.CERRADO ? 'Cerrado' : 'Estado Cambiado';
    await this.auditoriaService.registrar({
      entidad:       'Defecto',
      entidadId:     id,
      usuarioId,
      usuarioNombre: usuarioNombre,
      accion,
      campo:         'estado',
      valorAnterior: estadoAnterior,
      valorNuevo:    dto.estado,
    });

    this.enviarCorreoCambioEstado(saved, dto.estado).catch(err =>
      this.logger.warn(`enviarCorreoCambioEstado defecto#${saved.id}: ${err?.message ?? err}`),
    );

    return saved;
  }

  async agregarComentario(id: number, dto: CreateComentarioDto, usuarioId: number): Promise<ComentarioDefecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);

    const comentario = this.comentariosRepo.create({ defectoId: id, usuarioId, comentario: dto.comentario });
    return this.comentariosRepo.save(comentario);
  }

  async actualizarEstadoDesarrollo(
    id: number,
    estadoDesarrollo: EstadoDesarrollo,
    comentariosDesarrollo?: string,
    usuarioId?: number,
    usuarioNombre?: string,
  ): Promise<Defecto> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);

    const estadoAnterior = defecto.estadoDesarrollo;
    defecto.estadoDesarrollo = estadoDesarrollo;
    if (comentariosDesarrollo !== undefined) {
      defecto.comentariosDesarrollo = comentariosDesarrollo;
    }

    // Cuando el dev responde, poner el defecto en revisión para que el tester verifique
    const estadosFinales = [EstadoDefecto.CERRADO, EstadoDefecto.RECHAZADO, EstadoDefecto.REABIERTO];
    if (!estadosFinales.includes(defecto.estado)) {
      defecto.estado = EstadoDefecto.EN_REVISION;
    }

    const saved = await this.defectosRepo.save(defecto);

    await this.auditoriaService.registrar({
      entidad:       'Defecto',
      entidadId:     id,
      usuarioId,
      usuarioNombre,
      accion:        'Estado Dev Cambiado',
      campo:         'estadoDesarrollo',
      valorAnterior: estadoAnterior,
      valorNuevo:    estadoDesarrollo,
    });

    this.enviarCorreoEstadoDesarrollo(saved, estadoDesarrollo).catch(err =>
      this.logger.warn(`enviarCorreoEstadoDesarrollo defecto#${saved.id}: ${err?.message ?? err}`),
    );
    return saved;
  }

  async remove(id: number): Promise<void> {
    const defecto = await this.defectosRepo.findOne({ where: { id } });
    if (!defecto) throw new NotFoundException(`Defecto #${id} no encontrado`);
    await this.defectosRepo.remove(defecto);
  }

  async getSiguienteCodigoProyecto(proyectoId: number): Promise<{ codigoProyecto: string }> {
    const [{ count }] = await this.defectosRepo.query(
      'SELECT COUNT(*)::int AS count FROM defectos WHERE proyecto_id = $1',
      [proyectoId],
    );
    const siguiente = `INC-${String(count + 1).padStart(3, '0')}`;
    return { codigoProyecto: siguiente };
  }

  // ── Envíos de correo ────────────────────────────────────────────────────────

  async enviarCorreoNuevoDefecto(defecto: Defecto, esAsignacionPM = false): Promise<void> {
    if (!defecto.asignadoA) return;

    const [asignado, reportador, proyecto] = await Promise.all([
      this.usuariosRepo.findOne({ where: { id: defecto.asignadoA } }),
      this.usuariosRepo.findOne({ where: { id: defecto.reportadoPor } }),
      this.proyectosRepo.findOne({ where: { id: defecto.proyectoId }, relations: ['jefeProyecto'] }),
    ]);

    if (!asignado?.email) return;

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const linkDefecto = `${frontendUrl}/defectos/${defecto.id}`;
    const esPM = asignado.rol === Rol.PROJECT_MANAGER || asignado.rol === Rol.ADMIN;

    let subject: string;
    let html: string;
    let cc: string[] | undefined;
    let auditLabel: string;

    if (esPM) {
      subject    = `[Defecto Pendiente de Asignación] ${defecto.codigoProyecto} — ${defecto.titulo}`;
      html       = this.plantillaDefectoParaPM(defecto, asignado, reportador, proyecto, linkDefecto);
      auditLabel = 'PM sin asignar';
    } else if (esAsignacionPM) {
      const ccList: string[] = [];
      if (proyecto?.jefeProyecto?.email && proyecto.jefeProyecto.email !== asignado.email) {
        ccList.push(proyecto.jefeProyecto.email);
      }
      cc         = ccList.length ? ccList : undefined;
      subject    = `[Defecto Asignado] ${defecto.codigoProyecto} — ${defecto.titulo}`;
      html       = this.plantillaDefectoAsignado(defecto, asignado, reportador, proyecto, linkDefecto);
      auditLabel = 'Asignado por PM';
    } else {
      const ccList: string[] = [];
      if (proyecto?.jefeProyecto?.email && proyecto.jefeProyecto.email !== asignado.email) {
        ccList.push(proyecto.jefeProyecto.email);
      }
      cc         = ccList.length ? ccList : undefined;
      subject    = `[Nuevo Defecto] ${defecto.codigoProyecto} — ${defecto.titulo}`;
      html       = this.plantillaDefectoNuevo(defecto, asignado, reportador, proyecto, linkDefecto);
      auditLabel = 'Nuevo defecto';
    }

    try {
      await this.mailService.send({ to: asignado.email, cc, subject, html });
      await this.auditoriaService.registrar({
        entidad:       'Defecto',
        entidadId:     defecto.id,
        usuarioNombre: 'Sistema',
        accion:        'Correo Enviado',
        campo:         'notificacion',
        valorNuevo:    `${auditLabel} → To: ${asignado.email}${cc?.length ? ` | CC: ${cc.join(', ')}` : ''}`,
      });
    } catch (err) {
      await this.auditoriaService.registrar({
        entidad:       'Defecto',
        entidadId:     defecto.id,
        usuarioNombre: 'Sistema',
        accion:        'Error Correo',
        campo:         'notificacion',
        valorNuevo:    err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async enviarCorreoCambioEstado(defecto: Defecto, nuevoEstado: EstadoDefecto): Promise<void> {
    const [reportador, asignado, proyecto] = await Promise.all([
      this.usuariosRepo.findOne({ where: { id: defecto.reportadoPor } }),
      defecto.asignadoA ? this.usuariosRepo.findOne({ where: { id: defecto.asignadoA } }) : null,
      this.proyectosRepo.findOne({ where: { id: defecto.proyectoId }, relations: ['jefeProyecto'] }),
    ]);

    const destinatarios: string[] = [];
    if (reportador?.email) destinatarios.push(reportador.email);

    const cc: string[] = [];
    if (asignado?.email && asignado.email !== reportador?.email) cc.push(asignado.email);
    if (proyecto?.jefeProyecto?.email && !destinatarios.includes(proyecto.jefeProyecto.email) && !cc.includes(proyecto.jefeProyecto.email)) {
      cc.push(proyecto.jefeProyecto.email);
    }

    if (!destinatarios.length) return;

    try {
      await this.mailService.send({
        to: destinatarios,
        cc: cc.length ? cc : undefined,
        subject: `[Defecto ${nuevoEstado}] ${defecto.codigo} — ${defecto.titulo}`,
        html: this.plantillaCambioEstado(defecto, nuevoEstado, reportador, asignado, proyecto),
      });
      await this.auditoriaService.registrar({
        entidad:       'Defecto',
        entidadId:     defecto.id,
        usuarioNombre: 'Sistema',
        accion:        'Correo Enviado',
        campo:         'notificacion',
        valorNuevo:    `Cambio estado → ${nuevoEstado} | To: ${destinatarios.join(', ')}${cc.length ? ` | CC: ${cc.join(', ')}` : ''}`,
      });
    } catch (err) {
      await this.auditoriaService.registrar({
        entidad:       'Defecto',
        entidadId:     defecto.id,
        usuarioNombre: 'Sistema',
        accion:        'Error Correo',
        campo:         'notificacion',
        valorNuevo:    err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async enviarCorreoEstadoDesarrollo(defecto: Defecto, estado: EstadoDesarrollo): Promise<void> {
    const [reportador, developer, proyecto] = await Promise.all([
      this.usuariosRepo.findOne({ where: { id: defecto.reportadoPor } }),
      defecto.asignadoA ? this.usuariosRepo.findOne({ where: { id: defecto.asignadoA } }) : null,
      this.proyectosRepo.findOne({ where: { id: defecto.proyectoId }, relations: ['jefeProyecto'] }),
    ]);

    if (!reportador?.email) return;

    const cc: string[] = [];
    if (developer?.email && developer.email !== reportador.email) cc.push(developer.email);
    if (proyecto?.jefeProyecto?.email
        && proyecto.jefeProyecto.email !== reportador.email
        && proyecto.jefeProyecto.email !== developer?.email) {
      cc.push(proyecto.jefeProyecto.email);
    }

    try {
      await this.mailService.send({
        to: reportador.email,
        cc: cc.length ? cc : undefined,
        subject: `[Acción Requerida] Defecto ${defecto.codigo} marcado como ${estado} — ${defecto.titulo}`,
        html: this.plantillaEstadoDesarrollo(defecto, estado, reportador, developer, proyecto),
      });
      await this.auditoriaService.registrar({
        entidad:       'Defecto',
        entidadId:     defecto.id,
        usuarioNombre: 'Sistema',
        accion:        'Correo Enviado',
        campo:         'notificacion',
        valorNuevo:    `Estado dev → ${estado} | To: ${reportador.email}${cc.length ? ` | CC: ${cc.join(', ')}` : ''}`,
      });
    } catch (err) {
      await this.auditoriaService.registrar({
        entidad:       'Defecto',
        entidadId:     defecto.id,
        usuarioNombre: 'Sistema',
        accion:        'Error Correo',
        campo:         'notificacion',
        valorNuevo:    err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Plantillas HTML ─────────────────────────────────────────────────────────

  private plantillaDefectoNuevo(
    d: Defecto,
    developer: Usuario,
    reportador: Usuario | null,
    proyecto: Proyecto | null,
    linkDefecto: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#dc3545;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">&#x1F41B; Nuevo Defecto Asignado</h2>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
          <p>Hola <strong>${developer.nombre} ${developer.apellido}</strong>,</p>
          <p>Se te ha asignado un nuevo defecto en el proyecto <strong>${proyecto?.nombre ?? '—'}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold;width:35%">Código</td><td style="padding:8px;border:1px solid #dee2e6">${d.codigoProyecto ?? d.codigo}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Título</td><td style="padding:8px;border:1px solid #dee2e6">${d.titulo}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Severidad</td><td style="padding:8px;border:1px solid #dee2e6">${d.severidad}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Prioridad</td><td style="padding:8px;border:1px solid #dee2e6">${d.prioridad}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Ambiente</td><td style="padding:8px;border:1px solid #dee2e6">${d.ambiente}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Versión</td><td style="padding:8px;border:1px solid #dee2e6">${d.version}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Reportado por</td><td style="padding:8px;border:1px solid #dee2e6">${reportador ? `${reportador.nombre} ${reportador.apellido}` : '—'}</td></tr>
          </table>
          <p><strong>Descripción:</strong></p>
          <p style="background:#fff;padding:12px;border-left:4px solid #dc3545;margin:0">${d.descripcion}</p>
          <p style="margin-top:16px"><strong>Pasos para reproducir:</strong></p>
          <pre style="background:#fff;padding:12px;border:1px solid #dee2e6;white-space:pre-wrap">${d.pasosReproduccion}</pre>
          <p><strong>Resultado esperado:</strong></p>
          <p style="background:#fff;padding:12px;border-left:4px solid #28a745;margin:0">${d.resultadoEsperado}</p>
          <div style="margin:24px 0;text-align:center">
            <a href="${linkDefecto}" style="background:#dc3545;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver Defecto en el Sistema</a>
          </div>
          <hr style="margin:16px 0;border:none;border-top:1px solid #dee2e6">
          <p style="color:#6c757d;font-size:12px">Sistema QA — notificación automática</p>
        </div>
      </div>`;
  }

  private plantillaDefectoAsignado(
    d: Defecto,
    developer: Usuario,
    reportador: Usuario | null,
    proyecto: Proyecto | null,
    linkDefecto: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0d6efd;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">&#x1F464; Defecto Asignado a Ti</h2>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
          <p>Hola <strong>${developer.nombre} ${developer.apellido}</strong>,</p>
          <p>El Project Manager te ha asignado el siguiente defecto en el proyecto <strong>${proyecto?.nombre ?? '—'}</strong>. Por favor revísalo y comienza a trabajar en él.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold;width:35%">Código</td><td style="padding:8px;border:1px solid #dee2e6">${d.codigoProyecto ?? d.codigo}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Título</td><td style="padding:8px;border:1px solid #dee2e6">${d.titulo}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Severidad</td><td style="padding:8px;border:1px solid #dee2e6">${d.severidad}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Prioridad</td><td style="padding:8px;border:1px solid #dee2e6">${d.prioridad}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Ambiente</td><td style="padding:8px;border:1px solid #dee2e6">${d.ambiente}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Versión</td><td style="padding:8px;border:1px solid #dee2e6">${d.version}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Reportado por</td><td style="padding:8px;border:1px solid #dee2e6">${reportador ? `${reportador.nombre} ${reportador.apellido}` : '—'}</td></tr>
          </table>
          <p><strong>Descripción:</strong></p>
          <p style="background:#fff;padding:12px;border-left:4px solid #0d6efd;margin:0">${d.descripcion}</p>
          <p style="margin-top:16px"><strong>Pasos para reproducir:</strong></p>
          <pre style="background:#fff;padding:12px;border:1px solid #dee2e6;white-space:pre-wrap">${d.pasosReproduccion}</pre>
          <p><strong>Resultado esperado:</strong></p>
          <p style="background:#fff;padding:12px;border-left:4px solid #28a745;margin:0">${d.resultadoEsperado}</p>
          <div style="margin:24px 0;text-align:center">
            <a href="${linkDefecto}" style="background:#0d6efd;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver Defecto en el Sistema</a>
          </div>
          <hr style="margin:16px 0;border:none;border-top:1px solid #dee2e6">
          <p style="color:#6c757d;font-size:12px">Sistema QA — notificación automática</p>
        </div>
      </div>`;
  }

  private plantillaDefectoParaPM(
    d: Defecto,
    pm: Usuario,
    reportador: Usuario | null,
    proyecto: Proyecto | null,
    linkDefecto: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#fd7e14;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">&#x26A0;&#xFE0F; Defecto pendiente de asignación</h2>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
          <p>Hola <strong>${pm.nombre} ${pm.apellido}</strong>,</p>
          <p>Se ha registrado un nuevo defecto en el proyecto <strong>${proyecto?.nombre ?? '—'}</strong> que requiere tu atención.</p>
          <div style="background:#fff3cd;border-left:4px solid #fd7e14;padding:14px;border-radius:0 6px 6px 0;margin:16px 0">
            <strong>Acción requerida:</strong> Ingresa al sistema y asigna este defecto al desarrollador responsable para que pueda ser atendido.
          </div>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold;width:35%">Código</td><td style="padding:8px;border:1px solid #dee2e6">${d.codigoProyecto ?? d.codigo}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Título</td><td style="padding:8px;border:1px solid #dee2e6">${d.titulo}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Severidad</td><td style="padding:8px;border:1px solid #dee2e6">${d.severidad}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Prioridad</td><td style="padding:8px;border:1px solid #dee2e6">${d.prioridad}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Ambiente</td><td style="padding:8px;border:1px solid #dee2e6">${d.ambiente}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Reportado por</td><td style="padding:8px;border:1px solid #dee2e6">${reportador ? `${reportador.nombre} ${reportador.apellido}` : '—'}</td></tr>
          </table>
          <div style="margin:24px 0;text-align:center">
            <a href="${linkDefecto}" style="background:#fd7e14;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Asignar Defecto en el Sistema</a>
          </div>
          <hr style="margin:16px 0;border:none;border-top:1px solid #dee2e6">
          <p style="color:#6c757d;font-size:12px">Sistema QA — notificación automática</p>
        </div>
      </div>`;
  }

  private plantillaCambioEstado(
    d: Defecto,
    estado: EstadoDefecto,
    reportador: Usuario | null,
    asignado: Usuario | null,
    proyecto: Proyecto | null,
  ): string {
    const colores: Partial<Record<EstadoDefecto, string>> = {
      [EstadoDefecto.ASIGNADO]:    '#fd7e14',
      [EstadoDefecto.EN_PROGRESO]: '#0d6efd',
      [EstadoDefecto.EN_REVISION]: '#6f42c1',
      [EstadoDefecto.RESUELTO]:    '#28a745',
      [EstadoDefecto.CERRADO]:     '#6c757d',
      [EstadoDefecto.REABIERTO]:   '#dc3545',
      [EstadoDefecto.RECHAZADO]:   '#495057',
    };
    const iconos: Partial<Record<EstadoDefecto, string>> = {
      [EstadoDefecto.ASIGNADO]:    '👤',
      [EstadoDefecto.EN_PROGRESO]: '🔧',
      [EstadoDefecto.EN_REVISION]: '🔍',
      [EstadoDefecto.RESUELTO]:    '✅',
      [EstadoDefecto.CERRADO]:     '🔒',
      [EstadoDefecto.REABIERTO]:   '🔄',
      [EstadoDefecto.RECHAZADO]:   '❌',
    };
    const color = colores[estado] ?? '#6c757d';
    const icono = iconos[estado] ?? '📋';

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:${color};padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">${icono} Defecto actualizado: ${estado}</h2>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
          <p>El defecto <strong>${d.codigo}</strong> en el proyecto <strong>${proyecto?.nombre ?? '—'}</strong> ha cambiado su estado a <strong style="color:${color}">${estado}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold;width:35%">Código</td><td style="padding:8px;border:1px solid #dee2e6">${d.codigo}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Título</td><td style="padding:8px;border:1px solid #dee2e6">${d.titulo}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Nuevo Estado</td><td style="padding:8px;border:1px solid #dee2e6"><strong style="color:${color}">${estado}</strong></td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Severidad</td><td style="padding:8px;border:1px solid #dee2e6">${d.severidad}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Reportado por</td><td style="padding:8px;border:1px solid #dee2e6">${reportador ? `${reportador.nombre} ${reportador.apellido}` : '—'}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Asignado a</td><td style="padding:8px;border:1px solid #dee2e6">${asignado ? `${asignado.nombre} ${asignado.apellido}` : '—'}</td></tr>
          </table>
          <hr style="margin:24px 0;border:none;border-top:1px solid #dee2e6">
          <p style="color:#6c757d;font-size:12px">Sistema QA — notificación automática</p>
        </div>
      </div>`;
  }

  private plantillaEstadoDesarrollo(
    d: Defecto,
    estado: EstadoDesarrollo,
    reportador: Usuario,
    developer: Usuario | null,
    proyecto: Proyecto | null,
  ): string {
    const esAtendido = estado === EstadoDesarrollo.ATENDIDO;
    const color  = esAtendido ? '#28a745' : '#fd7e14';
    const icono  = esAtendido ? '✅' : '⚠️';
    const accionColor  = esAtendido ? '#28a745' : '#dc3545';
    const accionIcono  = esAtendido ? '🔒' : '🔄';
    const accionTitulo = esAtendido
      ? 'Acción requerida: Cerrar el defecto'
      : 'Acción requerida: Revisar y reabrir el defecto';
    const accionDetalle = esAtendido
      ? 'El desarrollador indica que el defecto ha sido <strong>atendido</strong>. Por favor verifica la corrección y procede a <strong>cerrar el defecto</strong> en el sistema si confirmas la resolución.'
      : 'El desarrollador indica que este defecto <strong>no aplica</strong> a su responsabilidad. Por favor revisa el caso y, si el problema persiste, <strong>reabre el defecto</strong> con la documentación correspondiente.';

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:${color};padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">${icono} Defecto marcado como ${estado}</h2>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
          <p>Hola <strong>${reportador.nombre} ${reportador.apellido}</strong>,</p>
          <p>El desarrollador <strong>${developer ? `${developer.nombre} ${developer.apellido}` : '—'}</strong> ha marcado el siguiente defecto del proyecto <strong>${proyecto?.nombre ?? '—'}</strong> como <strong style="color:${color}">${estado}</strong>.</p>

          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold;width:35%">Código</td><td style="padding:8px;border:1px solid #dee2e6">${d.codigo}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Título</td><td style="padding:8px;border:1px solid #dee2e6">${d.titulo}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Estado Dev</td><td style="padding:8px;border:1px solid #dee2e6"><strong style="color:${color}">${estado}</strong></td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Severidad</td><td style="padding:8px;border:1px solid #dee2e6">${d.severidad}</td></tr>
            <tr style="background:#fff"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Prioridad</td><td style="padding:8px;border:1px solid #dee2e6">${d.prioridad}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6;font-weight:bold">Desarrollador</td><td style="padding:8px;border:1px solid #dee2e6">${developer ? `${developer.nombre} ${developer.apellido}` : '—'}</td></tr>
          </table>

          <div style="background:#fff;border-left:4px solid ${accionColor};border-radius:0 6px 6px 0;padding:16px;margin:16px 0">
            <p style="margin:0 0 6px;font-weight:bold;color:${accionColor}">${accionIcono} ${accionTitulo}</p>
            <p style="margin:0;font-size:14px">${accionDetalle}</p>
          </div>

          <hr style="margin:24px 0;border:none;border-top:1px solid #dee2e6">
          <p style="color:#6c757d;font-size:12px">Sistema QA — notificación automática</p>
        </div>
      </div>`;
  }
}
