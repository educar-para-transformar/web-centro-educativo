import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import Button from './Button';
import { images } from '../services/imagesConfig';
import { useAuth } from '../context/AuthContext';

/**
 * Main Navbar component that renders the navigation bar, including the logo,
 * desktop navigation links, user authentication controls/dropdown, and a responsive
 * mobile drawer menu.
 */
const Navbar = ({ noButtons = false }) => {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn } = useAuth();
  const displayName =
    user?.nombre ||
    user?.name ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Usuario';
  const isAdmin = isLoggedIn && user?.role === 'user_admin';
  const isStudent = isLoggedIn && user?.role === 'Estudiante';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Disable body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="custom-navbar">
      <div className="navbar-content">
        <Link
          to="/"
          className="navbar-logo"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <img
            src={images.logo}
            alt="Logo Educar para Transformar"
            className="navbar-logo-icon"
            onError={(e) => (e.target.style.display = 'none')}
          />
          <span className="logo-text">Educar para Transformar</span>
        </Link>
        {!noButtons && <DesktopLinks />}
        <div className="navbar-actions">
          {isLoggedIn && user ? (
            <UserMenu
              logout={logout}
              displayName={displayName}
              navigate={navigate}
              isAdmin={isAdmin}
              isStudent={isStudent}
            />
          ) : (
            <Button variant="primary" onClick={() => navigate('/login')}>
              Acceso Usuario
            </Button>
          )}
        </div>

        {/* Hamburger Menu Button (Mobile) */}
        {!noButtons && (
          <button
            type="button"
            className="navbar-hamburger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menú principal"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        )}

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && !noButtons && (
          <div
            className="mobile-menu-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Menu Drawer */}
        {!noButtons && (
          <MobileDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            isLoggedIn={isLoggedIn}
            user={user}
            displayName={displayName}
            logout={logout}
            navigate={navigate}
            isAdmin={isAdmin}
            isStudent={isStudent}
          />
        )}
      </div>
    </nav>
  );
};

/**
 * Subcomponent to render desktop navigation links.
 */
const DesktopLinks = () => {
  return (
    <div className="navbar-links">
      <NavLink
        to="/"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Inicio
      </NavLink>
      <NavLink
        to="/wellness"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Bienestar
      </NavLink>
      <NavLink
        to="/news"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Noticias
      </NavLink>
      <NavLink
        to="/gallery"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Galería
      </NavLink>
      <NavLink
        to="/contact"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Contacto
      </NavLink>
      <NavLink
        to="/register"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Inscripciones
      </NavLink>
      <NavLink
        to="/employment-request"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Empleo
      </NavLink>
    </div>
  );
};

/**
 * Subcomponent to render the user profile navigation dropdown menu on desktop.
 */
