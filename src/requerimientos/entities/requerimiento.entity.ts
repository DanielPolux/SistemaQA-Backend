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
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoRequerimiento {
  FUNCIONAL = 'Funcional',
  NO_FUNCIONAL = 'No Funcional',
  NEGOCIO = 'Negocio',
  TECNICO = 'Técnico',
}

export enum PrioridadRequerimiento {
  CRITICA = 'Crítica',
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja',
}

export enum EstadoRequerimiento {
  PENDIENTE = 'Pendiente',
  EN_ANALISIS = 'En Análisis',
  APROBADO = 'Aprobado',
  EN_DESARROLLO = 'En Desarrollo',
  COMPLETADO = 'Completado',
  RECHAZADO = 'Rechazado',
}

@Entity('requerimientos')
export class Requerimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'proyecto_id' })
  proyectoId: number;

  @ManyToOne(() => Proyecto, { eager: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @Column({ unique: true, length: 30 })
  codigo: string;

  @Column({ length: 300 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'criterios_aceptacion', type: 'text' })
  criteriosAceptacion: string;

  @Column({ type: 'enum', enum: TipoRequerimiento })
  tipo: TipoRequerimiento;

  @Column({ type: 'enum', enum: PrioridadRequerimiento })
  prioridad: PrioridadRequerimiento;

  @Column({ type: 'enum', enum: EstadoRequerimiento, default: EstadoRequerimiento.PENDIENTE })
  estado: EstadoRequerimiento;

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
