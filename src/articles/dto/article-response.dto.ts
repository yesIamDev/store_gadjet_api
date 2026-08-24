import { Expose } from 'class-transformer';
import { ArticleColor } from '../entities/article.entity';

export class ArticleResponseDto {
  @Expose()
  id: string;

  @Expose()
  nom: string;

  @Expose()
  marque: string;

  @Expose()
  couleur: ArticleColor;

  @Expose()
  quantiteEnStock: number;

  @Expose()
  quantiteMagasin: number;

  @Expose()
  quantiteDepot: number;

  @Expose()
  prixDeVente: number | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ArticleResponseDto>) {
    Object.assign(this, partial);
  }
}
