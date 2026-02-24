import { Expose } from 'class-transformer';

export class ArticleResponseDto {
  @Expose()
  id: string;

  @Expose()
  nom: string;

  @Expose()
  description: string | null;

  @Expose()
  quantiteEnStock: number;

  @Expose()
  quantiteMagasin: number;

  @Expose()
  quantiteDepot: number;

  @Expose()
  prixDeVente: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ArticleResponseDto>) {
    Object.assign(this, partial);
  }
}
