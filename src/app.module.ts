import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { RequerimientosModule } from './requerimientos/requerimientos.module';
import { CasosPruebaModule } from './casos-prueba/casos-prueba.module';
import { DefectosModule } from './defectos/defectos.module';
import { Usuario } from './usuarios/entities/usuario.entity';
import { UsuarioRol } from './usuarios/entities/usuario-rol.entity';
import { Proyecto } from './proyectos/entities/proyecto.entity';
import { Requerimiento } from './requerimientos/entities/requerimiento.entity';
import { CasoPrueba } from './casos-prueba/entities/caso-prueba.entity';
import { Defecto } from './defectos/entities/defecto.entity';
import { ComentarioDefecto } from './defectos/entities/comentario-defecto.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
        ],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    UsuariosModule,
    ProyectosModule,
    RequerimientosModule,
    CasosPruebaModule,
    DefectosModule,
  ],
})
export class AppModule {}
