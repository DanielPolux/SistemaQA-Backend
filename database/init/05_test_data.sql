-- ================================================================
-- TEST DATA — Sistema QA
-- 5 usuarios · 3 proyectos · 14 requerimientos · 24 casos de prueba
-- Contraseña de todos los usuarios nuevos: Tester123!
-- ================================================================

BEGIN;

-- ================================================================
-- 1. USUARIOS
-- ================================================================
INSERT INTO usuarios (nombre, apellido, email, password, rol, activo) VALUES
  ('Luis',         'Paredes',   'tester2@qa.com',    '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq', 'QA Tester',       TRUE),
  ('Sandra',       'Flores',    'tester3@qa.com',    '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq', 'QA Tester',       TRUE),
  ('Roberto',      'Vega',      'developer2@qa.com', '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq', 'Desarrollador',   TRUE),
  ('Patricia',     'Diaz',      'qa.lead2@qa.com',   '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq', 'QA Lead',         TRUE),
  ('Miguel Angel', 'Santos',    'pm2@qa.com',        '$2b$10$PooaICehkyS1jqiRqQ8NH.AkdIfhJjgSBn.pDc2iA1Geid66fjmSq', 'Project Manager', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- 2. PROYECTOS
-- ================================================================

-- Proyecto 2: E-Commerce
INSERT INTO proyectos (
  proyecto, nombre, cliente, codigo, responsable_qa_id, estado,
  fecha_inicio_planificada, fecha_fin_planificada, fecha_inicio_real,
  porcentaje_avance, sistema, notas, repositorio_url,
  jefe_proyecto_id, jefe_qa_id, creado_por
)
SELECT
  'E-Commerce',
  'Plataforma de E-Commerce B2C',
  'RetailMax Peru S.A.C.',
  'ECM-2024',
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com'),
  'En Ejecución',
  '2024-03-01', '2024-09-30', '2024-03-05',
  62.00,
  'Plataforma Web E-Commerce',
  'Proyecto QA para la plataforma de ventas en linea. Iteracion 3 en curso.',
  'https://github.com/retailmax/ecommerce',
  (SELECT id FROM usuarios WHERE email = 'pm@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (codigo) DO NOTHING;

-- Proyecto 3: App Bancaria
INSERT INTO proyectos (
  proyecto, nombre, cliente, codigo, responsable_qa_id, estado,
  fecha_inicio_planificada, fecha_fin_planificada,
  porcentaje_avance, sistema, notas, repositorio_url,
  jefe_proyecto_id, jefe_qa_id, creado_por
)
SELECT
  'Banca Digital',
  'App Bancaria Movil v2.0',
  'BancoNacion Digital',
  'ABM-2025',
  (SELECT id FROM usuarios WHERE email = 'qa.lead2@qa.com'),
  'Planificado',
  '2025-02-01', '2025-08-31',
  8.00,
  'Aplicacion Movil iOS/Android',
  'Nueva version de la app bancaria con autenticacion biometrica y pagos QR.',
  'https://github.com/banconacion/app-movil',
  (SELECT id FROM usuarios WHERE email = 'pm2@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'qa.lead2@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (codigo) DO NOTHING;

-- Proyecto 4: Migracion ERP (completado)
INSERT INTO proyectos (
  proyecto, nombre, cliente, codigo, responsable_qa_id, estado,
  fecha_inicio_planificada, fecha_fin_planificada, fecha_inicio_real, fecha_fin_real,
  porcentaje_avance, sistema, notas, repositorio_url,
  jefe_proyecto_id, jefe_qa_id, creado_por
)
SELECT
  'ERP',
  'Migracion Sistema ERP Legacy',
  'Corporacion Industrial S.A.',
  'ERP-2024',
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com'),
  'Finalizado',
  '2024-01-10', '2024-11-30', '2024-01-15', '2024-11-28',
  100.00,
  'Sistema ERP SAP',
  'Migracion completada. Todos los modulos validados en produccion.',
  'https://github.com/corpindustrial/erp-migration',
  (SELECT id FROM usuarios WHERE email = 'pm@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com'),
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (codigo) DO NOTHING;

-- ================================================================
-- 3. REQUERIMIENTOS
-- ================================================================

-- PWC-2024: reqs adicionales
INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-002', 'Gestion de perfil de usuario',
  'El sistema debe permitir a los usuarios visualizar y editar su informacion de perfil.',
  '1. El usuario visualiza todos sus datos. 2. Puede editar nombre y apellido. 3. Los cambios se reflejan de inmediato en el header.',
  'Funcional', 'Alta', 'Aprobado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'PWC-2024' AND u.email = 'admin@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-003', 'Dashboard de metricas QA',
  'El sistema debe mostrar un panel con metricas de calidad del proyecto en tiempo real.',
  '1. Muestra total de casos por estado. 2. Porcentaje aprobados vs fallidos. 3. Grafica de tendencia semanal.',
  'Funcional', 'Media', 'En Análisis', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'PWC-2024' AND u.email = 'admin@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

-- ECM-2024: reqs
INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-E01', 'Registro de nuevos usuarios',
  'El sistema debe permitir que nuevos clientes se registren con email y contrasena.',
  '1. Registro exitoso con datos validos. 2. Error con email duplicado. 3. Contrasena segura (min 8 car, 1 numero, 1 mayuscula). 4. Email de confirmacion enviado.',
  'Funcional', 'Crítica', 'Aprobado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ECM-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-E02', 'Autenticacion y gestion de sesion',
  'El sistema debe autenticar usuarios y gestionar sesiones de forma segura.',
  '1. Login con email/contrasena validos. 2. Error con credenciales incorrectas. 3. Bloqueo tras 5 intentos fallidos. 4. Sesion expira a las 8h de inactividad.',
  'Funcional', 'Crítica', 'Aprobado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ECM-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-E03', 'Catalogo de productos con filtros',
  'Los usuarios deben poder explorar el catalogo y aplicar filtros de busqueda.',
  '1. Listado paginado (20 por pagina). 2. Filtros por categoria, precio y rating. 3. Ordenamiento por precio, novedad y popularidad. 4. Vista de detalle con imagenes y stock.',
  'Funcional', 'Alta', 'Aprobado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ECM-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-E04', 'Carrito de compras',
  'El sistema debe permitir agregar, modificar y eliminar productos del carrito.',
  '1. Agregar producto. 2. Modificar cantidad con validacion de stock. 3. Eliminar producto. 4. Carrito persiste entre sesiones. 5. Subtotal actualizado en tiempo real.',
  'Funcional', 'Crítica', 'Aprobado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ECM-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-E05', 'Pasarela de pago',
  'El sistema debe procesar pagos con tarjeta de credito/debito de forma segura.',
  '1. Pago exitoso con tarjeta valida. 2. Rechazo claro con tarjeta invalida. 3. Comprobante por email. 4. SSL obligatorio. 5. Compatible con Visa, Mastercard y Amex.',
  'Funcional', 'Crítica', 'En Desarrollo', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ECM-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-E06', 'Rendimiento bajo carga',
  'El sistema debe responder dentro de los tiempos maximos bajo carga de 100 usuarios concurrentes.',
  '1. Catalogo carga en < 2s al P95. 2. Proceso de pago < 3s. 3. Busqueda de productos < 1s.',
  'No Funcional', 'Alta', 'Pendiente', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ECM-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

-- ABM-2025: reqs
INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-A01', 'Autenticacion biometrica',
  'La app debe permitir autenticacion mediante huella digital o reconocimiento facial.',
  '1. Registro inicial de biometria. 2. Login con huella valida. 3. Login con Face ID. 4. Fallback a PIN tras 3 fallos biometricos.',
  'Funcional', 'Crítica', 'Aprobado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ABM-2025' AND u.email = 'qa.lead2@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-A02', 'Consulta de saldos y movimientos',
  'El usuario debe poder consultar saldo y los ultimos 90 dias de movimientos de sus cuentas.',
  '1. Saldo actualizado en tiempo real. 2. Movimientos de los ultimos 90 dias. 3. Filtro por fecha y tipo. 4. Descarga de estado de cuenta en PDF.',
  'Funcional', 'Alta', 'En Análisis', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ABM-2025' AND u.email = 'qa.lead2@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-A03', 'Transferencias entre cuentas',
  'El usuario debe poder realizar transferencias a cuentas propias y de terceros del mismo banco.',
  '1. Transferencia exitosa entre cuentas propias. 2. Transferencia a terceros. 3. Error claro por fondos insuficientes. 4. Confirmacion por codigo SMS.',
  'Funcional', 'Crítica', 'Pendiente', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ABM-2025' AND u.email = 'qa.lead2@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

-- ERP-2024: reqs
INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-M01', 'Migracion de datos maestros',
  'Migrar todos los registros maestros del sistema legacy al nuevo ERP sin perdida de datos.',
  '1. 100% de clientes migrados. 2. 100% de productos migrados. 3. Historico de transacciones (5 anos) preservado. 4. Integridad referencial mantenida.',
  'Técnico', 'Crítica', 'Completado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ERP-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

INSERT INTO requerimientos (proyecto_id, codigo, titulo, descripcion, criterios_aceptacion, tipo, prioridad, estado, creado_por)
SELECT p.id, 'REQ-M02', 'Validacion de integridad post-migracion',
  'Verificar que los datos migrados son consistentes e integros al nivel de centavo.',
  '1. Conteos coinciden entre origen y destino. 2. Totales financieros cuadran al centavo. 3. Relaciones FK correctas. 4. Reporte de validacion generado.',
  'Técnico', 'Crítica', 'Completado', u.id
FROM proyectos p, usuarios u WHERE p.codigo = 'ERP-2024' AND u.email = 'qa.lead@qa.com'
ON CONFLICT (proyecto_id, codigo) DO NOTHING;

-- ================================================================
-- 4. CASOS DE PRUEBA
-- ================================================================

-- ---- PWC-2024 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-002', 'Login fallido con contrasena incorrecta',
  (SELECT id FROM proyectos WHERE codigo = 'PWC-2024'), 'PWC-2024',
  'Funcional', 'Verificar que el sistema rechaza el acceso con contrasena incorrecta mostrando error descriptivo.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Se muestra "Credenciales incorrectas" y no se permite el acceso.',
  (SELECT id FROM usuarios WHERE email = 'tester1@qa.com'), 'REQ-001',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-001'),
  '[{"orden":1,"descripcion":"Navegar al login","resultadoEsperado":"Formulario visible"},{"orden":2,"descripcion":"Ingresar email valido y contrasena incorrecta: Wrong123","resultadoEsperado":"Campos completados"},{"orden":3,"descripcion":"Clic en Iniciar Sesion","resultadoEsperado":"Error: Credenciales incorrectas"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-003', 'Login con campo email vacio',
  (SELECT id FROM proyectos WHERE codigo = 'PWC-2024'), 'PWC-2024',
  'Funcional', 'Verificar que el sistema valida el campo email como obligatorio antes de enviar.',
  'Media', 'Ejecutado', 'Aprobado',
  'El formulario no se envia y muestra validacion "Email es requerido".',
  (SELECT id FROM usuarios WHERE email = 'tester1@qa.com'), 'REQ-001',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-001'),
  '[{"orden":1,"descripcion":"Navegar al login","resultadoEsperado":"Formulario visible"},{"orden":2,"descripcion":"Dejar email vacio, ingresar contrasena","resultadoEsperado":"Solo password completado"},{"orden":3,"descripcion":"Clic en Iniciar Sesion","resultadoEsperado":"Validacion: Email es requerido"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-004', 'Edicion exitosa de perfil de usuario',
  (SELECT id FROM proyectos WHERE codigo = 'PWC-2024'), 'PWC-2024',
  'Funcional', 'Verificar que el usuario puede actualizar su nombre y apellido desde Mi Perfil.',
  'Media', 'Ejecutado', 'Aprobado',
  'Cambios guardados y reflejados inmediatamente en el header.',
  (SELECT id FROM usuarios WHERE email = 'tester1@qa.com'), 'REQ-002',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-002'),
  '[{"orden":1,"descripcion":"Navegar a Mi Perfil","resultadoEsperado":"Formulario con datos actuales"},{"orden":2,"descripcion":"Cambiar apellido a Garcia","resultadoEsperado":"Campo editado"},{"orden":3,"descripcion":"Guardar cambios","resultadoEsperado":"Perfil actualizado. Header muestra nuevo apellido."}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'admin@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ECM-2024 / REQ-E01 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E01', 'Registro exitoso con datos validos',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que un nuevo usuario puede registrarse con todos los datos validos.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Usuario creado, email de confirmacion enviado y redireccion al login.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-E01',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E01'),
  '[{"orden":1,"descripcion":"Navegar a Registro","resultadoEsperado":"Formulario visible"},{"orden":2,"descripcion":"Ingresar nombre, email y contrasena Segura123!","resultadoEsperado":"Campos completados"},{"orden":3,"descripcion":"Confirmar contrasena y hacer clic en Registrar","resultadoEsperado":"Registro exitoso y email de confirmacion enviado"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E02', 'Registro con email ya registrado',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que el sistema rechaza el registro si el email ya existe en la base de datos.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Error claro: "El email ya esta registrado". No se crea cuenta duplicada.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-E01',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E01'),
  '[{"orden":1,"descripcion":"Ingresar email existente en el formulario de registro","resultadoEsperado":"Formulario completo"},{"orden":2,"descripcion":"Clic en Registrar","resultadoEsperado":"Error: Email ya registrado"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E03', 'Registro con contrasena debil',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que se rechaza una contrasena que no cumple la politica de seguridad.',
  'Media', 'Ejecutado', 'Fallido',
  'El sistema muestra los requisitos de contrasena y bloquea el registro.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-E01',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E01'),
  '[{"orden":1,"descripcion":"Ingresar contrasena debil: 12345","resultadoEsperado":"Campo completado"},{"orden":2,"descripcion":"Clic en Registrar","resultadoEsperado":"Error: La contrasena no cumple los requisitos minimos"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ECM-2024 / REQ-E02 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E04', 'Login exitoso en e-commerce',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que un usuario registrado puede autenticarse correctamente.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Usuario autenticado y redirigido al home con su nombre en el header.',
  (SELECT id FROM usuarios WHERE email = 'tester3@qa.com'), 'REQ-E02',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E02'),
  '[{"orden":1,"descripcion":"Navegar al login e ingresar credenciales validas","resultadoEsperado":"Campos completados"},{"orden":2,"descripcion":"Clic en Iniciar Sesion","resultadoEsperado":"Redireccion al home con sesion activa"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E05', 'Bloqueo tras 5 intentos fallidos de login',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Seguridad', 'Verificar que la cuenta se bloquea temporalmente tras 5 intentos fallidos consecutivos.',
  'Alta', 'En Ejecución', 'Sin Ejecutar',
  'Tras el 5to intento fallido: mensaje de bloqueo y email de desbloqueo enviado.',
  (SELECT id FROM usuarios WHERE email = 'tester3@qa.com'), 'REQ-E02',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E02'),
  '[{"orden":1,"descripcion":"Realizar 5 intentos de login con contrasena incorrecta","resultadoEsperado":"Errores consecutivos"},{"orden":2,"descripcion":"Verificar mensaje en el 5to intento","resultadoEsperado":"Cuenta bloqueada. Revise su email."}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ECM-2024 / REQ-E03 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E06', 'Catalogo paginado: 20 productos por pagina',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que el catalogo muestra exactamente 20 productos por pagina con navegacion correcta.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Se muestran 20 productos por pagina. Pagina 2 muestra los siguientes 20 sin repeticion.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-E03',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E03'),
  '[{"orden":1,"descripcion":"Navegar al catalogo","resultadoEsperado":"Listado visible"},{"orden":2,"descripcion":"Contar productos en pagina 1","resultadoEsperado":"Exactamente 20 productos"},{"orden":3,"descripcion":"Navegar a pagina 2","resultadoEsperado":"Siguientes 20 productos sin repeticion"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E07', 'Filtro por categoria en catalogo',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que el filtro por categoria restringe correctamente los productos mostrados.',
  'Media', 'Ejecutado', 'Aprobado',
  'Solo se muestran productos de la categoria seleccionada tras aplicar el filtro.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-E03',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E03'),
  '[{"orden":1,"descripcion":"Seleccionar categoria Electronica","resultadoEsperado":"Filtro aplicado"},{"orden":2,"descripcion":"Revisar productos listados","resultadoEsperado":"Todos son de Electronica"},{"orden":3,"descripcion":"Cambiar a categoria Ropa","resultadoEsperado":"Lista actualizada solo con Ropa"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ECM-2024 / REQ-E04 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E08', 'Agregar producto al carrito',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que el usuario puede agregar un producto al carrito y el contador se actualiza.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Producto en carrito, contador +1, subtotal correcto.',
  (SELECT id FROM usuarios WHERE email = 'tester3@qa.com'), 'REQ-E04',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E04'),
  '[{"orden":1,"descripcion":"Seleccionar un producto y clic en Agregar al carrito","resultadoEsperado":"Contador de carrito incrementa"},{"orden":2,"descripcion":"Navegar al carrito","resultadoEsperado":"Producto listado con precio correcto"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E09', 'Modificar cantidad en el carrito actualiza subtotal',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que modificar la cantidad en el carrito actualiza el subtotal sin recargar la pagina.',
  'Media', 'Ejecutado', 'Fallido',
  'Subtotal se actualiza en tiempo real al cambiar cantidad. Sin recarga de pagina.',
  (SELECT id FROM usuarios WHERE email = 'tester3@qa.com'), 'REQ-E04',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E04'),
  '[{"orden":1,"descripcion":"Con producto en carrito, cambiar cantidad a 3","resultadoEsperado":"Cantidad = 3"},{"orden":2,"descripcion":"Verificar subtotal","resultadoEsperado":"Subtotal = precio x 3 sin recargar pagina"},{"orden":3,"descripcion":"Cambiar cantidad a 0","resultadoEsperado":"Producto eliminado automaticamente"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ECM-2024 / REQ-E05 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E10', 'Pago exitoso con tarjeta Visa de prueba',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que se puede completar una compra con tarjeta Visa valida en ambiente QA.',
  'Alta', 'Pendiente', 'Sin Ejecutar',
  'Pago aprobado, numero de orden generado, email de confirmacion enviado.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-E05',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E05'),
  '[{"orden":1,"descripcion":"Proceder al checkout con productos en carrito","resultadoEsperado":"Formulario de pago visible"},{"orden":2,"descripcion":"Ingresar tarjeta Visa de prueba: 4111 1111 1111 1111","resultadoEsperado":"Datos de tarjeta ingresados"},{"orden":3,"descripcion":"Confirmar el pago","resultadoEsperado":"Pago aprobado, pagina de confirmacion con numero de orden"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E11', 'Rechazo de pago con tarjeta invalida',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Funcional', 'Verificar que el sistema muestra un error claro cuando la tarjeta es rechazada.',
  'Alta', 'Pendiente', 'Sin Ejecutar',
  'Error descriptivo: Tarjeta rechazada. No se procesa ningun cobro.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-E05',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E05'),
  '[{"orden":1,"descripcion":"Ingresar tarjeta rechazada: 4000 0000 0000 0002","resultadoEsperado":"Datos ingresados"},{"orden":2,"descripcion":"Confirmar el pago","resultadoEsperado":"Error: Tarjeta rechazada. No se realizo ningun cargo."}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ECM-2024 / REQ-E06 (rendimiento) ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-E12', 'Tiempo de carga del catalogo menor a 2 segundos',
  (SELECT id FROM proyectos WHERE codigo = 'ECM-2024'), 'ECM-2024',
  'Rendimiento', 'Medir el tiempo de carga del catalogo con 100 usuarios concurrentes usando JMeter.',
  'Alta', 'Bloqueado', 'Bloqueado',
  'El catalogo carga en menos de 2 segundos al P95 con 100 usuarios concurrentes.',
  (SELECT id FROM usuarios WHERE email = 'tester3@qa.com'), 'REQ-E06',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-E06'),
  '[{"orden":1,"descripcion":"Configurar plan JMeter: 100 hilos, rampa 30s","resultadoEsperado":"Plan configurado"},{"orden":2,"descripcion":"Ejecutar carga contra GET /api/products","resultadoEsperado":"Test en ejecucion"},{"orden":3,"descripcion":"Revisar P95 en el reporte","resultadoEsperado":"P95 < 2000ms"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ABM-2025 / REQ-A01 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-A01', 'Autenticacion exitosa con huella digital',
  (SELECT id FROM proyectos WHERE codigo = 'ABM-2025'), 'ABM-2025',
  'Funcional', 'Verificar que el usuario puede autenticarse usando su huella digital registrada.',
  'Alta', 'Pendiente', 'Sin Ejecutar',
  'App desbloqueada y sesion iniciada tras leer huella valida. Tiempo < 1 segundo.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-A01',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-A01'),
  '[{"orden":1,"descripcion":"Abrir la app bancaria","resultadoEsperado":"Pantalla de autenticacion con opcion biometrica"},{"orden":2,"descripcion":"Apoyar dedo registrado en el sensor","resultadoEsperado":"Huella reconocida en < 1s"},{"orden":3,"descripcion":"Verificar acceso","resultadoEsperado":"Dashboard bancario visible"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead2@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-A02', 'Fallback a PIN tras 3 fallos biometricos',
  (SELECT id FROM proyectos WHERE codigo = 'ABM-2025'), 'ABM-2025',
  'Funcional', 'Verificar que tras 3 intentos biometricos fallidos se ofrece autenticacion por PIN.',
  'Alta', 'Pendiente', 'Sin Ejecutar',
  'Tras 3 fallos biometricos se muestra teclado PIN. Acceso concedido con PIN correcto.',
  (SELECT id FROM usuarios WHERE email = 'tester2@qa.com'), 'REQ-A01',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-A01'),
  '[{"orden":1,"descripcion":"Usar dedo no registrado 3 veces consecutivas","resultadoEsperado":"3 fallos biometricos"},{"orden":2,"descripcion":"Verificar aparicion del teclado PIN","resultadoEsperado":"Teclado PIN visible"},{"orden":3,"descripcion":"Ingresar PIN correcto","resultadoEsperado":"Acceso concedido al dashboard"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead2@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ABM-2025 / REQ-A03 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-A03', 'Transferencia exitosa entre cuentas propias',
  (SELECT id FROM proyectos WHERE codigo = 'ABM-2025'), 'ABM-2025',
  'Funcional', 'Verificar que el usuario puede transferir saldo entre sus propias cuentas bancarias.',
  'Alta', 'Pendiente', 'Sin Ejecutar',
  'Monto debitado de cuenta origen y acreditado en destino en tiempo real.',
  (SELECT id FROM usuarios WHERE email = 'tester3@qa.com'), 'REQ-A03',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-A03'),
  '[{"orden":1,"descripcion":"Navegar a Transferencias > Cuentas propias","resultadoEsperado":"Formulario de transferencia visible"},{"orden":2,"descripcion":"Seleccionar cuentas origen y destino, ingresar S/. 100","resultadoEsperado":"Formulario completo"},{"orden":3,"descripcion":"Confirmar con codigo SMS","resultadoEsperado":"SMS recibido, transferencia procesada"},{"orden":4,"descripcion":"Verificar saldos","resultadoEsperado":"Origen -100, destino +100"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead2@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-A04', 'Rechazo de transferencia por fondos insuficientes',
  (SELECT id FROM proyectos WHERE codigo = 'ABM-2025'), 'ABM-2025',
  'Funcional', 'Verificar que el sistema rechaza la transferencia si el saldo es insuficiente.',
  'Alta', 'Pendiente', 'Sin Ejecutar',
  'Error claro "Fondos insuficientes". Sin debito en la cuenta origen.',
  (SELECT id FROM usuarios WHERE email = 'tester3@qa.com'), 'REQ-A03',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-A03'),
  '[{"orden":1,"descripcion":"Intentar transferir S/. 99999 desde cuenta con S/. 100","resultadoEsperado":"Formulario con monto excesivo"},{"orden":2,"descripcion":"Confirmar la transferencia","resultadoEsperado":"Error: Fondos insuficientes. Saldo disponible: S/. 100."}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead2@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

-- ---- ERP-2024 / REQ-M01 y REQ-M02 ----

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-M01', 'Validacion de conteo de clientes migrados',
  (SELECT id FROM proyectos WHERE codigo = 'ERP-2024'), 'ERP-2024',
  'Integración', 'Verificar que el numero de clientes en el nuevo ERP coincide exactamente con el sistema legacy.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Conteo exacto en origen y destino. Diferencia = 0.',
  (SELECT id FROM usuarios WHERE email = 'tester1@qa.com'), 'REQ-M01',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-M01'),
  '[{"orden":1,"descripcion":"Ejecutar COUNT(*) en sistema legacy: SELECT COUNT(*) FROM clientes","resultadoEsperado":"Total: 45,230"},{"orden":2,"descripcion":"Ejecutar COUNT(*) en nuevo ERP: SELECT COUNT(*) FROM customers","resultadoEsperado":"Total: 45,230"},{"orden":3,"descripcion":"Comparar ambos conteos","resultadoEsperado":"Diferencia = 0. Migracion 100% completa."}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-M02', 'Validacion de totales financieros post-migracion',
  (SELECT id FROM proyectos WHERE codigo = 'ERP-2024'), 'ERP-2024',
  'Integración', 'Verificar que los totales de cuentas por cobrar cuadran al centavo entre origen y destino.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Suma de saldos identica en origen y destino. Diferencia = S/. 0.00.',
  (SELECT id FROM usuarios WHERE email = 'tester1@qa.com'), 'REQ-M02',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-M02'),
  '[{"orden":1,"descripcion":"Sumar saldos de CxC en sistema legacy","resultadoEsperado":"Total: S/. 8,452,310.75"},{"orden":2,"descripcion":"Sumar saldos de CxC en nuevo ERP","resultadoEsperado":"Total: S/. 8,452,310.75"},{"orden":3,"descripcion":"Calcular diferencia","resultadoEsperado":"Diferencia = S/. 0.00. Integridad confirmada."}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

INSERT INTO casos_prueba (codigo_cp, nombre, proyecto_id, clave_proyecto, tipo, descripcion, prioridad, estado, resultado, resultado_esperado, responsable_qa_id, requerimiento_rf, requerimiento_id, pasos, creado_por)
SELECT 'CP-M03', 'Regresion: modulo de facturacion post-migracion',
  (SELECT id FROM proyectos WHERE codigo = 'ERP-2024'), 'ERP-2024',
  'Regresión', 'Verificar que el modulo de facturacion opera correctamente con los datos migrados.',
  'Alta', 'Ejecutado', 'Aprobado',
  'Factura generada con datos correctos, calculo de IGV preciso e historial preservado.',
  (SELECT id FROM usuarios WHERE email = 'tester1@qa.com'), 'REQ-M02',
  (SELECT id FROM requerimientos WHERE codigo = 'REQ-M02'),
  '[{"orden":1,"descripcion":"Crear factura de prueba en el nuevo ERP","resultadoEsperado":"Numero correlativo correcto"},{"orden":2,"descripcion":"Verificar historial del cliente con facturas migradas","resultadoEsperado":"Historial completo visible"},{"orden":3,"descripcion":"Revisar calculo de IGV","resultadoEsperado":"IGV 18% calculado correctamente"}]'::jsonb,
  (SELECT id FROM usuarios WHERE email = 'qa.lead@qa.com')
ON CONFLICT (proyecto_id, codigo_cp) DO NOTHING;

COMMIT;

-- ================================================================
-- RESUMEN
-- ================================================================
SELECT 'USUARIOS'      AS tabla, COUNT(*) AS total FROM usuarios
UNION ALL
SELECT 'PROYECTOS',    COUNT(*) FROM proyectos
UNION ALL
SELECT 'REQUERIMIENTOS', COUNT(*) FROM requerimientos
UNION ALL
SELECT 'CASOS_PRUEBA', COUNT(*) FROM casos_prueba;
