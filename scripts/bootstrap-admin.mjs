import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const [email, password, nombre = 'Administrador', dni = '00000000'] =
  process.argv.slice(2);

if (!email || !password) {
  console.error(
    'Uso: node scripts/bootstrap-admin.mjs <email> <password> [nombre] [dni]'
  );
  process.exit(1);
}

const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const keyPath = process.env.SERVICE_ACCOUNT_PATH;

if (!getApps().length) {
  if (usingEmulator) {
    initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'centro-educativo-f5cc5',
    });
  } else if (keyPath) {
    initializeApp({
      credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))),
    });
  } else {
    console.error('Definí SERVICE_ACCOUNT_PATH o las variables del emulador.');
    process.exit(1);
  }
}

const auth = getAuth();
const db = getFirestore();

let user;
try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password, displayName: nombre });
  console.log('El usuario ya existía: se actualizó su contraseña.');
} catch (e) {
  if (e.code !== 'auth/user-not-found') throw e;
  user = await auth.createUser({
    email,
    password,
    emailVerified: true,
    displayName: nombre,
  });
}

await auth.setCustomUserClaims(user.uid, { role: 'user_admin' });

await db.collection('users').doc(user.uid).set(
  {
    role: 'user_admin',
    email,
    nombre,
    dni,
    mustChangePassword: false,
    emailInvalid: false,
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true }
);

console.log(`Administrador listo: ${email} (uid ${user.uid})`);