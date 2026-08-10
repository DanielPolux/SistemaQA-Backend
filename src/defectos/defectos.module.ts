import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefectosController } from './defectos.controller';
import { DefectosService } from './defectos.service';
import { DefectoWordService } from './defecto-word.service';
import { Defecto } from './entities/defecto.entity';
import { ComentarioDefecto } from './entities/comentario-defecto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Defecto, ComentarioDefecto, Usuario, Proyecto])],
  controllers: [DefectosController],
  providers: [DefectosService, DefectoWordService],
  exports: [DefectosService, DefectoWordService],
})
export class DefectosModule {}
