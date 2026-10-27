import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1'
    : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const studentId = searchParams.get('studentId') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const enlaceInvalido = !token || !studentId;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/cf_confirmStudentPasswordReset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, token, newPassword }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo restablecer la contraseña.');
      }

      setDone(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error restableciendo contraseña:', err);
      setError(err.message || 'Ocurrió un error. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-body">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
              <Icon name="password" className="text-3xl" />
            </div>
            <div>
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-slate-800 tracking-tight">
                Nueva contraseña
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Elegí una contraseña segura para tu cuenta.
              </p>
            </div>
          </div>

          {enlaceInvalido ? (
            <div className="space-y-5">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3 text-red-800">
                <Icon name="error" className="text-xl shrink-0" />
                <p className="text-sm font-medium">
                  El enlace es inválido o está incompleto. Solicitá uno nuevo.
                </p>
              </div>
              <Link
                to="/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full transition-colors no-underline"
              >
                <Icon name="lock_reset" className="text-lg" />
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3 text-green-800">
                <Icon name="check_circle" className="text-xl shrink-0" />
                <div>
                  <p className="font-bold">Contraseña actualizada</p>
                  <p className="text-sm mt-1">
                    Ya podés iniciar sesión con tu nueva contraseña.
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full transition-colors no-underline"
              >
                <Icon name="login" className="text-lg" />
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block font-label text-sm font-medium text-slate-600 mb-2"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                    <Icon name="lock" className="text-xl" />
                  </span>
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    <Icon
                      name={showPassword ? 'visibility' : 'visibility_off'}
                      className="text-xl"
                    />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block font-label text-sm font-medium text-slate-600 mb-2"
                >
                  Repetir contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                    <Icon name="lock" className="text-xl" />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repetí la contraseña"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold rounded-full transition-colors cursor-pointer border-none"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
                <Icon name="check" className="text-lg" />
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
