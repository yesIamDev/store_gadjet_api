import { Expose } from 'class-transformer';

export class PaymentResponseDto {
  @Expose()
  id: string;

  @Expose()
  montant: number;

  @Expose()
  note: string | null;

  @Expose()
  invoiceId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<PaymentResponseDto>) {
    Object.assign(this, partial);
  }
}
