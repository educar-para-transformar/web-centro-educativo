# 🏫 Proyecto Centro Educativo "Educar para Transformar"

Este es el repositorio oficial para el desarrollo del ecosistema digital del centro educativo.

---

## 🛠 Guía de Trabajo con Ramas (Git Flow)

Para mantener la estabilidad del proyecto y asegurar que las entregas sean consistentes, utilizaremos un flujo de trabajo basado en dos ramas principales:

### 1. Rama `master` (Producción)
* **Propósito:** Contiene la versión estable, testeada y funcional del proyecto.
* **Despliegue:** Es la rama que Vercel utiliza para generar la URL oficial que verán los docentes.
* **Regla de oro:** **NUNCA** se trabaja directamente sobre esta rama. Solo se reciben cambios mediante *merges* desde `develop`.

### 2. Rama `develop` (Desarrollo e Integración)
* **Propósito:** Es nuestra rama de trabajo diario. Aquí es donde integramos las nuevas funcionalidades y correcciones de errores.
* **Despliegue:** Vercel generará automáticamente una **Preview URL** cada vez que subamos cambios aquí para que podamos testearlos en vivo.

### 3. Rama `mejora-buenas-practicas` (Rama de Trabajo y Avances)
* **Propósito:** Es nuestra rama de mejoras en clase y tareas. Corregimos errores, mejoramos el código.
* **Despliegue:** Sin despliegue.

---

## 🔄 Comandos Rápidos para el Equipo

### 🔹 Al iniciar una tarea de desarrollo:
Asegúrate de tener la última versión del código de tus compañeros:
```
git checkout develop
git pull origin develop
```
Al finalizar una tarea
Cuando hayas terminado de maquetar un componente o página (ej. Wellness.jsx o Registration.jsx):
```
git add .
git commit -m "Tipo de cambio: Descripción breve de lo que hiciste"
git push origin develop
```
### 🔹 Para pasar a Producción (Vía Pull Request)
Cuando la rama `develop` sea estable y esté lista para la entrega oficial:
1.  Andá a GitHub y seleccioná **"New Pull Request"**.
2.  Configurá `base: master` <- `compare: develop`.
3.  Asigná a un compañero para que revise los cambios (**Reviewers**).
4.  Una vez aprobado, realizá el **"Merge pull request"**.

### 🚀 Entorno y Tecnologías
* Frontend: React + Vite
* Estilos: CSS Modules
* Despliegue: Vercel
* Control de Versiones: Git / GitHub
* Calidad de Código: Husky + Prettier + ESLint + Vitest + Cypress + SonarQube

---

## 🗺️ Rutas y Funcionalidades de la App

Todas las rutas están declaradas en `src/App.jsx` (React Router). Se agrupan por tipo de acceso:

### 🌐 Públicas
| Ruta | Página | Funcionalidad |
|---|---|---|
| `/` | `Home` | Inicio: hero, presentación de niveles, campus y servicios. |
| `/levels` | `Levels` | Detalle de los niveles educativos (inicial, primaria, secundaria) y CTA para agendar visita. |
| `/gallery` | `Gallery` | Galería de espacios del campus con agendado de visitas. |
| `/news` | `News` | Noticias y eventos de la comunidad (permite alta de noticias). |
| `/wellness` | `Wellness` | Servicios de bienestar: orientación, salud, nutrición y relajación. |
| `/contact` | `Contact` | Formulario de contacto e información institucional. |
| `/register` | `Registration` | Solicitud pública de inscripción en 3 pasos (nivel, tutor y alumno); queda pendiente de revisión del administrador. |
| `/employment-request` | `EmploymentRequest` | Postulación espontánea de personal (docente, administrativo y servicios). |
| `/privacy` | `Privacy` | Política de privacidad del sitio. |

### 🔐 Autenticación
| Ruta | Página | Funcionalidad |
|---|---|---|
| `/login` | `Login` | Inicio de sesión (admin/staff por email y contraseña; alumno por `studentID_login`). |
| `/forgot-password` | `ForgotPassword` | Recuperación de contraseña (para alumnos el enlace se envía al correo del tutor). |
| `/reset-password` | `ResetPassword` | Definición de una nueva contraseña. |

