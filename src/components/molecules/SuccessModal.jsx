import React, { useEffect, useRef } from 'react';
import Icon from '../atoms/Icon';

/**
 * Componente modal de éxito reutilizable.
 *
 * @param {boolean} isOpen - Controla la visibilidad del modal.
 * @param {function} onClose - Función que se ejecuta al presionar el botón de cierre.
 * @param {string} title - Título del modal.
 * @param {string} message - Mensaje descriptivo o cuerpo del modal.
 * @param {string} buttonText - Texto del botón de cierre (por defecto "Entendido").
 * @param {string} iconName - Nombre del icono de Material Symbols (por defecto "check_circle").
 * @param {string} iconBg - Clase de fondo CSS para el círculo del icono (por defecto "bg-green-100").
 * @param {string} iconColor - Clase de color CSS para el icono (por defecto "text-green-600").
 * @param {string} buttonBg - Clase de fondo CSS para el botón (por defecto gradiente verde).
 * @param {string} animateIcon - Clase de animación para el icono (por defecto "animate-bounce").
 */
const SuccessModal = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'Entendido',
  iconName = 'check_circle',
  iconBg = 'bg-green-100',
  iconColor = 'text-green-600',
  buttonBg = 'bg-gradient-to-br from-green-500 to-emerald-600',
  animateIcon = 'animate-bounce',
}) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 max-w-md w-full rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/20 shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
        <div
          className={`w-20 h-20 ${iconBg} rounded-full flex items-center justify-center ${iconColor} scale-100 ${animateIcon}`}
        >
          <Icon
            name={iconName}
            filled={true}
            className="text-4xl flex items-center justify-center"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3
            id="success-modal-title"
            className="font-headline text-2xl font-bold text-slate-800 dark:text-slate-100"
          >
            {title}
          </h3>
          <p className="font-body text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          ref={closeButtonRef}
          className={`${buttonBg} text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-green-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer w-full border-none`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
