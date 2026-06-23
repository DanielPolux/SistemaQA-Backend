import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EjecucionesService } from './ejecuciones.service';
import { CreateEjecucionDto } from './dto/create-ejecucion.dto';
import { QueryEjecucionDto } from './dto/query-ejecucion.dto';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Ejecuciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ejecuciones')
export class EjecucionesController {
  constructor(private readonly service: EjecucionesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.QA_TESTER, Rol.QA_LEAD, Rol.ADMIN)
  @ApiOperation({ summary: 'Registrar una ejecución de caso de prueba (con defecto inline si resultado es Fallido)' })
  create(@Body() dto: CreateEjecucionDto, @CurrentUser() user: any) {
    const nombre = user ? `${user.nombre} ${user.apellido}` : undefined;
    return this.service.create(dto, user?.id, nombre);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ejecuciones con filtros y paginación' })
  findAll(@Query() query: QueryEjecucionDto, @CurrentUser() user: Usuario) {
    return this.service.findAll(query, user.id, user.rol === Rol.ADMIN);
  }

  @Get('caso-prueba/:id')
  @ApiOperation({ summary: 'Historial de ejecuciones de un caso de prueba' })
  findByCasoPrueba(@Param('id', ParseIntPipe) id: number) {
    return this.service.findByCasoPrueba(id);
  }
}
