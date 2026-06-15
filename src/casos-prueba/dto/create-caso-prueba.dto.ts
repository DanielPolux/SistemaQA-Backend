import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstadoCasoPrueba,
  PrioridadCasoPrueba,
  TipoCasoPrueba,
} from '../entities/caso-prueba.entity';

class PasoDto {
  @IsNumber()
  orden: number;

  @IsString()
  descripcion: string;

  @IsString()
  resultadoEsperado: string;
}

export class CreateCasoPruebaDto {
  @ApiProperty()
  @IsNumber()
  proyectoId: number;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  precondiciones?: string;

  @ApiProperty({ type: [PasoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PasoDto)
  pasos: PasoDto[];

  @ApiProperty()
  @IsString()
  resultadoEsperado: string;

  @ApiProperty({ enum: TipoCasoPrueba })
  @IsEnum(TipoCasoPrueba)
  tipo: TipoCasoPrueba;

  @ApiProperty({ enum: PrioridadCasoPrueba })
  @IsEnum(PrioridadCasoPrueba)
  prioridad: PrioridadCasoPrueba;

  @ApiPropertyOptional({ enum: EstadoCasoPrueba })
  @IsOptional()
  @IsEnum(EstadoCasoPrueba)
  estado?: EstadoCasoPrueba;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  asignadoA?: number;
}
