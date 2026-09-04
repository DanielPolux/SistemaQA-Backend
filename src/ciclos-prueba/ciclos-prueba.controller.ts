import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Put, Query, UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CiclosPruebaService } from './ciclos-prueba.service';
import { CreateCicloPruebaDto } from './dto/create-ciclo-prueba.dto';
import { QueryCicloPruebaDto } from './dto/query-ciclo-prueba.dto';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';
import { CerrarCicloDto } from './dto/cerrar-ciclo.dto';

const ROLES_GESTION = [Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER];

@ApiTags('Ciclos de Prueba')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ciclos-prueba')
export class CiclosPruebaController {
  constructor(private readonly service: CiclosPruebaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ciclos de prueba' })
  findAll(@Query() query: QueryCicloPruebaDto, @CurrentUser() user: Usuario) {
    return this.service.findAll(query, user.id, user.rol === Rol.ADMIN);
  }

  @Get('activo/:proyectoId')
  @ApiOperation({ summary: 'Obtener ciclo activo de un proyecto' })
  findActivo(@Param('proyectoId') proyectoId: string) {
    return this.service.findActivoByProyecto(+proyectoId);
  }

  @Get('casos-previos/:proyectoId')
  @ApiOperation({ summary: 'Casos con último resultado para planificar nuevo ciclo' })
  getCasosPrevios(@Param('proyectoId') proyectoId: string) {
    return this.service.getCasosPrevios(+proyectoId);
  }

  @Get(':id/casos')
  @ApiOperation({ summary: 'Casos de prueba del ciclo con resultado en este ciclo' })
  getCasosDeCiclo(@Param('id') id: string) {
    return this.service.getCasosDeCiclo(+id);
  }

  @Get(':id/informes')
  listarInformes(@Param('id') id: string) {
    return this.service.listarInformes(+id);
  }

  @Get(':id/informes/:informeId/word')
  async descargarInforme(@Param('id') id: string, @Param('informeId') informeId: string, @Res() res: Response) {
    const archivo = await this.service.generarInformeWord(+id, +informeId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre}"`);
    res.send(archivo.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ciclo por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Crear ciclo de prueba' })
  create(@Body() dto: CreateCicloPruebaDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Actualizar ciclo de prueba' })
  update(@Param('id') id: string, @Body() dto: CreateCicloPruebaDto) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/cerrar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Cerrar ciclo de prueba' })
  cerrar(@Param('id') id: string, @Body() dto: CerrarCicloDto, @CurrentUser() user: Usuario) {
    return this.service.cerrar(+id, dto, user.id, `${user.nombre} ${user.apellido}`);
  }

  @Patch(':id/iniciar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Registrar el inicio real del ciclo de prueba' })
  iniciar(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.iniciar(+id, user.id, `${user.nombre} ${user.apellido}`);
  }

  @Patch(':id/reabrir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Reabrir ciclo de prueba' })
  reabrir(@Param('id') id: string) {
    return this.service.reabrir(+id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Eliminar ciclo de prueba' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
