-- ============================================================
--  11_fix_columnas_faltantes.sql
--  Agrega columnas que existen en las entidades TypeORM
--  pero que no estaban en los scripts SQL originales.
--  Ejecutar en Supabase SQL Editor.
-- ============================================================

-- ---- tabla: proyectos ----
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS documento_url             VARCHAR(500),
  ADD COLUMN IF NOT EXISTS documentos_requerimientos JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ruta_sharepoint           VARCHAR(1000);

-- ---- tabla: planes_prueba ----
ALTER TABLE planes_prueba
  ADD COLUMN IF NOT EXISTS sprint      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tipo_prueba VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ambiente    VARCHAR(50);

-- Verificación
SELECT 'proyectos' AS tabla,
       COUNT(*) FILTER (WHERE column_name = 'documento_url')             AS doc_url,
       COUNT(*) FILTER (WHERE column_name = 'documentos_requerimientos') AS docs_req,
       COUNT(*) FILTER (WHERE column_name = 'ruta_sharepoint')           AS ruta_sp
FROM information_schema.columns WHERE table_name = 'proyectos'
UNION ALL
SELECT 'planes_prueba',
       COUNT(*) FILTER (WHERE column_name = 'sprint'),
       COUNT(*) FILTER (WHERE column_name = 'tipo_prueba'),
       COUNT(*) FILTER (WHERE column_name = 'ambiente')
FROM information_schema.columns WHERE table_name = 'planes_prueba';
