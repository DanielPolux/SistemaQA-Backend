import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstadoCasoPrueba,
  PrioridadCasoPrueba,
  ResultadoCasoPrueba,
  TipoCasoPrueba,
} from '../entities/caso-prueba.entity';

export class QueryCasoPruebaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  proyectoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  requerimientoId?: number;

  @ApiPropertyOptional({ enum: EstadoCasoPrueba, description: 'Estado QA' })
  @IsOptional()
  @IsEnum(EstadoCasoPrueba)
  estado?: EstadoCasoPrueba;

  @ApiPropertyOptional({ enum: ResultadoCasoPrueba, description: 'Resultado de ejecución' })
  @IsOptional()
  @IsEnum(ResultadoCasoPrueba)
  resultado?: ResultadoCasoPrueba;

  @ApiPropertyOptional({ enum: TipoCasoPrueba, description: 'Tipo de Prueba' })
  @IsOptional()
  @IsEnum(TipoCasoPrueba)
  tipo?: TipoCasoPrueba;

  @ApiPropertyOptional({ enum: PrioridadCasoPrueba })
  @IsOptional()
  @IsEnum(PrioridadCasoPrueba)
  prioridad?: PrioridadCasoPrueba;

  @ApiPropertyOptional({ description: 'Filtrar por ID del Responsable QA' })
  @IsOptional()
  @IsNumberString()
  responsableQaId?: number;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre o código CP' })
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
