import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CerrarCicloDto {
  @IsString() @IsNotEmpty() conclusionQa: string;
  @IsString() @IsIn(['Liberar', 'Liberar con observaciones', 'No liberar']) recomendacionQa: string;
  @IsOptional() @IsString() justificacionBloqueados?: string;
}
