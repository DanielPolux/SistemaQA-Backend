import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoProyecto } from '../entities/proyecto.entity';

export class CreateProyectoDto {
  @ApiPropertyOptional({ description: 'Categoría o etiqueta del proyecto' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  proyecto?: string;

  @ApiProperty({ description: 'Nombre completo del proyecto' })
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ description: 'Cliente asociado al proyecto' })
  @IsString()
  @MaxLength(200)
  cliente: string;

  @ApiPropertyOptional({ description: 'Código corto único (ej: PWC-2024)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @ApiPropertyOptional({ description: 'ID del responsable de QA' })
  @IsOptional()
  @IsNumber()
  responsableQaId?: number;

  @ApiPropertyOptional({ enum: EstadoProyecto, default: EstadoProyecto.PLANIFICADO })
  @IsOptional()
  @IsEnum(EstadoProyecto)
  estado?: EstadoProyecto;

  @ApiPropertyOptional({ description: 'Número de iteración o sprint' })
  @IsOptional()
  @IsNumber()
  iteracion?: number;

  @ApiPropertyOptional({ description: 'Fecha de inicio planificada (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaInicioPlanificada?: Date;

  @ApiPropertyOptional({ description: 'Fecha de fin planificada (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaFinPlanificada?: Date;

  @ApiPropertyOptional({ description: 'Fecha de inicio real (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaInicioReal?: Date;

  @ApiPropertyOptional({ description: 'Fecha de fin real (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaFinReal?: Date;

  @ApiPropertyOptional({ description: 'Porcentaje de avance (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeAvance?: number;

  @ApiPropertyOptional({ description: 'URL del repositorio de código' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  repositorioUrl?: string;

  @ApiPropertyOptional({ description: 'Notas y observaciones' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Sistema o aplicación bajo prueba' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sistema?: string;

  @ApiProperty({ description: 'ID del jefe de proyecto' })
  @IsNumber()
  jefeProyectoId: number;

  @ApiPropertyOptional({ description: 'Fecha estimada de entrega (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaEstimacion?: Date;

  @ApiPropertyOptional({ description: 'Horas de QA estimadas o consumidas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  horasQa?: number;

  @ApiProperty({ description: 'ID del jefe de QA' })
  @IsNumber()
  jefeQaId: number;
}
