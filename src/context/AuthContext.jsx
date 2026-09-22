/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Escuchar cambios en el estado de autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obtener los claims personalizados para el rol
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          const role = idTokenResult.claims.role || 'Estudiante'; // Por defecto alumno si no posee claims
          const studentId = idTokenResult.claims.studentId || null;

          // Buscar datos de perfil extendidos en Firestore
          let profileData = {};
          if (role === 'Estudiante') {
            const docRef = doc(db, 'students', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              profileData = docSnap.data();
            }
          } else {
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              profileData = docSnap.data();
            }
          }

          const loggedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role,
            studentId,
            ...profileData
          };

          setUser(loggedUser);
          localStorage.setItem('school_user', JSON.stringify(loggedUser));
        } catch (error) {
          console.error("Error obteniendo claims/perfil de Firebase:", error);
          setUser(null);
          localStorage.removeItem('school_user');
        }
      } else {
        setUser(null);
        localStorage.removeItem('school_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Método de Login integrado con Firebase.
   * Detecta automáticamente el método según el identificador:
   * - Si contiene '@' se trata de un email (tutores, staff, administradores)
   * - Si no (ej. EST-2026-XXXXX) se trata de un estudiante
   */
  const loginReal = async (identifier, password) => {
    const isStudent = !identifier.includes('@');

    if (isStudent) {
      // Iniciar sesión de alumno usando la Cloud Function cf_loginStudent (devuelve customToken)
      const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1' : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_loginStudent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentID_login: identifier, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        const error = new Error(errData.error || 'Credenciales de alumno incorrectas.');
        if (response.status === 401) error.code = 'Credenciales incorrectas';
        throw error;
      }

      const { customToken } = await response.json();
      
      // Logear en Firebase Auth cliente usando el customToken retornado por el backend
      return signInWithCustomToken(auth, customToken);
    } else {
      // Logear tutores, staff o administradores con email y contraseña estándar en Firebase Auth
      return signInWithEmailAndPassword(auth, identifier, password);
    }
  };

  /**
   * Método de Logout
   */
  const logoutReal = async () => {
    await signOut(auth);
  };

  /**
   * Método para cambiar contraseña y limpiar la bandera mustChangePassword
   */
  const changePasswordReal = async (newPassword) => {
    if (!user) throw new Error("No hay un usuario autenticado.");

    const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5001/centro-educativo-f5cc5/us-central1' : 'https://us-central1-centro-educativo-f5cc5.cloudfunctions.net');
    const idToken = await auth.currentUser.getIdToken(true);

    if (user.role === 'Estudiante') {
      // Para estudiantes: Llamar a cf_changeStudentPassword (hashing interno en Firestore)
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_changeStudentPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          studentId: user.uid,
          newPassword
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al actualizar contraseña del alumno.');
      }
    } else {
      // Para Padres / Personal: el cambio de contraseña se realiza del lado del servidor
      // (cf_completePasswordChange) usando el ID token previo a cualquier modificación,
      // ya que Firebase invalida los tokens emitidos después de cambiar la contraseña.
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cf_completePasswordChange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al actualizar la contraseña.');
      }
    }

    // Actualizar el estado del usuario localmente para remover el bloqueo de contraseña
    setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
    
    // Sincronizar en localStorage
    const savedUser = localStorage.getItem('school_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      parsed.mustChangePassword = false;
      localStorage.setItem('school_user', JSON.stringify(parsed));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login: loginReal, logout: logoutReal, changePassword: changePasswordReal, isLoggedIn: !!user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
