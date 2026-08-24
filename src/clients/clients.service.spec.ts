import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ClientsService } from './clients.service';
import { Client, ClientType } from './entities/client.entity';

type MockRepository = Partial<Record<keyof Repository<Client>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('ClientsService', () => {
  let service: ClientsService;
  let repository: MockRepository;

  const client: Client = {
    id: 'client-1',
    type: ClientType.INDIVIDU,
    nom: 'Jean Dupont',
    telephone: '0700000000',
    nomPersonneReference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getRepositoryToken(Client), useValue: repository },
      ],
    }).compile();

    service = module.get(ClientsService);
  });

  describe('create', () => {
    it('crée un client quand le nom est disponible', async () => {
      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue(client);
      repository.save!.mockResolvedValue(client);

      const dto = {
        type: ClientType.INDIVIDU,
        nom: 'Jean Dupont',
        telephone: '0700000000',
      };
      const result = await service.create(dto as any);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result.nom).toBe('Jean Dupont');
    });

    it('lève une ConflictException si le nom est déjà utilisé', async () => {
      repository.findOne!.mockResolvedValue(client);

      await expect(
        service.create({ nom: 'Jean Dupont' } as any),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('retourne le client correspondant', async () => {
      repository.findOne!.mockResolvedValue(client);

      const result = await service.findOne('client-1');

      expect(result.id).toBe('client-1');
    });

    it("lève une NotFoundException si le client n'existe pas", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('supprime le client existant', async () => {
      repository.findOne!.mockResolvedValue(client);
      repository.remove!.mockResolvedValue(client);

      await service.remove('client-1');

      expect(repository.remove).toHaveBeenCalledWith(client);
    });

    it("lève une NotFoundException si le client n'existe pas", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
