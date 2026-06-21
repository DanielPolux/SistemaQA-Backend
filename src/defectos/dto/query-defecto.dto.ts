import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstadoDefecto,
  PrioridadDefecto,
  SeveridadDefecto,
} from '../entities/defecto.entity';

export class QueryDefectoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  proyectoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  casoPruebaId?: number;

  @ApiPropertyOptional({ enum: EstadoDefecto })
  @IsOptional()
  @IsEnum(EstadoDefecto)
  estado?: EstadoDefecto;

  @ApiPropertyOptional({ enum: SeveridadDefecto })
  @IsOptional()
  @IsEnum(SeveridadDefecto)
  severidad?: SeveridadDefecto;

  @ApiPropertyOptional({ enum: PrioridadDefecto })
  @IsOptional()
  @IsEnum(PrioridadDefecto)
  prioridad?: PrioridadDefecto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  asignadoA?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  reportadoPor?: number;

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
