import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue, Query, Timestamp } from 'firebase-admin/firestore';
import { sendEmail } from './email';
import { buildFacturaPdf, formatMoney, type FacturaItem } from './pdf';

// La app de Firebase Admin se inicializa en index.ts; se reutiliza si ya existe.
const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = admin.firestore(app);

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MEDIOS_PAGO: readonly string[] = [
  'efectivo',
  'transferencia',
  'tarjeta',
  'mercadopago',
];
const REPORT_TYPES: readonly string[] = [
  'ingresos',
  'pagos-completos',
  'pagos-incompletos',
  'pagos-deportes',
  'pagos-transporte',
];
const DIA_VENCIMIENTO = 10;
const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina (UTC-3)

type EstadoCuota = 'pagada' | 'parcial' | 'pendiente' | 'vencida';

interface PagoItem {
  id: string;
  cuotaId: string;
  importe: number;
  fechaPagoISO: string;
  medioPago: string;
  observacion: string;
  registradoPor: string | null;
}

interface CuotaConPagos {
  id: string;
  studentId: string;
  parentUid: string;
  alumno: string;
  anio: number;
  mes: number;
  periodo: string;
  concepto: string;
  descripcion: string;
  deporteId: string | null;
  deporteNombre: string | null;
  recorridoId: string | null;
  recorridoNombre: string | null;
  nivel: string;
  importe: number;
  pagado: number;
  saldo: number;
  estado: EstadoCuota;
  vencimientoISO: string;
  pagos: PagoItem[];
}

export const DEPORTES_SEED = [
  {
    id: 'dep-futbol',
    nombre: 'Fútbol',
    nivel: 'primaria',
    horario: 'Martes y Jueves 17:00 a 18:30',
    profesorNombre: 'Prof. Diego Sosa',
    arancel: 15000,
  },
  {
    id: 'dep-natacion',
    nombre: 'Natación',
    nivel: 'secundaria',
    horario: 'Lunes y Miércoles 18:30 a 20:00',
    profesorNombre: 'Prof. Laura Benítez',
    arancel: 18000,
  },
  {
    id: 'dep-basquet',
    nombre: 'Básquet',
    nivel: 'secundaria',
    horario: 'Martes y Viernes 19:00 a 20:30',
    profesorNombre: 'Prof. Marcos Pereyra',
    arancel: 16000,
  },
  {
    id: 'dep-voleibol',
    nombre: 'Voleibol',
    nivel: 'inicial',
    horario: 'Sábados 10:00 a 11:30',
    profesorNombre: 'Prof. Carla Ledesma',
    arancel: 12000,
  },
];

export const RECORRIDOS_SEED = [
  {
    id: 'rec-norte',
    nombre: 'Recorrido Norte',
    zona: 'Zona Norte',
    descripcion: 'Av. Central, Barrio Los Álamos, Plaza Norte',
    arancel: 9000,
  },
  {
    id: 'rec-sur',
    nombre: 'Recorrido Sur',
    zona: 'Zona Sur',
    descripcion: 'Ruta 9 km 4, Barrio San José, Terminal',
    arancel: 10000,
  },
  {
    id: 'rec-centro',
    nombre: 'Recorrido Centro',
    zona: 'Centro',
    descripcion: 'Microcentro, Municipalidad, Estación Central',
    arancel: 8500,
  },
];

const IMPORTE_MENSUAL = 45000;

/* ------------------------------- Utilidades ------------------------------ */

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sendFunctionError(res: any, error: any) {
  const status = typeof error?.status === 'number' ? error.status : 500;
  const message =
    status >= 500
      ? 'Error interno del servidor.'
      : error?.message || 'Solicitud inválida.';
  res.status(status).send({ error: message });
}

async function verifyAuth(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(
      401,
      'No autorizado: Cabecera Authorization faltante o inválida.'
    );
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error('[pagos.verifyAuth] Error verificando token:', error);
    throw new HttpError(401, 'No autorizado: Token de ID inválido.');
  }
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Fecha "corrida" a hora de Argentina para calcular el día calendario local. */
function fechaArgentina() {
  return new Date(Date.now() - AR_OFFSET_MS);
}

function hoyISO(fecha: Date = fechaArgentina()) {
  return `${fecha.getUTCFullYear()}-${pad2(fecha.getUTCMonth() + 1)}-${pad2(fecha.getUTCDate())}`;
}

function periodKey(anio: number, mes: number) {
  return `${anio}-${pad2(mes)}`;
}

function periodoLabel(anio: number, mes: number) {
  return `${MESES[mes - 1] || ''} ${anio}`.trim();
}

function vencimientoDe(anio: number, mes: number) {
  return `${anio}-${pad2(mes)}-${pad2(DIA_VENCIMIENTO)}`;
}

function parseFechaISO(value: unknown): string | null {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text)
    return null;
  return text;
}

/** Último día hábil (lunes a viernes) del mes de la fecha indicada. */
function esUltimoDiaHabilDelMes(fecha: Date) {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth();
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0, 12, 0, 0));
  while (ultimo.getUTCDay() === 0 || ultimo.getUTCDay() === 6) {
    ultimo.setUTCDate(ultimo.getUTCDate() - 1);
  }
  return fecha.getUTCDate() === ultimo.getUTCDate();
}

function calcularEstado(
  importe: number,
  pagado: number,
  vencimientoISO: string
): EstadoCuota {
  if (importe > 0 && pagado >= importe) return 'pagada';
  if (vencimientoISO && vencimientoISO < hoyISO()) return 'vencida';
  return pagado > 0 ? 'parcial' : 'pendiente';
}

