import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Rol } from './roles.enum';

@Entity('usuario_roles')
export class UsuarioRol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, (u) => u.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'enum', enum: Rol })
  rol: Rol;

  @Column({ name: 'proyecto_id', nullable: true })
  proyectoId: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
