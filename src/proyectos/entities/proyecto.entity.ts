import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum EstadoProyecto {
  PLANIFICADO  = 'Planificado',
  EN_EJECUCION = 'En Ejecución',
  EN_PAUSA     = 'En Pausa',
  COMPLETADO   = 'Completado',
  CANCELADO    = 'Cancelado',
}

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn()
  id: number;

  /** Categoría / etiqueta del proyecto (SharePoint: "Proyecto") */
  @Column({ nullable: true, length: 200 })
  proyecto: string;

  /** Nombre completo del proyecto (SharePoint: "Nombre Proyecto") */
  @Column({ length: 200 })
  nombre: string;

  /** Cliente asociado al proyecto */
  @Column({ length: 200 })
  cliente: string;

  /** Código interno único (uso del sistema) */
  @Column({ unique: true, length: 20, nullable: true })
  codigo: string;

  /** Responsable de QA del proyecto (SharePoint: "Responsable QA") */
  @Column({ name: 'responsable_qa_id', nullable: true })
  responsableQaId: number;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'responsable_qa_id' })
  responsableQa: Usuario;

  /** Estado del proyecto */
  @Column({ type: 'enum', enum: EstadoProyecto, default: EstadoProyecto.PLANIFICADO })
  estado: EstadoProyecto;

  /** Número de iteración / sprint */
  @Column({ nullable: true, type: 'int' })
  iteracion: number;

  /** Fecha de inicio planificada */
  @Column({ name: 'fecha_inicio_planificada', type: 'date', nullable: true })
  fechaInicioPlanificada: Date;

  /** Fecha de fin planificada */
  @Column({ name: 'fecha_fin_planificada', type: 'date', nullable: true })
  fechaFinPlanificada: Date;

  /** Fecha de inicio real */
  @Column({ name: 'fecha_inicio_real', type: 'date', nullable: true })
  fechaInicioReal: Date;

  /** Fecha de fin real */
  @Column({ name: 'fecha_fin_real', type: 'date', nullable: true })
  fechaFinReal: Date;

  /** Porcentaje de avance (0-100) */
  @Column({
    name: 'porcentaje_avance',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  porcentajeAvance: number;

  /** URL del repositorio de código */
  @Column({ name: 'repositorio_url', nullable: true, length: 500 })
  repositorioUrl: string;

  /** Notas y observaciones generales */
  @Column({ type: 'text', nullable: true })
  notas: string;

  /** Sistema o aplicación bajo prueba */
  @Column({ nullable: true, length: 200 })
  sistema: string;

  /** Jefe de proyecto (SharePoint: "Jefe de Proyecto") */
  @Column({ name: 'jefe_proyecto_id' })
  jefeProyectoId: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'jefe_proyecto_id' })
  jefeProyecto: Usuario;

  /** Fecha estimada de entrega */
  @Column({ name: 'fecha_estimacion', type: 'date', nullable: true })
  fechaEstimacion: Date;

  /** Horas de QA estimadas/consumidas */
  @Column({
    name: 'horas_qa',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  horasQa: number;

  /** Jefe de QA responsable (SharePoint: "Jefe QA") */
  @Column({ name: 'jefe_qa_id' })
  jefeQaId: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'jefe_qa_id' })
  jefeQa: Usuario;

  @Column({ name: 'creado_por' })
  creadoPor: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'creado_por' })
  creador: Usuario;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
