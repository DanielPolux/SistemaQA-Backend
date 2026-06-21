import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import { CatalogosService } from './catalogos.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

@ApiTags('Catálogos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('grupos')
  @ApiOperation({ summary: 'Listar todos los grupos con totales' })
  findGrupos() {
    return this.catalogosService.findGrupos();
  }

  @Get()
  @ApiOperation({ summary: 'Listar ítems. Filtrar por ?grupo=NOMBRE' })
  findAll(@Query('grupo') grupo?: string) {
    if (grupo) return this.catalogosService.findByGrupo(grupo);
    return this.catalogosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ítem por ID' })
  findOne(@Param('id') id: string) {
    return this.catalogosService.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear ítem de catálogo (solo Admin)' })
  create(@Body() dto: CreateCatalogoDto) {
    return this.catalogosService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar ítem de catálogo (solo Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCatalogoDto) {
    return this.catalogosService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar ítem (no aplica a ítems del sistema)' })
  remove(@Param('id') id: string) {
    return this.catalogosService.remove(+id);
  }
}
