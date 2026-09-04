ALTER TABLE ciclos_prueba
  ADD COLUMN IF NOT EXISTS responsable_qa_id INTEGER REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_ciclos_responsable_qa
  ON ciclos_prueba(responsable_qa_id);
