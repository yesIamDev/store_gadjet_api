import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from '../../articles/entities/article.entity';

export enum PendingArticleStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  PARTIELLEMENT_RECU = 'PARTIELLEMENT_RECU',
  RECU = 'RECU',
}

@Entity('pending_articles')
export class PendingArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id' })
  articleId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'int', name: 'quantite_attendue' })
  quantiteAttendue: number;

  @Column({ type: 'int', default: 0, name: 'quantite_recue' })
  quantiteRecue: number;

  @Column({ type: 'date', nullable: true, name: 'date_attendue' })
  dateAttendue: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'date_reception' })
  dateReception: Date | null;

  @Column({
    type: 'enum',
    enum: PendingArticleStatus,
    default: PendingArticleStatus.EN_ATTENTE,
  })
  status: PendingArticleStatus;

  @Column({ type: 'text', nullable: true, name: 'note' })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
