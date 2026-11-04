/// <reference types="cypress" />

import { ALUMNO, DOCENTE, MATERIA_MATEMATICA } from '../support/constants';

describe('CP-DOC-001 - Carga y persistencia de calificaciones', () => {
  const anio = new Date().getFullYear();
  let docenteToken = null;
  let alumnoId = null;

  before(() => {
    cy.apiLogin(DOCENTE.email, DOCENTE.password)
      .then((sesion) => {
        docenteToken = sesion.idToken;
        return cy.apiGetDocentePanel(docenteToken, anio);
      })
      .then((panel) => {
        const materia = panel.materias.find(
          (item) => item.id === MATERIA_MATEMATICA.id
        );
        expect(materia, 'Matemática asignada al docente').to.exist;

        const alumna = materia.alumnos.find(
          (item) => item.nombre === ALUMNO.nombre
        );
        expect(alumna, 'Lucía Gómez inscripta en Matemática').to.exist;
        alumnoId = alumna.id;

        return cy.apiSaveGrades(docenteToken, {
          materiaId: MATERIA_MATEMATICA.id,
          trimestre: 1,
          anio,
          grades: [{ studentId: alumnoId, notas: [10, 10] }],
        });
      })
      .then((response) => {
        expect(response.status, 'reset de notas iniciales').to.equal(200);
      });
  });

  it('el docente guarda notas, persisten al recargar y la alumna las ve en su boletín', () => {
    cy.loginDocenteUI();
    cy.get(`[data-testid="materia-${MATERIA_MATEMATICA.id}"]`).click();
    cy.get('[data-testid="trimestre-1"]').click();

    cy.get(`[data-testid="alumno-${alumnoId}"]`, { timeout: 20000 }).within(
      () => {
        cy.get('input[aria-label^="Nota 1"]').clear().type('8');
        cy.get('input[aria-label^="Nota 2"]').clear().type('9');
        cy.contains('8.50').should('be.visible');
      }
    );

    cy.get('[data-testid="guardar-notas"]').click();
    cy.get('[data-testid="save-message"]')
      .should('be.visible')
      .and('contain', 'Calificaciones guardadas correctamente.');

    cy.reload();
    cy.contains('h1', 'Panel Docente').should('be.visible');
    cy.get(`[data-testid="materia-${MATERIA_MATEMATICA.id}"]`).click();
    cy.get('[data-testid="trimestre-1"]').click();

    cy.get(`[data-testid="alumno-${alumnoId}"]`).within(() => {
      cy.get('input[aria-label^="Nota 1"]').should('have.value', '8');
      cy.get('input[aria-label^="Nota 2"]').should('have.value', '9');
      cy.contains('8.50').should('be.visible');
    });

    cy.contains('button', 'Cerrar Sesión').click();
    cy.loginAlumnoUI();

    cy.get('[data-testid="boletin-trimestre-1"]').within(() => {
      cy.get('[data-testid="boletin-sec-matematica-t1"]').within(() => {
        cy.contains(MATERIA_MATEMATICA.nombre).should('be.visible');
        cy.contains('8.50').should('be.visible');
      });
    });
  });
});
