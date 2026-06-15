import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';
import { UsuarioRol, } from './entities/usuario-rol.entity';
import { Rol } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { QueryUsuarioDto } from './dto/query-usuario.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepo: Repository<Usuario>,
    @InjectRepository(UsuarioRol)
    private rolesRepo: Repository<UsuarioRol>,
  ) {}

  async findAll(query: QueryUsuarioDto): Promise<PaginatedResponseDto<Usuario>> {
    const pagina = Number(query.pagina) || 1;
    const porPagina = Number(query.porPagina) || 10;
    const skip = (pagina - 1) * porPagina;

    const where: any = {};
    if (query.rol !== undefined) where.rol = query.rol;
    if (query.activo !== undefined) where.activo = query.activo;
    if (query.busqueda) {
      where.nombre = Like(`%${query.busqueda}%`);
    }

    const [datos, total] = await this.usuariosRepo.findAndCount({
      where,
      skip,
      take: porPagina,
      order: { creadoEn: 'DESC' },
    });

    return new PaginatedResponseDto(datos, total, pagina, porPagina);
  }

  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException(`Usuario #${id} no encontrado`);
    return usuario;
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existe = await this.usuariosRepo.findOne({ where: { email: dto.email } });
    if (existe) throw new BadRequestException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 10);
    const usuario = this.usuariosRepo.create({ ...dto, password: hash });
    return this.usuariosRepo.save(usuario);
  }

  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    Object.assign(usuario, dto);
    return this.usuariosRepo.save(usuario);
  }

  async cambiarEstado(id: number, activo: boolean): Promise<Usuario> {
    const usuario = await this.findOne(id);
    usuario.activo = activo;
    return this.usuariosRepo.save(usuario);
  }

  async remove(id: number): Promise<void> {
    const usuario = await this.findOne(id);
    await this.usuariosRepo.remove(usuario);
  }

  async getRoles(id: number): Promise<UsuarioRol[]> {
    await this.findOne(id);
    return this.rolesRepo.find({ where: { usuarioId: id } });
  }

  async asignarRol(id: number, dto: { rol: Rol; proyectoId?: number }): Promise<UsuarioRol> {
    await this.findOne(id);
    const rol = this.rolesRepo.create({ usuarioId: id, ...dto });
    return this.rolesRepo.save(rol);
  }
}
