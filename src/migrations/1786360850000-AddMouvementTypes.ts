import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMouvementTypes1786360850000 implements MigrationInterface {
  name = 'AddMouvementTypes1786360850000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nouveau type de client : revendeur
    await queryRunner.query(
      `ALTER TYPE "clients_type_enum" ADD VALUE IF NOT EXISTS 'REVENDEUR'`,
    );

    // Nouveaux types de mouvement métier
    await queryRunner.query(
      `ALTER TYPE "stock_movements_type_enum" ADD VALUE IF NOT EXISTS 'RENFORCEMENT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_movements_type_enum" ADD VALUE IF NOT EXISTS 'VENTE_RAPIDE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_movements_type_enum" ADD VALUE IF NOT EXISTS 'VENTE_CREDIT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_movements_type_enum" ADD VALUE IF NOT EXISTS 'PRET_REVENDEUR'`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_movements_type_enum" ADD VALUE IF NOT EXISTS 'APPROVISIONNEMENT'`,
    );

    // Statut de retour pour les prêts à des revendeurs
    await queryRunner.query(
      `CREATE TYPE "stock_movements_loan_status_enum" AS ENUM ('EN_COURS', 'PARTIELLEMENT_RETOURNE', 'RETOURNE')`,
    );

    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD COLUMN "client_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD COLUMN "loan_status" "stock_movements_loan_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_client"
        FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_movement_items" ADD COLUMN "quantite_retournee" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movement_items" DROP COLUMN "quantite_retournee"`,
    );

    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP COLUMN "loan_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP COLUMN "client_id"`,
    );
    await queryRunner.query(`DROP TYPE "stock_movements_loan_status_enum"`);

    // Note : PostgreSQL ne permet pas de retirer des valeurs d'un type enum
    // existant. Les valeurs ajoutées à "stock_movements_type_enum" et
    // "clients_type_enum" restent donc présentes après un rollback.
  }
}
