import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import SuccessModal from '../components/molecules/SuccessModal';
import GalleryHero from '../components/organisms/GalleryHero';
import GalleryGrid from '../components/organisms/GalleryGrid';
import useFormState from '../hooks/useFormState';
import { images } from '../services/imagesConfig';

// Carousel Image Data
const carouselImages = [
  { url: images.pool, title: 'Complejo Acuático', description: 'Pileta olímpica techada y climatizada para natación libre y curricular.' },
  { url: images.stadium, title: 'Canchas Profesionales', description: 'Canchas de fútbol de césped sintético profesional.' },
  { url: images.lab, title: 'Laboratorio Maker', description: 'Espacio de experimentación y diseño de proyectos innovadores.' },
  { url: images.lectura, title: 'Biblioteca y Zona de Lectura', description: 'Áreas verdes equipadas para incentivar la lectura al aire libre.' },
  { url: images.basket, title: 'Microestadio de Básquet', description: 'Cancha cubierta reglamentaria para entrenamiento y torneos.' },
  { url: images.escuela, title: 'Edificio Principal', description: 'Acceso principal al campus educativo en Resistencia, Chaco.' },
  { url: images.nivelInicial, title: 'Aulas de Nivel Inicial', description: 'Salones adaptados con estimulación temprana y seguridad.' },
  { url: images.primaria, title: 'Aulas de Primaria', description: 'Espacios dinámicos equipados con pantallas táctiles e internet.' },
  { url: images.robotica, title: 'Taller de Robótica e Impresión 3D', description: 'Equipamiento de robótica y tecnología para proyectos makers.' },
  { url: images.secundaria, title: 'Aulas de Secundaria', description: 'Mobiliario flexible para el trabajo colaborativo en equipo.' },
];

