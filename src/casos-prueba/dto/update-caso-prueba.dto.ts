import { PartialType } from '@nestjs/swagger';
import { CreateCasoPruebaDto } from './create-caso-prueba.dto';

export class UpdateCasoPruebaDto extends PartialType(CreateCasoPruebaDto) {}
