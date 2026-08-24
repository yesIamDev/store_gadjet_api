import {
  IsArray,
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnLoanItemDto {
  @IsNotEmpty({ message: "L'ID de l'article du prêt est requis" })
  @IsUUID('4', { message: "L'ID de l'item doit être un UUID valide" })
  itemId: string;

  @IsNotEmpty({ message: 'La quantité retournée est requise' })
  @IsInt({ message: 'La quantité retournée doit être un nombre entier' })
  @Min(1, { message: 'La quantité retournée doit être supérieure à 0' })
  quantite: number;
}

export class ReturnLoanDto {
  @IsArray({ message: 'Les articles retournés doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins un article retourné est requis' })
  @ValidateNested({ each: true })
  @Type(() => ReturnLoanItemDto)
  items: ReturnLoanItemDto[];
}
