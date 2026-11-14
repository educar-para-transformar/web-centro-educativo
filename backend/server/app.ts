import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { HttpError } from './auth';
import { cronRecordatorios } from './handlers/cron';
import * as coreHandlers from './handlers/index';
import * as pagoHandlers from './handlers/pagos';

function registerHandlers(
  router: express.Router,
  handlers: Record<string, unknown>
) {
  for (const [name, handler] of Object.entries(handlers)) {
    if (name.startsWith('cf_') && typeof handler === 'function') {
      router.all(`/${name}`, handler as RequestHandler);
    }
  }
}

const app = express();

app.disable('x-powered-by');

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.get('/cron/recordatorios', cronRecordatorios);

registerHandlers(router, coreHandlers);
registerHandlers(router, pagoHandlers);

app.use('/api', router);
app.use('/', router);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: 'Error interno del servidor.' });
});

export default app;
