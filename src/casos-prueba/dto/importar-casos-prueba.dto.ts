import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateCasoPruebaDto } from './create-caso-prueba.dto';

export class ImportarCasosPruebaDto {
  @ApiProperty({ type: [CreateCasoPruebaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCasoPruebaDto)
  casos: CreateCasoPruebaDto[];
}
