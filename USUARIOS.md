# 👤 Usuarios: Registro, Activación e Inicio de Sesión

Este documento describe **únicamente las funcionalidades relacionadas con los usuarios que pueden registrarse o iniciar sesión**: roles del sistema, alta de cuentas, activación, login, logout y gestión de contraseñas.

La autenticación se apoya en **Firebase Auth** (custom claims para el rol) y en **Cloud Functions** (`functions/src/index.ts`) para los flujos que requieren privilegios o verificación en el servidor.

---

## 🧩 Roles del sistema

| Rol (claim) | Nombre visible | Cómo se crea la cuenta | Método de login |
|---|---|---|---|
| `user_admin` | Administrador | `cf_createAdministrativeUser` o `bootstrap-admin.mjs` | Email + contraseña |
| `Staff` | Staff (Docente) | `cf_createAdministrativeUser` | Email + contraseña |
| `Administrativo` | Administrativo | `cf_createAdministrativeUser` | Email + contraseña |
| `Padre` | Padre/Tutor | `cf_createParentAndStudents` | Email + contraseña |
| `Estudiante` | Estudiante | `cf_createParentAndStudents` (se crea junto al tutor) | `studentID_login` + contraseña |

**Contraseña inicial:** en todos los casos es el **DNI** del usuario (tutor, personal o alumno). En el primer ingreso se marca `mustChangePassword: true` y la app fuerza el cambio con el modal `ChangePasswordModal`.

**Redirección al iniciar sesión** (`src/pages/Login.jsx`):

| Rol | Panel destino |
|---|---|
| `user_admin` | `/admin` |
| `Staff` / `Administrativo` | `/panel-docente` |
| `Estudiante` | `/panel-alumno` |
| `Padre` / `Padre/Tutor` | `/panel-tutor` |

> La pantalla de login también muestra, para cada rol, una lista de **permisos declarados** (`ROLES_INFO` en `Login.jsx`): p. ej. Administrador → `gestionar_usuarios`, `ver_auditorias`, `configurar_sistema`; Staff → `cargar_asistencias`, `registrar_notas`, `publicar_anuncios_aula`, `ver_agenda_clases`; Padre/Tutor → `ver_legajo_hijo`, `autorizar_eventos`, `ver_estado_cuotas`, `comunicarse_con_docente`; Estudiante → `ver_mis_notas`, `ver_mis_asistencias`, `descargar_material`, `ver_horarios`.

---

## 🎯 Funcionalidades por rol

### 🛡️ Administrador (`user_admin`)
Acceso: `/admin` (exclusivo del rol) y `/reportes-pagos`.

- **Dashboard de Usuarios** con sub-pestañas: *Estudiantes y Tutores*, *Personal Institucional* y *Materias*.
- **Crear usuarios**: Tutor + Estudiantes (`cf_createParentAndStudents`) y Personal/Administrativo (`cf_createAdministrativeUser`).
- **Editar datos** de alumnos, tutores y personal (`cf_updateUserProfile`).
- **Restablecer contraseñas al DNI** de cualquier usuario (`cf_resetUserPasswordToDni`).
- **Gestionar materias**: registrar (`cf_createMateria`), editar y asignar docente (`cf_updateMateria`) y gestionar los alumnos inscriptos (`cf_setMateriaStudents`).
- **Reportes de Pagos** (`/reportes-pagos`): ingresos, pagos completos, incompletos, de deportes y de transporte; envío de recordatorios de cuotas y de deuda (`cf_enviarRecordatorioCuotas`, `cf_enviarRecordatorioDeuda`).
- **Publicar noticias** en `/news`.
- **Consultar a cualquier alumno** (boletín, asistencias, etc.) pasando `?studentId=`.

### 👩🏫 Staff / Docente (`Staff`)
Acceso: `/panel-docente` (solo rol `Staff`).

- Ver las **materias que le asignó el administrador** (solo las propias).
- **Cargar y actualizar calificaciones** (números de 1 a 10) por **trimestre**, agregando o quitando notas por alumno.
- Ver el **promedio** calculado por alumno.
- Cerrar sesión.

### 🗂️ Administrativo (`Administrativo`)
- Se crea con `cf_createAdministrativeUser` y se autentica con **email + contraseña**.
- Al iniciar sesión se lo redirige como personal, pero **no tiene panel propio**: el panel docente es exclusivo del rol `Staff`.

### 👨👩👧 Padre / Tutor (`Padre`)
Acceso: `/panel-tutor`.

- **Seleccionar entre sus hijos** asociados.
- Por cada hijo, ver las pestañas: **Boletín, Materias, Asistencias, Horarios, Materiales y Novedades**.
- Cerrar sesión.

### 🎓 Estudiante (`Estudiante`)
Acceso: `/panel-alumno`.

- Ver su **boletín de calificaciones** (promedios por trimestre, anual y general) e **imprimirlo**.
- Ver **Materias, Asistencias, Horarios, Materiales y Novedades**.
- **Cambiar su propia contraseña** (`cf_changeStudentPassword`).
- Cerrar sesión.

---

## 📝 Registro / Alta de usuarios

### 1. Inscripción pública de alumnos — `/register`
Página `Registration.jsx`. Es una **solicitud de inscripción** en 3 pasos (Nivel → Datos del tutor → Datos del alumno). **No crea credenciales**: sólo valida los datos y muestra un modal de éxito. La cuenta real la genera el administrador.

