import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  quantiteEnStock: number;

  @Column({ type: 'int', default: 0, name: 'quantite_magasin' })
  quantiteMagasin: number;

  @Column({ type: 'int', default: 0, name: 'quantite_depot' })
  quantiteDepot: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  prixDeVente: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
