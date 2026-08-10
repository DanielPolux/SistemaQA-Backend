-- =============================================================
-- SCRIPT 02: Creación de tablas
-- Sistema QA - PostgreSQL
-- Orden de creación respeta dependencias (FK)
-- =============================================================

-- ---------------------------------------------------------------
-- TABLA: usuarios
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             SERIAL                PRIMARY KEY,
  nombre         VARCHAR(100)          NOT NULL,
  apellido       VARCHAR(100)          NOT NULL,
  email          VARCHAR(255)          NOT NULL UNIQUE,
  password       TEXT                  NOT NULL,
  rol            rol_usuario           NOT NULL DEFAULT 'QA Tester',
  activo         BOOLEAN               NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  usuarios              IS 'Usuarios del sistema QA';
COMMENT ON COLUMN usuarios.password     IS 'Hash bcrypt (10 rondas)';
COMMENT ON COLUMN usuarios.rol          IS 'Rol global del usuario';
COMMENT ON COLUMN usuarios.activo       IS 'FALSE = cuenta deshabilitada';

-- ---------------------------------------------------------------
-- TABLA: usuario_roles
-- Roles adicionales por proyecto (opcional)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario_roles (
  id          SERIAL        PRIMARY KEY,
  usuario_id  INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol         rol_usuario   NOT NULL,
  proyecto_id INTEGER,                  -- NULL = rol global
  creado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  usuario_roles             IS 'Roles contextuales por proyecto';
COMMENT ON COLUMN usuario_roles.proyecto_id IS 'NULL indica rol global, no ligado a proyecto';

-- ---------------------------------------------------------------
-- TABLA: proyectos
-- Estructura basada en lista SharePoint "Seguimiento Proyectos"
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proyectos (
  id                       SERIAL          PRIMARY KEY,
  -- Campos base (SharePoint)
  proyecto                 VARCHAR(200),                              -- Categoría / etiqueta del proyecto
  nombre                   VARCHAR(200)    NOT NULL,                  -- "Nombre Proyecto" (requerido)
  cliente                  VARCHAR(200)    NOT NULL,                  -- "Cliente" (requerido)
  codigo                   VARCHAR(20)     UNIQUE,                    -- Código interno del sistema
  responsable_qa_id        INTEGER         REFERENCES usuarios(id) ON DELETE SET NULL,
  estado                   estado_proyecto NOT NULL DEFAULT 'Por estimar',
  -- Fechas (SharePoint)
  fecha_inicio_planificada DATE,
  fecha_fin_planificada    DATE,
  fecha_inicio_real        DATE,
  fecha_fin_real           DATE,
  fecha_estimacion         DATE,
  -- Métricas
  porcentaje_avance        NUMERIC(5,2)    NOT NULL DEFAULT 0        CHECK (porcentaje_avance BETWEEN 0 AND 100),
  horas_qa                 NUMERIC(8,2),
  -- Información adicional
  repositorio_url          VARCHAR(500),
  notas                    TEXT,
  sistema                  VARCHAR(200),
  -- Personas clave (SharePoint)
  jefe_proyecto_id         INTEGER         NOT NULL REFERENCES usuarios(id),
  jefe_qa_id               INTEGER         NOT NULL REFERENCES usuarios(id),
  -- Auditoría
  creado_por               INTEGER         NOT NULL REFERENCES usuarios(id),
  creado_en                TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  actualizado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  proyectos                         IS 'Proyectos de QA — estructura basada en SharePoint Seguimiento Proyectos';
COMMENT ON COLUMN proyectos.proyecto                IS 'Categoría o etiqueta del proyecto (campo "Proyecto" de SharePoint)';
COMMENT ON COLUMN proyectos.nombre                  IS 'Nombre completo del proyecto (campo "Nombre Proyecto" de SharePoint)';
COMMENT ON COLUMN proyectos.codigo                  IS 'Código corto único del sistema (ej: PWC-2024)';
COMMENT ON COLUMN proyectos.porcentaje_avance       IS '% de avance del proyecto, entre 0 y 100';
COMMENT ON COLUMN proyectos.repositorio_url         IS 'URL del repositorio de código fuente';
COMMENT ON COLUMN proyectos.fecha_inicio_planificada IS 'Fecha de inicio según la planificación';
COMMENT ON COLUMN proyectos.fecha_fin_planificada   IS 'Fecha de fin según la planificación';
COMMENT ON COLUMN proyectos.fecha_inicio_real       IS 'Fecha de inicio real de la ejecución';
COMMENT ON COLUMN proyectos.fecha_fin_real          IS 'Fecha de fin real de la ejecución';

-- ---------------------------------------------------------------
-- TABLA: requerimientos
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requerimientos (
  id                   SERIAL                  PRIMARY KEY,
  proyecto_id          INTEGER                 NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  codigo               VARCHAR(30)             NOT NULL,
  titulo               VARCHAR(300)            NOT NULL,
  descripcion          TEXT                    NOT NULL,
  criterios_aceptacion TEXT                    NOT NULL,
  tipo                 tipo_requerimiento      NOT NULL,
  prioridad            prioridad_requerimiento NOT NULL,
  estado               estado_requerimiento    NOT NULL DEFAULT 'Pendiente',
  creado_por           INTEGER                 NOT NULL REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  actualizado_en       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_requerimiento_proyecto_codigo UNIQUE (proyecto_id, codigo)
);

COMMENT ON TABLE  requerimientos        IS 'Requerimientos funcionales y no funcionales por proyecto';
COMMENT ON COLUMN requerimientos.codigo IS 'Código único del requerimiento (ej: REQ-001)';

-- ---------------------------------------------------------------
-- TABLA: casos_prueba
-- Estructura basada en lista SharePoint "Casos de prueba Proyectos"
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS casos_prueba (
  id                   SERIAL                  PRIMARY KEY,
  -- Identificación (SharePoint)
  codigo_cp            VARCHAR(30),                                               -- "Codigo CP"
  nombre               VARCHAR(300)            NOT NULL,                          -- "Nombre del Caso de Prueba"
  proyecto_id          INTEGER                 NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,  -- "Proyecto"
  clave_proyecto       VARCHAR(50),                                               -- "ClaveProyecto"
  -- Clasificación
  tipo                 tipo_caso_prueba        NOT NULL,                          -- "Tipo de Prueba"
  descripcion          TEXT                    NOT NULL,                          -- "Descripción del Caso de Prueba"
  prioridad            prioridad_caso_prueba   NOT NULL,                          -- "Prioridad"
  estado               estado_caso_prueba      NOT NULL DEFAULT 'Pendiente',      -- "Estado QA"
  resultado            resultado_caso_prueba   DEFAULT 'Sin Ejecutar',            -- "Resultado"
  -- Ejecución
  resultado_esperado   TEXT                    NOT NULL,                          -- "Resultado Esperado"
  responsable_qa_id    INTEGER                 REFERENCES usuarios(id) ON DELETE SET NULL,  -- "Responsable QA"
  fecha_ejecucion      TIMESTAMPTZ,                                               -- "Fecha Ejecución"
  evidencia_url        VARCHAR(500),                                              -- "Evidencia"
  observaciones        TEXT,                                                      -- "Observaciones"
  pasos                JSONB                   NOT NULL DEFAULT '[]',             -- "Pasos de Prueba"
  -- Requerimiento
  requerimiento_rf     VARCHAR(50),                                               -- "Requerimiento RF" (código texto)
  requerimiento_id     INTEGER                 REFERENCES requerimientos(id) ON DELETE SET NULL,  -- "RF" (búsqueda)
  -- Auditoría
  creado_por           INTEGER                 NOT NULL REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  actualizado_en       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_caso_prueba_proyecto_codigo UNIQUE (proyecto_id, codigo_cp)
);

COMMENT ON TABLE  casos_prueba                    IS 'Casos de prueba — estructura basada en SharePoint "Casos de prueba Proyectos"';
COMMENT ON COLUMN casos_prueba.pasos              IS 'Array JSON estructurado: [{orden, descripcion, resultadoEsperado}]';
COMMENT ON COLUMN casos_prueba.resultado          IS 'Resultado de la ejecución, independiente del estado';
COMMENT ON COLUMN casos_prueba.requerimiento_rf   IS 'Código texto del RF (ej: REQ-001), para referencia rápida';
COMMENT ON COLUMN casos_prueba.evidencia_url      IS 'URL de captura o evidencia de la ejecución del caso';

-- ---------------------------------------------------------------
-- TABLA: defectos
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS defectos (
  id                 SERIAL              PRIMARY KEY,
  proyecto_id        INTEGER             NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  caso_prueba_id     INTEGER             NOT NULL REFERENCES casos_prueba(id) ON DELETE RESTRICT,
  requerimiento_id   INTEGER             REFERENCES requerimientos(id) ON DELETE SET NULL,
  codigo             VARCHAR(30)         UNIQUE,
  codigo_proyecto    VARCHAR(30),
  titulo             VARCHAR(300)        NOT NULL,
  descripcion        TEXT                NOT NULL,
  pasos_reproduccion TEXT                NOT NULL,
  resultado_obtenido TEXT                NOT NULL,
  resultado_esperado TEXT                NOT NULL,
  ambiente           ambiente_defecto    NOT NULL,
  version            VARCHAR(50)         NOT NULL,
  severidad          severidad_defecto   NOT NULL,
  prioridad          prioridad_defecto   NOT NULL,
  estado             estado_defecto      NOT NULL DEFAULT 'Nuevo',
  asignado_a              INTEGER             REFERENCES usuarios(id) ON DELETE SET NULL,
  reportado_por           INTEGER             NOT NULL REFERENCES usuarios(id),
  fecha_resolucion        TIMESTAMPTZ,
  estado_desarrollo       estado_desarrollo,
  comentarios_desarrollo  TEXT,
  creado_en               TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  actualizado_en          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_defecto_proyecto_codigo_proyecto UNIQUE (proyecto_id, codigo_proyecto)
);

COMMENT ON TABLE  defectos                   IS 'Defectos/bugs encontrados durante las pruebas';
COMMENT ON COLUMN defectos.codigo            IS 'Código global único (ej: DEF-0001), auto-generado';
COMMENT ON COLUMN defectos.codigo_proyecto   IS 'Código correlativo por proyecto (ej: INC-001), auto-generado';
COMMENT ON COLUMN defectos.fecha_resolucion  IS 'Se completa al pasar a estado Resuelto o Cerrado';

-- ---------------------------------------------------------------
-- TABLA: comentarios_defecto
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentarios_defecto (
  id          SERIAL      PRIMARY KEY,
  defecto_id  INTEGER     NOT NULL REFERENCES defectos(id) ON DELETE CASCADE,
  usuario_id  INTEGER     NOT NULL REFERENCES usuarios(id),
  comentario  TEXT        NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE comentarios_defecto IS 'Comentarios e historial de cambios de un defecto';

-- ---------------------------------------------------------------
-- Trigger: actualizar columna actualizado_en automáticamente
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_proyectos_updated
    BEFORE UPDATE ON proyectos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_requerimientos_updated
    BEFORE UPDATE ON requerimientos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_casos_prueba_updated
    BEFORE UPDATE ON casos_prueba
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_defectos_updated
    BEFORE UPDATE ON defectos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
