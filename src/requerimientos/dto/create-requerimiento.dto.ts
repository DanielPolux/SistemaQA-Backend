import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstadoRequerimiento,
  PrioridadRequerimiento,
  TipoRequerimiento,
} from '../entities/requerimiento.entity';

export class CreateRequerimientoDto {
  @ApiProperty()
  @IsNumber()
  proyectoId: number;

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
  criteriosAceptacion: string;

  @ApiProperty({ enum: TipoRequerimiento })
  @IsEnum(TipoRequerimiento)
  tipo: TipoRequerimiento;

  @ApiProperty({ enum: PrioridadRequerimiento })
  @IsEnum(PrioridadRequerimiento)
  prioridad: PrioridadRequerimiento;

  @ApiPropertyOptional({ enum: EstadoRequerimiento })
  @IsOptional()
  @IsEnum(EstadoRequerimiento)
  estado?: EstadoRequerimiento;
}