### 2. Alta interna por el administrador — `/admin`
Desde el panel de administración (`AdminPanel.jsx`), pestaña **Crear**, el `user_admin` puede:

| Función | Qué crea |
|---|---|
| `cf_createParentAndStudents` | Un **tutor** (Padre) + uno o más **alumnos**. Genera `studentID_login` (`EST-YYYY-XXXXX`), guarda el hash bcrypt del DNI como contraseña y asigna `parentId`. |
| `cf_createAdministrativeUser` | Un usuario **administrador, Staff o Administrativo** (email + DNI como contraseña). Roles permitidos: `user_admin`, `Staff`, `Administrativo`. |

### 3. Activación de la cuenta del alumno
| Función | Qué hace |
|---|---|
| `cf_activateStudentAccount` | El alumno define su contraseña usando un token de activación (válido 1 hora). Marca la cuenta como `active`. |
| `cf_resendActivationLink` | Reenvía el enlace de activación (de tutor o de alumno). |

---

## 🔐 Inicio y cierre de sesión — `/login`

Página `Login.jsx`. El login (`loginReal` en `src/context/AuthContext.jsx`) **detecta el tipo de identificador**:

- **Contiene `@`** → email → `signInWithEmailAndPassword` (tutores, Staff, Administrativo, admin).
- **No contiene `@`** (ej. `EST-2026-XXXXX`) → alumno → llama a **`cf_loginStudent`**, que valida el hash bcrypt y devuelve un **custom token** con el que se hace `signInWithCustomToken`.

Extras del login:
- **Mantener sesión iniciada**: usa `browserLocalPersistence`; si no, `browserSessionPersistence`.
- **Cierre de sesión** (`logoutReal`): `signOut(auth)`.
- Al autenticarse, se leen los **custom claims** (`role`, `studentId`) y el perfil extendido en Firestore (`students` o `users`).

---

## 🔑 Gestión y recuperación de contraseñas

### Recuperación desde el login
| Ruta | Página | Flujo |
|---|---|---|
| `/forgot-password` | `ForgotPassword.jsx` | **Email** → `sendPasswordResetEmail`. **Alumno (ID o DNI)** → `cf_requestStudentPasswordReset` (envía el enlace al correo del tutor). |
| `/reset-password` | `ResetPassword.jsx` | Define la nueva contraseña con el token del enlace → `cf_confirmStudentPasswordReset`. |

### Cambio de contraseña autenticado
| Función | Quién la invoca | Qué hace |
|---|---|---|
| `cf_changeStudentPassword` | El propio alumno o un `user_admin` | Actualiza el hash bcrypt del alumno y baja `mustChangePassword`. |
| `cf_completePasswordChange` | Cualquier usuario autenticado | Actualiza la contraseña en Auth y marca `mustChangePassword: false`. |

### Restablecimiento por el administrador
| Función | Qué hace |
|---|---|
| `cf_resetUserPasswordToDni` | Restablece la contraseña de un **tutor, administrativo o alumno** a su DNI. |
| `cf_resetStudentPassword` | Envía un enlace de restablecimiento al **correo del tutor**. |
| `cf_updateUserProfile` | Actualiza datos del perfil (tutor, alumno o administrativo); si cambia el email, lo sincroniza en Auth. |
| `cf_updateParentEmailAndResend` | Actualiza el email del tutor y reenvía la activación. |

---

## ☁️ Resumen de Cloud Functions de usuarios

| Función | Acceso | Descripción |
|---|---|---|
| `cf_loginStudent` | Público | Login de alumno → custom token. |
| `cf_createParentAndStudents` | `user_admin` | Crea tutor + alumnos. |
| `cf_createAdministrativeUser` | `user_admin` | Crea admin / Staff / Administrativo. |
| `cf_activateStudentAccount` | Público | Activa cuenta de alumno con token. |
| `cf_resendActivationLink` | Autenticado | Reenvía activación. |
| `cf_requestStudentPasswordReset` | Público | Solicita recuperación de alumno (correo del tutor). |
| `cf_confirmStudentPasswordReset` | Público | Confirma recuperación con token. |
| `cf_resetStudentPassword` | `user_admin` / tutor | Envía enlace de reset al tutor. |
| `cf_changeStudentPassword` | Alumno / `user_admin` | Cambia contraseña del alumno. |
| `cf_completePasswordChange` | Autenticado | Finaliza cambio de contraseña. |
| `cf_resetUserPasswordToDni` | `user_admin` | Resetea contraseña a DNI. |
| `cf_updateUserProfile` | `user_admin` | Edita perfiles. |
| `cf_updateParentEmailAndResend` | `user_admin` | Cambia email del tutor y reenvía activación. |

---

## 🧪 Credenciales de prueba (emuladores)

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin@centro.local` | `admin1234` |
| Docente (Staff) | `docente@centro.local` | `docente1234` |
| Administrativo | `admininterno@centro.local` | `admininterno1234` |
| Tutor 1 | `tutor1@centro.local` | `tutor1234` |
| Tutor 2 | `tutor2@centro.local` | `tutor1234` |
| Tutor 3 | `tutor3@centro.local` | `tutor1234` |
| Alumno 1 (secundaria) | `EST-2026-88123` | `48123456` |
| Alumno 2 (primaria) | `EST-2026-90412` | `45123987` |
| Alumno 3 (secundaria) | `EST-2026-10492` | `42987123` |

> La contraseña inicial de cada alumno es su DNI. El alumno inicia sesión con su `studentID_login` (no con email).
