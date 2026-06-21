import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Catalogo } from './entities/catalogo.entity';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

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
  ) {}

  async findGrupos(): Promise<GrupoResumen[]> {
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.grupo', 'grupo')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN c.activo THEN 1 END)', 'activos')
      .groupBy('c.grupo')
      .orderBy('c.grupo', 'ASC')
      .getRawMany();

    return rows.map(r => ({
      grupo:   r.grupo,
      total:   Number(r.total),
      activos: Number(r.activos),
    }));
  }

  async findByGrupo(grupo: string): Promise<Catalogo[]> {
    return this.repo.find({
      where: { grupo },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async findAll(): Promise<Catalogo[]> {
    return this.repo.find({ order: { grupo: 'ASC', orden: 'ASC', nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Catalogo> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Catálogo #${id} no encontrado`);
    return item;
  }

  async create(dto: CreateCatalogoDto): Promise<Catalogo> {
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

    if (dto.codigo && dto.codigo !== item.codigo) {
      const existe = await this.repo.findOne({ where: { grupo: dto.grupo ?? item.grupo, codigo: dto.codigo } });
      if (existe && existe.id !== id)
        throw new BadRequestException(`Ya existe un ítem con ese grupo y código`);
    }

    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    if (item.sistema)
      throw new BadRequestException('Los ítems del sistema no pueden eliminarse. Puede desactivarlos.');
    await this.repo.remove(item);
  }
}
