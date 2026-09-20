# 🏫 Proyecto Centro Educativo "Educar para Transformar"

Este es el repositorio oficial para el desarrollo del ecosistema digital del centro educativo.

---

## 🛠 Guía de Trabajo con Ramas (Git Flow)

Para mantener la estabilidad del proyecto y asegurar que las entregas sean consistentes, utilizaremos un flujo de trabajo basado en dos ramas principales:

### 1. Rama `master` (Producción)
* **Propósito:** Contiene la versión estable, testeada y funcional del proyecto.
* **Despliegue:** Es la rama que Vercel utiliza para generar la URL oficial que verán los docentes.
* **Regla de oro:** **NUNCA** se trabaja directamente sobre esta rama. Solo se reciben cambios mediante *merges* desde `develop`.

### 2. Rama `develop` (Desarrollo e Integración)
* **Propósito:** Es nuestra rama de trabajo diario. Aquí es donde integramos las nuevas funcionalidades y correcciones de errores.
* **Despliegue:** Vercel generará automáticamente una **Preview URL** cada vez que subamos cambios aquí para que podamos testearlos en vivo.

### 3. Rama `mejora-buenas-practicas` (Rama de Trabajo y Avances)
* **Propósito:** Es nuestra rama de mejoras en clase y tareas. Corregimos errores, mejoramos el código.
* **Despliegue:** Sin despliegue.

---

## 🔄 Comandos Rápidos para el Equipo

### 🔹 Al iniciar una tarea de desarrollo:
Asegúrate de tener la última versión del código de tus compañeros:
```
git checkout develop
git pull origin develop
```
Al finalizar una tarea
Cuando hayas terminado de maquetar un componente o página (ej. Wellness.jsx o Registration.jsx):
```
git add .
git commit -m "Tipo de cambio: Descripción breve de lo que hiciste"
git push origin develop
```
### 🔹 Para pasar a Producción (Vía Pull Request)
Cuando la rama `develop` sea estable y esté lista para la entrega oficial:
1.  Andá a GitHub y seleccioná **"New Pull Request"**.
2.  Configurá `base: master` <- `compare: develop`.
3.  Asigná a un compañero para que revise los cambios (**Reviewers**).
4.  Una vez aprobado, realizá el **"Merge pull request"**.

### 🚀 Entorno y Tecnologías
* Frontend: React + Vite
* Estilos: CSS Modules
* Despliegue: Vercel
* Control de Versiones: Git / GitHub
* Calidad de Código: Husky + Prettier + ESLint

### 👥 Integrantes del Equipo
* Lautaro Höfer
* Pablo Ramírez