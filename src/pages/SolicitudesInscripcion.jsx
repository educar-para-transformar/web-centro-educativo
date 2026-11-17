import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import { auth } from '../services/firebase';

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1'
    : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');

const ESTADOS = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'aceptado', label: 'Aceptadas' },
  { id: 'rechazado', label: 'Rechazadas' },
  { id: 'todas', label: 'Todas' },
];

const ESTADO_BADGE = {
  pendiente: 'bg-amber-100 text-amber-700',
  aceptado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
};

const NIVEL_LABEL = {
  inicial: 'Inicial',
  primaria: 'Primaria',
  secundaria: 'Secundaria',
};

const formatFecha = (iso) => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const SolicitudesInscripcion = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('pendiente');
  const [solicitudes, setSolicitudes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [procesando, setProcesando] = useState('');
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

  const cargarSolicitudes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (estado !== 'todas') params.set('estado', estado);
      const query = params.toString();
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_getEnrollmentRequests${query ? `?${query}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las solicitudes.');
      }
      setSolicitudes(Array.isArray(data.solicitudes) ? data.solicitudes : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudieron cargar las solicitudes.');
      setSolicitudes([]);
    } finally {
      setIsLoading(false);
    }
  }, [estado]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const resumen = useMemo(() => {
    const pendientes = solicitudes.filter(
      (item) => item.status === 'pendiente'
    ).length;
    return { total: solicitudes.length, pendientes };
  }, [solicitudes]);

  const revisar = async (solicitud, action, motivo = '') => {
    if (action === 'aceptar') {
      const ok = window.confirm(
        `¿Aceptar la inscripción de ${solicitud.parentName}? Se creará el tutor y los alumnos y se enviarán los correos de acceso.`
      );
      if (!ok) return;
    }
    setProcesando(solicitud.id);
    setError('');
    setAviso('');
    try {
      const token = await getToken();
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_updateEnrollmentRequest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requestId: solicitud.id,
            action,
            motivo,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo revisar la solicitud.');
      }
      setAviso(
        action === 'aceptar'
          ? 'Solicitud aceptada. Se crearon las cuentas y se enviarán los correos.'
          : 'Solicitud rechazada y notificada por correo.'
      );
      setRechazoId('');
      setMotivoRechazo('');
      cargarSolicitudes();
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo revisar la solicitud.');
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
              Solicitudes de Inscripción
            </h1>
            <p className="font-body text-slate-500 mt-2">
              Revisá las solicitudes recibidas desde el formulario público.
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
              onClick={cargarSolicitudes}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm cursor-pointer border-none"
            >
              <Icon name="refresh" className="text-base" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap bg-slate-200/60 p-1.5 rounded-full border border-slate-200 gap-1 mb-6">
          {ESTADOS.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setEstado(opcion.id)}
              className={`px-5 py-2.5 rounded-full font-label font-bold text-sm transition-all cursor-pointer border-none ${
                estado === opcion.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {opcion.label}
            </button>
          ))}
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
            <p className="mt-2">Cargando solicitudes...</p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
            <Icon name="inbox" className="text-4xl mb-2" />
            <p>No hay solicitudes en este estado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {resumen.total} solicitud{resumen.total === 1 ? '' : 'es'} ·{' '}
              {resumen.pendientes} pendiente
              {resumen.pendientes === 1 ? '' : 's'} en esta vista
            </p>
            {solicitudes.map((solicitud) => {
              const alumno = solicitud.students?.[0] || {};
              const badge =
                ESTADO_BADGE[solicitud.status] || ESTADO_BADGE.pendiente;
              return (
                <article
                  key={solicitud.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-headline text-xl font-bold text-slate-800">
                          {solicitud.parentName}
                        </h2>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge}`}
                        >
                          {solicitud.status}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-bold">
                          {NIVEL_LABEL[alumno.nivel] || alumno.nivel || '—'}
                        </span>
                      </div>
                      <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold">Email:</span>{' '}
                          {solicitud.parentEmail}
                        </p>
                        <p>
                          <span className="font-semibold">Teléfono:</span>{' '}
                          {solicitud.telefono || '—'}
                        </p>
                        <p>
                          <span className="font-semibold">DNI tutor:</span>{' '}
                          {solicitud.parentDni || '—'}
                        </p>
                        <p>
                          <span className="font-semibold">Recibida:</span>{' '}
                          {formatFecha(solicitud.createdAt)}
                        </p>
                        <p>
                          <span className="font-semibold">Alumno:</span>{' '}
                          {alumno.nombre || '—'}
                        </p>
                        <p>
                          <span className="font-semibold">DNI alumno:</span>{' '}
                          {alumno.dni || '—'}
                        </p>
                      </div>
                      {solicitud.observaciones && (
                        <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                          {solicitud.observaciones}
                        </p>
                      )}
                      {solicitud.status === 'rechazado' &&
                        solicitud.motivoRechazo && (
                          <p className="mt-2 text-sm text-red-700">
                            Motivo del rechazo: {solicitud.motivoRechazo}
                          </p>
                        )}
                    </div>

                    {solicitud.status === 'pendiente' && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => revisar(solicitud, 'aceptar')}
                          disabled={procesando === solicitud.id}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm border-none cursor-pointer disabled:opacity-60"
                        >
                          <Icon name="check_circle" className="text-base" />
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRechazoId(
                              rechazoId === solicitud.id ? '' : solicitud.id
                            )
                          }
                          disabled={procesando === solicitud.id}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-red-50 text-red-700 border-2 border-red-200 font-bold text-sm cursor-pointer disabled:opacity-60"
                        >
                          <Icon name="cancel" className="text-base" />
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>

                  {rechazoId === solicitud.id &&
                    solicitud.status === 'pendiente' && (
                      <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                        <input
                          type="text"
                          value={motivoRechazo}
                          onChange={(e) => setMotivoRechazo(e.target.value)}
                          placeholder="Motivo del rechazo (se enviará por correo)"
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
                            onClick={() =>
                              revisar(solicitud, 'rechazar', motivoRechazo)
                            }
                            disabled={procesando === solicitud.id}
                            className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm border-none cursor-pointer disabled:opacity-60"
                          >
                            {procesando === solicitud.id
                              ? 'Enviando...'
                              : 'Confirmar rechazo'}
                          </button>
                        </div>
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SolicitudesInscripcion;
