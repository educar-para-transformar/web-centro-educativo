import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="custom-footer">
      <div className="footer-content">
        <div className="footer-info">
          <h2 className="footer-title">Educar Para Transformar</h2>
          <p className="footer-copyright">
            © 2026 INSTITUTO EDUCAR PARA TRANSFORMAR. RESISTENCIA, CHACO.
          </p>
        </div>
        <div className="footer-links">
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            aria-label="Facebook (abre en una nueva pestaña)"
          >
            FACEBOOK
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            aria-label="Instagram (abre en una nueva pestaña)"
          >
            INSTAGRAM
          </a>
          <a
            href="https://www.whatsapp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            aria-label="WhatsApp (abre en una nueva pestaña)"
          >
            WHATSAPP
          </a>
          <a
            href="https://maps.app.goo.gl/W7UVjMBdcku6eaPm7"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            aria-label="Ubicación en Google Maps (abre en una nueva pestaña)"
          >
            UBICACIÓN
          </a>
          <Link to="/tp4" className="footer-link">
            UNIDAD 4
          </Link>
          <Link to="/privacy" className="footer-link">
            PRIVACIDAD
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
