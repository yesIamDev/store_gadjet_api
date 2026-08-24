import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La fonctionnalité "articles en attente" a été retirée du code
 * (module, entité, DTOs). Cette migration supprime la table et l'enum
 * correspondants, restés orphelins en base.
 */
export class DropPendingArticles1786352878817 implements MigrationInterface {
  name = 'DropPendingArticles1786352878817';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pending_articles"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pending_articles_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "pending_articles_status_enum" AS ENUM ('EN_ATTENTE', 'PARTIELLEMENT_RECU', 'RECU')`,
    );
    await queryRunner.query(`
      CREATE TABLE "pending_articles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "article_id" uuid NOT NULL,
        "quantite_attendue" integer NOT NULL,
        "quantite_recue" integer NOT NULL DEFAULT 0,
        "date_attendue" date,
        "date_reception" TIMESTAMP,
        "status" "pending_articles_status_enum" NOT NULL DEFAULT 'EN_ATTENTE',
        "note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pending_articles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pending_articles_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);
  }
}
