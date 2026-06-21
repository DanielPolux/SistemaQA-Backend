import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { AmbienteEjecucion, ResultadoEjecucion } from '../entities/ejecucion-caso-prueba.entity';
import { Type } from 'class-transformer';
import { AmbienteDefecto, PrioridadDefecto, SeveridadDefecto } from '../../defectos/entities/defecto.entity';

export class DefectoInlineDto {
  @IsString() @MaxLength(300) titulo: string;
  @IsString() descripcion: string;
  @IsString() pasosReproduccion: string;
  @IsString() resultadoObtenido: string;
  @IsString() resultadoEsperado: string;
  @IsEnum(AmbienteDefecto) ambiente: AmbienteDefecto;
  @IsString() @MaxLength(50) version: string;
  @IsEnum(SeveridadDefecto) severidad: SeveridadDefecto;
  @IsEnum(PrioridadDefecto) prioridad: PrioridadDefecto;
  @IsOptional() @Type(() => Number) @IsNumber() asignadoA?: number;
  @IsOptional() @Type(() => Number) @IsNumber() requerimientoId?: number;
}

export class CreateEjecucionDto {
  @Type(() => Number)
  @IsNumber()
  casoPruebaId: number;

  @Type(() => Number)
  @IsNumber()
  proyectoId: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cicloPrueba?: string;

  @Type(() => Number)
  @IsNumber()
  testerId: number;

  @IsEnum(AmbienteEjecucion)
  ambiente: AmbienteEjecucion;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @IsEnum(ResultadoEjecucion)
  resultado: ResultadoEjecucion;

  @IsString()
  @IsNotEmpty()
  resultadoObtenido: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenciaUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defectoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  desarrolladorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cicloId?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DefectoInlineDto)
  defectoData?: DefectoInlineDto;
}
