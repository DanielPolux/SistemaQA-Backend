import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { Requerimiento } from '../../requerimientos/entities/requerimiento.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoCasoPrueba {
  FUNCIONAL = 'Funcional',
  REGRESION = 'Regresión',
  HUMO = 'Humo',
  INTEGRACION = 'Integración',
  RENDIMIENTO = 'Rendimiento',
  SEGURIDAD = 'Seguridad',
  USABILIDAD = 'Usabilidad',
}

export enum PrioridadCasoPrueba {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja',
}

export enum EstadoCasoPrueba {
  PENDIENTE = 'Pendiente',
  EN_EJECUCION = 'En Ejecución',
  APROBADO = 'Aprobado',
  FALLIDO = 'Fallido',
  BLOQUEADO = 'Bloqueado',
  OMITIDO = 'Omitido',
}

@Entity('casos_prueba')
export class CasoPrueba {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'proyecto_id' })
  proyectoId: number;

  @ManyToOne(() => Proyecto, { eager: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @Column({ name: 'requerimiento_id', nullable: true })
  requerimientoId: number;

  @ManyToOne(() => Requerimiento, { eager: false, nullable: true })
  @JoinColumn({ name: 'requerimiento_id' })
  requerimiento: Requerimiento;

  @Column({ unique: true, length: 30 })
  codigo: string;

  @Column({ length: 300 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  precondiciones: string;

  @Column({ type: 'jsonb', default: '[]' })
  pasos: { orden: number; descripcion: string; resultadoEsperado: string }[];

  @Column({ name: 'resultado_esperado', type: 'text' })
  resultadoEsperado: string;

  @Column({ type: 'enum', enum: TipoCasoPrueba })
  tipo: TipoCasoPrueba;

  @Column({ type: 'enum', enum: PrioridadCasoPrueba })
  prioridad: PrioridadCasoPrueba;

  @Column({ type: 'enum', enum: EstadoCasoPrueba, default: EstadoCasoPrueba.PENDIENTE })
  estado: EstadoCasoPrueba;

  @Column({ name: 'asignado_a', nullable: true })
  asignadoA: number;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'asignado_a' })
  asignado: Usuario;

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
