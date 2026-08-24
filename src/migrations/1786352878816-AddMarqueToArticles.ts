import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La colonne "marque" a été ajoutée à l'entité Article après que la migration
 * InitSchema ait déjà été exécutée sur les bases existantes ; le fichier
 * InitSchema a été édité mais TypeORM ne rejoue jamais une migration déjà
 * marquée comme exécutée. Cette migration applique le changement manquant.
 */
export class AddMarqueToArticles1786352878816 implements MigrationInterface {
  name = 'AddMarqueToArticles1786352878816';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "articles" ADD COLUMN "marque" character varying(100) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "articles" ALTER COLUMN "marque" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "marque"`);
  }
}
