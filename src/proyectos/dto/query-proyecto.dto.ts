import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoProyecto } from '../entities/proyecto.entity';

export class QueryProyectoDto {
  @ApiPropertyOptional({ enum: EstadoProyecto })
  @IsOptional()
  @IsEnum(EstadoProyecto)
  estado?: EstadoProyecto;

  @ApiPropertyOptional({ description: 'Filtrar por ID de jefe de proyecto' })
  @IsOptional()
  @IsNumberString()
  jefeProyectoId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID de jefe de QA' })
  @IsOptional()
  @IsNumberString()
  jefeQaId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID de responsable de QA' })
  @IsOptional()
  @IsNumberString()
  responsableQaId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por cliente' })
  @IsOptional()
  @IsString()
  cliente?: string;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre, código o sistema' })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumberString()
  pagina?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumberString()
  porPagina?: number;
}
