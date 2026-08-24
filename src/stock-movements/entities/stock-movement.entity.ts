import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockMovementItem } from './stock-movement-item.entity';
import { Client } from '../../clients/entities/client.entity';

export enum MovementType {
  ENTREE = 'ENTREE',
  SORTIE = 'SORTIE',
  // Renforcement du stock au magasin : transfert dépôt -> magasin
  RENFORCEMENT = 'RENFORCEMENT',
  // Vente comptant depuis le magasin (facture auto-générée et payée)
  VENTE_RAPIDE = 'VENTE_RAPIDE',
  // Vente à crédit depuis le magasin (facture auto-générée, non payée)
  VENTE_CREDIT = 'VENTE_CREDIT',
  // Prêt/don d'articles à un revendeur, à retourner ultérieurement
  PRET_REVENDEUR = 'PRET_REVENDEUR',
  // Réapprovisionnement simple du dépôt, sans fournisseur à renseigner
  APPROVISIONNEMENT = 'APPROVISIONNEMENT',
}

export enum LoanStatus {
  EN_COURS = 'EN_COURS',
  PARTIELLEMENT_RETOURNE = 'PARTIELLEMENT_RETOURNE',
  RETOURNE = 'RETOURNE',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Rendre nullable pour éviter les erreurs de synchronisation
  // sur les anciennes lignes qui n'ont pas encore de code.
  // Les nouveaux mouvements auront toujours un code généré côté service.
  @Column({ length: 50, unique: true, name: 'code', nullable: true })
  code: string | null;

  @OneToMany(() => StockMovementItem, (item) => item.movement, {
    cascade: true,
    eager: true,
  })
  items: StockMovementItem[];

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type: MovementType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motif: string | null;

  // Client concerné : requis pour VENTE_CREDIT et PRET_REVENDEUR, optionnel pour VENTE_RAPIDE
  @Column({ name: 'client_id', nullable: true })
  clientId: string | null;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  // Statut de retour, uniquement pertinent pour PRET_REVENDEUR
  @Column({
    type: 'enum',
    enum: LoanStatus,
    nullable: true,
    name: 'loan_status',
  })
  loanStatus: LoanStatus | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
