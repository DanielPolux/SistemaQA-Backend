import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportesService } from './reportes.service';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('proyecto/:id')
  @ApiOperation({ summary: 'Reporte completo de un proyecto (estadísticas y datos para gráficas)' })
  getReporteProyecto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: Usuario,
  ) {
    return this.reportesService.getReporteProyecto(id, user.id, user.rol === Rol.ADMIN);
  }
}
