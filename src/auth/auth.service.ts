import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.usuariosRepository
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: loginDto.email })
      .andWhere('u.activo = :activo', { activo: true })
      .getOne();

    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const passwordValido = await bcrypt.compare(loginDto.password, usuario.password);
    if (!passwordValido) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: usuario.id, email: usuario.email };
    const token = this.jwtService.sign(payload);

    const { password, ...usuarioSinPassword } = usuario;

    return { token, usuario: usuarioSinPassword };
  }
}
