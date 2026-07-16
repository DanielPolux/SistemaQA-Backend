-- Tabla de auditoría: registra cambios en casos de prueba y defectos
CREATE TABLE IF NOT EXISTS auditoria (
  id              SERIAL PRIMARY KEY,
  entidad         VARCHAR(50)  NOT NULL,
  entidad_id      INTEGER      NOT NULL,
  usuario_id      INTEGER,
  usuario_nombre  VARCHAR(200),
  accion          VARCHAR(80)  NOT NULL,
  campo           VARCHAR(100),
  valor_anterior  TEXT,
  valor_nuevo     TEXT,
  fecha           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_entidad_id
  ON auditoria(entidad, entidad_id);
