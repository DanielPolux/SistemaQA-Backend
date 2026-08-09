-- =============================================================
-- SCRIPT 04: Datos iniciales (seed)
-- Sistema QA - PostgreSQL
-- =============================================================
--
-- IMPORTANTE - Contraseñas:
-- Las contraseñas están hasheadas con bcrypt (10 rondas).
-- Para generar un hash nuevo ejecutar en la carpeta del backend:
--   node -e "require('bcrypt').hash('TuPassword', 10).then(h => console.log(h))"
--
-- Hashes incluidos:
--   Admin123!  → usuario administrador
--   Tester123! → usuarios de prueba
-- =============================================================

-- ---------------------------------------------------------------
-- Usuarios iniciales
-- ---------------------------------------------------------------
INSERT INTO usuarios (nombre, apellido, email, password, rol, activo)
VALUES
  (
    'Admin',
    'Sistema',
    'admin@qa.com',
    '$2b$10$4ZpwqbQLj4ecChYWSOJNXen2Dr5cwA3g/aUC47OKaZ6iv5XxEdlfK',  -- Admin123!
    'Administrador',
    TRUE
  ),
  (
    'Carlos',
    'Ramírez',
    'qa.lead@qa.com',
    '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq',  -- Tester123!
    'QA Lead',
    TRUE
  ),
  (
    'María',
    'González',
    'tester1@qa.com',
    '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq',  -- Tester123!
    'QA Tester',
    TRUE
  ),
  (
    'José',
    'Martínez',
    'developer1@qa.com',
    '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq',  -- Tester123!
    'Desarrollador',
    TRUE
  ),
  (
    'Ana',
    'Torres',
    'pm@qa.com',
    '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq',  -- Tester123!
    'Project Manager',
    TRUE
  )
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------
-- Proyecto de demostración
-- ---------------------------------------------------------------
INSERT INTO proyectos (
  proyecto, nombre, cliente, codigo, responsable_qa_id,
  estado,
  fecha_inicio_planificada, fecha_fin_planificada,
  porcentaje_avance, sistema, notas,
  repositorio_url,
  jefe_proyecto_id, jefe_qa_id, creado_por
)
SELECT
  'Portal Corporativo',
  'Portal Web Corporativo',
  'Empresa Demo S.A.',
  'PWC-2024',
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com'),
  'En Ejecución',
  '2024-01-15',
  '2024-06-30',
  45.00,
  'Portal Web',
  'Proyecto de QA para el portal web corporativo.',
  'https://github.com/empresa/portal-web',
  (SELECT id FROM usuarios WHERE email = 'pm@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------
-- Requerimiento de demostración
-- ---------------------------------------------------------------
INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT
  p.id,
  'REQ-001',
  'Login de usuarios con credenciales',
  'El sistema debe permitir a los usuarios autenticarse mediante email y contraseña.',
  'El usuario puede iniciar sesión con credenciales válidas. Se muestra error con credenciales inválidas. La sesión expira a las 24h.',
  'Funcional',
  'Alta',
  'Aprobado',
  u.id
FROM proyectos p, usuarios u
WHERE p.codigo = 'PWC-2024'
  AND u.email  = 'admin@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

-- ---------------------------------------------------------------
-- Caso de prueba de demostración
-- ---------------------------------------------------------------
INSERT INTO casos_prueba (
  codigo_cp, nombre, proyecto_id, clave_proyecto,
  tipo, descripcion, prioridad, estado, resultado,
  resultado_esperado, responsable_qa_id, requerimiento_rf,
  requerimiento_id, pasos, creado_por
)
SELECT
  'CP-001',
  'Login exitoso con credenciales válidas',
  (SELECT id FROM proyectos      WHERE codigo = 'PWC-2024'),
  'PWC-2024',
  'Funcional',
  'Verificar que el usuario puede iniciar sesión correctamente con credenciales válidas.',
  'Alta',
  'Pendiente',
  'Sin Ejecutar',
  'El usuario es redirigido al dashboard y se muestra su nombre en el header.',
  (SELECT id FROM usuarios WHERE email = 'tester1@qa.com'),
  'REQ-001',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-001'),
  '[
    {"orden":1,"descripcion":"Navegar a la página de login","resultadoEsperado":"Se muestra el formulario de login"},
    {"orden":2,"descripcion":"Ingresar email: admin@qa.com","resultadoEsperado":"Campo email completado"},
    {"orden":3,"descripcion":"Ingresar contraseña válida","resultadoEsperado":"Campo password completado"},
    {"orden":4,"descripcion":"Hacer clic en Iniciar Sesión","resultadoEsperado":"Redirección al dashboard principal"}
  ]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;