/* --------------------------- Acceso a datos ------------------------------ */

function serializarPago(item: { id: string; data: any }): PagoItem {
  const data = item.data || {};
  return {
    id: item.id,
    cuotaId: data.cuotaId || '',
    importe: Number(data.importe) || 0,
    fechaPagoISO: data.fechaPagoISO || '',
    medioPago: data.medioPago || '',
    observacion: data.observacion || '',
    registradoPor: data.registradoPor || null,
  };
}

function construirCuota(
  id: string,
  data: any,
  pagos: Array<{ id: string; data: any }>,
  alumno?: { nombre?: string; nivel?: string }
): CuotaConPagos {
  const anio = Number(data.anio) || 0;
  const mes = Number(data.mes) || 0;
  const importe = Number(data.importe) || 0;
  const pagado = round2(
    pagos.reduce((acc, pago) => acc + (Number(pago.data?.importe) || 0), 0)
  );
  const saldo = Math.max(0, round2(importe - pagado));
  const vencimientoISO = data.vencimientoISO || vencimientoDe(anio, mes);
  return {
    id,
    studentId: data.studentId || '',
    parentUid: data.parentUid || '',
    alumno: alumno?.nombre || data.alumnoNombre || '',
    anio,
    mes,
    periodo: periodoLabel(anio, mes),
    concepto: data.concepto || 'mensual',
    descripcion: data.descripcion || '',
    deporteId: data.deporteId || null,
    deporteNombre: data.deporteNombre || null,
    recorridoId: data.recorridoId || null,
    recorridoNombre: data.recorridoNombre || null,
    nivel: data.nivel || alumno?.nivel || '',
    importe,
    pagado,
    saldo,
    estado: calcularEstado(importe, pagado, vencimientoISO),
    vencimientoISO,
    pagos: pagos
      .map(serializarPago)
      .sort((a, b) => b.fechaPagoISO.localeCompare(a.fechaPagoISO)),
  };
}

async function obtenerCuotas(filtro: {
  studentId?: string;
  parentUid?: string;
}): Promise<Array<{ id: string; data: any }>> {
  let query: Query = db.collection('cuotas');
  if (filtro.studentId) {
    query = query.where('studentId', '==', filtro.studentId);
  } else if (filtro.parentUid) {
    query = query.where('parentUid', '==', filtro.parentUid);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() || {} }));
}

async function cargarPagosPorCuota(
  cuotaIds: string[]
): Promise<Map<string, Array<{ id: string; data: any }>>> {
  const mapa = new Map<string, Array<{ id: string; data: any }>>();
  for (let i = 0; i < cuotaIds.length; i += 10) {
    const chunk = cuotaIds.slice(i, i + 10);
    if (chunk.length === 0) continue;
    const snapshot = await db
      .collection('pagos')
      .where('cuotaId', 'in', chunk)
      .get();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const lista = mapa.get(data.cuotaId) || [];
      lista.push({ id: doc.id, data });
      mapa.set(data.cuotaId, lista);
    });
  }
  return mapa;
}

async function cargarAlumnos(studentIds: string[]): Promise<Map<string, any>> {
  const mapa = new Map<string, any>();
  const unicos = [...new Set(studentIds.filter(Boolean))];
  for (let i = 0; i < unicos.length; i += 10) {
    const chunk = unicos.slice(i, i + 10);
    const docs = await Promise.all(
      chunk.map((studentId) => db.collection('students').doc(studentId).get())
    );
    docs.forEach((doc) => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      mapa.set(doc.id, {
        id: doc.id,
        nombre: data.nombre || '',
        nivel: data.nivel || '',
        parentId: data.parentId || '',
        emailPadre: data.emailPadre || '',
      });
    });
  }
  return mapa;
}

async function cargarUsuarios(uids: string[]): Promise<Map<string, any>> {
  const mapa = new Map<string, any>();
  const unicos = [...new Set(uids.filter(Boolean))];
  for (let i = 0; i < unicos.length; i += 10) {
    const chunk = unicos.slice(i, i + 10);
    const docs = await Promise.all(
      chunk.map((uid) => db.collection('users').doc(uid).get())
    );
    docs.forEach((doc) => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      mapa.set(doc.id, {
        id: doc.id,
        nombre: data.nombre || '',
        email: data.email || '',
        role: data.role || '',
      });
    });
  }
  return mapa;
}

async function cargarCuotasConPagos(filtro: {
  studentId?: string;
  parentUid?: string;
}): Promise<CuotaConPagos[]> {
  const registros = await obtenerCuotas(filtro);
  const alumnosMap = await cargarAlumnos(
    registros.map((item) => item.data.studentId)
  );
  const pagosMap = await cargarPagosPorCuota(registros.map((item) => item.id));
  return registros
    .map((item) =>
      construirCuota(
        item.id,
        item.data,
        pagosMap.get(item.id) || [],
        alumnosMap.get(item.data.studentId)
      )
    )
    .sort(
      (a, b) =>
        a.anio - b.anio ||
        a.mes - b.mes ||
        a.descripcion.localeCompare(b.descripcion)
    );
}

/* ----------------------- Módulo Móvil: Gestión de Cuotas ------------------ */

