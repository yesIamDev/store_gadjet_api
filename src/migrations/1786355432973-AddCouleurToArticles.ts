import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCouleurToArticles1786355432973 implements MigrationInterface {
  name = 'AddCouleurToArticles1786355432973';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "articles_couleur_enum" AS ENUM ('NOIR', 'JAUNE', 'MAGENTA', 'CYAN', 'BLEU')`,
    );
    await queryRunner.query(`
      ALTER TABLE "articles" ADD COLUMN "couleur" "articles_couleur_enum" NOT NULL DEFAULT 'NOIR'
    `);
    await queryRunner.query(`
      ALTER TABLE "articles" ALTER COLUMN "couleur" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "couleur"`);
    await queryRunner.query(`DROP TYPE "articles_couleur_enum"`);
  }
}
