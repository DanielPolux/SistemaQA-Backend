-- ============================================================
--  13_fix_ejecuciones_evidencias.sql
--  Agrega la columna "evidencias" (archivos subidos: capturas,
--  videos, logs) a ejecuciones_caso_prueba. Reemplaza el uso de
--  evidencia_url (URL de texto manual) por archivos subidos al
--  propio servidor -- ver UploadsModule.
--  Ya sumado a 06_ejecuciones.sql para instalaciones nuevas; este
--  script lo aplica a las ya existentes.
-- ============================================================

ALTER TABLE ejecuciones_caso_prueba
  ADD COLUMN IF NOT EXISTS evidencias JSONB NOT NULL DEFAULT '[]';
