import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

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

const formatNota = (nota) => (nota == null ? '—' : nota);

const colorPromedio = (promedio) => {
  if (!promedio || promedio <= 0) return 'bg-slate-100 text-slate-500';
  if (promedio >= 7) return 'bg-green-100 text-green-700';
  if (promedio >= 4) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const StudentPanel = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [boletin, setBoletin] = useState(null);

  // Redirigir si el usuario no es un estudiante
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Estudiante') {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchBoletin = async () => {
      if (!user || user.role !== 'Estudiante') return;

      setIsLoading(true);
      setError('');
      try {
        const idToken = await auth.currentUser.getIdToken(true);
        const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_getStudentGrades`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'No se pudieron consultar las calificaciones.');
        }

        const data = await response.json();
        setBoletin(data);
      } catch (err) {
        console.error('Error cargando boletín:', err);
        setError(err.message || 'Ocurrió un error al consultar las calificaciones.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoletin();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || user.role !== 'Estudiante') {
    return <div className="min-h-screen bg-slate-50"></div>;
  }

  const alumno = boletin?.alumno;
  const materias = boletin?.materias || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-body">
      <Navbar noButtons={true} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              Mi Boletín de Calificaciones
            </h1>
            <p className="font-body text-slate-500 mt-2">
              Seguimiento de tu rendimiento académico trimestre a trimestre.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-label text-sm rounded-full border border-slate-200 transition-all duration-200 cursor-pointer"
          >
            <Icon name="logout" className="text-base" />
            Cerrar Sesión
          </button>
        </div>

        {/* Tarjeta de datos del alumno */}
        {alumno && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="h-16 w-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
              <Icon name="school" className="text-3xl" filled />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alumno</p>
                <p className="font-bold text-slate-800 truncate">{alumno.nombre || 'Sin nombre'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ID Institucional</p>
                <p className="font-mono text-sm text-slate-700 font-semibold truncate">{alumno.studentID_login}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nivel</p>
                <p className="font-semibold text-slate-700 capitalize">{NIVELES_LABEL[alumno.nivel] || alumno.nivel}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Año Lectivo</p>
                <p className="font-semibold text-slate-700">{boletin?.anio || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Estado de carga */}
        {isLoading && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-500">
            <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-5"></div>
            <p className="font-semibold">Cargando tus calificaciones...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 flex items-start gap-4 text-red-800">
            <Icon name="error" className="text-red-500 text-2xl shrink-0" />
            <div>
              <p className="font-bold">No se pudieron cargar las calificaciones</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Sin calificaciones */}
        {!isLoading && !error && materias.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
            <Icon name="assignment" className="text-6xl text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-lg text-slate-700">Aún no tenés calificaciones cargadas</p>
            <p className="text-sm text-slate-500 mt-1">
              Cuando tus docentes carguen las notas del trimestre, las verás aquí.
            </p>
          </div>
        )}

        {/* Boletín */}
        {!isLoading && !error && materias.length > 0 && (
          <div className="space-y-8">
            {/* Promedio general */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                <div>
                  <p className="font-headline font-bold text-lg">Promedio General</p>
                  <p className="text-white/80 text-sm">Año {boletin?.anio}</p>
                </div>
              </div>
              <div className="text-center">
                <span className="font-headline text-5xl font-extrabold">{boletin?.promedioGeneral?.toFixed(2) ?? '—'}</span>
                <span className="block text-white/80 text-sm mt-1">sobre 10</span>
              </div>
            </div>

            {/* Tabla por trimestre */}
            {[1, 2, 3].map((trimestre) => {
              const filas = materias.map((materia) => {
                const t = materia.trimestres?.find((tr) => tr.trimestre === trimestre);
                return {
                  materia: materia.materia,
                  promedioAnual: materia.promedioAnual,
                  notas: t?.notas || [],
                  promedio: t?.promedio || 0,
                };
              });
              return (
                <div key={trimestre} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-headline font-bold text-xl text-slate-800">Trimestre {trimestre}</h2>
                    {!isLoading && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(
                        filas.every((f) => f.notas.length > 0)
                          ? Math.round((filas.reduce((acc, f) => acc + f.promedio, 0) / filas.filter((f) => f.notas.length > 0).length) * 100) / 100
                          : 0
                      )}`}>
                        {filas.every((f) => f.notas.length > 0)
                          ? `Promedio: ${(filas.reduce((acc, f) => acc + f.promedio, 0) / filas.filter((f) => f.notas.length > 0).length).toFixed(2)}`
                          : 'Sin notas'}
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
                        {filas.map((fila, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 font-bold text-slate-800">{fila.materia}</td>
                            <td className="py-4 px-4">
                              {fila.notas.length > 0
                                ? fila.notas.map((nota, i) => (
                                    <span key={i} className="inline-block mr-2 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                                      {formatNota(nota)}
                                    </span>
                                  ))
                                : <span className="text-slate-400 text-xs">Sin notas</span>}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(fila.promedio)}`}>
                                {fila.promedio > 0 ? fila.promedio.toFixed(2) : '—'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(fila.promedioAnual)}`}>
                                {fila.promedioAnual > 0 ? fila.promedioAnual.toFixed(2) : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista Mobile (Tarjetas) */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {filas.map((fila, idx) => (
                      <div key={idx} className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-slate-800 leading-tight">{fila.materia}</p>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${colorPromedio(fila.promedio)}`}>
                            {fila.promedio > 0 ? fila.promedio.toFixed(2) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-1.5">
                            {fila.notas.length > 0 ? (
                              fila.notas.map((nota, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                                  {formatNota(nota)}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-xs">Sin notas</span>
                            )}
                          </div>
                          <span className="shrink-0 text-right">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Anual</span>
                            <span className="font-bold text-xs text-slate-600">{fila.promedioAnual > 0 ? fila.promedioAnual.toFixed(2) : '—'}</span>
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
                <span className="h-3 w-3 rounded-full bg-green-200"></span> Aprobado (7+)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-200"></span> En proceso (4-6)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-200"></span> Desaprobado (menor a 4)
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPanel;