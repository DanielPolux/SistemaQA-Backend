-- ============================================================
--  14_fix_proyectos_archivo.sql
--  Fase 3 (archivar proyecto y liberar espacio): agrega las columnas
--  que registran cuándo y quién purgó los archivos de evidencia del
--  proyecto. Solo se borran los ARCHIVOS (disco) -- las filas de
--  ejecuciones/defectos y sus columnas `evidencias` (JSONB con
--  nombre/url) se conservan intactas para no perder historial.
-- ============================================================

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS evidencias_archivadas_en  TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS evidencias_archivadas_por INTEGER NULL REFERENCES usuarios(id);
