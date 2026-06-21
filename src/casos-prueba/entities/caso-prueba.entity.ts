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
  FUNCIONAL    = 'Funcional',
  REGRESION    = 'Regresión',
  HUMO         = 'Humo',
  INTEGRACION  = 'Integración',
  RENDIMIENTO  = 'Rendimiento',
  SEGURIDAD    = 'Seguridad',
  USABILIDAD   = 'Usabilidad',
}

export enum PrioridadCasoPrueba {
  ALTA  = 'Alta',
  MEDIA = 'Media',
  BAJA  = 'Baja',
}

export enum EstadoCasoPrueba {
  PENDIENTE    = 'Pendiente',
  EN_EJECUCION = 'En Ejecución',
  EJECUTADO    = 'Ejecutado',
  BLOQUEADO    = 'Bloqueado',
  OMITIDO      = 'Omitido',
}

export enum ResultadoCasoPrueba {
  SIN_EJECUTAR = 'Sin Ejecutar',
  APROBADO     = 'Aprobado',
  FALLIDO      = 'Fallido',
  BLOQUEADO    = 'Bloqueado',
  OMITIDO      = 'Omitido',
}

@Entity('casos_prueba')
export class CasoPrueba {
  @PrimaryGeneratedColumn()
  id: number;

  /** Código del caso de prueba (SharePoint: "Codigo CP") — único por proyecto, auto-generado */
  @Column({ name: 'codigo_cp', nullable: true, length: 30 })
  codigo: string;

  /** Nombre descriptivo del caso (SharePoint: "Nombre del Caso de Prueba") */
  @Column({ length: 300 })
  nombre: string;

  /** Proyecto al que pertenece (SharePoint: "Proyecto" - Búsqueda) */
  @Column({ name: 'proyecto_id' })
  proyectoId: number;

  @ManyToOne(() => Proyecto, { eager: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  /** Clave corta del proyecto (SharePoint: "ClaveProyecto") */
  @Column({ name: 'clave_proyecto', nullable: true, length: 50 })
  claveProyecto: string;

  /** Tipo de prueba (SharePoint: "Tipo de Prueba" - Elección) */
  @Column({ type: 'enum', enum: TipoCasoPrueba })
  tipo: TipoCasoPrueba;

  /** Descripción del caso (SharePoint: "Descripción del Caso de Prueba") */
  @Column({ type: 'text' })
  descripcion: string;

  /** Prioridad (SharePoint: "Prioridad" - Elección) */
  @Column({ type: 'enum', enum: PrioridadCasoPrueba })
  prioridad: PrioridadCasoPrueba;

  /** Estado actual del caso de prueba (SharePoint: "Estado QA" - Elección) */
  @Column({ type: 'enum', enum: EstadoCasoPrueba, default: EstadoCasoPrueba.PENDIENTE })
  estado: EstadoCasoPrueba;

  /** Resultado de la ejecución (SharePoint: "Resultado" - Elección) */
  @Column({
    type: 'enum',
    enum: ResultadoCasoPrueba,
    default: ResultadoCasoPrueba.SIN_EJECUTAR,
    nullable: true,
  })
  resultado: ResultadoCasoPrueba;

  /** Resultado esperado (SharePoint: "Resultado Esperado") */
  @Column({ name: 'resultado_esperado', type: 'text' })
  resultadoEsperado: string;

  /** Responsable de ejecutar el caso (SharePoint: "Responsable QA") */
  @Column({ name: 'responsable_qa_id', nullable: true })
  responsableQaId: number;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'responsable_qa_id' })
  responsableQa: Usuario;

  /** Fecha en que se ejecutó el caso (SharePoint: "Fecha Ejecución") */
  @Column({ name: 'fecha_ejecucion', type: 'timestamptz', nullable: true })
  fechaEjecucion: Date;

  /** URL de evidencia de ejecución (SharePoint: "Evidencia") */
  @Column({ name: 'evidencia_url', nullable: true, length: 500 })
  evidenciaUrl: string;

  /** Observaciones adicionales (SharePoint: "Observaciones") */
  @Column({ type: 'text', nullable: true })
  observaciones: string;

  /** Pasos de prueba estructurados (SharePoint: "Pasos de Prueba") */
  @Column({ type: 'jsonb', default: '[]' })
  pasos: { orden: number; descripcion: string; resultadoEsperado: string }[];

  /** Código texto del requerimiento RF (SharePoint: "Requerimiento RF") */
  @Column({ name: 'requerimiento_rf', nullable: true, length: 50 })
  requerimientoRf: string;

  /** Relación con requerimiento (SharePoint: "RF" - Búsqueda) */
  @Column({ name: 'requerimiento_id', nullable: true })
  requerimientoId: number;

  @ManyToOne(() => Requerimiento, { eager: false, nullable: true })
  @JoinColumn({ name: 'requerimiento_id' })
  requerimiento: Requerimiento;

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
