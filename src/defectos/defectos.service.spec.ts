import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DefectosService } from './defectos.service';
import { Defecto, EstadoDefecto } from './entities/defecto.entity';
import { ComentarioDefecto } from './entities/comentario-defecto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

const mockDefecto = {
  id: 1,
  titulo: 'Error en login',
  codigo: 'DEF-0001',
  codigoProyecto: 'INC-001',
  proyectoId: 10,
  casoPruebaId: 5,
  estado: EstadoDefecto.NUEVO,
  reportadoPor: 1,
  asignadoA: null,
};

const makeQb = (result: any, count = 1) => ({
  leftJoin: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[result].flat(), count]),
  getMany: jest.fn().mockResolvedValue([result].flat()),
});

const mockDefectosRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  query: jest.fn(),
  manager: {
    transaction: jest.fn(),
    query: jest.fn(),
  },
};

describe('DefectosService', () => {
  let service: DefectosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefectosService,
        { provide: getRepositoryToken(Defecto),          useValue: mockDefectosRepo },
        { provide: getRepositoryToken(ComentarioDefecto), useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(Usuario),           useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Proyecto),          useValue: { findOne: jest.fn() } },
        { provide: ConfigService,    useValue: { get: jest.fn().mockReturnValue('http://localhost:4200') } },
        { provide: MailService,      useValue: { send: jest.fn() } },
        { provide: AuditoriaService, useValue: { registrar: jest.fn(), registrarCambios: jest.fn() } },
      ],
    }).compile();

    service = module.get<DefectosService>(DefectosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('retorna lista paginada de defectos', async () => {
      const qb = makeQb(mockDefecto);
      mockDefectosRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ pagina: 1, porPagina: 10 }, 1, true);

      expect(result.total).toBe(1);
      expect(result.datos).toHaveLength(1);
      expect(result.pagina).toBe(1);
    });

    it('aplica filtro de proyectoId cuando se proporciona', async () => {
      const qb = makeQb([]);
      mockDefectosRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ pagina: 1, porPagina: 10, proyectoId: 10 }, 1, true);

      expect(qb.andWhere).toHaveBeenCalledWith('d.proyectoId = :pid', { pid: 10 });
    });

    it('aplica filtro de scoping para usuarios no admin', async () => {
      const qb = makeQb([]);
      mockDefectosRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ pagina: 1, porPagina: 10 }, 42, false);

      const whereCall = qb.andWhere.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('proyecto_id'),
      );
      expect(whereCall).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('retorna el defecto cuando existe', async () => {
      mockDefectosRepo.findOne.mockResolvedValue({ ...mockDefecto, comentarios: [] });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.titulo).toBe('Error en login');
    });

    it('lanza NotFoundException cuando el defecto no existe', async () => {
      mockDefectosRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCasoPrueba', () => {
    it('retorna defectos del caso de prueba con relaciones cargadas', async () => {
      const qb = makeQb(mockDefecto);
      mockDefectosRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByCasoPrueba(5);

      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('d.casoPruebaId = :id', { id: 5 });
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('d.asignado', 'a');
    });
  });
});
