/// <reference types="cypress" />

import {
  DOCENTE,
  MATERIA_MATEMATICA,
  MATERIA_NO_ASIGNADA,
} from '../../support/constants';

describe('Regresión - Módulo Docente y Boletín', () => {
  const anio = new Date().getFullYear();
  let docenteToken = null;
  let docenteUid = null;
  let alumnoId = null;

  before(() => {
    cy.apiLogin(DOCENTE.email, DOCENTE.password)
      .then((sesion) => {
        docenteToken = sesion.idToken;
        docenteUid = sesion.localId;
        return cy.apiGetDocentePanel(docenteToken, anio);
      })
      .then((panel) => {
        const materia = panel.materias.find(
          (item) => item.id === MATERIA_MATEMATICA.id
        );
        expect(materia, 'Matemática asignada al docente').to.exist;
        const alumna = materia.alumnos.find(
          (item) => item.nombre === 'Lucía Gómez'
        );
        expect(alumna, 'Lucía Gómez inscripta en Matemática').to.exist;
        alumnoId = alumna.id;
      });
  });

  beforeEach(() => {
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.clearAllCookies();
  });

  it('CP-REG-001 - guardar dos veces las mismas notas no duplica registros', () => {
    const payload = {
      materiaId: MATERIA_MATEMATICA.id,
      trimestre: 1,
      anio,
      grades: [{ studentId: alumnoId, notas: [8, 9] }],
    };

    cy.apiSaveGrades(docenteToken, payload).its('status').should('equal', 200);
    cy.apiSaveGrades(docenteToken, {
      ...payload,
      grades: [{ studentId: alumnoId, notas: [7, 9] }],
    })
      .its('status')
      .should('equal', 200);

    cy.apiGetDocentePanel(docenteToken, anio).then((panel) => {
      const materia = panel.materias.find(
        (item) => item.id === MATERIA_MATEMATICA.id
      );
      const registros = materia.calificaciones.filter(
        (item) => item.studentId === alumnoId && item.trimestre === 1
      );

      expect(registros, 'un único documento de calificaciones').to.have.length(
        1
      );
      expect(registros[0].notas, 'notas actualizadas').to.deep.equal([7, 9]);
    });

    cy.loginAlumnoUI();
    cy.get('[data-testid="boletin-trimestre-1"]').within(() => {
      cy.get('[data-testid="boletin-sec-matematica-t1"]').within(() => {
        cy.contains('8.00').should('be.visible');
      });
    });
  });

  it('CP-REG-002 - el admin crea una materia y la asigna a un docente', () => {
    const nombre = `Materia Regresión ${Date.now()}`;

    cy.apiLogin('admin@centro.local', 'admin1234')
      .then((sesion) => {
        return cy.apiCreateMateria(sesion.idToken, {
          nombre,
          nivel: 'secundaria',
          profesorUid: docenteUid,
        });
      })
      .then((response) => {
        expect(response.status, 'alta de materia').to.equal(201);
        expect(response.body.nombre).to.equal(nombre);
      });

    cy.loginAdminUI();
    cy.contains('button', 'Materias').click();
    cy.contains(nombre, { timeout: 20000 }).should('be.visible');
    cy.contains(nombre)
      .parents('tr')
      .within(() => {
        cy.contains(DOCENTE.nombre).should('be.visible');
      });
  });

  it('CP-REG-003 - el docente ve únicamente sus materias asignadas', () => {
    cy.loginDocenteUI();
    cy.contains('h2', 'Mis materias').should('be.visible');

    cy.get(`[data-testid="materia-${MATERIA_MATEMATICA.id}"]`).should('exist');
    cy.get(`[data-testid="materia-${MATERIA_NO_ASIGNADA.id}"]`).should(
      'not.exist'
    );
    cy.get('[data-testid="materia-sec-fisica"]').should('not.exist');
  });

  it('CP-REG-004 - el alumno ve sus notas y promedios en el boletín', () => {
    cy.apiSaveGrades(docenteToken, {
      materiaId: MATERIA_MATEMATICA.id,
      trimestre: 1,
      anio,
      grades: [{ studentId: alumnoId, notas: [8, 9] }],
    })
      .its('status')
      .should('equal', 200);

    cy.loginAlumnoUI();
    cy.contains('Promedio General').should('be.visible');
    cy.get('[data-testid="boletin-trimestre-1"]').within(() => {
      cy.get('[data-testid="boletin-sec-matematica-t1"]').within(() => {
        cy.contains(MATERIA_MATEMATICA.nombre).should('be.visible');
        cy.contains('8.50').should('be.visible');
      });
    });
  });

  it('CP-REG-005 - guardar en una materia no asignada responde 403', () => {
    cy.apiSaveGrades(docenteToken, {
      materiaId: MATERIA_NO_ASIGNADA.id,
      trimestre: 1,
      anio,
      grades: [{ studentId: alumnoId, notas: [8] }],
    }).then((response) => {
      expect(response.status, 'materia no asignada').to.equal(403);
      expect(String(response.body.error).toLowerCase()).to.contain('permiso');
    });
  });
});
