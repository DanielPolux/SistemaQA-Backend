-- ============================================================
--  16_plan_casos_prueba.sql
--  Trazabilidad: permite elegir casos de prueba específicos de un
--  requerimiento dentro de un Plan de Pruebas, en vez de tomar
--  siempre TODOS los casos del requerimiento.
--
--  Si un requerimiento del plan no tiene filas aquí, se sigue
--  cubriendo con TODOS sus casos de prueba (comportamiento actual,
--  compatible con planes ya existentes). Si tiene al menos una fila,
--  solo esos casos cuentan para ese requerimiento en ese plan.
--
--  Ejecutar manualmente en la BD ya desplegada:
--    docker exec -i sqa_postgres psql -U postgres -d sistema_qa < database/init/16_plan_casos_prueba.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_casos_prueba (
  plan_id          INTEGER NOT NULL REFERENCES planes_prueba(id)  ON DELETE CASCADE,
  requerimiento_id INTEGER NOT NULL REFERENCES requerimientos(id) ON DELETE CASCADE,
  caso_prueba_id   INTEGER NOT NULL REFERENCES casos_prueba(id)   ON DELETE CASCADE,
  PRIMARY KEY (plan_id, caso_prueba_id)
);

CREATE INDEX IF NOT EXISTS idx_pcp_plan_req ON plan_casos_prueba(plan_id, requerimiento_id);