### 🧑💼 Paneles por rol
| Ruta | Página | Funcionalidad |
|---|---|---|
| `/admin` | `AdminPanel` | Gestión de tutores, estudiantes, personal, materias y activación/restablecimiento de credenciales. |
| `/reportes-pagos` | `ReportesPagos` | Listados de cuotas, pagos e ingresos del centro educativo. |
| `/pagos-pendientes` | `PagosPendientes` | Revisión de comprobantes de pago subidos por tutores: aprobar o rechazar. |
| `/solicitudes-inscripcion` | `SolicitudesInscripcion` | Revisión de solicitudes públicas: aceptar (alta automática de tutor y alumnos) o rechazar. |
| `/panel-alumno` | `StudentPanel` | Boletín de calificaciones, asistencias, horario, materiales descargables y novedades. |
| `/panel-docente` | `TeacherPanel` | Calificaciones, asistencia por fecha y materiales de las materias asignadas. |
| `/panel-tutor` | `ParentPanel` | Seguimiento académico del hijo, materiales, horarios, asistencias y cuotas con comprobantes. |

### 📎 Otras
| Ruta | Página | Funcionalidad |
|---|---|---|
| `/tp4` | `Tp4` | Respuesta de la actividad de Integración Continua (Unidad 4). |
| `*` | `NotFound` | Página 404 para rutas inexistentes. |

---

## Funcionalidades recientes

El backend de estas funcionalidades corre en `backend/` y se expone mediante los endpoints `cf_*` (Vercel). Las escrituras se realizan exclusivamente desde el servidor con el Admin SDK.

### Materiales de estudio con archivos

* El docente, desde `/panel-docente`, pestaña **Materiales**, publica un material con título, descripción, tipo y un enlace o un archivo adjunto (máximo **700 KB**).
* El alumno y el tutor pueden descargar el archivo desde sus paneles. La descarga valida que el alumno pertenezca a la materia o que el tutor sea responsable del alumno.
* La metadata liviana se guarda en `materiales`; el contenido base64 se guarda en `materialFiles/{materialId}`. Los enlaces externos siguen funcionando como alternativa.
* Endpoints: `cf_getMateriaMaterials`, `cf_upsertMaterial`, `cf_deleteMaterial`, `cf_getMaterialFile`.

### Asistencia por materia y fecha

* El docente elige una materia y una fecha, marca a cada alumno como **presente**, **ausente**, **tarde** o **justificada**, agrega observaciones y guarda con `cf_saveAttendance`.
* El panel del docente recupera los registros existentes con `cf_getMateriaAttendance`; los ausentes se muestran sin duplicar filas.
* Alumnos y tutores continúan consultando el resumen y el detalle de asistencias desde sus paneles.

### Cuotas con comprobante y revisión

* En `/panel-tutor`, pestaña **Cuotas**, el tutor ve importe, pagado, saldo, vencimiento y estado de cada cuota.
* El tutor adjunta un comprobante (imagen o PDF, máximo **700 KB**) indicando importe, medio de pago, fecha y observación. El pago queda en estado **pendiente** (`cf_submitPayment`).
* No se permite más de un comprobante pendiente para la misma cuota y tutor.
* El administrador revisa los comprobantes en `/pagos-pendientes`, puede descargarlos y aprobarlos o rechazarlos con motivo (`cf_getPagosPendientes`, `cf_reviewPayment`, `cf_getPagoComprobante`).
* Solo los pagos **aprobados** se suman al total pagado de la cuota. Los pagos históricos sin campo `estado` se consideran aprobados.
* El archivo se guarda en `pagosComprobantes/{pagoId}`.

### Solicitudes de inscripción con alta automática

* El formulario público `/register` envía la solicitud con `cf_createEnrollmentRequest`; no crea credenciales y evita solicitudes pendientes duplicadas para el mismo correo.
* El administrador las revisa en `/solicitudes-inscripcion`, con filtros por estado (`pendiente`, `aceptado`, `rechazado`).
* Al **aceptar**, se crean automáticamente la cuenta del tutor (rol `Padre`) y las cuentas de los alumnos (rol `Estudiante`, contraseña inicial = DNI). Se envían por correo el enlace de verificación del tutor y los enlaces de activación de los alumnos (válidos 48 horas).
* Al **rechazar**, se envía un correo al tutor con el motivo indicado.
* Endpoints: `cf_getEnrollmentRequests`, `cf_updateEnrollmentRequest`.

### Seguridad de las nuevas colecciones

`firestore.rules` bloquea el acceso directo desde el cliente a `materialFiles`, `pagosComprobantes` y `solicitudesInscripcion`; solo las Cloud Functions pueden leerlas o escribirlas.

