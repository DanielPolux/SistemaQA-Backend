import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CicloPrueba } from './entities/ciclo-prueba.entity';
import { CiclosPruebaService } from './ciclos-prueba.service';
import { CiclosPruebaController } from './ciclos-prueba.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CicloPrueba])],
  controllers: [CiclosPruebaController],
  providers: [CiclosPruebaService],
  exports: [CiclosPruebaService],
})
export class CiclosPruebaModule {}
