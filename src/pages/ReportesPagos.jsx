import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

// Catálogo de reportes: debe coincidir con functions/src/pagos.ts (REPORT_TYPES).
const REPORTES = [
  { id: 'ingresos', label: 'Ingresos', icon: 'payments' },
  { id: 'pagos-completos', label: 'Pagos Completos', icon: 'check_circle' },
  {
    id: 'pagos-incompletos',
    label: 'Pagos Incompletos',
    icon: 'pending_actions',
  },
  { id: 'pagos-deportes', label: 'Pagos Deportes', icon: 'sports_soccer' },
  { id: 'pagos-transporte', label: 'Pagos Transporte', icon: 'directions_bus' },
];

const ESTADO_ESTILOS = {
  pagada: 'bg-green-100 text-green-700',
  vencida: 'bg-red-100 text-red-700',
  parcial: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-slate-100 text-slate-600',
};

const MEDIO_ETIQUETA = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercadopago: 'Mercado Pago',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);

const formatFecha = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

const toInputDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const ReportesPagos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const hoy = new Date();
  const [tipo, setTipo] = useState('ingresos');
  const [desde, setDesde] = useState(`${hoy.getFullYear()}-01-01`);
  const [hasta, setHasta] = useState(toInputDate(hoy));

  const [reporte, setReporte] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState('');
  const [avisoExito, setAvisoExito] = useState('');
  const [avisoError, setAvisoError] = useState('');

  // Check Auth & Role on mount - Only user_admin allowed
  useEffect(() => {
    const checkAdminAuth = async () => {
      // 1. Check local mock/real context
      const savedUser = localStorage.getItem('school_user');
      const currentUser = savedUser ? JSON.parse(savedUser) : null;

      if (currentUser && currentUser.role === 'user_admin') {
        return;
      }

      // 2. Check real Firebase Auth
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const role = idTokenResult.claims.role;
        if (role === 'user_admin') {
          return;
        }
      }

      // If not allowed, redirect to login
      console.warn(
        'Acceso denegado a Reportes de Pagos. Requiere rol user_admin.'
      );
      navigate('/login');
    };
    checkAdminAuth();
  }, [navigate]);

  const getFunctionsBaseUrl = () =>
    import.meta.env.VITE_FUNCTIONS_BASE_URL ||
    (import.meta.env.DEV
      ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1'
      : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');

  const getToken = async () => {
    let token = 'mock-admin-token';
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    return token;
  };

  const fetchReporte = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await getToken();
      const params = new URLSearchParams({ tipo, desde, hasta });
      const response = await fetch(
        `${getFunctionsBaseUrl()}/cf_getReportesPagos?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error en la petición.');
      }

      const data = await response.json();
      setReporte(data);
    } catch (err) {
      console.error(err);
      setError(
        `Fallo al cargar el reporte: ${err.message || 'Error de conexión.'}`
      );
      setReporte(null);
    } finally {
      setIsLoading(false);
    }
  }, [tipo, desde, hasta]);

  useEffect(() => {
    fetchReporte();
  }, [fetchReporte]);

  // Disparo manual de los recordatorios por email (Funcionalidades 1 y 2)
  const handleEnviarRecordatorio = async (endpoint, confirmMessage) => {
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setEnviando(endpoint);
    setAvisoExito('');
    setAvisoError('');
    try {
      const token = await getToken();
      const response = await fetch(`${getFunctionsBaseUrl()}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error en la petición.');
      }

      const resultado = await response.json();
      if (resultado.omitido) {
        setAvisoExito(
          `Envío omitido: ${resultado.motivo || 'ya se envió hoy.'}`
        );
      } else {
        setAvisoExito(
          `Correos enviados: ${resultado.correosEnviados} (${resultado.padres} tutores)${
            resultado.periodo ? ` — Período ${resultado.periodo}` : ''
          }`
        );
      }
    } catch (err) {
      console.error(err);
      setAvisoError(
        `Fallo al enviar los correos: ${err.message || 'Error de conexión.'}`
      );
    } finally {
      setEnviando('');
    }
  };

  const renderResumen = () => {
    if (!reporte?.resumen) return null;
    const r = reporte.resumen;
    const tarjetas = [];

    if (tipo === 'ingresos') {
      tarjetas.push(
        {
          label: 'Total Ingresos',
          value: formatMoney(r.totalIngresos),
          icon: 'savings',
        },
        {
          label: 'Pagos Registrados',
          value: r.cantidadPagos,
          icon: 'receipt_long',
        }
      );
    } else {
      tarjetas.push(
        { label: 'Cuotas', value: r.cantidadCuotas, icon: 'event_note' },
        {
          label: 'Importe Total',
          value: formatMoney(r.totalImporte),
          icon: 'savings',
        },
        {
          label: 'Total Pagado',
          value: formatMoney(r.totalPagado),
          icon: 'task_alt',
        }
      );
      if (r.totalDeuda !== undefined) {
        tarjetas.push({
          label: 'Deuda Total',
          value: formatMoney(r.totalDeuda),
          icon: 'report',
        });
      }
    }

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.label}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left"
          >
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Icon name={tarjeta.icon} className="text-lg" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {tarjeta.label}
              </span>
            </div>
            <p className="font-headline text-2xl font-extrabold text-slate-800">
              {tarjeta.value}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderPorPeriodo = () => {
    if (!reporte) return null;
    const porAnio = reporte.porAnio || [];
    const porMes = reporte.porMes || [];

    if (porAnio.length > 0) {
      return (
        <div className="flex flex-wrap gap-2 mb-6">
          {porAnio.map((item) => (
            <span
              key={item.anio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"
            >
              <Icon name="calendar_month" className="text-sm" />
              {item.anio}: {item.cantidad} cuotas ·{' '}
              {formatMoney(item.totalPagado)} de{' '}
              {formatMoney(item.totalImporte)}
            </span>
          ))}
        </div>
      );
    }

    if (porMes.length > 0) {
      return (
        <div className="flex flex-wrap gap-2 mb-6">
          {porMes.map((item) => (
            <span
              key={`${item.anio}-${item.mes}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"
            >
              <Icon name="calendar_month" className="text-sm" />
              {item.periodo}: {formatMoney(item.total)}
            </span>
          ))}
        </div>
      );
    }

    return null;
  };

  const renderEstado = (estado) => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
        ESTADO_ESTILOS[estado] || ESTADO_ESTILOS.pendiente
      }`}
    >
      {estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : '—'}
    </span>
  );

  const renderTablaIngresos = (filas) => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-label font-bold text-xs uppercase tracking-wider">
          <th className="py-4 px-6">Fecha de Pago</th>
          <th className="py-4 px-6">Alumno</th>
          <th className="py-4 px-6">Período</th>
          <th className="py-4 px-6">Concepto</th>
          <th className="py-4 px-6">Medio de Pago</th>
          <th className="py-4 px-6 text-right">Importe</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-body text-sm text-slate-700">
        {filas.map((fila) => (
          <tr key={fila.id} className="hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-6 font-mono text-xs">
              {formatFecha(fila.fechaPagoISO)}
            </td>
            <td className="py-4 px-6 font-bold text-slate-800">
              {fila.alumno || '—'}
            </td>
            <td className="py-4 px-6">{fila.periodo || '—'}</td>
            <td className="py-4 px-6">{fila.concepto || '—'}</td>
            <td className="py-4 px-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
                <Icon name="payments" className="text-xs" />
                {MEDIO_ETIQUETA[fila.medioPago] || fila.medioPago || '—'}
              </span>
            </td>
            <td className="py-4 px-6 text-right font-bold text-green-700 whitespace-nowrap">
              {formatMoney(fila.importe)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTablaCuotas = (filas) => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-label font-bold text-xs uppercase tracking-wider">
          <th className="py-4 px-6">Alumno</th>
          <th className="py-4 px-6">Nivel</th>
          <th className="py-4 px-6">Período</th>
          <th className="py-4 px-6">Concepto</th>
          {tipo === 'pagos-deportes' && <th className="py-4 px-6">Deporte</th>}
          {tipo === 'pagos-deportes' && (
            <th className="py-4 px-6">Profesor / Horario</th>
          )}
          {tipo === 'pagos-transporte' && (
            <th className="py-4 px-6">Recorrido / Zona</th>
          )}
          <th className="py-4 px-6 text-right">Importe</th>
          <th className="py-4 px-6 text-right">Pagado</th>
          {tipo === 'pagos-incompletos' && (
            <th className="py-4 px-6 text-right">Saldo</th>
          )}
          <th className="py-4 px-6">Estado</th>
          <th className="py-4 px-6">Vencimiento</th>
          <th className="py-4 px-6">Último Pago</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-body text-sm text-slate-700">
        {filas.map((fila) => (
          <tr key={fila.id} className="hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-6 font-bold text-slate-800">
              {fila.alumno || '—'}
            </td>
            <td className="py-4 px-6">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 whitespace-nowrap">
                {fila.nivel
                  ? fila.nivel.charAt(0).toUpperCase() + fila.nivel.slice(1)
                  : '—'}
              </span>
            </td>
            <td className="py-4 px-6 whitespace-nowrap">
              {fila.periodo || '—'}
            </td>
            <td className="py-4 px-6">{fila.concepto || '—'}</td>
            {tipo === 'pagos-deportes' && (
              <td className="py-4 px-6">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-700">
                    {fila.deporte || '—'}
                  </span>
                  {fila.deporteNivel && (
                    <span className="text-xs text-slate-400">
                      {fila.deporteNivel}
                    </span>
                  )}
                </div>
              </td>
            )}
            {tipo === 'pagos-deportes' && (
              <td className="py-4 px-6">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-700">
                    {fila.profesor || '—'}
                  </span>
                  {fila.horario && (
                    <span className="text-xs text-slate-400">
                      {fila.horario}
                    </span>
                  )}
                </div>
              </td>
            )}
            {tipo === 'pagos-transporte' && (
              <td className="py-4 px-6">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-700">
                    {fila.recorrido || '—'}
                  </span>
                  {fila.zona && (
                    <span className="text-xs text-slate-400">{fila.zona}</span>
                  )}
                </div>
              </td>
            )}
            <td className="py-4 px-6 text-right font-semibold whitespace-nowrap">
              {formatMoney(fila.importe)}
            </td>
            <td className="py-4 px-6 text-right whitespace-nowrap">
              <span
                className={
                  fila.pagado > 0
                    ? 'text-green-700 font-semibold'
                    : 'text-slate-400'
                }
              >
                {formatMoney(fila.pagado)}
              </span>
            </td>
            {tipo === 'pagos-incompletos' && (
              <td className="py-4 px-6 text-right font-bold text-red-700 whitespace-nowrap">
                {formatMoney(fila.saldo)}
              </td>
            )}
            <td className="py-4 px-6">{renderEstado(fila.estado)}</td>
            <td className="py-4 px-6 font-mono text-xs whitespace-nowrap">
              {formatFecha(fila.vencimientoISO)}
            </td>
            <td className="py-4 px-6 font-mono text-xs whitespace-nowrap">
              {fila.fechaUltimoPago ? formatFecha(fila.fechaUltimoPago) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 font-body">
      <Navbar noButtons={true} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="font-headline text-4xl font-extrabold text-slate-800 tracking-tight">
              Reportes de Pagos
            </h1>
            <p className="font-body text-slate-500 mt-2">
              Listados de cuotas, pagos e ingresos del centro educativo.
            </p>
          </div>

          {/* Disparo manual de recordatorios (solo admin) */}
          {user?.role === 'user_admin' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() =>
                  handleEnviarRecordatorio(
                    'cf_enviarRecordatorioCuotas',
                    'Se enviará a cada tutor el total a abonar del mes en curso, con la factura PDF adjunta. ¿Continuar?'
                  )
                }
                disabled={enviando !== ''}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-600/10 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border-none"
              >
                <Icon
                  name={
                    enviando === 'cf_enviarRecordatorioCuotas'
                      ? 'hourglass_top'
                      : 'mail'
                  }
                  className="text-lg"
                />
                {enviando === 'cf_enviarRecordatorioCuotas'
                  ? 'Enviando...'
                  : 'Recordatorio mensual'}
              </button>
              <button
                onClick={() =>
                  handleEnviarRecordatorio(
                    'cf_enviarRecordatorioDeuda',
                    'Se enviará a cada tutor con pagos incompletos el aviso de su deuda pendiente. ¿Continuar?'
                  )
                }
                disabled={enviando !== ''}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-red-700 font-bold text-sm border-2 border-red-200 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Icon
                  name={
                    enviando === 'cf_enviarRecordatorioDeuda'
                      ? 'hourglass_top'
                      : 'notification_important'
                  }
                  className="text-lg"
                />
                {enviando === 'cf_enviarRecordatorioDeuda'
                  ? 'Enviando...'
                  : 'Aviso de deuda'}
              </button>
            </div>
          )}
        </div>

        {/* Avisos de envío de correos */}
        {avisoExito && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-xl flex items-center gap-3 text-green-800">
            <Icon name="check_circle" className="text-green-500 text-2xl" />
            <p className="text-sm font-medium">{avisoExito}</p>
          </div>
        )}
        {avisoError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3 text-red-800">
            <Icon name="error" className="text-red-500 text-2xl" />
            <p className="text-sm font-medium">{avisoError}</p>
          </div>
        )}

        {/* Selector de tipo de reporte */}
        <div className="flex flex-wrap bg-slate-200/60 p-1.5 rounded-full border border-slate-200 gap-1 mb-8">
          {REPORTES.map((reporteOpcion) => (
            <button
              key={reporteOpcion.id}
              onClick={() => setTipo(reporteOpcion.id)}
              className={`px-5 py-2.5 rounded-full font-label font-bold text-sm transition-all cursor-pointer ${
                tipo === reporteOpcion.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={reporteOpcion.icon} className="text-lg" />
                <span>{reporteOpcion.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Filtros de fecha */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            <div className="flex flex-col gap-1 text-left w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Desde
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-all text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 text-left w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hasta
              </label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-all text-sm"
              />
            </div>
          </div>
          <button
            onClick={fetchReporte}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-600/10 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border-none"
          >
            <Icon
              name={isLoading ? 'hourglass_top' : 'refresh'}
              className="text-lg"
            />
            {isLoading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center gap-3 text-amber-800">
            <Icon name="warning" className="text-amber-500 text-2xl" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {renderResumen()}
        {renderPorPeriodo()}

        {/* Tabla del reporte */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="font-semibold">Cargando reporte...</p>
            </div>
          ) : reporte && reporte.filas && reporte.filas.length > 0 ? (
            <div className="overflow-x-auto">
              {tipo === 'ingresos'
                ? renderTablaIngresos(reporte.filas)
                : renderTablaCuotas(reporte.filas)}
            </div>
          ) : reporte ? (
            <div className="p-16 text-center text-slate-500">
              <Icon name="inbox" className="text-5xl text-slate-300 mb-4" />
              <p className="font-bold text-lg">No hay resultados</p>
              <p className="text-sm mt-1">
                Ajustá el rango de fechas o el tipo de reporte.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default ReportesPagos;
