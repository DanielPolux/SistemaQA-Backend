import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioRol } from './usuario-rol.entity';

export enum Rol {
  ADMIN = 'Administrador',
  QA_LEAD = 'QA Lead',
  QA_TESTER = 'QA Tester',
  DEVELOPER = 'Desarrollador',
  PROJECT_MANAGER = 'Project Manager',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: Rol, default: Rol.QA_TESTER })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => UsuarioRol, (ur) => ur.usuario)
  roles: UsuarioRol[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