export const cf_getCuotas = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    try {
      const claims = await verifyAuth(req);
      const role = claims.role;
      if (!['Estudiante', 'Padre', 'user_admin'].includes(role)) {
        throw new HttpError(403, 'Permisos insuficientes.');
      }

      const anio = Number(req.query.anio) || fechaArgentina().getUTCFullYear();
      if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
        throw new HttpError(400, 'El año lectivo es inválido.');
      }

      const requested = req.query.studentId ? String(req.query.studentId) : '';
      let studentIds: string[] = [];

      if (role === 'Estudiante') {
        if (requested && requested !== claims.uid) {
          throw new HttpError(403, 'Permisos insuficientes.');
        }
        studentIds = [claims.uid];
      } else if (role === 'Padre') {
        if (requested) {
          const studentDoc = await db
            .collection('students')
            .doc(requested)
            .get();
          if (!studentDoc.exists) {
            throw new HttpError(404, 'Estudiante no encontrado.');
          }
          if (studentDoc.data()?.parentId !== claims.uid) {
            throw new HttpError(403, 'Permisos insuficientes.');
          }
          studentIds = [requested];
        } else {
          const hijos = await db
            .collection('students')
            .where('parentId', '==', claims.uid)
            .get();
          studentIds = hijos.docs.map((doc) => doc.id);
        }
      } else if (requested) {
        studentIds = [requested];
      }

      let cuotas: CuotaConPagos[];
      if (studentIds.length > 0) {
        const porAlumno = await Promise.all(
          studentIds.map((studentId) => cargarCuotasConPagos({ studentId }))
        );
        cuotas = porAlumno.flat().filter((cuota) => cuota.anio === anio);
      } else {
        cuotas = (await cargarCuotasConPagos({})).filter(
          (cuota) => cuota.anio === anio
        );
      }

      const alumnosMap = await cargarAlumnos(
        cuotas.map((cuota) => cuota.studentId)
      );
      cuotas = cuotas.map((cuota) => ({
        ...cuota,
        alumno: cuota.alumno || alumnosMap.get(cuota.studentId)?.nombre || '',
      }));

      const resumen = {
        cantidadCuotas: cuotas.length,
        totalImporte: round2(
          cuotas.reduce((acc, cuota) => acc + cuota.importe, 0)
        ),
        totalPagado: round2(
          cuotas.reduce((acc, cuota) => acc + cuota.pagado, 0)
        ),
        totalPendiente: round2(
          cuotas.reduce((acc, cuota) => acc + cuota.saldo, 0)
        ),
        cuotasPagadas: cuotas.filter((cuota) => cuota.estado === 'pagada')
          .length,
        cuotasPendientes: cuotas.filter((cuota) => cuota.estado !== 'pagada')
          .length,
      };

      const alumno =
        studentIds.length === 1 ? alumnosMap.get(studentIds[0]) || null : null;

      res.status(200).send({ alumno, anio, resumen, cuotas });
    } catch (error: any) {
      console.error('Error en cf_getCuotas:', error);
      sendFunctionError(res, error);
    }
  }
);

/* --------------------------- Web: Reportes de pagos ---------------------- */

function agregarPorAnio(cuotas: CuotaConPagos[]) {
  const mapa = new Map<
    number,
    {
      anio: number;
      cantidad: number;
      totalImporte: number;
      totalPagado: number;
    }
  >();
  cuotas.forEach((cuota) => {
    const item = mapa.get(cuota.anio) || {
      anio: cuota.anio,
      cantidad: 0,
      totalImporte: 0,
      totalPagado: 0,
    };
    item.cantidad += 1;
    item.totalImporte = round2(item.totalImporte + cuota.importe);
    item.totalPagado = round2(item.totalPagado + cuota.pagado);
    mapa.set(cuota.anio, item);
  });
  return [...mapa.values()].sort((a, b) => a.anio - b.anio);
}

function filaCuota(cuota: CuotaConPagos) {
  return {
    id: cuota.id,
    anio: cuota.anio,
    mes: cuota.mes,
    periodo: cuota.periodo,
    alumno: cuota.alumno,
    nivel: cuota.nivel,
    concepto: cuota.descripcion,
    importe: cuota.importe,
    pagado: cuota.pagado,
    saldo: cuota.saldo,
    estado: cuota.estado,
    vencimientoISO: cuota.vencimientoISO,
    fechaUltimoPago: cuota.pagos[0]?.fechaPagoISO || '',
  };
}

