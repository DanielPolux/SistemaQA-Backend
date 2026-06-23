import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EjecucionesController } from './ejecuciones.controller';
import { EjecucionesService } from './ejecuciones.service';
import { EjecucionCasoPrueba } from './entities/ejecucion-caso-prueba.entity';
import { CicloPrueba } from '../ciclos-prueba/entities/ciclo-prueba.entity';
import { Defecto } from '../defectos/entities/defecto.entity';
import { DefectosModule } from '../defectos/defectos.module';

@Module({
  imports: [TypeOrmModule.forFeature([EjecucionCasoPrueba, CicloPrueba, Defecto]), DefectosModule],
  controllers: [EjecucionesController],
  providers: [EjecucionesService],
  exports: [EjecucionesService],
})
export class EjecucionesModule {}
