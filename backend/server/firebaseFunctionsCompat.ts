type HttpHandler = (req: any, res: any) => unknown;
type ScheduleHandler = () => unknown;

/**
 * Compatibilidad mínima para reutilizar la lógica de las Cloud Functions en
 * Vercel sin cargar el runtime de Firebase. `onRequest` y `onSchedule` solo
 * devuelven el handler original.
 */
export function onRequest(_options: unknown, handler: HttpHandler) {
  return handler;
}

export function onSchedule(_options: unknown, handler: ScheduleHandler) {
  return handler;
}
