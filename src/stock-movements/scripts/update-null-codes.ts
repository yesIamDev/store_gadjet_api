import { DataSource } from 'typeorm';
import { StockMovement } from '../entities/stock-movement.entity';

/**
 * Script pour mettre à jour les anciens mouvements de stock
 * qui n'ont pas de code avec des codes générés
 */
export async function updateNullCodes(dataSource: DataSource): Promise<void> {
  const stockMovementRepository = dataSource.getRepository(StockMovement);

  // Trouver tous les mouvements sans code
  const movementsWithoutCode = await stockMovementRepository.find({
    where: { code: null },
  });

  if (movementsWithoutCode.length === 0) {
    console.log('Aucun mouvement sans code à mettre à jour');
    return;
  }

  console.log(`Mise à jour de ${movementsWithoutCode.length} mouvements sans code...`);

  const generateUniqueCode = (): string => {
    const prefix = 'MV-';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}-${random}`;
  };

  for (const movement of movementsWithoutCode) {
    let code = generateUniqueCode();
    let codeExists = await stockMovementRepository.findOne({
      where: { code },
    });

    // Si le code existe déjà, en générer un nouveau (très rare)
    while (codeExists) {
      code = generateUniqueCode();
      codeExists = await stockMovementRepository.findOne({
        where: { code },
      });
    }

    movement.code = code;
    await stockMovementRepository.save(movement);
  }

  console.log(`✅ ${movementsWithoutCode.length} mouvements mis à jour avec succès`);
}