export const cf_getReportesPagos = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    try {
      const claims = await verifyAuth(req);
      if (claims.role !== 'user_admin') {
        throw new HttpError(
          403,
          'Permisos insuficientes: Requiere rol user_admin.'
        );
      }

      const tipo = String(req.query.tipo || '').trim();
      if (!REPORT_TYPES.includes(tipo)) {
        throw new HttpError(
          400,
          `Tipo de reporte inválido. Debe ser uno de: ${REPORT_TYPES.join(', ')}.`
        );
      }

      const anioActual = fechaArgentina().getUTCFullYear();
      const desde = parseFechaISO(req.query.desde) || `${anioActual}-01-01`;
      const hasta = parseFechaISO(req.query.hasta) || hoyISO();
      if (desde > hasta) {
        throw new HttpError(
          400,
          'La fecha "desde" no puede ser posterior a la fecha "hasta".'
        );
      }
      const desdeMes = desde.slice(0, 7);
      const hastaMes = hasta.slice(0, 7);

      const cuotas = await cargarCuotasConPagos({});

      if (tipo === 'ingresos') {
        const pagos: Array<{
          id: string;
          cuotaId: string;
          importe: number;
          fechaPagoISO: string;
          medioPago: string;
          descripcion: string;
        }> = [];
        const pagosMap = await cargarPagosPorCuota(
          cuotas.map((cuota) => cuota.id)
        );
        pagosMap.forEach((lista, cuotaId) => {
          lista.forEach((pago) => {
            const data = pago.data || {};
            const fechaPagoISO = data.fechaPagoISO || '';
            if (!fechaPagoISO || fechaPagoISO < desde || fechaPagoISO > hasta)
              return;
            pagos.push({
              id: pago.id,
              cuotaId,
              importe: Number(data.importe) || 0,
              fechaPagoISO,
              medioPago: data.medioPago || '',
              descripcion: data.descripcion || '',
            });
          });
        });

        const cuotaById = new Map(cuotas.map((cuota) => [cuota.id, cuota]));
        const filas = pagos
          .map((pago) => {
            const cuota = cuotaById.get(pago.cuotaId);
            return {
              id: pago.id,
              fechaPagoISO: pago.fechaPagoISO,
              alumno: cuota?.alumno || '',
              periodo: cuota?.periodo || '',
              concepto: cuota?.descripcion || pago.descripcion || '',
              medioPago: pago.medioPago,
              importe: pago.importe,
              anio: cuota?.anio || 0,
              mes: cuota?.mes || 0,
            };
          })
          .sort(
            (a, b) =>
              b.fechaPagoISO.localeCompare(a.fechaPagoISO) ||
              b.id.localeCompare(a.id)
          );

        const porMesMap = new Map<
          string,
          { anio: number; mes: number; periodo: string; total: number }
        >();
        filas.forEach((fila) => {
          const key = periodKey(fila.anio, fila.mes);
          const item = porMesMap.get(key) || {
            anio: fila.anio,
            mes: fila.mes,
            periodo: periodoLabel(fila.anio, fila.mes),
            total: 0,
          };
          item.total = round2(item.total + fila.importe);
          porMesMap.set(key, item);
        });

        const totalIngresos = round2(
          filas.reduce((acc, fila) => acc + fila.importe, 0)
        );
        res.status(200).send({
          tipo,
          desde,
          hasta,
          resumen: { totalIngresos, cantidadPagos: filas.length },
          porMes: [...porMesMap.values()].sort((a, b) =>
            periodKey(a.anio, a.mes).localeCompare(periodKey(b.anio, b.mes))
          ),
          filas,
        });
        return;
      }

      const enRango = cuotas.filter((cuota) => {
        const key = periodKey(cuota.anio, cuota.mes);
        return key >= desdeMes && key <= hastaMes;
      });

      if (tipo === 'pagos-completos') {
        const filtradas = enRango.filter((cuota) => cuota.estado === 'pagada');
        res.status(200).send({
          tipo,
          desde,
          hasta,
          resumen: {
            cantidadCuotas: filtradas.length,
            totalImporte: round2(
              filtradas.reduce((acc, cuota) => acc + cuota.importe, 0)
            ),
            totalPagado: round2(
              filtradas.reduce((acc, cuota) => acc + cuota.pagado, 0)
            ),
          },
          porAnio: agregarPorAnio(filtradas),
          filas: filtradas.map(filaCuota),
        });
        return;
      }

      if (tipo === 'pagos-incompletos') {
        const filtradas = enRango.filter((cuota) => cuota.estado !== 'pagada');
        res.status(200).send({
          tipo,
          desde,
          hasta,
          resumen: {
            cantidadCuotas: filtradas.length,
            totalImporte: round2(
              filtradas.reduce((acc, cuota) => acc + cuota.importe, 0)
            ),
            totalPagado: round2(
              filtradas.reduce((acc, cuota) => acc + cuota.pagado, 0)
            ),
            totalDeuda: round2(
              filtradas.reduce((acc, cuota) => acc + cuota.saldo, 0)
            ),
          },
          porAnio: agregarPorAnio(filtradas),
          filas: filtradas.map(filaCuota),
        });
        return;
      }

      if (tipo === 'pagos-deportes') {
        const deportesSnap = await db.collection('deportes').get();
        const deportes = new Map<string, any>();
        deportesSnap.docs.forEach((doc) =>
          deportes.set(doc.id, doc.data() || {})
        );

        const filtradas = enRango.filter(
          (cuota) => cuota.concepto === 'deporte'
        );
        const filas = filtradas.map((cuota) => {
          const deporte = cuota.deporteId
            ? deportes.get(cuota.deporteId) || {}
            : {};
          return {
            ...filaCuota(cuota),
            deporte: cuota.deporteNombre || deporte.nombre || '',
            deporteNivel: deporte.nivel || '',
            horario: deporte.horario || '',
            profesor: deporte.profesorNombre || '',
          };
        });
        res.status(200).send({
          tipo,
          desde,
          hasta,
          resumen: {
            cantidadCuotas: filas.length,
            totalImporte: round2(
              filas.reduce((acc, fila) => acc + fila.importe, 0)
            ),
            totalPagado: round2(
              filas.reduce((acc, fila) => acc + fila.pagado, 0)
            ),
          },
          porAnio: agregarPorAnio(filtradas),
          filas,
        });
        return;
      }

      // pagos-transporte
      const recorridosSnap = await db.collection('recorridos').get();
      const recorridos = new Map<string, any>();
      recorridosSnap.docs.forEach((doc) =>
        recorridos.set(doc.id, doc.data() || {})
      );

      const filtradas = enRango.filter(
        (cuota) => cuota.concepto === 'transporte'
      );
      const filas = filtradas.map((cuota) => {
        const recorrido = cuota.recorridoId
          ? recorridos.get(cuota.recorridoId) || {}
          : {};
        return {
          ...filaCuota(cuota),
          recorrido: cuota.recorridoNombre || recorrido.nombre || '',
          zona: recorrido.zona || '',
        };
      });
      res.status(200).send({
        tipo,
        desde,
        hasta,
        resumen: {
          cantidadCuotas: filas.length,
          totalImporte: round2(
            filas.reduce((acc, fila) => acc + fila.importe, 0)
          ),
          totalPagado: round2(
            filas.reduce((acc, fila) => acc + fila.pagado, 0)
          ),
        },
        porAnio: agregarPorAnio(filtradas),
        filas,
      });
    } catch (error: any) {
      console.error('Error en cf_getReportesPagos:', error);
      sendFunctionError(res, error);
    }
  }
);

