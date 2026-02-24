import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsNumber()
  @Type(() => Number)
  @IsPositive({ message: 'Le montant du paiement doit être positif' })
  @Min(0.01, { message: 'Le montant du paiement doit être supérieur à 0' })
  montant: number;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La note ne peut pas dépasser 500 caractères' })
  note?: string;
}
