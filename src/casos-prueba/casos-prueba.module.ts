import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasosPruebaController } from './casos-prueba.controller';
import { CasosPruebaService } from './casos-prueba.service';
import { CasoPrueba } from './entities/caso-prueba.entity';
import { Defecto } from '../defectos/entities/defecto.entity';
import { ComentarioDefecto } from '../defectos/entities/comentario-defecto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { DefectosService } from '../defectos/defectos.service';
import { DefectoWordService } from '../defectos/defecto-word.service';

@Module({
  imports: [TypeOrmModule.forFeature([CasoPrueba, Defecto, ComentarioDefecto, Usuario, Proyecto])],
  controllers: [CasosPruebaController],
  // NOTA: DefectosService está duplicado aquí en vez de importar DefectosModule
  // (deuda técnica preexistente) -- por eso necesita también sus propias
  // dependencias (DefectoWordService) registradas como provider local.
  providers: [CasosPruebaService, DefectosService, DefectoWordService],
  exports: [CasosPruebaService],
})
export class CasosPruebaModule {}