/* --------------------------- Registro de pagos --------------------------- */

export const cf_registrarPago = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    try {
      const claims = await verifyAuth(req);
      if (claims.role !== 'user_admin') {
        throw new HttpError(
          403,
          'Permisos insuficientes: Requiere rol user_admin.'
        );
      }

      const { cuotaId, importe, medioPago, fechaPago, observacion } =
        req.body || {};
      if (!cuotaId || typeof cuotaId !== 'string') {
        throw new HttpError(400, 'Falta el ID de la cuota (cuotaId).');
      }
      const importeNum = Number(importe);
      if (!Number.isFinite(importeNum) || importeNum <= 0) {
        throw new HttpError(
          400,
          'El importe del pago debe ser un número mayor a cero.'
        );
      }
      const medio = String(medioPago || '')
        .trim()
        .toLowerCase();
      if (!MEDIOS_PAGO.includes(medio)) {
        throw new HttpError(
          400,
          `Medio de pago inválido. Debe ser uno de: ${MEDIOS_PAGO.join(', ')}.`
        );
      }
      const fechaISO = parseFechaISO(fechaPago) || hoyISO();

      const cuotaDoc = await db.collection('cuotas').doc(cuotaId).get();
      if (!cuotaDoc.exists) {
        throw new HttpError(404, 'La cuota no existe.');
      }
      const cuotaData = cuotaDoc.data() || {};

      const pagoRef = await db.collection('pagos').add({
        cuotaId,
        studentId: cuotaData.studentId || '',
        parentUid: cuotaData.parentUid || '',
        anio: Number(cuotaData.anio) || 0,
        mes: Number(cuotaData.mes) || 0,
        concepto: cuotaData.concepto || 'mensual',
        descripcion: cuotaData.descripcion || '',
        importe: round2(importeNum),
        fechaPagoISO: fechaISO,
        fechaPago: Timestamp.fromDate(new Date(`${fechaISO}T12:00:00.000Z`)),
        medioPago: medio,
        observacion: String(observacion || '').trim(),
        registradoPor: claims.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      const pagosSnap = await db
        .collection('pagos')
        .where('cuotaId', '==', cuotaId)
        .get();
      const pagado = round2(
        pagosSnap.docs.reduce(
          (acc, doc) => acc + (Number(doc.data().importe) || 0),
          0
        )
      );
      const importeCuota = Number(cuotaData.importe) || 0;
      const vencimientoISO =
        cuotaData.vencimientoISO ||
        vencimientoDe(Number(cuotaData.anio), Number(cuotaData.mes));

      res.status(201).send({
        id: pagoRef.id,
        message: 'Pago registrado correctamente.',
        cuotaId,
        importe: round2(importeNum),
        pagado,
        saldo: Math.max(0, round2(importeCuota - pagado)),
        estado: calcularEstado(importeCuota, pagado, vencimientoISO),
      });
    } catch (error: any) {
      console.error('Error en cf_registrarPago:', error);
      sendFunctionError(res, error);
    }
  }
);

/* ------------------------------ Seed de cuotas --------------------------- */

function calcularPagoSeed(
  index: number,
  anio: number,
  mes: number,
  importe: number
) {
  const actual = fechaArgentina();
  const claveActual = periodKey(
    actual.getUTCFullYear(),
    actual.getUTCMonth() + 1
  );
  const clave = periodKey(anio, mes);
  if (clave < claveActual) {
    return {
      importe,
      fechaPagoISO: `${anio}-${pad2(mes)}-05`,
      medioPago: 'transferencia',
    };
  }
  if (clave === claveActual) {
    const modo = index % 3;
    if (modo === 0)
      return { importe, fechaPagoISO: hoyISO(), medioPago: 'transferencia' };
    if (modo === 1) {
      return {
        importe: Math.round(importe / 2),
        fechaPagoISO: hoyISO(),
        medioPago: 'efectivo',
      };
    }
  }
  return null;
}

