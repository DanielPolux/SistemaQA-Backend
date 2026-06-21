import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CasoPrueba } from '../../casos-prueba/entities/caso-prueba.entity';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Defecto } from '../../defectos/entities/defecto.entity';
import { CicloPrueba } from '../../ciclos-prueba/entities/ciclo-prueba.entity';

export enum ResultadoEjecucion {
  APROBADO  = 'Aprobado',
  FALLIDO   = 'Fallido',
  BLOQUEADO = 'Bloqueado',
  OMITIDO   = 'Omitido',
}

export enum AmbienteEjecucion {
  DESARROLLO = 'Desarrollo',
  QA         = 'QA',
  STAGING    = 'Staging',
  PRODUCCION = 'Producción',
}

@Entity('ejecuciones_caso_prueba')
export class EjecucionCasoPrueba {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'caso_prueba_id' })
  casoPruebaId: number;

  @ManyToOne(() => CasoPrueba, { eager: false })
  @JoinColumn({ name: 'caso_prueba_id' })
  casoPrueba: CasoPrueba;

  @Column({ name: 'proyecto_id' })
  proyectoId: number;

  @ManyToOne(() => Proyecto, { eager: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @Column({ name: 'ciclo_prueba', length: 100, nullable: true })
  cicloPrueba: string;

  @Column({ name: 'tester_id' })
  testerId: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'tester_id' })
  tester: Usuario;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ type: 'enum', enum: AmbienteEjecucion })
  ambiente: AmbienteEjecucion;

  @Column({ length: 50 })
  version: string;

  @Column({ type: 'enum', enum: ResultadoEjecucion })
  resultado: ResultadoEjecucion;

  @Column({ name: 'resultado_obtenido', type: 'text' })
  resultadoObtenido: string;

  @Column({ name: 'evidencia_url', length: 500, nullable: true })
  evidenciaUrl: string;

  @Column({ name: 'defecto_id', nullable: true })
  defectoId: number;

  @ManyToOne(() => Defecto, { eager: false, nullable: true })
  @JoinColumn({ name: 'defecto_id' })
  defecto: Defecto;

  @Column({ name: 'ciclo_id', nullable: true })
  cicloId: number;

  @ManyToOne(() => CicloPrueba, { eager: false, nullable: true })
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloPrueba;

  @Column({ name: 'desarrollador_id', nullable: true })
  desarrolladorId: number;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'desarrollador_id' })
  desarrollador: Usuario;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
