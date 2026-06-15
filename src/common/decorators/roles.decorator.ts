import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../usuarios/entities/usuario.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
