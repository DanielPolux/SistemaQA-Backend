import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { EstadoCiclo } from '../entities/ciclo-prueba.entity';

export class QueryCicloPruebaDto {
  @IsOptional()
  @IsNumberString()
  proyectoId?: number;

  @IsOptional()
  @IsEnum(EstadoCiclo)
  estado?: EstadoCiclo;

  @IsOptional()
  @IsNumberString()
  pagina?: number;

  @IsOptional()
  @IsNumberString()
  porPagina?: number;
}
