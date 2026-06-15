import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Defecto } from './defecto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('comentarios_defecto')
export class ComentarioDefecto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'defecto_id' })
  defectoId: number;

  @ManyToOne(() => Defecto, (d) => d.comentarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'defecto_id' })
  defecto: Defecto;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'text' })
  comentario: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
