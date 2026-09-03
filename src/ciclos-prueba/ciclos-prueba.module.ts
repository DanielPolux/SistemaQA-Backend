import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CicloPrueba } from './entities/ciclo-prueba.entity';
import { CiclosPruebaService } from './ciclos-prueba.service';
import { CiclosPruebaController } from './ciclos-prueba.controller';
import { InformeCierreCiclo } from './entities/informe-cierre-ciclo.entity';
import { MailModule } from '../mail/mail.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [TypeOrmModule.forFeature([CicloPrueba, InformeCierreCiclo]), MailModule, AuditoriaModule],
  controllers: [CiclosPruebaController],
  providers: [CiclosPruebaService],
  exports: [CiclosPruebaService],
})
export class CiclosPruebaModule {}
