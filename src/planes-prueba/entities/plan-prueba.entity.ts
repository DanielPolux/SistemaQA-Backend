import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum EstadoPlan {
  BORRADOR     = 'Borrador',
  PLANIFICADO  = 'Planificado',
  EN_EJECUCION = 'En ejecución',
  CERRADO      = 'Cerrado',
}

@Entity('planes_prueba')
export class PlanPrueba {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'text' })
  objetivo: string;

  @Column({ type: 'text', nullable: true })
  alcance: string | null;

  @Column({ name: 'fuera_alcance', type: 'text', nullable: true })
  fueraAlcance: string | null;

  @Column({ name: 'criterios_entrada', type: 'text', nullable: true })
  criteriosEntrada: string | null;

  @Column({ name: 'criterios_salida', type: 'text', nullable: true })
  criteriosSalida: string | null;

  @Column({ type: 'text', nullable: true })
  riesgos: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sprint: string | null;

  @Column({ name: 'tipo_prueba', type: 'varchar', length: 50, nullable: true })
  tipoPrueba: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ambiente: string | null;

  @Column({ name: 'proyecto_id' })
  proyectoId: number;

  @ManyToOne(() => Proyecto, { eager: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @Column({ name: 'responsable_id', type: 'int', nullable: true })
  responsableId: number | null;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Usuario | null;

  @Column({ name: 'proyecto_nombre', type: 'varchar', length: 200, nullable: true })
  proyectoNombre: string | null;

  @Column({ name: 'responsable_nombre', type: 'varchar', length: 200, nullable: true })
  responsableNombre: string | null;

  @Column({ length: 30, default: EstadoPlan.BORRADOR })
  estado: EstadoPlan;

  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fechaInicio: Date | null;

  @Column({ name: 'fecha_objetivo', type: 'date', nullable: true })
  fechaObjetivo: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
