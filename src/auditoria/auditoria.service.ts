import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';

export interface RegistroAuditoriaDto {
  entidad: string;
  entidadId: number;
  usuarioId?: number;
  usuarioNombre?: string;
  accion: string;
  campo?: string;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly repo: Repository<Auditoria>,
  ) {}

  async registrar(dto: RegistroAuditoriaDto): Promise<void> {
    await this.repo.save(
      this.repo.create({
        entidad:       dto.entidad,
        entidadId:     dto.entidadId,
        usuarioId:     dto.usuarioId ?? null,
        usuarioNombre: dto.usuarioNombre ?? null,
        accion:        dto.accion,
        campo:         dto.campo ?? null,
        valorAnterior: dto.valorAnterior ?? null,
        valorNuevo:    dto.valorNuevo ?? null,
      }),
    );
  }

  async registrarCambios(
    entidad: string,
    entidadId: number,
    usuarioId: number | undefined,
    usuarioNombre: string | undefined,
    anterior: Record<string, any>,
    nuevo: Record<string, any>,
    campos: string[],
  ): Promise<void> {
    const registros: Partial<Auditoria>[] = [];

    for (const campo of campos) {
      const ant = anterior[campo] ?? null;
      const nvo = nuevo[campo] ?? null;
      if (String(ant ?? '') !== String(nvo ?? '')) {
        registros.push(
          this.repo.create({
            entidad,
            entidadId,
            usuarioId:     usuarioId ?? null,
            usuarioNombre: usuarioNombre ?? null,
            accion:        'Modificado',
            campo,
            valorAnterior: ant !== null ? String(ant) : null,
            valorNuevo:    nvo !== null ? String(nvo) : null,
          }),
        );
      }
    }

    if (registros.length) {
      await this.repo.save(registros);
    }
  }

  async getByCasoPrueba(casoPruebaId: number): Promise<Auditoria[]> {
    return this.repo.find({
      where: { entidad: 'CasoPrueba', entidadId: casoPruebaId },
      order: { fecha: 'DESC' },
    });
  }

  async getByDefecto(defectoId: number): Promise<Auditoria[]> {
    return this.repo.find({
      where: { entidad: 'Defecto', entidadId: defectoId },
      order: { fecha: 'DESC' },
    });
  }
}
