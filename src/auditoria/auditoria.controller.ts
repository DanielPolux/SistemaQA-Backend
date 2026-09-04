import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditoriaService } from './auditoria.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('caso-prueba/:id')
  @ApiOperation({ summary: 'Historial de auditoría de un caso de prueba' })
  getByCasoPrueba(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.auditoriaService.getByCasoPrueba(+id, user.id, user.rol === Rol.ADMIN);
  }

  @Get('defecto/:id')
  @ApiOperation({ summary: 'Historial de auditoría de un defecto' })
  getByDefecto(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.auditoriaService.getByDefecto(+id, user.id, user.rol === Rol.ADMIN);
  }
}
