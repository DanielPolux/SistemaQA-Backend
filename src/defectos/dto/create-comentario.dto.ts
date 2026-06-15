import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComentarioDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  comentario: string;
}