| Endpoint | Rol habilitado | Uso |
|---|---|---|
| `cf_getMateriaMaterials` | Staff (docente de la materia) | Listar materiales de una materia. |
| `cf_upsertMaterial` / `cf_deleteMaterial` | Staff (docente de la materia) | Crear, actualizar o eliminar materiales. |
| `cf_getMaterialFile` | Estudiante, Padre, Staff | Descargar el archivo de un material. |
| `cf_saveAttendance` / `cf_getMateriaAttendance` | Staff (docente de la materia) | Guardar y consultar asistencia por fecha. |
| `cf_createEnrollmentRequest` | Público | Recibir una solicitud de inscripción. |
| `cf_getEnrollmentRequests` / `cf_updateEnrollmentRequest` | `user_admin` | Revisar, aceptar o rechazar solicitudes. |
| `cf_submitPayment` | Padre | Enviar un comprobante de pago. |
| `cf_getPagosPendientes` / `cf_reviewPayment` / `cf_getPagoComprobante` | `user_admin` | Revisar comprobantes y actualizar el estado del pago. |

---

## 🔄 Optimización del Ciclo de Desarrollo (Unidad 4)

* **Tipo aplicado:** Integración Continua (CI) con Entrega/Despliegue Continuo (CD) dentro de un flujo Git Flow.
* **Justificación:** permite integrar cambios pequeños y frecuentes, validar automáticamente el lint y el build en cada Pull Request, detectar errores antes del merge y mantener la rama principal siempre desplegable.
* **Herramientas:** Git/GitHub, GitHub Actions, React Doctor, Husky, ESLint, Vitest, Testing Library, Cypress, SonarQube, Vite, Vercel y Firebase (Auth, Firestore y Cloud Functions).
* **Estado actual:** el workflow de CI ejecuta `npm ci`, `npm run lint`, `npm run test:coverage` y `npm run build`; Husky ejecuta Prettier (mediante `lint-staged`) y ESLint antes de cada commit; SonarQube analiza el código con el reporte de cobertura; Vercel genera previews desde `develop` y publica producción desde `master`.
* **Mejoras propuestas:** análisis de seguridad y gestión de artefactos.

La respuesta completa de la actividad se muestra en la aplicación en la ruta `/tp4`.

### 🧪 Pruebas automatizadas

El proyecto usa dos capas de pruebas:

* **Unitarias / integración de componentes:** Vitest, React Testing Library y jsdom. Los tests se encuentran junto a los componentes y hooks (`*.test.jsx`).
* **E2E / regresión:** Cypress sobre la aplicación real con emuladores de Firebase.

```bash
# Pruebas unitarias
npm test              # ejecuta todas las pruebas
npm run test:watch    # modo interactivo
npm run test:coverage # genera coverage/lcov.info

# Pruebas E2E (requieren emuladores + seed + frontend levantados)
npm run test:e2e        # ejecuta toda la suite de Cypress
npm run test:e2e:open   # abre el runner interactivo de Cypress
npm run test:regression # ejecuta solo cypress/e2e/regression/**/*.cy.js
```

#### Casos E2E implementados

| Caso | Archivo | Qué valida |
|---|---|---|
| CP-DOC-001 | `cypress/e2e/docente-notas.cy.js` | El docente carga notas, se persisten al recargar y la alumna las ve en su boletín. |
| CP-REG-001 | `cypress/e2e/regression/regresion.cy.js` | Guardar dos veces no duplica registros y actualiza el boletín. |
| CP-REG-002 | `cypress/e2e/regression/regresion.cy.js` | El admin crea una materia y la asigna a un docente. |
| CP-REG-003 | `cypress/e2e/regression/regresion.cy.js` | El docente ve únicamente sus materias asignadas. |
| CP-REG-004 | `cypress/e2e/regression/regresion.cy.js` | El alumno ve sus notas y promedios. |
| CP-REG-005 | `cypress/e2e/regression/regresion.cy.js` | Guardar en una materia no asignada responde 403. |

#### Entorno para Cypress

Antes de ejecutar Cypress se necesitan los emuladores, el seed y Vite (ver sección siguiente):

```bash
# Terminal 1
npm run emulators
# Terminal 2
npm run seed:emulators
# Terminal 3
npm run dev
# Terminal 4
npm run test:e2e
```

La configuración está en `cypress.config.js` y los comandos reutilizables en `cypress/support/commands.js`. Los artefactos (`videos/`, `screenshots/`) se ignoran en git.

