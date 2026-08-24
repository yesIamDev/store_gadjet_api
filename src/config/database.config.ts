import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isRenderDB = process.env.DB_HOST?.includes('render.com');
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'store_gadget_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    // Le schéma est désormais géré par les migrations (voir src/migrations).
    // synchronize reste désactivable/activable explicitement pour du dépannage ponctuel,
    // mais ne doit jamais être activé en production.
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    migrationsRun: process.env.DB_MIGRATIONS_RUN !== 'false',
    logging: process.env.DB_LOGGING === 'true',
    // Render et la plupart des services cloud nécessitent SSL
    ssl: isRenderDB || isProduction
      ? { rejectUnauthorized: false }
      : false,
    // Options de connexion améliorées
    extra: {
      max: 20, // Nombre maximum de connexions dans le pool
      connectionTimeoutMillis: 30000, // 30 secondes pour les connexions cloud
      idleTimeoutMillis: 30000,
      // Options spécifiques pour pg (driver PostgreSQL)
      statement_timeout: 30000,
      query_timeout: 30000,
    },
    // Retry configuration
    retryAttempts: 10, // Plus de tentatives pour les connexions cloud
    retryDelay: 5000, // 5 secondes entre les tentatives
  };
});
