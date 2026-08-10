-- Tabla de ejecuciones de casos de prueba
DO $$ BEGIN
  CREATE TYPE resultado_ejecucion AS ENUM ('Aprobado', 'Fallido', 'Bloqueado', 'Omitido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ambiente_ejecucion AS ENUM ('Desarrollo', 'QA', 'Staging', 'Producción');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ejecuciones_caso_prueba (
  id                 SERIAL      PRIMARY KEY,
  caso_prueba_id     INTEGER     NOT NULL REFERENCES casos_prueba(id)  ON DELETE CASCADE,
  proyecto_id        INTEGER     NOT NULL REFERENCES proyectos(id)     ON DELETE CASCADE,
  ciclo_id           INTEGER     REFERENCES ciclos_prueba(id)          ON DELETE SET NULL,
  ciclo_prueba       VARCHAR(100),
  tester_id          INTEGER     NOT NULL REFERENCES usuarios(id),
  desarrollador_id   INTEGER     REFERENCES usuarios(id)               ON DELETE SET NULL,
  fecha              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ambiente           ambiente_ejecucion NOT NULL,
  version            VARCHAR(50)        NOT NULL,
  resultado          resultado_ejecucion NOT NULL,
  resultado_obtenido TEXT               NOT NULL,
  evidencia_url      VARCHAR(500),
  evidencias         JSONB       NOT NULL DEFAULT '[]',
  defecto_id         INTEGER     REFERENCES defectos(id)               ON DELETE SET NULL,
  observaciones      TEXT,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ejecuciones_caso_prueba ON ejecuciones_caso_prueba(caso_prueba_id);
CREATE INDEX IF NOT EXISTS idx_ejecuciones_proyecto    ON ejecuciones_caso_prueba(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_ejecuciones_tester      ON ejecuciones_caso_prueba(tester_id);
CREATE INDEX IF NOT EXISTS idx_ejecuciones_ciclo       ON ejecuciones_caso_prueba(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_ejecuciones_resultado   ON ejecuciones_caso_prueba(resultado);
