import {
  IsArray, IsDateString, IsNotEmpty, IsNumber,
  IsOptional, IsString, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanPruebaDto {
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

  @IsString()
  @IsNotEmpty()
  objetivo: string;

  @IsOptional()
  @IsString()
  alcance?: string;

  @IsOptional()
  @IsString()
  fueraAlcance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sprint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoPrueba?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ambiente?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  responsableId?: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaObjetivo?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  requerimientoIds?: number[];
}
