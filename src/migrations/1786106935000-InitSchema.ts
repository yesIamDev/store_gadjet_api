import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schéma initial, reconstitué à partir des entités TypeORM existantes
 * (le schéma était jusqu'ici géré par `synchronize: true`, sans migration).
 * À n'appliquer que sur une base de données vierge.
 */
export class InitSchema1786106935000 implements MigrationInterface {
  name = 'InitSchema1786106935000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying(20) NOT NULL,
        "password" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nom" character varying(255) NOT NULL,
        "marque" character varying(100) NOT NULL,
        "description" text,
        "quantiteEnStock" integer NOT NULL DEFAULT 0,
        "quantite_magasin" integer NOT NULL DEFAULT 0,
        "quantite_depot" integer NOT NULL DEFAULT 0,
        "prixDeVente" numeric(10,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_articles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE TYPE "clients_type_enum" AS ENUM ('INDIVIDU', 'ENTREPRISE')`);
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "clients_type_enum" NOT NULL,
        "nom" character varying(255) NOT NULL,
        "telephone" character varying(20),
        "nom_personne_reference" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clients" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE TYPE "stock_movements_type_enum" AS ENUM ('ENTREE', 'SORTIE')`);
    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(50),
        "type" "stock_movements_type_enum" NOT NULL,
        "motif" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_stock_movements_code" UNIQUE ("code"),
        CONSTRAINT "PK_stock_movements" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "stock_movement_items_emplacement_enum" AS ENUM ('MAGASIN', 'DEPOT')`,
    );
    await queryRunner.query(`
      CREATE TABLE "stock_movement_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "movement_id" uuid NOT NULL,
        "article_id" uuid NOT NULL,
        "quantite" integer NOT NULL,
        "emplacement" "stock_movement_items_emplacement_enum" NOT NULL DEFAULT 'MAGASIN',
        CONSTRAINT "PK_stock_movement_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_movement_items_movement" FOREIGN KEY ("movement_id")
          REFERENCES "stock_movements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_movement_items_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE TYPE "invoices_status_enum" AS ENUM ('NON_PAYE', 'PAYE')`);
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "numero_facture" character varying(100),
        "numero_bon_livraison" character varying(100),
        "montant_total" numeric(10,2) NOT NULL,
        "status" "invoices_status_enum" NOT NULL DEFAULT 'NON_PAYE',
        "stock_movement_id" uuid,
        "client_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoices_stock_movement" FOREIGN KEY ("stock_movement_id")
          REFERENCES "stock_movements"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_invoices_client" FOREIGN KEY ("client_id")
          REFERENCES "clients"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nom" character varying(255) NOT NULL,
        "description" text,
        "prix_unitaire" numeric(10,2),
        "quantite" integer NOT NULL,
        "invoice_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoice_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoice_items_invoice" FOREIGN KEY ("invoice_id")
          REFERENCES "invoices"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "montant" numeric(10,2) NOT NULL,
        "note" text,
        "invoice_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_invoice" FOREIGN KEY ("invoice_id")
          REFERENCES "invoices"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "invoice_items"`);

    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "invoices_status_enum"`);

    await queryRunner.query(`DROP TABLE "stock_movement_items"`);
    await queryRunner.query(`DROP TYPE "stock_movement_items_emplacement_enum"`);

    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TYPE "stock_movements_type_enum"`);

    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TYPE "clients_type_enum"`);

    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