export const cf_seedCuotas = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    try {
      const claims = await verifyAuth(req);
      if (claims.role !== 'user_admin') {
        throw new HttpError(
          403,
          'Permisos insuficientes: Requiere rol user_admin.'
        );
      }

      const actual = fechaArgentina();
      const anio = Number(req.body?.anio) || actual.getUTCFullYear();
      if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
        throw new HttpError(400, 'El año lectivo es inválido.');
      }
      const esAnioActual = anio === actual.getUTCFullYear();
      const mesHastaDefault = esAnioActual ? actual.getUTCMonth() + 1 : 12;
      const mesHasta = Math.min(
        12,
        Math.max(1, Number(req.body?.mesHasta) || mesHastaDefault)
      );

      for (const deporte of DEPORTES_SEED) {
        await db
          .collection('deportes')
          .doc(deporte.id)
          .set(
            {
              ...deporte,
              activo: true,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      }
      for (const recorrido of RECORRIDOS_SEED) {
        await db
          .collection('recorridos')
          .doc(recorrido.id)
          .set(
            {
              ...recorrido,
              activo: true,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      }

      const alumnosSnap = await db.collection('students').get();
      const alumnos = alumnosSnap.docs.map((doc) => ({
        id: doc.id,
        data: doc.data() || {},
      }));

      let cuotasCreadas = 0;
      let pagosCreados = 0;

      for (let index = 0; index < alumnos.length; index++) {
        const alumno = alumnos[index];
        const nivel = String(alumno.data.nivel || 'inicial');
        const deporte =
          DEPORTES_SEED.find((item) => item.nivel === nivel) || null;
        const recorrido = RECORRIDOS_SEED[index % RECORRIDOS_SEED.length];

        for (let mes = 1; mes <= mesHasta; mes++) {
          const conceptos: Array<{
            key: string;
            concepto: string;
            descripcion: string;
            importe: number;
            deporteId?: string;
            deporteNombre?: string;
            recorridoId?: string;
            recorridoNombre?: string;
          }> = [
            {
              key: 'mensual',
              concepto: 'mensual',
              descripcion: 'Cuota mensual',
              importe: IMPORTE_MENSUAL,
            },
          ];
          if (deporte) {
            conceptos.push({
              key: `deporte-${deporte.id}`,
              concepto: 'deporte',
              descripcion: `Deporte: ${deporte.nombre}`,
              importe: deporte.arancel,
              deporteId: deporte.id,
              deporteNombre: deporte.nombre,
            });
          }
          if (recorrido) {
            conceptos.push({
              key: `transporte-${recorrido.id}`,
              concepto: 'transporte',
              descripcion: `Transporte: ${recorrido.nombre}`,
              importe: recorrido.arancel,
              recorridoId: recorrido.id,
              recorridoNombre: recorrido.nombre,
            });
          }

          for (const concepto of conceptos) {
            const cuotaId = `${alumno.id}_${anio}_${pad2(mes)}_${concepto.key}`;
            const vencimientoISO = vencimientoDe(anio, mes);
            await db
              .collection('cuotas')
              .doc(cuotaId)
              .set(
                {
                  studentId: alumno.id,
                  parentUid: alumno.data.parentId || '',
                  alumnoNombre: alumno.data.nombre || '',
                  anio,
                  mes,
                  concepto: concepto.concepto,
                  descripcion: concepto.descripcion,
                  deporteId: concepto.deporteId || null,
                  deporteNombre: concepto.deporteNombre || null,
                  recorridoId: concepto.recorridoId || null,
                  recorridoNombre: concepto.recorridoNombre || null,
                  nivel,
                  importe: concepto.importe,
                  vencimientoISO,
                  createdAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            cuotasCreadas++;

            const pago = calcularPagoSeed(index, anio, mes, concepto.importe);
            if (pago) {
              await db
                .collection('pagos')
                .doc(`${cuotaId}_p1`)
                .set(
                  {
                    cuotaId,
                    studentId: alumno.id,
                    parentUid: alumno.data.parentId || '',
                    anio,
                    mes,
                    concepto: concepto.concepto,
                    descripcion: concepto.descripcion,
                    importe: pago.importe,
                    fechaPagoISO: pago.fechaPagoISO,
                    fechaPago: Timestamp.fromDate(
                      new Date(`${pago.fechaPagoISO}T12:00:00.000Z`)
                    ),
                    medioPago: pago.medioPago,
                    observacion: '',
                    registradoPor: claims.uid,
                    createdAt: FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                );
              pagosCreados++;
            }
          }
        }
      }

      res.status(201).send({
        message:
          'Cuotas, deportes, recorridos y pagos de ejemplo generados con éxito.',
        anio,
        mesHasta,
        alumnos: alumnos.length,
        cuotasCreadas,
        pagosCreados,
      });
    } catch (error: any) {
      console.error('Error en cf_seedCuotas:', error);
      sendFunctionError(res, error);
    }
  }
);

/* --------------------- Notificaciones por correo (F1/F2) ----------------- */

const MAILING_COLLECTION = 'mailingsCuotas';

async function yaEnviadoHoy(tipo: string) {
  const ref = db.collection(MAILING_COLLECTION).doc(`${tipo}_${hoyISO()}`);
  return (await ref.get()).exists;
}

async function registrarMailing(tipo: string, destinatarios: string[]) {
  await db.collection(MAILING_COLLECTION).doc(`${tipo}_${hoyISO()}`).set({
    tipo,
    fecha: hoyISO(),
    destinatarios,
    cantidad: destinatarios.length,
    enviadoEn: FieldValue.serverTimestamp(),
  });
}

function filaTablaHtml(
  alumno: string,
  concepto: string,
  vencimiento: string,
  importe: number,
  saldo?: number
) {
  const saldoCell =
    saldo === undefined
      ? ''
      : `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatMoney(saldo)}</td>`;
  return `<tr>
    <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${alumno}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${concepto}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${vencimiento}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatMoney(importe)}</td>
    ${saldoCell}
  </tr>`;
}

function emailWrapper(titulo: string, cuerpo: string) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#232c51;max-width:640px;margin:0 auto;">
      <h1 style="font-size:20px;color:#ea580c;">${titulo}</h1>
      ${cuerpo}
      <p style="margin-top:24px;font-size:12px;color:#6c759e;">
        Educar para Transformar · Este mensaje fue generado automáticamente.
      </p>
    </div>
  `;
}

async function enviarRecordatoriosCuotasMes(
  anio: number,
  mes: number,
  opciones: { forzar?: boolean } = {}
) {
  const tipo = 'recordatorio-cuotas';
  if (!opciones.forzar && (await yaEnviadoHoy(tipo))) {
    return {
      omitido: true,
      motivo: 'Ya se envió el recordatorio hoy.',
      correosEnviados: 0,
      padres: 0,
    };
  }

  const registros = await obtenerCuotas({});
  const delMes = registros.filter(
    (item) => Number(item.data.anio) === anio && Number(item.data.mes) === mes
  );
  if (delMes.length === 0) {
    return {
      omitido: false,
      motivo: 'No hay cuotas para el período.',
      correosEnviados: 0,
      padres: 0,
    };
  }

  const alumnosMap = await cargarAlumnos(
    delMes.map((item) => item.data.studentId)
  );
  const pagosMap = await cargarPagosPorCuota(delMes.map((item) => item.id));
  const cuotas = delMes.map((item) =>
    construirCuota(
      item.id,
      item.data,
      pagosMap.get(item.id) || [],
      alumnosMap.get(item.data.studentId)
    )
  );

  const porPadre = new Map<string, CuotaConPagos[]>();
  cuotas.forEach((cuota) => {
    if (!cuota.parentUid) return;
    const lista = porPadre.get(cuota.parentUid) || [];
    lista.push(cuota);
    porPadre.set(cuota.parentUid, lista);
  });

  const padresMap = await cargarUsuarios([...porPadre.keys()]);
  const periodo = periodoLabel(anio, mes);
  const destinatarios: string[] = [];

  for (const [parentUid, cuotasPadre] of porPadre) {
    const padre = padresMap.get(parentUid);
    const email =
      padre?.email ||
      alumnosMap.get(cuotasPadre[0]?.studentId)?.emailPadre ||
      '';
    if (!email) continue;

    const total = round2(
      cuotasPadre.reduce((acc, cuota) => acc + cuota.importe, 0)
    );
    const pagado = round2(
      cuotasPadre.reduce((acc, cuota) => acc + cuota.pagado, 0)
    );
    const saldo = round2(total - pagado);

    const filas = cuotasPadre
      .map((cuota) =>
        filaTablaHtml(
          cuota.alumno || 'Alumno',
          cuota.descripcion,
          cuota.vencimientoISO,
          cuota.importe
        )
      )
      .join('');

    const cuerpo = `
      <p>Hola ${padre?.nombre || 'tutor'},</p>
      <p>Le recordamos el total a abonar correspondiente a <strong>${periodo}</strong>, con el detalle de su composición:</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
        <thead>
          <tr>
            <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ea580c;">Alumno</th>
            <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ea580c;">Concepto</th>
            <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ea580c;">Vencimiento</th>
            <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ea580c;">Importe</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p><strong>Total del período:</strong> ${formatMoney(total)}<br/>
      <strong>Ya abonado:</strong> ${formatMoney(pagado)}<br/>
      <strong>Saldo a abonar:</strong> ${formatMoney(saldo)}</p>
      <p>Adjuntamos la factura del período en formato PDF.</p>
    `;

    const facturaItems: FacturaItem[] = cuotasPadre.map((cuota) => ({
      descripcion: `${cuota.descripcion}${cuota.alumno ? ` - ${cuota.alumno}` : ''}`,
      vencimiento: cuota.vencimientoISO,
      importe: cuota.importe,
    }));

    const pdf = buildFacturaPdf({
      periodo,
      padreNombre: padre?.nombre || 'Tutor',
      padreEmail: email,
      items: facturaItems,
      total,
      pagado,
      saldo,
      facturaNumero: `F-${anio}${pad2(mes)}-${parentUid.slice(0, 6).toUpperCase()}`,
    });

    await sendEmail({
      to: email,
      subject: `Recordatorio de cuotas ${periodo} - Educar para Transformar`,
      html: emailWrapper(`Recordatorio de cuotas - ${periodo}`, cuerpo),
      attachments: [
        {
          filename: `factura-${anio}-${pad2(mes)}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
    destinatarios.push(email);
  }

  await registrarMailing(tipo, destinatarios);

  return {
    omitido: false,
    motivo: '',
    periodo,
    padres: porPadre.size,
    correosEnviados: destinatarios.length,
  };
}

async function enviarRecordatoriosDeuda(opciones: { forzar?: boolean } = {}) {
  const tipo = 'recordatorio-deuda';
  if (!opciones.forzar && (await yaEnviadoHoy(tipo))) {
    return {
      omitido: true,
      motivo: 'Ya se envió el aviso de deuda hoy.',
      correosEnviados: 0,
      padres: 0,
    };
  }

  const actual = fechaArgentina();
  const claveActual = periodKey(
    actual.getUTCFullYear(),
    actual.getUTCMonth() + 1
  );
  const registros = await obtenerCuotas({});
  const alumnosMap = await cargarAlumnos(
    registros.map((item) => item.data.studentId)
  );
  const pagosMap = await cargarPagosPorCuota(registros.map((item) => item.id));

  const cuotas = registros
    .map((item) =>
      construirCuota(
        item.id,
        item.data,
        pagosMap.get(item.id) || [],
        alumnosMap.get(item.data.studentId)
      )
    )
    .filter((cuota) => cuota.estado !== 'pagada' && cuota.saldo > 0)
    .filter((cuota) => periodKey(cuota.anio, cuota.mes) <= claveActual);

  if (cuotas.length === 0) {
    return {
      omitido: false,
      motivo: 'No hay deudas pendientes.',
      correosEnviados: 0,
      padres: 0,
    };
  }

  const porPadre = new Map<string, CuotaConPagos[]>();
  cuotas.forEach((cuota) => {
    if (!cuota.parentUid) return;
    const lista = porPadre.get(cuota.parentUid) || [];
    lista.push(cuota);
    porPadre.set(cuota.parentUid, lista);
  });

  const padresMap = await cargarUsuarios([...porPadre.keys()]);
  const destinatarios: string[] = [];

  for (const [parentUid, cuotasPadre] of porPadre) {
    const padre = padresMap.get(parentUid);
    const email =
      padre?.email ||
      alumnosMap.get(cuotasPadre[0]?.studentId)?.emailPadre ||
      '';
    if (!email) continue;

    const deuda = round2(
      cuotasPadre.reduce((acc, cuota) => acc + cuota.saldo, 0)
    );
    const filas = cuotasPadre
      .map((cuota) =>
        filaTablaHtml(
          cuota.alumno || 'Alumno',
          `${cuota.periodo} - ${cuota.descripcion}`,
          cuota.vencimientoISO,
          cuota.importe,
          cuota.saldo
        )
      )
      .join('');

    const cuerpo = `
      <p>Hola ${padre?.nombre || 'tutor'},</p>
      <p>Detectamos que aún no se completó el pago de las siguientes cuotas:</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
        <thead>
          <tr>
            <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ea580c;">Alumno</th>
            <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ea580c;">Concepto</th>
            <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ea580c;">Vencimiento</th>
            <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ea580c;">Importe</th>
            <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ea580c;">Saldo</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p><strong>Deuda total pendiente:</strong> ${formatMoney(deuda)}</p>
      <p>Por favor, regularice la situación a la brevedad. Si ya realizó el pago, desestime este mensaje.</p>
    `;

    await sendEmail({
      to: email,
      subject: 'Aviso de deuda pendiente - Educar para Transformar',
      html: emailWrapper('Aviso de deuda pendiente', cuerpo),
    });
    destinatarios.push(email);
  }

  await registrarMailing(tipo, destinatarios);

  return {
    omitido: false,
    motivo: '',
    padres: porPadre.size,
    correosEnviados: destinatarios.length,
    deudaTotal: round2(cuotas.reduce((acc, cuota) => acc + cuota.saldo, 0)),
  };
}

/* ----------------------- Funciones programadas (F1/F2) ------------------- */

/**
 * Funcionalidad 1: último día hábil del mes.
 * Envía el total a abonar por cada padre con el detalle de composición y
 * adjunta la factura del período en PDF.
 */
export const sc_recordatorioCuotasMensual = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'America/Argentina/Buenos_Aires' },
  async () => {
    const hoy = fechaArgentina();
    if (!esUltimoDiaHabilDelMes(hoy)) return;
    const resultado = await enviarRecordatoriosCuotasMes(
      hoy.getUTCFullYear(),
      hoy.getUTCMonth() + 1
    );
    console.log('[sc_recordatorioCuotasMensual]', resultado);
  }
);

