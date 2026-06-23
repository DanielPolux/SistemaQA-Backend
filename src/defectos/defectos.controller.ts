import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { DefectosService } from './defectos.service';
import { CreateDefectoDto } from './dto/create-defecto.dto';
import { UpdateDefectoDto } from './dto/update-defecto.dto';
import { QueryDefectoDto } from './dto/query-defecto.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CambiarEstadoDesarrolloDto } from './dto/cambiar-estado-desarrollo.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

// Solo QA puede reportar (crear) defectos
const ROLES_CREAR      = [Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER];
// QA y PM pueden editar defectos (PM para asignar desarrollador)
const ROLES_EDITAR     = [Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER, Rol.PROJECT_MANAGER];
// Todos pueden cambiar el estado del defecto (cerrar, reabrir, etc.)
const ROLES_ESTADO     = [Rol.ADMIN, Rol.PROJECT_MANAGER, Rol.DEVELOPER, Rol.QA_LEAD, Rol.QA_TESTER];
// Solo el desarrollador (y admin) actualiza el estado de desarrollo (Atendido/No Aplica)
const ROLES_ESTADO_DEV = [Rol.ADMIN, Rol.DEVELOPER];

@ApiTags('Defectos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('defectos')
export class DefectosController {
  constructor(private readonly defectosService: DefectosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar defectos con filtros y paginación' })
  findAll(@Query() query: QueryDefectoDto, @CurrentUser() user: Usuario) {
    return this.defectosService.findAll(query, user.id, user.rol === Rol.ADMIN);
  }

  @Get('siguiente-codigo/:proyectoId')
  @ApiOperation({ summary: 'Obtener el siguiente código de defecto para un proyecto' })
  getSiguienteCodigo(@Param('proyectoId') proyectoId: string) {
    return this.defectosService.getSiguienteCodigoProyecto(+proyectoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener defecto por ID (incluye comentarios)' })
  findOne(@Param('id') id: string) {
    return this.defectosService.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CREAR)
  @ApiOperation({ summary: 'Crear nuevo defecto' })
  create(@Body() dto: CreateDefectoDto, @CurrentUser() user: Usuario) {
    return this.defectosService.create(dto, user.id, `${user.nombre} ${user.apellido}`);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_EDITAR)
  @ApiOperation({ summary: 'Actualizar defecto' })
  update(@Param('id') id: string, @Body() dto: UpdateDefectoDto, @CurrentUser() user: Usuario) {
    return this.defectosService.update(+id, dto, user.id, `${user.nombre} ${user.apellido}`);
  }

  @Patch(':id/estado')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESTADO)
  @ApiOperation({ summary: 'Cambiar estado del defecto' })
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.defectosService.cambiarEstado(+id, dto, user.id, `${user.nombre} ${user.apellido}`);
  }

  @Patch(':id/estado-desarrollo')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESTADO_DEV)
  @ApiOperation({ summary: 'Actualizar estado de desarrollo (solo Desarrollador)' })
  actualizarEstadoDesarrollo(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDesarrolloDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.defectosService.actualizarEstadoDesarrollo(
      +id, dto.estadoDesarrollo, dto.comentariosDesarrollo, user.id, `${user.nombre} ${user.apellido}`,
    );
  }

  @Post(':id/comentarios')
  @ApiOperation({ summary: 'Agregar comentario al defecto' })
  agregarComentario(
    @Param('id') id: string,
    @Body() dto: CreateComentarioDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.defectosService.agregarComentario(+id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_EDITAR)
  @ApiOperation({ summary: 'Eliminar defecto' })
  remove(@Param('id') id: string) {
    return this.defectosService.remove(+id);
  }
}
