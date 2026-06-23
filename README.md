# Sistema QA — Backend

API REST construida con NestJS 10 + TypeORM + PostgreSQL para el sistema de gestión de calidad.

---

## Requisitos

- Node.js >= 18.x
- PostgreSQL 16 (o usar Docker)
- npm >= 9.x

---

## Instalación y Uso

```bash
npm install

# Copiar y configurar variables de entorno
cp .env.example .env

npm run start:dev    # Watch mode → http://localhost:3000
npm run build        # Compilar a dist/
npm test             # Jest
npm run test:cov     # Jest con cobertura
npm run lint         # ESLint --fix
```

Swagger disponible en `http://localhost:3000/api/docs`.

---

## Variables de Entorno (`.env`)

| Variable         | Ejemplo          | Descripción                              |
|------------------|------------------|------------------------------------------|
| `DB_HOST`        | `localhost`      | Host de PostgreSQL (`postgres` en Docker)|
| `DB_PORT`        | `5432`           |                                          |
| `DB_USERNAME`    | `postgres`       |                                          |
| `DB_PASSWORD`    | `postgres`       |                                          |
| `DB_DATABASE`    | `sistema_qa`     |                                          |
| `DB_SYNC`        | `false`          | No cambiar en Docker; esquema via SQL    |
| `JWT_SECRET`     | —                | Requerido; usar valor seguro             |
| `JWT_EXPIRES_IN` | `24h`            |                                          |
| `MAIL_HOST`      | `smtp.gmail.com` | SMTP para notificaciones                 |
| `MAIL_PORT`      | `587`            |                                          |
| `MAIL_USER`      | —                | Cuenta Gmail                            |
| `MAIL_PASS`      | —                | App Password de Google (no la contraseña de cuenta) |

---

## Estructura

```
src/
├── app.module.ts            # Módulo raíz; registra TypeORM y todos los feature modules
├── main.ts                  # Bootstrap: ValidationPipe, CORS, Swagger
│
├── auth/                    # JWT login, estrategia Passport, guards
├── common/                  # Decoradores (@CurrentUser), filtros globales
│
├── usuarios/                # CRUD usuarios
├── proyectos/               # CRUD proyectos (filtrado por usuario via JWT)
├── requerimientos/          # CRUD requerimientos (filtrado por usuario)
├── casos-prueba/            # CRUD casos de prueba + auditoría (filtrado por usuario)
├── ciclos-prueba/           # CRUD ciclos + validación ciclo único activo por proyecto
├── ejecuciones/             # Registro de ejecuciones (auto-asigna ciclo activo, filtrado por usuario)
├── defectos/                # CRUD defectos + comentarios + códigos INC/DEF (filtrado por usuario)
├── planes-prueba/           # CRUD planes + endpoint trazabilidad (filtrado por usuario)
├── dashboard/               # Stats filtradas por usuario autenticado
└── mail/                    # Servicio de correo (Nodemailer)
```

Cada módulo sigue el patrón:
```
<entidad>/
  <entidad>.module.ts
  <entidad>.controller.ts
  <entidad>.service.ts
  dto/create-<entidad>.dto.ts
  dto/update-<entidad>.dto.ts
  entities/<entidad>.entity.ts
```

---

## Módulos y Endpoints

### Auth
```
POST /api/auth/login          → { access_token, usuario }
```

### Proyectos
```
GET    /api/proyectos          ?busqueda&estado&pagina&porPagina  [filtrado por usuario JWT]
GET    /api/proyectos/:id
GET    /api/proyectos/:id/resumen
POST   /api/proyectos
PUT    /api/proyectos/:id
DELETE /api/proyectos/:id
```
> Non-admin: solo ven proyectos donde son `jefe_proyecto_id`, `jefe_qa_id`, `responsable_qa_id`, o tienen casos/defectos asignados.

### Requerimientos
```
GET    /api/requerimientos     ?proyectoId&tipo&estado&busqueda&pagina  [filtrado por usuario]
GET    /api/requerimientos/:id
GET    /api/proyectos/:id/requerimientos
POST   /api/requerimientos
PUT    /api/requerimientos/:id
DELETE /api/requerimientos/:id
```

