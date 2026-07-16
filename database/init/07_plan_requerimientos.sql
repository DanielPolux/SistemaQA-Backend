-- ============================================================
--  07_plan_requerimientos.sql
--  Trazabilidad: Plan de Pruebas ↔ Requerimientos
--  Ejecutar manualmente:
--    docker exec -i sqa_postgres psql -U postgres -d sistema_qa < database/init/07_plan_requerimientos.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_requerimientos (
  plan_id          INTEGER NOT NULL REFERENCES planes_prueba(id)  ON DELETE CASCADE,
  requerimiento_id INTEGER NOT NULL REFERENCES requerimientos(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, requerimiento_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_reqs_plan ON plan_requerimientos(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_reqs_req  ON plan_requerimientos(requerimiento_id);
