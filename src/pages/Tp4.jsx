import React from 'react';
import Navbar from '../components/Navbar';

const respuestasVerdaderoFalso = [
  {
    numero: 1,
    afirmacion: 'Flujo típico de Integración Continua',
    respuesta: 'V',
    fundamento:
      'Coincide con el flujo Desarrollador, Commit, Repositorio, Build, Pruebas y Resultado. La compilación, las pruebas y el análisis de calidad los ejecuta el pipeline automáticamente; si todo pasa, el cambio avanza y, si hay un error, el equipo es notificado para corregirlo.',
  },
  {
    numero: 2,
    afirmacion: 'Proceso de Integración Continua',
    respuesta: 'V',
    fundamento:
      'La CI consiste en integrar con frecuencia los cambios en un repositorio compartido y verificarlos con builds y pruebas automatizadas. Al integrar cambios pequeños, los problemas se localizan más fácilmente y se evita que se acumulen.',
  },
  {
    numero: 3,
    afirmacion: 'Principios clave de la CI',
    respuesta: 'V',
    fundamento:
      'Se debe integrar varias veces al día, automatizar el build y las pruebas, usar un repositorio compartido con control de versiones, revisar los resultados del CI antes del merge y mantener el software en un estado siempre integrable y liberable.',
  },
  {
    numero: 4,
    afirmacion: 'Relación con Entrega Continua (CD)',
    respuesta: 'F',
    fundamento:
      'La Entrega Continua mantiene el software preparado para liberarse, pero la liberación final a producción puede requerir aprobación manual. Lo que automatiza el despliegue a producción es el Despliegue Continuo, por lo que Delivery no implica necesariamente despliegue automático. El resto del enunciado, que indica que CI y CD forman el flujo CI/CD en DevOps, es correcto.',
  },
  {
    numero: 5,
    afirmacion: 'Flujo típico de un pipeline CI/CD',
    respuesta: 'V',
    fundamento:
      'Responde a la cadena Build, Test, Package y Deploy: tras las pruebas se genera el paquete o la imagen, se despliega en el entorno de destino y el equipo recibe la notificación del resultado.',
  },
  {
    numero: 6,
    afirmacion: 'Etapas típicas del despliegue automatizado',
    respuesta: 'V',
    fundamento:
      'Build, Test, Package y Deploy son etapas del pipeline; la verificación posterior corresponde a la ejecución de pruebas después del despliegue y al monitoreo.',
  },
];

const beneficiosCI = [
  {
    beneficio: 'Detección temprana de errores',
    descripcion: 'Los fallos se detectan en minutos, no semanas después.',
  },
  {
    beneficio: 'Reducción de conflictos de integración',
    descripcion:
      'Al integrar frecuentemente, se evitan los "infiernos de merge".',
  },
  {
    beneficio: 'Mayor calidad del software',
    descripcion: 'Las pruebas automáticas garantizan estabilidad.',
  },
  {
    beneficio: 'Entrega más rápida',
    descripcion: 'El producto está siempre en condiciones de ser desplegado.',
  },
  {
    beneficio: 'Transparencia',
    descripcion:
      'Todos pueden ver el estado del proyecto: builds, pruebas y cobertura.',
  },
];

const relacionesUnidad3 = [
  {
    titulo: 'Código limpio y refactorización',
    detalle:
      'La Unidad 4 propone refactorizar con frecuencia para mejorar la legibilidad, la estructura interna y la mantenibilidad sin alterar la funcionalidad externa. La CI aporta las pruebas automáticas que permiten verificar, ante cada cambio, que el código refactorizado sigue funcionando.',
  },
  {
    titulo: 'Revisión de código',
    detalle:
      'Se integra al flujo mediante Pull Requests y Merge Requests (Pull Request, CI, Code Review y Merge), con análisis estático y verificación de estilo automáticos, además de políticas de protección de ramas.',
  },
  {
    titulo: 'Commits pequeños y comprensibles',
    detalle:
      'Es una buena práctica de CI/CD que se complementa con la integración frecuente: al ser reducido el conjunto de cambios, los problemas son más fáciles de localizar.',
  },
  {
    titulo: 'Pruebas automatizadas',
    detalle:
      'Las pruebas unitarias verifican pequeñas unidades de código y, junto con las de integración, funcionales y de interfaz, forman parte del pipeline.',
  },
  {
    titulo: 'Convenciones y documentación',
    detalle:
      'Las Wikis permiten documentar las convenciones de programación, la arquitectura, las decisiones técnicas y las guías para nuevos integrantes; documentar el proceso también es una buena práctica.',
  },
  {
    titulo: 'Arquitectura modular',
    detalle:
      'Una arquitectura sólida y modular facilita el desarrollo paralelo, el mantenimiento y las futuras ampliaciones, lo que acompaña el trabajo en ramas separadas y la integración frecuente.',
  },
  {
    titulo: 'Configuración separada y datos sensibles',
    detalle:
      'Las variables de entorno permiten separar la configuración del código fuente y los secretos no deben almacenarse en el repositorio.',
  },
];