const UserMenu = ({ logout, displayName, navigate, isAdmin, isStudent }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={userMenuRef}>
      <button
        type="button"
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex pl-3 pr-3 items-center gap-2.5 px-4.5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-label font-bold text-sm shadow-md hover:from-orange-600 hover:to-amber-600 transition-all duration-200 cursor-pointer focus:outline-none"
        data-testid="user-menu-button"
      >
        <span
          className="material-symbols-outlined text-lg flex items-center justify-center"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          account_circle
        </span>
        <span>Hola, {displayName}</span>
        <span
          className="material-symbols-outlined text-sm flex items-center justify-center transition-transform duration-200"
          style={{
            transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </button>

      {isUserMenuOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-s shadow-[0px_10px_25px_rgba(0,0,0,0.08)] py-2 space-y-1 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
          <button
            type="button"
            onClick={() => {
              alert('Esta sección de perfil aún no está disponible.');
              setIsUserMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold cursor-pointer text-left focus:outline-none"
          >
            <span className="material-symbols-outlined text-slate-400 text-lg">
              person
            </span>
            Ver Perfil
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                navigate('/admin');
                setIsUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold cursor-pointer text-left focus:outline-none"
            >
              <span className="material-symbols-outlined text-slate-400 text-lg">
                person
              </span>
              Panel de usuarios
            </button>
          )}
          {isStudent && (
            <button
              type="button"
              onClick={() => {
                navigate('/panel-alumno');
                setIsUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold cursor-pointer text-left focus:outline-none"
            >
              <span className="material-symbols-outlined text-slate-400 text-lg">
                school
              </span>
              Mi boletín
            </button>
          )}
          <div className="border-t border-slate-100 my-1"></div>
          <button
            type="button"
            onClick={() => {
              logout();
              setIsUserMenuOpen(false);
              navigate('/');
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold cursor-pointer text-left focus:outline-none"
          >
            <span className="material-symbols-outlined text-red-400 text-lg">
              logout
            </span>
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Subcomponent to render the slide-out mobile menu drawer.
 */
const MobileDrawer = ({
  isOpen,
  onClose,
  isLoggedIn,
  user,
  displayName,
  logout,
  navigate,
  isAdmin,
  isStudent
}) => {
  return (
    <div className={`navbar-mobile-drawer ${isOpen ? 'open' : ''}`}>
      <div className="mobile-drawer-header">
        <Link
          to="/"
          className="navbar-logo"
          onClick={onClose}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <img
            src={images.logo}
            alt="Logo Educar para Transformar"
            className="navbar-logo-icon"
            onError={(e) => (e.target.style.display = 'none')}
          />
          <span className="logo-text">Educar para Transformar</span>
        </Link>
        <button
          type="button"
          className="mobile-drawer-close"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="mobile-drawer-links">
        <NavLink
          to="/"
          onClick={onClose}
          className={({ isActive }) =>
            isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          <span className="material-symbols-outlined">home</span>
          Inicio
        </NavLink>
        <NavLink
          to="/wellness"
          onClick={onClose}
          className={({ isActive }) =>
            isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          <span className="material-symbols-outlined">mindfulness</span>
          Bienestar
        </NavLink>
        <NavLink
          to="/news"
          onClick={onClose}
          className={({ isActive }) =>
            isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          <span className="material-symbols-outlined">newspaper</span>
          Noticias
        </NavLink>
        <NavLink
          to="/gallery"
          onClick={onClose}
          className={({ isActive }) =>
            isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          <span className="material-symbols-outlined">photo_library</span>
          Galería
        </NavLink>
        <NavLink
          to="/contact"
          onClick={onClose}
          className={({ isActive }) =>
            isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          <span className="material-symbols-outlined">mail</span>
          Contacto
        </NavLink>
        <NavLink
          to="/register"
          onClick={onClose}
          className={({ isActive }) =>
            isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          <span className="material-symbols-outlined">how_to_reg</span>
          Inscripciones
        </NavLink>
        <NavLink
          to="/employment-request"
          onClick={onClose}
          className={({ isActive }) =>
            isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          <span className="material-symbols-outlined">work</span>
          Empleo
        </NavLink>
      </div>

      <div className="mobile-drawer-actions">
        {isLoggedIn && user ? (
          <div className="mobile-user-info">
            <div className="mobile-user-profile">
              <span className="material-symbols-outlined">
                account_circle
              </span>
              <div className="mobile-user-details">
                <span className="mobile-user-welcome">Hola,</span>
                <span className="mobile-user-name">{displayName}</span>
              </div>
            </div>
            <div className="mobile-user-buttons">
              <button
                type="button"
                onClick={() => {
                  alert('Esta sección de perfil aún no está disponible.');
                  onClose();
                }}
                className="mobile-action-btn profile-btn"
              >
                <span className="material-symbols-outlined text-lg">person</span>
                Ver Perfil
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/admin');
                    onClose();
                  }}
                  className="mobile-action-btn profile-btn"
                >
                  <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                  Panel de usuarios
                </button>
              )}
              {isStudent && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/panel-alumno');
                    onClose();
                  }}
                  className="mobile-action-btn profile-btn"
                >
                  <span className="material-symbols-outlined text-lg">school</span>
                  Mi boletín
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                  navigate('/');
                }}
                className="mobile-action-btn logout-btn"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              navigate('/login');
            }}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Acceso Usuario
          </Button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
