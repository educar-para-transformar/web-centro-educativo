// ============================================================
// SEED PARA EMULADORES DE FIREBASE
// ------------------------------------------------------------
// Carga datos de prueba SOLO en los emuladores locales usando el
// Admin SDK (solo tiene sentido apuntando a emuladores locales).
//   Auth      -> 127.0.0.1:9099  (admin, docente, tutor + claims)
//   Firestore -> 127.0.0.1:8080  (alumnos, materias, calificaciones)
// Requisito: los emuladores deben estar corriendo (`npm run emulators`).
// Uso:       npm run seed:emulators
// ============================================================
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

import { createRequire } from 'node:module';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const bcrypt = require('../functions/node_modules/bcryptjs');

const PROJECT_ID = 'centro-educativo-f5cc5';

const MATERIAS_POR_NIVEL = {
  secundaria: [
    { id: 'sec-matematica', nombre: 'Matemática' },
    { id: 'sec-lengua', nombre: 'Lengua y Literatura' },
    { id: 'sec-historia', nombre: 'Historia' },
    { id: 'sec-geografia', nombre: 'Geografía' },
    { id: 'sec-fisica', nombre: 'Física' },
    { id: 'sec-quimica', nombre: 'Química' },
    { id: 'sec-biologia', nombre: 'Biología' },
    { id: 'sec-ingles', nombre: 'Inglés' },
    { id: 'sec-edfisica', nombre: 'Educación Física' },
  ],
  primaria: [
    { id: 'pri-matematica', nombre: 'Matemática' },
    { id: 'pri-lengua', nombre: 'Lengua y Literatura' },
    { id: 'pri-cnaturaleza', nombre: 'Ciencias Naturales' },
    { id: 'pri-csociales', nombre: 'Ciencias Sociales' },
    { id: 'pri-ingles', nombre: 'Inglés' },
    { id: 'pri-edfisica', nombre: 'Educación Física' },
  ],
  inicial: [
    { id: 'ini-juegos', nombre: 'Juegos y Expresión' },
    { id: 'ini-lengua', nombre: 'Lengua Inicial' },
    { id: 'ini-matematica', nombre: 'Matemática Inicial' },
    { id: 'ini-mundo', nombre: 'Mundo Natural y Social' },
    { id: 'ini-musica', nombre: 'Música' },
    { id: 'ini-edfisica', nombre: 'Educación Física' },
  ],
};

const app = initializeApp({ projectId: PROJECT_ID });
const authAdmin = getAuth(app);
const db = getFirestore(app);

async function upsertUser(email, password, displayName, role) {
  let uid;
  try {
    const user = await authAdmin.createUser({ email, password, displayName });
    uid = user.uid;
  } catch (err) {
    const code = err.code || err.errorInfo?.code;
    if (code !== 'auth/email-already-exists') throw err;
    const existing = await authAdmin.getUserByEmail(email);
    uid = existing.uid;
    await authAdmin.updateUser(uid, { password, displayName });
  }
  await authAdmin.setCustomUserClaims(uid, { role });
  return uid;
}

async function main() {
  console.log(`Seeding emuladores del proyecto ${PROJECT_ID}...`);

  // 1) USUARIOS LOCALES (Auth emulator)
  console.log('\n[Auth] Creando usuarios locales...');
  await upsertUser('admin@centro.local', 'admin1234', 'Director/a', 'user_admin');
  console.log('  ✓ admin@centro.local (user_admin)');
  await upsertUser('docente@centro.local', 'docente1234', 'Prof. Analía Torres', 'Staff');
  console.log('  ✓ docente@centro.local (Staff)');
  await upsertUser('tutor1@centro.local', 'tutor1234', 'Eduardo Gómez', 'Padre');
  console.log('  ✓ tutor1@centro.local (Padre)');

  // 2) MATERIAS (Firestore emulator)
  console.log('\n[Firestore] Registrando materias curriculares...');
  const materiaIdsPorNivel = {};
  for (const [nivel, materias] of Object.entries(MATERIAS_POR_NIVEL)) {
    materiaIdsPorNivel[nivel] = [];
    for (const materia of materias) {
      await db.collection('materias').doc(materia.id).set({
        nombre: materia.nombre,
        nivel,
        createdAt: null,
      });
      materiaIdsPorNivel[nivel].push(materia.id);
      console.log(`  ✓ [${nivel}] ${materia.nombre}`);
    }
  }

  // 3) ALUMNOS + CALIFICACIONES (Firestore emulator)
  console.log('\n[Firestore] Creando alumnos con calificaciones...');
  const alumnos = {
    alumno1: { nombre: 'Lucía Gómez', dni: '48123456', nivel: 'secundaria', genero: 'Femenino', fechaNacimiento: '2010-04-12', idLogin: 'EST-2026-88123' },
    alumno2: { nombre: 'Mateo Gómez', dni: '45123987', nivel: 'primaria', genero: 'Masculino', fechaNacimiento: '2014-09-30', idLogin: 'EST-2026-90412' },
    alumno3: { nombre: 'Sofía Rodríguez', dni: '42987123', nivel: 'secundaria', genero: 'Femenino', fechaNacimiento: '2011-01-25', idLogin: 'EST-2026-10492' },
  };

  const anioLectivo = new Date().getFullYear();
  let cantCalificaciones = 0;

  for (const [docId, base] of Object.entries(alumnos)) {
    const hashedPassword = await bcrypt.hash(base.dni, 10); // clave inicial = DNI
    await db.collection('students').doc(docId).set({
      studentID_login: base.idLogin,
      parentId: 'tutor1',
      emailPadre: 'tutor1@centro.local',
      hashedPassword,
      status: 'active',
      mustChangePassword: false,
      nombre: base.nombre,
      dni: base.dni,
      genero: base.genero,
      fechaNacimiento: base.fechaNacimiento,
      nivel: base.nivel,
      createdAt: null,
    });
    console.log(`  ✓ ${base.nombre} (${base.idLogin})`);

    const materiaIds = materiaIdsPorNivel[base.nivel];
    for (const materiaId of materiaIds) {
      const materia = MATERIAS_POR_NIVEL[base.nivel].find((m) => m.id === materiaId);
      for (let trimestre = 1; trimestre <= 3; trimestre++) {
        // Notas determinísticas por alumno (6-10) para que el boletín se vea completo
        const notas = Array.from({ length: 2 }, () => 6 + ((docId.charCodeAt(docId.length - 1) + trimestre + materiaId.length) % 5));
        await db
          .collection('calificaciones')
          .doc(`${docId}_${materiaId}_t${trimestre}`)
          .set({
            studentId: docId,
            materiaId,
            materia: materia.nombre,
            anio: anioLectivo,
            trimestre,
            notas,
            createdAt: null,
          });
        cantCalificaciones++;
      }
    }
  }

  console.log('\n✅ Seed completado.');
  console.log('------------------------------------------------------------');
  console.log('Credenciales locales de prueba:');
  console.log('  Admin  :  admin@centro.local   / admin1234');
  console.log('  Docente:  docente@centro.local / docente1234');
  console.log('  Alumno1:  EST-2026-88123       / 48123456');
  console.log('  Alumno2:  EST-2026-90412       / 45123987');
  console.log('  Alumno3:  EST-2026-10492       / 42987123');
  console.log(`  Calificaciones cargadas: ${cantCalificaciones}`);
  console.log('------------------------------------------------------------');
}

main().catch((err) => {
  console.error('\n✗ Falló el seed:', err.message);
  console.error('Asegúrate de tener los emuladores corriendo: npm run emulators');
  process.exit(1);
});