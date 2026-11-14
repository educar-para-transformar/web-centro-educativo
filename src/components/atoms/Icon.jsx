import React from 'react';

/**
 * Componente Icono para Material Symbols Outlined
 * @param {string} name - Nombre del icono (ej. 'psychology', 'medical_services')
 * @param {boolean} filled - Define si el icono debe estar relleno
 * @param {string} className - Clases de CSS adicionales
 * @param {object} style - Estilos en línea adicionales
 */
const Icon = ({ name, filled = false, className = '', style = {} }) => {
  const iconStyle = {
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
    ...style,
  };

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={iconStyle}
      aria-hidden="true"
      focusable="false"
    >
      {name}
    </span>
  );
};

export default Icon;
