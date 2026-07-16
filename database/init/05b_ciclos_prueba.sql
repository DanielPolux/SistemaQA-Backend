-- ============================================================
--  05b_ciclos_prueba.sql
--  Tabla ciclos_prueba (faltaba en los scripts originales)
--  Ejecutar ANTES de 06_ejecuciones.sql y 06_planes_prueba.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS ciclos_prueba (
  id             SERIAL        PRIMARY KEY,
  proyecto_id    INTEGER       NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre         VARCHAR(200)  NOT NULL,
  descripcion    TEXT,
  ambiente       VARCHAR(50),
  estado         VARCHAR(20)   NOT NULL DEFAULT 'Activo',
  fecha_inicio   DATE,
  fecha_fin      DATE,
  creado_por     INTEGER       NOT NULL REFERENCES usuarios(id),
  plan_prueba_id INTEGER,
  plan_nombre    VARCHAR(200),
  creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ciclos_proyecto ON ciclos_prueba(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_ciclos_estado   ON ciclos_prueba(estado);

CREATE OR REPLACE FUNCTION fn_ciclos_prueba_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_ciclos_prueba_updated
    BEFORE UPDATE ON ciclos_prueba
    FOR EACH ROW EXECUTE FUNCTION fn_ciclos_prueba_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
