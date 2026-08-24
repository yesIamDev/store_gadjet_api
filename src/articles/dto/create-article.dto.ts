import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleColor } from '../entities/article.entity';

export class CreateArticleDto {
  @IsString()
  @MinLength(1, { message: 'Le nom commercial de la cartouche est requis' })
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  nom: string;

  @IsString()
  @MinLength(1, { message: 'La marque est requise' })
  @MaxLength(100, { message: 'La marque ne peut pas dépasser 100 caractères' })
  marque: string;

  @IsEnum(ArticleColor, {
    message: 'La couleur doit être NOIR, JAUNE, MAGENTA, CYAN ou BLEU',
  })
  couleur: ArticleColor;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'La quantité au magasin ne peut pas être négative' })
  quantiteMagasin: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'La quantité au dépôt ne peut pas être négative' })
  quantiteDepot: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @IsPositive({ message: 'Le prix de vente doit être positif' })
  @Min(0.01, { message: 'Le prix de vente doit être supérieur à 0' })
  prixDeVente?: number;
}
