import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleColor } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';
import * as XLSX from 'xlsx';
import type { Express } from 'express';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  async create(createArticleDto: CreateArticleDto): Promise<ArticleResponseDto> {
    const existingArticle = await this.articleRepository.findOne({
      where: { nom: createArticleDto.nom },
    });

    if (existingArticle) {
      throw new ConflictException(
        'Un article avec ce nom existe déjà',
      );
    }

    const quantiteEnStock =
      (createArticleDto.quantiteMagasin || 0) + (createArticleDto.quantiteDepot || 0);

    const article = this.articleRepository.create({
      ...createArticleDto,
      quantiteEnStock,
    });
    const savedArticle = await this.articleRepository.save(article);
    return new ArticleResponseDto(savedArticle);
  }

  async findAll(): Promise<ArticleResponseDto[]> {
    const articles = await this.articleRepository.find({
      order: { createdAt: 'DESC' },
    });
    return articles.map((article) => new ArticleResponseDto(article));
  }

  async findOne(id: string): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }

    return new ArticleResponseDto(article);
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }

    if (updateArticleDto.nom && updateArticleDto.nom !== article.nom) {
      const existingArticle = await this.articleRepository.findOne({
        where: { nom: updateArticleDto.nom },
      });

      if (existingArticle) {
        throw new ConflictException('Un article avec ce nom existe déjà');
      }
    }

    Object.assign(article, updateArticleDto);

    if (
      updateArticleDto.quantiteMagasin !== undefined ||
      updateArticleDto.quantiteDepot !== undefined
    ) {
      const quantiteMagasin =
        updateArticleDto.quantiteMagasin !== undefined
          ? updateArticleDto.quantiteMagasin
          : article.quantiteMagasin;
      const quantiteDepot =
        updateArticleDto.quantiteDepot !== undefined
          ? updateArticleDto.quantiteDepot
          : article.quantiteDepot;
      article.quantiteEnStock = quantiteMagasin + quantiteDepot;
    }

    const updatedArticle = await this.articleRepository.save(article);
    return new ArticleResponseDto(updatedArticle);
  }

  async remove(id: string): Promise<void> {
    const article = await this.articleRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }

    await this.articleRepository.remove(article);
  }

  async importFromExcel(
    file: any,
  ): Promise<{ created: number; updated: number }> {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const nom = (row.nom || row.NOM || '').toString().trim();
        if (!nom) {
          continue;
        }

        const marque = (row.marque || row.MARQUE || row.brand || row.BRAND || '')
          .toString()
          .trim();
        if (!marque) {
          continue;
        }

        const couleurRaw = (row.couleur || row.COULEUR || '')
          .toString()
          .trim()
          .toUpperCase();
        if (!Object.values(ArticleColor).includes(couleurRaw as ArticleColor)) {
          continue;
        }
        const couleur = couleurRaw as ArticleColor;

        const prixDeVenteRaw =
          row.prixDeVente || row.PRIX_DE_VENTE || row.prix || row.PRIX;
        let prixDeVente: number | null = null;
        if (prixDeVenteRaw !== null && prixDeVenteRaw !== undefined && prixDeVenteRaw !== '') {
          const parsedPrix = Number(prixDeVenteRaw);
          if (Number.isNaN(parsedPrix) || parsedPrix <= 0) {
            continue;
          }
          prixDeVente = parsedPrix;
        }

        const quantiteMagasinRaw =
          row.quantiteMagasin || row.QUANTITE_MAGASIN || row.magasin || row.MAGASIN;
        const quantiteDepotRaw =
          row.quantiteDepot || row.QUANTITE_DEPOT || row.depot || row.DEPOT;

        const quantiteMagasin = Number(quantiteMagasinRaw) || 0;
        const quantiteDepot = Number(quantiteDepotRaw) || 0;

        const existing = await this.articleRepository.findOne({
          where: { nom },
        });

        if (existing) {
          existing.marque = marque;
          existing.couleur = couleur;
          existing.prixDeVente = prixDeVente;
          existing.quantiteMagasin = quantiteMagasin;
          existing.quantiteDepot = quantiteDepot;
          existing.quantiteEnStock = quantiteMagasin + quantiteDepot;
          await this.articleRepository.save(existing);
          updated++;
        } else {
          const article = this.articleRepository.create({
            nom,
            marque,
            couleur,
            prixDeVente,
            quantiteMagasin,
            quantiteDepot,
            quantiteEnStock: quantiteMagasin + quantiteDepot,
          });
          await this.articleRepository.save(article);
          created++;
        }
      }

      if (created === 0 && updated === 0) {
        throw new BadRequestException(
          'Aucune ligne valide trouvée dans le fichier Excel',
        );
      }

      return { created, updated };
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors du traitement du fichier Excel',
      );
    }
  }
}
