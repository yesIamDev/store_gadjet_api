import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  ValidateIf,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '../entities/stock-movement.entity';
import { LocationType } from '../entities/location-type.enum';

// Types de mouvement pour lesquels le client est obligatoire
const CLIENT_REQUIRED_TYPES = [
  MovementType.VENTE_CREDIT,
  MovementType.PRET_REVENDEUR,
];

export class StockMovementItemDto {
  @IsNotEmpty({ message: "L'ID de l'article est requis" })
  @IsUUID('4', { message: "L'ID de l'article doit être un UUID valide" })
  articleId: string;

  @IsNotEmpty({ message: 'La quantité est requise' })
  @IsInt({ message: 'La quantité doit être un nombre entier' })
  @Min(1, { message: 'La quantité doit être supérieure à 0' })
  quantite: number;

  // Requis uniquement pour ENTREE/SORTIE ; les autres types dérivent
  // automatiquement l'emplacement concerné à partir du type de mouvement.
  @IsOptional()
  @IsEnum(LocationType, {
    message: "L'emplacement doit être MAGASIN ou DEPOT",
  })
  emplacement?: LocationType;
}

export class CreateStockMovementDto {
  @IsNotEmpty({ message: 'Le type de mouvement est requis' })
  @IsEnum(MovementType, {
    message: 'Le type de mouvement est invalide',
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

  // Requis pour VENTE_CREDIT et PRET_REVENDEUR, optionnel pour VENTE_RAPIDE
  @ValidateIf((o) => CLIENT_REQUIRED_TYPES.includes(o.type) || !!o.clientId)
  @IsNotEmpty({ message: 'Le client est requis pour ce type de mouvement' })
  @IsUUID('4', { message: "L'ID du client doit être un UUID valide" })
  clientId?: string;
}