### Casos de Prueba
```
GET    /api/casos-prueba       ?proyectoId&requerimientoId&estado&tipo&resultado&busqueda&pagina  [filtrado por usuario]
GET    /api/casos-prueba/:id
POST   /api/casos-prueba
PUT    /api/casos-prueba/:id
DELETE /api/casos-prueba/:id
GET    /api/casos-prueba/:id/auditoria
```

### Ciclos de Prueba
```
GET    /api/ciclos-prueba                    ?proyectoId&estado&pagina&porPagina  [filtrado por usuario]
GET    /api/ciclos-prueba/activo/:proyectoId → ciclo Activo más reciente del proyecto
GET    /api/ciclos-prueba/casos-previos/:proyectoId
GET    /api/ciclos-prueba/:id/casos
GET    /api/ciclos-prueba/:id
POST   /api/ciclos-prueba
PUT    /api/ciclos-prueba/:id
PATCH  /api/ciclos-prueba/:id/cerrar
PATCH  /api/ciclos-prueba/:id/reabrir
DELETE /api/ciclos-prueba/:id                [solo si totalEjecuciones = 0]
```
> Roles gestión: `ADMIN`, `QA_LEAD`, `PROJECT_MANAGER`.  
> Al crear: valida que no exista ya un ciclo `Activo` para el mismo proyecto — lanza `400` con nombre del ciclo activo.

### Ejecuciones
```
GET    /api/ejecuciones        ?proyectoId&resultado&ambiente&testerId&pagina  [filtrado por usuario]
POST   /api/ejecuciones
GET    /api/ejecuciones/caso-prueba/:id
```
> Al crear: si no se pasa `cicloId`, el servicio busca el ciclo `Activo` más reciente del proyecto y lo asigna automáticamente.

### Defectos
```
GET    /api/defectos                         ?proyectoId&casoPruebaId&estado&severidad&pagina  [filtrado por usuario]
GET    /api/defectos/siguiente-codigo/:proyectoId   → próximo código INC-XXX
GET    /api/defectos/:id
POST   /api/defectos
PUT    /api/defectos/:id
PATCH  /api/defectos/:id/estado
POST   /api/defectos/:id/comentarios
DELETE /api/defectos/:id
```
> Al crear: genera `codigo` global (`DEF-XXXX`) y `codigoProyecto` (`INC-XXX`) en transacción. Auto-vincula a la última ejecución `Fallido` sin defecto para el mismo `casoPruebaId`.

### Planes de Prueba
```
GET    /api/planes-prueba                    ?proyectoId&estado&pagina&porPagina  [filtrado por usuario]
GET    /api/planes-prueba/:id
GET    /api/planes-prueba/:id/trazabilidad   → matriz req → caso → resultado → defecto
POST   /api/planes-prueba
PUT    /api/planes-prueba/:id
PATCH  /api/planes-prueba/:id/cerrar
PATCH  /api/planes-prueba/:id/reabrir
DELETE /api/planes-prueba/:id
```
> Al crear un ciclo vinculado a un plan, el plan avanza automáticamente a estado `En ejecución`.

### Usuarios
```
GET    /api/usuarios           ?rol&activo&busqueda&pagina
GET    /api/usuarios/:id
POST   /api/usuarios
PUT    /api/usuarios/:id
PATCH  /api/usuarios/:id/estado
DELETE /api/usuarios/:id
```

### Dashboard
```
GET    /api/dashboard/stats    → { resumen, casosPorEstado, defectosPorSeveridad, defectosPorEstado,
                                    ultimasEjecuciones, ultimosDefectos }
```
> Stats de resumen y gráficas filtradas por usuario autenticado (non-admin solo ve datos de sus proyectos).

---

## Base de Datos

### Inicialización (Docker)

Los scripts en `database/init/` se ejecutan una sola vez al crear el contenedor de Postgres:

| Script | Contenido |
|---|---|
| `01_enums.sql` | ENUM types: roles, estados, prioridades, severidades |
| `02_tables.sql` | Todas las tablas con FK |
| `03_indexes.sql` | Índices de rendimiento |
| `04_seed.sql` | Usuario admin (`admin@qa.com` / `Admin123!`) |
| `05_test_data.sql` | Datos de ejemplo |

