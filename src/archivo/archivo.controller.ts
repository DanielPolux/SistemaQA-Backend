import { Body, Controller, Param, Post, Get, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';
import { ArchivoService } from './archivo.service';

@ApiTags('Archivo de Proyecto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('proyectos/:id/archivo')
export class ArchivoController {
  constructor(private readonly archivoService: ArchivoService) {}

  @Get('paquete')
  @ApiOperation({ summary: 'Descargar el paquete completo del proyecto (evidencias + reportes Word + manifiesto) como .zip' })
  async descargarPaquete(@Param('id') id: string, @Res() res: Response): Promise<void> {
    await this.archivoService.generarPaquete(+id, res);
  }

  @Post('confirmar')
  @ApiOperation({ summary: 'Confirmar que se descargó el paquete y borrar del servidor los archivos de evidencia del proyecto (irreversible)' })
  confirmar(
    @Param('id') id: string,
    @Body('confirmoDescarga') confirmoDescarga: boolean,
    @CurrentUser() user: Usuario,
  ) {
    if (confirmoDescarga !== true) {
      throw new BadRequestException('Debes confirmar que ya descargaste el paquete completo antes de borrar las evidencias.');
    }
    return this.archivoService.archivarEvidencias(+id, user.id, `${user.nombre} ${user.apellido}`);
  }
}
