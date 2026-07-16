-- Migración: corregir constraint UNIQUE global en requerimientos.codigo
-- El código es único POR PROYECTO, no globalmente.
-- Ejecutar en Supabase SQL Editor (y en cualquier DB local ya inicializada).

-- 1. Eliminar el constraint global (si existía con nombre por defecto)
ALTER TABLE requerimientos
  DROP CONSTRAINT IF EXISTS requerimientos_codigo_key;

-- 2. Eliminar el índice parcial redundante (creado por migración anterior)
DROP INDEX IF EXISTS uq_reqs_proyecto_codigo;

-- 3. Agregar constraint compuesto único por proyecto
ALTER TABLE requerimientos
  ADD CONSTRAINT uq_requerimiento_proyecto_codigo UNIQUE (proyecto_id, codigo);
