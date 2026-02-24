import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ClientType } from '../entities/client.entity';

export class CreateClientDto {
  @IsEnum(ClientType, {
    message: 'Le type doit être INDIVIDU ou ENTREPRISE',
  })
  type: ClientType;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @MinLength(1, { message: 'Le numéro de téléphone est requis' })
  @MaxLength(20, {
    message: 'Le téléphone ne peut pas dépasser 20 caractères',
  })
  telephone: string;

  // Pour ENTREPRISE uniquement - requis si type est ENTREPRISE
  @IsString()
  @ValidateIf((o) => o.type === ClientType.ENTREPRISE)
  @IsNotEmpty({
    message: 'Le nom de la personne de référence est requis pour les entreprises',
  })
  @MinLength(1, {
    message: 'Le nom de la personne de référence est requis pour les entreprises',
  })
  @MaxLength(255, {
    message: 'Le nom de la personne de référence ne peut pas dépasser 255 caractères',
  })
  nomPersonneReference?: string;
}
