import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SuccessModal from '../components/molecules/SuccessModal';
import '../styles/Registration.css';

const NIVELES = [
  {
    id: 'inicial',
    icon: '😊',
    nombre: 'Nivel Inicial',
    descripcion: 'Para niños de 3 a 5 años. Un entorno lúdico y seguro.',
  },
  {
    id: 'primaria',
    icon: '📋',
    nombre: 'Primaria',
    descripcion: 'De 1º a 6º grado. Bases sólidas para el futuro.',
  },
  {
    id: 'secundaria',
    icon: '🎓',
    nombre: 'Secundaria',
    descripcion: 'Formación integral y preparación universitaria.',
  },
];

const PASOS = ['Nivel', 'Tutor', 'Alumno'];

const Registration = () => {
  const navigate = useNavigate();
  const [pasoActual, setPasoActual] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [datosFormulario, setDatosFormulario] = useState({
    nivel: '',
    nombreTutor: '',
    dniTutor: '',
    correo: '',
    telefono: '',
    nombreAlumno: '',
    fechaNacimiento: '',
    dniAlumno: '',
    observaciones: '',
  });
  const [errores, setErrores] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const siguientePasoRegistracion = () => {
    if (validarPaso()) setPasoActual(pasoActual + 1);
  };

  const handleSubmit = () => {
    if (!validarPaso()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessModal(true);
    }, 1500);
  };

  const pasoAnterior = () => {
    if (pasoActual > 1) setPasoActual(pasoActual - 1);
  };

  const handleChange = (campo, valor) => {
    let nuevoValor = valor;
    
    if (campo === 'dniTutor' || campo === 'dniAlumno') {
      nuevoValor = valor.replace(/\D/g, ''); // Solo números
    }
    if (campo === 'telefono') {
      nuevoValor = valor.replace(/[^0-9+\-\s]/g, ''); // Números, +, guiones y espacios
    }

    setDatosFormulario({ ...datosFormulario, [campo]: nuevoValor });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  const validarPaso = () => {
    const e = {};
    if (pasoActual === 1 && !datosFormulario.nivel)
      e.nivel = 'Selecciona un nivel para continuar.';
    if (pasoActual === 2) {
      if (!datosFormulario.nombreTutor.trim()) {
        e.nombreTutor = 'El campo es obligatorio';
      }
      
      if (!datosFormulario.dniTutor.trim()) {
        e.dniTutor = 'El campo es obligatorio';
      } else if (datosFormulario.dniTutor.length < 7 || datosFormulario.dniTutor.length > 9) {
        e.dniTutor = 'El DNI debe tener entre 7 y 9 números';
      }

      if (!datosFormulario.correo.trim()) {
        e.correo = 'El campo es obligatorio';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosFormulario.correo)) {
        e.correo = 'Ingresa un correo electrónico válido';
      }

      if (!datosFormulario.telefono.trim()) {
        e.telefono = 'El campo es obligatorio';
      } else if (datosFormulario.telefono.replace(/\D/g, '').length < 8) {
        e.telefono = 'Ingresa un número de teléfono válido';
      }
    }
    if (pasoActual === 3) {
      if (!datosFormulario.nombreAlumno.trim()) e.nombreAlumno = 'El campo es obligatorio';
      if (!datosFormulario.fechaNacimiento) {
        e.fechaNacimiento = 'El campo es obligatorio';
      } else {
        const { min, max } = obtenerLimitesFecha();
        const fecha = datosFormulario.fechaNacimiento;
        if (fecha < min || fecha > max)
          e.fechaNacimiento = 'La fecha no corresponde al nivel seleccionado.';
      }
      if (!datosFormulario.dniAlumno.trim()) {
        e.dniAlumno = 'El campo es obligatorio';
      } else if (datosFormulario.dniAlumno.length < 7 || datosFormulario.dniAlumno.length > 9) {
        e.dniAlumno = 'El DNI debe tener entre 7 y 9 números';
      }
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  const obtenerLimitesFecha = () => {
    const hoy = new Date();
    const formato = (d) => d.toISOString().split('T')[0];
    const restar = (anios, meses = 0) => {
      const d = new Date(hoy);
      d.setFullYear(d.getFullYear() - anios);
      d.setMonth(d.getMonth() - meses);
      return d;
    };
    const MARGEN = 6;
    if (datosFormulario.nivel === 'inicial')
      return { min: formato(restar(5, MARGEN)), max: formato(restar(3, -MARGEN)) };
    if (datosFormulario.nivel === 'primaria')
      return { min: formato(restar(12, MARGEN)), max: formato(restar(6, -MARGEN)) };
    if (datosFormulario.nivel === 'secundaria')
      return { min: formato(restar(18, MARGEN)), max: formato(restar(13, -MARGEN)) };
    return { min: '', max: '' };
  };

  return (
    <>
      <Navbar />
      <main className="registro-main">
        <div className="registro-hero">
          <h1 className="registro-titulo">
            Únete a nuestra <span className="registro-titulo-acento">comunidad</span>
          </h1>
          <p className="registro-subtitulo">
            Comienza el proceso de inscripción para el nuevo ciclo lectivo. Un camino de
            descubrimiento, aprendizaje y transformación te espera.
          </p>
        </div>


        <div className="stepper">
          {PASOS.map((paso, index) => {
            const numero = index + 1;
            const activo = numero === pasoActual;
            const completado = numero < pasoActual;
            return (
              <React.Fragment key={paso}>
                <div className={`stepper-paso ${activo ? 'activo' : ''} ${completado ? 'completado' : ''}`}>
                  <div className="stepper-circulo">
                    {completado ? '✓' : numero}
                  </div>
                  <span className="stepper-etiqueta">{paso}</span>
                </div>
                {index < PASOS.length - 1 && (
                  <div className={`stepper-linea ${completado ? 'completada' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>


        <div className="registro-card">


          {pasoActual === 1 && (
            <section className="paso">
              <h2 className="paso-titulo">Paso 1: Selección de Nivel</h2>
              <div className="niveles-grid">
                {NIVELES.map((nivel) => (
                  <button
                    key={nivel.id}
                    type="button"
                    className={`nivel-card ${datosFormulario.nivel === nivel.id ? 'seleccionado' : ''}`}
                    onClick={() => handleChange('nivel', nivel.id)}
                  >
                    <span className="nivel-icon">{nivel.icon}</span>
                    <strong className="nivel-nombre">{nivel.nombre}</strong>
                    <p className="nivel-desc">{nivel.descripcion}</p>
                  </button>
                ))}
              </div>
              {errores.nivel && <p className="form-error">{errores.nivel}</p>}
            </section>
          )}


          {pasoActual === 2 && (
            <section className="paso">
              <h2 className="paso-titulo">Paso 2: Datos del Tutor</h2>
              <div className="form-grid">
                <div className="form-grupo">
                  <label className="form-label">NOMBRE COMPLETO</label>
                  <input
                    className={`form-input ${errores.nombreTutor ? 'form-input--error' : ''}`}
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={datosFormulario.nombreTutor}
                    onChange={(e) => handleChange('nombreTutor', e.target.value)}
                  />
                  {errores.nombreTutor && <p className="form-error">{errores.nombreTutor}</p>}
                </div>
                <div className="form-grupo">
                  <label className="form-label">DNI</label>
                  <input
                    className={`form-input ${errores.dniTutor ? 'form-input--error' : ''}`}
                    type="text"
                    placeholder="Número de documento"
                    value={datosFormulario.dniTutor}
                    onChange={(e) => handleChange('dniTutor', e.target.value)}
                  />
                  {errores.dniTutor && <p className="form-error">{errores.dniTutor}</p>}
                </div>
                <div className="form-grupo">
                  <label className="form-label">CORREO ELECTRÓNICO</label>
                  <input
                    className={`form-input ${errores.correo ? 'form-input--error' : ''}`}
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={datosFormulario.correo}
                    onChange={(e) => handleChange('correo', e.target.value)}
                  />
                  {errores.correo && <p className="form-error">{errores.correo}</p>}
                </div>
                <div className="form-grupo">
                  <label className="form-label">TELÉFONO DE CONTACTO</label>
                  <input
                    className={`form-input ${errores.telefono ? 'form-input--error' : ''}`}
                    type="tel"
                    placeholder="+549 11 2345-6789"
                    value={datosFormulario.telefono}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                  />
                  {errores.telefono && <p className="form-error">{errores.telefono}</p>}
                </div>
              </div>
            </section>
          )}


          {pasoActual === 3 && (
            <section className="paso">
              <h2 className="paso-titulo">Paso 3: Datos del Alumno</h2>
              <div className="form-grid">
                <div className="form-grupo">
                  <label className="form-label">NOMBRE COMPLETO DEL ALUMNO</label>
                  <input
                    className={`form-input ${errores.nombreAlumno ? 'form-input--error' : ''}`}
                    type="text"
                    placeholder="Nombre y apellido"
                    value={datosFormulario.nombreAlumno}
                    onChange={(e) => handleChange('nombreAlumno', e.target.value)}
                  />
                  {errores.nombreAlumno && <p className="form-error">{errores.nombreAlumno}</p>}
                </div>
                <div className="form-grupo">
                  <label className="form-label">DNI DEL ALUMNO</label>
                  <input
                    className={`form-input ${errores.dniAlumno ? 'form-input--error' : ''}`}
                    type="text"
                    placeholder="Número de documento"
                    value={datosFormulario.dniAlumno}
                    onChange={(e) => handleChange('dniAlumno', e.target.value)}
                  />
                  {errores.dniAlumno && <p className="form-error">{errores.dniAlumno}</p>}
                </div>
                <div className="form-grupo form-grupo--full">
                  <label className="form-label">FECHA DE NACIMIENTO</label>
                  <input
                    className={`form-input ${errores.fechaNacimiento ? 'form-input--error' : ''}`}
                    type="date"
                    min={obtenerLimitesFecha().min}
                    max={obtenerLimitesFecha().max}
                    value={datosFormulario.fechaNacimiento}
                    onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                  />
                  {errores.fechaNacimiento && <p className="form-error">{errores.fechaNacimiento}</p>}
                </div>
                <div className="form-grupo form-grupo--full">
                  <label className="form-label">OBSERVACIONES / NECESIDADES ESPECIALES</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Indicá cualquier información relevante..."
                    value={datosFormulario.observaciones}
                    onChange={(e) => handleChange('observaciones', e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}


          <div className="botones-navegacion">
            {pasoActual > 1 && (
              <button type="button" className="btn-anterior" onClick={pasoAnterior}>
                ← Paso Anterior
              </button>
            )}
            {pasoActual < 3 ? (
              <button type="button" className="btn-siguiente" onClick={siguientePasoRegistracion}>
                Siguiente Paso →
              </button>
            ) : (
              <button
                type="button"
                className="btn-finalizar"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Finalizar Inscripción ✓'}
              </button>
            )}
          </div>

        </div>
      </main>
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => navigate('/')}
        title="¡Inscripción Exitosa!"
        message="Hemos recibido tus datos correctamente. Nos pondremos en contacto contigo a la brevedad para continuar con el proceso."
        buttonText="Volver al inicio"
        iconBg="bg-green-100"
        iconColor="text-green-600"
      />
    </>
  );
};

export default Registration;
