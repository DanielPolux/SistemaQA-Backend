import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCatalogoDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60)  grupo: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80)  codigo: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) nombre: string;
  @ApiPropertyOptional() @IsOptional() @IsString()         descripcion?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)   orden?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()        activo?: boolean;
}
