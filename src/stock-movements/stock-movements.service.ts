import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  StockMovement,
  MovementType,
  LoanStatus,
} from './entities/stock-movement.entity';
import { StockMovementItem } from './entities/stock-movement-item.entity';
import { Article } from '../articles/entities/article.entity';
import { Client, ClientType } from '../clients/entities/client.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { Payment } from '../invoices/entities/payment.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { LocationType } from './entities/location-type.enum';

const LEGACY_TYPES = [MovementType.ENTREE, MovementType.SORTIE];
const CLIENT_REQUIRED_TYPES = [
  MovementType.VENTE_CREDIT,
  MovementType.PRET_REVENDEUR,
];
const SALE_TYPES = [MovementType.VENTE_RAPIDE, MovementType.VENTE_CREDIT];

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

  /**
   * Détermine l'emplacement à enregistrer sur l'item pour affichage.
   * Pour ENTREE/SORTIE, c'est l'emplacement choisi par l'utilisateur (requis).
   * Pour les types métier, il est dérivé automatiquement du type de mouvement.
   */
  private resolveDisplayLocation(
    type: MovementType,
    emplacement?: LocationType,
  ): LocationType {
    switch (type) {
      case MovementType.ENTREE:
      case MovementType.SORTIE:
        if (!emplacement) {
          throw new BadRequestException(
            "L'emplacement est requis pour ce type de mouvement",
          );
        }
        return emplacement;
      case MovementType.APPROVISIONNEMENT:
        return LocationType.DEPOT;
      default:
        // RENFORCEMENT, VENTE_RAPIDE, VENTE_CREDIT, PRET_REVENDEUR
        return LocationType.MAGASIN;
    }
  }

  /** Stock disponible avant mutation, ou null si aucune vérification n'est nécessaire. */
  private getAvailableStock(
    article: Article,
    type: MovementType,
    emplacement?: LocationType,
  ): number | null {
    switch (type) {
      case MovementType.SORTIE:
        return emplacement === LocationType.DEPOT
          ? article.quantiteDepot
          : article.quantiteMagasin;
      case MovementType.RENFORCEMENT:
        return article.quantiteDepot;
      case MovementType.VENTE_RAPIDE:
      case MovementType.VENTE_CREDIT:
      case MovementType.PRET_REVENDEUR:
        return article.quantiteMagasin;
      default:
        // ENTREE, APPROVISIONNEMENT : toujours autorisés
        return null;
    }
  }

  private applyItemEffect(
    article: Article,
    type: MovementType,
    quantite: number,
    emplacement?: LocationType,
  ): void {
    switch (type) {
      case MovementType.ENTREE:
        if (emplacement === LocationType.DEPOT) {
          article.quantiteDepot += quantite;
        } else {
          article.quantiteMagasin += quantite;
        }
        break;
      case MovementType.SORTIE:
        if (emplacement === LocationType.DEPOT) {
          article.quantiteDepot -= quantite;
        } else {
          article.quantiteMagasin -= quantite;
        }
        break;
      case MovementType.RENFORCEMENT:
        article.quantiteDepot -= quantite;
        article.quantiteMagasin += quantite;
        break;
      case MovementType.VENTE_RAPIDE:
      case MovementType.VENTE_CREDIT:
      case MovementType.PRET_REVENDEUR:
        article.quantiteMagasin -= quantite;
        break;
      case MovementType.APPROVISIONNEMENT:
        article.quantiteDepot += quantite;
        break;
    }
    article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
  }

  private reverseItemEffect(
    article: Article,
    type: MovementType,
    quantite: number,
    emplacement?: LocationType,
  ): void {
    switch (type) {
      case MovementType.ENTREE:
        if (emplacement === LocationType.DEPOT) {
          article.quantiteDepot -= quantite;
        } else {
          article.quantiteMagasin -= quantite;
        }
        break;
      case MovementType.SORTIE:
        if (emplacement === LocationType.DEPOT) {
          article.quantiteDepot += quantite;
        } else {
          article.quantiteMagasin += quantite;
        }
        break;
      case MovementType.RENFORCEMENT:
        article.quantiteDepot += quantite;
        article.quantiteMagasin -= quantite;
        break;
      case MovementType.VENTE_RAPIDE:
      case MovementType.VENTE_CREDIT:
      case MovementType.PRET_REVENDEUR:
        article.quantiteMagasin += quantite;
        break;
      case MovementType.APPROVISIONNEMENT:
        article.quantiteDepot -= quantite;
        break;
    }
    article.quantiteMagasin = Math.max(0, article.quantiteMagasin);
    article.quantiteDepot = Math.max(0, article.quantiteDepot);
    article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
  }

  private async validateClientForType(
    manager: DataSource['manager'],
    type: MovementType,
    clientId?: string,
  ): Promise<Client | null> {
    const requiresClient = CLIENT_REQUIRED_TYPES.includes(type);

    if (!clientId) {
      if (requiresClient) {
        throw new BadRequestException(
          'Le client est requis pour ce type de mouvement',
        );
      }
      return null;
    }

    const client = await manager.findOne(Client, { where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${clientId} introuvable`);
    }

    if (type === MovementType.PRET_REVENDEUR && client.type !== ClientType.REVENDEUR) {
      throw new BadRequestException(
        'Le client doit être de type revendeur pour un prêt',
      );
    }

    return client;
  }

  private async createInvoiceForSale(
    manager: DataSource['manager'],
    movement: StockMovement,
    items: { article: Article; quantite: number }[],
    client: Client | null,
    type: MovementType,
  ): Promise<void> {
    let montantTotal = 0;
    for (const { article, quantite } of items) {
      if (article.prixDeVente !== null && article.prixDeVente !== undefined) {
        montantTotal += Number(article.prixDeVente) * quantite;
      }
    }

    const invoice = manager.create(Invoice, {
      numeroFacture: null,
      numeroBonLivraison: null,
      montantTotal,
      status: InvoiceStatus.NON_PAYE,
      stockMovementId: movement.id,
      clientId: client?.id ?? null,
      items: [],
    });
    const savedInvoice = await manager.save(invoice);

    if (type === MovementType.VENTE_RAPIDE) {
      if (montantTotal > 0) {
        const payment = manager.create(Payment, {
          montant: montantTotal,
          note: 'Paiement comptant (vente rapide)',
          invoiceId: savedInvoice.id,
        });
        await manager.save(payment);
      }
      savedInvoice.status = InvoiceStatus.PAYE;
      await manager.save(savedInvoice);
    }
  }

  async create(
    createStockMovementDto: CreateStockMovementDto,
  ): Promise<StockMovementResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const type = createStockMovementDto.type;

      // Générer un code unique
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

      const client = await this.validateClientForType(
        queryRunner.manager,
        type,
        createStockMovementDto.clientId,
      );

      const stockMovement = queryRunner.manager.create(StockMovement, {
        code,
        type,
        motif: createStockMovementDto.motif || null,
        clientId: client?.id ?? null,
        loanStatus: type === MovementType.PRET_REVENDEUR ? LoanStatus.EN_COURS : null,
        items: [],
      });

      const savedMovement = await queryRunner.manager.save(stockMovement);

      const itemsForInvoice: { article: Article; quantite: number }[] = [];

      for (const itemDto of createStockMovementDto.items) {
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: itemDto.articleId },
        });

        if (!article) {
          throw new NotFoundException(
            `Article avec l'ID ${itemDto.articleId} introuvable`,
          );
        }

        const displayLocation = this.resolveDisplayLocation(
          type,
          itemDto.emplacement,
        );

        const available = this.getAvailableStock(article, type, displayLocation);
        if (available !== null && available < itemDto.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour l'article "${article.nom}" au ${displayLocation === LocationType.MAGASIN ? 'magasin' : 'dépôt'}. Stock disponible: ${available}, demandé: ${itemDto.quantite}`,
          );
        }

        const movementItem = queryRunner.manager.create(StockMovementItem, {
          movementId: savedMovement.id,
          articleId: itemDto.articleId,
          quantite: itemDto.quantite,
          emplacement: displayLocation,
        });

        await queryRunner.manager.save(movementItem);

        this.applyItemEffect(article, type, itemDto.quantite, displayLocation);
        await queryRunner.manager.save(article);

        itemsForInvoice.push({ article, quantite: itemDto.quantite });
      }

      if (SALE_TYPES.includes(type)) {
        await this.createInvoiceForSale(
          queryRunner.manager,
          savedMovement,
          itemsForInvoice,
          client,
          type,
        );
      }

      await queryRunner.commitTransaction();

      const movementWithItems = await this.stockMovementRepository.findOne({
        where: { id: savedMovement.id },
        relations: ['items', 'items.article', 'client'],
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
      relations: ['items', 'items.article', 'client'],
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
      .leftJoinAndSelect('movement.client', 'client')
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
      relations: ['items', 'items.article', 'client'],
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

      const isLegacyType = LEGACY_TYPES.includes(movement.type);
      const wantsTypeChange =
        updateStockMovementDto.type !== undefined &&
        updateStockMovementDto.type !== movement.type;
      const wantsItemsChange = updateStockMovementDto.items !== undefined;

      if (!isLegacyType && (wantsTypeChange || wantsItemsChange)) {
        throw new BadRequestException(
          "Seul le motif peut être modifié pour ce type de mouvement. Supprimez et recréez le mouvement si besoin.",
        );
      }

      if (
        wantsTypeChange &&
        !LEGACY_TYPES.includes(updateStockMovementDto.type as MovementType)
      ) {
        throw new BadRequestException(
          'Le changement de type de mouvement est limité à ENTREE/SORTIE. Supprimez et recréez le mouvement pour un autre type.',
        );
      }

      if (wantsItemsChange) {
        for (const oldItem of movement.items) {
          const article = await queryRunner.manager.findOne(Article, {
            where: { id: oldItem.articleId },
          });

          if (article) {
            this.reverseItemEffect(
              article,
              movement.type,
              oldItem.quantite,
              oldItem.emplacement,
            );
            await queryRunner.manager.save(article);
          }
        }

        await queryRunner.manager.remove(movement.items);

        const newType = updateStockMovementDto.type ?? movement.type;

        for (const itemDto of updateStockMovementDto.items!) {
          const article = await queryRunner.manager.findOne(Article, {
            where: { id: itemDto.articleId },
          });

          if (!article) {
            throw new NotFoundException(
              `Article avec l'ID ${itemDto.articleId} introuvable`,
            );
          }

          const displayLocation = this.resolveDisplayLocation(
            newType,
            itemDto.emplacement,
          );

          const available = this.getAvailableStock(article, newType, displayLocation);
          if (available !== null && available < itemDto.quantite) {
            throw new BadRequestException(
              `Stock insuffisant pour l'article "${article.nom}" au ${displayLocation === LocationType.MAGASIN ? 'magasin' : 'dépôt'}. Stock disponible: ${available}, demandé: ${itemDto.quantite}`,
            );
          }

          const movementItem = queryRunner.manager.create(StockMovementItem, {
            movementId: movement.id,
            articleId: itemDto.articleId,
            quantite: itemDto.quantite,
            emplacement: displayLocation,
          });

          await queryRunner.manager.save(movementItem);

          this.applyItemEffect(article, newType, itemDto.quantite, displayLocation);
          await queryRunner.manager.save(article);
        }
      } else if (wantsTypeChange) {
        const newType = updateStockMovementDto.type as MovementType;

        for (const item of movement.items) {
          const article = await queryRunner.manager.findOne(Article, {
            where: { id: item.articleId },
          });

          if (article) {
            this.reverseItemEffect(article, movement.type, item.quantite, item.emplacement);

            const available = this.getAvailableStock(article, newType, item.emplacement);
            if (available !== null && available < item.quantite) {
              throw new BadRequestException(
                `Stock insuffisant pour l'article "${article.nom}" au ${item.emplacement === LocationType.MAGASIN ? 'magasin' : 'dépôt'}. Stock disponible: ${available}, demandé: ${item.quantite}`,
              );
            }

            this.applyItemEffect(article, newType, item.quantite, item.emplacement);
            await queryRunner.manager.save(article);
          }
        }
      }

      if (updateStockMovementDto.motif !== undefined) {
        movement.motif = updateStockMovementDto.motif || null;
      }

      if (wantsTypeChange) {
        movement.type = updateStockMovementDto.type as MovementType;
      }

      await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();

      const movementWithItems = await this.stockMovementRepository.findOne({
        where: { id: movement.id },
        relations: ['items', 'items.article', 'client'],
      });

      return new StockMovementResponseDto(movementWithItems);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async returnLoanItems(
    id: string,
    returnLoanDto: ReturnLoanDto,
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

      if (movement.type !== MovementType.PRET_REVENDEUR) {
        throw new BadRequestException(
          'Seuls les mouvements de type PRET_REVENDEUR peuvent faire l\'objet d\'un retour',
        );
      }

      for (const returnDto of returnLoanDto.items) {
        const item = movement.items.find((i) => i.id === returnDto.itemId);
        if (!item) {
          throw new NotFoundException(
            `Article de prêt avec l'ID ${returnDto.itemId} introuvable sur ce mouvement`,
          );
        }

        const remaining = item.quantite - item.quantiteRetournee;
        if (returnDto.quantite > remaining) {
          throw new BadRequestException(
            `Quantité retournée (${returnDto.quantite}) supérieure à la quantité restante prêtée (${remaining}) pour "${item.article.nom}"`,
          );
        }

        const article = await queryRunner.manager.findOne(Article, {
          where: { id: item.articleId },
        });

        if (article) {
          article.quantiteMagasin += returnDto.quantite;
          article.quantiteEnStock = article.quantiteMagasin + article.quantiteDepot;
          await queryRunner.manager.save(article);
        }

        item.quantiteRetournee += returnDto.quantite;
        await queryRunner.manager.save(item);
      }

      const totalQuantite = movement.items.reduce((sum, i) => sum + i.quantite, 0);
      const totalRetournee = movement.items.reduce(
        (sum, i) => sum + i.quantiteRetournee,
        0,
      );

      movement.loanStatus =
        totalRetournee >= totalQuantite
          ? LoanStatus.RETOURNE
          : totalRetournee > 0
            ? LoanStatus.PARTIELLEMENT_RETOURNE
            : LoanStatus.EN_COURS;

      await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();

      const movementWithItems = await this.stockMovementRepository.findOne({
        where: { id: movement.id },
        relations: ['items', 'items.article', 'client'],
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
          const quantiteAReverser =
            movement.type === MovementType.PRET_REVENDEUR
              ? item.quantite - item.quantiteRetournee
              : item.quantite;

          if (quantiteAReverser > 0) {
            this.reverseItemEffect(
              article,
              movement.type,
              quantiteAReverser,
              item.emplacement,
            );
            await queryRunner.manager.save(article);
          }
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
