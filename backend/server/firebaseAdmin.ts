import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Falta la variable FIREBASE_SERVICE_ACCOUNT.');
  }

  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8');

  return JSON.parse(json);
}

const app =
  getApps()[0] ??
  (process.env.FIREBASE_SERVICE_ACCOUNT
    ? initializeApp({ credential: cert(readServiceAccount()) })
    : initializeApp({ projectId: process.env.GCLOUD_PROJECT }));

export const auth = getAuth(app);
export const db = getFirestore(app);
