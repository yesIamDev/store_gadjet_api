import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PendingArticle, PendingArticleStatus } from './entities/pending-article.entity';
import { Article } from '../articles/entities/article.entity';
import { CreatePendingArticleDto } from './dto/create-pending-article.dto';
import { UpdatePendingArticleDto } from './dto/update-pending-article.dto';
import { ReceivePendingArticleDto } from './dto/receive-pending-article.dto';
import { PendingArticleResponseDto } from './dto/pending-article-response.dto';
import { StockMovement, MovementType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementItem } from '../stock-movements/entities/stock-movement-item.entity';
import { LocationType } from '../stock-movements/entities/location-type.enum';
import { StockMovementResponseDto } from '../stock-movements/dto/stock-movement-response.dto';
import { ArticleResponseDto } from '../articles/dto/article-response.dto';
import * as XLSX from 'xlsx';
import type { Express } from 'express';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PendingArticlesService {
  constructor(
    @InjectRepository(PendingArticle)
    private readonly pendingArticleRepository: Repository<PendingArticle>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(StockMovementItem)
    private readonly stockMovementItemRepository: Repository<StockMovementItem>,
    private readonly dataSource: DataSource,
  ) {}

  private generateUniqueCode(): string {
    const prefix = 'MV-';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}-${random}`;
  }

  private updateStatus(pendingArticle: PendingArticle): PendingArticleStatus {
    if (pendingArticle.quantiteRecue === 0) {
      return PendingArticleStatus.EN_ATTENTE;
    } else if (pendingArticle.quantiteRecue >= pendingArticle.quantiteAttendue) {
      // Si le statut passe à RECU et qu'il n'y a pas encore de date de réception, l'enregistrer
      if (pendingArticle.status !== PendingArticleStatus.RECU && !pendingArticle.dateReception) {
        pendingArticle.dateReception = new Date();
      }
      return PendingArticleStatus.RECU;
    } else {
      return PendingArticleStatus.PARTIELLEMENT_RECU;
    }
  }

  private mapToResponseDto(pendingArticle: PendingArticle): PendingArticleResponseDto {
    return plainToInstance(PendingArticleResponseDto, {
      id: pendingArticle.id,
      article: new ArticleResponseDto(pendingArticle.article),
      quantiteAttendue: pendingArticle.quantiteAttendue,
      quantiteRecue: pendingArticle.quantiteRecue,
      dateAttendue: pendingArticle.dateAttendue,
      status: pendingArticle.status,
      note: pendingArticle.note,
      createdAt: pendingArticle.createdAt,
      updatedAt: pendingArticle.updatedAt,
    });
  }

  async create(
    createPendingArticleDto: CreatePendingArticleDto,
  ): Promise<PendingArticleResponseDto> {
    const article = await this.articleRepository.findOne({
      where: { id: createPendingArticleDto.articleId },
    });

    if (!article) {
      throw new NotFoundException(
        `Article avec l'ID ${createPendingArticleDto.articleId} introuvable`,
      );
    }

    const pendingArticle = this.pendingArticleRepository.create({
      articleId: createPendingArticleDto.articleId,
      quantiteAttendue: createPendingArticleDto.quantiteAttendue,
      quantiteRecue: 0,
      dateAttendue: createPendingArticleDto.dateAttendue && createPendingArticleDto.dateAttendue.trim() !== ''
        ? new Date(createPendingArticleDto.dateAttendue)
        : null,
      note: createPendingArticleDto.note || null,
      status: PendingArticleStatus.EN_ATTENTE,
    });

    const saved = await this.pendingArticleRepository.save(pendingArticle);
    const withRelations = await this.pendingArticleRepository.findOne({
      where: { id: saved.id },
      relations: ['article'],
    });

    if (!withRelations) {
      throw new NotFoundException('Erreur lors de la création');
    }

    return this.mapToResponseDto(withRelations);
  }

  async findAll(): Promise<PendingArticleResponseDto[]> {
    const pendingArticles = await this.pendingArticleRepository.find({
      relations: ['article'],
      order: { createdAt: 'DESC' },
    });

    return pendingArticles.map((pa) => this.mapToResponseDto(pa));
  }

  async findOne(id: string): Promise<PendingArticleResponseDto> {
    const pendingArticle = await this.pendingArticleRepository.findOne({
      where: { id },
      relations: ['article'],
    });

    if (!pendingArticle) {
      throw new NotFoundException(
        `Article en attente avec l'ID ${id} introuvable`,
      );
    }

    return this.mapToResponseDto(pendingArticle);
  }

  async update(
    id: string,
    updatePendingArticleDto: UpdatePendingArticleDto,
  ): Promise<PendingArticleResponseDto> {
    const pendingArticle = await this.pendingArticleRepository.findOne({
      where: { id },
      relations: ['article'],
    });

    if (!pendingArticle) {
      throw new NotFoundException(
        `Article en attente avec l'ID ${id} introuvable`,
      );
    }

    if (updatePendingArticleDto.articleId) {
      const article = await this.articleRepository.findOne({
        where: { id: updatePendingArticleDto.articleId },
      });

      if (!article) {
        throw new NotFoundException(
          `Article avec l'ID ${updatePendingArticleDto.articleId} introuvable`,
        );
      }

      pendingArticle.articleId = updatePendingArticleDto.articleId;
    }

    if (updatePendingArticleDto.quantiteAttendue !== undefined) {
      if (updatePendingArticleDto.quantiteAttendue < pendingArticle.quantiteRecue) {
        throw new BadRequestException(
          `La quantité attendue (${updatePendingArticleDto.quantiteAttendue}) ne peut pas être inférieure à la quantité déjà reçue (${pendingArticle.quantiteRecue})`,
        );
      }
      pendingArticle.quantiteAttendue = updatePendingArticleDto.quantiteAttendue;
    }

    if (updatePendingArticleDto.dateAttendue !== undefined) {
      pendingArticle.dateAttendue = updatePendingArticleDto.dateAttendue && updatePendingArticleDto.dateAttendue.trim() !== ''
        ? new Date(updatePendingArticleDto.dateAttendue)
        : null;
    }

    if (updatePendingArticleDto.note !== undefined) {
      pendingArticle.note = updatePendingArticleDto.note || null;
    }

    pendingArticle.status = this.updateStatus(pendingArticle);

    const updated = await this.pendingArticleRepository.save(pendingArticle);
    const withRelations = await this.pendingArticleRepository.findOne({
      where: { id: updated.id },
      relations: ['article'],
    });

    if (!withRelations) {
      throw new NotFoundException('Erreur lors de la mise à jour');
    }

    return this.mapToResponseDto(withRelations);
  }

  async receive(
    id: string,
    receiveDto: ReceivePendingArticleDto,
  ): Promise<{ pendingArticle: PendingArticleResponseDto; stockMovement: any }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const pendingArticle = await queryRunner.manager.findOne(
        PendingArticle,
        {
          where: { id },
          relations: ['article'],
        },
      );

      if (!pendingArticle) {
        throw new NotFoundException(
          `Article en attente avec l'ID ${id} introuvable`,
        );
      }

      const quantiteRestante =
        pendingArticle.quantiteAttendue - pendingArticle.quantiteRecue;

      if (receiveDto.quantiteRecue > quantiteRestante) {
        throw new BadRequestException(
          `La quantité reçue (${receiveDto.quantiteRecue}) ne peut pas dépasser la quantité restante (${quantiteRestante})`,
        );
      }

      // Mettre à jour la quantité reçue
      pendingArticle.quantiteRecue += receiveDto.quantiteRecue;
      pendingArticle.status = this.updateStatus(pendingArticle);
      await queryRunner.manager.save(pendingArticle);

      // Créer un mouvement d'entrée
      let code = this.generateUniqueCode();
      let codeExists = await queryRunner.manager.findOne(StockMovement, {
        where: { code },
      });

      while (codeExists) {
        code = this.generateUniqueCode();
        codeExists = await queryRunner.manager.findOne(StockMovement, {
          where: { code },
        });
      }

      const stockMovement = queryRunner.manager.create(StockMovement, {
        code,
        type: MovementType.ENTREE,
        motif: receiveDto.motif || `Réception de ${receiveDto.quantiteRecue} unité(s) de ${pendingArticle.article.nom}`,
        items: [],
      });

      const savedMovement = await queryRunner.manager.save(stockMovement);

      const movementItem = queryRunner.manager.create(StockMovementItem, {
        movementId: savedMovement.id,
        articleId: pendingArticle.articleId,
        quantite: receiveDto.quantiteRecue,
        emplacement: receiveDto.emplacement,
      });

      await queryRunner.manager.save(movementItem);

      // Mettre à jour le stock de l'article
      const article = await queryRunner.manager.findOne(Article, {
        where: { id: pendingArticle.articleId },
      });

      if (!article) {
        throw new NotFoundException('Article introuvable');
      }

      if (receiveDto.emplacement === LocationType.MAGASIN) {
        article.quantiteMagasin += receiveDto.quantiteRecue;
      } else {
        article.quantiteDepot += receiveDto.quantiteRecue;
      }

      article.quantiteEnStock += receiveDto.quantiteRecue;
      await queryRunner.manager.save(article);

      await queryRunner.commitTransaction();

      const updatedPendingArticle = await this.pendingArticleRepository.findOne({
        where: { id },
        relations: ['article'],
      });

      const stockMovementWithItems = await this.stockMovementRepository.findOne({
        where: { id: savedMovement.id },
        relations: ['items', 'items.article'],
      });

      if (!stockMovementWithItems) {
        throw new NotFoundException('Erreur lors de la création du mouvement de stock');
      }

      return {
        pendingArticle: this.mapToResponseDto(updatedPendingArticle!),
        stockMovement: new StockMovementResponseDto(stockMovementWithItems),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const pendingArticle = await this.pendingArticleRepository.findOne({
      where: { id },
    });

    if (!pendingArticle) {
      throw new NotFoundException(
        `Article en attente avec l'ID ${id} introuvable`,
      );
    }

    await this.pendingArticleRepository.remove(pendingArticle);
  }

  async importFromExcel(
    file: any,
  ): Promise<{ created: number; updated: number }> {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const articleName = (row.article || row.ARTICLE || '').toString().trim();
        const quantiteAttendueRaw =
          row.quantiteAttendue || row.QUANTITE_ATTENDUE || row.quantite || row.QUANTITE;

        if (!articleName || !quantiteAttendueRaw) {
          continue;
        }

        const quantiteAttendue = Number(quantiteAttendueRaw);
        if (!quantiteAttendue || Number.isNaN(quantiteAttendue) || quantiteAttendue <= 0) {
          continue;
        }

        const dateAttendueRaw =
          row.dateAttendue || row.DATE_ATTENDUE || row.date || row.DATE;
        const note = row.note || row.NOTE || null;

        const article = await this.articleRepository.findOne({
          where: { nom: articleName },
        });

        if (!article) {
          // On ignore les lignes dont l'article n'existe pas
          continue;
        }

        // Chercher une file d'attente existante pour cet article encore en attente
        let pendingArticle = await this.pendingArticleRepository.findOne({
          where: {
            articleId: article.id,
            status: PendingArticleStatus.EN_ATTENTE,
          },
        });

        if (pendingArticle) {
          pendingArticle.quantiteAttendue += quantiteAttendue;
          if (dateAttendueRaw) {
            const parsed = new Date(dateAttendueRaw);
            if (!Number.isNaN(parsed.getTime())) {
              pendingArticle.dateAttendue = parsed;
            }
          }
          if (note) {
            pendingArticle.note = note;
          }
          pendingArticle.status = this.updateStatus(pendingArticle);
          await this.pendingArticleRepository.save(pendingArticle);
          updated++;
        } else {
          const newPending = this.pendingArticleRepository.create({
            articleId: article.id,
            quantiteAttendue,
            quantiteRecue: 0,
            dateAttendue:
              dateAttendueRaw && dateAttendueRaw.toString().trim() !== ''
                ? new Date(dateAttendueRaw)
                : null,
            note: note || null,
            status: PendingArticleStatus.EN_ATTENTE,
          });
          await this.pendingArticleRepository.save(newPending);
          created++;
        }
      }

      if (created === 0 && updated === 0) {
        throw new BadRequestException(
          'Aucune ligne valide trouvée dans le fichier Excel',
        );
      }

      return { created, updated };
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors du traitement du fichier Excel',
      );
    }
  }
}
