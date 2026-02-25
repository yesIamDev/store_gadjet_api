import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'Bienvenue sur l\'API Store Gadjet ! 🎉',
      name: 'Store Gadjet API',
      version: '1.0.0',
      status: 'online',
      description: 'API de gestion de stock et de facturation pour Store Gadjet',
      endpoints: {
        auth: '/auth',
        articles: '/articles',
        clients: '/clients',
        invoices: '/invoices',
        stockMovements: '/stock-movements',
        pendingArticles: '/pending-articles',
      },
    };
  }
}
