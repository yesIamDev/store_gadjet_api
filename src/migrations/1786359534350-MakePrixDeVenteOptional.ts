import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePrixDeVenteOptional1786359534350 implements MigrationInterface {
  name = 'MakePrixDeVenteOptional1786359534350';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" ALTER COLUMN "prixDeVente" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "articles" SET "prixDeVente" = 0 WHERE "prixDeVente" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ALTER COLUMN "prixDeVente" SET NOT NULL`,
    );
  }
}
