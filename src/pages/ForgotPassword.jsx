import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import { auth } from '../services/firebase';

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1'
    : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [emailPadre, setEmailPadre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const esCorreo = identifier.includes('@');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const identificador = identifier.trim();
    if (!identificador) {
      setError('Ingresá tu ID institucional, DNI o correo.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (esCorreo) {
        await sendPasswordResetEmail(auth, identificador);
        setMessage(
          'Te enviamos un correo con las instrucciones para restablecer tu contraseña.'
        );
      } else {
        if (!emailPadre.trim()) {
          setError('Ingresá el correo electrónico del tutor.');
          return;
        }

        const response = await fetch(
          `${FUNCTIONS_BASE_URL}/cf_requestStudentPasswordReset`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: identificador,
              emailPadre: emailPadre.trim(),
            }),
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            data.error || 'No se pudo solicitar la recuperación de contraseña.'
          );
        }

        setMessage(
          data.message ||
            'Si los datos coinciden con un alumno registrado, enviaremos un enlace al correo del tutor.'
        );
      }
    } catch (err) {
      console.error('Error solicitando recuperación de contraseña:', err);
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
              <Icon name="lock_reset" className="text-3xl" />
            </div>
            <div>
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-slate-800 tracking-tight">
                Recuperar contraseña
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Alumnos: el enlace se envía al correo del tutor.
              </p>
            </div>
          </div>

          {message ? (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3 text-green-800">
                <Icon name="mark_email_read" className="text-xl shrink-0" />
                <p className="text-sm font-medium">{message}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full transition-colors cursor-pointer border-none"
              >
                <Icon name="arrow_back" className="text-lg" />
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="identifier"
                  className="block font-label text-sm font-medium text-slate-600 mb-2"
                >
                  ID institucional, DNI o correo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                    <Icon name="badge" className="text-xl" />
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="EST-2026-88123, DNI o correo@ejemplo.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {!esCorreo && (
                <div>
                  <label
                    htmlFor="emailPadre"
                    className="block font-label text-sm font-medium text-slate-600 mb-2"
                  >
                    Correo del tutor
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <Icon name="mail" className="text-xl" />
                    </span>
                    <input
                      id="emailPadre"
                      type="email"
                      required
                      value={emailPadre}
                      onChange={(event) => setEmailPadre(event.target.value)}
                      placeholder="tutor@ejemplo.com"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Por seguridad, el enlace de recuperación se envía al correo
                    registrado del tutor.
                  </p>
                </div>
              )}

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
                {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
                <Icon name="send" className="text-lg" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors cursor-pointer bg-transparent border-none"
              >
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
