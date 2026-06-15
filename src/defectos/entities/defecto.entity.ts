import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { CasoPrueba } from '../../casos-prueba/entities/caso-prueba.entity';
import { Requerimiento } from '../../requerimientos/entities/requerimiento.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ComentarioDefecto } from './comentario-defecto.entity';

export enum SeveridadDefecto {
  CRITICO = 'Crítico',
  ALTO = 'Alto',
  MEDIO = 'Medio',
  BAJO = 'Bajo',
}

export enum PrioridadDefecto {
  URGENTE = 'Urgente',
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja',
}

export enum EstadoDefecto {
  NUEVO = 'Nuevo',
  ASIGNADO = 'Asignado',
  EN_PROGRESO = 'En Progreso',
  EN_REVISION = 'En Revisión',
  RESUELTO = 'Resuelto',
  CERRADO = 'Cerrado',
  REABIERTO = 'Reabierto',
  RECHAZADO = 'Rechazado',
}

export enum AmbienteDefecto {
  DESARROLLO = 'Desarrollo',
  QA = 'QA',
  STAGING = 'Staging',
  PRODUCCION = 'Producción',
}

export enum EstadoDesarrollo {
  ATENDIDO = 'Atendido',
  NO_APLICA = 'No Aplica',
}

@Entity('defectos')
export class Defecto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'proyecto_id' })
  proyectoId: number;

  @ManyToOne(() => Proyecto, { eager: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @Column({ name: 'caso_prueba_id' })
  casoPruebaId: number;

  @ManyToOne(() => CasoPrueba, { eager: false })
  @JoinColumn({ name: 'caso_prueba_id' })
  casoPrueba: CasoPrueba;

  @Column({ name: 'requerimiento_id', nullable: true })
  requerimientoId: number;

  @ManyToOne(() => Requerimiento, { eager: false, nullable: true })
  @JoinColumn({ name: 'requerimiento_id' })
  requerimiento: Requerimiento;

  @Column({ unique: true, length: 30 })
  codigo: string;

  @Column({ length: 300 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'pasos_reproduccion', type: 'text' })
  pasosReproduccion: string;

  @Column({ name: 'resultado_obtenido', type: 'text' })
  resultadoObtenido: string;

  @Column({ name: 'resultado_esperado', type: 'text' })
  resultadoEsperado: string;

  @Column({ type: 'enum', enum: AmbienteDefecto })
  ambiente: AmbienteDefecto;

  @Column({ length: 50 })
  version: string;

  @Column({ type: 'enum', enum: SeveridadDefecto })
  severidad: SeveridadDefecto;

  @Column({ type: 'enum', enum: PrioridadDefecto })
  prioridad: PrioridadDefecto;

  @Column({ type: 'enum', enum: EstadoDefecto, default: EstadoDefecto.NUEVO })
  estado: EstadoDefecto;

  @Column({ name: 'asignado_a', nullable: true })
  asignadoA: number;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'asignado_a' })
  asignado: Usuario;

  @Column({ name: 'reportado_por' })
  reportadoPor: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'reportado_por' })
  reportador: Usuario;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fechaResolucion: Date;

  @Column({
    name: 'estado_desarrollo',
    type: 'enum',
    enum: EstadoDesarrollo,
    nullable: true,
  })
  estadoDesarrollo: EstadoDesarrollo | null;

  @OneToMany(() => ComentarioDefecto, (c) => c.defecto)
  comentarios: ComentarioDefecto[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
