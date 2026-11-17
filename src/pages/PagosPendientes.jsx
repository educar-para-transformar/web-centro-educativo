import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import { auth } from '../services/firebase';

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1'
    : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);

const MEDIO_ETIQUETA = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercadopago: 'Mercado Pago',
};

const descargarBase64 = ({ base64, nombre, mimeType }) => {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: mimeType || 'application/octet-stream',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre || 'comprobante';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const PagosPendientes = () => {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [procesando, setProcesando] = useState('');
  const [descargando, setDescargando] = useState('');
  const [rechazoId, setRechazoId] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const saved = localStorage.getItem('school_user');
      const local = saved ? JSON.parse(saved) : null;
      if (local?.role === 'user_admin') return;
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdTokenResult();
        if (token.claims?.role === 'user_admin') return;
      }
      navigate('/login');
    };
    checkAdmin();
  }, [navigate]);

  const getToken = async () => {
    if (auth.currentUser) return auth.currentUser.getIdToken();
    return 'mock-admin-token';
  };

  const cargarPagos = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await getToken();
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_getPagosPendientes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los pagos.');
      }
      setPagos(Array.isArray(data.pagos) ? data.pagos : []);
      setTotal(Number(data.total) || 0);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudieron cargar los pagos.');
      setPagos([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPagos();
  }, [cargarPagos]);

  const verComprobante = async (pago) => {
    setDescargando(pago.id);
    setError('');
    try {
      const token = await getToken();
      const params = new URLSearchParams({ pagoId: pago.id });
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_getPagoComprobante?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo descargar el comprobante.');
      }
      descargarBase64(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo descargar el comprobante.');
    } finally {
      setDescargando('');
    }
  };

  const revisar = async (pago, action, motivo = '') => {
    if (action === 'aprobar') {
      const ok = window.confirm(
        `¿Aprobar el pago de ${formatMoney(pago.importe)} de ${pago.alumno || 'el alumno'}?`
      );
      if (!ok) return;
    }
    setProcesando(pago.id);
    setError('');
    setAviso('');
    try {
      const token = await getToken();
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_reviewPayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pagoId: pago.id, action, motivo }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo revisar el pago.');
      }
      setAviso(
        action === 'aprobar'
          ? 'Pago aprobado. La cuota del alumno fue actualizada.'
          : 'Pago rechazado.'
      );
      setRechazoId('');
      setMotivoRechazo('');
      cargarPagos();
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo revisar el pago.');
    } finally {
      setProcesando('');
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 font-body">
      <Navbar noButtons={true} />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="font-headline text-4xl font-extrabold text-slate-800 tracking-tight">
              Pagos Pendientes
            </h1>
            <p className="font-body text-slate-500 mt-2">
              Comprobantes subidos por tutores esperando aprobación.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
            >
              <Icon name="arrow_back" className="text-base" />
              Volver al panel
            </button>
            <button
              type="button"
              onClick={cargarPagos}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm cursor-pointer border-none"
            >
              <Icon name="refresh" className="text-base" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600">
            {pagos.length} comprobante{pagos.length === 1 ? '' : 's'} pendiente
            {pagos.length === 1 ? '' : 's'} de revisión
          </p>
          <p className="text-lg font-extrabold text-orange-700">
            Total: {formatMoney(total)}
          </p>
        </div>

        {aviso && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-xl text-green-800 text-sm font-medium">
            {aviso}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-red-800 text-sm font-medium">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
            <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">
              progress_activity
            </span>
            <p className="mt-2">Cargando pagos...</p>
          </div>
        ) : pagos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
            <Icon name="task_alt" className="text-4xl mb-2" />
            <p>No hay comprobantes pendientes de revisión.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pagos.map((pago) => (
              <article
                key={pago.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-headline text-xl font-bold text-slate-800">
                        {pago.alumno || 'Alumno'}
                      </h2>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                        Pendiente
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {pago.concepto || 'Cuota'} · {pago.periodo || '—'}
                    </p>
                    <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold">Importe:</span>{' '}
                        {formatMoney(pago.importe)}
                      </p>
                      <p>
                        <span className="font-semibold">Fecha de pago:</span>{' '}
                        {pago.fechaPagoISO || '—'}
                      </p>
                      <p>
                        <span className="font-semibold">Medio:</span>{' '}
                        {MEDIO_ETIQUETA[pago.medioPago] ||
                          pago.medioPago ||
                          '—'}
                      </p>
                      <p>
                        <span className="font-semibold">Comprobante:</span>{' '}
                        {pago.comprobanteNombre || 'Sin archivo'}
                      </p>
                    </div>
                    {pago.observacion && (
                      <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                        {pago.observacion}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {pago.comprobanteDisponible && (
                      <button
                        type="button"
                        onClick={() => verComprobante(pago)}
                        disabled={descargando === pago.id}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold text-sm border-none cursor-pointer disabled:opacity-60"
                      >
                        <Icon name="download" className="text-base" />
                        {descargando === pago.id
                          ? 'Abriendo...'
                          : 'Ver comprobante'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => revisar(pago, 'aprobar')}
                      disabled={procesando === pago.id}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm border-none cursor-pointer disabled:opacity-60"
                    >
                      <Icon name="check_circle" className="text-base" />
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRechazoId(rechazoId === pago.id ? '' : pago.id)
                      }
                      disabled={procesando === pago.id}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-red-50 text-red-700 border-2 border-red-200 font-bold text-sm cursor-pointer disabled:opacity-60"
                    >
                      <Icon name="cancel" className="text-base" />
                      Rechazar
                    </button>
                  </div>
                </div>

                {rechazoId === pago.id && (
                  <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                    <input
                      type="text"
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      placeholder="Motivo del rechazo (opcional)"
                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-red-400 focus:outline-none text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRechazoId('');
                          setMotivoRechazo('');
                        }}
                        className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 font-bold text-sm border-none cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => revisar(pago, 'rechazar', motivoRechazo)}
                        disabled={procesando === pago.id}
                        className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm border-none cursor-pointer disabled:opacity-60"
                      >
                        {procesando === pago.id
                          ? 'Enviando...'
                          : 'Confirmar rechazo'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PagosPendientes;
