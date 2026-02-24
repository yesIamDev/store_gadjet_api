import { Expose } from 'class-transformer';
import { ClientType } from '../entities/client.entity';

export class ClientResponseDto {
  @Expose()
  id: string;

  @Expose()
  type: ClientType;

  @Expose()
  nom: string;

  @Expose()
  telephone: string | null;

  @Expose()
  nomPersonneReference: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ClientResponseDto>) {
    Object.assign(this, partial);
  }
}
