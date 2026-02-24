import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ClientType {
  INDIVIDU = 'INDIVIDU',
  ENTREPRISE = 'ENTREPRISE',
}

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ClientType,
  })
  type: ClientType;

  // Pour INDIVIDU : nom complet
  // Pour ENTREPRISE : nom de l'organisation
  @Column({ length: 255 })
  nom: string;

  // Pour INDIVIDU : numéro de téléphone
  // Pour ENTREPRISE : numéro de téléphone de la personne de référence
  @Column({ length: 20, nullable: true, name: 'telephone' })
  telephone: string | null;

  // Pour ENTREPRISE uniquement : nom de la personne de référence
  @Column({ length: 255, nullable: true, name: 'nom_personne_reference' })
  nomPersonneReference: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
