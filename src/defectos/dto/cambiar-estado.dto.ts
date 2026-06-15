import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoDefecto } from '../entities/defecto.entity';

export class CambiarEstadoDto {
  @ApiProperty({ enum: EstadoDefecto })
  @IsEnum(EstadoDefecto)
  estado: EstadoDefecto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentario?: string;
}
