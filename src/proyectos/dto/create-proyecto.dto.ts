import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoProyecto } from '../entities/proyecto.entity';

export class CreateProyectoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty()
  @IsDateString()
  fechaInicio: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaFin?: Date;

  @ApiPropertyOptional({ enum: EstadoProyecto })
  @IsOptional()
  @IsEnum(EstadoProyecto)
  estado?: EstadoProyecto;

  @ApiProperty()
  @IsNumber()
  responsableId: number;
}
