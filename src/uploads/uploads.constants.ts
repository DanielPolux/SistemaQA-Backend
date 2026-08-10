import { join } from 'path';

/**
 * Directorio raiz donde se guardan los archivos subidos (evidencias).
 * En Docker es un volumen montado en /app/uploads (ver docker-compose.prod.yml)
 * para que persista entre rebuilds/restarts del contenedor.
 */
export const UPLOADS_ROOT = join(__dirname, '..', '..', 'uploads');
