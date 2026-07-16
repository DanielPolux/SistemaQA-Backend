-- Migración: corregir constraint UNIQUE global en casos_prueba.codigo_cp
-- El código es único POR PROYECTO, no globalmente.
-- Ejecutar en Supabase SQL Editor (y en cualquier DB local ya inicializada).

-- 1. Eliminar el constraint global existente
ALTER TABLE casos_prueba
  DROP CONSTRAINT IF EXISTS casos_prueba_codigo_cp_key;

-- 2. Eliminar índices parciales redundantes si existen
DROP INDEX IF EXISTS uq_casos_proyecto_codigo;
DROP INDEX IF EXISTS uq_casos_prueba_proyecto_codigo;

-- 3. Agregar constraint compuesto único por proyecto
ALTER TABLE casos_prueba
  ADD CONSTRAINT uq_caso_prueba_proyecto_codigo UNIQUE (proyecto_id, codigo_cp);
