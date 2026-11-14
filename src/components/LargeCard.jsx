import React from 'react';
import '../styles/LargeCard.css';

const LargeCard = ({ image, title, subtitle, label, buttonText, onClick }) => {
  const handleKeyDown = (event) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="large-card"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {image && (
        <img
          loading="lazy"
          alt={title}
          className="large-card-image"
          src={image}
        />
      )}
      <div className="large-card-overlay"></div>

      <div className="large-card-content">
        {label && <span className="large-card-label">{label}</span>}
        {title && <h2 className="large-card-title">{title}</h2>}
        {subtitle && <p className="large-card-subtitle">{subtitle}</p>}

        {buttonText && (
          <button
            type="button"
            className="large-card-button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
          >
            {buttonText}{' '}
            <span className="material-symbols-outlined icon">→</span>
          </button>
        )}
      </div>
    </article>
  );
};

export default LargeCard;
