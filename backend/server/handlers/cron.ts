import type { Request, Response } from 'express';
import { HttpError } from '../auth';
import {
  fechaArgentina,
  sc_recordatorioCuotasMensual,
  sc_recordatorioDeudaDia20,
} from './pagos';

export async function cronRecordatorios(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;

  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    throw new HttpError(401, 'No autorizado.');
  }

  const hoy = fechaArgentina();

  await sc_recordatorioCuotasMensual();

  if (hoy.getUTCDate() === 20) {
    await sc_recordatorioDeudaDia20();
  }

  res.json({ ok: true });
}
