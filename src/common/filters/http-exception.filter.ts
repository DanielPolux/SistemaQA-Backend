import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';
const PG_NOT_NULL_VIOLATION = '23502';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : (body as any).message ?? exception.message;
    } else if (this.isQueryFailedError(exception)) {
      const err = exception as any;
      switch (err.code) {
        case PG_UNIQUE_VIOLATION:
          status = HttpStatus.CONFLICT;
          message = this.buildUniqueMessage(err.detail);
          break;
        case PG_FK_VIOLATION:
          status = HttpStatus.BAD_REQUEST;
          message = 'El recurso referenciado no existe';
          break;
        case PG_NOT_NULL_VIOLATION:
          status = HttpStatus.BAD_REQUEST;
          message = `El campo '${err.column}' es requerido`;
          break;
        default:
          this.logger.error(`DB error ${err.code}: ${err.message}`);
      }
    } else {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private isQueryFailedError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      'query' in err
    );
  }

  private buildUniqueMessage(detail: string): string {
    if (!detail) return 'Ya existe un registro con esos datos';
    const match = detail.match(/Key \((.+?)\)=/);
    if (match) {
      const field = match[1];
      const labels: Record<string, string> = {
        email: 'El correo electrónico ya está registrado',
        nombre: 'El nombre ya está en uso',
        codigo: 'El código ya existe',
      };
      return labels[field] ?? `El campo '${field}' ya está en uso`;
    }
    return 'Ya existe un registro con esos datos';
  }
}
