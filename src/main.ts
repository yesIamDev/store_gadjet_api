import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { updateNullCodes } from './stock-movements/scripts/update-null-codes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activation de la validation globale avec class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non définies dans le DTO
      forbidNonWhitelisted: true, // Lance une erreur si des propriétés non autorisées sont présentes
      transform: true, // Transforme automatiquement les types
      transformOptions: {
        enableImplicitConversion: true, // Conversion implicite des types
      },
    }),
  );

  // Activation de CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Mettre à jour les codes NULL pour les anciens mouvements
  // Cette opération se fait après la synchronisation de TypeORM
  try {
    // Attendre un peu pour que TypeORM termine la synchronisation
    await new Promise(resolve => setTimeout(resolve, 1000));
    const dataSource = app.get<DataSource>(getDataSourceToken());
    if (dataSource.isInitialized) {
      await updateNullCodes(dataSource);
    }
  } catch (error) {
    console.warn('Erreur lors de la mise à jour des codes NULL:', error.message);
    // Ne pas bloquer le démarrage si la mise à jour échoue
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
