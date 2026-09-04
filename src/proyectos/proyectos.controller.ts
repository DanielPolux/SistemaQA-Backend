import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { QueryProyectoDto } from './dto/query-proyecto.dto';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';
import { RequerimientosService } from '../requerimientos/requerimientos.service';

const ROLES_GESTION = [Rol.ADMIN, Rol.QA_LEAD];
import { CasosPruebaService } from '../casos-prueba/casos-prueba.service';

@ApiTags('Proyectos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proyectos')
export class ProyectosController {
  constructor(
    private readonly proyectosService: ProyectosService,
    private readonly requerimientosService: RequerimientosService,
    private readonly casosPruebaService: CasosPruebaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar proyectos con filtros y paginación' })
  findAll(@Query() query: QueryProyectoDto, @CurrentUser() user: Usuario) {
    const esAdmin = user.rol === Rol.ADMIN;
    return this.proyectosService.findAll(query, user.id, esAdmin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proyecto por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.proyectosService.findOne(+id, user.id, user.rol === Rol.ADMIN);
  }

  @Get(':id/resumen')
  @ApiOperation({ summary: 'Obtener resumen/estadísticas del proyecto' })
  getResumen(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.proyectosService.getResumen(+id, user.id, user.rol === Rol.ADMIN);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Crear nuevo proyecto' })
  create(@Body() dto: CreateProyectoDto, @CurrentUser() user: Usuario) {
    return this.proyectosService.create(dto, user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION)
  @ApiOperation({ summary: 'Actualizar proyecto' })
  update(@Param('id') id: string, @Body() dto: UpdateProyectoDto) {
    return this.proyectosService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar proyecto' })
  remove(@Param('id') id: string) {
    return this.proyectosService.remove(+id);
  }

  @Get(':proyectoId/requerimientos')
  @ApiOperation({ summary: 'Listar todos los requerimientos de un proyecto' })
  getRequerimientos(@Param('proyectoId') proyectoId: string) {
    return this.requerimientosService.findByProyecto(+proyectoId);
  }

  @Get(':proyectoId/casos-prueba')
  @ApiOperation({ summary: 'Listar todos los casos de prueba de un proyecto' })
  getCasosPrueba(@Param('proyectoId') proyectoId: string) {
    return this.casosPruebaService.findByProyecto(+proyectoId);
  }
}
