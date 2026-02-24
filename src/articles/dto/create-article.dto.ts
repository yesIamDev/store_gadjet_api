import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleDto {
  @IsString()
  @MinLength(1, { message: 'Le nom de l\'article est requis' })
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  nom: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'La description ne peut pas dépasser 1000 caractères',
  })
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'La quantité au magasin ne peut pas être négative' })
  quantiteMagasin: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'La quantité au dépôt ne peut pas être négative' })
  quantiteDepot: number;

  @IsNumber()
  @Type(() => Number)
  @IsPositive({ message: 'Le prix de vente doit être positif' })
  @Min(0.01, { message: 'Le prix de vente doit être supérieur à 0' })
  prixDeVente: number;
}
