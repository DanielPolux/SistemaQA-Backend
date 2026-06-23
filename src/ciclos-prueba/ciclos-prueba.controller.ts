import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CiclosPruebaService } from './ciclos-prueba.service';
import { CreateCicloPruebaDto } from './dto/create-ciclo-prueba.dto';
import { QueryCicloPruebaDto } from './dto/query-ciclo-prueba.dto';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

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
  cerrar(@Param('id') id: string) {
    return this.service.cerrar(+id);
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
