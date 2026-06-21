import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface DocumentoRequerimiento {
  itemId: string;
  nombre: string;
  url: string;
  tamano: number;
  subidoEn: string;
}

@Injectable()
export class SharepointService {
  private readonly logger = new Logger(SharepointService.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly siteHostname: string;
  private readonly sitePath: string;
  private readonly rootFolder: string;

  constructor(private config: ConfigService) {
    this.tenantId     = config.get('SP_TENANT_ID',     '');
    this.clientId     = config.get('SP_CLIENT_ID',     '');
    this.clientSecret = config.get('SP_CLIENT_SECRET', '');
    this.siteHostname = config.get('SP_SITE_HOSTNAME', '');
    this.sitePath     = config.get('SP_SITE_PATH',     '');
    this.rootFolder   = config.get('SP_ROOT_FOLDER',   'SistemaQA');
  }

  get estaConfigurado(): boolean {
    return !!(this.tenantId && this.clientId && this.clientSecret && this.siteHostname);
  }

  private checkConfig(): void {
    if (!this.estaConfigurado) {
      throw new ServiceUnavailableException(
        'La integración con SharePoint no está configurada. ' +
        'Completa SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET y SP_SITE_HOSTNAME en el archivo .env.',
      );
    }
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }
    const params = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     this.clientId,
      client_secret: this.clientSecret,
      scope:         'https://graph.microsoft.com/.default',
    });
    const data = await this.httpreq<any>(
      'POST',
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      Buffer.from(params.toString()),
      { 'Content-Type': 'application/x-www-form-urlencoded' },
    );
    this.tokenCache = {
      token:     data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
    };
    return this.tokenCache.token;
  }

  private get siteBase(): string {
    return this.sitePath
      ? `https://graph.microsoft.com/v1.0/sites/${this.siteHostname}:${this.sitePath}`
      : `https://graph.microsoft.com/v1.0/sites/${this.siteHostname}`;
  }

  private encodePath(p: string): string {
    return p.split('/').map(s => encodeURIComponent(s)).join('/');
  }

  async subirArchivo(
    projectCode: string,
    projectName: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<DocumentoRequerimiento> {
    this.checkConfig();
    const token = await this.getToken();

    // Sanitize: SharePoint prohíbe * ? " < > | # %
    const folder = `${projectCode} - ${projectName}`
      .replace(/[*?"<>|#%\\/]/g, '')
      .substring(0, 100)
      .trim();

    const safeName  = fileName.replace(/[*?"<>|#%]/g, '_');
    const fullPath  = `${this.rootFolder}/${folder}/${safeName}`;
    const uploadUrl = `${this.siteBase}/drive/root:/${this.encodePath(fullPath)}:/content`;

    const result = await this.httpreq<any>('PUT', uploadUrl, buffer, {
      Authorization:  `Bearer ${token}`,
      'Content-Type': mimeType || 'application/octet-stream',
    });

    if (!result?.id) {
      throw new Error(`SharePoint no devolvió ID del archivo. Respuesta: ${JSON.stringify(result)}`);
    }

    return {
      itemId:   result.id,
      nombre:   result.name,
      url:      result.webUrl,
      tamano:   result.size ?? buffer.length,
      subidoEn: new Date().toISOString(),
    };
  }

  async eliminarArchivo(itemId: string): Promise<void> {
    this.checkConfig();
    const token = await this.getToken();
    await this.httpreq<void>('DELETE', `${this.siteBase}/drive/items/${itemId}`, null, {
      Authorization: `Bearer ${token}`,
    });
  }

  // ─── HTTP helper universal ────────────────────────────────────────────────

  private httpreq<T>(
    method: string,
    url: string,
    body: Buffer | null,
    headers: Record<string, string>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.request(
        {
          hostname: u.hostname,
          port:     443,
          path:     u.pathname + u.search,
          method,
          headers: {
            ...headers,
            ...(body ? { 'Content-Length': String(body.length) } : {}),
          },
        },
        res => {
          const chunks: Buffer[] = [];
          res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8');
            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`Graph API ${res.statusCode}: ${raw.substring(0, 500)}`));
            }
            if (!raw || res.statusCode === 204) return resolve(undefined as any);
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error(`JSON parse: ${raw.substring(0, 200)}`)); }
          });
        },
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
}