En CI, el job `e2e` de GitHub Actions levanta automáticamente emuladores, seed y Vite mediante `scripts/start-e2e-env.sh` antes de ejecutar Cypress.

### 🔎 SonarQube

La configuración del proyecto está en `sonar-project.properties`. El análisis se ejecuta en CI cuando están definidos los secretos `SONAR_TOKEN` y `SONAR_HOST_URL`; para SonarCloud también se debe definir `SONAR_ORGANIZATION`.

Para levantar SonarQube localmente:

```bash
docker compose -f docker-compose.sonarqube.yml up -d
```

Luego, en http://localhost:9000, creá el proyecto y un token. Después ejecutá:

```powershell
$env:SONAR_HOST_URL="http://localhost:9000"
$env:SONAR_TOKEN="<token-generado>"
npm run test:coverage
npm run sonar
```

---

## 🧪 Pruebas 100% Locales con Firebase Emulator Suite

Podés probar el proyecto completo **sin tocar la nube** usando los emuladores de Auth, Firestore y Functions. Esto es ideal para desarrollo diario y para no gastar la cuota del proyecto real.

### Requisitos
* Node.js 20 o superior (probado con Node 24).
* Java **11 a 20** (JDK instalado y accesible desde la terminal). Las versiones nuevas de `firebase-tools` exigen Java 21+, por eso el proyecto fija `firebase-tools@13` en el script `emulators`.
* npm (viene con Node).

### Primeros pasos
1. Instalá dependencias raíz y de funciones:
   ```
   npm install
   npm --prefix functions install
   ```
2. Creá el archivo `.env.local` en la raíz (no se sube a git, está en `.gitignore`):
   ```
   VITE_USE_EMULATORS=true
   VITE_FUNCTIONS_BASE_URL=http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1
   VITE_FIREBASE_PROJECT_ID=centro-educativo-f5cc5
   ```
   Este archivo **solo** activa el modo local. El `.env` de producción/desarrollo remoto queda intacto.

### Cómo levantar todo (3 terminales)
| Terminal | Comando | Qué hace |
|---|---|---|
| 1 | `npm run emulators` | Compila las Cloud Functions y levanta los emuladores Auth (9099), Firestore (8080), Functions (5001) y la UI (4000). La primera vez descarga los JARs pendientes. |
| 2 | `npm run seed:emulators` | Carga datos de prueba: usuarios, materias, alumnos y calificaciones. Se puede repetir cuantas veces se quiera (sobrescribe). |
| 3 | `npm run dev` | Levanta la app en Vite (https://localhost:5173). |

> 💡 Si querés inspeccionar/editar los datos, abrí la Emulator UI en http://127.0.0.1:4000 (pestañas Auth y Firestore).

### Credenciales de prueba
| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin@centro.local` | `admin1234` |
| Docente (Staff) | `docente@centro.local` | `docente1234` |
| Alumno 1 (secundaria) | `EST-2026-88123` | `48123456` |
| Alumno 2 (primaria) | `EST-2026-90412` | `45123987` |
| Alumno 3 (secundaria) | `EST-2026-10492` | `42987123` |

La contraseña inicial de cada alumno es su DNI (campo `hashedPassword`, encriptada con bcrypt). El alumno inicia sesión en el login desde la pestaña **Estudiante** con su `studentID_login` y ve su boletín en `/panel-alumno`.

### Qué se prueba localmente
* Inicio de sesión de alumno vía `cf_loginStudent` (custom token) y de admin vía email/contraseña.
* Panel del alumno "Mi Boletín de Calificaciones" (`/panel-alumno`), con promedios por trimestre, anual y general.
* Reglas de seguridad de Firestore (`firestore.rules`) aplicadas por los emuladores.
* Aislamiento de datos: cada alumno solo ve sus propias notas (HU4), aunque el admin puede consultar cualquier alumno con `?studentId=`.

### Solución de problemas
* **Puertos ocupados**: si un emulador ya está corriendo, cerrá los procesos previos antes de `npm run emulators`, o cambiá los puertos en `firebase.json`.
* **Java**: verificá con `java -version`. Si tenés Java 21+, el script `emulators` (que usa `firebase-tools@13`) igual funciona; el error de versión aparece solo si usás `firebase-tools@latest`.
* **Sin datos en el boletín**: recordá correr `npm run seed:emulators` después de levantar los emuladores.

---

### 👥 Integrantes del Equipo
* Lautaro Höfer
* Pablo Ramírez