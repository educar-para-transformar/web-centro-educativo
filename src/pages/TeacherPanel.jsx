import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const TRIMESTRES = [1, 2, 3];

const calcularPromedio = (notas) => {
  const validas = notas
    .map((nota) => Number(nota))
    .filter((nota) => Number.isFinite(nota) && nota >= 1 && nota <= 10);

  if (validas.length === 0) return 0;
  return Math.round((validas.reduce((acc, nota) => acc + nota, 0) / validas.length) * 100) / 100;
};

const colorPromedio = (promedio) => {
  if (!promedio) return 'bg-slate-100 text-slate-500';
  if (promedio >= 7) return 'bg-green-100 text-green-700';
  if (promedio >= 4) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

/**
 * Editor de notas de un alumno. Permite agregar o quitar notas
 * sin salir de la tabla del trimestre.
 */
const NotasEditor = ({ alumno, notas, onChange, onAdd, onRemove }) => (
  <div className="flex flex-wrap items-center gap-2">
    {notas.map((nota, index) => (
      <div key={index} className="flex items-center gap-1">
        <input
          type="number"
          min="1"
          max="10"
          step="1"
          value={nota}
          onChange={(e) => onChange(index, e.target.value)}
          placeholder="—"
          aria-label={`Nota ${index + 1} de ${alumno.nombre}`}
          className="w-16 px-2 py-2 text-center bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-lg focus:bg-white focus:border-orange-500 focus:outline-none transition-colors text-sm font-mono font-bold"
        />
        {notas.length > 1 && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Quitar nota ${index + 1} de ${alumno.nombre}`}
            className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0.5"
          >
            <Icon name="close" className="text-sm" />
          </button>
        )}
      </div>
    ))}

    {notas.length < 10 && (
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Agregar nota a ${alumno.nombre}`}
        className="h-9 w-9 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors cursor-pointer bg-transparent"
      >
        <Icon name="add" className="text-base" />
      </button>
    )}
  </div>
);

const TeacherPanel = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null);

  const [selectedMateriaId, setSelectedMateriaId] = useState('');
  const [selectedTrimestre, setSelectedTrimestre] = useState(1);
  const [draft, setDraft] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Solo los docentes pueden acceder al panel.
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'Staff') {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchPanel = useCallback(async () => {
    if (!user || user.role !== 'Staff' || user.mustChangePassword) return;

    setIsLoading(true);
    setError('');
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_getDocentePanel`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'No se pudo cargar el panel docente.');
      }

      const data = await response.json();
      setPanel(data);
      setSelectedMateriaId((prev) =>
        data.materias.some((materia) => materia.id === prev)
          ? prev
          : data.materias[0]?.id || ''
      );
    } catch (err) {
      console.error('Error cargando panel docente:', err);
      setError(err.message || 'Ocurrió un error al cargar tus materias.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPanel();
  }, [fetchPanel]);

  const selectedMateria = useMemo(
    () => panel?.materias.find((materia) => materia.id === selectedMateriaId) || null,
    [panel, selectedMateriaId]
  );

  // Reconstruir el borrador cada vez que cambia la materia o el trimestre.
  useEffect(() => {
    if (!selectedMateria) {
      setDraft({});
      return;
    }

    const nextDraft = {};
    selectedMateria.alumnos.forEach((alumno) => {
      const calificacion = selectedMateria.calificaciones.find(
        (item) => item.studentId === alumno.id && item.trimestre === selectedTrimestre
      );
      const notas = calificacion?.notas?.map((nota) => String(nota)) || [];
      nextDraft[alumno.id] = notas.length > 0 ? notas : ['', ''];
    });

    setDraft(nextDraft);
  }, [selectedMateria, selectedTrimestre]);

  const handleSelectMateria = (materiaId) => {
    setSelectedMateriaId(materiaId);
    setSaveMessage('');
    setSaveError('');
  };

  const handleSelectTrimestre = (trimestre) => {
    setSelectedTrimestre(trimestre);
    setSaveMessage('');
    setSaveError('');
  };

  const handleNotaChange = (studentId, index, value) => {
    setDraft((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || []).map((nota, i) => (i === index ? value : nota)),
    }));
  };

  const handleAddNota = (studentId) => {
    setDraft((prev) => ({
      ...prev,
      [studentId]: [...(prev[studentId] || []), ''],
    }));
  };

  const handleRemoveNota = (studentId, index) => {
    setDraft((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveGrades = async () => {
    if (!selectedMateria) return;

    setSaveMessage('');
    setSaveError('');

    const grades = [];
    for (const alumno of selectedMateria.alumnos) {
      const notas = (draft[alumno.id] || [])
        .map((nota) => nota.trim())
        .filter(Boolean)
        .map((nota) => Number(nota));

      if (notas.some((nota) => !Number.isFinite(nota) || nota < 1 || nota > 10)) {
        setSaveError(`Revisá las notas de ${alumno.nombre}: deben ser números entre 1 y 10.`);
        return;
      }

      grades.push({ studentId: alumno.id, notas });
    }

    setIsSaving(true);
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_saveGrades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          materiaId: selectedMateria.id,
          trimestre: selectedTrimestre,
          anio: panel?.anio,
          grades,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'No se pudieron guardar las calificaciones.');
      }

      const data = await response.json();

      // Reflejar los cambios en memoria sin recargar todo el panel.
      setPanel((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          materias: prev.materias.map((materia) => {
            if (materia.id !== selectedMateria.id) return materia;
            const otras = materia.calificaciones.filter(
              (item) => item.trimestre !== selectedTrimestre
            );
            const nuevas = grades.map((item) => ({
              studentId: item.studentId,
              trimestre: selectedTrimestre,
              notas: item.notas,
            }));
            return { ...materia, calificaciones: [...otras, ...nuevas] };
          }),
        };
      });

      setSaveMessage(data.message || 'Calificaciones guardadas correctamente.');
    } catch (err) {
      console.error('Error guardando notas:', err);
      setSaveError(err.message || 'Ocurrió un error al guardar las notas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || user.role !== 'Staff') {
    return <div className="min-h-screen bg-slate-50"></div>;
  }

  const materias = panel?.materias || [];
  const alumnos = selectedMateria?.alumnos || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-body">
      <Navbar noButtons={true} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              Panel Docente
            </h1>
            <p className="font-body text-slate-500 mt-2">
              Cargá y actualizá las calificaciones de tus materias.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-label text-sm rounded-full border border-slate-200 transition-all duration-200 cursor-pointer self-start md:self-auto"
          >
            <Icon name="logout" className="text-base" />
            Cerrar Sesión
          </button>
        </div>

        {/* Estado de carga */}
        {isLoading && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-500">
            <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-5"></div>
            <p className="font-semibold">Cargando tus materias...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-red-800">
            <div className="flex items-start gap-4">
              <Icon name="error" className="text-red-500 text-2xl shrink-0" />
              <div>
                <p className="font-bold">No se pudo cargar el panel</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchPanel}
              className="shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Sin materias asignadas */}
        {!isLoading && !error && materias.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
            <Icon name="menu_book" className="text-6xl text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-lg text-slate-700">No tenés materias asignadas</p>
            <p className="text-sm text-slate-500 mt-1">
              Cuando un administrador te asigne materias, aparecerán en este panel.
            </p>
          </div>
        )}

        {/* Contenido principal */}
        {!isLoading && !error && materias.length > 0 && (
          <div className="space-y-8">
            {/* Datos del docente */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="h-16 w-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
                <Icon name="badge" className="text-3xl" filled />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Docente</p>
                  <p className="font-bold text-slate-800 truncate">{panel?.docente?.nombre || 'Sin nombre'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Correo</p>
                  <p className="text-sm text-slate-700 truncate">{panel?.docente?.email || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Año Lectivo</p>
                  <p className="font-semibold text-slate-700">{panel?.anio || '—'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Materias asignadas */}
              <section className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 h-fit">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Icon name="menu_book" className="text-orange-500 text-xl" />
                  <h2 className="font-headline font-bold text-lg text-slate-800">Mis materias</h2>
                </div>

                <div className="space-y-2">
                  {materias.map((materia) => {
                    const activa = materia.id === selectedMateriaId;
                    return (
                      <button
                        key={materia.id}
                        type="button"
                        onClick={() => handleSelectMateria(materia.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer bg-transparent ${
                          activa
                            ? 'border-orange-500 bg-orange-50/60'
                            : 'border-slate-100 hover:border-orange-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`font-bold truncate ${activa ? 'text-orange-700' : 'text-slate-800'}`}>
                              {materia.nombre}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {NIVELES_LABEL[materia.nivel] || materia.nivel}
                            </p>
                          </div>
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                            {materia.alumnos.length} alumno{materia.alumnos.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Carga de calificaciones */}
              <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {selectedMateria && (
                  <>
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-headline font-bold text-xl text-slate-800">
                          {selectedMateria.nombre}
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {NIVELES_LABEL[selectedMateria.nivel] || selectedMateria.nivel}
                        </p>
                      </div>

                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {TRIMESTRES.map((trimestre) => (
                          <button
                            key={trimestre}
                            type="button"
                            onClick={() => handleSelectTrimestre(trimestre)}
                            aria-pressed={selectedTrimestre === trimestre}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-label font-bold text-xs transition-all cursor-pointer border-none whitespace-nowrap ${
                              selectedTrimestre === trimestre
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 bg-transparent'
                            }`}
                          >
                            Trimestre {trimestre}
                          </button>
                        ))}
                      </div>
                    </div>

                    {alumnos.length === 0 ? (
                      <div className="p-16 text-center text-slate-500">
                        <Icon name="groups" className="text-5xl text-slate-300 mb-4" />
                        <p className="font-bold text-lg">No hay alumnos inscriptos</p>
                        <p className="text-sm mt-1">
                          El administrador debe inscribir alumnos en esta materia.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Vista Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-label font-bold text-xs uppercase tracking-wider">
                                <th className="py-3.5 px-6">Alumno</th>
                                <th className="py-3.5 px-4">ID Institucional</th>
                                <th className="py-3.5 px-4">Notas</th>
                                <th className="py-3.5 px-4">Promedio</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-body text-sm text-slate-700">
                              {alumnos.map((alumno) => {
                                const notas = draft[alumno.id] || [];
                                const promedio = calcularPromedio(notas);

                                return (
                                  <tr key={alumno.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6 font-bold text-slate-800">{alumno.nombre}</td>
                                    <td className="py-4 px-4 font-mono text-xs text-slate-500">
                                      {alumno.studentID_login || '—'}
                                    </td>
                                    <td className="py-4 px-4">
                                      <NotasEditor
                                        alumno={alumno}
                                        notas={notas}
                                        onChange={(index, value) => handleNotaChange(alumno.id, index, value)}
                                        onAdd={() => handleAddNota(alumno.id)}
                                        onRemove={(index) => handleRemoveNota(alumno.id, index)}
                                      />
                                    </td>
                                    <td className="py-4 px-4">
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(promedio)}`}>
                                        {promedio > 0 ? promedio.toFixed(2) : '—'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Vista Mobile */}
                        <div className="block md:hidden divide-y divide-slate-100">
                          {alumnos.map((alumno) => {
                            const notas = draft[alumno.id] || [];
                            const promedio = calcularPromedio(notas);

                            return (
                              <div key={alumno.id} className="p-5 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 leading-tight">{alumno.nombre}</p>
                                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                                      {alumno.studentID_login || '—'}
                                    </p>
                                  </div>
                                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${colorPromedio(promedio)}`}>
                                    {promedio > 0 ? promedio.toFixed(2) : '—'}
                                  </span>
                                </div>

                                <NotasEditor
                                  alumno={alumno}
                                  notas={notas}
                                  onChange={(index, value) => handleNotaChange(alumno.id, index, value)}
                                  onAdd={() => handleAddNota(alumno.id)}
                                  onRemove={(index) => handleRemoveNota(alumno.id, index)}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Acciones y mensajes */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500">
                              Las notas se guardan para el Trimestre {selectedTrimestre} de {panel?.anio}.
                            </p>
                            {saveMessage && (
                              <p className="text-sm text-green-700 font-bold mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                                {saveMessage}
                              </p>
                            )}
                            {saveError && (
                              <p className="text-sm text-red-700 font-bold mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                {saveError}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveGrades}
                            disabled={isSaving}
                            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold font-label text-sm rounded-full shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                          >
                            <Icon name={isSaving ? 'hourglass_top' : 'save'} className="text-base" />
                            {isSaving ? 'Guardando...' : 'Guardar notas'}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherPanel;
