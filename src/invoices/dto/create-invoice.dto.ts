import {
  IsString,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsPositive,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceItemDto } from './invoice-item.dto';

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, {
    message: 'Le numéro de facture ne peut pas dépasser 100 caractères',
  })
  numeroFacture?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, {
    message: 'Le numéro de bon de livraison ne peut pas dépasser 100 caractères',
  })
  numeroBonLivraison?: string;

  @IsNumber()
  @Type(() => Number)
  @IsPositive({ message: 'Le montant total doit être positif' })
  @Min(0.01, { message: 'Le montant total doit être supérieur à 0' })
  @IsOptional()
  montantTotal?: number;

  @IsEnum(InvoiceStatus, {
    message: 'Le statut doit être NON_PAYE ou PAYE',
  })
  @IsOptional()
  status?: InvoiceStatus;

  @IsString()
  @MaxLength(50, {
    message: 'Le code du mouvement de stock ne peut pas dépasser 50 caractères',
  })
  @IsOptional()
  stockMovementCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  @IsOptional()
  items?: InvoiceItemDto[];

  @IsString()
  @IsUUID('4', { message: "L'ID du client doit être un UUID valide" })
  @IsOptional()
  clientId?: string;
}
