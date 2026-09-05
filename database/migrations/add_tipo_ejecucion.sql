ALTER TABLE ejecuciones_caso_prueba
  ADD COLUMN IF NOT EXISTS tipo_ejecucion VARCHAR(20) NOT NULL DEFAULT 'Manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_ejecuciones_tipo_ejecucion'
  ) THEN
    ALTER TABLE ejecuciones_caso_prueba
      ADD CONSTRAINT chk_ejecuciones_tipo_ejecucion
      CHECK (tipo_ejecucion IN ('Manual', 'Automatizada'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ejecuciones_tipo_ejecucion
  ON ejecuciones_caso_prueba(tipo_ejecucion);
