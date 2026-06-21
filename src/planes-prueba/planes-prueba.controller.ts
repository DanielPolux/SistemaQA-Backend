import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlanesPruebaService } from './planes-prueba.service';
import { CreatePlanPruebaDto } from './dto/create-plan-prueba.dto';
import { Rol } from '../usuarios/entities/usuario.entity';

const ROLES_GESTION = [Rol.ADMIN, Rol.QA_LEAD, Rol.PROJECT_MANAGER];

@ApiTags('Planes de Prueba')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planes-prueba')
export class PlanesPruebaController {
  constructor(private readonly service: PlanesPruebaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar planes de prueba' })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plan por ID con ciclos' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Crear plan de pruebas' })
  create(@Body() dto: CreatePlanPruebaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Actualizar plan de pruebas' })
  update(@Param('id') id: string, @Body() dto: CreatePlanPruebaDto) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/cerrar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Cerrar plan de pruebas' })
  cerrar(@Param('id') id: string) {
    return this.service.cerrar(+id);
  }

  @Patch(':id/reabrir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Reabrir plan de pruebas' })
  reabrir(@Param('id') id: string) {
    return this.service.reabrir(+id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Eliminar plan de pruebas' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
