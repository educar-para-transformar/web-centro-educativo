import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import LevelDetail from '../components/molecules/LevelDetail';
import ValueCard from '../components/molecules/ValueCard';
import SuccessModal from '../components/molecules/SuccessModal';
import LevelsHero from '../components/organisms/LevelsHero';
import LevelsCTA from '../components/organisms/LevelsCTA';
import useFormState from '../hooks/useFormState';

const Levels = () => {
  // Modal states for visit scheduling
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

  // PEI Download Toast simulation state
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  // Lists of pilars for each Level (Mapeado dinámico)
  const inicialFeatures = [
    {
      title: 'Desarrollo Socio-Emocional',
      desc: 'Acompañamiento afectivo y rutinas seguras.',
      icon: 'check_circle',
      iconBgClass: 'bg-secondary-container/20',
      iconClass: 'text-secondary'
    },
    {
      title: 'Arte y Expresión',
      desc: 'Talleres creativos y estimulación sensorial.',
      icon: 'palette',
      iconBgClass: 'bg-secondary-container/20',
      iconClass: 'text-secondary'
    },
    {
      title: 'Aprendizaje Basado en Juego',
      desc: 'Metodologías activas para el descubrimiento.',
      icon: 'sports_esports',
      iconBgClass: 'bg-secondary-container/20',
      iconClass: 'text-secondary'
    }
  ];

  const primarioFeatures = [
    {
      title: 'Bilingüismo Integrado',
      desc: 'Inmersión diaria en el idioma inglés.',
      icon: 'language',
      iconBgClass: 'bg-primary-container/20',
      iconClass: 'text-primary'
    },
    {
      title: 'Razonamiento Lógico',
      desc: 'Matemática aplicada a problemas reales.',
      icon: 'calculate',
      iconBgClass: 'bg-primary-container/20',
      iconClass: 'text-primary'
    },
    {
      title: 'Apoyo Psicopedagógico',
      desc: 'Seguimiento personalizado del aprendizaje.',
      icon: 'psychology_alt',
      iconBgClass: 'bg-primary-container/20',
      iconClass: 'text-primary'
    }
  ];

  const secundarioFeatures = [
    {
      title: 'Robótica y Tecnología',
      desc: 'Programación y habilidades digitales avanzadas.',
      icon: 'memory',
      iconBgClass: 'bg-tertiary-container/20',
      iconClass: 'text-tertiary-container'
    },
    {
      title: 'Proyectos de Impacto',
      desc: 'Aprendizaje servicio y ciudadanía global.',
      icon: 'public',
      iconBgClass: 'bg-tertiary-container/20',
      iconClass: 'text-tertiary-container'
    },
    {
      title: 'Orientación Vocacional',
      desc: 'Talleres y vínculos con universidades.',
      icon: 'explore',
      iconBgClass: 'bg-tertiary-container/20',
      iconClass: 'text-tertiary-container'
    }
  ];

  // List of transversal values (Mapeado dinámico)
  const transversalValues = [
    {
      title: 'Bienestar Integral',
      description: 'Promovemos un clima escolar positivo, donde cada alumno se siente seguro, valorado y escuchado por la comunidad.',
      icon: 'favorite',
      iconBgClass: 'bg-primary-container/20',
      iconColorClass: 'text-primary',
      shadowClass: 'ambient-shadow-primary'
    },
    {
      title: 'Pensamiento Crítico',
      description: 'Enseñamos a cuestionar, investigar y construir conocimiento, no solo a memorizar información pasivamente.',
      icon: 'psychology',
      iconBgClass: 'bg-secondary-container/20',
      iconColorClass: 'text-secondary-dim',
      shadowClass: 'ambient-shadow-secondary'
    },
    {
      title: 'Ciudadanía Responsable',
      description: 'Inculcamos el respeto por el otro y el entorno, fomentando acciones que impacten positivamente en la sociedad.',
      icon: 'handshake',
      iconBgClass: 'bg-tertiary-container/20',
      iconColorClass: 'text-tertiary-dim',
      shadowClass: 'ambient-shadow-tertiary'
    }
  ];

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

    // Simulate booking loading delay
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', date: '', level: '' });
    }, 1500);
  };

  // PEI Download Simulation
  const handleDownloadPEI = () => {
    setShowDownloadToast(true);
    setTimeout(() => {
      setShowDownloadToast(false);
    }, 4000);
  };

  return (
    <div className="relative min-h-screen bg-surface text-on-surface">
      <Navbar />

      {/* Main Content */}
      <main className="pt-10 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-32">
        
        {/* 1. Hero Section (Organism) */}
        <LevelsHero />

        {/* 2. Detailed Levels Bento Grid Sections */}
        <section className="space-y-24">
          
          {/* Nivel Inicial Detail Card (Image Right) */}
          <LevelDetail
            badgeText="Nivel Inicial"
            icon="toys"
            badgeClass="bg-secondary-container/20 text-on-secondary-container"
            title="Pequeños Exploradores"
            description="Un espacio diseñado para despertar la curiosidad innata. A través del juego estructurado, fomentamos la creatividad, la motricidad y el desarrollo socio-emocional temprano, sentando las bases para el amor por el aprendizaje."
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDAZz5yaXJA9b49AfLjWpI2538aVWr2hXyval0lV9VPp-bT_G-RKlhPB7s9nwnje7BWycu636QPsTbEl0nqldZy2b1JkKoeexrx4shZXR9LzUDD27nQVOr3CZQomQltWN51msS0t-wGS75_2uf5oF0rvsM6e6erpuh7iYwzeHvl12ZqkgikgWbF0RqPWCmlgGZNq004zFGxrxB8HEmKpIKwxo1GE8Y7WmdWzeF_CYhp6rM0TOjPCE-f0voh7GuqQw4mBH6DNU0gAcY"
            altText="Aula infantil de jardín de infantes bien iluminada"
            imageLeft={false}
            borderClass="asymmetric-border-1"
            shadowClass="ambient-shadow-secondary"
            features={inicialFeatures}
          />

          {/* Nivel Primario Detail Card (Image Left!) */}
          <LevelDetail
            badgeText="Nivel Primario"
            icon="menu_book"
            badgeClass="bg-primary-container/20 text-primary-dim"
            title="Cimientos del Futuro"
            description="Consolidamos la alfabetización integral y el razonamiento lógico matemático. Fomentamos la autonomía intelectual mediante metodologías activas donde el alumno es el protagonista de su propio aprendizaje."
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuBuXW_QfGctMo9pgPrnxK8dp_gPt5xEwmoPfaGBRb1kPB6LP2lg0kFSvEnrng5g-evpQqhbgCj2coUE2HHp00YwiNZrVcsNDfcN7dT1QlhpPBgIVuoPAxnKVxEPcS1yFAD3E9OwjP9J1JZpiBVKkkkV5x32CSAuBa1GZ_5EkskwRBFUDPuBBpt4XzZTZg3447tggpC3TGrt8M8xwW6Idu-KBbfU_lkowpiZ-uPaneFgcGfZxxkjhEkE1gEo-cwvmFlCxff-5o13Jl0"
            altText="Estudiantes de escuela primaria cooperando en clase"
            imageLeft={true}
            borderClass="asymmetric-border-2"
            shadowClass="ambient-shadow-primary"
            features={primarioFeatures}
          />

          {/* Nivel Secundario Detail Card (Image Right) */}
          <LevelDetail
            badgeText="Nivel Secundario"
            icon="rocket_launch"
            badgeClass="bg-tertiary-container/20 text-tertiary-dim"
            title="Líderes Globales"
            description="Preparamos a los jóvenes para los desafíos del mañana. Enfoque en tecnología, proyectos de impacto social, pensamiento crítico y una sólida orientación vocacional para definir su camino universitario."
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDqgdTBoE_62xXs-LMvgfO6H6b2uc26WGT31mZiH0NQk77m7FHXgiS71RTuZ5WO815CHH4KpgFmMNcGemiUuNOC1G6ldFWBXq1S8KcsoNw4SCt2dx2jMaXT3wcKAk70qySy6zR6wMPno2jVv849LqA-ZYthKW-JwxSXOz8TN2cAYlUYZx_8NRJdgU6NjBTe933uSHXgZegaf86D8WPyWPFOoCktByVbFVlPUNiljx5u3NDn2_z7j9RvVthxxdPVG1jvm52mtAQZs8Q"
            altText="Estudiantes de bachillerato en laboratorio de robótica"
            imageLeft={false}
            borderClass="asymmetric-border-1"
            shadowClass="ambient-shadow-tertiary"
            features={secundarioFeatures}
          />

        </section>

        {/* 3. Transversal Values section (Mapped cards) */}
        <section className="bg-surface-container-low rounded-[3rem] p-8 md:p-16 relative overflow-hidden ghost-border text-center">
          <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-surface-container-lowest/50 to-transparent pointer-events-none"></div>
          
          <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
            <h2 className="text-headline-lg font-bold Globalesfont-headline text-on-surface mb-6">
              Valores Transversales
            </h2>
            <p className="text-body-lg text-on-surface-variant font-body">
              Más allá del currículo académico, nuestro compromiso es formar personas íntegras. El bienestar emocional y la excelencia humana cruzan todas las etapas de nuestra propuesta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {transversalValues.map((value, index) => (
              <ValueCard
                key={index}
                title={value.title}
                description={value.description}
                icon={value.icon}
                iconBgClass={value.iconBgClass}
                iconColorClass={value.iconColorClass}
                shadowClass={value.shadowClass}
              />
            ))}
          </div>
        </section>

        {/* 4. Bottom CTA Section (Organism) */}
        <LevelsCTA 
          onDownloadPEI={handleDownloadPEI} 
          onScheduleVisit={() => setIsModalOpen(true)} 
        />

      </main>

      {/* 5. Booking Modal (Shared high-fidelity overlay) */}
      {isModalOpen && !submitSuccess && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 max-w-md w-full rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl relative text-left animate-in zoom-in-95 duration-300">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer border-none outline-none"
            >
              <Icon name="close" className="text-xl" />
            </button>

            <div className="mb-6 flex flex-col gap-2">
              <h3 className="font-headline text-2xl font-bold text-slate-800 dark:text-slate-100">Agendar Visita</h3>
              <p className="font-body text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Completa tus datos y selecciona la fecha para tu visita guiada al campus de Resistencia.
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
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
                className="mt-4 bg-gradient-to-br from-secondary to-secondary-dim text-white py-4 rounded-full font-bold text-base hover:shadow-xl hover:shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
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
                    <Icon name="event" className="text-lg flex items-center justify-center" />
                    <span>Confirmar Visita</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Success Modal for Visit */}
      <SuccessModal 
        isOpen={submitSuccess}
        onClose={() => {
          setSubmitSuccess(false);
          setIsModalOpen(false);
        }}
        title="¡Visita Agendada!"
        message="Hemos registrado tu reserva para la visita guiada con éxito. Te hemos enviado un correo de confirmación con los horarios y los detalles de acceso al campus."
        buttonText="Excelente"
        iconBg="bg-green-100"
        iconColor="text-green-600"
      />

      {/* 7. PEI Download Toast simulation */}
      {showDownloadToast && (
        <div className="fixed bottom-8 right-8 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-8 duration-300 max-w-sm">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="download" className="text-base font-bold animate-bounce" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">Proyecto Educativo (PEI)</p>
            <p className="text-xs text-slate-300 dark:text-slate-600">Descarga simulada completada con éxito.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Levels;
