-- ============================================================
--  15_fix_tipo_caso_prueba_no_funcional.sql
--  Agrega 'No Funcional' al enum tipo_caso_prueba (Tipo de Prueba de
--  Casos de Prueba). Ya existía para tipo_requerimiento pero faltaba
--  aquí, por lo que la carga masiva desde Excel lo rechazaba.
--
--  ALTER TYPE ... ADD VALUE no se puede ejecutar dentro de un bloque
--  de transacción explícito en versiones de Postgres < 12, pero sí
--  como sentencia suelta (autocommit) — que es como se ejecuta este
--  archivo vía `psql -f`.
-- ============================================================

ALTER TYPE tipo_caso_prueba ADD VALUE IF NOT EXISTS 'No Funcional';
