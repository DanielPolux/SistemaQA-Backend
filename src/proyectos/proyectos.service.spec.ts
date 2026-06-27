import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ProyectosService } from './proyectos.service';
import { Proyecto, EstadoProyecto } from './entities/proyecto.entity';
import { SharepointService } from '../sharepoint/sharepoint.service';
import { MailService } from '../mail/mail.service';

const mockProyecto = {
  id: 1,
  nombre: 'Proyecto Demo',
  cliente: 'Cliente SA',
  codigo: 'DEMO-01',
  estado: EstadoProyecto.PLANIFICADO,
  jefeProyectoId: 1,
  jefeQaId: 2,
  responsableQaId: null,
  creadoPor: 1,
};

const makeQb = (items: any[], total = items.length) => ({
  leftJoin:  jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  skip:      jest.fn().mockReturnThis(),
  take:      jest.fn().mockReturnThis(),
  orderBy:   jest.fn().mockReturnThis(),
  andWhere:  jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([items, total]),
});

const mockRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  create:  jest.fn(),
  save:    jest.fn(),
  remove:  jest.fn(),
  manager: { query: jest.fn().mockResolvedValue([{ avance: '0', aprobacion: '0' }]) },
};

describe('ProyectosService', () => {
  let service: ProyectosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectosService,
        { provide: getRepositoryToken(Proyecto), useValue: mockRepo },
        { provide: SharepointService, useValue: { subirArchivo: jest.fn(), eliminarArchivo: jest.fn() } },
        { provide: MailService,       useValue: { send: jest.fn() } },
        { provide: ConfigService,     useValue: { get: jest.fn().mockReturnValue('http://localhost:4200') } },
      ],
    }).compile();

    service = module.get<ProyectosService>(ProyectosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('retorna lista paginada de proyectos', async () => {
      mockRepo.createQueryBuilder.mockReturnValue(makeQb([mockProyecto]));
      mockRepo.manager.query.mockResolvedValue([{ id: '1', avance: '70', aprobacion: '85' }]);

      const result = await service.findAll({}, 1, true);

      expect(result.total).toBe(1);
      expect(result.datos[0].porcentajeAvance).toBe(70);
    });
  });

  describe('create', () => {
    it('crea un proyecto correctamente', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockProyecto);
      mockRepo.save.mockResolvedValue(mockProyecto);

      const result = await service.create(
        { nombre: 'Proyecto Demo', cliente: 'Cliente SA', jefeProyectoId: 1, jefeQaId: 2 } as any,
        1,
      );

      expect(result.nombre).toBe('Proyecto Demo');
    });

    it('lanza BadRequestException si el código ya existe', async () => {
      mockRepo.findOne.mockResolvedValue(mockProyecto);

      await expect(
        service.create(
          { nombre: 'Otro', cliente: 'Otro', codigo: 'DEMO-01', jefeProyectoId: 1, jefeQaId: 2 } as any,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si el proyecto no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
