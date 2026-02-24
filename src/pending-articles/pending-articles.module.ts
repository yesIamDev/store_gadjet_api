import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PendingArticlesService } from './pending-articles.service';
import { PendingArticlesController } from './pending-articles.controller';
import { PendingArticle } from './entities/pending-article.entity';
import { Article } from '../articles/entities/article.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementItem } from '../stock-movements/entities/stock-movement-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PendingArticle,
      Article,
      StockMovement,
      StockMovementItem,
    ]),
  ],
  controllers: [PendingArticlesController],
  providers: [PendingArticlesService],
  exports: [PendingArticlesService],
})
export class PendingArticlesModule {}
