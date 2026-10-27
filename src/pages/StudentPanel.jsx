import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import EventCard from '../components/molecules/EventCard';
import StudentPasswordModal from '../components/organisms/StudentPasswordModal';
import { schoolEvents } from '../services/schoolEvents';
import { auth, db } from '../services/firebase';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import '../styles/StudentPanel.css';

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1'
    : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');

const NIVELES_LABEL = {
  inicial: 'Nivel Inicial',
  primaria: 'Primaria',
  secundaria: 'Secundaria',
};

const TRIMESTRES = [1, 2, 3];

const TABS = [
  { id: 'boletin', label: 'Mi boletín', icon: 'assignment' },
  { id: 'materias', label: 'Mis materias', icon: 'menu_book' },
  { id: 'novedades', label: 'Novedades', icon: 'newspaper' },
];

const currentYear = new Date().getFullYear();

const formatNota = (nota) => (nota == null ? '—' : nota);

const colorPromedio = (promedio) => {
  if (!promedio || promedio <= 0) return 'bg-slate-100 text-slate-500';
  if (promedio >= 7) return 'bg-green-100 text-green-700';
  if (promedio >= 4) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const fechaDesdeValor = (valor) => {
  if (!valor) return null;
  if (typeof valor?.toDate === 'function') return valor.toDate();
  if (valor instanceof Date) return valor;

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  if (typeof valor === 'string' || typeof valor === 'number') {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  return null;
};

const formatFecha = (valor) => {
  const fecha = fechaDesdeValor(valor);
  if (!fecha) return '—';
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatFechaNovedad = (valor) => {
  const fecha = fechaDesdeValor(valor);
  if (!fecha) return 'Sin fecha';
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const StudentPanel = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('boletin');
  const [selectedAnio, setSelectedAnio] = useState(currentYear);
  const [aniosDisponibles, setAniosDisponibles] = useState([currentYear]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [boletin, setBoletin] = useState(null);

  const [misMaterias, setMisMaterias] = useState([]);
  const [isLoadingMaterias, setIsLoadingMaterias] = useState(true);
  const [materiasError, setMateriasError] = useState('');

  const [noticias, setNoticias] = useState([]);
  const [isLoadingNoticias, setIsLoadingNoticias] = useState(true);
  const [noticiasError, setNoticiasError] = useState('');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Redirigir si el usuario no es un estudiante
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Estudiante') {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchBoletin = useCallback(async () => {
    if (!user || user.role !== 'Estudiante') return;

    setIsLoading(true);
    setError('');
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_getStudentGrades?anio=${selectedAnio}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.error || 'No se pudieron consultar las calificaciones.'
        );
      }

      const data = await response.json();
      setBoletin(data);
    } catch (err) {
      console.error('Error cargando boletín:', err);
      setError(
        err.message || 'Ocurrió un error al consultar las calificaciones.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedAnio]);

  // Detectar los años con calificaciones para habilitar el historial.
  const fetchAniosDisponibles = useCallback(async () => {
    if (!user || user.role !== 'Estudiante') return;

    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'calificaciones'),
          where('studentId', '==', user.uid)
        )
      );

      const anios = new Set([currentYear]);
      snapshot.forEach((doc) => {
        const anio = Number(doc.data()?.anio);
        if (Number.isInteger(anio) && anio >= 2000 && anio <= 2100) {
          anios.add(anio);
        }
      });

      setAniosDisponibles([...anios].sort((a, b) => b - a));
    } catch (err) {
      console.error('Error detectando años con calificaciones:', err);
      setAniosDisponibles(
        Array.from({ length: 5 }, (_, index) => currentYear - index)
      );
    }
  }, [user]);

  const fetchMisMaterias = useCallback(async () => {
    if (!user || user.role !== 'Estudiante') return;

    setIsLoadingMaterias(true);
    setMateriasError('');
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'materias'),
          where('studentIds', 'array-contains', user.uid)
        )
      );

      setMisMaterias(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (err) {
      console.error('Error cargando materias del alumno:', err);
      setMateriasError('No se pudo cargar el listado de materias.');
    } finally {
      setIsLoadingMaterias(false);
    }
  }, [user]);

  const fetchNoticias = useCallback(async () => {
    if (!user) return;

    setIsLoadingNoticias(true);
    setNoticiasError('');
    try {
      const snapshot = await getDocs(
        query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(3))
      );

      setNoticias(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (err) {
      console.error('Error cargando novedades:', err);
      setNoticiasError('No se pudieron cargar las novedades.');
    } finally {
      setIsLoadingNoticias(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBoletin();
  }, [fetchBoletin]);

  useEffect(() => {
    fetchAniosDisponibles();
  }, [fetchAniosDisponibles]);

  useEffect(() => {
    fetchMisMaterias();
  }, [fetchMisMaterias]);

  useEffect(() => {
    fetchNoticias();
  }, [fetchNoticias]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const alumno = boletin?.alumno;
  const materias = useMemo(() => boletin?.materias || [], [boletin]);

  const estadoActivo = user?.status === 'active';

  const resumenMaterias = useMemo(() => {
    const evaluadas = materias.filter((materia) => materia.promedioAnual > 0);

    return {
      total: evaluadas.length,
      aprobadas: evaluadas.filter((materia) => materia.promedioAnual >= 7)
        .length,
      enProceso: evaluadas.filter(
        (materia) => materia.promedioAnual >= 4 && materia.promedioAnual < 7
      ).length,
      adeudadas: evaluadas.filter((materia) => materia.promedioAnual < 4)
        .length,
    };
  }, [materias]);

  const promediosPorTrimestre = useMemo(() => {
    const promedios = {};

    TRIMESTRES.forEach((trimestre) => {
      const conNotas = materias
        .map((materia) =>
          materia.trimestres?.find((item) => item.trimestre === trimestre)
        )
        .filter((item) => item && item.notas?.length > 0);

      promedios[trimestre] =
        conNotas.length > 0
          ? Math.round(
              (conNotas.reduce((acc, item) => acc + item.promedio, 0) /
                conNotas.length) *
                100
            ) / 100
          : 0;
    });

    return promedios;
  }, [materias]);

  // Unificar materias inscriptas con las materias que ya tienen notas en el boletín.
  const materiasUnificadas = useMemo(() => {
    const porId = new Map();

    misMaterias.forEach((materia) => {
      porId.set(materia.id, {
        id: materia.id,
        nombre: materia.nombre || 'Materia',
        nivel: materia.nivel || user?.nivel || '',
        profesorNombre: materia.profesorNombre || '',
        profesorDni: materia.profesorDni || '',
        promedioAnual: 0,
        tieneNotas: false,
      });
    });

    materias.forEach((materia) => {
      const existente = porId.get(materia.materiaId);
      porId.set(materia.materiaId, {
        id: materia.materiaId,
        nombre: materia.materia || existente?.nombre || 'Materia',
        nivel: existente?.nivel || alumno?.nivel || user?.nivel || '',
        profesorNombre: existente?.profesorNombre || '',
        profesorDni: existente?.profesorDni || '',
        promedioAnual: materia.promedioAnual || 0,
        tieneNotas:
          materia.trimestres?.some(
            (trimestre) => trimestre.notas?.length > 0
          ) || false,
      });
    });

    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [misMaterias, materias, alumno, user]);

  if (!user || user.role !== 'Estudiante') {
    return <div className="min-h-screen bg-slate-50"></div>;
  }

  const renderBoletin = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-500">
          <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-5"></div>
          <p className="font-semibold">Cargando tus calificaciones...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-red-800">
          <div className="flex items-start gap-4">
            <Icon name="error" className="text-red-500 text-2xl shrink-0" />
            <div>
              <p className="font-bold">
                No se pudieron cargar las calificaciones
              </p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchBoletin}
            className="shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full transition-colors cursor-pointer border-none"
          >
            Reintentar
          </button>
        </div>
      );
    }

    if (materias.length === 0) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
          <Icon
            name="assignment"
            className="text-6xl text-slate-300 mx-auto mb-4"
          />
          <p className="font-bold text-lg text-slate-700">
            Aún no tenés calificaciones cargadas en {selectedAnio}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Cuando tus docentes carguen las notas del trimestre, las verás aquí.
          </p>
          {materiasUnificadas.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('materias')}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-sm rounded-full transition-colors cursor-pointer border-none"
            >
              <Icon name="menu_book" className="text-base" />
              Ver mis materias
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Promedio general */}
        <div className="print-avoid-break bg-gradient-to-br from-orange-500 to-amber-400 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="material-symbols-outlined text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            <div>
              <p className="font-headline font-bold text-lg">
                Promedio General
              </p>
              <p className="text-white/80 text-sm">
                Año {boletin?.anio || selectedAnio}
              </p>
            </div>
          </div>
          <div className="text-center">
            <span className="font-headline text-5xl font-extrabold">
              {boletin?.promedioGeneral?.toFixed(2) ?? '—'}
            </span>
            <span className="block text-white/80 text-sm mt-1">sobre 10</span>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="print-avoid-break bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Icon name="fact_check" className="text-lg" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Evaluadas
              </span>
            </div>
            <p className="font-headline text-3xl font-extrabold text-slate-800 mt-2">
              {resumenMaterias.total}
            </p>
          </div>
          <div className="print-avoid-break bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 text-green-600">
              <Icon name="check_circle" className="text-lg" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Aprobadas
              </span>
            </div>
            <p className="font-headline text-3xl font-extrabold text-green-700 mt-2">
              {resumenMaterias.aprobadas}
            </p>
          </div>
          <div className="print-avoid-break bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 text-amber-600">
              <Icon name="pending" className="text-lg" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                En proceso
              </span>
            </div>
            <p className="font-headline text-3xl font-extrabold text-amber-700 mt-2">
              {resumenMaterias.enProceso}
            </p>
          </div>
          <div className="print-avoid-break bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 text-red-600">
              <Icon name="error" className="text-lg" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Adeudadas
              </span>
            </div>
            <p className="font-headline text-3xl font-extrabold text-red-700 mt-2">
              {resumenMaterias.adeudadas}
            </p>
          </div>
        </div>

        {/* Tabla por trimestre */}
        {TRIMESTRES.map((trimestre) => {
          const filas = materias.map((materia) => {
            const item = materia.trimestres?.find(
              (trim) => trim.trimestre === trimestre
            );
            return {
              materiaId: materia.materiaId,
              materia: materia.materia,
              promedioAnual: materia.promedioAnual,
              notas: item?.notas || [],
              promedio: item?.promedio || 0,
            };
          });

          const promedioTrimestre = promediosPorTrimestre[trimestre] || 0;
          const promedioAnterior =
            trimestre > 1 ? promediosPorTrimestre[trimestre - 1] || 0 : 0;
          const tendencia =
            promedioTrimestre > 0 && promedioAnterior > 0
              ? Math.round((promedioTrimestre - promedioAnterior) * 100) / 100
              : null;

          return (
            <div
              key={trimestre}
              className="print-avoid-break bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-headline font-bold text-xl text-slate-800">
                  Trimestre {trimestre}
                </h2>
                {promedioTrimestre > 0 ? (
                  <div className="flex items-center gap-2">
                    {tendencia != null && tendencia !== 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                          tendencia > 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        <Icon
                          name={tendencia > 0 ? 'trending_up' : 'trending_down'}
                          className="text-sm"
                        />
                        {Math.abs(tendencia).toFixed(2)}
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(
                        promedioTrimestre
                      )}`}
                    >
                      Promedio: {promedioTrimestre.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                    Sin notas
                  </span>
                )}
              </div>

              {/* Vista Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-label font-bold text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-6">Materia</th>
                      <th className="py-3.5 px-4">Calificaciones</th>
                      <th className="py-3.5 px-4">Promedio Trimestral</th>
                      <th className="py-3.5 px-4">Promedio Anual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-body text-sm text-slate-700">
                    {filas.map((fila) => (
                      <tr
                        key={fila.materiaId}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {fila.materia}
                        </td>
                        <td className="py-4 px-4">
                          {fila.notas.length > 0 ? (
                            fila.notas.map((nota, index) => (
                              <span
                                key={index}
                                className="inline-block mr-2 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs"
                              >
                                {formatNota(nota)}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">
                              Sin notas
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(
                              fila.promedio
                            )}`}
                          >
                            {fila.promedio > 0 ? fila.promedio.toFixed(2) : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(
                              fila.promedioAnual
                            )}`}
                          >
                            {fila.promedioAnual > 0
                              ? fila.promedioAnual.toFixed(2)
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile (Tarjetas) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filas.map((fila) => (
                  <div key={fila.materiaId} className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-800 leading-tight">
                        {fila.materia}
                      </p>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${colorPromedio(
                          fila.promedio
                        )}`}
                      >
                        {fila.promedio > 0 ? fila.promedio.toFixed(2) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {fila.notas.length > 0 ? (
                          fila.notas.map((nota, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs"
                            >
                              {formatNota(nota)}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">
                            Sin notas
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Anual
                        </span>
                        <span className="font-bold text-xs text-slate-600">
                          {fila.promedioAnual > 0
                            ? fila.promedioAnual.toFixed(2)
                            : '—'}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Leyenda */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-wrap items-center gap-5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-200"></span> Aprobado
            (7+)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-200"></span> En
            proceso (4-6)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-200"></span>{' '}
            Desaprobado (menor a 4)
          </span>
        </div>
      </div>
    );
  };

  const renderMaterias = () => {
    if (isLoadingMaterias) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-500">
          <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-5"></div>
          <p className="font-semibold">Cargando tus materias...</p>
        </div>
      );
    }

    if (materiasError) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-red-800">
          <div className="flex items-start gap-4">
            <Icon name="error" className="text-red-500 text-2xl shrink-0" />
            <p className="text-sm font-medium">{materiasError}</p>
          </div>
          <button
            type="button"
            onClick={fetchMisMaterias}
            className="shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full transition-colors cursor-pointer border-none"
          >
            Reintentar
          </button>
        </div>
      );
    }

    if (materiasUnificadas.length === 0) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
          <Icon
            name="menu_book"
            className="text-6xl text-slate-300 mx-auto mb-4"
          />
          <p className="font-bold text-lg text-slate-700">
            Todavía no tenés materias asignadas
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Cuando el instituto te inscriba en materias, aparecerán en esta
            sección.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            Materias en las que estás inscripto. Los promedios corresponden al
            año {selectedAnio}.
          </p>
          <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            <Icon name="menu_book" className="text-sm" />
            {materiasUnificadas.length} materia
            {materiasUnificadas.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {materiasUnificadas.map((materia) => (
            <article
              key={materia.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 transition-colors hover:border-orange-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 leading-tight">
                    {materia.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {NIVELES_LABEL[materia.nivel] || materia.nivel || '—'}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(
                    materia.promedioAnual
                  )}`}
                >
                  {materia.tieneNotas && materia.promedioAnual > 0
                    ? materia.promedioAnual.toFixed(2)
                    : 'Sin notas'}
                </span>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Docente a cargo
                  </p>
                  <p className="text-sm font-semibold text-slate-700 truncate">
                    {materia.profesorNombre || 'Sin asignar'}
                  </p>
                  {materia.profesorDni && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      DNI {materia.profesorDni}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('boletin')}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xs transition-colors cursor-pointer border-none"
                >
                  Ver notas
                  <Icon name="arrow_forward" className="text-sm" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  };

  const renderNovedades = () => {
    const renderNoticias = () => {
      if (isLoadingNoticias) {
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-500">
            <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-5"></div>
            <p className="font-semibold">Cargando novedades...</p>
          </div>
        );
      }

      if (noticiasError) {
        return (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-red-800">
            <div className="flex items-start gap-4">
              <Icon name="error" className="text-red-500 text-2xl shrink-0" />
              <p className="text-sm font-medium">{noticiasError}</p>
            </div>
            <button
              type="button"
              onClick={fetchNoticias}
              className="shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full transition-colors cursor-pointer border-none"
            >
              Reintentar
            </button>
          </div>
        );
      }

      if (noticias.length === 0) {
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <Icon
              name="newspaper"
              className="text-5xl text-slate-300 mx-auto mb-3"
            />
            <p className="font-bold text-slate-700">
              Todavía no hay noticias publicadas
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Las noticias y anuncios del instituto aparecerán en esta sección.
            </p>
            <Link
              to="/news"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-sm rounded-full transition-colors no-underline"
            >
              <Icon name="newspaper" className="text-base" />
              Ir a noticias
            </Link>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {noticias.map((noticia) => (
            <Link
              key={noticia.id}
              to="/news"
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3 transition-all hover:border-orange-200 hover:shadow-md no-underline"
            >
              <span className="inline-flex w-max px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                {noticia.category || 'Institucional'}
              </span>
              <h3 className="font-headline font-bold text-lg text-slate-800 leading-snug">
                {noticia.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-3">
                {noticia.subtitle}
              </p>
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-slate-400">
                  {formatFechaNovedad(noticia.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1 text-orange-600 font-bold text-xs">
                  Leer más
                  <Icon name="arrow_forward" className="text-sm" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      );
    };

    return (
      <div className="space-y-8">
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-headline font-bold text-xl text-slate-800">
                Últimas noticias
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Novedades y anuncios publicados por el instituto.
              </p>
            </div>
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors no-underline"
            >
              Ver todas
              <Icon name="arrow_forward" className="text-sm" />
            </Link>
          </div>
          {renderNoticias()}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-headline font-bold text-xl text-slate-800">
                Próximos eventos
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Actividades y fechas importantes del calendario escolar.
              </p>
            </div>
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors no-underline"
            >
              Ver calendario
              <Icon name="arrow_forward" className="text-sm" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schoolEvents.map((event) => (
              <EventCard
                key={event.id}
                day={event.day}
                month={event.month}
                title={event.title}
                info={event.info}
                icon={event.icon}
                dateBgClass={event.dateBgClass}
                glowClass={event.glowClass}
                onClick={() => navigate('/news')}
              />
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-body">
      <Navbar noButtons={true} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              Mi Panel de Estudiante
            </h1>
            <p className="font-body text-slate-500 mt-2">
              Consultá tus calificaciones, materias y novedades del instituto.
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            {activeTab === 'boletin' &&
              !isLoading &&
              !error &&
              materias.length > 0 && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold font-label text-sm rounded-full border border-slate-200 transition-all duration-200 cursor-pointer"
                >
                  <Icon name="print" className="text-base" />
                  Imprimir
                </button>
              )}
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold font-label text-sm rounded-full border border-slate-200 transition-all duration-200 cursor-pointer"
            >
              <Icon name="lock_reset" className="text-base" />
              Cambiar contraseña
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-label text-sm rounded-full border border-slate-200 transition-all duration-200 cursor-pointer"
            >
              <Icon name="logout" className="text-base" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Navegación por secciones */}
        <div className="no-print flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200 mb-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`flex-1 min-w-max inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-label font-bold text-xs sm:text-sm transition-all cursor-pointer border-none whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Icon name={tab.icon} className="text-base" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tarjeta de datos del alumno */}
        <div className="print-avoid-break bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start gap-6">
          <div className="h-16 w-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
            <Icon name="school" className="text-3xl" filled />
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Alumno
              </p>
              <p className="font-bold text-slate-800 truncate">
                {alumno?.nombre || user?.nombre || 'Sin nombre'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ID Institucional
              </p>
              <p className="font-mono text-sm text-slate-700 font-semibold truncate">
                {alumno?.studentID_login || user?.studentID_login || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                DNI
              </p>
              <p className="font-mono text-sm text-slate-700 font-semibold truncate">
                {alumno?.dni || user?.dni || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Nivel
              </p>
              <p className="font-semibold text-slate-700 capitalize">
                {NIVELES_LABEL[alumno?.nivel || user?.nivel] ||
                  alumno?.nivel ||
                  user?.nivel ||
                  '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Año lectivo
              </p>
              <p className="font-semibold text-slate-700">{selectedAnio}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Fecha de nacimiento
              </p>
              <p className="font-semibold text-slate-700">
                {formatFecha(user?.fechaNacimiento)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Género
              </p>
              <p className="font-semibold text-slate-700">
                {user?.genero || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tutor / Contacto
              </p>
              <p className="text-sm text-slate-700 truncate">
                {user?.emailPadre || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Estado de la cuenta
              </p>
              <span
                className={`inline-flex mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                  estadoActivo
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {estadoActivo ? 'Activa' : 'Pendiente'}
              </span>
            </div>
          </div>
        </div>

        {/* Selector de año */}
        {activeTab === 'boletin' && (
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <label
                htmlFor="anio-lectivo"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Año lectivo
              </label>
              <select
                id="anio-lectivo"
                value={selectedAnio}
                onChange={(event) =>
                  setSelectedAnio(Number(event.target.value))
                }
                className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors text-sm font-semibold text-slate-700 appearance-none cursor-pointer"
              >
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400">
              Podés consultar los boletines de años anteriores disponibles.
            </p>
          </div>
        )}

        {/* Contenido de la sección activa */}
        {activeTab === 'boletin' && renderBoletin()}
        {activeTab === 'materias' && renderMaterias()}
        {activeTab === 'novedades' && renderNovedades()}
      </main>

      <StudentPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

export default StudentPanel;
