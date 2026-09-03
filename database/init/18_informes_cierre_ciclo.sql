CREATE TABLE IF NOT EXISTS informes_cierre_ciclo (
  id                         SERIAL PRIMARY KEY,
  ciclo_id                   INTEGER NOT NULL REFERENCES ciclos_prueba(id) ON DELETE CASCADE,
  version                    INTEGER NOT NULL,
  resultado_global           VARCHAR(40) NOT NULL,
  recomendacion_qa           VARCHAR(40) NOT NULL,
  conclusion_qa              TEXT NOT NULL,
  justificacion_bloqueados   TEXT,
  resumen                    JSONB NOT NULL,
  generado_por               INTEGER NOT NULL REFERENCES usuarios(id),
  correo_enviado_en          TIMESTAMPTZ,
  creado_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_informe_cierre_version UNIQUE (ciclo_id, version)
);

CREATE INDEX IF NOT EXISTS idx_informes_cierre_ciclo ON informes_cierre_ciclo(ciclo_id, version DESC);
