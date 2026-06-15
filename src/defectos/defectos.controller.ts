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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DefectosService } from './defectos.service';
import { CreateDefectoDto } from './dto/create-defecto.dto';
import { UpdateDefectoDto } from './dto/update-defecto.dto';
import { QueryDefectoDto } from './dto/query-defecto.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Defectos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('defectos')
export class DefectosController {
  constructor(private readonly defectosService: DefectosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar defectos con filtros y paginación' })
  findAll(@Query() query: QueryDefectoDto) {
    return this.defectosService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener defecto por ID (incluye comentarios)' })
  findOne(@Param('id') id: string) {
    return this.defectosService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo defecto' })
  create(@Body() dto: CreateDefectoDto, @CurrentUser() user: Usuario) {
    return this.defectosService.create(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar defecto' })
  update(@Param('id') id: string, @Body() dto: UpdateDefectoDto) {
    return this.defectosService.update(+id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado del defecto' })
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.defectosService.cambiarEstado(+id, dto, user.id);
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
  @ApiOperation({ summary: 'Eliminar defecto' })
  remove(@Param('id') id: string) {
    return this.defectosService.remove(+id);
  }
}
