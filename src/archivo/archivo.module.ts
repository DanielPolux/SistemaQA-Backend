import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivoController } from './archivo.controller';
import { ArchivoService } from './archivo.service';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { Defecto } from '../defectos/entities/defecto.entity';
import { DefectosModule } from '../defectos/defectos.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyecto, Defecto]),
    DefectosModule,
    AuditoriaModule,
  ],
  controllers: [ArchivoController],
  providers: [ArchivoService],
})
export class ArchivoModule {}
