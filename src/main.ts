import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { updateNullCodes } from './stock-movements/scripts/update-null-codes';

async function bootstrap() {
  try {
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
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  // Activation de CORS
  // Normaliser l'URL du frontend (enlever le slash final si présent)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
  const normalizedFrontendUrl = frontendUrl.endsWith('/')
    ? frontendUrl.slice(0, -1)
    : frontendUrl

  app.enableCors({
    origin: normalizedFrontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type'],
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
  } catch (error) {
    console.error('❌ Erreur lors du démarrage de l\'application:', error.message);
    
    // Messages d'aide spécifiques selon le type d'erreur
    if (error.message?.includes('ECONNRESET') || error.message?.includes('Unable to connect')) {
      console.error('\n💡 Solutions possibles:');
      console.error('1. Vérifiez que PostgreSQL est démarré et accessible');
      console.error('2. Pour Render.com: La base de données peut être en pause (réveillez-la depuis le dashboard)');
      console.error('3. Vérifiez vos paramètres de connexion dans le fichier .env');
      console.error('4. Vérifiez que le port PostgreSQL (5432) n\'est pas bloqué par un firewall');
      console.error(`\n📋 Configuration actuelle:`);
      console.error(`   Host: ${process.env.DB_HOST || 'localhost'}`);
      console.error(`   Port: ${process.env.DB_PORT || '5432'}`);
      console.error(`   Database: ${process.env.DB_DATABASE || 'store_gadget_db'}`);
      console.error(`   Username: ${process.env.DB_USERNAME || 'postgres'}`);
    }
    
    process.exit(1);
  }
}
bootstrap();
