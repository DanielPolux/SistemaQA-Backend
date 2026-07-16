-- =============================================================
-- SCRIPT 01: Tipos ENUM personalizados
-- Sistema QA - PostgreSQL
-- =============================================================

-- Ejecutar conectado a la base de datos: sistema_qa

-- ---------------------------------------------------------------
-- Rol de usuario
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM (
    'Administrador',
    'QA Lead',
    'QA Tester',
    'Desarrollador',
    'Project Manager'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Estado de proyecto
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE estado_proyecto AS ENUM (
    'Por estimar',
    'Estimado',
    'Observado',
    'Planificado',
    'En Ejecución',
    'Finalizado',
    'En Produccion'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Tipo de requerimiento
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE tipo_requerimiento AS ENUM (
    'Funcional',
    'No Funcional',
    'Negocio',
    'Técnico'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Prioridad de requerimiento
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE prioridad_requerimiento AS ENUM (
    'Crítica',
    'Alta',
    'Media',
    'Baja'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Estado de requerimiento
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE estado_requerimiento AS ENUM (
    'Pendiente',
    'En Análisis',
    'Aprobado',
    'En Desarrollo',
    'Completado',
    'Rechazado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Tipo de caso de prueba
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE tipo_caso_prueba AS ENUM (
    'Funcional',
    'Regresión',
    'Humo',
    'Integración',
    'Rendimiento',
    'Seguridad',
    'Usabilidad'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Prioridad de caso de prueba
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE prioridad_caso_prueba AS ENUM (
    'Alta',
    'Media',
    'Baja'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Estado QA del caso de prueba (SharePoint: "Estado QA")
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE estado_caso_prueba AS ENUM (
    'Pendiente',
    'En Ejecución',
    'Ejecutado',
    'Bloqueado',
    'Omitido'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Resultado de la ejecución del caso (SharePoint: "Resultado")
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE resultado_caso_prueba AS ENUM (
    'Sin Ejecutar',
    'Aprobado',
    'Fallido',
    'Bloqueado',
    'Omitido'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Severidad de defecto
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE severidad_defecto AS ENUM (
    'Crítico',
    'Alto',
    'Medio',
    'Bajo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Prioridad de defecto
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE prioridad_defecto AS ENUM (
    'Urgente',
    'Alta',
    'Media',
    'Baja'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Estado de defecto
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE estado_defecto AS ENUM (
    'Nuevo',
    'Asignado',
    'En Progreso',
    'En Revisión',
    'Resuelto',
    'Cerrado',
    'Reabierto',
    'Rechazado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Ambiente de defecto
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE ambiente_defecto AS ENUM (
    'Desarrollo',
    'QA',
    'Staging',
    'Producción'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Estado de desarrollo de defecto
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE estado_desarrollo AS ENUM (
    'Atendido',
    'No Aplica'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
