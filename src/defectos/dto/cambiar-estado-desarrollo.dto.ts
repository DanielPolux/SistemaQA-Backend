import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoDesarrollo } from '../entities/defecto.entity';

export class CambiarEstadoDesarrolloDto {
  @ApiProperty({ enum: EstadoDesarrollo })
  @IsEnum(EstadoDesarrollo)
  estadoDesarrollo: EstadoDesarrollo;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comentariosDesarrollo?: string;
}
