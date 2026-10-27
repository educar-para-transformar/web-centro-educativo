import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Icon from '../components/atoms/Icon';
import NewsCard from '../components/molecules/NewsCard';
import EventCard from '../components/molecules/EventCard';
import NewsHero from '../components/organisms/NewsHero';
import { useAuth } from '../context/AuthContext';
import { schoolEvents } from '../services/schoolEvents';
import { db } from '../services/firebase';
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';

import { images } from '../services/imagesConfig';
const { pool, robotica, feria, basket, lectura } = images;

// Predefined images list with labels and actual imports
const predefinedImages = [
  { key: 'feria', label: 'Feria de Ciencias', src: feria },
  { key: 'lectura', label: 'Espacios de Lectura', src: lectura },
  { key: 'basket', label: 'Baloncesto / Deportes', src: basket },
  { key: 'robotica', label: 'Taller de Robótica', src: robotica },
  { key: 'pool', label: 'Pileta Climatizada', src: pool },
];

// Helper to map dynamic text string to local asset or return direct URL
const resolveImage = (imageKey) => {
  if (!imageKey) return null;
  if (images[imageKey]) {
    return images[imageKey];
  }
  return imageKey;
};

// Helper to automatically return styling based on category
const getCategoryClass = (category, isFeatured = false) => {
  if (isFeatured) {
    return 'bg-tertiary-fixed text-on-tertiary-fixed';
  }
  switch (category) {
    case 'Institucional':
      return 'text-primary';
    case 'Deportes':
      return 'text-secondary';
    case 'Tecnología':
      return 'text-tertiary';
    case 'Académico':
      return 'text-orange-500';
    case 'Destacado':
      return 'text-amber-500';
    default:
      return 'text-primary';
  }
};

// Calendario escolar estático compartido con el panel del alumno.
const events = schoolEvents;

// Click callback (defined at module scope to prevent re-creation on render)
const handleCardInteraction = (title) => {
  alert(`Has hecho clic para leer los detalles de: "${title}"`);
};

