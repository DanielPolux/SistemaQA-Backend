-- ─── Tabla de Catálogos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogos (
  id          SERIAL PRIMARY KEY,
  grupo       VARCHAR(60)  NOT NULL,
  codigo      VARCHAR(80)  NOT NULL,
  nombre      VARCHAR(120) NOT NULL,
  descripcion TEXT,
  orden       INTEGER      NOT NULL DEFAULT 0,
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  sistema         BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_catalogo_grupo_codigo UNIQUE (grupo, codigo)
);

CREATE INDEX IF NOT EXISTS idx_catalogos_grupo ON catalogos (grupo);

-- ─── Seed: valores del sistema ─────────────────────────────────────────────
INSERT INTO catalogos (grupo, codigo, nombre, descripcion, orden, sistema) VALUES

-- Estado de Defecto
('ESTADO_DEFECTO', 'Nuevo',        'Nuevo',        'Defecto recién reportado, sin asignar.',                        1, TRUE),
('ESTADO_DEFECTO', 'Asignado',     'Asignado',     'Defecto asignado a un desarrollador.',                          2, TRUE),
('ESTADO_DEFECTO', 'En Progreso',  'En Progreso',  'El desarrollador está trabajando en la corrección.',            3, TRUE),
('ESTADO_DEFECTO', 'En Revisión',  'En Revisión',  'La corrección está siendo verificada por QA.',                  4, TRUE),
('ESTADO_DEFECTO', 'Resuelto',     'Resuelto',     'La corrección fue verificada y aprobada por QA.',               5, TRUE),
('ESTADO_DEFECTO', 'Cerrado',      'Cerrado',       'Defecto cerrado formalmente.',                                  6, TRUE),
('ESTADO_DEFECTO', 'Reabierto',    'Reabierto',    'Defecto reabierto porque la corrección no fue efectiva.',       7, TRUE),
('ESTADO_DEFECTO', 'Rechazado',    'Rechazado',    'Defecto descartado por no ser válido o no reproducible.',       8, TRUE),

-- Severidad de Defecto
('SEVERIDAD_DEFECTO', 'Crítico', 'Crítico', 'El sistema no puede operar. Impacto total en producción.',   1, TRUE),
('SEVERIDAD_DEFECTO', 'Alto',    'Alto',    'Funcionalidad clave afectada sin solución alternativa.',     2, TRUE),
('SEVERIDAD_DEFECTO', 'Medio',   'Medio',   'Funcionalidad afectada con solución alternativa disponible.',3, TRUE),
('SEVERIDAD_DEFECTO', 'Bajo',    'Bajo',    'Problema menor que no impacta el flujo principal.',         4, TRUE),

-- Prioridad de Defecto
('PRIORIDAD_DEFECTO', 'Urgente', 'Urgente', 'Debe corregirse de inmediato.',                              1, TRUE),
('PRIORIDAD_DEFECTO', 'Alta',    'Alta',    'Debe corregirse en el sprint actual.',                       2, TRUE),
('PRIORIDAD_DEFECTO', 'Media',   'Media',   'Puede corregirse en el siguiente sprint.',                   3, TRUE),
('PRIORIDAD_DEFECTO', 'Baja',    'Baja',    'Puede planificarse para una versión futura.',                4, TRUE),

-- Estado de Caso de Prueba
('ESTADO_CASO_PRUEBA', 'Pendiente',    'Pendiente',    'El caso aún no ha sido ejecutado.',                     1, TRUE),
('ESTADO_CASO_PRUEBA', 'En Ejecución', 'En Ejecución', 'El caso está siendo ejecutado actualmente.',            2, TRUE),
('ESTADO_CASO_PRUEBA', 'Ejecutado',    'Ejecutado',    'El caso fue ejecutado al menos una vez.',               3, TRUE),
('ESTADO_CASO_PRUEBA', 'Bloqueado',    'Bloqueado',    'No puede ejecutarse por un impedimento externo.',       4, TRUE),
('ESTADO_CASO_PRUEBA', 'Omitido',      'Omitido',      'El caso fue excluido del ciclo de prueba actual.',     5, TRUE),

-- Resultado de Caso de Prueba
('RESULTADO_CASO_PRUEBA', 'Sin Ejecutar', 'Sin Ejecutar', 'El caso no tiene ejecuciones registradas.',          1, TRUE),
('RESULTADO_CASO_PRUEBA', 'Aprobado',     'Aprobado',     'El caso pasó todas las verificaciones.',             2, TRUE),
('RESULTADO_CASO_PRUEBA', 'Fallido',      'Fallido',      'El caso encontró una o más fallas.',                 3, TRUE),
('RESULTADO_CASO_PRUEBA', 'Bloqueado',    'Bloqueado',    'La ejecución fue bloqueada por un impedimento.',     4, TRUE),
('RESULTADO_CASO_PRUEBA', 'Omitido',      'Omitido',      'El caso fue omitido en este ciclo.',                 5, TRUE),

