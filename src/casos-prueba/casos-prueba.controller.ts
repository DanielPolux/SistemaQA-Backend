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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CasosPruebaService } from './casos-prueba.service';
import { CreateCasoPruebaDto } from './dto/create-caso-prueba.dto';
import { UpdateCasoPruebaDto } from './dto/update-caso-prueba.dto';
import { QueryCasoPruebaDto } from './dto/query-caso-prueba.dto';
import { ImportarCasosPruebaDto } from './dto/importar-casos-prueba.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { DefectosService } from '../defectos/defectos.service';

@ApiTags('Casos de Prueba')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('casos-prueba')
export class CasosPruebaController {
  constructor(
    private readonly casosPruebaService: CasosPruebaService,
    private readonly defectosService: DefectosService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar casos de prueba con filtros y paginación' })
  findAll(@Query() query: QueryCasoPruebaDto) {
    return this.casosPruebaService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener caso de prueba por ID' })
  findOne(@Param('id') id: string) {
    return this.casosPruebaService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo caso de prueba' })
  create(@Body() dto: CreateCasoPruebaDto, @CurrentUser() user: Usuario) {
    return this.casosPruebaService.create(dto, user.id);
  }

  @Post('importar')
  @ApiOperation({ summary: 'Importar casos de prueba desde Excel (bulk)' })
  importar(@Body() dto: ImportarCasosPruebaDto, @CurrentUser() user: Usuario) {
    return this.casosPruebaService.importar(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar caso de prueba' })
  update(@Param('id') id: string, @Body() dto: UpdateCasoPruebaDto) {
    return this.casosPruebaService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar caso de prueba' })
  remove(@Param('id') id: string) {
    return this.casosPruebaService.remove(+id);
  }

  @Get(':casoPruebaId/defectos')
  @ApiOperation({ summary: 'Listar todos los defectos de un caso de prueba' })
  getDefectos(@Param('casoPruebaId') casoPruebaId: string) {
    return this.defectosService.findByCasoPrueba(+casoPruebaId);
  }
}
