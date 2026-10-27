import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Icon from '../atoms/Icon';
import '../../styles/organisms/ChangePasswordModal.css';

const ChangePasswordModal = () => {
  const { user, changePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Mostrar el modal mientras el cambio esté pendiente o mientras se muestra el éxito.
  if (!user || (!user.mustChangePassword && !success)) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      console.error(err);
      setError(err.message || 'Ocurrió un error al cambiar la contraseña. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        
        {/* Header Icon */}
        <div className="modal-icon-container">
          <div className={`modal-icon-circle ${success ? 'success' : 'pending'}`}>
            <Icon name={success ? 'check_circle' : 'lock_reset'} className="text-3xl" />
          </div>
        </div>

        {success ? (
          <div className="modal-content-container">
            <h2 className="modal-title">¡Contraseña Actualizada!</h2>
            <p className="modal-description">
              Tu contraseña ha sido actualizada con éxito. Ya puedes comenzar a utilizar la plataforma con tus nuevas credenciales.
            </p>
            <div className="modal-actions-group">
              <button
                onClick={() => window.location.reload()}
                className="btn-modal-success"
              >
                Comenzar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-header-group">
              <h2 className="modal-title">Actualizar Contraseña</h2>
              <p className="modal-description">
                Has iniciado sesión con tu contraseña temporal (DNI). Por motivos de seguridad, debes establecer una nueva contraseña para continuar.
              </p>
            </div>

            <div className="form-inputs-group">
              <div className="input-field-group">
                <label className="input-label">Nueva Contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>

              <div className="input-field-group">
                <label className="input-label">Confirmar Contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="modal-error-message">
                {error}
              </p>
            )}

            <div className="modal-actions-group">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-modal-primary"
              >
                {isSubmitting ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="btn-modal-secondary"
              >
                Cerrar Sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
