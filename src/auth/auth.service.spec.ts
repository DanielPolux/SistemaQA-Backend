import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Usuario } from '../usuarios/entities/usuario.entity';

const mockUsuario = {
  id: 1,
  nombre: 'Admin',
  apellido: 'QA',
  email: 'admin@qa.com',
  password: 'hashed_password',
  rol: 'Administrador',
  activo: true,
};

const mockRepo = {
  createQueryBuilder: jest.fn().mockReturnValue({
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  }),
};

const mockJwt = { sign: jest.fn().mockReturnValue('mock_token') };

describe('AuthService', () => {
  let service: AuthService;
  let qb: ReturnType<typeof mockRepo.createQueryBuilder>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    qb = mockRepo.createQueryBuilder();
  });

  afterEach(() => jest.clearAllMocks());

  it('retorna token y usuario sin password en login exitoso', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    qb.getOne.mockResolvedValue(mockUsuario);

    const result = await service.login({ email: 'admin@qa.com', password: '123456' });

    expect(result.token).toBe('mock_token');
    expect(result.usuario).not.toHaveProperty('password');
    expect(result.usuario.email).toBe('admin@qa.com');
  });

  it('lanza UnauthorizedException si el usuario no existe', async () => {
    qb.getOne.mockResolvedValue(null);

    await expect(
      service.login({ email: 'noexiste@qa.com', password: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
    qb.getOne.mockResolvedValue(mockUsuario);

    await expect(
      service.login({ email: 'admin@qa.com', password: 'wrongpass' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
