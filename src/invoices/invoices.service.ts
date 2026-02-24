import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { StockMovement, MovementType } from '../stock-movements/entities/stock-movement.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { InvoiceItemResponseDto } from './dto/invoice-item-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    // 1. Vérifier l'unicité du numéro de facture
    const existingInvoice = await this.invoiceRepository.findOne({
      where: { numeroFacture: createInvoiceDto.numeroFacture },
    });
    if (existingInvoice) {
      throw new ConflictException('Une facture avec ce numéro existe déjà');
    }

    // 2. Vérifier le client si fourni
    let clientId: string | null = null;
    if (createInvoiceDto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: createInvoiceDto.clientId },
      });
      if (!client) {
        throw new NotFoundException(`Client avec l'ID ${createInvoiceDto.clientId} introuvable`);
      }
      clientId = client.id;
    }

    // 3. Traiter le mouvement de stock si fourni
    let stockMovement: StockMovement | null = null;
    let montantFromMovement = 0;
    
    if (createInvoiceDto.stockMovementCode?.trim()) {
      stockMovement = await this.stockMovementRepository.findOne({
        where: { code: createInvoiceDto.stockMovementCode.trim() },
        relations: ['items', 'items.article'],
      });

      if (!stockMovement) {
        throw new NotFoundException(
          `Mouvement de stock avec le code ${createInvoiceDto.stockMovementCode} introuvable`
        );
      }

      if (stockMovement.type !== MovementType.SORTIE) {
        throw new BadRequestException(
          'Une facture ne peut être associée qu\'à un mouvement de stock de type SORTIE'
        );
      }

      // Vérifier que le mouvement n'est pas déjà associé à une facture
      const existingInvoiceForMovement = await this.invoiceRepository.findOne({
        where: { stockMovementId: stockMovement.id },
      });
      if (existingInvoiceForMovement) {
        throw new ConflictException('Ce mouvement de stock est déjà associé à une facture');
      }

      // Calculer le montant du mouvement
      for (const item of stockMovement.items) {
        const prixUnitaire = typeof item.article.prixDeVente === 'string' 
          ? parseFloat(item.article.prixDeVente) 
          : item.article.prixDeVente;
        montantFromMovement += prixUnitaire * item.quantite;
      }
    }

    // 4. Traiter les articles libres si fournis
    let invoiceItems: InvoiceItem[] = [];
    let montantFromItems = 0;
    
    if (createInvoiceDto.items && createInvoiceDto.items.length > 0) {
      invoiceItems = createInvoiceDto.items.map((itemDto) => {
        const prixUnitaire = Number(itemDto.prixUnitaire) || 0;
        const quantite = Number(itemDto.quantite) || 0;
        montantFromItems += prixUnitaire * quantite;
        
        return this.invoiceItemRepository.create({
          nom: itemDto.nom.trim(),
          description: itemDto.description?.trim() || null,
          prixUnitaire,
          quantite,
        });
      });
    }

    // 5. Vérifier qu'on a au moins une source d'articles
    if (!stockMovement && invoiceItems.length === 0) {
      throw new BadRequestException(
        'Un code de mouvement de stock ou des articles libres sont requis'
      );
    }

    // 6. Calculer le montant total
    const montantTotal = createInvoiceDto.montantTotal && createInvoiceDto.montantTotal > 0
      ? createInvoiceDto.montantTotal
      : montantFromMovement + montantFromItems;

    if (montantTotal <= 0) {
      throw new BadRequestException('Le montant total de la facture doit être supérieur à 0');
    }

    // 7. Créer la facture
    const invoice = this.invoiceRepository.create({
      numeroFacture: createInvoiceDto.numeroFacture,
      numeroBonLivraison: createInvoiceDto.numeroBonLivraison?.trim() || null,
      montantTotal,
      status: createInvoiceDto.status || InvoiceStatus.NON_PAYE,
      stockMovementId: stockMovement?.id || null,
      clientId,
      items: invoiceItems,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // 8. Charger les relations et retourner
    const invoiceWithRelations = await this.invoiceRepository.findOne({
      where: { id: savedInvoice.id },
      relations: [
        'stockMovement',
        'stockMovement.items',
        'stockMovement.items.article',
        'client',
        'items',
        'payments',
      ],
    });

    if (!invoiceWithRelations) {
      throw new NotFoundException('Erreur lors de la création de la facture');
    }

    return this.mapToResponseDto(invoiceWithRelations);
  }

  async findAll(): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoiceRepository.find({
      relations: [
        'stockMovement',
        'stockMovement.items',
        'stockMovement.items.article',
        'client',
        'items',
        'payments',
      ],
      order: { createdAt: 'DESC' },
    });

    return invoices.map((invoice) => this.mapToResponseDto(invoice));
  }

  async findOne(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: [
        'stockMovement',
        'stockMovement.items',
        'stockMovement.items.article',
        'client',
        'items',
        'payments',
      ],
    });

    if (!invoice) {
      throw new NotFoundException(`Facture avec l'ID ${id} introuvable`);
    }

    return this.mapToResponseDto(invoice);
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['stockMovement', 'items', 'client', 'payments'],
    });

    if (!invoice) {
      throw new NotFoundException(`Facture avec l'ID ${id} introuvable`);
    }

    // Vérifier l'unicité du numéro de facture si modifié
    if (
      updateInvoiceDto.numeroFacture &&
      updateInvoiceDto.numeroFacture !== invoice.numeroFacture
    ) {
      const existingInvoice = await this.invoiceRepository.findOne({
        where: { numeroFacture: updateInvoiceDto.numeroFacture },
      });
      if (existingInvoice) {
        throw new ConflictException('Une facture avec ce numéro existe déjà');
      }
      invoice.numeroFacture = updateInvoiceDto.numeroFacture;
    }

    // Mettre à jour les champs simples
    if (updateInvoiceDto.numeroBonLivraison !== undefined) {
      invoice.numeroBonLivraison = updateInvoiceDto.numeroBonLivraison?.trim() || null;
    }

    // Mettre à jour le client si fourni
    if (updateInvoiceDto.clientId !== undefined) {
      if (updateInvoiceDto.clientId) {
        const client = await this.clientRepository.findOne({
          where: { id: updateInvoiceDto.clientId },
        });
        if (!client) {
          throw new NotFoundException(`Client avec l'ID ${updateInvoiceDto.clientId} introuvable`);
        }
        invoice.clientId = client.id;
      } else {
        invoice.clientId = null;
      }
    }

    // Mettre à jour le mouvement de stock si fourni
    if (updateInvoiceDto.stockMovementCode !== undefined) {
      if (updateInvoiceDto.stockMovementCode?.trim()) {
        const stockMovement = await this.stockMovementRepository.findOne({
          where: { code: updateInvoiceDto.stockMovementCode.trim() },
          relations: ['items', 'items.article'],
        });

        if (!stockMovement) {
          throw new NotFoundException(
            `Mouvement de stock avec le code ${updateInvoiceDto.stockMovementCode} introuvable`
          );
        }

        if (stockMovement.type !== MovementType.SORTIE) {
          throw new BadRequestException(
            'Une facture ne peut être associée qu\'à un mouvement de stock de type SORTIE'
          );
        }

        // Vérifier que le nouveau mouvement n'est pas déjà associé à une autre facture
        const existingInvoiceForMovement = await this.invoiceRepository.findOne({
          where: { stockMovementId: stockMovement.id },
        });
        if (existingInvoiceForMovement && existingInvoiceForMovement.id !== id) {
          throw new ConflictException('Ce mouvement de stock est déjà associé à une facture');
        }

        invoice.stockMovementId = stockMovement.id;
      } else {
        invoice.stockMovementId = null;
      }
    }

    // Mettre à jour les articles libres si fournis
    if (updateInvoiceDto.items !== undefined) {
      // Supprimer les anciens articles libres
      if (invoice.items && invoice.items.length > 0) {
        await this.invoiceItemRepository.remove(invoice.items);
      }

      // Créer les nouveaux articles libres
      if (updateInvoiceDto.items && updateInvoiceDto.items.length > 0) {
        invoice.items = updateInvoiceDto.items.map((itemDto) =>
          this.invoiceItemRepository.create({
            nom: itemDto.nom.trim(),
            description: itemDto.description?.trim() || null,
            prixUnitaire: Number(itemDto.prixUnitaire),
            quantite: Number(itemDto.quantite),
            invoiceId: invoice.id,
          })
        );
      } else {
        invoice.items = [];
      }
    }

    // Recalculer le montant total
    let montantTotal = 0;

    // Montant du mouvement
    if (invoice.stockMovementId) {
      const stockMovement = await this.stockMovementRepository.findOne({
        where: { id: invoice.stockMovementId },
        relations: ['items', 'items.article'],
      });
      if (stockMovement) {
        for (const item of stockMovement.items) {
          const prixUnitaire = typeof item.article.prixDeVente === 'string'
            ? parseFloat(item.article.prixDeVente)
            : item.article.prixDeVente;
          montantTotal += prixUnitaire * item.quantite;
        }
      }
    }

    // Montant des articles libres
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        const prixUnitaire = typeof item.prixUnitaire === 'string'
          ? parseFloat(item.prixUnitaire)
          : item.prixUnitaire;
        montantTotal += prixUnitaire * item.quantite;
      }
    }

    // Utiliser le montant fourni s'il est présent, sinon utiliser le montant calculé
    if (updateInvoiceDto.montantTotal && updateInvoiceDto.montantTotal > 0) {
      invoice.montantTotal = updateInvoiceDto.montantTotal;
    } else if (montantTotal > 0) {
      invoice.montantTotal = montantTotal;
    }

    if (invoice.montantTotal <= 0) {
      throw new BadRequestException('Le montant total de la facture doit être supérieur à 0');
    }

    // Mettre à jour le statut si fourni
    if (updateInvoiceDto.status !== undefined) {
      invoice.status = updateInvoiceDto.status;
    }

    await this.invoiceRepository.save(invoice);

    // Recharger avec les relations
    const updatedInvoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: [
        'stockMovement',
        'stockMovement.items',
        'stockMovement.items.article',
        'client',
        'items',
        'payments',
      ],
    });

    if (!updatedInvoice) {
      throw new NotFoundException(`Facture avec l'ID ${id} introuvable`);
    }

    return this.mapToResponseDto(updatedInvoice);
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException(`Facture avec l'ID ${id} introuvable`);
    }
    await this.invoiceRepository.remove(invoice);
  }

  async addPayment(invoiceId: string, createPaymentDto: CreatePaymentDto): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['payments'],
    });

    if (!invoice) {
      throw new NotFoundException(`Facture avec l'ID ${invoiceId} introuvable`);
    }

    // Calculer le montant déjà payé
    const montantPayeActuel = (invoice.payments || []).reduce(
      (sum, payment) => sum + Number(payment.montant),
      0
    );

    // Calculer le montant restant
    const montantRestant = Number(invoice.montantTotal) - montantPayeActuel;

    // Vérifier que le paiement ne dépasse pas le montant restant (avec une petite tolérance pour les erreurs d'arrondi)
    if (createPaymentDto.montant > montantRestant + 0.01) {
      throw new BadRequestException(
        `Le montant du paiement (${createPaymentDto.montant.toFixed(2)}) ne peut pas dépasser le montant restant (${montantRestant.toFixed(2)})`
      );
    }

    // Créer le paiement
    const payment = this.paymentRepository.create({
      montant: createPaymentDto.montant,
      note: createPaymentDto.note?.trim() || null,
      invoiceId: invoice.id,
      invoice: invoice, // Ajouter la relation pour éviter les problèmes
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Recalculer le montant payé après l'ajout
    const invoiceWithPayments = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['payments'],
    });

    if (!invoiceWithPayments) {
      throw new NotFoundException(`Facture avec l'ID ${invoiceId} introuvable`);
    }

    const nouveauMontantPaye = (invoiceWithPayments.payments || []).reduce(
      (sum, payment) => sum + Number(payment.montant),
      0
    );

    // Mettre à jour le statut si le montant total est atteint (avec une petite tolérance pour les erreurs d'arrondi)
    const montantTotal = Number(invoice.montantTotal);
    if (nouveauMontantPaye >= montantTotal - 0.01) {
      // Utiliser update au lieu de save pour éviter les problèmes avec les relations
      await this.invoiceRepository.update(invoice.id, {
        status: InvoiceStatus.PAYE,
      });
    }

    // Recharger la facture complète avec toutes les relations pour retourner les données à jour
    const updatedInvoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: [
        'stockMovement',
        'stockMovement.items',
        'stockMovement.items.article',
        'client',
        'items',
        'payments',
      ],
    });

    if (!updatedInvoice) {
      throw new NotFoundException(`Facture avec l'ID ${invoiceId} introuvable`);
    }

    // Retourner la facture mise à jour au lieu du seul paiement
    const invoiceDto = this.mapToResponseDto(updatedInvoice);
    return invoiceDto;
  }

  async removePayment(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['invoice'],
    });

    if (!payment) {
      throw new NotFoundException(`Paiement avec l'ID ${paymentId} introuvable`);
    }

    const invoiceId = payment.invoice.id;

    // Supprimer le paiement
    await this.paymentRepository.remove(payment);

    // Recalculer le montant payé et mettre à jour le statut
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['payments'],
    });

    if (invoice) {
      const montantPaye = (invoice.payments || []).reduce(
        (sum, payment) => sum + Number(payment.montant),
        0
      );

      // Si le montant payé est inférieur au montant total, remettre le statut à NON_PAYE
      if (montantPaye < Number(invoice.montantTotal)) {
        invoice.status = InvoiceStatus.NON_PAYE;
        await this.invoiceRepository.save(invoice);
      }
    }
  }

  private mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    const invoiceDto = new InvoiceResponseDto(invoice);
    invoiceDto.items = (invoice.items || []).map((item) => new InvoiceItemResponseDto(item));
    invoiceDto.payments = (invoice.payments || []).map((payment) => new PaymentResponseDto(payment));
    
    // S'assurer que montantTotal est un nombre
    const montantTotal = typeof invoice.montantTotal === 'string' 
      ? parseFloat(invoice.montantTotal) 
      : Number(invoice.montantTotal);
    invoiceDto.montantTotal = montantTotal;
    
    // Calculer le montant payé et restant
    const montantPaye = invoiceDto.payments.reduce(
      (sum, payment) => {
        const paymentAmount = typeof payment.montant === 'string' 
          ? parseFloat(payment.montant) 
          : Number(payment.montant);
        return sum + paymentAmount;
      },
      0
    );
    invoiceDto.montantPaye = montantPaye;
    invoiceDto.montantRestant = Math.max(0, montantTotal - montantPaye);
    
    return invoiceDto;
  }
}
