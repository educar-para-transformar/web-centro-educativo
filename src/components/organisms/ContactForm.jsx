import React, { useState } from 'react';
import Icon from '../atoms/Icon';
import '../../styles/Contact.css';

const ContactForm = () => {
  const GOOGLE_SHEETS_URL = import.meta.env.VITE_CONTACT_FORM_SHEETS_URL || '';

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    asunto: 'Inscripciones Ciclo Lectivo',
    mensaje: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    const { id, value } = e.target;
    let nuevoValor = value;

    if (id === 'telefono') {
      nuevoValor = value.replace(/[^0-9+\-\s]/g, '');
    }

    setFormData((prev) => ({
      ...prev,
      [id]: nuevoValor,
    }));
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errores = {};
    if (!formData.nombre.trim()) {
      errores.nombre = 'Ingresá tu nombre completo.';
    }
    if (!formData.email.trim()) {
      errores.email = 'Ingresá tu correo electrónico.';
    }
    if (!formData.mensaje.trim()) {
      errores.mensaje = 'Escribí tu consulta.';
    }
    if (
      formData.telefono.trim() &&
      formData.telefono.replace(/\D/g, '').length < 8
    ) {
      errores.telefono = 'Ingresá al menos 8 dígitos.';
    }

    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      setStatus({
        type: 'error',
        message: 'Revisá los campos marcados antes de enviar.',
      });
      return;
    }

    setFieldErrors({});
    setStatus({ type: '', message: '' });
    setIsSubmitting(true);

    try {
      if (GOOGLE_SHEETS_URL) {
        const params = new URLSearchParams();
        params.append('nombre', formData.nombre);
        params.append('telefono', formData.telefono);
        params.append('email', formData.email);
        params.append('asunto', formData.asunto);
        params.append('mensaje', formData.mensaje);

        await fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setStatus({
        type: 'success',
        message: `¡Gracias ${formData.nombre}! Recibimos tu consulta sobre "${formData.asunto}". Nos comunicaremos a la brevedad.`,
      });
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        asunto: 'Inscripciones Ciclo Lectivo',
        mensaje: '',
      });
    } catch (error) {
      console.error('Error:', error);
      setStatus({
        type: 'error',
        message: 'No pudimos enviar tu mensaje. Intentá de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-form-card">
      <div className="contact-form-bg-decorator" />
      <h2 className="contact-form-title">Envíanos un mensaje</h2>
      <p className="contact-form-subtitle">
        Completa el formulario y nos pondremos en contacto contigo a la
        brevedad.
      </p>

      <div aria-live="polite" aria-atomic="true">
        {status.message && (
          <p
            role={status.type === 'error' ? 'alert' : 'status'}
            className={`contact-form-status ${
              status.type === 'error' ? 'error' : 'success'
            }`}
          >
            {status.message}
          </p>
        )}
      </div>

      <form className="contact-form-element" onSubmit={handleSubmit} noValidate>
        <div className="contact-form-row">
          <div className="contact-form-group">
            <label className="contact-form-label" htmlFor="nombre">
              Nombre Completo <span className="required-star">*</span>
            </label>
            <input
              type="text"
              id="nombre"
              className={`contact-form-input ${
                fieldErrors.nombre ? 'contact-form-input--error' : ''
              }`}
              placeholder="Ej. Ana García"
              value={formData.nombre}
              onChange={handleChange}
              autoComplete="name"
              required
              aria-invalid={Boolean(fieldErrors.nombre)}
              aria-describedby={fieldErrors.nombre ? 'nombre-error' : undefined}
            />
            {fieldErrors.nombre && (
              <p id="nombre-error" className="contact-form-error" role="alert">
                {fieldErrors.nombre}
              </p>
            )}
          </div>

          <div className="contact-form-group">
            <label className="contact-form-label" htmlFor="telefono">
              Teléfono / WhatsApp
            </label>
            <input
              type="tel"
              id="telefono"
              className={`contact-form-input ${
                fieldErrors.telefono ? 'contact-form-input--error' : ''
              }`}
              placeholder="+54 362..."
              value={formData.telefono}
              onChange={handleChange}
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.telefono)}
              aria-describedby={
                fieldErrors.telefono ? 'telefono-error' : undefined
              }
            />
            {fieldErrors.telefono && (
              <p
                id="telefono-error"
                className="contact-form-error"
                role="alert"
              >
                {fieldErrors.telefono}
              </p>
            )}
          </div>
        </div>

        <div className="contact-form-group">
          <label className="contact-form-label" htmlFor="email">
            Correo Electrónico <span className="required-star">*</span>
          </label>
          <input
            type="email"
            id="email"
            className={`contact-form-input ${
              fieldErrors.email ? 'contact-form-input--error' : ''
            }`}
            placeholder="ana@ejemplo.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
          {fieldErrors.email && (
            <p id="email-error" className="contact-form-error" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="contact-form-group">
          <label className="contact-form-label" htmlFor="asunto">
            Motivo de la consulta
          </label>
          <div className="contact-select-wrapper">
            <select
              id="asunto"
              className="contact-form-select"
              value={formData.asunto}
              onChange={handleChange}
            >
              <option value="Inscripciones Ciclo Lectivo">
                Inscripciones Ciclo Lectivo
              </option>
              <option value="Información General">Información General</option>
              <option value="Trabaja con nosotros">Trabaja con nosotros</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="contact-form-group">
          <label className="contact-form-label" htmlFor="mensaje">
            Mensaje <span className="required-star">*</span>
          </label>
          <textarea
            id="mensaje"
            className={`contact-form-textarea ${
              fieldErrors.mensaje ? 'contact-form-input--error' : ''
            }`}
            placeholder="Escribe tu consulta aquí..."
            rows="4"
            value={formData.mensaje}
            onChange={handleChange}
            required
            aria-invalid={Boolean(fieldErrors.mensaje)}
            aria-describedby={fieldErrors.mensaje ? 'mensaje-error' : undefined}
          ></textarea>
          {fieldErrors.mensaje && (
            <p id="mensaje-error" className="contact-form-error" role="alert">
              {fieldErrors.mensaje}
            </p>
          )}
        </div>

        <div className="contact-form-actions">
          <button
            type="submit"
            className="contact-btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Enviando...</span>
            ) : (
              <>
                <span>Enviar Mensaje</span>
                <Icon name="send" className="text-xl" />
              </>
            )}
          </button>

          <a
            href="https://wa.me/543624123456"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-btn-whatsapp"
          >
            <Icon name="forum" className="text-xl" />
            <span>WhatsApp Directo</span>
          </a>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
