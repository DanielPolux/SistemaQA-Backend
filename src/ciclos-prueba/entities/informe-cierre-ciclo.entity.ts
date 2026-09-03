import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CicloPrueba } from './ciclo-prueba.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('informes_cierre_ciclo')
export class InformeCierreCiclo {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'ciclo_id' }) cicloId: number;
  @ManyToOne(() => CicloPrueba, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ciclo_id' }) ciclo: CicloPrueba;
  @Column() version: number;
  @Column({ name: 'resultado_global', length: 40 }) resultadoGlobal: string;
  @Column({ name: 'recomendacion_qa', length: 40 }) recomendacionQa: string;
  @Column({ name: 'conclusion_qa', type: 'text' }) conclusionQa: string;
  @Column({ name: 'justificacion_bloqueados', type: 'text', nullable: true }) justificacionBloqueados: string | null;
  @Column({ type: 'jsonb' }) resumen: Record<string, any>;
  @Column({ name: 'generado_por' }) generadoPor: number;
  @ManyToOne(() => Usuario) @JoinColumn({ name: 'generado_por' }) generador: Usuario;
  @Column({ name: 'correo_enviado_en', type: 'timestamptz', nullable: true }) correoEnviadoEn: Date | null;
  @CreateDateColumn({ name: 'creado_en' }) creadoEn: Date;
}