const Gallery = () => {
  // Modal state for booking a visit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    setIsSubmitting,
    submitSuccess,
    setSubmitSuccess,
    handleInputChange,
  } = useFormState({
    name: '',
    email: '',
    date: '',
    level: '',
  });

  // Carousel Lightbox State
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);



  const handleNext = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
  }, []);

  const handlePrev = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isCarouselOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        setIsCarouselOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCarouselOpen, handleNext, handlePrev]);

  // Touch handlers for mobile swiping
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      handleNext();
    }
    if (touchStart - touchEnd < -75) {
      handlePrev();
    }
  };

  const handleOpenCarousel = (index) => {
    setCarouselIndex(index);
    setIsCarouselOpen(true);
  };

  // Submit visit booking
  const handleBookingSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre completo es requerido.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Introduce un correo válido.';
    }
    if (!formData.date) {
      newErrors.date = 'Debes seleccionar una fecha para la visita.';
    }
    if (!formData.level) {
      newErrors.level = 'Selecciona el nivel educativo de interés.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // Simulate scheduling delay with loader
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', date: '', level: '' });
    }, 1500);
  };

  const handleCloseSuccess = () => {
    setSubmitSuccess(false);
    setIsModalOpen(false);
  };

  return (
    <div className="relative min-h-screen bg-surface text-on-surface">
      <Navbar />
      
      {/* Main Content */}
      <main className="pt-10 pb-24 px-6 max-w-7xl mx-auto">
        {/* Gallery Hero Component (Organism) */}
        <GalleryHero />

        {/* Gallery Grid Component (Organism) */}
        <GalleryGrid 
          onVisitClick={() => setIsModalOpen(true)} 
          onImageClick={handleOpenCarousel}
        />
      </main>

      {/* 1. Modal de Reserva de Visita (Glassmorphism booking overlay) */}
      {isModalOpen && !submitSuccess && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 max-w-md w-full rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl relative text-left animate-in zoom-in-95 duration-300">
            
            {/* Botón cerrar */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer"
            >
              <Icon name="close" className="text-xl" />
            </button>

            <div className="mb-6 flex flex-col gap-2">
              <h3 className="font-headline text-2xl font-bold text-slate-800 dark:text-slate-100">Agendar Visita</h3>
              <p className="font-body text-sm text-slate-500 dark:text-slate-400">
                Completa tus datos y selecciona la fecha para tu visita guiada al campus de Resistencia.
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Nombre Completo</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full bg-surface-container focus:bg-surface-container-lowest border border-transparent ${errors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary/30'} rounded-xl px-4 py-3 font-body text-on-surface text-sm transition-all outline-none`} 
                  placeholder="Ej. Carlos Mendoza"
                />
                {errors.name && <span className="text-xs text-red-500 font-semibold">{errors.name}</span>}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Correo de Contacto</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full bg-surface-container focus:bg-surface-container-lowest border border-transparent ${errors.email ? 'border-red-500 focus:border-red-500' : 'focus:border-primary/30'} rounded-xl px-4 py-3 font-body text-on-surface text-sm transition-all outline-none`} 
                  placeholder="carlos@ejemplo.com"
                />
                {errors.email && <span className="text-xs text-red-500 font-semibold">{errors.email}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fecha */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Fecha</label>
                  <input 
                    type="date" 
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={`w-full bg-surface-container focus:bg-surface-container-lowest border border-transparent ${errors.date ? 'border-red-500 focus:border-red-500' : 'focus:border-primary/30'} rounded-xl px-4 py-3 font-body text-on-surface text-sm transition-all outline-none`} 
                  />
                  {errors.date && <span className="text-xs text-red-500 font-semibold">{errors.date}</span>}
                </div>

                {/* Nivel */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Nivel</label>
                  <select 
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className={`w-full bg-surface-container focus:bg-surface-container-lowest border border-transparent ${errors.level ? 'border-red-500 focus:border-red-500' : 'focus:border-primary/30'} rounded-xl px-4 py-3 font-body text-on-surface text-sm transition-all outline-none`} 
                  >
                    <option value="">Nivel...</option>
                    <option value="inicial">Inicial</option>
                    <option value="primario">Primario</option>
                    <option value="secundario">Secundario</option>
                  </select>
                  {errors.level && <span className="text-xs text-red-500 font-semibold">{errors.level}</span>}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-4 bg-gradient-to-br from-secondary to-secondary-dim text-white py-4 rounded-full font-bold text-base hover:shadow-xl hover:shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Agendando...</span>
                  </>
                ) : (
                  <>
                    <Icon name="event" className="text-lg" />
                    <span>Confirmar Visita</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal de Éxito al Agendar */}
      <SuccessModal 
        isOpen={submitSuccess}
        onClose={handleCloseSuccess}
        title="¡Visita Agendada!"
        message="Hemos registrado tu reserva para la visita guiada con éxito. Te hemos enviado un correo de confirmación con los horarios y los detalles de acceso al campus."
        buttonText="Excelente"
        iconBg="bg-green-100"
        iconColor="text-green-600"
      />

      {/* 3. Modal de Carrusel / Lightbox (Premium visual overlay) */}
      {isCarouselOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg flex flex-col justify-between p-4 md:p-8 animate-in fade-in duration-300 select-none"
          style={{ zIndex: 3000 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Botón de cerrar flotante (Fijo en la esquina superior derecha para accesibilidad en mobile) */}
          <button 
            type="button"
            onClick={() => setIsCarouselOpen(false)}
            className="fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shadow-2xl active:scale-95"
            title="Cerrar (Esc)"
          >
            <Icon name="close" className="text-2xl" />
          </button>

          {/* Barra superior del modal */}
          <div className="flex items-center justify-between w-full text-white z-10 px-4">
            <span className="font-label text-xs uppercase tracking-widest font-bold opacity-75">
              Instalaciones ({carouselIndex + 1} de {carouselImages.length})
            </span>
          </div>

          {/* Area principal (Imagen y Botones laterales) */}
          <div className="flex-1 flex items-center justify-between relative max-w-6xl w-full mx-auto my-4">
            
            {/* Botón Izquierda */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 md:left-6 z-10 w-14 h-14 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shadow-xl active:scale-95"
              title="Anterior (←)"
            >
              <span className="material-symbols-outlined text-3xl">chevron_left</span>
            </button>

            {/* Contenedor de la Imagen con fade-in suave */}
            <div className="w-full flex items-center justify-center p-2 md:p-8 select-none">
              <img
                src={carouselImages[carouselIndex].url}
                alt={carouselImages[carouselIndex].title}
                className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl animate-in fade-in zoom-in-95 duration-500"
              />
            </div>

            {/* Botón Derecha */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 md:right-6 z-10 w-14 h-14 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shadow-xl active:scale-95"
              title="Siguiente (→)"
            >
              <span className="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
          </div>

          {/* Barra inferior (Descripción y Miniaturas) */}
          <div className="w-full text-center text-white z-10 flex flex-col gap-6 max-w-4xl mx-auto pb-4">
            <div className="flex flex-col gap-1.5 px-4 animate-in slide-in-from-bottom-2 duration-300">
              <h3 className="font-headline text-xl md:text-2xl font-bold text-white">
                {carouselImages[carouselIndex].title}
              </h3>
              <p className="font-body text-sm md:text-base text-slate-300 max-w-2xl mx-auto">
                {carouselImages[carouselIndex].description}
              </p>
            </div>

            {/* Fila de Miniaturas */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 scrollbar-none md:scrollbar-thin scrollbar-thumb-white/20 max-w-full">
              {carouselImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCarouselIndex(i)}
                  className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    i === carouselIndex ? 'border-primary scale-110 shadow-lg shadow-primary/20' : 'border-transparent opacity-40 hover:opacity-75'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Gallery;
