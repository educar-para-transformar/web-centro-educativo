import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import EventCard from '../components/molecules/EventCard';
import { schoolEvents } from '../services/schoolEvents';
import { images } from '../services/imagesConfig';
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
  { id: 'boletin', label: 'Boletín', icon: 'assignment' },
  { id: 'materias', label: 'Materias', icon: 'menu_book' },
  { id: 'asistencias', label: 'Asistencias', icon: 'fact_check' },
  { id: 'horarios', label: 'Horarios', icon: 'calendar_month' },
  { id: 'materiales', label: 'Materiales', icon: 'folder_open' },
  { id: 'novedades', label: 'Novedades', icon: 'newspaper' },
];

const DIAS_SEMANA = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

const ESTADOS_ASISTENCIA = {
  presente: {
    label: 'Presente',
    icon: 'check_circle',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  ausente: {
    label: 'Ausente',
    icon: 'cancel',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  tarde: {
    label: 'Tarde',
    icon: 'schedule',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  justificada: {
    label: 'Justificada',
    icon: 'verified',
    badge: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500',
  },
};

const MATERIAL_TIPOS = {
  pdf: {
    label: 'PDF',
    icon: 'picture_as_pdf',
    badge: 'bg-red-100 text-red-700',
  },
  link: {
    label: 'Enlace',
    icon: 'link',
    badge: 'bg-sky-100 text-sky-700',
  },
  video: {
    label: 'Video',
    icon: 'play_circle',
    badge: 'bg-purple-100 text-purple-700',
  },
  documento: {
    label: 'Documento',
    icon: 'description',
    badge: 'bg-amber-100 text-amber-700',
  },
  imagen: {
    label: 'Imagen',
    icon: 'image',
    badge: 'bg-green-100 text-green-700',
  },
};

const currentYear = new Date().getFullYear();

const fetchStudentData = async (endpoint) => {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken)
    throw new Error('La sesión no es válida. Volvé a iniciar sesión.');

  const response = await fetch(`${FUNCTIONS_BASE_URL}/${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo consultar la información.');
  }
  return data;
};

const formatNota = (nota) => (nota == null ? '-' : nota);

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
  if (!fecha) return '-';
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

const resolveNewsImage = (valor) => {
  if (!valor) return null;
  return images[valor] || valor;
};

const adaptBoletin = (data) => {
  const materias = Array.isArray(data?.materias) ? data.materias : [];
  const trimestres = TRIMESTRES.map((trimestre) => {
    const filas = materias
      .map((materia) => {
        const item = (materia.trimestres || []).find(
          (trim) => Number(trim.trimestre) === trimestre
        );
        return {
          materiaId: materia.materiaId,
          materiaNombre: materia.materia || 'Materia',
          notas: Array.isArray(item?.notas) ? item.notas : [],
          promedio: item?.promedio ?? null,
          observaciones: '',
        };
      })
      .filter((fila) => fila.notas.length > 0);

    const evaluadas = filas.filter((fila) => Number(fila.promedio) > 0);
    const promedio =
      evaluadas.length > 0
        ? Math.round(
            (evaluadas.reduce((acc, fila) => acc + Number(fila.promedio), 0) /
              evaluadas.length) *
              100
          ) / 100
        : null;

    return { trimestre, materias: filas, promedio };
  }).filter((trimestre) => trimestre.materias.length > 0);

  return {
    ...data,
    trimestres,
    aniosDisponibles: data?.anio ? [data.anio] : [currentYear],
  };
};

const ParentPanel = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('boletin');
  const [selectedAnio, setSelectedAnio] = useState(currentYear);
  const [aniosDisponibles, setAniosDisponibles] = useState([currentYear]);

  const [hijos, setHijos] = useState([]);
  const [selectedHijoId, setSelectedHijoId] = useState(null);
  const [isLoadingHijos, setIsLoadingHijos] = useState(true);
  const [hijosError, setHijosError] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [boletin, setBoletin] = useState(null);

  const [misMaterias, setMisMaterias] = useState([]);
  const [isLoadingMaterias, setIsLoadingMaterias] = useState(true);
  const [materiasError, setMateriasError] = useState('');

  const [noticias, setNoticias] = useState([]);
  const [isLoadingNoticias, setIsLoadingNoticias] = useState(true);
  const [noticiasError, setNoticiasError] = useState('');

  const [asistencias, setAsistencias] = useState([]);
  const [resumenAsistencias, setResumenAsistencias] = useState(null);
  const [isLoadingAsistencias, setIsLoadingAsistencias] = useState(true);
  const [asistenciasError, setAsistenciasError] = useState('');

  const [horarios, setHorarios] = useState([]);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(true);
  const [horariosError, setHorariosError] = useState('');

  const [materiales, setMateriales] = useState([]);
  const [isLoadingMateriales, setIsLoadingMateriales] = useState(true);
  const [materialesError, setMaterialesError] = useState('');

  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    setUpcomingEvents(schoolEvents.slice(0, 3));
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'Padre') {
      if (user.role === 'user_admin') navigate('/admin');
      else if (user.role === 'Staff') navigate('/panel-docente');
      else if (user.role === 'Estudiante') navigate('/panel-alumno');
      else navigate('/');
    }
  }, [user, navigate]);

  const cargarHijos = useCallback(async () => {
    if (!user || user.role !== 'Padre') return;
    setIsLoadingHijos(true);
    setHijosError('');
    try {
      let lista = [];
      if (Array.isArray(user.studentIds) && user.studentIds.length > 0) {
        const q = query(
          collection(db, 'students'),
          where('__name__', 'in', user.studentIds.slice(0, 10))
        );
        const snap = await getDocs(q);
        lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        const q2 = query(
          collection(db, 'students'),
          where('parentId', '==', user.uid)
        );
        const snap2 = await getDocs(q2);
        lista = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      setHijos(lista);
      if (lista.length > 0) {
        setSelectedHijoId(
          (prev) => prev || lista[0].id || lista[0].studentID_login
        );
      }
    } catch (err) {
      console.error(err);
      setHijosError('No se pudo cargar la lista de hijos.');
    } finally {
      setIsLoadingHijos(false);
    }
  }, [user]);

  useEffect(() => {
    cargarHijos();
  }, [cargarHijos]);

  const cargarAniosDisponibles = useCallback(async () => {
    if (!selectedHijoId) return;
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'calificaciones'),
          where('studentId', '==', selectedHijoId)
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
    }
  }, [selectedHijoId]);

  const cargarBoletin = useCallback(async () => {
    if (!selectedHijoId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchStudentData(
        `cf_getStudentGrades?studentId=${encodeURIComponent(selectedHijoId)}&anio=${selectedAnio}`
      );
      const adaptado = adaptBoletin(data);
      setBoletin(adaptado);
      setAniosDisponibles((prev) => {
        const merged = new Set([...prev, ...adaptado.aniosDisponibles]);
        return [...merged].sort((a, b) => b - a);
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar el boletín.');
      setBoletin(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHijoId, selectedAnio]);

  const cargarMaterias = useCallback(async () => {
    if (!selectedHijoId) return;
    setIsLoadingMaterias(true);
    setMateriasError('');
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'materias'),
          where('studentIds', 'array-contains', selectedHijoId)
        )
      );
      setMisMaterias(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (err) {
      console.error(err);
      setMateriasError(err.message || 'Error al cargar las materias.');
      setMisMaterias([]);
    } finally {
      setIsLoadingMaterias(false);
    }
  }, [selectedHijoId]);

  const cargarNoticias = useCallback(async () => {
    setIsLoadingNoticias(true);
    setNoticiasError('');
    try {
      const snapshot = await getDocs(
        query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(3))
      );
      setNoticias(
        snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            titulo: data.title || data.titulo || 'Novedad',
            contenido:
              data.subtitle || data.contenido || data.descripcion || '',
            imagen: resolveNewsImage(
              data.image || data.imagen || data.imagenUrl
            ),
            fecha: data.createdAt || data.fecha || null,
          };
        })
      );
    } catch (err) {
      console.error(err);
      setNoticiasError(err.message || 'Error al cargar las novedades.');
      setNoticias([]);
    } finally {
      setIsLoadingNoticias(false);
    }
  }, []);

  const cargarAsistencias = useCallback(async () => {
    if (!selectedHijoId) return;
    setIsLoadingAsistencias(true);
    setAsistenciasError('');
    try {
      const data = await fetchStudentData(
        `cf_getStudentAttendance?studentId=${encodeURIComponent(selectedHijoId)}&anio=${selectedAnio}`
      );
      setAsistencias(Array.isArray(data?.asistencias) ? data.asistencias : []);
      const resumen = data?.resumen;
      setResumenAsistencias(
        resumen
          ? {
              total: Number(resumen.total) || 0,
              presentes: Number(resumen.presente) || 0,
              ausentes: Number(resumen.ausente) || 0,
              tardes: Number(resumen.tarde) || 0,
              justificados: Number(resumen.justificada) || 0,
            }
          : null
      );
    } catch (err) {
      console.error(err);
      setAsistenciasError(err.message || 'Error al cargar las asistencias.');
      setAsistencias([]);
      setResumenAsistencias(null);
    } finally {
      setIsLoadingAsistencias(false);
    }
  }, [selectedHijoId, selectedAnio]);

  const cargarHorarios = useCallback(async () => {
    if (!selectedHijoId) return;
    setIsLoadingHorarios(true);
    setHorariosError('');
    try {
      const data = await fetchStudentData(
        `cf_getStudentSchedule?studentId=${encodeURIComponent(selectedHijoId)}&anio=${selectedAnio}`
      );
      setHorarios(Array.isArray(data?.horarios) ? data.horarios : []);
    } catch (err) {
      console.error(err);
      setHorariosError(err.message || 'Error al cargar los horarios.');
      setHorarios([]);
    } finally {
      setIsLoadingHorarios(false);
    }
  }, [selectedHijoId, selectedAnio]);

  const cargarMateriales = useCallback(async () => {
    if (!selectedHijoId) return;
    setIsLoadingMateriales(true);
    setMaterialesError('');
    try {
      const data = await fetchStudentData(
        `cf_getStudentMaterials?studentId=${encodeURIComponent(selectedHijoId)}&anio=${selectedAnio}`
      );
      setMateriales(Array.isArray(data?.materiales) ? data.materiales : []);
    } catch (err) {
      console.error(err);
      setMaterialesError(err.message || 'Error al cargar los materiales.');
      setMateriales([]);
    } finally {
      setIsLoadingMateriales(false);
    }
  }, [selectedHijoId, selectedAnio]);

  useEffect(() => {
    cargarAniosDisponibles();
  }, [cargarAniosDisponibles]);

  useEffect(() => {
    if (!selectedHijoId) return;
    cargarBoletin();
    cargarMaterias();
    cargarNoticias();
    cargarAsistencias();
    cargarHorarios();
    cargarMateriales();
  }, [
    selectedHijoId,
    selectedAnio,
    cargarBoletin,
    cargarMaterias,
    cargarNoticias,
    cargarAsistencias,
    cargarHorarios,
    cargarMateriales,
  ]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const hijoSeleccionado = useMemo(
    () =>
      hijos.find(
        (h) => h.id === selectedHijoId || h.studentID_login === selectedHijoId
      ),
    [hijos, selectedHijoId]
  );
  const nivelHijo = hijoSeleccionado?.nivel
    ? NIVELES_LABEL[hijoSeleccionado.nivel] || hijoSeleccionado.nivel
    : '';

  const resumenAsistencia = useMemo(() => {
    if (!resumenAsistencias) {
      const total = asistencias.length;
      const presentes = asistencias.filter(
        (a) => a.estado === 'presente'
      ).length;
      const ausentes = asistencias.filter((a) => a.estado === 'ausente').length;
      const tardes = asistencias.filter((a) => a.estado === 'tarde').length;
      const justificados = asistencias.filter(
        (a) => a.estado === 'justificada'
      ).length;
      return { total, presentes, ausentes, tardes, justificados };
    }
    return resumenAsistencias;
  }, [asistencias, resumenAsistencias]);

  const horariosPorDia = useMemo(() => {
    const grupos = {};
    horarios.forEach((h) => {
      const dia = h.diaSemana || h.dia || 0;
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(h);
    });
    Object.keys(grupos).forEach((k) => {
      grupos[k].sort((a, b) =>
        (a.horaInicio || '').localeCompare(b.horaInicio || '')
      );
    });
    return grupos;
  }, [horarios]);

  const renderBoletin = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">
            progress_activity
          </span>
          <p className="mt-2 text-slate-500">Cargando boletín...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center text-red-600">
          <p>{error}</p>
        </div>
      );
    }
    if (
      !boletin ||
      !Array.isArray(boletin.trimestres) ||
      boletin.trimestres.length === 0
    ) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
          <Icon name="assignment" className="text-4xl mb-2" />
          <p>No hay calificaciones registradas para este año.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {boletin.trimestres.map((trim, idx) => {
          const materias = Array.isArray(trim.materias) ? trim.materias : [];
          const promedio = trim.promedio != null ? Number(trim.promedio) : null;
          return (
            <div
              key={trim.trimestre || idx}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Icon name="book" />
                  </div>
                  <div>
                    <h3 className="font-headline font-semibold text-slate-800">
                      Trimestre {trim.trimestre || idx + 1}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {materias.length} materia
                      {materias.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                {promedio != null && (
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${colorPromedio(promedio)}`}
                  >
                    <Icon name="grade" />
                    Promedio: {promedio.toFixed(2)}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-3">
                        Materia
                      </th>
                      <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">
                        Nota 1
                      </th>
                      <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">
                        Nota 2
                      </th>
                      <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">
                        Nota 3
                      </th>
                      <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">
                        Promedio
                      </th>
                      <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-3">
                        Observaciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materias.map((mat, mIdx) => {
                      const notas = Array.isArray(mat.notas) ? mat.notas : [];
                      const pMat =
                        mat.promedio != null ? Number(mat.promedio) : null;
                      return (
                        <tr
                          key={mat.materiaId || mIdx}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                <Icon name="menu_book" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">
                                  {mat.materiaNombre || mat.nombre || 'Materia'}
                                </p>
                                {mat.docenteNombre && (
                                  <p className="text-sm text-slate-500">
                                    {mat.docenteNombre}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-slate-700">
                            {formatNota(notas[0])}
                          </td>
                          <td className="px-4 py-4 text-center text-slate-700">
                            {formatNota(notas[1])}
                          </td>
                          <td className="px-4 py-4 text-center text-slate-700">
                            {formatNota(notas[2])}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {pMat != null ? (
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${colorPromedio(pMat)}`}
                              >
                                {pMat.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {mat.observaciones || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMaterias = () => {
    if (isLoadingMaterias) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">
            progress_activity
          </span>
          <p className="mt-2 text-slate-500">Cargando materias...</p>
        </div>
      );
    }
    if (materiasError) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center text-red-600">
          <p>{materiasError}</p>
        </div>
      );
    }
    if (misMaterias.length === 0) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
          <Icon name="menu_book" className="text-4xl mb-2" />
          <p>No hay materias asignadas para este año.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {misMaterias.map((materia, idx) => (
          <div
            key={materia.materiaId || idx}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Icon name="menu_book" className="text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-semibold text-slate-800 truncate">
                  {materia.materiaNombre || materia.nombre}
                </h3>
                {(materia.profesorNombre || materia.docenteNombre) && (
                  <p className="text-sm text-slate-500 mt-1">
                    Docente: {materia.profesorNombre || materia.docenteNombre}
                  </p>
                )}
                {materia.curso && (
                  <p className="text-sm text-slate-500 mt-1">
                    Curso: {materia.curso}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAsistencias = () => {
    if (isLoadingAsistencias) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">
            progress_activity
          </span>
          <p className="mt-2 text-slate-500">Cargando asistencias...</p>
        </div>
      );
    }
    if (asistenciasError) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center text-red-600">
          <p>{asistenciasError}</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <p className="text-sm text-slate-500">Presentes</p>
            <p className="text-2xl font-semibold text-green-600 mt-1">
              {resumenAsistencia.presentes}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <p className="text-sm text-slate-500">Ausentes</p>
            <p className="text-2xl font-semibold text-red-600 mt-1">
              {resumenAsistencia.ausentes}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <p className="text-sm text-slate-500">Tardes</p>
            <p className="text-2xl font-semibold text-amber-600 mt-1">
              {resumenAsistencia.tardes}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <p className="text-sm text-slate-500">Justificadas</p>
            <p className="text-2xl font-semibold text-sky-600 mt-1">
              {resumenAsistencia.justificados}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-headline font-semibold text-slate-800">
              Registro de asistencias
            </h3>
          </div>
          {asistencias.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay registros de asistencia.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {asistencias.map((asis, idx) => {
                const estado =
                  ESTADOS_ASISTENCIA[asis.estado] ||
                  ESTADOS_ASISTENCIA.presente;
                return (
                  <div
                    key={asis.id || idx}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${estado.dot}`}
                      ></div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {formatFecha(asis.fecha)}
                        </p>
                        {(asis.materia || asis.materiaNombre) && (
                          <p className="text-sm text-slate-500">
                            {asis.materia || asis.materiaNombre}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${estado.badge}`}
                    >
                      <Icon name={estado.icon} className="text-base" />
                      {estado.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHorarios = () => {
    if (isLoadingHorarios) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">
            progress_activity
          </span>
          <p className="mt-2 text-slate-500">Cargando horarios...</p>
        </div>
      );
    }
    if (horariosError) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center text-red-600">
          <p>{horariosError}</p>
        </div>
      );
    }
    const diasKeys = Object.keys(horariosPorDia).sort(
      (a, b) => Number(a) - Number(b)
    );
    if (diasKeys.length === 0) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
          <Icon name="calendar_month" className="text-4xl mb-2" />
          <p>No hay horarios cargados.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {diasKeys.map((dia) => (
          <div
            key={dia}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                <Icon name="today" />
              </div>
              <h3 className="font-headline font-semibold text-slate-800">
                {DIAS_SEMANA[dia] || `Día ${dia}`}
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {horariosPorDia[dia].map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {item.materiaNombre || item.materia || 'Materia'}
                    </p>
                    {(item.docente || item.docenteNombre) && (
                      <p className="text-sm text-slate-500">
                        {item.docente || item.docenteNombre}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {item.horaInicio || '--:--'} - {item.horaFin || '--:--'}
                    </p>
                    {item.aula && (
                      <p className="text-xs text-slate-500">Aula {item.aula}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMateriales = () => {
    if (isLoadingMateriales) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">
            progress_activity
          </span>
          <p className="mt-2 text-slate-500">Cargando materiales...</p>
        </div>
      );
    }
    if (materialesError) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center text-red-600">
          <p>{materialesError}</p>
        </div>
      );
    }
    if (materiales.length === 0) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
          <Icon name="folder_open" className="text-4xl mb-2" />
          <p>No hay materiales disponibles.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materiales.map((mat, idx) => {
          const tipo = MATERIAL_TIPOS[mat.tipo] || MATERIAL_TIPOS.documento;
          return (
            <a
              key={mat.id || idx}
              href={mat.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow flex items-start gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${tipo.badge.replace('text-', 'text-').replace('bg-', 'bg-')}`}
              >
                <Icon name={tipo.icon} className="text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-slate-800 truncate">
                    {mat.titulo || mat.nombre}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipo.badge}`}
                  >
                    {tipo.label}
                  </span>
                </div>
                {mat.descripcion && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {mat.descripcion}
                  </p>
                )}
                {(mat.materia || mat.materiaNombre) && (
                  <p className="text-xs text-slate-400 mt-2">
                    {mat.materia || mat.materiaNombre}
                  </p>
                )}
              </div>
              <Icon name="open_in_new" className="text-slate-400" />
            </a>
          );
        })}
      </div>
    );
  };

  const renderNovedades = () => {
    if (isLoadingNoticias) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">
            progress_activity
          </span>
          <p className="mt-2 text-slate-500">Cargando novedades...</p>
        </div>
      );
    }
    if (noticiasError) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center text-red-600">
          <p>{noticiasError}</p>
        </div>
      );
    }
    if (noticias.length === 0) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
          <Icon name="newspaper" className="text-4xl mb-2" />
          <p>No hay novedades para este año.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {noticias.map((noticia, idx) => (
          <article
            key={noticia.id || idx}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            {(noticia.imagen || noticia.imagenUrl) && (
              <img
                src={noticia.imagen || noticia.imagenUrl}
                alt={noticia.titulo}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <Icon name="event" className="text-base" />
                <span>
                  {formatFechaNovedad(noticia.fecha || noticia.createdAt)}
                </span>
              </div>
              <h3 className="font-headline font-semibold text-xl text-slate-800 mb-2">
                {noticia.titulo}
              </h3>
              <p className="text-slate-600 whitespace-pre-line">
                {noticia.contenido || noticia.descripcion}
              </p>
            </div>
          </article>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'boletin':
        return renderBoletin();
      case 'materias':
        return renderMaterias();
      case 'asistencias':
        return renderAsistencias();
      case 'horarios':
        return renderHorarios();
      case 'materiales':
        return renderMateriales();
      case 'novedades':
        return renderNovedades();
      default:
        return renderBoletin();
    }
  };

  if (!user || user.role !== 'Padre') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400">
            lock
          </span>
          <p className="mt-2 text-slate-600">Acceso restringido</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link to="/" className="hover:text-orange-600">
                Inicio
              </Link>
              <span>/</span>
              <span>Panel Tutor</span>
            </div>
            <h1 className="font-headline font-bold text-3xl sm:text-4xl text-slate-900">
              Panel del Tutor
            </h1>
            <p className="mt-2 text-slate-600">
              Seguimiento académico de sus hijos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white rounded-full shadow-sm border border-slate-200 px-4 py-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <Icon name="family_restroom" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">
                  {user.nombre || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Icon name="logout" className="text-base" />
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="font-headline font-semibold text-slate-800">
                Mis hijos
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Seleccioná el alumno para ver su información
              </p>
            </div>
            {isLoadingHijos ? (
              <div className="flex items-center gap-2 text-slate-500">
                <span className="material-symbols-outlined animate-spin">
                  progress_activity
                </span>
                <span>Cargando hijos...</span>
              </div>
            ) : hijosError ? (
              <div className="text-red-600 text-sm">{hijosError}</div>
            ) : hijos.length === 0 ? (
              <div className="text-slate-500 text-sm">
                No hay hijos asociados a esta cuenta.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {hijos.map((h) => {
                  const hid = h.id || h.studentID_login;
                  const activo = hid === selectedHijoId;
                  return (
                    <button
                      key={hid}
                      onClick={() => setSelectedHijoId(hid)}
                      className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
                        activo
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon name="school" className="text-base" />
                      <span>{h.nombre || h.apellido || hid}</span>
                      {h.curso && (
                        <span className="text-xs opacity-80">· {h.curso}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {hijoSeleccionado && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Icon name="badge" className="text-base text-slate-400" />
                <span>
                  ID: {hijoSeleccionado.studentID_login || hijoSeleccionado.id}
                </span>
              </div>
              {nivelHijo && (
                <div className="flex items-center gap-2">
                  <Icon name="layers" className="text-base text-slate-400" />
                  <span>{nivelHijo}</span>
                </div>
              )}
              {hijoSeleccionado.curso && (
                <div className="flex items-center gap-2">
                  <Icon name="group" className="text-base text-slate-400" />
                  <span>Curso: {hijoSeleccionado.curso}</span>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 bg-white rounded-full p-1 shadow-sm border border-slate-200">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon name={tab.icon} className="text-base" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-sm border border-slate-200">
              <Icon
                name="calendar_today"
                className="text-base text-slate-400"
              />
              <select
                value={selectedAnio}
                onChange={(e) => setSelectedAnio(Number(e.target.value))}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
              >
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio}>
                    Ciclo {anio}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          {selectedHijoId ? (
            renderContent()
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
              Seleccioná un hijo para visualizar la información.
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-semibold text-xl text-slate-800">
              Próximos eventos
            </h2>
            <Link
              to="/news"
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              Ver todas las novedades
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ParentPanel;
