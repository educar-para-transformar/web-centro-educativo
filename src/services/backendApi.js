import { auth } from './firebase';

export const getFunctionsBaseUrl = () =>
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1'
    : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');

const getBackendToken = async () => {
  if (auth.currentUser) {
    return auth.currentUser.getIdToken();
  }
  return 'mock-admin-token';
};

const callBackend = async (
  endpoint,
  { method = 'POST', body, params, requiresAuth = true } = {}
) => {
  let url = `${getFunctionsBaseUrl()}/${endpoint}`;
  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    const query = search.toString();
    if (query) url += `?${query}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    headers.Authorization = `Bearer ${await getBackendToken()}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error al llamar a ${endpoint}.`);
  }
  return data;
};

export const resendActivationLink = (targetType, targetId) =>
  callBackend('cf_resendActivationLink', { body: { targetType, targetId } });

export const updateParentEmailAndResend = (parentUid, newEmail) =>
  callBackend('cf_updateParentEmailAndResend', {
    body: { parentUid, newEmail },
  });

export const activateStudentAccount = (studentId, token, newPassword) =>
  callBackend('cf_activateStudentAccount', {
    body: { studentId, token, newPassword },
    requiresAuth: false,
  });

export const resetStudentPassword = (studentId) =>
  callBackend('cf_resetStudentPassword', { body: { studentId } });

export const seedMateriasYCalificaciones = ({ nivel, studentId, anio } = {}) =>
  callBackend('cf_seedMateriasYCalificaciones', {
    body: { nivel, studentId, anio },
  });

export const upsertSchedule = (payload) =>
  callBackend('cf_upsertSchedule', { body: payload });

export const deleteSchedule = (scheduleId) =>
  callBackend('cf_deleteSchedule', { body: { scheduleId } });

export const registrarPago = (payload) =>
  callBackend('cf_registrarPago', { body: payload });

export const seedCuotas = ({ anio, mesHasta } = {}) =>
  callBackend('cf_seedCuotas', { body: { anio, mesHasta } });
