import { ADMIN, ALUMNO, DOCENTE } from './constants';

const AUTH_EMULATOR_URL = () => Cypress.expose('AUTH_EMULATOR_URL');
const FUNCTIONS_BASE_URL = () => Cypress.expose('FUNCTIONS_BASE_URL');

Cypress.Commands.add('ensureLoggedOut', () => {
  cy.visit('/login');
  cy.get('body', { timeout: 20000 }).should(($body) => {
    const tieneFormulario = $body.find('#identifier').length > 0;
    const tieneSesion =
      $body.find('button').filter(':contains("Cerrar Sesión")').length > 0;
    expect(
      tieneFormulario || tieneSesion,
      'formulario de login o sesión activa'
    ).to.equal(true);
  });

  cy.get('body').then(($body) => {
    if ($body.find('#identifier').length === 0) {
      cy.contains('button', 'Cerrar Sesión').click({ force: true });
    }
  });

  cy.get('#identifier', { timeout: 20000 }).should('be.visible');
});

Cypress.Commands.add('loginDocenteUI', () => {
  cy.ensureLoggedOut();
  cy.get('#identifier').clear().type(DOCENTE.email);
  cy.get('#password').clear().type(DOCENTE.password);
  cy.contains('button', 'Acceso Seguro').click();
  cy.contains('h1', 'Panel Docente', { timeout: 30000 }).should('be.visible');
});

Cypress.Commands.add('loginAdminUI', () => {
  cy.ensureLoggedOut();
  cy.get('#identifier').clear().type(ADMIN.email);
  cy.get('#password').clear().type(ADMIN.password);
  cy.contains('button', 'Acceso Seguro').click();
  cy.contains('h1', 'Panel de Administración', { timeout: 30000 }).should(
    'be.visible'
  );
});

Cypress.Commands.add(
  'loginAlumnoUI',
  (identifier = ALUMNO.identifier, password = ALUMNO.password) => {
    cy.ensureLoggedOut();
    cy.get('#identifier').clear().type(identifier);
    cy.get('#password').clear().type(password);
    cy.contains('button', 'Acceso Seguro').click();
    cy.contains('h1', 'Mi Panel de Estudiante', { timeout: 30000 }).should(
      'be.visible'
    );
  }
);

Cypress.Commands.add('apiLogin', (email, password) => {
  return cy
    .request({
      method: 'POST',
      url: `${AUTH_EMULATOR_URL()}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-api-key`,
      body: { email, password, returnSecureToken: true },
      failOnStatusCode: false,
    })
    .then((response) => {
      expect(response.status, `login de ${email}`).to.equal(200);
      return response.body;
    });
});

Cypress.Commands.add(
  'apiGetDocentePanel',
  (token, anio = new Date().getFullYear()) => {
    return cy
      .request({
        method: 'GET',
        url: `${FUNCTIONS_BASE_URL()}/cf_getDocentePanel?anio=${anio}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
      .then((response) => {
        expect(response.status, 'panel docente').to.equal(200);
        return response.body;
      });
  }
);

Cypress.Commands.add('apiSaveGrades', (token, payload) => {
  return cy.request({
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL()}/cf_saveGrades`,
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('apiCreateMateria', (token, payload) => {
  return cy.request({
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL()}/cf_createMateria`,
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('apiUpdateMateria', (token, payload) => {
  return cy.request({
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL()}/cf_updateMateria`,
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
    failOnStatusCode: false,
  });
});
