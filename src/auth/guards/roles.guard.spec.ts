import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Rol } from '../../usuarios/entities/usuario.entity';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

const buildContext = (userRol: string | undefined): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: userRol ? { rol: userRol } : undefined }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite acceso cuando no hay roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(buildContext(Rol.ADMIN))).toBe(true);
  });

  it('permite acceso cuando el rol del usuario coincide', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Rol.ADMIN]);
    expect(guard.canActivate(buildContext(Rol.ADMIN))).toBe(true);
  });

  it('permite acceso con múltiples roles cuando el usuario tiene uno válido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Rol.ADMIN, Rol.QA_LEAD]);
    expect(guard.canActivate(buildContext(Rol.QA_LEAD))).toBe(true);
  });

  it('lanza ForbiddenException cuando el rol no coincide', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Rol.ADMIN]);
    expect(() => guard.canActivate(buildContext(Rol.QA_TESTER))).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException cuando no hay usuario en el request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Rol.ADMIN]);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
