import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { RequerimientosModule } from './requerimientos/requerimientos.module';
import { CasosPruebaModule } from './casos-prueba/casos-prueba.module';
import { DefectosModule } from './defectos/defectos.module';
import { EjecucionesModule } from './ejecuciones/ejecuciones.module';
import { MailModule } from './mail/mail.module';
import { Usuario } from './usuarios/entities/usuario.entity';
import { UsuarioRol } from './usuarios/entities/usuario-rol.entity';
import { Proyecto } from './proyectos/entities/proyecto.entity';
import { Requerimiento } from './requerimientos/entities/requerimiento.entity';
import { CasoPrueba } from './casos-prueba/entities/caso-prueba.entity';
import { Defecto } from './defectos/entities/defecto.entity';
import { ComentarioDefecto } from './defectos/entities/comentario-defecto.entity';
import { EjecucionCasoPrueba } from './ejecuciones/entities/ejecucion-caso-prueba.entity';
import { CicloPrueba } from './ciclos-prueba/entities/ciclo-prueba.entity';
import { CiclosPruebaModule } from './ciclos-prueba/ciclos-prueba.module';
import { PlanesPruebaModule } from './planes-prueba/planes-prueba.module';
import { PlanPrueba } from './planes-prueba/entities/plan-prueba.entity';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { Auditoria } from './auditoria/entities/auditoria.entity';
import { CatalogosModule } from './catalogos/catalogos.module';
import { Catalogo } from './catalogos/entities/catalogo.entity';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportesModule } from './reportes/reportes.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'sistema_qa'),
        entities: [
          Usuario,
          UsuarioRol,
          Proyecto,
          Requerimiento,
          CasoPrueba,
          Defecto,
          ComentarioDefecto,
          EjecucionCasoPrueba,
          CicloPrueba,
          PlanPrueba,
          Auditoria,
          Catalogo,
        ],
        synchronize: config.get('NODE_ENV') !== 'production' && config.get('DB_SYNC') !== 'false',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    ReportesModule,
    AuditoriaModule,
    CatalogosModule,
    CiclosPruebaModule,
    PlanesPruebaModule,
    DashboardModule,
    MailModule,
    AuthModule,
    UsuariosModule,
    ProyectosModule,
    RequerimientosModule,
    CasosPruebaModule,
    DefectosModule,
    EjecucionesModule,
  ],
})
export class AppModule {}
