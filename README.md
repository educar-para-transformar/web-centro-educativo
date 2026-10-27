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
* Calidad de Código: Husky + Prettier + ESLint

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