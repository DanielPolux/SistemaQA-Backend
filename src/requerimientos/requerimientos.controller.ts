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
import { RequerimientosService } from './requerimientos.service';
import { CreateRequerimientoDto } from './dto/create-requerimiento.dto';
import { UpdateRequerimientoDto } from './dto/update-requerimiento.dto';
import { QueryRequerimientoDto } from './dto/query-requerimiento.dto';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

const ROLES_ESCRITURA = [Rol.ADMIN, Rol.QA_LEAD, Rol.QA_TESTER];

@ApiTags('Requerimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requerimientos')
export class RequerimientosController {
  constructor(private readonly requerimientosService: RequerimientosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar requerimientos con filtros y paginación' })
  findAll(@Query() query: QueryRequerimientoDto, @CurrentUser() user: Usuario) {
    return this.requerimientosService.findAll(query, user.id, user.rol === Rol.ADMIN);
  }

  @Get('next-codigo')
  @ApiOperation({ summary: 'Previsualizar el próximo código RF para un proyecto' })
  nextCodigo(@Query('proyectoId') proyectoId: string) {
    return this.requerimientosService.nextCodigo(+proyectoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener requerimiento por ID' })
  findOne(@Param('id') id: string) {
    return this.requerimientosService.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Crear nuevo requerimiento' })
  create(@Body() dto: CreateRequerimientoDto, @CurrentUser() user: Usuario) {
    return this.requerimientosService.create(dto, user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Actualizar requerimiento' })
  update(@Param('id') id: string, @Body() dto: UpdateRequerimientoDto) {
    return this.requerimientosService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Eliminar requerimiento' })
  remove(@Param('id') id: string) {
    return this.requerimientosService.remove(+id);
  }
}
