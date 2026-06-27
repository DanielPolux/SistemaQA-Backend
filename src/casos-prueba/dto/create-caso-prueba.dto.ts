import {
  IsArray,
  IsDateString,
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
  ResultadoCasoPrueba,
  TipoCasoPrueba,
} from '../entities/caso-prueba.entity';

class PasoDto {
  @ApiProperty()
  @IsNumber()
  orden: number;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiProperty()
  @IsString()
  resultadoEsperado: string;
}

export class CreateCasoPruebaDto {
  @ApiPropertyOptional({ description: 'Código del Caso de Prueba (CP-001). Se auto-genera si se omite.' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo?: string;

  @ApiProperty({ description: 'Nombre del Caso de Prueba' })
  @IsString()
  @MaxLength(300)
  nombre: string;

  @ApiProperty({ description: 'ID del proyecto (Búsqueda)' })
  @Type(() => Number)
  @IsNumber()
  proyectoId: number;

  @ApiPropertyOptional({ description: 'Clave corta del proyecto (ClaveProyecto)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  claveProyecto?: string;

  @ApiProperty({ enum: TipoCasoPrueba, description: 'Tipo de Prueba' })
  @IsEnum(TipoCasoPrueba)
  tipo: TipoCasoPrueba;

  @ApiProperty({ description: 'Descripción del Caso de Prueba' })
  @IsString()
  descripcion: string;

  @ApiProperty({ enum: PrioridadCasoPrueba })
  @IsEnum(PrioridadCasoPrueba)
  prioridad: PrioridadCasoPrueba;

  @ApiPropertyOptional({ enum: EstadoCasoPrueba, description: 'Estado QA' })
  @IsOptional()
  @IsEnum(EstadoCasoPrueba)
  estado?: EstadoCasoPrueba;

  @ApiPropertyOptional({ enum: ResultadoCasoPrueba, description: 'Resultado de la ejecución' })
  @IsOptional()
  @IsEnum(ResultadoCasoPrueba)
  resultado?: ResultadoCasoPrueba;

  @ApiProperty({ description: 'Resultado Esperado' })
  @IsString()
  resultadoEsperado: string;

  @ApiPropertyOptional({ description: 'ID del Responsable QA' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  responsableQaId?: number;

  @ApiPropertyOptional({ description: 'Fecha de Ejecución' })
  @IsOptional()
  @IsDateString()
  fechaEjecucion?: Date;

  @ApiPropertyOptional({ description: 'URL de evidencia de ejecución' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenciaUrl?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Pasos de Prueba (estructurados)', type: [PasoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PasoDto)
  pasos: PasoDto[];

  @ApiPropertyOptional({ description: 'Código texto del Requerimiento RF' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  requerimientoRf?: string;

  @ApiPropertyOptional({ description: 'ID del Requerimiento (RF - Búsqueda)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  requerimientoId?: number;
}
