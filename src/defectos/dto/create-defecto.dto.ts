import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AmbienteDefecto,
  EstadoDefecto,
  PrioridadDefecto,
  SeveridadDefecto,
} from '../entities/defecto.entity';

export class CreateDefectoDto {
  @ApiProperty()
  @IsNumber()
  proyectoId: number;

  @ApiProperty()
  @IsNumber()
  casoPruebaId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  requerimientoId?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(30)
  codigo: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  titulo: string;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiProperty()
  @IsString()
  pasosReproduccion: string;

  @ApiProperty()
  @IsString()
  resultadoObtenido: string;

  @ApiProperty()
  @IsString()
  resultadoEsperado: string;

  @ApiProperty({ enum: AmbienteDefecto })
  @IsEnum(AmbienteDefecto)
  ambiente: AmbienteDefecto;

  @ApiProperty()
  @IsString()
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
  @IsNumber()
  asignadoA?: number;
}