const mejorasCI_CD = [
  {
    titulo: 'Cambio en el proceso',
    detalle:
      'En el modelo tradicional los ciclos son largos, las pruebas se realizan al final y varios desarrolladores trabajan semanas o meses en ramas diferentes, lo que produce conflictos difíciles de resolver. Con CI/CD los cambios se integran frecuentemente en un repositorio compartido y cada uno se integra, compila, prueba y valida automáticamente. El trabajo se organiza como un pipeline (Source, Build, Test, Package, Security y Deploy) que se activa ante eventos como un push o un Pull Request.',
  },
  {
    titulo: 'Calidad',
    detalle:
      'Las pruebas automatizadas y las validaciones continuas mantienen un nivel de calidad más consistente; los quality gates impiden avanzar si no se cumplen los criterios; y el Pull Request permite ejecutar análisis estático, de estilo y de seguridad antes del merge.',
  },
  {
    titulo: 'Tiempo',
    detalle:
      'Los errores se detectan rápidamente, el desarrollador recibe retroalimentación rápida y se reducen las tareas manuales. Desplegar pequeños lotes de cambios con frecuencia disminuye además el riesgo de los lanzamientos.',
  },
  {
    titulo: 'Trazabilidad',
    detalle:
      'El repositorio permite relacionar commit, autor, rama, Issue, Pull/Merge Request, pipeline, pruebas, artefacto y despliegue. La gestión de artefactos permite identificar exactamente qué versión fue desplegada y el flujo Issue, Rama, Commit, Pull Request, Pipeline, Merge, Deploy e Issue cerrada brinda trazabilidad completa del trabajo.',
  },
  {
    titulo: 'Productividad',
    detalle:
      'Se automatizan las tareas repetitivas, cualquier integrante del equipo puede realizar un despliegue con sólo pulsar un botón sin conocimientos técnicos especiales y se libera tiempo para tareas más importantes. Métricas como Lead Time y Deployment Frequency permiten medir la velocidad de entrega, detectar cuellos de botella y orientar la mejora continua.',
  },
];

const mejorasColaborativas = [
  'Repositorio compartido: todo el equipo integra frecuentemente sus cambios en un mismo lugar, lo que facilita el trabajo colaborativo.',
  'Pull Requests y Merge Requests: los cambios son analizados por el equipo antes de incorporarse a la rama principal.',
  'Issues, Wikis y tableros Kanban: se registran y asignan las tareas, se documenta el conocimiento compartido y se visualiza el flujo de trabajo (pendiente, en ejecución, bloqueado, en revisión y terminado), con límite de Work In Progress (WIP) para evitar la sobrecarga.',
  'Cultura DevOps: la automatización reduce las barreras entre Desarrollo, Operaciones, Testing/QA, Seguridad, Infraestructura y Gestión de proyectos, y genera un flujo de trabajo más integrado. La mejora combina Personas, Procesos, Tecnología, Automatización y Métricas. Las metodologías ágiles promueven además la comunicación abierta y fluida entre desarrolladores, testers y operaciones.',
];

const mejorasCalidad = [
  'Detección temprana de errores y retroalimentación rápida, que evitan que los problemas se acumulen y sean más costosos de corregir.',
  'Automatización de build y pruebas (unitarias, de integración, funcionales y de interfaz) con pipelines reproducibles.',
  'Revisión de código, análisis de seguridad y protección de ramas.',
  'Monitoreo y observabilidad posteriores al despliegue, para detectar y solucionar rápidamente problemas de rendimiento o bugs en producción, y estrategias de rollback ante versiones con problemas.',
];

