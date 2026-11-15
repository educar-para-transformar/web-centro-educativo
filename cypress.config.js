import { defineConfig } from 'cypress';

const BASE_URL = process.env.CYPRESS_BASE_URL || 'http://localhost:5173';
const PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'centro-educativo-f5cc5';

export default defineConfig({
  e2e: {
    baseUrl: BASE_URL,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 20000,
    responseTimeout: 30000,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    expose: {
      AUTH_EMULATOR_URL:
        process.env.CYPRESS_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099',
      FIRESTORE_EMULATOR_URL:
        process.env.CYPRESS_FIRESTORE_EMULATOR_URL || 'http://127.0.0.1:8080',
      FUNCTIONS_BASE_URL:
        process.env.CYPRESS_FUNCTIONS_BASE_URL ||
        `http://127.0.0.1:5001/${PROJECT_ID}/us-central1`,
      FIREBASE_PROJECT_ID: PROJECT_ID,
    },
  },
});
