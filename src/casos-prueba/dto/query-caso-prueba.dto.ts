import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstadoCasoPrueba,
  PrioridadCasoPrueba,
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

  @ApiPropertyOptional({ enum: EstadoCasoPrueba })
  @IsOptional()
  @IsEnum(EstadoCasoPrueba)
  estado?: EstadoCasoPrueba;

  @ApiPropertyOptional({ enum: TipoCasoPrueba })
  @IsOptional()
  @IsEnum(TipoCasoPrueba)
  tipo?: TipoCasoPrueba;

  @ApiPropertyOptional({ enum: PrioridadCasoPrueba })
  @IsOptional()
  @IsEnum(PrioridadCasoPrueba)
  prioridad?: PrioridadCasoPrueba;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  asignadoA?: number;

  @ApiPropertyOptional()
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