const usosIA = [
  'Pull Requests y code review: pre-revisión del cambio para sugerir mejoras de estilo y posibles malas prácticas antes de la revisión del equipo, que mantiene la decisión final del merge.',
  'Automatización de pruebas: ayuda para proponer casos de prueba unitarios y de integración y señalar partes del código con poca cobertura.',
  'Pipelines y builds: análisis de los registros de ejecuciones fallidas para explicar la causa probable del error y sugerir su corrección, acelerando la retroalimentación al equipo.',
  'Métricas de productividad: análisis de los datos de Lead Time y Deployment Frequency para detectar cuellos de botella, como las esperas de revisión o de pruebas, y anticipar demoras.',
  'Issues y tablero Kanban: redacción, clasificación y priorización de Issues (por ejemplo, con la técnica MoSCoW) y resumen del estado del tablero.',
  'Wikis y documentación: generación y actualización de la documentación (instalación, configuración, arquitectura, guías para nuevos integrantes) a partir de los cambios realizados.',
  'Seguridad y variables de entorno: detección de credenciales o tokens subidos por error al repositorio, en línea con la práctica de no almacenar secretos en él.',
  'Monitoreo y despliegue: detección de comportamientos anormales luego de un despliegue (por ejemplo, en una estrategia Canary) para apoyar la decisión de ejecutar un rollback.',
];

const SectionTitle = ({ icon, children }) => (
  <div className="flex items-center gap-3">
    <span className="material-symbols-outlined text-primary text-3xl">
      {icon}
    </span>
    <h2 className="text-2xl font-headline font-extrabold text-on-surface">
      {children}
    </h2>
  </div>
);

