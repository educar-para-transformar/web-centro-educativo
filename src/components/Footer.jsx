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
          <Link
            to="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            FACEBOOK
          </Link>
          <Link
            to="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            INSTAGRAM
          </Link>
          <Link
            to="https://www.whatsapp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            WHATSAPP
          </Link>
          <Link
            to="https://maps.app.goo.gl/W7UVjMBdcku6eaPm7"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            UBICACIÓN
          </Link>
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
