import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'dummy-api-key',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'centro-educativo-f5cc5.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'centro-educativo-f5cc5',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'centro-educativo-f5cc5.appspot.com',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'dummy-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'dummy-app-id',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Conectar a los Emuladores locales de Firebase si VITE_USE_EMULATORS=true.
// No toca ningún proyecto real: Auth (9099), Firestore (8080).
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  console.log('Conectando a Emuladores locales de Firebase (Auth 9099 / Firestore 8080)...');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
