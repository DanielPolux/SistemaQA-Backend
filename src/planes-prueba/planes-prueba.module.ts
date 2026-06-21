import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanPrueba } from './entities/plan-prueba.entity';
import { PlanesPruebaService } from './planes-prueba.service';
import { PlanesPruebaController } from './planes-prueba.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlanPrueba])],
  controllers: [PlanesPruebaController],
  providers: [PlanesPruebaService],
  exports: [PlanesPruebaService],
})
export class PlanesPruebaModule {}
