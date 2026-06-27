import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AmbienteDefecto,
  EstadoDefecto,
  EstadoDesarrollo,
  PrioridadDefecto,
  SeveridadDefecto,
} from '../entities/defecto.entity';

export class CreateDefectoDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  proyectoId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  casoPruebaId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  requerimientoId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  titulo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pasosReproduccion: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resultadoObtenido: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resultadoEsperado: string;

  @ApiProperty({ enum: AmbienteDefecto })
  @IsEnum(AmbienteDefecto)
  ambiente: AmbienteDefecto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @ApiProperty({ enum: SeveridadDefecto })
  @IsEnum(SeveridadDefecto)
  severidad: SeveridadDefecto;

  @ApiProperty({ enum: PrioridadDefecto })
  @IsEnum(PrioridadDefecto)
  prioridad: PrioridadDefecto;

  @ApiPropertyOptional({ enum: EstadoDefecto })
  @IsOptional()
  @IsEnum(EstadoDefecto)
  estado?: EstadoDefecto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  asignadoA?: number;

  @ApiPropertyOptional({ enum: EstadoDesarrollo })
  @IsOptional()
  @IsEnum(EstadoDesarrollo)
  estadoDesarrollo?: EstadoDesarrollo | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentariosDesarrollo?: string | null;
}
