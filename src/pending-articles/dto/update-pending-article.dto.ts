import {
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  IsDateString,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePendingArticleDto {
  @IsOptional()
  @IsUUID('4', { message: "L'ID de l'article doit être un UUID valide" })
  articleId?: string;

  @IsOptional()
  @IsInt({ message: 'La quantité attendue doit être un nombre entier' })
  @Min(1, { message: 'La quantité attendue doit être supérieure à 0' })
  quantiteAttendue?: number;

  @IsOptional()
  @ValidateIf((o) => o.dateAttendue !== '' && o.dateAttendue !== null && o.dateAttendue !== undefined)
  @IsDateString({}, { message: 'La date attendue doit être une date valide' })
  dateAttendue?: string;

  @IsOptional()
  @IsString({ message: 'La note doit être une chaîne de caractères' })
  @MaxLength(1000, { message: 'La note ne peut pas dépasser 1000 caractères' })
  note?: string;
}
