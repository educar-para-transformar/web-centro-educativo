import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import SuccessModal from '../components/molecules/SuccessModal';
import { db, auth } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'create'

  const [creationType, setCreationType] = useState('parent_student');

  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentDni, setParentDni] = useState('');
  const [students, setStudents] = useState([
    { nombre: '', dni: '', fechaNacimiento: '', nivel: 'inicial', genero: 'Masculino' }
  ]);

  // Form State for creating Administrative/Staff User
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminDni, setAdminDni] = useState('');
  const [adminRole, setAdminRole] = useState('Staff');

  // Dashboard Sub-Tab ('students' or 'staff')
  const [dashboardSubTab, setDashboardSubTab] = useState('students');

  const [editingUser, setEditingUser] = useState(null); // { id, type, fields: { nombre, email, dni, ... } }

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState({ title: '', message: '' });
  const [formError, setFormError] = useState('');

  // Auto-switch tab if user is not admin
  useEffect(() => {
    if (activeTab === 'create' && user && user.role !== 'user_admin') {
      setActiveTab('dashboard');
    }
  }, [activeTab, user]);

  // Dashboard Data State
  const [parentsList, setParentsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  // Filters State
  const [searchFilter, setSearchFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('todos');

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
      console.warn("Acceso denegado al Panel de Administración. Requiere rol user_admin.");
      navigate('/login');
    };
    checkAdminAuth();
  }, [navigate]);

  // Fetch Firestore users and students on mount & when dashboard tab is active
  const fetchDashboardData = async () => {
    setIsLoadingData(true);
    setDataError('');
    try {
      // In v2 / emulator, or real environment
      const parentsSnap = await getDocs(collection(db, 'users'));
      const studentsSnap = await getDocs(collection(db, 'students'));

      const parents = parentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setParentsList(parents);
      setStudentsList(students);
    } catch (err) {
      console.error("Error cargando datos de Firestore:", err);
      setDataError("No se pudieron cargar datos reales de Firestore. Mostrando datos simulados.");
      
      // Fallback a datos simulados premium para visualización en local
      setParentsList([
        { id: 'parent-1', nombre: 'Eduardo Gómez', email: 'eduardo@ejemplo.com', emailInvalid: false, studentIds: ['student-1', 'student-2'] },
        { id: 'parent-2', nombre: 'María Rodríguez', email: 'maria.invalid@gmail.com', emailInvalid: true, studentIds: ['student-3'] }
      ]);
      setStudentsList([
        { id: 'student-1', studentID_login: 'EST-2026-88123', parentId: 'parent-1', emailPadre: 'eduardo@ejemplo.com', nombre: 'Lucía Gómez', dni: '48123456', nivel: 'inicial', status: 'active' },
        { id: 'student-2', studentID_login: 'EST-2026-90412', parentId: 'parent-1', emailPadre: 'eduardo@ejemplo.com', nombre: 'Mateo Gómez', dni: '45123987', nivel: 'primaria', status: 'pendingParentActivation' },
        { id: 'student-3', studentID_login: 'EST-2026-10492', parentId: 'parent-2', emailPadre: 'maria.invalid@gmail.com', nombre: 'Sofía Rodríguez', dni: '42987123', nivel: 'secundaria', status: 'pendingParentActivation' }
      ]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  // Handler to call api cf_createParentAndStudents
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!parentEmail.trim() || !parentName.trim() || !parentDni.trim()) {
      setFormError('Por favor, completa todos los datos del tutor (nombre, email y DNI).');
      return;
    }

    // Validate students list
    for (const std of students) {
      if (!std.nombre.trim() || !std.dni.trim() || !std.fechaNacimiento || !std.genero) {
        setFormError('Por favor, completa todos los datos de los estudiantes (incluyendo género).');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1' : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');
      
      let token = 'mock-admin-token';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_createParentAndStudents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          parentEmail: parentEmail.trim(),
          parentName: parentName.trim(),
          parentDni: parentDni.trim(),
          students
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error en la petición.');
      }

      await response.json();

      setSuccessModalData({
        title: '¡Tutor y Alumnos Creados!',
        message: `Se ha registrado a ${parentName} con DNI ${parentDni}. Las cuentas han sido activadas. El tutor podrá ingresar usando su DNI como contraseña temporal.`
      });
      setSuccessModalOpen(true);

      // Reset Form
      setParentEmail('');
      setParentName('');
      setParentDni('');
      setStudents([{ nombre: '', dni: '', fechaNacimiento: '', nivel: 'inicial', genero: 'Masculino' }]);

    } catch (err) {
      console.error(err);
      setFormError(`Fallo al registrar: ${err.message || 'Error de conexión.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!adminEmail.trim() || !adminName.trim() || !adminRole || !adminDni.trim()) {
      setFormError('Por favor, completa todos los campos del formulario (incluyendo DNI).');
      return;
    }

    setIsSubmitting(true);
    try {
      const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1' : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');
      
      let token = 'mock-admin-token';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_createAdministrativeUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: adminEmail.trim(),
          name: adminName.trim(),
          role: adminRole,
          dni: adminDni.trim()
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error en la petición.');
      }

      await response.json();

      setSuccessModalData({
        title: '¡Usuario Creado!',
        message: `Se ha registrado a ${adminName} con el rol de ${adminRole}. Cuenta activa. El usuario podrá ingresar utilizando su DNI como contraseña temporal.`
      });
      setSuccessModalOpen(true);

      // Reset Form
      setAdminEmail('');
      setAdminName('');
      setAdminDni('');
      setAdminRole('Staff');

    } catch (err) {
      console.error(err);
      setFormError(`Fallo al registrar: ${err.message || 'Error de conexión.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper dynamic fields addition/removal for students
  const handleStudentChange = (index, field, value) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
  };

  const addStudentField = () => {
    setStudents([...students, { nombre: '', dni: '', fechaNacimiento: '', nivel: 'inicial', genero: 'Masculino' }]);
  };

  const removeStudentField = (index) => {
    if (students.length === 1) return;
    const updated = students.filter((_, i) => i !== index);
    setStudents(updated);
  };

  // Restablecer contraseña al DNI
  const handleResetPassword = async (userId, userType, userDni) => {
    if (!userDni) {
      alert('Error: El DNI del usuario es requerido para el restablecimiento.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas restablecer la contraseña al DNI (${userDni}) por defecto?`)) {
      return;
    }
    try {
      const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1' : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');
      let token = 'mock-admin-token';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_resetUserPasswordToDni`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, userType })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Fallo de API.');
      }

      alert('Contraseña restablecida con éxito al DNI. El usuario deberá cambiarla la próxima vez que ingrese.');
      fetchDashboardData();
    } catch (err) {
      alert(`Error al restablecer contraseña: ${err.message}`);
    }
  };

  // Guardar cambios del formulario de edición
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1' : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');
      let token = 'mock-admin-token';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_updateUserProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetId: editingUser.id,
          targetType: editingUser.type,
          fields: editingUser.fields
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Fallo de API.');
      }

      alert('Perfil actualizado con éxito.');
      setEditingUser(null);
      fetchDashboardData();
    } catch (err) {
      alert(`Error al actualizar perfil: ${err.message}`);
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditingUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        fields: {
          ...prev.fields,
          [field]: value
        }
      };
    });
  };

  // Filter logic on the dashboard list
  const filteredStudents = studentsList.filter(student => {
    const matchesSearch = 
      (student.nombre || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (student.studentID_login || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (student.dni || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (student.emailPadre || '').toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesLevel = levelFilter === 'todos' || (student.nivel || 'inicial') === levelFilter;

    return matchesSearch && matchesLevel;
  });

  const filteredStaff = parentsList.filter(user => {
    // Solo personal institucional (user_admin, Staff, Administrativo)
    const isStaff = user.role === 'user_admin' || user.role === 'Staff' || user.role === 'Administrativo';
    if (!isStaff) return false;

    const matchesSearch = 
      (user.nombre || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (user.dni || '').toLowerCase().includes(searchFilter.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 font-body">
      <Navbar noButtons={true} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="font-headline text-4xl font-extrabold text-slate-800 tracking-tight">Panel de Administración</h1>
            <p className="font-body text-slate-500 mt-2">Gestión de tutores, estudiantes y activación de credenciales.</p>
          </div>

          {/* Tab Selection buttons */}
          <div className="flex bg-slate-200/60 p-1.5 rounded-full border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2.5 rounded-full font-label font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name="dashboard" className="text-lg" />
                <span>Dashboard de Usuarios</span>
              </div>
            </button>
            {user?.role === 'user_admin' && (
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-2.5 rounded-full font-label font-bold text-sm transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name="person_add" className="text-lg" />
                  <span>Crear Usuarios</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="relative w-full md:w-96">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Icon name="search" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por alumno, email del tutor o ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="text-sm font-semibold text-slate-500 whitespace-nowrap">Nivel Educativo:</label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="w-full md:w-48 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-all text-sm appearance-none"
                >
                  <option value="todos">Todos los niveles</option>
                  <option value="inicial">Nivel Inicial</option>
                  <option value="primaria">Primaria</option>
                  <option value="secundaria">Secundaria</option>
                </select>
              </div>
            </div>

            {/* Warn message if Firestore failed and mock data is shown */}
            {dataError && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center gap-3 text-amber-800">
                <Icon name="warning" className="text-amber-500 text-2xl" />
                <p className="text-sm font-medium">{dataError}</p>
              </div>
            )}

            {/* Sub-tabs Selector */}
            <div className="flex bg-slate-200/40 p-1 rounded-xl border border-slate-200/50 max-w-md">
              <button
                onClick={() => setDashboardSubTab('students')}
                className={`flex-1 py-2 rounded-lg font-label font-bold text-xs transition-all cursor-pointer border-none ${
                  dashboardSubTab === 'students'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Estudiantes y Tutores
              </button>
              <button
                onClick={() => setDashboardSubTab('staff')}
                className={`flex-1 py-2 rounded-lg font-label font-bold text-xs transition-all cursor-pointer border-none ${
                  dashboardSubTab === 'staff'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Personal Institucional
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                {isLoadingData ? (
                  <div className="p-12 text-center text-slate-500">
                    <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="font-semibold">Cargando base de datos...</p>
                  </div>
                ) : (dashboardSubTab === 'students' ? filteredStudents.length === 0 : filteredStaff.length === 0) ? (
                  <div className="p-16 text-center text-slate-500">
                    <Icon name="person_off" className="text-5xl text-slate-300 mb-4" />
                    <p className="font-bold text-lg">No se encontraron usuarios</p>
                    <p className="text-sm mt-1">Prueba con otros criterios de búsqueda o añade nuevos usuarios.</p>
                  </div>
                ) : dashboardSubTab === 'students' ? (
                  <>
                    {/* Vista Desktop (Tabla) */}
                    <div className="hidden md:block">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-label font-bold text-xs uppercase tracking-wider">
                            <th className="py-4 px-6">Estudiante / ID</th>
                            <th className="py-4 px-6">Nivel</th>
                            <th className="py-4 px-6">Tutor / Contacto</th>
                            <th className="py-4 px-6">Estado (Clave)</th>
                            <th className="py-4 px-6 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-body text-sm text-slate-700">
                          {filteredStudents.map((student) => {
                            const parent = parentsList.find(p => p.id === student.parentId) || { nombre: 'Sin Tutor', email: '', dni: '', mustChangePassword: true, emailInvalid: false };
                            return (
                              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-5 px-6">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-slate-800">{student.nombre}</span>
                                    <span className="text-xs text-slate-400 font-mono">
                                      {student.studentID_login} | DNI: {student.dni} | Género: {student.genero || 'No especificado'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    (student.nivel || 'inicial') === 'inicial' ? 'bg-secondary-container/20 text-secondary' :
                                    (student.nivel || 'inicial') === 'primaria' ? 'bg-primary-container/20 text-primary' :
                                    'bg-tertiary-container/20 text-tertiary-dim'
                                  }`}>
                                    {(student.nivel || 'inicial').toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-5 px-6">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-slate-700">{parent.nombre}</span>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                      <span>{parent.email || student.emailPadre}</span>
                                      {parent.dni && <span className="text-slate-300">| DNI: {parent.dni}</span>}
                                      {parent.emailInvalid && (
                                        <span className="flex items-center gap-0.5 text-red-500 font-bold uppercase tracking-wider text-[9px] bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                          <Icon name="error" className="text-[10px]" />
                                          Email Inválido
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <div className="flex flex-col gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold w-max ${
                                      student.mustChangePassword
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-green-50 text-green-700 border border-green-200'
                                    }`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${student.mustChangePassword ? 'bg-amber-500' : 'bg-green-600'}`} />
                                      Alumno: {student.mustChangePassword ? 'Temporal (DNI)' : 'Cambiada'}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold w-max ${
                                      parent.mustChangePassword
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-green-50 text-green-700 border border-green-200'
                                    }`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${parent.mustChangePassword ? 'bg-amber-500' : 'bg-green-600'}`} />
                                      Tutor: {parent.mustChangePassword ? 'Temporal (DNI)' : 'Cambiada'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 bg-orange-50/50 p-1.5 rounded-lg border border-orange-100">
                                      <span className="text-[10px] font-bold text-orange-700 uppercase">Alumno:</span>
                                      <button
                                        type="button"
                                        onClick={() => handleResetPassword(student.id, 'student', student.dni)}
                                        title="Restablecer clave del estudiante al DNI"
                                        className="p-1 rounded bg-white text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer border border-orange-200/50"
                                      >
                                        <Icon name="lock_reset" className="text-sm" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingUser({
                                          id: student.id,
                                          type: 'student',
                                          fields: {
                                            nombre: student.nombre || '',
                                            dni: student.dni || '',
                                            fechaNacimiento: student.fechaNacimiento || '',
                                            nivel: student.nivel || 'inicial',
                                            genero: student.genero || 'Masculino'
                                          }
                                        })}
                                        title="Editar datos del alumno"
                                        className="p-1 rounded bg-white text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer border border-orange-200/50"
                                      >
                                        <Icon name="edit" className="text-sm" />
                                      </button>
                                    </div>
                                    {student.parentId && (
                                      <div className="flex items-center gap-1.5 bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100">
                                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Tutor:</span>
                                        <button
                                          type="button"
                                          onClick={() => handleResetPassword(student.parentId, 'parent', parent.dni)}
                                          title="Restablecer clave del tutor al DNI"
                                          className="p-1 rounded bg-white text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border border-indigo-200/50"
                                        >
                                          <Icon name="lock_reset" className="text-sm" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingUser({
                                            id: student.parentId,
                                            type: 'parent',
                                            fields: {
                                              nombre: parent.nombre || '',
                                              dni: parent.dni || '',
                                              email: parent.email || student.emailPadre || ''
                                            }
                                          })}
                                          title="Editar datos del tutor"
                                          className="p-1 rounded bg-white text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border border-indigo-200/50"
                                        >
                                          <Icon name="edit" className="text-sm" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista Mobile (Tarjetas) */}
                    <div className="block md:hidden space-y-4 p-4 bg-slate-50/50">
                      {filteredStudents.map((student) => {
                        const parent = parentsList.find(p => p.id === student.parentId) || { nombre: 'Sin Tutor', email: '', dni: '', mustChangePassword: true, emailInvalid: false };
                        return (
                          <div key={student.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 text-left">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-base text-slate-800 leading-tight">{student.nombre}</span>
                                <span className="text-xs text-slate-400 font-mono">{student.studentID_login}</span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                                (student.nivel || 'inicial') === 'inicial' ? 'bg-secondary-container/20 text-secondary' :
                                (student.nivel || 'inicial') === 'primaria' ? 'bg-primary-container/20 text-primary' :
                                'bg-tertiary-container/20 text-tertiary-dim'
                              }`}>
                                {(student.nivel || 'inicial').toUpperCase()}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-50 py-2">
                              <div>
                                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">DNI Alumno</span>
                                <span className="font-bold text-slate-700">{student.dni}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Género</span>
                                <span className="font-bold text-slate-700">{student.genero || 'No especificado'}</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Tutor Responsable</span>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-slate-700">{parent.nombre}</span>
                                <span className="text-xs text-slate-500">{parent.email || student.emailPadre}</span>
                                {parent.emailInvalid && (
                                  <span className="flex items-center gap-1 text-red-500 font-bold uppercase tracking-wider text-[9px] mt-1">
                                    <Icon name="error" className="text-[10px]" />
                                    Email Inválido
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                student.mustChangePassword ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-green-50 text-green-700 border border-green-100'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${student.mustChangePassword ? 'bg-amber-500' : 'bg-green-600'}`} />
                                Alumno: {student.mustChangePassword ? 'Temporal' : 'Activa'}
                              </span>
                              {student.parentId && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  parent.mustChangePassword ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-green-50 text-green-700 border border-green-100'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${parent.mustChangePassword ? 'bg-amber-500' : 'bg-green-600'}`} />
                                  Tutor: {parent.mustChangePassword ? 'Temporal' : 'Activa'}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2.5 pt-2 border-t border-slate-50">
                              <div className="flex-1 flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Alumno</span>
                                <div className="flex justify-center gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(student.id, 'student', student.dni)}
                                    title="Restablecer clave al DNI"
                                    className="flex-1 py-1.5 px-2 rounded bg-white text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer border border-orange-200/50 flex items-center justify-center gap-1"
                                  >
                                    <Icon name="lock_reset" className="text-sm" />
                                    <span className="text-[10px] font-bold">Reset</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUser({
                                      id: student.id,
                                      type: 'student',
                                      fields: {
                                        nombre: student.nombre || '',
                                        dni: student.dni || '',
                                        fechaNacimiento: student.fechaNacimiento || '',
                                        nivel: student.nivel || 'inicial',
                                        genero: student.genero || 'Masculino'
                                      }
                                    })}
                                    title="Editar datos"
                                    className="flex-1 py-1.5 px-2 rounded bg-white text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer border border-orange-200/50 flex items-center justify-center gap-1"
                                  >
                                    <Icon name="edit" className="text-sm" />
                                    <span className="text-[10px] font-bold">Editar</span>
                                  </button>
                                </div>
                              </div>

                              {student.parentId && (
                                <div className="flex-1 flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Tutor</span>
                                  <div className="flex justify-center gap-2 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleResetPassword(student.parentId, 'parent', parent.dni)}
                                      title="Restablecer clave al DNI"
                                      className="flex-1 py-1.5 px-2 rounded bg-white text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border border-indigo-200/50 flex items-center justify-center gap-1"
                                    >
                                      <Icon name="lock_reset" className="text-sm" />
                                      <span className="text-[10px] font-bold">Reset</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingUser({
                                        id: student.parentId,
                                        type: 'parent',
                                        fields: {
                                          nombre: parent.nombre || '',
                                          dni: parent.dni || '',
                                          email: parent.email || student.emailPadre || ''
                                        }
                                      })}
                                      title="Editar datos"
                                      className="flex-1 py-1.5 px-2 rounded bg-white text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border border-indigo-200/50 flex items-center justify-center gap-1"
                                    >
                                      <Icon name="edit" className="text-sm" />
                                      <span className="text-[10px] font-bold">Editar</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Vista Desktop (Tabla) */}
                    <div className="hidden md:block">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-label font-bold text-xs uppercase tracking-wider">
                            <th className="py-4 px-6">Nombre / DNI</th>
                            <th className="py-4 px-6">Rol Institucional</th>
                            <th className="py-4 px-6">Contacto (Email)</th>
                            <th className="py-4 px-6">Estado (Clave)</th>
                            <th className="py-4 px-6 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-body text-sm text-slate-700">
                          {filteredStaff.map((staff) => (
                            <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-5 px-6">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800">{staff.nombre}</span>
                                  <span className="text-xs text-slate-400 font-mono">DNI: {staff.dni || 'No registrado'}</span>
                                </div>
                              </td>
                              <td className="py-5 px-6">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  staff.role === 'user_admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  staff.role === 'Administrativo' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                  'bg-green-50 text-green-700 border border-green-200'
                                }`}>
                                  {staff.role === 'user_admin' ? 'Administrador General' :
                                   staff.role === 'Administrativo' ? 'Administrativo' :
                                   'Docente / Staff'}
                                </span>
                              </td>
                              <td className="py-5 px-6">
                                <span className="text-slate-600">{staff.email}</span>
                              </td>
                              <td className="py-5 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                  staff.mustChangePassword 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                    : 'bg-green-50 text-green-700 border border-green-200'
                                }`}>
                                  <span className={`h-2 w-2 rounded-full ${staff.mustChangePassword ? 'bg-amber-500 animate-pulse' : 'bg-green-600'}`} />
                                  {staff.mustChangePassword ? 'Temporal (DNI)' : 'Clave Segura'}
                                </span>
                              </td>
                              <td className="py-5 px-6 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(staff.id, 'administrative', staff.dni)}
                                    title="Restablecer clave del personal al DNI"
                                    className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer border border-orange-200/50"
                                  >
                                    <Icon name="lock_reset" className="text-base" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUser({
                                      id: staff.id,
                                      type: 'administrative',
                                      fields: {
                                        nombre: staff.nombre || '',
                                        dni: staff.dni || '',
                                        email: staff.email || '',
                                        role: staff.role || 'Staff'
                                      }
                                    })}
                                    title="Editar datos del personal"
                                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200/50"
                                  >
                                    <Icon name="edit" className="text-base" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista Mobile (Tarjetas) */}
                    <div className="block md:hidden space-y-4 p-4 bg-slate-50/50">
                      {filteredStaff.map((staff) => (
                        <div key={staff.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 text-left">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-base text-slate-800 leading-tight">{staff.nombre}</span>
                              <span className="text-xs text-slate-400 font-mono">DNI: {staff.dni || 'No registrado'}</span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                              staff.role === 'user_admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                              staff.role === 'Administrativo' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              'bg-green-50 text-green-700 border border-green-200'
                            }`}>
                              {staff.role === 'user_admin' ? 'Admin' :
                               staff.role === 'Administrativo' ? 'Admin. Interno' :
                               'Docente'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Correo Electrónico</span>
                            <span className="text-xs text-slate-700 font-medium">{staff.email}</span>
                          </div>

                          <div>
                            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Estado de Credenciales</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold mt-1 ${
                              staff.mustChangePassword ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-green-50 text-green-700 border border-green-100'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${staff.mustChangePassword ? 'bg-amber-500 animate-pulse' : 'bg-green-600'}`} />
                              Clave: {staff.mustChangePassword ? 'Temporal (DNI)' : 'Cambiada / Segura'}
                            </span>
                          </div>

                          <div className="flex gap-3 pt-3 border-t border-slate-50">
                            <button
                              type="button"
                              onClick={() => handleResetPassword(staff.id, 'administrative', staff.dni)}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer border border-orange-200/50 flex items-center justify-center gap-2 text-xs font-bold"
                            >
                              <Icon name="lock_reset" className="text-sm" />
                              <span>Restablecer Clave</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUser({
                                id: staff.id,
                                type: 'administrative',
                                fields: {
                                  nombre: staff.nombre || '',
                                  dni: staff.dni || '',
                                  email: staff.email || '',
                                  role: staff.role || 'Staff'
                                }
                              })}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200/50 flex items-center justify-center gap-2 text-xs font-bold"
                            >
                              <Icon name="edit" className="text-sm" />
                              <span>Editar Datos</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Creation Tab Content */}
        {activeTab === 'create' && user?.role === 'user_admin' && (
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-xl max-w-4xl mx-auto">
            <h2 className="font-headline text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Icon name="person_add" className="text-orange-500" />
              <span>
                {creationType === 'parent_student'
                  ? 'Registrar Tutor y Estudiantes'
                  : 'Registrar Personal / Administrativo'}
              </span>
            </h2>

            {/* Sub-selector for creation type */}
            <div className="flex bg-slate-100 p-1.5 rounded-full border border-slate-200 mb-8 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setCreationType('parent_student');
                  setFormError('');
                }}
                className={`flex-1 py-2 rounded-full font-label font-bold text-xs transition-all cursor-pointer border-none ${
                  creationType === 'parent_student'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Tutor y Estudiantes
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreationType('administrative');
                  setFormError('');
                }}
                className={`flex-1 py-2 rounded-full font-label font-bold text-xs transition-all cursor-pointer border-none ${
                  creationType === 'administrative'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Personal / Administrativo
              </button>
            </div>

            {creationType === 'parent_student' ? (
              <form onSubmit={handleCreateSubmit} className="space-y-8">
                {/* Tutor Section */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 space-y-4 text-left">
                  <h3 className="font-label font-bold text-xs uppercase tracking-widest text-slate-500">Datos del Padre/Tutor</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600">Nombre Completo del Tutor</label>
                      <input
                        type="text"
                        placeholder="Ej. Andrés Martínez"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-sm"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600">DNI del Tutor</label>
                      <input
                        type="text"
                        placeholder="Número de DNI"
                        value={parentDni}
                        onChange={(e) => setParentDni(e.target.value.replace(/\D/g, ''))}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-sm"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600">Correo Electrónico</label>
                      <input
                        type="email"
                        placeholder="tutor@ejemplo.com"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Hijos Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-label font-bold text-xs uppercase tracking-widest text-slate-500">Estudiantes Vinculados</h3>
                    <button
                      type="button"
                      onClick={addStudentField}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold text-xs rounded-full transition-all cursor-pointer border-none"
                    >
                      <Icon name="add" className="text-sm" />
                      <span>Añadir Hijo</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {students.map((student, idx) => (
                      <div key={idx} className="relative border border-slate-100 p-4 sm:p-6 rounded-2xl bg-white shadow-sm space-y-4 text-left">
                        {students.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStudentField(idx)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                          >
                            <Icon name="delete" />
                          </button>
                        )}
                        
                        <h4 className="font-label font-bold text-xs text-orange-600">Estudiante #{idx + 1}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-600">Nombre Completo</label>
                            <input
                              type="text"
                              placeholder="Ej. Lucas Martínez"
                              value={student.nombre}
                              onChange={(e) => handleStudentChange(idx, 'nombre', e.target.value)}
                              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-xs"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-600">DNI</label>
                            <input
                              type="text"
                              placeholder="Número de DNI"
                              value={student.dni}
                              onChange={(e) => handleStudentChange(idx, 'dni', e.target.value.replace(/\D/g, ''))}
                              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-xs"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-600">Fecha de Nacimiento</label>
                            <input
                              type="date"
                              value={student.fechaNacimiento}
                              onChange={(e) => handleStudentChange(idx, 'fechaNacimiento', e.target.value)}
                              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-xs"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-600">Nivel Educativo</label>
                            <select
                              value={student.nivel}
                              onChange={(e) => handleStudentChange(idx, 'nivel', e.target.value)}
                              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-xs appearance-none"
                              required
                            >
                              <option value="inicial">Nivel Inicial</option>
                              <option value="primaria">Primaria</option>
                              <option value="secundaria">Secundaria</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-600">Género</label>
                            <select
                              value={student.genero || 'Masculino'}
                              onChange={(e) => handleStudentChange(idx, 'genero', e.target.value)}
                              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-xs appearance-none"
                              required
                            >
                              <option value="Masculino">Masculino</option>
                              <option value="Femenino">Femenino</option>
                              <option value="Otro">Otro / No Binario</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-red-500 font-bold bg-red-50 border border-red-100 p-3.5 rounded-xl text-center">{formError}</p>
                )}

                {/* Submit Buttons */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-base rounded-full shadow-lg shadow-orange-600/10 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creando Cuentas y Vinculando...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="person_add" className="mr-2" />
                      <span>Crear Cuentas y Enviar Activación</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateAdminSubmit} className="space-y-8">
                {/* Personal Section */}
                <div className="bg-slate-50/50 p-4 sm:p-6 rounded-2xl border border-slate-200/60 space-y-4 text-left">
                  <h3 className="font-label font-bold text-xs uppercase tracking-widest text-slate-500">Datos del Personal / Administrativo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600">Nombre Completo</label>
                      <input
                        type="text"
                        placeholder="Ej. Juan Pérez"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-sm"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600">DNI del Personal</label>
                      <input
                        type="text"
                        placeholder="Número de DNI"
                        value={adminDni}
                        onChange={(e) => setAdminDni(e.target.value.replace(/\D/g, ''))}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-sm"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600">Correo Electrónico</label>
                      <input
                        type="email"
                        placeholder="juan.perez@ejemplo.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-sm"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600">Rol Institucional</label>
                      <select
                        value={adminRole}
                        onChange={(e) => setAdminRole(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-sm appearance-none"
                        required
                      >
                        <option value="Staff">Docente / Staff</option>
                        <option value="Administrativo">Administrativo</option>
                        <option value="user_admin">Administrador General</option>
                      </select>
                    </div>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-red-500 font-bold bg-red-50 border border-red-100 p-3.5 rounded-xl text-center">{formError}</p>
                )}

                {/* Submit Buttons */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-base rounded-full shadow-lg shadow-orange-600/10 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creando Cuenta...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="person_add" className="mr-2" />
                      <span>Crear Cuenta de Personal</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Success Reusable Modal */}
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
          setActiveTab('dashboard');
        }}
        title={successModalData.title}
        message={successModalData.message}
        buttonText="Excelente"
        iconBg="bg-green-100"
        iconColor="text-green-600"
      />

      {/* Modal de Edición de Datos */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 animate-scale-in text-left">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h3 className="font-headline text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Icon name="edit" className="text-orange-500" />
                <span>
                  Editar {editingUser.type === 'student' ? 'Estudiante' : 
                          editingUser.type === 'parent' ? 'Tutor' : 'Personal'}
                </span>
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              {editingUser.type === 'student' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</label>
                    <input
                      type="text"
                      value={editingUser.fields.nombre || ''}
                      onChange={(e) => handleEditFieldChange('nombre', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">DNI</label>
                    <input
                      type="text"
                      value={editingUser.fields.dni || ''}
                      onChange={(e) => handleEditFieldChange('dni', e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={editingUser.fields.fechaNacimiento || ''}
                      onChange={(e) => handleEditFieldChange('fechaNacimiento', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nivel Educativo</label>
                    <select
                      value={editingUser.fields.nivel || 'inicial'}
                      onChange={(e) => handleEditFieldChange('nivel', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                      required
                    >
                      <option value="inicial">Nivel Inicial</option>
                      <option value="primaria">Primaria</option>
                      <option value="secundaria">Secundaria</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Género</label>
                    <select
                      value={editingUser.fields.genero || 'Masculino'}
                      onChange={(e) => handleEditFieldChange('genero', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                      required
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro / No Binario</option>
                    </select>
                  </div>
                </>
              )}

              {(editingUser.type === 'parent' || editingUser.type === 'administrative') && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</label>
                    <input
                      type="text"
                      value={editingUser.fields.nombre || ''}
                      onChange={(e) => handleEditFieldChange('nombre', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">DNI</label>
                    <input
                      type="text"
                      value={editingUser.fields.dni || ''}
                      onChange={(e) => handleEditFieldChange('dni', e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editingUser.fields.email || ''}
                      onChange={(e) => handleEditFieldChange('email', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  {editingUser.type === 'administrative' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol Institucional</label>
                      <select
                        value={editingUser.fields.role || 'Staff'}
                        onChange={(e) => handleEditFieldChange('role', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                        required
                      >
                        <option value="Staff">Docente / Staff</option>
                        <option value="Administrativo">Administrativo</option>
                        <option value="user_admin">Administrador General</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-full transition-all cursor-pointer border-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-full shadow-lg shadow-orange-600/10 transition-all cursor-pointer border-none"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
