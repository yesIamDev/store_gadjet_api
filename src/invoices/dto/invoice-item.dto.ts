import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom de l\'article est requis' })
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  nom: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'La description ne peut pas dépasser 1000 caractères' })
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @IsPositive({ message: 'Le prix unitaire doit être positif' })
  @Min(0.01, { message: 'Le prix unitaire doit être supérieur à 0' })
  prixUnitaire?: number;

  @IsNumber()
  @Type(() => Number)
  @IsPositive({ message: 'La quantité doit être positive' })
  @Min(1, { message: 'La quantité doit être supérieure à 0' })
  quantite: number;
}
