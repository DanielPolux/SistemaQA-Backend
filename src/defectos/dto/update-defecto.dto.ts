import { PartialType } from '@nestjs/swagger';
import { CreateDefectoDto } from './create-defecto.dto';

export class UpdateDefectoDto extends PartialType(CreateDefectoDto) {}
