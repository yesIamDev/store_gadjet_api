import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { Article } from '../../articles/entities/article.entity';
import { LocationType } from './location-type.enum';

@Entity('stock_movement_items')
export class StockMovementItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => StockMovement, (movement) => movement.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'movement_id' })
  movement: StockMovement;

  @Column({ name: 'movement_id' })
  movementId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'article_id' })
  articleId: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({
    type: 'enum',
    enum: LocationType,
    default: LocationType.MAGASIN,
    name: 'emplacement',
  })
  emplacement: LocationType;
}
