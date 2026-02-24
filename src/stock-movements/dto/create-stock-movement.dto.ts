import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '../entities/stock-movement.entity';
import { LocationType } from '../entities/location-type.enum';

export class StockMovementItemDto {
  @IsNotEmpty({ message: "L'ID de l'article est requis" })
  @IsUUID('4', { message: "L'ID de l'article doit être un UUID valide" })
  articleId: string;

  @IsNotEmpty({ message: 'La quantité est requise' })
  @IsInt({ message: 'La quantité doit être un nombre entier' })
  @Min(1, { message: 'La quantité doit être supérieure à 0' })
  quantite: number;

  @IsNotEmpty({ message: "L'emplacement est requis" })
  @IsEnum(LocationType, {
    message: "L'emplacement doit être MAGASIN ou DEPOT",
  })
  emplacement: LocationType;
}

export class CreateStockMovementDto {
  @IsNotEmpty({ message: 'Le type de mouvement est requis' })
  @IsEnum(MovementType, {
    message: 'Le type de mouvement doit être ENTREE ou SORTIE',
  })
  type: MovementType;

  @IsNotEmpty({ message: 'Au moins un article est requis' })
  @IsArray({ message: 'Les articles doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins un article est requis' })
  @ValidateNested({ each: true })
  @Type(() => StockMovementItemDto)
  items: StockMovementItemDto[];

  @IsOptional()
  @IsString({ message: 'Le motif doit être une chaîne de caractères' })
  motif?: string;
}
