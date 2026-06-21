import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
        port: this.config.get<number>('MAIL_PORT', 587),
        secure: this.config.get<string>('MAIL_SECURE') === 'true',
        auth: { user, pass },
      });
    } else {
      this.logger.warn('MAIL_USER/MAIL_PASS no configurados — los correos se registrarán en consola');
    }
  }

  async send(options: MailOptions): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM', 'Sistema QA <no-reply@sistemaqa.com>');

    if (!this.transporter) {
      this.logger.log(`[MAIL-SIMULADO] Para: ${options.to} | CC: ${options.cc ?? '-'} | Asunto: ${options.subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from, ...options });
      this.logger.log(`Correo enviado → ${options.to} | ${options.subject}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error al enviar correo: ${msg}`);
    }
  }
}
