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
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { QueryUsuarioDto } from './dto/query-usuario.dto';
import { Rol } from './entities/usuario.entity';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios con filtros y paginación' })
  findAll(@Query() query: QueryUsuarioDto) {
    return this.usuariosService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(+id, dto);
  }

  @Patch(':id/estado')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado activo/inactivo del usuario' })
  cambiarEstado(@Param('id') id: string, @Body() body: { activo: boolean }) {
    return this.usuariosService.cambiarEstado(+id, body.activo);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(+id);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Obtener roles del usuario' })
  getRoles(@Param('id') id: string) {
    return this.usuariosService.getRoles(+id);
  }

  @Post(':id/roles')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Asignar rol al usuario' })
  asignarRol(
    @Param('id') id: string,
    @Body() body: { rol: Rol; proyectoId?: number },
  ) {
    return this.usuariosService.asignarRol(+id, body);
  }
}
