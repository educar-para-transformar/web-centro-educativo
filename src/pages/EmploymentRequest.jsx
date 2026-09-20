import React, { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import FileUploadZone from '../components/molecules/FileUploadZone';
import SuccessModal from '../components/molecules/SuccessModal';
import EmploymentHero from '../components/organisms/EmploymentHero';
import EmploymentBento from '../components/organisms/EmploymentBento';
import useFormState from '../hooks/useFormState';

const EmploymentRequest = () => {
    // Form and UI refs for smooth scroll
    const bentoSectionRef = useRef(null);
    const formSectionRef = useRef(null);

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
        area: '',
        privacy: false,
    });

    const [cvFile, setCvFile] = useState(null);
    const [cvError, setCvError] = useState('');

    // Scroll helper
    const scrollToSection = (ref) => {
        if (ref && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Scroll and set area helper
    const handleExploreArea = (areaValue) => {
        setFormData(prev => ({ ...prev, area: areaValue }));
        scrollToSection(formSectionRef);
    };

    // Form validations and submit
    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = {};

        if (!formData.name.trim()) {
            validationErrors.name = 'El nombre completo es requerido.';
        } else if (formData.name.trim().length < 3) {
            validationErrors.name = 'El nombre debe tener al menos 3 caracteres.';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            validationErrors.email = 'El correo electrónico es requerido.';
        } else if (!emailRegex.test(formData.email)) {
            validationErrors.email = 'Por favor, introduce un correo electrónico válido.';
        }

        if (!formData.area) {
            validationErrors.area = 'Debes seleccionar un área de interés principal.';
        }

        if (!cvFile) {
            setCvError('Debes adjuntar tu currículum (PDF).');
            validationErrors.cv = 'Requerido';
        }

        if (!formData.privacy) {
            validationErrors.privacy = 'Debes aceptar las políticas de privacidad para continuar.';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            scrollToSection(formSectionRef);
            return;
        }

        // Simulating highly premium submit animation
        setIsSubmitting(true);
        setErrors({});
        setCvError('');
        
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitSuccess(true);
            
            // Reset form
            setFormData({ name: '', email: '', area: '', privacy: false });
            setCvFile(null);
        }, 1800);
    };

    return (
        <div className="relative min-h-screen bg-surface text-on-surface">
            <Navbar />

            {/* Main Content */}
            <main className="pt-10 pb-24 px-6 max-w-7xl mx-auto flex flex-col gap-16">
                
                {/* Hero Section (Organism) */}
                <EmploymentHero 
                    onVerVacantesClick={() => scrollToSection(bentoSectionRef)} 
                    onCargarCvClick={() => scrollToSection(formSectionRef)} 
                />

                {/* Áreas de Interés Bento Grid (Organism) */}
                <div ref={bentoSectionRef}>
                    <EmploymentBento onExploreArea={handleExploreArea} />
                </div>

                {/* Formulario de Postulación Rápida */}
                <section ref={formSectionRef} className="bg-surface-container-low rounded-[3rem] p-8 md:p-12 border border-surface-container-highest relative overflow-hidden scroll-mt-24 text-left">
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none"></div>
                    
                    <div className="max-w-3xl mx-auto flex flex-col gap-8 relative z-10">
                        <div className="text-center flex flex-col gap-3">
                            <h2 className="font-headline text-[2rem] font-bold text-on-surface">Postulación Espontánea</h2>
                            <p className="font-body text-on-surface-variant">¿No encuentras una vacante específica? Déjanos tu CV y te contactaremos cuando surja una oportunidad que se ajuste a tu perfil.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="bg-surface-container-lowest/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-primary/5 border border-primary/10 flex flex-col gap-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre */}
                                <div className="flex flex-col gap-2">
                                    <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Nombre Completo <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={`w-full bg-surface-container-high focus:bg-surface-container-lowest border border-transparent ${errors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary/30'} rounded-xl px-4 py-3 font-body text-on-surface transition-all outline-none ring-0 focus:ring-0`} 
                                        placeholder="Ej. Ana Pérez"
                                    />
                                    {errors.name && <span className="text-xs text-red-500 font-semibold">{errors.name}</span>}
                                </div>
                                
                                {/* Email */}
                                <div className="flex flex-col gap-2">
                                    <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Correo Electrónico <span className="text-red-500">*</span></label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full bg-surface-container-high focus:bg-surface-container-lowest border border-transparent ${errors.email ? 'border-red-500 focus:border-red-500' : 'focus:border-primary/30'} rounded-xl px-4 py-3 font-body text-on-surface transition-all outline-none ring-0 focus:ring-0`} 
                                        placeholder="ana@ejemplo.com"
                                    />
                                    {errors.email && <span className="text-xs text-red-500 font-semibold">{errors.email}</span>}
                                </div>
                            </div>

                            {/* Área */}
                            <div className="flex flex-col gap-2">
                                <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Área de Interés Principal <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select 
                                        name="area"
                                        value={formData.area}
                                        onChange={handleInputChange}
                                        className={`w-full bg-surface-container-high focus:bg-surface-container-lowest border border-transparent ${errors.area ? 'border-red-500 focus:border-red-500' : 'focus:border-primary/30'} rounded-xl px-4 py-3 font-body text-on-surface transition-all outline-none ring-0 focus:ring-0 appearance-none`}
                                    >
                                        <option value="">Selecciona un área...</option>
                                        <option value="docencia">Docencia</option>
                                        <option value="admin">Administración</option>
                                        <option value="maestranza">Maestranza y Mantenimiento</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                                        <Icon name="expand_more" className="text-lg" />
                                    </div>
                                </div>
                                {errors.area && <span className="text-xs text-red-500 font-semibold">{errors.area}</span>}
                            </div>

                            {/* Reusable File Drag and Drop Zone (Molecule) */}
                            <div className="flex flex-col gap-2">
                                <label className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">Sube tu CV (PDF) <span className="text-red-500">*</span></label>
                                <FileUploadZone 
                                    file={cvFile}
                                    onFileChange={(file) => {
                                        setCvFile(file);
                                        setCvError('');
                                    }}
                                    onFileRemove={() => setCvFile(null)}
                                    error={cvError}
                                    setError={setCvError}
                                    accept=".pdf"
                                    maxSizeInMB={5}
                                    label="Haz clic para buscar"
                                    subLabel="o arrastra tu archivo aquí"
                                />
                            </div>

                            {/* Checkbox de Privacidad */}
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="privacy"
                                        name="privacy"
                                        checked={formData.privacy}
                                        onChange={handleInputChange}
                                        className={`rounded text-primary focus:ring-primary/50 w-5 h-5 bg-surface-container-high border-transparent cursor-pointer ${errors.privacy ? 'border-red-500' : ''}`}
                                    />
                                    <label className="font-body text-sm text-on-surface-variant cursor-pointer select-none" htmlFor="privacy">
                                        Acepto la política de privacidad y el tratamiento de mis datos. <span className="text-red-500">*</span>
                                    </label>
                                </div>
                                {errors.privacy && <span className="text-xs text-red-500 font-semibold">{errors.privacy}</span>}
                            </div>

                            {/* Botón Submit */}
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="mt-4 bg-gradient-to-br from-tertiary to-tertiary-container text-white w-full py-4 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-tertiary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="send" filled={true} className="text-xl" />
                                        <span>Enviar Postulación</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </section>
            </main>

            {/* Success Modal / Banner */}
            <SuccessModal 
                isOpen={submitSuccess}
                onClose={() => setSubmitSuccess(false)}
                title="¡Postulación Enviada!"
                message="Hemos recibido tus datos y tu currículum correctamente. Nuestro equipo de selección lo revisará y nos pondremos en contacto contigo si tu perfil se adapta a alguna de nuestras vacantes."
                buttonText="Entendido"
                iconBg="bg-green-100"
                iconColor="text-green-600"
            />
        </div>
    );
};

export default EmploymentRequest;
