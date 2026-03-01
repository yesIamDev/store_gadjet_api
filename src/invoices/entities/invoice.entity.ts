import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';
import { Client } from '../../clients/entities/client.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Payment } from './payment.entity';

export enum InvoiceStatus {
  NON_PAYE = 'NON_PAYE',
  PAYE = 'PAYE',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: false, nullable: true, name: 'numero_facture' })
  numeroFacture: string | null;

  @Column({ length: 100, nullable: true, name: 'numero_bon_livraison' })
  numeroBonLivraison: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'montant_total',
  })
  montantTotal: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.NON_PAYE,
  })
  status: InvoiceStatus;

  @Column({ name: 'stock_movement_id', nullable: true })
  stockMovementId: string | null;

  @ManyToOne(() => StockMovement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'stock_movement_id' })
  stockMovement: StockMovement | null;

  @OneToMany(() => InvoiceItem, (invoiceItem) => invoiceItem.invoice, {
    cascade: true,
  })
  items: InvoiceItem[];

  @OneToMany(() => Payment, (payment) => payment.invoice, {
    cascade: true,
  })
  payments: Payment[];

  @Column({ name: 'client_id', nullable: true })
  clientId: string | null;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
