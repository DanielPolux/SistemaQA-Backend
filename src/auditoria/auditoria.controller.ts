import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditoriaService } from './auditoria.service';

@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('caso-prueba/:id')
  @ApiOperation({ summary: 'Historial de auditoría de un caso de prueba' })
  getByCasoPrueba(@Param('id') id: string) {
    return this.auditoriaService.getByCasoPrueba(+id);
  }

  @Get('defecto/:id')
  @ApiOperation({ summary: 'Historial de auditoría de un defecto' })
  getByDefecto(@Param('id') id: string) {
    return this.auditoriaService.getByDefecto(+id);
  }
}
