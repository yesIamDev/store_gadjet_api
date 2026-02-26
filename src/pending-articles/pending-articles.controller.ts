import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { PendingArticlesService } from './pending-articles.service';
import { CreatePendingArticleDto } from './dto/create-pending-article.dto';
import { UpdatePendingArticleDto } from './dto/update-pending-article.dto';
import { ReceivePendingArticleDto } from './dto/receive-pending-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';

@Controller('pending-articles')
@UseGuards(JwtAuthGuard)
export class PendingArticlesController {
  constructor(
    private readonly pendingArticlesService: PendingArticlesService,
  ) {}

  @Post()
  create(@Body() createPendingArticleDto: CreatePendingArticleDto) {
    return this.pendingArticlesService.create(createPendingArticleDto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async importFromExcel(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.pendingArticlesService.importFromExcel(file);
  }

  @Get()
  findAll() {
    return this.pendingArticlesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pendingArticlesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePendingArticleDto: UpdatePendingArticleDto,
  ) {
    return this.pendingArticlesService.update(id, updatePendingArticleDto);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  receive(
    @Param('id') id: string,
    @Body() receiveDto: ReceivePendingArticleDto,
  ) {
    return this.pendingArticlesService.receive(id, receiveDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.pendingArticlesService.remove(id);
  }
}
