-- Tabla de casos planificados por ciclo (selección al crear un nuevo ciclo)
CREATE TABLE IF NOT EXISTS ciclo_casos_planificados (
  ciclo_id           INTEGER NOT NULL REFERENCES ciclos_prueba(id) ON DELETE CASCADE,
  caso_prueba_id     INTEGER NOT NULL REFERENCES casos_prueba(id)  ON DELETE CASCADE,
  resultado_anterior VARCHAR(30),
  PRIMARY KEY (ciclo_id, caso_prueba_id)
);

CREATE INDEX IF NOT EXISTS idx_ccp_ciclo ON ciclo_casos_planificados(ciclo_id);
