import {
  IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber,
  IsOptional, IsString, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AmbienteEjecucion } from '../../ejecuciones/entities/ejecucion-caso-prueba.entity';

export class CreateCicloPruebaDto {
  @Type(() => Number)
  @IsNumber()
  proyectoId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(AmbienteEjecucion)
  ambiente?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  casosIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  planPruebaId?: number;
}
