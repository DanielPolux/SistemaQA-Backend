import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstadoRequerimiento,
  PrioridadRequerimiento,
  TipoRequerimiento,
} from '../entities/requerimiento.entity';

export class QueryRequerimientoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  proyectoId?: number;

  @ApiPropertyOptional({ enum: TipoRequerimiento })
  @IsOptional()
  @IsEnum(TipoRequerimiento)
  tipo?: TipoRequerimiento;

  @ApiPropertyOptional({ enum: EstadoRequerimiento })
  @IsOptional()
  @IsEnum(EstadoRequerimiento)
  estado?: EstadoRequerimiento;

  @ApiPropertyOptional({ enum: PrioridadRequerimiento })
  @IsOptional()
  @IsEnum(PrioridadRequerimiento)
  prioridad?: PrioridadRequerimiento;

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
