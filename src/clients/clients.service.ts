import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientResponseDto } from './dto/client-response.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    // Vérifier l'unicité du nom
    const existingClient = await this.clientRepository.findOne({
      where: { nom: createClientDto.nom },
    });

    if (existingClient) {
      throw new ConflictException('Un client avec ce nom existe déjà');
    }

    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);
    return new ClientResponseDto(savedClient);
  }

  async findAll(): Promise<ClientResponseDto[]> {
    const clients = await this.clientRepository.find({
      order: { createdAt: 'DESC' },
    });
    return clients.map((client) => new ClientResponseDto(client));
  }

  async findOne(id: string): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${id} introuvable`);
    }

    return new ClientResponseDto(client);
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${id} introuvable`);
    }

    // Vérifier l'unicité du nom si le nom est modifié
    if (updateClientDto.nom && updateClientDto.nom !== client.nom) {
      const existingClient = await this.clientRepository.findOne({
        where: { nom: updateClientDto.nom },
      });

      if (existingClient) {
        throw new ConflictException('Un client avec ce nom existe déjà');
      }
    }

    Object.assign(client, updateClientDto);
    const updatedClient = await this.clientRepository.save(client);
    return new ClientResponseDto(updatedClient);
  }

  async remove(id: string): Promise<void> {
    const client = await this.clientRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${id} introuvable`);
    }

    await this.clientRepository.remove(client);
  }
}
