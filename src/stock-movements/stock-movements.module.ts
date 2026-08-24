import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementItem } from './entities/stock-movement-item.entity';
import { Article } from '../articles/entities/article.entity';
import { Client } from '../clients/entities/client.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { Payment } from '../invoices/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockMovement,
      StockMovementItem,
      Article,
      Client,
      Invoice,
      InvoiceItem,
      Payment,
    ]),
  ],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
