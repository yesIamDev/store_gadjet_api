import { Expose } from 'class-transformer';

export class InvoiceItemResponseDto {
  @Expose()
  id: string;

  @Expose()
  nom: string;

  @Expose()
  description: string | null;

  @Expose()
  prixUnitaire: number;

  @Expose()
  quantite: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<InvoiceItemResponseDto>) {
    Object.assign(this, partial);
  }
}
