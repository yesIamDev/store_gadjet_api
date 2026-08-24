import { Expose, Type } from 'class-transformer';
import { MovementType, LoanStatus } from '../entities/stock-movement.entity';
import { StockMovementItemResponseDto } from './stock-movement-item-response.dto';
import { ClientResponseDto } from '../../clients/dto/client-response.dto';

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
  clientId: string | null;

  @Expose()
  @Type(() => ClientResponseDto)
  client: ClientResponseDto | null;

  @Expose()
  loanStatus: LoanStatus | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<StockMovementResponseDto>) {
    Object.assign(this, partial);
  }
}