-- Resultado de Ejecución
('RESULTADO_EJECUCION', 'Aprobado',  'Aprobado',  'La ejecución pasó todas las verificaciones.',               1, TRUE),
('RESULTADO_EJECUCION', 'Fallido',   'Fallido',   'La ejecución encontró fallas.',                             2, TRUE),
('RESULTADO_EJECUCION', 'Bloqueado', 'Bloqueado', 'La ejecución no pudo completarse por un impedimento.',      3, TRUE),
('RESULTADO_EJECUCION', 'Omitido',   'Omitido',   'La ejecución fue omitida intencionalmente.',                4, TRUE),

-- Tipo de Prueba
('TIPO_PRUEBA', 'Funcional',   'Funcional',   'Verifica que el sistema cumple los requisitos funcionales.',  1, TRUE),
('TIPO_PRUEBA', 'Regresión',   'Regresión',   'Verifica que cambios recientes no rompieron funcionalidad.', 2, TRUE),
('TIPO_PRUEBA', 'Integración', 'Integración', 'Verifica la interacción entre componentes o sistemas.',      3, TRUE),
('TIPO_PRUEBA', 'Rendimiento', 'Rendimiento', 'Evalúa el comportamiento bajo carga.',                       4, TRUE),
('TIPO_PRUEBA', 'Seguridad',   'Seguridad',   'Verifica que el sistema esté protegido contra amenazas.',    5, TRUE),
('TIPO_PRUEBA', 'Usabilidad',  'Usabilidad',  'Evalúa la facilidad de uso por parte del usuario.',         6, TRUE),
('TIPO_PRUEBA', 'Humo',        'Humo',        'Verificación rápida de funcionalidad básica.',               7, TRUE),

-- Prioridad de Caso de Prueba
('PRIORIDAD_CASO_PRUEBA', 'Alta',  'Alta',  'Caso crítico que debe ejecutarse en cada ciclo.',             1, TRUE),
('PRIORIDAD_CASO_PRUEBA', 'Media', 'Media', 'Caso importante para la cobertura completa.',                 2, TRUE),
('PRIORIDAD_CASO_PRUEBA', 'Baja',  'Baja',  'Caso de menor prioridad, ejecutar si el tiempo lo permite.', 3, TRUE),

-- Estado de Proyecto
('ESTADO_PROYECTO', 'Por estimar',  'Por estimar',  'El proyecto está pendiente de estimación.',               1, TRUE),
('ESTADO_PROYECTO', 'Estimado',     'Estimado',     'El proyecto ha sido estimado y está listo para planificar.',2, TRUE),
('ESTADO_PROYECTO', 'Observado',    'Observado',    'El proyecto está bajo observación o revisión.',           3, TRUE),
('ESTADO_PROYECTO', 'Planificado',  'Planificado',  'El proyecto tiene plan definido y está por iniciar.',     4, TRUE),
('ESTADO_PROYECTO', 'En Ejecución', 'En Ejecución', 'El proyecto está en fase de ejecución activa.',           5, TRUE),
('ESTADO_PROYECTO', 'Finalizado',   'Finalizado',   'El proyecto ha concluido.',                               6, TRUE),
('ESTADO_PROYECTO', 'En Produccion','En Produccion','El proyecto está desplegado en producción.',              7, TRUE),

-- Estado de Desarrollo (seguimiento desde el lado dev)
('ESTADO_DESARROLLO', 'Atendido',  'Atendido',  'El desarrollador marcó el defecto como atendido.',        1, TRUE),
('ESTADO_DESARROLLO', 'No Aplica', 'No Aplica', 'El defecto no requiere acción del equipo de desarrollo.', 2, TRUE),

-- Ambiente de Ejecución
('AMBIENTE_EJECUCION', 'Desarrollo',  'Desarrollo',  'Entorno local o de desarrollo.',                      1, TRUE),
('AMBIENTE_EJECUCION', 'QA',          'QA',          'Entorno de pruebas de calidad.',                      2, TRUE),
('AMBIENTE_EJECUCION', 'Staging',     'Staging',     'Entorno pre-producción.',                             3, TRUE),
('AMBIENTE_EJECUCION', 'Producción',  'Producción',  'Entorno productivo real.',                            4, TRUE),

-- Rol de Usuario
('ROL_USUARIO', 'Administrador',    'Administrador',    'Acceso total al sistema incluyendo gestión de usuarios.', 1, TRUE),
('ROL_USUARIO', 'QA Lead',          'QA Lead',          'Gestiona el equipo QA y tiene acceso CRUD completo.',    2, TRUE),
('ROL_USUARIO', 'QA Tester',        'QA Tester',        'Ejecuta casos de prueba y reporta defectos.',            3, TRUE),
('ROL_USUARIO', 'Desarrollador',    'Desarrollador',    'Visualiza y gestiona defectos que le son asignados.',    4, TRUE),
('ROL_USUARIO', 'Project Manager',  'Project Manager',  'Gestiona proyectos y tiene visibilidad sobre el avance.',5, TRUE)

ON CONFLICT (grupo, codigo) DO NOTHING;
