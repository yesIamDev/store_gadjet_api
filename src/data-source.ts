import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const isRenderDB = process.env.DB_HOST?.includes('render.com');
const isProduction = process.env.NODE_ENV === 'production';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'store_gadget_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl: isRenderDB || isProduction ? { rejectUnauthorized: false } : false,
};

// Utilisé uniquement par la CLI TypeORM (migration:generate/run/revert).
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
