import { Expose, Type } from 'class-transformer';
import { InvoiceStatus } from '../entities/invoice.entity';
import { StockMovementResponseDto } from '../../stock-movements/dto/stock-movement-response.dto';
import { ClientResponseDto } from '../../clients/dto/client-response.dto';
import { InvoiceItemResponseDto } from './invoice-item-response.dto';
import { PaymentResponseDto } from './payment-response.dto';

export class InvoiceResponseDto {
  @Expose()
  id: string;

  @Expose()
  numeroFacture: string;

  @Expose()
  numeroBonLivraison: string | null;

  @Expose()
  montantTotal: number;

  @Expose()
  status: InvoiceStatus;

  @Expose()
  @Type(() => StockMovementResponseDto)
  stockMovement: StockMovementResponseDto | null;

  @Expose()
  @Type(() => InvoiceItemResponseDto)
  items: InvoiceItemResponseDto[];

  @Expose()
  @Type(() => PaymentResponseDto)
  payments: PaymentResponseDto[];

  @Expose()
  montantPaye: number;

  @Expose()
  montantRestant: number;

  @Expose()
  @Type(() => ClientResponseDto)
  client: ClientResponseDto | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<InvoiceResponseDto>) {
    Object.assign(this, partial);
    // Initialiser les valeurs par défaut
    if (!this.items) {
      this.items = [];
    }
    if (!this.payments) {
      this.payments = [];
    }
    if (this.montantPaye === undefined) {
      this.montantPaye = 0;
    }
    if (this.montantRestant === undefined) {
      this.montantRestant = this.montantTotal || 0;
    }
  }
}