const News = () => {
  const { user } = useAuth();

  // Admin detection state
  const [isAdmin, setIsAdmin] = useState(false);

  // Dynamic news list from Firestore
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  // Local pagination for the secondary articles list
  const [visibleCount, setVisibleCount] = useState(2);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [subtitleInput, setSubtitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Institucional');
  const [imageType, setImageType] = useState('predefined'); // 'predefined' | 'custom'
  const [selectedPredefined, setSelectedPredefined] = useState('feria');
  const [customUrl, setCustomUrl] = useState('');
  const [buttonTextInput, setButtonTextInput] = useState('Leer más');
  const [isFeaturedInput, setIsFeaturedInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Synchronize admin checking on mount or auth state changes
  useEffect(() => {
    const savedUser = localStorage.getItem('school_user');
    const currentUser = savedUser ? JSON.parse(savedUser) : null;
    if (user?.role === 'user_admin' || currentUser?.role === 'user_admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Fetch articles from Firestore and seed if the collection is empty
  const fetchNews = async () => {
    setIsLoading(true);
    setDataError('');
    try {
      const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      let fetched = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Autosebrado (Database Seeding) if collection is empty
      if (fetched.length === 0) {
        console.log(
          'Colección "news" de Firestore vacía. Inicializando con noticias premium por defecto...'
        );
        const defaultArticles = [
          {
            title: 'Feria de Ciencias 2024: Innovación Estudiantil',
            subtitle:
              'Nuestros alumnos de secundaria presentaron proyectos increíbles sobre energías renovables y robótica aplicada. ¡Un orgullo para toda la comunidad!',
            category: 'Destacado',
            image: 'feria',
            buttonText: 'Leer más',
            isFeatured: true,
            createdAt: new Date(Date.now() - 1000),
          },
          {
            title: 'Nuevos Espacios de Lectura al Aire Libre',
            subtitle:
              'Hemos inaugurado tres nuevas zonas verdes equipadas especialmente para fomentar la lectura y el aprendizaje en contacto con la naturaleza durante los recreos.',
            category: 'Institucional',
            image: 'lectura',
            buttonText: 'Ver detalles',
            isFeatured: false,
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            title: 'Campeones del Torneo Intercolegial',
            subtitle:
              'Nuestra selección sub-16 de baloncesto se consagró campeona regional tras un emocionante partido final. Felicitaciones a los jugadores y al cuerpo técnico.',
            category: 'Deportes',
            image: 'basket',
            buttonText: 'Ver galería',
            isFeatured: false,
            createdAt: new Date(Date.now() - 7200000),
          },
          {
            title: 'Taller Maker: Robótica e Impresión 3D',
            subtitle:
              'Inscripciones abiertas para el nuevo taller maker donde los estudiantes aprenderán a diseñar, construir e imprimir sus propios prototipos tridimensionales.',
            category: 'Tecnología',
            image: 'robotica',
            buttonText: 'Inscribirse',
            isFeatured: false,
            createdAt: new Date(Date.now() - 10800000),
          },
          {
            title: 'Inauguración de la Pileta Climatizada',
            subtitle:
              'A partir de la próxima semana comienzan los entrenamientos de natación libre y las clases curriculares en nuestro moderno complejo climatizado.',
            category: 'Deportes',
            image: 'pool',
            buttonText: 'Ver horarios',
            isFeatured: false,
            createdAt: new Date(Date.now() - 14400000),
          },
        ];

        for (const art of defaultArticles) {
          await addDoc(collection(db, 'news'), art);
        }

        const reSnapshot = await getDocs(q);
        fetched = reSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      setArticles(fetched);
    } catch (err) {
      console.error('Error cargando noticias de Firestore:', err);
      setDataError(
        'No se pudieron cargar las noticias dinámicas. Mostrando datos locales de respaldo.'
      );

      // Local fallback data
      setArticles([
        {
          id: 'fallback-1',
          title: 'Feria de Ciencias 2024: Innovación Estudiantil',
          subtitle:
            'Nuestros alumnos de secundaria presentaron proyectos increíbles sobre energías renovables y robótica aplicada. ¡Un orgullo para toda la comunidad!',
          category: 'Destacado',
          image: 'feria',
          buttonText: 'Leer más',
          isFeatured: true,
        },
        {
          id: 'fallback-2',
          title: 'Nuevos Espacios de Lectura al Aire Libre',
          subtitle:
            'Hemos inaugurado tres nuevas zonas verdes equipadas especialmente para fomentar la lectura y el aprendizaje en contacto con la naturaleza durante los recreos.',
          category: 'Institucional',
          image: 'lectura',
          buttonText: 'Ver detalles',
          isFeatured: false,
        },
        {
          id: 'fallback-3',
          title: 'Campeones del Torneo Intercolegial',
          subtitle:
            'Nuestra selección sub-16 de baloncesto se consagró campeona regional tras un emocionante partido final. Felicitaciones a los jugadores y al cuerpo técnico.',
          category: 'Deportes',
          image: 'basket',
          buttonText: 'Ver galería',
          isFeatured: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Resolve featured article (newest marked as featured, or the first article if none)
  const featuredArticle = articles.find((a) => a.isFeatured) || articles[0];

  // Filter out the featured article from the secondary list
  const secondaryArticles = articles.filter(
    (a) => a.id !== featuredArticle?.id
  );

  const visibleSecondaryArticles = secondaryArticles.slice(0, visibleCount);
  const hasMore = secondaryArticles.length > visibleCount;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 2);
      setIsLoadingMore(false);
    }, 800);
  };

  // Delete news from Firestore
  const handleDeleteNews = async (articleId, articleTitle) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar la noticia "${articleTitle}"?`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'news', articleId));
      await fetchNews();
    } catch (err) {
      console.error('Error al eliminar la noticia de Firestore:', err);
      alert('Ocurrió un error al intentar eliminar la noticia.');
    }
  };

  // Submit news to Firestore
  const handleSubmitNews = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!titleInput.trim() || !subtitleInput.trim()) {
      setFormError(
        'Por favor, completa el título y subtítulo/copete de la noticia.'
      );
      return;
    }

    const imageToSave =
      imageType === 'predefined' ? selectedPredefined : customUrl.trim();
    if (!imageToSave) {
      setFormError(
        'Por favor, selecciona una imagen predefinida o ingresa una URL de imagen.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const newArticle = {
        title: titleInput.trim(),
        subtitle: subtitleInput.trim(),
        category: categoryInput,
        image: imageToSave,
        buttonText: buttonTextInput.trim() || 'Leer más',
        isFeatured: isFeaturedInput,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'news'), newArticle);

      // Reset form
      setTitleInput('');
      setSubtitleInput('');
      setCategoryInput('Institucional');
      setImageType('predefined');
      setSelectedPredefined('feria');
      setCustomUrl('');
      setButtonTextInput('Leer más');
      setIsFeaturedInput(false);
      setIsModalOpen(false);

      // Refresh list
      await fetchNews();
    } catch (err) {
      console.error('Error guardando la noticia en Firestore:', err);
      setFormError(
        'Ocurrió un error al guardar la noticia en la base de datos.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-surface text-on-surface">
      <Navbar />

      <main className="pt-10 pb-10 px-6 md:px-12 max-w-7xl mx-auto flex flex-col">
        {/* News Hero Component (Organism) */}
        <NewsHero />

        {/* Admin Management Banner */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-orange-500/20 animate-in fade-in slide-in-from-top-4 duration-300 text-left border border-orange-400/20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Icon name="admin_panel_settings" className="text-2xl" />
              </div>
              <div>
                <h2 className="font-headline font-bold text-lg">
                  Modo Administrador Activo
                </h2>
                <p className="text-xs text-orange-100 mt-0.5">
                  Puedes crear nuevas noticias y guardarlas directamente en la
                  base de datos de Firebase.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-white text-orange-600 font-bold text-sm rounded-full hover:bg-orange-50 transition-all active:scale-[0.98] cursor-pointer shadow-md flex items-center gap-1.5 self-stretch md:self-auto justify-center border-none"
            >
              <Icon name="add" className="text-lg" />
              <span>Nueva Noticia</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full mb-4"></div>
            <p className="font-semibold text-lg">
              Cargando noticias y eventos...
            </p>
          </div>
        ) : (
          <>
            {dataError && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center gap-3 text-amber-800 mb-6 text-left">
                <Icon
                  name="warning"
                  className="text-amber-500 text-2xl animate-pulse"
                />
                <p className="text-sm font-medium">{dataError}</p>
              </div>
            )}

            {/* Bento Grid Layout (Articles & Events sidebar) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Featured News Molecule */}
              {featuredArticle && (
                <NewsCard
                  variant="featured"
                  title={featuredArticle.title}
                  subtitle={featuredArticle.subtitle}
                  category={featuredArticle.category}
                  categoryClass={getCategoryClass(
                    featuredArticle.category,
                    true
                  )}
                  image={resolveImage(featuredArticle.image)}
                  buttonText={featuredArticle.buttonText}
                  onButtonClick={() =>
                    handleCardInteraction(featuredArticle.title)
                  }
                  showDelete={isAdmin}
                  onDeleteClick={() =>
                    handleDeleteNews(featuredArticle.id, featuredArticle.title)
                  }
                />
              )}

              {/* Upcoming Events sidebar (Mapped dynamic molecules) */}
              <aside className="md:col-span-4 flex flex-col gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    day={event.day}
                    month={event.month}
                    title={event.title}
                    info={event.info}
                    icon={event.icon}
                    dateBgClass={event.dateBgClass}
                    glowClass={event.glowClass}
                    onClick={() => handleCardInteraction(event.title)}
                  />
                ))}
              </aside>

              {/* Secondary News Grid (Mapped molecules) */}
              <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                {visibleSecondaryArticles.map((article) => (
                  <NewsCard
                    key={article.id}
                    variant="secondary"
                    title={article.title}
                    subtitle={article.subtitle}
                    category={article.category}
                    categoryClass={getCategoryClass(article.category, false)}
                    image={resolveImage(article.image)}
                    buttonText={article.buttonText}
                    onButtonClick={() => handleCardInteraction(article.title)}
                    showDelete={isAdmin}
                    onDeleteClick={() =>
                      handleDeleteNews(article.id, article.title)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Load More Button Section */}
            {hasMore && (
              <div className="mt-12 flex justify-center animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-8 py-3.5 rounded-full font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-md border-none"
                >
                  {isLoadingMore ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-on-surface"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Cargando noticias...</span>
                    </>
                  ) : (
                    <>
                      <span>Ver más noticias</span>
                      <Icon name="refresh" className="text-lg font-bold" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Creación de Noticias */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 sm:p-8 animate-scale-in text-left my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h3 className="font-headline text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Icon name="newspaper" className="text-orange-500" />
                <span>Crear Nueva Noticia</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
              >
                <Icon name="close" className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSubmitNews} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Título */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Título de la Noticia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Taller de Ciencias Innovador"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm font-medium text-slate-800"
                    required
                  />
                </div>

                {/* Subtítulo / Copete */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Subtítulo / Copete
                  </label>
                  <textarea
                    placeholder="Escribe un breve resumen de la noticia que capte la atención..."
                    value={subtitleInput}
                    onChange={(e) => setSubtitleInput(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm font-medium text-slate-800 resize-none"
                    required
                  />
                </div>

                {/* Categoría */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Categoría
                  </label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm font-semibold text-slate-800 appearance-none"
                  >
                    <option value="Institucional">Institucional</option>
                    <option value="Deportes">Deportes</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Académico">Académico</option>
                    <option value="Destacado">Destacado</option>
                  </select>
                </div>

                {/* Texto del Botón */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Texto del Botón
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Leer más, Ver detalles"
                    value={buttonTextInput}
                    onChange={(e) => setButtonTextInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm font-medium text-slate-800"
                  />
                </div>

                {/* Origen de Imagen (Selector) */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Imagen de Portada
                  </label>

                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="imageType"
                        checked={imageType === 'predefined'}
                        onChange={() => setImageType('predefined')}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span>Imágenes del Colegio</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="imageType"
                        checked={imageType === 'custom'}
                        onChange={() => setImageType('custom')}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span>Enlace de Imagen Externo</span>
                    </label>
                  </div>

                  {imageType === 'predefined' ? (
                    /* Grid of predefined images with previews */
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      {predefinedImages.map((img) => (
                        <button
                          type="button"
                          key={img.key}
                          onClick={() => setSelectedPredefined(img.key)}
                          className={`group flex flex-col gap-1.5 items-center p-1.5 rounded-xl border-2 transition-all cursor-pointer bg-white ${
                            selectedPredefined === img.key
                              ? 'border-orange-500 bg-orange-50/20'
                              : 'border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="w-full h-12 rounded-lg overflow-hidden relative">
                            <img
                              src={img.src}
                              alt={img.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 text-center leading-tight">
                            {img.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* Custom URL Input */
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-sm font-medium text-slate-800"
                    />
                  )}
                </div>

                {/* Noticia Destacada (Checkbox) */}
                <div className="flex items-center gap-3 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeaturedInput}
                    onChange={(e) => setIsFeaturedInput(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300"
                  />
                  <label
                    htmlFor="isFeatured"
                    className="flex flex-col text-left cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-slate-700">
                      Marcar como Noticia Principal (Destacada)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Se mostrará en la sección superior gigante del portal de
                      noticias.
                    </span>
                  </label>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-500 font-bold bg-red-50 border border-red-100 p-3 rounded-xl text-center">
                  {formError}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-full transition-all cursor-pointer border-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-full shadow-lg shadow-orange-600/10 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="save" className="text-sm animate-pulse" />
                      <span>Publicar Noticia</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
