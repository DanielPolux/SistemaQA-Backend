import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum EstadoCiclo {
  ACTIVO  = 'Activo',
  CERRADO = 'Cerrado',
}

@Entity('ciclos_prueba')
export class CicloPrueba {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'proyecto_id' })
  proyectoId: number;

  @ManyToOne(() => Proyecto, { eager: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 50, nullable: true })
  ambiente: string;

  @Column({ length: 20, default: EstadoCiclo.ACTIVO })
  estado: EstadoCiclo;

  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: Date;

  @Column({ name: 'creado_por' })
  creadoPor: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'creado_por' })
  creador: Usuario;

  @Column({ name: 'plan_prueba_id', type: 'int', nullable: true })
  planPruebaId: number | null;

  @Column({ name: 'plan_nombre', type: 'varchar', length: 200, nullable: true })
  planNombre: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  // Lazy relation for counting executions
  @OneToMany('EjecucionCasoPrueba', 'ciclo')
  ejecuciones: any[];
}
