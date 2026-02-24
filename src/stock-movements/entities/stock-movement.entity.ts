import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { StockMovementItem } from './stock-movement-item.entity';

export enum MovementType {
  ENTREE = 'ENTREE',
  SORTIE = 'SORTIE',
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