const Tp4 = () => {
  return (
    <div className="relative min-h-screen bg-surface text-on-surface">
      <Navbar />

      <main className="pt-10 pb-16 px-6 md:px-12 max-w-5xl mx-auto flex flex-col gap-8 text-left">
        <header className="bg-surface-container-low rounded-3xl p-8 md:p-12 border border-surface-container-highest shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="bg-primary-container text-on-primary-container p-4 rounded-2xl flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-4xl">
                integration_instructions
              </span>
            </div>
            <div>
              <p className="text-sm font-body font-bold uppercase tracking-wider text-primary mb-1">
                Unidad 4 - Actividad Práctica
              </p>
              <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface mb-2">
                Optimización del ciclo de desarrollo de software
              </h1>
              <p className="text-on-surface-variant font-body text-sm md:text-base max-w-3xl">
                Respuesta del equipo sobre Integración Continua, Entrega
                Continua y las herramientas utilizadas en el proyecto. La
                entrega de la Parte 1 se presenta en la aplicación el día 11 de
                noviembre.
              </p>
            </div>
          </div>
        </header>

        <section className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 border border-surface-container-highest shadow-md flex flex-col gap-5">
          <SectionTitle icon="rocket_launch">
            Optimización aplicada al proyecto
          </SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest">
              <p className="text-xs font-body font-bold uppercase tracking-wider text-primary mb-2">
                Tipo de optimización
              </p>
              <p className="font-body text-on-surface font-semibold">
                Integración Continua (CI) con Entrega/Despliegue Continuo (CD)
                dentro de un flujo Git Flow.
              </p>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest md:col-span-2">
              <p className="text-xs font-body font-bold uppercase tracking-wider text-primary mb-2">
                Justificación
              </p>
              <p className="font-body text-on-surface-variant text-sm leading-relaxed">
                Permite integrar cambios pequeños y frecuentes, validar
                automáticamente el lint y el build en cada Pull Request,
                detectar errores antes del merge y mantener la rama principal
                siempre desplegable. Vercel genera entornos de preview para
                revisar los cambios y publica automáticamente la versión estable
                de master.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest">
            <p className="text-xs font-body font-bold uppercase tracking-wider text-primary mb-2">
              Herramientas utilizadas
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Git y GitHub',
                'GitHub Actions',
                'React Doctor',
                'Husky',
                'ESLint',
                'Vitest',
                'Testing Library',
                'SonarQube',
                'Vite',
                'Vercel',
                'Firebase Auth',
                'Firestore',
                'Cloud Functions',
              ].map((herramienta) => (
                <span
                  key={herramienta}
                  className="bg-surface-container-lowest border border-surface-container-highest px-3 py-1.5 rounded-full text-sm font-body text-on-surface-variant"
                >
                  {herramienta}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary-container/40 rounded-2xl p-5 border border-secondary/20">
              <p className="text-sm font-body font-bold text-on-surface mb-2">
                Implementado actualmente
              </p>
              <ul className="list-disc list-inside flex flex-col gap-2 font-body text-sm text-on-surface-variant">
                <li>
                  Git Flow con ramas master, develop y ramas de funcionalidad.
                </li>
                <li>
                  Pull Requests con revisión y análisis estático de React
                  Doctor.
                </li>
                <li>
                  Workflow de CI que ejecuta npm ci, lint, pruebas con cobertura
                  y build.
                </li>
                <li>Husky ejecuta Prettier y ESLint antes de cada commit.</li>
                <li>
                  Pruebas automatizadas con Vitest, React Testing Library y
                  jsdom.
                </li>
                <li>
                  Análisis estático y de calidad con SonarQube y reporte de
                  cobertura.
                </li>
                <li>
                  Vercel publica previews de develop y producción desde master.
                </li>
              </ul>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest">
              <p className="text-sm font-body font-bold text-on-surface mb-2">
                Mejoras propuestas
              </p>
              <ul className="list-disc list-inside flex flex-col gap-2 font-body text-sm text-on-surface-variant">
                <li>
                  Ampliar la cobertura con pruebas de integración y de extremo a
                  extremo.
                </li>
                <li>
                  Configurar el quality gate de SonarQube como condición
                  bloqueante del pipeline.
                </li>
                <li>
                  Agregar una etapa de análisis de seguridad y gestión de
                  artefactos.
                </li>
                <li>
                  Hacer bloqueante el análisis de React Doctor cuando el equipo
                  lo valide.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 border border-surface-container-highest shadow-md flex flex-col gap-5">
          <SectionTitle icon="fact_check">
            Actividad 1: Verdadero o falso
          </SectionTitle>

          <div className="flex flex-col gap-4">
            {respuestasVerdaderoFalso.map((item) => (
              <article
                key={item.numero}
                className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest"
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-body font-bold text-sm">
                    {item.numero}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-body font-bold text-on-surface">
                        {item.afirmacion}
                      </h3>
                      <span
                        className={
                          item.respuesta === 'V'
                            ? 'bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-xs font-bold'
                            : 'bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full text-xs font-bold'
                        }
                      >
                        {item.respuesta}
                      </span>
                    </div>
                    <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                      {item.fundamento}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 border border-surface-container-highest shadow-md flex flex-col gap-5">
          <SectionTitle icon="table_chart">
            Actividad 2: Beneficios de la Integración Continua
          </SectionTitle>

          <div className="overflow-hidden rounded-2xl border border-surface-container-highest">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-body text-sm font-bold text-on-surface">
                    Beneficio
                  </th>
                  <th className="px-4 py-3 font-body text-sm font-bold text-on-surface">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody>
                {beneficiosCI.map((item, index) => (
                  <tr
                    key={item.beneficio}
                    className={
                      index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-low'
                    }
                  >
                    <td className="px-4 py-3 font-body text-sm font-semibold text-on-surface align-top">
                      {item.beneficio}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-on-surface-variant align-top">
                      {item.descripcion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 border border-surface-container-highest shadow-md flex flex-col gap-5">
          <SectionTitle icon="build_circle">
            Actividad 3: Herramienta propuesta
          </SectionTitle>

          <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest">
            <p className="font-body text-on-surface mb-3">
              <strong>Herramienta propuesta:</strong> SonarQube, como
              complemento de GitHub Actions, GitLab CI/CD o Jenkins, que son las
              plataformas que ejecutan el pipeline.
            </p>
            <p className="font-body font-bold text-on-surface mb-2">
              Justificación
            </p>
            <ol className="list-decimal list-inside flex flex-col gap-2 font-body text-sm text-on-surface-variant">
              <li>
                Está ubicada entre las herramientas de la etapa de prueba,
                destinadas a analizar la base de código, por lo que completa a
                los ejecutores de pipelines con un control específico de
                calidad.
              </li>
              <li>
                Permite implementar la política de quality gate: el pipeline
                sólo avanza a la siguiente etapa si se cumplen determinados
                criterios de calidad, combinando las pruebas automatizadas con
                el análisis de calidad del código.
              </li>
              <li>
                Responde a las buenas prácticas de la unidad: incorporar
                análisis de seguridad, revisar periódicamente el desempeño del
                pipeline y sostener el código limpio. Además, el análisis
                estático y la verificación de estilo pueden ejecutarse
                automáticamente al crear un Pull Request, validando el código
                antes de incorporarlo a la rama principal.
              </li>
              <li>
                Beneficio esperado: mayor calidad del software y detección
                temprana de errores, con menos carga de revisión manual y
                retroalimentación inmediata para el equipo.
              </li>
            </ol>
            <div className="mt-4 bg-surface-container-lowest rounded-xl p-4 border border-surface-container-highest">
              <p className="text-xs font-body font-bold uppercase tracking-wider text-primary mb-1">
                Ubicación en el pipeline
              </p>
              <p className="font-mono text-sm text-on-surface-variant break-words">
                Source - Build - Test (unitarias, integración y SonarQube) -
                Package - Security - Deploy
              </p>
              <p className="font-body text-sm text-on-surface-variant mt-2">
                Se ejecuta ante un push o al crear un Pull Request y, si no se
                cumple el quality gate, el pipeline se detiene y se notifica al
                equipo.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 border border-surface-container-highest shadow-md flex flex-col gap-6">
          <SectionTitle icon="quiz">Actividad 4: Interrogantes</SectionTitle>

          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              Relación entre la Unidad 3 y la Unidad 4
            </h3>
            <p className="font-body text-on-surface-variant">
              Las buenas prácticas de programación (código limpio,
              refactorización, revisión de código, convenciones y pruebas) se
              relacionan con la Unidad 4 de la siguiente manera:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relacionesUnidad3.map((item) => (
                <article
                  key={item.titulo}
                  className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest"
                >
                  <h4 className="font-body font-bold text-on-surface mb-2">
                    {item.titulo}
                  </h4>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                    {item.detalle}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-surface-container-highest pt-6">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              ¿Cómo modifica CI/CD el proceso tradicional y qué beneficios
              aporta?
            </h3>
            <div className="flex flex-col gap-3">
              {mejorasCI_CD.map((item) => (
                <article
                  key={item.titulo}
                  className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest"
                >
                  <h4 className="font-body font-bold text-on-surface mb-2">
                    {item.titulo}
                  </h4>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                    {item.detalle}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-surface-container-highest pt-6">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              Mejoras en el trabajo colaborativo y la calidad del software
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest">
                <h4 className="font-body font-bold text-on-surface mb-2">
                  Trabajo colaborativo
                </h4>
                <ul className="list-disc list-inside flex flex-col gap-2 font-body text-sm text-on-surface-variant">
                  {mejorasColaborativas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest">
                <h4 className="font-body font-bold text-on-surface mb-2">
                  Calidad del software
                </h4>
                <ul className="list-disc list-inside flex flex-col gap-2 font-body text-sm text-on-surface-variant">
                  {mejorasCalidad.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-surface-container-highest pt-6">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              ¿Cómo se podría incorporar la IA a los contenidos de la Unidad 4?
            </h3>
            <p className="font-body text-on-surface-variant">
              La Unidad 4 no desarrolla contenidos específicos de Inteligencia
              Artificial; por ello se propone incorporarla como asistente en las
              etapas que la unidad ya describe, manteniendo siempre el control
              humano y sometiendo lo que genere la IA a las mismas validaciones
              del pipeline: pruebas, quality gates y code review.
            </p>
            <ul className="list-disc list-inside flex flex-col gap-2 font-body text-sm text-on-surface-variant">
              {usosIA.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container-highest text-center">
          <p className="font-body text-sm text-on-surface-variant">
            Entrega Parte 1 - Unidad 4 - Centro Educativo Educar para
            Transformar
          </p>
        </div>
      </main>
    </div>
  );
};

export default Tp4;