### Tablas principales

| Tabla | Descripción |
|---|---|
| `usuarios` | Usuarios del sistema |
| `proyectos` | Proyectos con jefe_proyecto_id, jefe_qa_id, responsable_qa_id |
| `requerimientos` | Requerimientos por proyecto |
| `casos_prueba` | Casos de prueba con pasos (jsonb) |
| `ciclos_prueba` | Ciclos de prueba por proyecto (estado: Activo/Cerrado) |
| `ciclo_casos_planificados` | Casos seleccionados para un ciclo con resultado anterior |
| `ejecuciones_caso_prueba` | Ejecuciones; FK → ciclos_prueba.id (ciclo_id) |
| `defectos` | Defectos con codigo (DEF) y codigo_proyecto (INC) |
| `comentarios_defecto` | Comentarios de defectos |
| `planes_prueba` | Planes de prueba con ciclos agrupados |
| `auditoria_casos_prueba` | Historial de cambios en casos de prueba |

> `DB_SYNC=false` en Docker — no usar `synchronize: true`. Aplicar cambios de esquema con ALTER TABLE o nuevos scripts SQL.

---

## Autenticación y Autorización

- JWT via `@nestjs/passport` + `passport-jwt`
- `JwtAuthGuard` protege todas las rutas excepto `POST /api/auth/login`
- `RolesGuard` + `@Roles(...roles)` en endpoints específicos
- `@CurrentUser()` extrae el usuario del JWT payload en los controladores
- Roles: `ADMIN`, `QA_LEAD`, `QA_TESTER`, `DEVELOPER`, `PROJECT_MANAGER`

---

## Reglas de Negocio Clave

### Filtrado por usuario (non-admin)
Todos los endpoints de lista aplican el siguiente filtro cuando `esAdmin = false`:
```sql
WHERE proyecto_id IN (
  SELECT p.id FROM proyectos p
  WHERE p.jefe_proyecto_id = :uid OR p.jefe_qa_id = :uid OR p.responsable_qa_id = :uid
     OR EXISTS (SELECT 1 FROM casos_prueba cp WHERE cp.proyecto_id = p.id AND cp.responsable_qa_id = :uid)
     OR EXISTS (SELECT 1 FROM defectos d  WHERE d.proyecto_id  = p.id AND (d.asignado_a = :uid OR d.reportado_por = :uid))
)
```
Módulos con filtrado: `proyectos`, `requerimientos`, `casos-prueba`, `ciclos-prueba`, `ejecuciones`, `defectos`, `planes-prueba` y stats de `dashboard`.

### Ciclo único activo por proyecto
Al crear un ciclo, se verifica que no exista otro con `estado = 'Activo'` para el mismo proyecto:
```typescript
const cicloActivo = await repo.findOne({ where: { proyectoId, estado: EstadoCiclo.ACTIVO } });
if (cicloActivo) throw new BadRequestException(`Ya existe el ciclo activo "${cicloActivo.nombre}"...`);
```

### Códigos de defecto
- `codigo`: global `DEF-{id padded 4}` — único en el sistema
- `codigoProyecto`: por proyecto `INC-{count padded 3}` — único por proyecto
- Ambos se calculan en la misma transacción de creación con SELECT FOR UPDATE

### Auto-vinculación ejecución ↔ defecto
```sql
SELECT id FROM ejecuciones_caso_prueba
WHERE caso_prueba_id = $1 AND resultado = 'Fallido' AND defecto_id IS NULL
ORDER BY creado_en DESC LIMIT 1
```
Si existe, se actualiza `defecto_id` en esa ejecución dentro de la misma transacción.

### Trazabilidad de Plan
El endpoint `GET /api/planes-prueba/:id/trazabilidad` devuelve la estructura completa:
```
Plan → Ciclos → Requerimientos → Casos → Último resultado → Defecto vinculado
```
Usado por el frontend para generar la matriz visual y exportar a Word/CSV.
