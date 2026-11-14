import type { Request } from 'express';
import { auth } from './firebaseAdmin';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function verifyAuth(req: Request) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Falta el token de autenticación.');
  }

  try {
    return await auth.verifyIdToken(header.slice(7));
  } catch {
    throw new HttpError(401, 'Token inválido o expirado.');
  }
}
