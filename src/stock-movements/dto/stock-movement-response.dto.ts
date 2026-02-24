import { Expose, Type } from 'class-transformer';
import { MovementType } from '../entities/stock-movement.entity';
import { StockMovementItemResponseDto } from './stock-movement-item-response.dto';

export class StockMovementResponseDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  @Type(() => StockMovementItemResponseDto)
  items: StockMovementItemResponseDto[];

  @Expose()
  type: MovementType;

  @Expose()
  motif: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<StockMovementResponseDto>) {
    Object.assign(this, partial);
  }
}
