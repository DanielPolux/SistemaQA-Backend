import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AsignarDefectosLoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  defectoIds: number[];

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  desarrolladorId: number;
}
