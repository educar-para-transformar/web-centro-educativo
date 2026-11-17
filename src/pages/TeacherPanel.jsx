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
  return (
    Math.round(
      (validas.reduce((acc, nota) => acc + nota, 0) / validas.length) * 100
    ) / 100
  );
};

const colorPromedio = (promedio) => {
  if (!promedio) return 'bg-slate-100 text-slate-500';
  if (promedio >= 7) return 'bg-green-100 text-green-700';
  if (promedio >= 4) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const MAX_FILE_BYTES = 700 * 1024;

const ESTADOS_ASISTENCIA = [
  { id: 'presente', label: 'Presente', color: 'bg-green-100 text-green-700' },
  { id: 'ausente', label: 'Ausente', color: 'bg-red-100 text-red-700' },
  { id: 'tarde', label: 'Tarde', color: 'bg-amber-100 text-amber-700' },
  {
    id: 'justificada',
    label: 'Justificada',
    color: 'bg-sky-100 text-sky-700',
  },
];

const MATERIAL_TIPOS = [
  { id: 'documento', label: 'Documento' },
  { id: 'pdf', label: 'PDF' },
  { id: 'imagen', label: 'Imagen' },
  { id: 'video', label: 'Video' },
  { id: 'link', label: 'Enlace' },
];

const leerArchivoBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });

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
  link.download = nombre || 'archivo';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

  const [seccion, setSeccion] = useState('notas');

  const [fechaAsistencia, setFechaAsistencia] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [asistenciaDraft, setAsistenciaDraft] = useState({});
  const [isLoadingAsistencia, setIsLoadingAsistencia] = useState(false);
  const [isSavingAsistencia, setIsSavingAsistencia] = useState(false);
  const [asistenciaMessage, setAsistenciaMessage] = useState('');
  const [asistenciaError, setAsistenciaError] = useState('');

  const [materialesDocente, setMaterialesDocente] = useState([]);
  const [isLoadingMaterialesDocente, setIsLoadingMaterialesDocente] =
    useState(false);
  const [materialesDocenteError, setMaterialesDocenteError] = useState('');
  const [materialMessage, setMaterialMessage] = useState('');
  const [materialError, setMaterialError] = useState('');
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'documento',
    url: '',
    archivoBase64: '',
    archivoNombre: '',
    archivoMime: '',
    archivoTamano: 0,
  });

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
    () =>
      panel?.materias.find((materia) => materia.id === selectedMateriaId) ||
      null,
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
        (item) =>
          item.studentId === alumno.id && item.trimestre === selectedTrimestre
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
      [studentId]: (prev[studentId] || []).map((nota, i) =>
        i === index ? value : nota
      ),
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

      if (
        notas.some((nota) => !Number.isFinite(nota) || nota < 1 || nota > 10)
      ) {
        setSaveError(
          `Revisá las notas de ${alumno.nombre}: deben ser números entre 1 y 10.`
        );
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
        throw new Error(
          errData.error || 'No se pudieron guardar las calificaciones.'
        );
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

  const fetchAsistencia = useCallback(async () => {
    if (!selectedMateriaId) return;
    setIsLoadingAsistencia(true);
    setAsistenciaError('');
    setAsistenciaMessage('');
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const params = new URLSearchParams({
        materiaId: selectedMateriaId,
        fecha: fechaAsistencia,
      });
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_getMateriaAttendance?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || 'No se pudieron cargar las asistencias.'
        );
      }
      const data = await response.json();
      const registros = new Map(
        (data.registros || []).map((item) => [item.studentId, item])
      );
      const nextDraft = {};
      (selectedMateria?.alumnos || []).forEach((alumno) => {
        const registro = registros.get(alumno.id);
        nextDraft[alumno.id] = {
          estado: registro?.estado || 'presente',
          observacion: registro?.observacion || '',
        };
      });
      setAsistenciaDraft(nextDraft);
    } catch (err) {
      console.error('Error cargando asistencias:', err);
      setAsistenciaError(
        err.message || 'Ocurrió un error al cargar las asistencias.'
      );
    } finally {
      setIsLoadingAsistencia(false);
    }
  }, [selectedMateriaId, fechaAsistencia, selectedMateria]);

  useEffect(() => {
    if (seccion === 'asistencia') fetchAsistencia();
  }, [seccion, fetchAsistencia]);

  const handleEstadoAsistencia = (studentId, estado) => {
    setAsistenciaDraft((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), estado },
    }));
  };

  const handleObservacionAsistencia = (studentId, observacion) => {
    setAsistenciaDraft((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), observacion },
    }));
  };

  const handleSaveAsistencia = async () => {
    if (!selectedMateria) return;
    setAsistenciaMessage('');
    setAsistenciaError('');
    const records = selectedMateria.alumnos.map((alumno) => ({
      studentId: alumno.id,
      estado: asistenciaDraft[alumno.id]?.estado || 'presente',
      observacion: asistenciaDraft[alumno.id]?.observacion || '',
    }));
    if (records.length === 0) {
      setAsistenciaError('La materia no tiene alumnos inscriptos.');
      return;
    }
    setIsSavingAsistencia(true);
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_saveAttendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          materiaId: selectedMateria.id,
          fecha: fechaAsistencia,
          records,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || 'No se pudieron guardar las asistencias.'
        );
      }
      const data = await response.json();
      setAsistenciaMessage(
        data.message || 'Asistencias guardadas correctamente.'
      );
    } catch (err) {
      console.error('Error guardando asistencias:', err);
      setAsistenciaError(
        err.message || 'Ocurrió un error al guardar las asistencias.'
      );
    } finally {
      setIsSavingAsistencia(false);
    }
  };

  const fetchMaterialesDocente = useCallback(async () => {
    if (!selectedMateriaId) return;
    setIsLoadingMaterialesDocente(true);
    setMaterialesDocenteError('');
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const params = new URLSearchParams({ materiaId: selectedMateriaId });
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_getMateriaMaterials?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || 'No se pudieron cargar los materiales.'
        );
      }
      const data = await response.json();
      setMaterialesDocente(data.materiales || []);
    } catch (err) {
      console.error('Error cargando materiales:', err);
      setMaterialesDocenteError(
        err.message || 'Ocurrió un error al cargar los materiales.'
      );
    } finally {
      setIsLoadingMaterialesDocente(false);
    }
  }, [selectedMateriaId]);

  useEffect(() => {
    if (seccion === 'materiales') fetchMaterialesDocente();
  }, [seccion, fetchMaterialesDocente]);

  const resetMaterialForm = () =>
    setMaterialForm({
      titulo: '',
      descripcion: '',
      tipo: 'documento',
      url: '',
      archivoBase64: '',
      archivoNombre: '',
      archivoMime: '',
      archivoTamano: 0,
    });

  const handleMaterialChange = (campo, valor) => {
    setMaterialForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleArchivoMaterial = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setMaterialError('El archivo supera el tamaño máximo de 700 KB.');
      return;
    }
    try {
      const base64 = await leerArchivoBase64(file);
      setMaterialForm((prev) => ({
        ...prev,
        archivoBase64: base64,
        archivoNombre: file.name,
        archivoMime: file.type || 'application/octet-stream',
        archivoTamano: file.size,
      }));
      setMaterialError('');
    } catch (err) {
      setMaterialError(err.message || 'No se pudo leer el archivo.');
    }
  };

  const handleSaveMaterial = async (event) => {
    event.preventDefault();
    if (!selectedMateria) return;
    setMaterialMessage('');
    setMaterialError('');
    if (!materialForm.titulo.trim()) {
      setMaterialError('El título del material es obligatorio.');
      return;
    }
    if (!materialForm.url.trim() && !materialForm.archivoBase64) {
      setMaterialError('Adjuntá un archivo o indicá un enlace.');
      return;
    }
    setIsSavingMaterial(true);
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_upsertMaterial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          materiaId: selectedMateria.id,
          titulo: materialForm.titulo,
          descripcion: materialForm.descripcion,
          tipo: materialForm.tipo,
          url: materialForm.url,
          anio: panel?.anio,
          ...(materialForm.archivoBase64
            ? {
                archivoBase64: materialForm.archivoBase64,
                archivoNombre: materialForm.archivoNombre,
                archivoMime: materialForm.archivoMime,
              }
            : {}),
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo guardar el material.');
      }
      setMaterialMessage('Material publicado correctamente.');
      resetMaterialForm();
      fetchMaterialesDocente();
    } catch (err) {
      console.error('Error guardando material:', err);
      setMaterialError(err.message || 'Ocurrió un error al guardar.');
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('¿Eliminar este material?')) return;
    setMaterialMessage('');
    setMaterialError('');
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_deleteMaterial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ materialId }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo eliminar el material.');
      }
      setMaterialesDocente((prev) =>
        prev.filter((item) => item.id !== materialId)
      );
      setMaterialMessage('Material eliminado.');
    } catch (err) {
      console.error('Error eliminando material:', err);
      setMaterialError(err.message || 'Ocurrió un error al eliminar.');
    }
  };

  const handleDescargarMaterial = async (material) => {
    if (!material.archivoDisponible) return;
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const params = new URLSearchParams({ materialId: material.id });
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_getMaterialFile?${params.toString()}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo descargar el archivo.');
      }
      descargarBase64(await response.json());
    } catch (err) {
      console.error('Error descargando material:', err);
      setMaterialError(err.message || 'No se pudo descargar el archivo.');
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
            <Icon
              name="menu_book"
              className="text-6xl text-slate-300 mx-auto mb-4"
            />
            <p className="font-bold text-lg text-slate-700">
              No tenés materias asignadas
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Cuando un administrador te asigne materias, aparecerán en este
              panel.
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
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Docente
                  </p>
                  <p className="font-bold text-slate-800 truncate">
                    {panel?.docente?.nombre || 'Sin nombre'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Correo
                  </p>
                  <p className="text-sm text-slate-700 truncate">
                    {panel?.docente?.email || '—'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Año Lectivo
                  </p>
                  <p className="font-semibold text-slate-700">
                    {panel?.anio || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-white rounded-full p-1.5 shadow-sm border border-slate-200 w-fit">
              {[
                { id: 'notas', label: 'Notas', icon: 'assignment' },
                {
                  id: 'asistencia',
                  label: 'Asistencia',
                  icon: 'fact_check',
                },
                {
                  id: 'materiales',
                  label: 'Materiales',
                  icon: 'folder_open',
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSeccion(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors cursor-pointer border-none ${
                    seccion === tab.id
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon name={tab.icon} className="text-base" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Materias asignadas */}
              <section className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 h-fit">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Icon name="menu_book" className="text-orange-500 text-xl" />
                  <h2 className="font-headline font-bold text-lg text-slate-800">
                    Mis materias
                  </h2>
                </div>

                <div className="space-y-2">
                  {materias.map((materia) => {
                    const activa = materia.id === selectedMateriaId;
                    return (
                      <button
                        key={materia.id}
                        type="button"
                        data-testid={`materia-${materia.id}`}
                        onClick={() => handleSelectMateria(materia.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer bg-transparent ${
                          activa
                            ? 'border-orange-500 bg-orange-50/60'
                            : 'border-slate-100 hover:border-orange-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={`font-bold truncate ${activa ? 'text-orange-700' : 'text-slate-800'}`}
                            >
                              {materia.nombre}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {NIVELES_LABEL[materia.nivel] || materia.nivel}
                            </p>
                          </div>
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                            {materia.alumnos.length} alumno
                            {materia.alumnos.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Carga de calificaciones */}
              {seccion === 'notas' && (
                <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {selectedMateria && (
                    <>
                      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="font-headline font-bold text-xl text-slate-800">
                            {selectedMateria.nombre}
                          </h2>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {NIVELES_LABEL[selectedMateria.nivel] ||
                              selectedMateria.nivel}
                          </p>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          {TRIMESTRES.map((trimestre) => (
                            <button
                              key={trimestre}
                              type="button"
                              data-testid={`trimestre-${trimestre}`}
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
                          <Icon
                            name="groups"
                            className="text-5xl text-slate-300 mb-4"
                          />
                          <p className="font-bold text-lg">
                            No hay alumnos inscriptos
                          </p>
                          <p className="text-sm mt-1">
                            El administrador debe inscribir alumnos en esta
                            materia.
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
                                  <th className="py-3.5 px-4">
                                    ID Institucional
                                  </th>
                                  <th className="py-3.5 px-4">Notas</th>
                                  <th className="py-3.5 px-4">Promedio</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-body text-sm text-slate-700">
                                {alumnos.map((alumno) => {
                                  const notas = draft[alumno.id] || [];
                                  const promedio = calcularPromedio(notas);

                                  return (
                                    <tr
                                      key={alumno.id}
                                      data-testid={`alumno-${alumno.id}`}
                                      className="hover:bg-slate-50/50 transition-colors"
                                    >
                                      <td className="py-4 px-6 font-bold text-slate-800">
                                        {alumno.nombre}
                                      </td>
                                      <td className="py-4 px-4 font-mono text-xs text-slate-500">
                                        {alumno.studentID_login || '—'}
                                      </td>
                                      <td className="py-4 px-4">
                                        <NotasEditor
                                          alumno={alumno}
                                          notas={notas}
                                          onChange={(index, value) =>
                                            handleNotaChange(
                                              alumno.id,
                                              index,
                                              value
                                            )
                                          }
                                          onAdd={() => handleAddNota(alumno.id)}
                                          onRemove={(index) =>
                                            handleRemoveNota(alumno.id, index)
                                          }
                                        />
                                      </td>
                                      <td className="py-4 px-4">
                                        <span
                                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorPromedio(promedio)}`}
                                        >
                                          {promedio > 0
                                            ? promedio.toFixed(2)
                                            : '—'}
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
                                      <p className="font-bold text-slate-800 leading-tight">
                                        {alumno.nombre}
                                      </p>
                                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                                        {alumno.studentID_login || '—'}
                                      </p>
                                    </div>
                                    <span
                                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${colorPromedio(promedio)}`}
                                    >
                                      {promedio > 0 ? promedio.toFixed(2) : '—'}
                                    </span>
                                  </div>

                                  <NotasEditor
                                    alumno={alumno}
                                    notas={notas}
                                    onChange={(index, value) =>
                                      handleNotaChange(alumno.id, index, value)
                                    }
                                    onAdd={() => handleAddNota(alumno.id)}
                                    onRemove={(index) =>
                                      handleRemoveNota(alumno.id, index)
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Acciones y mensajes */}
                          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500">
                                Las notas se guardan para el Trimestre{' '}
                                {selectedTrimestre} de {panel?.anio}.
                              </p>
                              {saveMessage && (
                                <p
                                  data-testid="save-message"
                                  className="text-sm text-green-700 font-bold mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2"
                                >
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
                              data-testid="guardar-notas"
                              onClick={handleSaveGrades}
                              disabled={isSaving}
                              className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold font-label text-sm rounded-full shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                              <Icon
                                name={isSaving ? 'hourglass_top' : 'save'}
                                className="text-base"
                              />
                              {isSaving ? 'Guardando...' : 'Guardar notas'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </section>
              )}

              {seccion === 'asistencia' && (
                <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {selectedMateria && (
                    <>
                      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="font-headline font-bold text-xl text-slate-800">
                            Asistencia · {selectedMateria.nombre}
                          </h2>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Registrá el estado de cada alumno para la fecha.
                          </p>
                        </div>
                        <input
                          type="date"
                          value={fechaAsistencia}
                          onChange={(e) => setFechaAsistencia(e.target.value)}
                          className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none text-sm"
                        />
                      </div>

                      {isLoadingAsistencia ? (
                        <div className="p-16 text-center text-slate-500">
                          <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                          <p className="font-semibold">
                            Cargando asistencias...
                          </p>
                        </div>
                      ) : alumnos.length === 0 ? (
                        <div className="p-16 text-center text-slate-500">
                          <Icon
                            name="groups"
                            className="text-5xl text-slate-300 mb-4"
                          />
                          <p className="font-bold">No hay alumnos inscriptos</p>
                        </div>
                      ) : (
                        <>
                          <div className="divide-y divide-slate-100">
                            {alumnos.map((alumno) => {
                              const registro = asistenciaDraft[alumno.id] || {};
                              return (
                                <div key={alumno.id} className="p-5 space-y-3">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 truncate">
                                      {alumno.nombre}
                                    </p>
                                    <p className="font-mono text-[11px] text-slate-500">
                                      {alumno.studentID_login || '—'}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {ESTADOS_ASISTENCIA.map((estado) => (
                                      <button
                                        key={estado.id}
                                        type="button"
                                        onClick={() =>
                                          handleEstadoAsistencia(
                                            alumno.id,
                                            estado.id
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border-none ${
                                          registro.estado === estado.id
                                            ? estado.color
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                      >
                                        {estado.label}
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    type="text"
                                    value={registro.observacion || ''}
                                    onChange={(e) =>
                                      handleObservacionAsistencia(
                                        alumno.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Observación (opcional)"
                                    maxLength={200}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0 space-y-2">
                              {asistenciaMessage && (
                                <p className="text-sm text-green-700 font-bold bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                                  {asistenciaMessage}
                                </p>
                              )}
                              {asistenciaError && (
                                <p className="text-sm text-red-700 font-bold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                  {asistenciaError}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveAsistencia}
                              disabled={isSavingAsistencia}
                              className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-full shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none"
                            >
                              <Icon
                                name={
                                  isSavingAsistencia ? 'hourglass_top' : 'save'
                                }
                                className="text-base"
                              />
                              {isSavingAsistencia
                                ? 'Guardando...'
                                : 'Guardar asistencia'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </section>
              )}

              {seccion === 'materiales' && (
                <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {selectedMateria && (
                    <>
                      <div className="p-6 border-b border-slate-100">
                        <h2 className="font-headline font-bold text-xl text-slate-800">
                          Materiales · {selectedMateria.nombre}
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Publicá archivos o enlaces para tus alumnos.
                        </p>
                      </div>

                      <form
                        onSubmit={handleSaveMaterial}
                        className="p-6 border-b border-slate-100 space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Título *
                            </label>
                            <input
                              type="text"
                              value={materialForm.titulo}
                              onChange={(e) =>
                                handleMaterialChange('titulo', e.target.value)
                              }
                              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none text-sm"
                              placeholder="Ej. Guía de ejercicios"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Tipo
                            </label>
                            <select
                              value={materialForm.tipo}
                              onChange={(e) =>
                                handleMaterialChange('tipo', e.target.value)
                              }
                              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none text-sm"
                            >
                              {MATERIAL_TIPOS.map((tipo) => (
                                <option key={tipo.id} value={tipo.id}>
                                  {tipo.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Descripción
                          </label>
                          <textarea
                            value={materialForm.descripcion}
                            onChange={(e) =>
                              handleMaterialChange(
                                'descripcion',
                                e.target.value
                              )
                            }
                            rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Enlace (opcional)
                          </label>
                          <input
                            type="url"
                            value={materialForm.url}
                            onChange={(e) =>
                              handleMaterialChange('url', e.target.value)
                            }
                            className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none text-sm"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Archivo (máx. 700 KB)
                          </label>
                          <input
                            type="file"
                            onChange={handleArchivoMaterial}
                            className="w-full text-sm text-slate-600 file:mr-4 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-orange-100 file:text-orange-700 file:font-bold cursor-pointer"
                          />
                          {materialForm.archivoNombre && (
                            <p className="text-xs text-slate-500 mt-1">
                              {materialForm.archivoNombre} ·{' '}
                              {Math.round(materialForm.archivoTamano / 1024)} KB
                            </p>
                          )}
                        </div>
                        {materialMessage && (
                          <p className="text-sm text-green-700 font-bold bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                            {materialMessage}
                          </p>
                        )}
                        {materialError && (
                          <p className="text-sm text-red-700 font-bold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                            {materialError}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isSavingMaterial}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-full shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none"
                          >
                            <Icon
                              name={
                                isSavingMaterial ? 'hourglass_top' : 'upload'
                              }
                              className="text-base"
                            />
                            {isSavingMaterial
                              ? 'Publicando...'
                              : 'Publicar material'}
                          </button>
                        </div>
                      </form>

                      <div className="p-6">
                        <h3 className="font-headline font-bold text-lg text-slate-800 mb-4">
                          Publicados
                        </h3>
                        {isLoadingMaterialesDocente ? (
                          <div className="text-center text-slate-500 py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            Cargando materiales...
                          </div>
                        ) : materialesDocenteError ? (
                          <p className="text-sm text-red-600">
                            {materialesDocenteError}
                          </p>
                        ) : materialesDocente.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            Todavía no publicaste materiales en esta materia.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {materialesDocente.map((material) => (
                              <div
                                key={material.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                              >
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800">
                                    {material.titulo}
                                  </p>
                                  {material.descripcion && (
                                    <p className="text-sm text-slate-500 line-clamp-2">
                                      {material.descripcion}
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-400 mt-1">
                                    {MATERIAL_TIPOS.find(
                                      (tipo) => tipo.id === material.tipo
                                    )?.label || material.tipo}
                                    {material.archivoDisponible
                                      ? ` · ${material.archivoNombre || 'archivo adjunto'}`
                                      : material.url
                                        ? ' · enlace externo'
                                        : ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {material.archivoDisponible && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDescargarMaterial(material)
                                      }
                                      className="px-3 py-2 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-bold border-none cursor-pointer"
                                    >
                                      Descargar
                                    </button>
                                  )}
                                  {material.url && (
                                    <a
                                      href={material.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold no-underline"
                                    >
                                      Abrir enlace
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteMaterial(material.id)
                                    }
                                    className="px-3 py-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold border-none cursor-pointer"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherPanel;
