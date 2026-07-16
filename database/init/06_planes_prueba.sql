-- ============================================================
--  06_planes_prueba.sql
--  Módulo: Plan de Pruebas
--  Ejecutar manualmente en una BD ya inicializada:
--    docker exec -i sqa_postgres psql -U postgres -d sistema_qa < database/init/06_planes_prueba.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS planes_prueba (
  id                 SERIAL PRIMARY KEY,
  nombre             VARCHAR(200) NOT NULL,
  descripcion        TEXT,
  objetivo           TEXT NOT NULL,
  alcance            TEXT,
  fuera_alcance      TEXT,
  criterios_entrada  TEXT,
  criterios_salida   TEXT,
  riesgos            TEXT,
  proyecto_id        INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  responsable_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  proyecto_nombre    VARCHAR(200),
  responsable_nombre VARCHAR(200),
  estado             VARCHAR(20) NOT NULL DEFAULT 'Activo',
  fecha_inicio       DATE,
  fecha_objetivo     DATE,
  creado_en          TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en     TIMESTAMPTZ DEFAULT NOW()
);

-- Vincular ciclos a un plan (opcional, no rompe ciclos existentes)
ALTER TABLE ciclos_prueba
  ADD COLUMN IF NOT EXISTS plan_prueba_id INTEGER REFERENCES planes_prueba(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_nombre    VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_planes_prueba_proyecto ON planes_prueba(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_ciclos_plan            ON ciclos_prueba(plan_prueba_id);

-- Trigger para actualizar actualizado_en automáticamente
CREATE OR REPLACE FUNCTION update_planes_prueba_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_planes_prueba_updated ON planes_prueba;
CREATE TRIGGER trg_planes_prueba_updated
  BEFORE UPDATE ON planes_prueba
  FOR EACH ROW EXECUTE FUNCTION update_planes_prueba_timestamp();
