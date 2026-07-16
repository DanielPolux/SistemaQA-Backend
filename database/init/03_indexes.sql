-- =============================================================
-- SCRIPT 03: Índices para optimización de consultas
-- Sistema QA - PostgreSQL
-- =============================================================

-- Requerida para índices GIN de búsqueda de texto aproximado
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios(email);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol
  ON usuarios(rol);

CREATE INDEX IF NOT EXISTS idx_usuarios_activo
  ON usuarios(activo);

-- ---------------------------------------------------------------
-- usuario_roles
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuario_roles_usuario_id
  ON usuario_roles(usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuario_roles_proyecto_id
  ON usuario_roles(proyecto_id)
  WHERE proyecto_id IS NOT NULL;

-- ---------------------------------------------------------------
-- proyectos
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proyectos_estado
  ON proyectos(estado);

CREATE INDEX IF NOT EXISTS idx_proyectos_cliente
  ON proyectos(cliente);

CREATE INDEX IF NOT EXISTS idx_proyectos_jefe_proyecto_id
  ON proyectos(jefe_proyecto_id);

CREATE INDEX IF NOT EXISTS idx_proyectos_jefe_qa_id
  ON proyectos(jefe_qa_id);

CREATE INDEX IF NOT EXISTS idx_proyectos_responsable_qa_id
  ON proyectos(responsable_qa_id)
  WHERE responsable_qa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proyectos_creado_en
  ON proyectos(creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_proyectos_porcentaje_avance
  ON proyectos(porcentaje_avance);

-- ---------------------------------------------------------------
-- requerimientos
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_requerimientos_proyecto_id
  ON requerimientos(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_requerimientos_codigo
  ON requerimientos(codigo);

CREATE INDEX IF NOT EXISTS idx_requerimientos_estado
  ON requerimientos(estado);

CREATE INDEX IF NOT EXISTS idx_requerimientos_tipo
  ON requerimientos(tipo);

CREATE INDEX IF NOT EXISTS idx_requerimientos_prioridad
  ON requerimientos(prioridad);

-- Búsqueda de texto en título y código
CREATE INDEX IF NOT EXISTS idx_requerimientos_titulo_trgm
  ON requerimientos USING gin(titulo gin_trgm_ops)
  WHERE LENGTH(titulo) > 0;

-- ---------------------------------------------------------------
-- casos_prueba
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_casos_prueba_proyecto_id
  ON casos_prueba(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_casos_prueba_requerimiento_id
  ON casos_prueba(requerimiento_id)
  WHERE requerimiento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_casos_prueba_estado
  ON casos_prueba(estado);

CREATE INDEX IF NOT EXISTS idx_casos_prueba_resultado
  ON casos_prueba(resultado);

CREATE INDEX IF NOT EXISTS idx_casos_prueba_tipo
  ON casos_prueba(tipo);

CREATE INDEX IF NOT EXISTS idx_casos_prueba_prioridad
  ON casos_prueba(prioridad);

CREATE INDEX IF NOT EXISTS idx_casos_prueba_responsable_qa_id
  ON casos_prueba(responsable_qa_id)
  WHERE responsable_qa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_casos_prueba_fecha_ejecucion
  ON casos_prueba(fecha_ejecucion DESC)
  WHERE fecha_ejecucion IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_casos_prueba_requerimiento_rf
  ON casos_prueba(requerimiento_rf)
  WHERE requerimiento_rf IS NOT NULL;

-- ---------------------------------------------------------------
-- defectos
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_defectos_proyecto_id
  ON defectos(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_defectos_caso_prueba_id
  ON defectos(caso_prueba_id);

CREATE INDEX IF NOT EXISTS idx_defectos_requerimiento_id
  ON defectos(requerimiento_id)
  WHERE requerimiento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_defectos_codigo
  ON defectos(codigo);

CREATE INDEX IF NOT EXISTS idx_defectos_estado
  ON defectos(estado);

CREATE INDEX IF NOT EXISTS idx_defectos_severidad
  ON defectos(severidad);

CREATE INDEX IF NOT EXISTS idx_defectos_prioridad
  ON defectos(prioridad);

CREATE INDEX IF NOT EXISTS idx_defectos_asignado_a
  ON defectos(asignado_a)
  WHERE asignado_a IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_defectos_reportado_por
  ON defectos(reportado_por);

CREATE INDEX IF NOT EXISTS idx_defectos_creado_en
  ON defectos(creado_en DESC);

-- ---------------------------------------------------------------
-- comentarios_defecto
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_comentarios_defecto_defecto_id
  ON comentarios_defecto(defecto_id);

CREATE INDEX IF NOT EXISTS idx_comentarios_defecto_usuario_id
  ON comentarios_defecto(usuario_id);

-- ---------------------------------------------------------------
-- Índices compuestos para filtros frecuentes combinados
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_defectos_proyecto_estado
  ON defectos(proyecto_id, estado);

CREATE INDEX IF NOT EXISTS idx_casos_prueba_proyecto_estado
  ON casos_prueba(proyecto_id, estado);

CREATE INDEX IF NOT EXISTS idx_requerimientos_proyecto_estado
  ON requerimientos(proyecto_id, estado);

-- Índice parcial: defectos abiertos por responsable (usado en dashboard y filtros frecuentes)
CREATE INDEX IF NOT EXISTS idx_defectos_asignado_abiertos
  ON defectos(asignado_a)
  WHERE estado NOT IN ('Cerrado', 'Resuelto', 'Rechazado');

-- ---------------------------------------------------------------
-- NOTA: Los índices gin_trgm_ops requieren la extensión pg_trgm.
-- Activarla con: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Si no se desea instalar, eliminar los índices *_trgm de arriba.
-- ---------------------------------------------------------------
