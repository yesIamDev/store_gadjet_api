import { Expose, Type } from 'class-transformer';
import { PendingArticleStatus } from '../entities/pending-article.entity';
import { ArticleResponseDto } from '../../articles/dto/article-response.dto';

export class PendingArticleResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => ArticleResponseDto)
  article: ArticleResponseDto;

  @Expose()
  quantiteAttendue: number;

  @Expose()
  quantiteRecue: number;

  @Expose()
  dateAttendue: Date | null;

  @Expose()
  dateReception: Date | null;

  @Expose()
  status: PendingArticleStatus;

  @Expose()
  note: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<PendingArticleResponseDto>) {
    Object.assign(this, partial);
  }
}
