import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { basename, extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UPLOADS_ROOT } from './uploads.constants';

// Tipos de evidencia aceptados: capturas, video corto, logs, PDF.
const MIME_PERMITIDOS = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'text/plain',
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!MIME_PERMITIDOS.has(file.mimetype)) {
          cb(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`), false);
          return;
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const carpeta = new Date().toISOString().slice(0, 7); // YYYY-MM
          const dir = join(UPLOADS_ROOT, carpeta);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
    }),
  )
  subir(@UploadedFile() file: Express.Multer.File): { url: string; nombre: string } {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    // basename(file.destination) = la carpeta YYYY-MM que multer realmente usó
    // (evita depender de recalcular la fecha, que podria diferir en el borde de un mes)
    const carpeta = basename(file.destination);
    return {
      url: `/api/uploads/${carpeta}/${file.filename}`,
      nombre: file.originalname,
    };
  }
}
