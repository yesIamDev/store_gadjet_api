import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  async create(createArticleDto: CreateArticleDto): Promise<ArticleResponseDto> {
    const existingArticle = await this.articleRepository.findOne({
      where: { nom: createArticleDto.nom },
    });

    if (existingArticle) {
      throw new ConflictException(
        'Un article avec ce nom existe déjà',
      );
    }

    const quantiteEnStock =
      (createArticleDto.quantiteMagasin || 0) + (createArticleDto.quantiteDepot || 0);

    const article = this.articleRepository.create({
      ...createArticleDto,
      quantiteEnStock,
    });
    const savedArticle = await this.articleRepository.save(article);
    return new ArticleResponseDto(savedArticle);
  }

  async findAll(): Promise<ArticleResponseDto[]> {
    const articles = await this.articleRepository.find({
      order: { createdAt: 'DESC' },
    });
    return articles.map((article) => new ArticleResponseDto(article));
  }

  async findOne(id: string): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }

    return new ArticleResponseDto(article);
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }

    if (updateArticleDto.nom && updateArticleDto.nom !== article.nom) {
      const existingArticle = await this.articleRepository.findOne({
        where: { nom: updateArticleDto.nom },
      });

      if (existingArticle) {
        throw new ConflictException('Un article avec ce nom existe déjà');
      }
    }

    Object.assign(article, updateArticleDto);

    if (
      updateArticleDto.quantiteMagasin !== undefined ||
      updateArticleDto.quantiteDepot !== undefined
    ) {
      const quantiteMagasin =
        updateArticleDto.quantiteMagasin !== undefined
          ? updateArticleDto.quantiteMagasin
          : article.quantiteMagasin;
      const quantiteDepot =
        updateArticleDto.quantiteDepot !== undefined
          ? updateArticleDto.quantiteDepot
          : article.quantiteDepot;
      article.quantiteEnStock = quantiteMagasin + quantiteDepot;
    }

    const updatedArticle = await this.articleRepository.save(article);
    return new ArticleResponseDto(updatedArticle);
  }

  async remove(id: string): Promise<void> {
    const article = await this.articleRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }

    await this.articleRepository.remove(article);
  }
}
