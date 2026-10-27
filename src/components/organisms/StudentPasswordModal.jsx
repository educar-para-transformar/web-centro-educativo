import React, { useEffect, useState } from 'react';
import Icon from '../atoms/Icon';
import { useAuth } from '../../context/AuthContext';

/**
 * Modal de cambio de contraseña voluntario para el alumno.
 * Usa cf_changeStudentPassword a través de AuthContext.changePassword.
 */
const StudentPasswordModal = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setIsSubmitting(false);
    setSuccess(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(newPassword);
      setSuccess(true);
    } catch (err) {
      console.error('Error cambiando la contraseña del alumno:', err);
      setError(
        err.message ||
          'No se pudo actualizar la contraseña. Intentá nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-password-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8">
        <div className="flex justify-center mb-5">
          <div
            className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
              success
                ? 'bg-green-100 text-green-600'
                : 'bg-orange-100 text-orange-600'
            }`}
          >
            <Icon
              name={success ? 'check_circle' : 'lock_reset'}
              className="text-3xl"
              filled
            />
          </div>
        </div>

        {success ? (
          <div className="text-center">
            <h2
              id="student-password-title"
              className="font-headline text-2xl font-bold text-slate-800"
            >
              ¡Contraseña actualizada!
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Tu nueva contraseña ya está activa. La vas a necesitar la próxima
              vez que inicies sesión.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-full shadow-md transition-all active:scale-95 cursor-pointer border-none"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-center">
            <h2
              id="student-password-title"
              className="font-headline text-2xl font-bold text-slate-800"
            >
              Cambiar contraseña
            </h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              Elegí una nueva contraseña de al menos 6 caracteres para tu cuenta
              de estudiante.
            </p>

            <div className="space-y-4 text-left">
              <div>
                <label
                  htmlFor="student-new-password"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="student-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
                  >
                    <Icon
                      name={showPassword ? 'visibility' : 'visibility_off'}
                      className="text-lg"
                    />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-confirm-password"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="student-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repetí la nueva contraseña"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-700 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-full border border-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-full shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none"
              >
                {isSubmitting ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudentPasswordModal;
