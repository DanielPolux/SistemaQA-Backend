-- ============================================================
--  12_fix_defectos_codigo_unique.sql
--  defectos.codigo_proyecto (INC-XXX) se generaba con
--  SELECT COUNT(*) sin ningun constraint que lo respalde -- bajo
--  concurrencia, dos defectos del mismo proyecto podian terminar
--  con el mismo codigo INC-XXX sin que la base de datos lo impidiera.
--  Se agrega el constraint unico (ya sumado a 02_tables.sql para
--  instalaciones nuevas; este script lo aplica a las ya existentes).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_defecto_proyecto_codigo_proyecto'
  ) THEN
    ALTER TABLE defectos
      ADD CONSTRAINT uq_defecto_proyecto_codigo_proyecto UNIQUE (proyecto_id, codigo_proyecto);
  END IF;
END $$;
