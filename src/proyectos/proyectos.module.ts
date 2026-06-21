import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './entities/proyecto.entity';
import { Requerimiento } from '../requerimientos/entities/requerimiento.entity';
import { CasoPrueba } from '../casos-prueba/entities/caso-prueba.entity';
import { Defecto } from '../defectos/entities/defecto.entity';
import { RequerimientosService } from '../requerimientos/requerimientos.service';
import { CasosPruebaService } from '../casos-prueba/casos-prueba.service';
import { SharepointModule } from '../sharepoint/sharepoint.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyecto, Requerimiento, CasoPrueba, Defecto]),
    SharepointModule,
  ],
  controllers: [ProyectosController],
  providers: [ProyectosService, RequerimientosService, CasosPruebaService],
  exports: [ProyectosService],
})
export class ProyectosModule {}
