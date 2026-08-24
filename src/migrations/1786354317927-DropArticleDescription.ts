import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * L'application se concentre sur un seul type d'article (cartouches) : le
 * champ "nom" porte désormais le nom commercial de la cartouche et le champ
 * libre "description" n'a plus lieu d'être.
 */
export class DropArticleDescription1786354317927 implements MigrationInterface {
  name = 'DropArticleDescription1786354317927';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "description"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" ADD COLUMN "description" text`);
  }
}
