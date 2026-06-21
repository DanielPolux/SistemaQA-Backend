import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  entidad: string;

  @Column({ name: 'entidad_id' })
  entidadId: number;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  @Column({ name: 'usuario_nombre', type: 'varchar', length: 200, nullable: true })
  usuarioNombre: string | null;

  @Column({ length: 80 })
  accion: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  campo: string | null;

  @Column({ name: 'valor_anterior', type: 'text', nullable: true })
  valorAnterior: string | null;

  @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
  valorNuevo: string | null;

  @CreateDateColumn({ name: 'fecha', type: 'timestamptz' })
  fecha: Date;
}
