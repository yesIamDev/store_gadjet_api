import {
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { LocationType } from '../../stock-movements/entities/location-type.enum';

export class ReceivePendingArticleDto {
  @IsNotEmpty({ message: 'La quantité reçue est requise' })
  @IsInt({ message: 'La quantité reçue doit être un nombre entier' })
  @Min(1, { message: 'La quantité reçue doit être supérieure à 0' })
  quantiteRecue: number;

  @IsNotEmpty({ message: "L'emplacement est requis" })
  @IsEnum(LocationType, {
    message: "L'emplacement doit être MAGASIN ou DEPOT",
  })
  emplacement: LocationType;

  @IsOptional()
  @IsString({ message: 'Le motif doit être une chaîne de caractères' })
  @MaxLength(500, { message: 'Le motif ne peut pas dépasser 500 caractères' })
  motif?: string;
}
