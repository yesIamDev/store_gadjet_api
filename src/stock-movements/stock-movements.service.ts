import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StockMovement, MovementType } from './entities/stock-movement.entity';
import { StockMovementItem } from './entities/stock-movement-item.entity';
import { Article } from '../articles/entities/article.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { LocationType } from './entities/location-type.enum';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(StockMovementItem)
    private readonly stockMovementItemRepository: Repository<StockMovementItem>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly dataSource: DataSource,
  ) {}

  private generateUniqueCode(): string {
    const prefix = 'MV-';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}-${random}`;
  }

  async create(
    createStockMovementDto: CreateStockMovementDto,
  ): Promise<StockMovementResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Générer un code unique
      let code = this.generateUniqueCode();
      let codeExists = await queryRunner.manager.findOne(StockMovement, {
        where: { code },
      });
      
      // Si le code existe déjà, en générer un nouveau (très rare)
      while (codeExists) {
        code = this.generateUniqueCode();
        codeExists = await queryRunner.manager.findOne(StockMovement, {
          where: { code },
        });
      }

      const stockMovement = queryRunner.manager.create(StockMovement, {
        code,
        type: createStockMovementDto.type,
        motif: createStockMovementDto.motif || null,
        items: [],
      });

      const savedMovement = await queryRunner.manager.save(stockMovement);

      for (const itemDto of createStockMovementDto.items) {
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: itemDto.articleId },
        });

        if (!article) {
          throw new NotFoundException(
            `Article avec l'ID ${itemDto.articleId} introuvable`,
          );
        }

        const stockDisponible =
          itemDto.emplacement === LocationType.MAGASIN
            ? article.quantiteMagasin
            : article.quantiteDepot;

        if (createStockMovementDto.type === MovementType.SORTIE) {
          if (stockDisponible < itemDto.quantite) {
            throw new BadRequestException(
              `Stock insuffisant pour l'article "${article.nom}" au ${itemDto.emplacement === LocationType.MAGASIN ? 'magasin' : 'dépôt'}. Stock disponible: ${stockDisponible}, demandé: ${itemDto.quantite}`,
            );
          }
        }

        const movementItem = queryRunner.manager.create(StockMovementItem, {
          movementId: savedMovement.id,
          articleId: itemDto.articleId,
          quantite: itemDto.quantite,
          emplacement: itemDto.emplacement,
        });

        await queryRunner.manager.save(movementItem);

        if (createStockMovementDto.type === MovementType.ENTREE) {
          if (itemDto.emplacement === LocationType.MAGASIN) {
            article.quantiteMagasin += itemDto.quantite;
          } else {
            article.quantiteDepot += itemDto.quantite;
          }
        } else {
          if (itemDto.emplacement === LocationType.MAGASIN) {
            article.quantiteMagasin -= itemDto.quantite;
          } else {
            article.quantiteDepot -= itemDto.quantite;
          }
        }

        article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
        await queryRunner.manager.save(article);
      }

      await queryRunner.commitTransaction();

      const movementWithItems = await this.stockMovementRepository.findOne({
        where: { id: savedMovement.id },
        relations: ['items', 'items.article'],
      });

      return new StockMovementResponseDto(movementWithItems);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<StockMovementResponseDto[]> {
    const movements = await this.stockMovementRepository.find({
      relations: ['items', 'items.article'],
      order: { createdAt: 'DESC' },
    });
    return movements.map(
      (movement) => new StockMovementResponseDto(movement),
    );
  }

  async findByArticle(articleId: string): Promise<StockMovementResponseDto[]> {
    const movements = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.items', 'item')
      .leftJoinAndSelect('item.article', 'article')
      .where('item.articleId = :articleId', { articleId })
      .orderBy('movement.createdAt', 'DESC')
      .getMany();

    return movements.map(
      (movement) => new StockMovementResponseDto(movement),
    );
  }

  async findOne(id: string): Promise<StockMovementResponseDto> {
    const movement = await this.stockMovementRepository.findOne({
      where: { id },
      relations: ['items', 'items.article'],
    });

    if (!movement) {
      throw new NotFoundException(
        `Mouvement de stock avec l'ID ${id} introuvable`,
      );
    }

    return new StockMovementResponseDto(movement);
  }

  async update(
    id: string,
    updateStockMovementDto: UpdateStockMovementDto,
  ): Promise<StockMovementResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const movement = await queryRunner.manager.findOne(StockMovement, {
        where: { id },
        relations: ['items', 'items.article'],
      });

      if (!movement) {
        throw new NotFoundException(
          `Mouvement de stock avec l'ID ${id} introuvable`,
        );
      }

      if (updateStockMovementDto.items) {
        for (const oldItem of movement.items) {
          const article = await queryRunner.manager.findOne(Article, {
            where: { id: oldItem.articleId },
          });

          if (article) {
            if (movement.type === MovementType.ENTREE) {
              if (oldItem.emplacement === LocationType.MAGASIN) {
                article.quantiteMagasin -= oldItem.quantite;
                if (article.quantiteMagasin < 0) {
                  article.quantiteMagasin = 0;
                }
              } else {
                article.quantiteDepot -= oldItem.quantite;
                if (article.quantiteDepot < 0) {
                  article.quantiteDepot = 0;
                }
              }
            } else {
              if (oldItem.emplacement === LocationType.MAGASIN) {
                article.quantiteMagasin += oldItem.quantite;
              } else {
                article.quantiteDepot += oldItem.quantite;
              }
            }
            article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
            await queryRunner.manager.save(article);
          }
        }

        await queryRunner.manager.remove(movement.items);

        for (const itemDto of updateStockMovementDto.items) {
          const article = await queryRunner.manager.findOne(Article, {
            where: { id: itemDto.articleId },
          });

          if (!article) {
            throw new NotFoundException(
              `Article avec l'ID ${itemDto.articleId} introuvable`,
            );
          }

          const newType = updateStockMovementDto.type ?? movement.type;
          const stockDisponible =
            itemDto.emplacement === LocationType.MAGASIN
              ? article.quantiteMagasin
              : article.quantiteDepot;

          if (newType === MovementType.SORTIE) {
            if (stockDisponible < itemDto.quantite) {
              throw new BadRequestException(
                `Stock insuffisant pour l'article "${article.nom}" au ${itemDto.emplacement === LocationType.MAGASIN ? 'magasin' : 'dépôt'}. Stock disponible: ${stockDisponible}, demandé: ${itemDto.quantite}`,
              );
            }
          }

          const movementItem = queryRunner.manager.create(StockMovementItem, {
            movementId: movement.id,
            articleId: itemDto.articleId,
            quantite: itemDto.quantite,
            emplacement: itemDto.emplacement,
          });

          await queryRunner.manager.save(movementItem);

          if (newType === MovementType.ENTREE) {
            if (itemDto.emplacement === LocationType.MAGASIN) {
              article.quantiteMagasin += itemDto.quantite;
            } else {
              article.quantiteDepot += itemDto.quantite;
            }
          } else {
            if (itemDto.emplacement === LocationType.MAGASIN) {
              article.quantiteMagasin -= itemDto.quantite;
            } else {
              article.quantiteDepot -= itemDto.quantite;
            }
          }

          article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
          await queryRunner.manager.save(article);
        }
      } else if (updateStockMovementDto.type) {
        const oldType = movement.type;
        const newType = updateStockMovementDto.type;

        if (oldType !== newType) {
          for (const item of movement.items) {
            const article = await queryRunner.manager.findOne(Article, {
              where: { id: item.articleId },
            });

            if (article) {
              const stockDisponible =
                item.emplacement === LocationType.MAGASIN
                  ? article.quantiteMagasin
                  : article.quantiteDepot;

              if (oldType === MovementType.ENTREE) {
                if (item.emplacement === LocationType.MAGASIN) {
                  article.quantiteMagasin -= item.quantite;
                  if (article.quantiteMagasin < 0) {
                    article.quantiteMagasin = 0;
                  }
                } else {
                  article.quantiteDepot -= item.quantite;
                  if (article.quantiteDepot < 0) {
                    article.quantiteDepot = 0;
                  }
                }
              } else {
                if (item.emplacement === LocationType.MAGASIN) {
                  article.quantiteMagasin += item.quantite;
                } else {
                  article.quantiteDepot += item.quantite;
                }
              }

              if (newType === MovementType.SORTIE) {
                const currentStock =
                  item.emplacement === LocationType.MAGASIN
                    ? article.quantiteMagasin
                    : article.quantiteDepot;
                if (currentStock < item.quantite) {
                  throw new BadRequestException(
                    `Stock insuffisant pour l'article "${article.nom}" au ${item.emplacement === LocationType.MAGASIN ? 'magasin' : 'dépôt'}. Stock disponible: ${currentStock}, demandé: ${item.quantite}`,
                  );
                }
              }

              if (newType === MovementType.ENTREE) {
                if (item.emplacement === LocationType.MAGASIN) {
                  article.quantiteMagasin += item.quantite;
                } else {
                  article.quantiteDepot += item.quantite;
                }
              } else {
                if (item.emplacement === LocationType.MAGASIN) {
                  article.quantiteMagasin -= item.quantite;
                } else {
                  article.quantiteDepot -= item.quantite;
                }
              }

              article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
              await queryRunner.manager.save(article);
            }
          }
        }
      }

      if (updateStockMovementDto.motif !== undefined) {
        movement.motif = updateStockMovementDto.motif || null;
      }

      if (updateStockMovementDto.type) {
        movement.type = updateStockMovementDto.type;
      }

      await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();

      const movementWithItems = await this.stockMovementRepository.findOne({
        where: { id: movement.id },
        relations: ['items', 'items.article'],
      });

      return new StockMovementResponseDto(movementWithItems);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const movement = await queryRunner.manager.findOne(StockMovement, {
        where: { id },
        relations: ['items', 'items.article'],
      });

      if (!movement) {
        throw new NotFoundException(
          `Mouvement de stock avec l'ID ${id} introuvable`,
        );
      }

      for (const item of movement.items) {
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: item.articleId },
        });

        if (article) {
          if (movement.type === MovementType.ENTREE) {
            if (item.emplacement === LocationType.MAGASIN) {
              article.quantiteMagasin -= item.quantite;
              if (article.quantiteMagasin < 0) {
                article.quantiteMagasin = 0;
              }
            } else {
              article.quantiteDepot -= item.quantite;
              if (article.quantiteDepot < 0) {
                article.quantiteDepot = 0;
              }
            }
          } else {
            if (item.emplacement === LocationType.MAGASIN) {
              article.quantiteMagasin += item.quantite;
            } else {
              article.quantiteDepot += item.quantite;
            }
          }

          article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
          await queryRunner.manager.save(article);
        }
      }

      await queryRunner.manager.remove(movement);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