/**
 * Funcionalidad 2: día 20 de cada mes.
 * Envía a cada padre la deuda pendiente en caso de no haber completado el pago.
 */
export const sc_recordatorioDeudaDia20 = onSchedule(
  { schedule: '0 9 20 * *', timeZone: 'America/Argentina/Buenos_Aires' },
  async () => {
    const resultado = await enviarRecordatoriosDeuda();
    console.log('[sc_recordatorioDeudaDia20]', resultado);
  }
);

/* ------------------- Disparadores manuales (para pruebas) ---------------- */

export const cf_enviarRecordatorioCuotas = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    try {
      const claims = await verifyAuth(req);
      if (claims.role !== 'user_admin') {
        throw new HttpError(
          403,
          'Permisos insuficientes: Requiere rol user_admin.'
        );
      }
      const actual = fechaArgentina();
      const anio = Number(req.body?.anio) || actual.getUTCFullYear();
      const mes = Number(req.body?.mes) || actual.getUTCMonth() + 1;
      if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
        throw new HttpError(400, 'El año es inválido.');
      }
      if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
        throw new HttpError(400, 'El mes debe ser un número entre 1 y 12.');
      }
      const resultado = await enviarRecordatoriosCuotasMes(anio, mes, {
        forzar: req.body?.forzar !== false,
      });
      res.status(200).send(resultado);
    } catch (error: any) {
      console.error('Error en cf_enviarRecordatorioCuotas:', error);
      sendFunctionError(res, error);
    }
  }
);

export const cf_enviarRecordatorioDeuda = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    try {
      const claims = await verifyAuth(req);
      if (claims.role !== 'user_admin') {
        throw new HttpError(
          403,
          'Permisos insuficientes: Requiere rol user_admin.'
        );
      }
      const resultado = await enviarRecordatoriosDeuda({
        forzar: req.body?.forzar !== false,
      });
      res.status(200).send(resultado);
    } catch (error: any) {
      console.error('Error en cf_enviarRecordatorioDeuda:', error);
      sendFunctionError(res, error);
    }
  }
);
