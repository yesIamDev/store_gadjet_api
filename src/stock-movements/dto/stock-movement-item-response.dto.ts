import { Exclude, Expose, Type } from 'class-transformer';
import { ArticleResponseDto } from '../../articles/dto/article-response.dto';
import { LocationType } from '../entities/location-type.enum';

export class StockMovementItemResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => ArticleResponseDto)
  article: ArticleResponseDto;

  @Expose()
  quantite: number;

  @Expose()
  emplacement: LocationType;

  @Expose()
  quantiteRetournee: number;

  @Exclude()
  movementId: string;

  constructor(partial: Partial<StockMovementItemResponseDto>) {
    Object.assign(this, partial);
  }
}
