import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../services/imagesConfig';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const ROLES_INFO = {
  Administrador: {
    label: 'Administrador',
    icon: 'admin_panel_settings',
    displayLabel: 'ADMINISTRADOR',
    permissions: ['gestionar_usuarios', 'ver_auditorias', 'configurar_sistema'],
  },
  Staff: {
    label: 'Staff',
    icon: 'badge',
    displayLabel: 'STAFF (DOCENTE)',
    permissions: [
      'cargar_asistencias',
      'registrar_notas',
      'publicar_anuncios_aula',
      'ver_agenda_clases',
    ],
  },
  'Padre/Tutor': {
    label: 'Padre/Tutor',
    icon: 'family_restroom',
    displayLabel: 'PADRE/TUTOR',
    permissions: [
      'ver_legajo_hijo',
      'autorizar_eventos',
      'ver_estado_cuotas',
      'comunicarse_con_docente',
    ],
  },
  Estudiante: {
    label: 'Estudiante',
    icon: 'school',
    displayLabel: 'ESTUDIANTE',
    permissions: [
      'ver_mis_notas',
      'ver_mis_asistencias',
      'descargar_material',
      'ver_horarios',
    ],
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { user, login, logout, isLoggedIn } = useAuth();

  const [selectedRole, setSelectedRole] = useState('Estudiante');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef(null);

  // Redirigir únicamente a los administradores de usuarios automáticamente
  useEffect(() => {
    if (isLoggedIn && user) {
      if (user.role === 'user_admin') {
        navigate('/admin');
      }
    }
  }, [isLoggedIn, user, navigate]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');
    try {
      await login(identifier, password, selectedRole);
    } catch (err) {
      handleErrors(err.code)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleErrors = (errorCOde) => {
    switch (errorCOde) {
      case 'auth/invalid-credential':
          setLoginError('Credenciales inválidas. Verifica tu ID o correo.');
          break;
      default:
          setLoginError(
            err.code || 'Error al iniciar sesión. Revisa tus credenciales.'
          );
    }
  }

  const handleLogout = () => {
    logout();
    setIdentifier('');
    setPassword('');
  };

  // Logged-in screen (Simulated Firebase Auth View)
  if (isLoggedIn && user) {
    // Determine the role for the logged-in user (mapping claims to ROLES_INFO)
    let activeRoleKey = 'Estudiante';
    switch (user.role) {
      case 'user_admin':
        activeRoleKey = 'Administrador';
        break;
      case user.role === 'Administrativo':
      case user.role === 'Staff':
        activeRoleKey = 'Staff';
        break;
      case user.role === 'Padre':
      case user.role === 'Padre/Tutor':
        activeRoleKey = 'Padre/Tutor';
        break;
      default:
        activeRoleKey = 'Estudiante';
        break;
    }
    const currentRole = ROLES_INFO[activeRoleKey];

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-body">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-16">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-[0px_20px_40px_rgba(35,44,81,0.06)] border border-slate-100 p-8 sm:p-12 text-center transition-all duration-300 hover:shadow-[0px_25px_50px_rgba(35,44,81,0.1)]">
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 animate-bounce">
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {currentRole?.icon || 'verified_user'}
                </span>
              </div>
            </div>

            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-800 tracking-tight mb-4">
              HOLA {currentRole?.displayLabel || user.role.toUpperCase()},
              TIENES ESTOS PERMISOS:
            </h1>

            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 sm:p-8 my-6 text-left max-w-md mx-auto">
              <ul className="space-y-4">
                {currentRole?.permissions.map((permission, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 text-slate-700 text-base font-medium"
                  >
                    <span
                      className="material-symbols-outlined text-orange-600 font-bold bg-orange-100 rounded-full p-1 text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                    {permission}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleLogout}
              className="mt-4 px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-label rounded-full transition-all duration-200 border border-slate-200 hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Login Form Screen (based on design mock)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-body flex items-center justify-center p-4 sm:p-8">
      {/* Main Container */}
      <main className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch bg-white rounded-xl shadow-[0px_20px_40px_rgba(35,44,81,0.06)] overflow-hidden">
        {/* Left Side: Visual/Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-orange-500 to-amber-400 p-12 flex-col justify-between overflow-hidden">
          {/* Glassmorphism overlay for subtle texture */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm z-0"></div>
          {/* Abstract decorative elements */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-lime-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0"></div>

          <div className="relative z-10">
            <div className="mb-8">
              <img
                loading="lazy"
                alt="Logo Educar para Transformar"
                className="h-20 w-auto object-contain bg-white rounded-xl p-2 shadow-lg"
                src={images.logo}
                onError={(e) => {
                  e.target.src =
                    'https://lh3.googleusercontent.com/aida/ADBb0ugJ1I9qKGq-LA1zkyP0mAJ6KMVoto-k2Bhko7jS4BgxauPND3UeAT0onvR1k3ArEIe80EYEIMFR8Bwmy9Wq6vif1Hl7DAh1-BrEutL_eg8cYRnUjvE5tspD46XGp7iF9rIOZa8T-GNoMMlJIBDJIzgLlyIj-mRW9JHn4QnEsHs-VN4XmpP7DLXTLi0_GmkFUlL2utzr7RRQS131G6KzO_u524R8pUernkXd1WN1UmvTuth2AT7diNd-5Yg';
                }}
              />
            </div>
            <h1 className="font-headline font-extrabold text-5xl leading-tight tracking-tight text-white mb-6">
              Bienvenido a<br />
              Educar para
              <br />
              Transformar.
            </h1>
            <p className="font-body text-lg text-white/90 max-w-md">
              Transformando la interfaz educativa tradicional en una experiencia
              digital de nivel editorial para estudiantes, padres y profesores.
            </p>
          </div>

          <div className="relative z-10 mt-auto bg-white/20 backdrop-blur-md rounded-xl p-6 border border-white/30 shadow-sm">
            <div className="flex items-center gap-4">
              <span
                className="material-symbols-outlined text-lime-300"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lightbulb
              </span>
              <p className="font-body text-sm font-medium text-white">
                "La educación es el arma más poderosa que puedes usar para
                cambiar el mundo."
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Panel */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 xl:p-16 flex flex-col justify-center bg-white relative">
          {/* Volver (Go Back) Button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors duration-200 focus:outline-none font-label text-sm font-semibold group cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg transition-transform duration-200 group-hover:-translate-x-1">
              arrow_back
            </span>
            Volver
          </button>

          <div className="max-w-md w-full mx-auto">
            {/* Mobile Logo (visible only on small screens) */}
            <div className="lg:hidden mb-10 text-center flex flex-col items-center mt-6">
              <img
                loading="lazy"
                alt="Logo Educar para Transformar"
                className="h-16 w-auto object-contain mb-4 bg-white rounded-xl p-2 shadow-md"
                src={images.logo}
                onError={(e) => {
                  e.target.src =
                    'https://lh3.googleusercontent.com/aida/ADBb0ugJ1I9qKGq-LA1zkyP0mAJ6KMVoto-k2Bhko7jS4BgxauPND3UeAT0onvR1k3ArEIe80EYEIMFR8Bwmy9Wq6vif1Hl7DAh1-BrEutL_eg8cYRnUjvE5tspD46XGp7iF9rIOZa8T-GNoMMlJIBDJIzgLlyIj-mRW9JHn4QnEsHs-VN4XmpP7DLXTLi0_GmkFUlL2utzr7RRQS131G6KzO_u524R8pUernkXd1WN1UmvTuth2AT7diNd-5Yg';
                }}
              />
              <h2 className="font-headline font-bold text-3xl text-slate-800 tracking-tight">
                Portal de Acceso
              </h2>
            </div>

            <div className="hidden lg:block mb-10">
              <h2 className="font-headline font-bold text-4xl text-slate-800 tracking-tight mb-2">
                Portal de Acceso
              </h2>
              <p className="font-body text-slate-500">
                Inicia sesión para continuar tu viaje.
              </p>
            </div>

            {/* Role Selection Premium Custom Dropdown with Badges */}
            <div className="mb-8" ref={dropdownRef}>
              <label className="block font-label text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">
                Selecciona tu Rol
              </label>
              <div className="relative">
                {/* Dropdown Trigger Button (Styled as a Badge) */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl hover:bg-slate-100/50 focus:border-orange-500 focus:bg-white focus:outline-none transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-orange-600 bg-orange-100 rounded-lg p-1.5 text-xl flex items-center justify-center"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {ROLES_INFO[selectedRole]?.icon}
                    </span>
                    <span className="font-label text-sm font-bold text-slate-700">
                      {ROLES_INFO[selectedRole]?.label}
                    </span>
                  </div>
                  <span
                    className="material-symbols-outlined text-slate-400 transition-transform duration-200"
                    style={{
                      transform: isDropdownOpen
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                    }}
                  >
                    expand_more
                  </span>
                </button>

                {/* Dropdown Menu featuring Badge-like Options */}
                {isDropdownOpen && (
                  <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-[0px_10px_25px_rgba(0,0,0,0.08)] p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    {Object.keys(ROLES_INFO).map((roleKey) => {
                      const role = ROLES_INFO[roleKey];
                      const isSelected = selectedRole === roleKey;
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => {
                            setSelectedRole(roleKey);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all duration-150 cursor-pointer text-left ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 text-orange-600 font-bold'
                              : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`material-symbols-outlined rounded-lg p-1 text-lg flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'text-orange-600 bg-orange-100'
                                  : 'text-slate-400 bg-slate-100'
                              }`}
                              style={{
                                fontVariationSettings: isSelected
                                  ? "'FILL' 1"
                                  : "'FILL' 0",
                              }}
                            >
                              {role.icon}
                            </span>
                            <span className="font-label text-sm font-semibold">
                              {role.label}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-orange-600 text-lg font-bold">
                              check
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              {/* ID / Email Field */}
              <div>
                <label
                  className="block font-label text-sm font-medium text-slate-600 mb-2"
                  htmlFor="identifier"
                >
                  ID Institucional o Correo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400">
                      badge
                    </span>
                  </div>
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 text-slate-800 placeholder-slate-400 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-0 transition-colors font-body text-base"
                    id="identifier"
                    name="identifier"
                    placeholder="ej. 2023-EST-001"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="block font-label text-sm font-medium text-slate-600"
                    htmlFor="password"
                  >
                    Contraseña
                  </label>
                  <a
                    className="font-label text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                    href="#"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400">
                      lock
                    </span>
                  </div>
                  <input
                    className="w-full pl-12 pr-12 py-3 bg-slate-50 text-slate-800 placeholder-slate-400 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-0 transition-colors font-body text-base"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <button
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  className="h-5 w-5 rounded-md bg-slate-50 border-slate-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  className="ml-3 block font-body text-sm text-slate-600 cursor-pointer select-none"
                  htmlFor="remember-me"
                >
                  Mantener sesión iniciada
                </label>
              </div>

              {/* Submit Button */}
              <button
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-full shadow-md text-base font-bold font-label text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 transition-all active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verificando...' : 'Acceso Seguro'}
                <span className="material-symbols-outlined ml-2">
                  arrow_forward
                </span>
              </button>
              {loginError && (
                <p
                  test-dataid="login-error-text"
                  className="text-red-500 text-sm font-bold text-center mt-4 bg-red-50 p-2.5 rounded-xl border border-red-200"
                >
                  {loginError}
                </p>
              )}
            </form>

            {/* Help Link */}
            <div className="mt-8 text-center">
              <p className="font-body text-sm text-slate-500">
                ¿Necesitas ayuda para acceder a tu cuenta?{' '}
                <br className="sm:hidden" />
                <a
                  className="font-medium text-orange-600 hover:text-orange-700 transition-colors"
                  href="#"
                >
                  Contactar Soporte
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
