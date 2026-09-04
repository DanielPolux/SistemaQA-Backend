import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Catalogo } from './entities/catalogo.entity';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';
import { Proyecto } from '../proyectos/entities/proyecto.entity';

export interface GrupoResumen {
  grupo: string;
  total: number;
  activos: number;
}

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Catalogo)
    private readonly repo: Repository<Catalogo>,
    @InjectRepository(Proyecto)
    private readonly proyectoRepo: Repository<Proyecto>,
  ) {}

  async findGrupos(): Promise<GrupoResumen[]> {
    await this.sincronizarClientesExistentes();
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.grupo', 'grupo')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN c.activo THEN 1 END)', 'activos')
      .groupBy('c.grupo')
      .orderBy('c.grupo', 'ASC')
      .getRawMany();

    const grupos = rows.map(r => ({
      grupo:   r.grupo,
      total:   Number(r.total),
      activos: Number(r.activos),
    }));
    if (!grupos.some(g => g.grupo === 'CLIENTE')) {
      grupos.push({ grupo: 'CLIENTE', total: 0, activos: 0 });
      grupos.sort((a, b) => a.grupo.localeCompare(b.grupo, 'es'));
    }
    return grupos;
  }

  async findByGrupo(grupo: string): Promise<Catalogo[]> {
    grupo = grupo.trim().toUpperCase();
    if (grupo === 'CLIENTE') await this.sincronizarClientesExistentes();
    return this.repo.find({
      where: { grupo },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async findAll(): Promise<Catalogo[]> {
    await this.sincronizarClientesExistentes();
    return this.repo.find({ order: { grupo: 'ASC', orden: 'ASC', nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Catalogo> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Catálogo #${id} no encontrado`);
    return item;
  }

  async validarClienteActivo(nombre: string): Promise<void> {
    await this.sincronizarClientesExistentes();
    const cliente = await this.repo
      .createQueryBuilder('c')
      .where('c.grupo = :grupo', { grupo: 'CLIENTE' })
      .andWhere('LOWER(c.nombre) = LOWER(:nombre)', { nombre: nombre.trim() })
      .getOne();
    if (!cliente) throw new BadRequestException('El cliente seleccionado no existe en el catálogo');
    if (!cliente.activo) throw new BadRequestException('El cliente seleccionado está inactivo');
  }

  async create(dto: CreateCatalogoDto): Promise<Catalogo> {
    dto.grupo = dto.grupo.trim().toUpperCase();
    dto.nombre = dto.nombre.trim();

    if (dto.grupo === 'CLIENTE') {
      const mismoNombre = await this.repo
        .createQueryBuilder('c')
        .where('c.grupo = :grupo', { grupo: 'CLIENTE' })
        .andWhere('LOWER(c.nombre) = LOWER(:nombre)', { nombre: dto.nombre })
        .getOne();
      if (mismoNombre) throw new BadRequestException('Ya existe un cliente con ese nombre');
      const siguiente = await this.siguienteCliente();
      dto.codigo = siguiente.codigo;
      dto.orden = siguiente.orden;
    } else {
      dto.codigo = dto.codigo!.trim().toUpperCase();
    }

    const existe = await this.repo.findOne({ where: { grupo: dto.grupo, codigo: dto.codigo } });
    if (existe) throw new BadRequestException(`Ya existe un ítem con grupo="${dto.grupo}" y código="${dto.codigo}"`);

    const item = this.repo.create({
      ...dto,
      orden:  dto.orden  ?? 0,
      activo: dto.activo ?? true,
      sistema: false,
    });
    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateCatalogoDto): Promise<Catalogo> {
    const item = await this.findOne(id);

    if (dto.grupo) dto.grupo = dto.grupo.trim().toUpperCase();
    if (dto.codigo) dto.codigo = dto.codigo.trim().toUpperCase();
    if (dto.nombre) dto.nombre = dto.nombre.trim();

    if (dto.codigo && dto.codigo !== item.codigo) {
      const existe = await this.repo.findOne({ where: { grupo: dto.grupo ?? item.grupo, codigo: dto.codigo } });
      if (existe && existe.id !== id)
        throw new BadRequestException(`Ya existe un ítem con ese grupo y código`);
    }

    if (item.grupo === 'CLIENTE' && dto.nombre && dto.nombre !== item.nombre) {
      const mismoNombre = await this.repo
        .createQueryBuilder('c')
        .where('c.grupo = :grupo', { grupo: 'CLIENTE' })
        .andWhere('LOWER(c.nombre) = LOWER(:nombre)', { nombre: dto.nombre })
        .andWhere('c.id <> :id', { id })
        .getOne();
      if (mismoNombre) throw new BadRequestException('Ya existe un cliente con ese nombre');
    }

    const nombreAnterior = item.nombre;
    Object.assign(item, dto);
    const guardado = await this.repo.save(item);

    // Los proyectos históricos conservan la referencia lógica si el cliente cambia de nombre.
    if (item.grupo === 'CLIENTE' && dto.nombre && dto.nombre !== nombreAnterior) {
      await this.proyectoRepo.update({ cliente: nombreAnterior }, { cliente: dto.nombre });
    }
    return guardado;
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    if (item.sistema)
      throw new BadRequestException('Los ítems del sistema no pueden eliminarse. Puede desactivarlos.');
    if (item.grupo === 'CLIENTE') {
      const proyectos = await this.proyectoRepo.count({ where: { cliente: item.nombre } });
      if (proyectos > 0)
        throw new BadRequestException('El cliente tiene proyectos asociados. Puede desactivarlo, pero no eliminarlo.');
    }
    await this.repo.remove(item);
  }

  /** Incorpora al catálogo los clientes históricos sin modificar los proyectos existentes. */
  private async siguienteCliente(): Promise<{ codigo: string; orden: number }> {
    const fila = await this.repo
      .createQueryBuilder('c')
      .select("COALESCE(MAX(CASE WHEN c.codigo ~ '^CLI-[0-9]+$' THEN CAST(SUBSTRING(c.codigo FROM 5) AS INTEGER) ELSE 0 END), 0)", 'numero')
      .addSelect('COALESCE(MAX(c.orden), 0)', 'orden')
      .where('c.grupo = :grupo', { grupo: 'CLIENTE' })
      .getRawOne();
    const numero = Number(fila?.numero ?? 0) + 1;
    return {
      codigo: `CLI-${String(numero).padStart(3, '0')}`,
      orden: Number(fila?.orden ?? 0) + 1,
    };
  }

  private async sincronizarClientesExistentes(): Promise<void> {
    const filas: Array<{ cliente: string }> = await this.proyectoRepo
      .createQueryBuilder('p')
      .select('DISTINCT TRIM(p.cliente)', 'cliente')
      .where("p.cliente IS NOT NULL AND TRIM(p.cliente) <> ''")
      .orderBy('TRIM(p.cliente)', 'ASC')
      .getRawMany();

    const existentes = await this.repo.find({ where: { grupo: 'CLIENTE' } });
    const nombres = new Set(existentes.map(c => c.nombre.trim().toLocaleLowerCase('es')));
    const codigos = new Set(existentes.map(c => c.codigo));
    let correlativo = existentes.length + 1;

    for (const fila of filas) {
      const nombre = fila.cliente.trim();
      if (nombres.has(nombre.toLocaleLowerCase('es'))) continue;
      let codigo: string;
      do codigo = `CLI-${String(correlativo++).padStart(3, '0')}`; while (codigos.has(codigo));
      await this.repo.save(this.repo.create({
        grupo: 'CLIENTE', codigo, nombre,
        descripcion: 'Cliente migrado desde proyectos existentes.',
        orden: correlativo - 1, activo: true, sistema: false,
      }));
      nombres.add(nombre.toLocaleLowerCase('es'));
      codigos.add(codigo);
    }
  }
}
