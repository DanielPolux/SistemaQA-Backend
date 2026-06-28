import { IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEjecucionDto {
  @IsOptional()
  @Type(() => Number)
  casoPruebaId?: number;

  @IsOptional()
  @Type(() => Number)
  proyectoId?: number;

  @IsOptional()
  @IsString()
  resultado?: string;

  @IsOptional()
  @IsString()
  ambiente?: string;

  @IsOptional()
  @Type(() => Number)
  testerId?: number;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  porPagina?: number;
}
