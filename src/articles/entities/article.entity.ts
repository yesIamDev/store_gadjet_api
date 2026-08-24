import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ArticleColor {
  NOIR = 'NOIR',
  JAUNE = 'JAUNE',
  MAGENTA = 'MAGENTA',
  CYAN = 'CYAN',
  BLEU = 'BLEU',
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nom: string;

  @Column({ length: 100 })
  marque: string;

  @Column({ type: 'enum', enum: ArticleColor })
  couleur: ArticleColor;

  @Column({ type: 'int', default: 0 })
  quantiteEnStock: number;

  @Column({ type: 'int', default: 0, name: 'quantite_magasin' })
  quantiteMagasin: number;

  @Column({ type: 'int', default: 0, name: 'quantite_depot' })
  quantiteDepot: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  prixDeVente: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
