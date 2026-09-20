"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cf_seedMateriasYCalificaciones = exports.cf_getStudentGrades = exports.cf_completePasswordChange = exports.cf_updateUserProfile = exports.cf_changeStudentPassword = exports.cf_resetUserPasswordToDni = exports.cf_createAdministrativeUser = exports.cf_resetStudentPassword = exports.cf_loginStudent = exports.cf_activateStudentAccount = exports.cf_updateParentEmailAndResend = exports.cf_resendActivationLink = exports.cf_createParentAndStudents = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcryptjs"));
const email_1 = require("./email");
// Inicializar la SDK de Admin de Firebase
admin.initializeApp();
const db = admin.firestore();
/**
 * Helper para verificar el ID Token del llamador y retornar sus Claims decodificados.
 */
async function verifyAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No autorizado: Cabecera Authorization faltante o inválida.');
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    }
    catch (err) {
        throw new Error('No autorizado: Token de ID inválido.');
    }
}
/**
 * Genera un ID único para estudiante en el formato EST-YYYY-XXXXX
 */
async function generateUniqueStudentIdLogin() {
    const year = new Date().getFullYear();
    let unique = false;
    let studentID = '';
    while (!unique) {
        const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 dígitos aleatorios
        studentID = `EST-${year}-${randomDigits}`;
        const snapshot = await db.collection('students')
            .where('studentID_login', '==', studentID)
            .limit(1)
            .get();
        if (snapshot.empty) {
            unique = true;
        }
    }
    return studentID;
}
/**
 * 1. cf_createParentAndStudents
 * Invocada por un user_admin para crear un padre y sus hijos.
 */
exports.cf_createParentAndStudents = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        // Validar autorización
        const callerClaims = await verifyAuth(req);
        if (callerClaims.role !== 'user_admin') {
            res.status(403).send({ error: 'Permisos insuficientes: Requiere rol user_admin.' });
            return;
        }
        const { parentEmail, parentName, parentDni, students } = req.body;
        if (!parentEmail || !parentDni || !parentName || !students || !Array.isArray(students)) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (parentEmail, parentDni, parentName, students).' });
            return;
        }
        // Crear usuario del Padre en Auth usando su DNI como contraseña inicial
        const parentUser = await admin.auth().createUser({
            email: parentEmail,
            emailVerified: true,
            password: parentDni.trim()
        });
        // Establecer Custom Claim para el Padre
        await admin.auth().setCustomUserClaims(parentUser.uid, { role: 'Padre' });
        const studentDocIds = [];
        const createdStudentsInfo = [];
        // Procesar cada estudiante
        for (const student of students) {
            if (!student.nombre || !student.dni) {
                continue;
            }
            const studentID_login = await generateUniqueStudentIdLogin();
            // Hashear el DNI del alumno como su contraseña por defecto
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(student.dni.trim(), salt);
            const studentRef = await db.collection('students').add({
                studentID_login,
                parentId: parentUser.uid,
                emailPadre: parentEmail,
                hashedPassword,
                status: 'active',
                mustChangePassword: true,
                nombre: student.nombre || '',
                dni: student.dni || '',
                genero: student.genero || '',
                fechaNacimiento: student.fechaNacimiento || '',
                nivel: student.nivel || 'inicial',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            studentDocIds.push(studentRef.id);
            createdStudentsInfo.push({
                id: studentRef.id,
                studentID_login,
                nombre: student.nombre
            });
        }
        // Guardar los datos del Padre en Firestore
        await db.collection('users').doc(parentUser.uid).set({
            role: 'Padre',
            email: parentEmail,
            nombre: parentName || '',
            dni: parentDni.trim(),
            mustChangePassword: true,
            emailInvalid: false,
            studentIds: studentDocIds,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(201).send({
            parentUid: parentUser.uid,
            students: createdStudentsInfo
        });
    }
    catch (error) {
        console.error('Error en cf_createParentAndStudents:', error);
        res.status(500).send({ error: error.message || 'Error interno del servidor.' });
    }
});
/**
 * 2. cf_resendActivationLink
 * Reenvía enlace de activación (de padre o de estudiante).
 */
exports.cf_resendActivationLink = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        const { targetType, targetId } = req.body;
        if (!targetType || !targetId) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (targetType, targetId).' });
            return;
        }
        const redirectUrl = process.env.REDIRECT_URL || 'http://localhost:5173/auth-action';
        if (targetType === 'parent') {
            // Solo el propio padre o un user_admin puede reenviar la activación del padre
            if (callerClaims.role !== 'user_admin' && callerClaims.uid !== targetId) {
                res.status(403).send({ error: 'Permisos insuficientes.' });
                return;
            }
            const parentDoc = await db.collection('users').doc(targetId).get();
            if (!parentDoc.exists) {
                res.status(404).send({ error: 'Padre no encontrado.' });
                return;
            }
            const parentData = parentDoc.data();
            const parentEmail = parentData?.email;
            const actionCodeSettings = {
                url: redirectUrl,
                handleCodeInApp: true
            };
            const emailLink = await admin.auth().generateEmailVerificationLink(parentEmail, actionCodeSettings);
            const htmlContent = `
        <h1>Verificación de Correo - Educar para Transformar</h1>
        <p>Hola ${parentData?.nombre || 'Tutor'},</p>
        <p>Recibimos una solicitud para reenviar el enlace de verificación de su cuenta. Por favor, ingrese al siguiente enlace:</p>
        <p><a href="${emailLink}">Verificar Correo</a></p>
      `;
            await (0, email_1.sendEmail)({
                to: parentEmail,
                subject: 'Enlace de Verificación de Cuenta - Educar para Transformar',
                html: htmlContent
            });
            // Si estaba marcado como inválido, limpiarlo
            if (parentData?.emailInvalid) {
                await db.collection('users').doc(targetId).update({ emailInvalid: false });
            }
            res.status(200).send({ message: 'Enlace de verificación enviado con éxito al tutor.' });
        }
        else if (targetType === 'student') {
            const studentDoc = await db.collection('students').doc(targetId).get();
            if (!studentDoc.exists) {
                res.status(404).send({ error: 'Estudiante no encontrado.' });
                return;
            }
            const studentData = studentDoc.data();
            // Solo user_admin o el propio padre asociado pueden reenviar el token de este estudiante
            if (callerClaims.role !== 'user_admin' && callerClaims.uid !== studentData?.parentId) {
                res.status(403).send({ error: 'Permisos insuficientes.' });
                return;
            }
            const activationToken = crypto.randomBytes(32).toString('hex');
            const activationTokenExpires = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));
            await db.collection('students').doc(targetId).update({
                activationToken,
                activationTokenExpires
            });
            const customLink = `${redirectUrl}?mode=activateStudent&token=${activationToken}&studentId=${targetId}`;
            const htmlContent = `
        <h1>Activación de Cuenta de Estudiante</h1>
        <p>Hola,</p>
        <p>Se ha generado un nuevo enlace para activar la cuenta del estudiante <strong>${studentData?.nombre || ''}</strong> (Usuario: ${studentData?.studentID_login}).</p>
        <p>Haga clic en el siguiente enlace para establecer su contraseña:</p>
        <p><a href="${customLink}">Establecer Contraseña del Estudiante</a></p>
        <p>Este enlace es válido por 48 horas.</p>
      `;
            await (0, email_1.sendEmail)({
                to: studentData?.emailPadre,
                subject: `Enlace de Activación para ${studentData?.nombre || 'Estudiante'} - Educar para Transformar`,
                html: htmlContent
            });
            res.status(200).send({ message: 'Enlace de activación de estudiante enviado al correo del tutor.' });
        }
        else {
            res.status(400).send({ error: 'targetType inválido. Debe ser parent o student.' });
        }
    }
    catch (error) {
        console.error('Error en cf_resendActivationLink:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 3. cf_updateParentEmailAndResend
 * Invocada por un administrador para corregir el correo electrónico de un padre y volver a enviar la activación.
 */
exports.cf_updateParentEmailAndResend = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        if (callerClaims.role !== 'user_admin') {
            res.status(403).send({ error: 'Permisos insuficientes: Requiere rol user_admin.' });
            return;
        }
        const { parentUid, newEmail } = req.body;
        if (!parentUid || !newEmail) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (parentUid, newEmail).' });
            return;
        }
        // 1. Actualizar en Firebase Authentication
        await admin.auth().updateUser(parentUid, {
            email: newEmail,
            emailVerified: false
        });
        // 2. Actualizar en Firestore users
        await db.collection('users').doc(parentUid).update({
            email: newEmail,
            emailInvalid: false
        });
        // 3. Buscar hijos y actualizar emailPadre
        const parentDoc = await db.collection('users').doc(parentUid).get();
        const studentIds = parentDoc.data()?.studentIds || [];
        if (studentIds.length > 0) {
            const batch = db.batch();
            for (const studentId of studentIds) {
                const studentRef = db.collection('students').doc(studentId);
                batch.update(studentRef, { emailPadre: newEmail });
            }
            await batch.commit();
        }
        // 4. Generar y enviar nuevo enlace de verificación
        const redirectUrl = process.env.REDIRECT_URL || 'http://localhost:5173/auth-action';
        const actionCodeSettings = {
            url: redirectUrl,
            handleCodeInApp: true
        };
        const emailLink = await admin.auth().generateEmailVerificationLink(newEmail, actionCodeSettings);
        const htmlContent = `
      <h1>Actualización de Correo y Activación de Cuenta</h1>
      <p>Hola ${parentDoc.data()?.nombre || 'Tutor'},</p>
      <p>Un administrador ha corregido su dirección de correo electrónico en nuestra plataforma. Para verificar su cuenta y activarla, por favor haga clic en el siguiente enlace:</p>
      <p><a href="${emailLink}">Activar Cuenta con nuevo Correo</a></p>
    `;
        await (0, email_1.sendEmail)({
            to: newEmail,
            subject: 'Activación de Cuenta de Tutor - Educar para Transformar',
            html: htmlContent
        });
        res.status(200).send({ message: 'Correo actualizado y nuevo enlace de activación enviado exitosamente.' });
    }
    catch (error) {
        console.error('Error en cf_updateParentEmailAndResend:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 4. cf_activateStudentAccount
 * Invocada desde el frontend de React para que un estudiante establezca su contraseña. Public API.
 */
exports.cf_activateStudentAccount = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const { studentId, token, newPassword } = req.body;
        if (!studentId || !token || !newPassword) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (studentId, token, newPassword).' });
            return;
        }
        const studentRef = db.collection('students').doc(studentId);
        const studentDoc = await studentRef.get();
        if (!studentDoc.exists) {
            res.status(404).send({ error: 'Estudiante no encontrado.' });
            return;
        }
        const studentData = studentDoc.data();
        // Validar token y expiración
        if (studentData?.activationToken !== token) {
            res.status(400).send({ error: 'Token de activación inválido.' });
            return;
        }
        const expires = studentData?.activationTokenExpires;
        if (!expires || expires.toDate() < new Date()) {
            res.status(400).send({ error: 'El token de activación ha expirado.' });
            return;
        }
        // Hashear la contraseña usando bcryptjs
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        // Actualizar estudiante en Firestore
        await studentRef.update({
            hashedPassword,
            status: 'active',
            activationToken: null,
            activationTokenExpires: null
        });
        res.status(200).send({ message: 'Cuenta del estudiante activada con éxito. Ya puede iniciar sesión.' });
    }
    catch (error) {
        console.error('Error en cf_activateStudentAccount:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 5. cf_loginStudent
 * Permite a un estudiante iniciar sesión con su studentID_login y contraseña. Public API.
 */
exports.cf_loginStudent = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const { studentID_login, password } = req.body;
        if (!studentID_login || !password) {
            res.status(400).send({ error: 'Faltan parámetros (studentID_login, password).' });
            return;
        }
        // Buscar estudiante por su ID de inicio de sesión
        const snapshot = await db.collection('students')
            .where('studentID_login', '==', studentID_login)
            .limit(1)
            .get();
        if (snapshot.empty) {
            res.status(401).send({ error: 'ID de estudiante o contraseña incorrectos.' });
            return;
        }
        const studentDoc = snapshot.docs[0];
        const studentData = studentDoc.data();
        // Validar que la cuenta esté activa
        if (studentData.status !== 'active' || !studentData.hashedPassword) {
            res.status(400).send({ error: 'La cuenta del estudiante no ha sido activada o no tiene contraseña.' });
            return;
        }
        // Comparar contraseña con el hash guardado
        const match = await bcrypt.compare(password, studentData.hashedPassword);
        if (!match) {
            res.status(401).send({ error: 'ID de estudiante o contraseña incorrectos.' });
            return;
        }
        // Crear Custom Token de Firebase Auth. Usamos el ID del documento de Firestore como UID del Auth del estudiante.
        const customToken = await admin.auth().createCustomToken(studentDoc.id, {
            role: 'Estudiante',
            studentId: studentID_login
        });
        res.status(200).send({ customToken });
    }
    catch (error) {
        console.error('Error en cf_loginStudent:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 6. cf_resetStudentPassword
 * Envía un enlace de restablecimiento de contraseña para un estudiante al correo del padre.
 */
exports.cf_resetStudentPassword = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        const { studentId } = req.body;
        if (!studentId) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (studentId).' });
            return;
        }
        const studentRef = db.collection('students').doc(studentId);
        const studentDoc = await studentRef.get();
        if (!studentDoc.exists) {
            res.status(404).send({ error: 'Estudiante no encontrado.' });
            return;
        }
        const studentData = studentDoc.data();
        // Validar permisos: Requiere user_admin o ser el padre del estudiante
        if (callerClaims.role !== 'user_admin' && callerClaims.uid !== studentData?.parentId) {
            res.status(403).send({ error: 'Permisos insuficientes.' });
            return;
        }
        // Generar token temporal
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenExpires = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));
        await studentRef.update({
            activationToken,
            activationTokenExpires
        });
        const redirectUrl = process.env.REDIRECT_URL || 'http://localhost:5173/auth-action';
        const resetLink = `${redirectUrl}?mode=resetStudentPassword&token=${activationToken}&studentId=${studentId}`;
        const htmlContent = `
      <h1>Restablecimiento de Contraseña del Estudiante</h1>
      <p>Hola,</p>
      <p>Se ha solicitado restablecer la contraseña para el estudiante <strong>${studentData?.nombre || ''}</strong> (Usuario: ${studentData?.studentID_login}).</p>
      <p>Haga clic en el siguiente enlace para ingresar su nueva contraseña:</p>
      <p><a href="${resetLink}">Restablecer Contraseña</a></p>
      <p>Este enlace es válido por 48 horas.</p>
    `;
        await (0, email_1.sendEmail)({
            to: studentData?.emailPadre,
            subject: `Restablecimiento de Contraseña para ${studentData?.nombre || 'Estudiante'} - Educar para Transformar`,
            html: htmlContent
        });
        res.status(200).send({ message: 'Enlace de restablecimiento de contraseña enviado al correo del tutor.' });
    }
    catch (error) {
        console.error('Error en cf_resetStudentPassword:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 7. cf_createAdministrativeUser
 * Invocada por un user_admin para crear otro administrador, staff (docente) o administrativo.
 */
exports.cf_createAdministrativeUser = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        if (callerClaims.role !== 'user_admin') {
            res.status(403).send({ error: 'Permisos insuficientes: Requiere rol user_admin.' });
            return;
        }
        const { email, name, role, dni } = req.body;
        if (!email || !name || !role || !dni) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (email, name, role, dni).' });
            return;
        }
        const allowedRoles = ['user_admin', 'Staff', 'Administrativo'];
        if (!allowedRoles.includes(role)) {
            res.status(400).send({ error: 'Rol inválido. Debe ser user_admin, Staff o Administrativo.' });
            return;
        }
        // Crear el usuario en Auth usando su DNI como contraseña inicial
        const userRecord = await admin.auth().createUser({
            email,
            password: dni.trim(),
            emailVerified: true,
            displayName: name
        });
        // Asignar Custom Claim
        await admin.auth().setCustomUserClaims(userRecord.uid, { role });
        // Guardar en Firestore
        await db.collection('users').doc(userRecord.uid).set({
            role,
            email,
            nombre: name,
            dni: dni.trim(),
            mustChangePassword: true,
            emailInvalid: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(201).send({
            uid: userRecord.uid
        });
    }
    catch (error) {
        console.error('Error en cf_createAdministrativeUser:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 8. cf_resetUserPasswordToDni
 * Invocada por un user_admin para restablecer la contraseña de cualquier usuario a su DNI.
 */
exports.cf_resetUserPasswordToDni = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        if (callerClaims.role !== 'user_admin') {
            res.status(403).send({ error: 'Permisos insuficientes: Requiere rol user_admin.' });
            return;
        }
        const { userId, userType } = req.body;
        if (!userId || !userType) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (userId, userType).' });
            return;
        }
        if (userType === 'parent' || userType === 'administrative') {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                res.status(404).send({ error: 'Usuario no encontrado.' });
                return;
            }
            const userData = userDoc.data();
            const dni = userData?.dni;
            if (!dni) {
                res.status(400).send({ error: 'El usuario no tiene registrado un DNI.' });
                return;
            }
            // Restablecer contraseña en Auth al DNI
            await admin.auth().updateUser(userId, {
                password: dni.trim()
            });
            // Forzar cambio de contraseña
            await userRef.update({
                mustChangePassword: true
            });
            res.status(200).send({ message: 'Contraseña del usuario restablecida exitosamente a su DNI.' });
        }
        else if (userType === 'student') {
            const studentRef = db.collection('students').doc(userId);
            const studentDoc = await studentRef.get();
            if (!studentDoc.exists) {
                res.status(404).send({ error: 'Estudiante no encontrado.' });
                return;
            }
            const studentData = studentDoc.data();
            const dni = studentData?.dni;
            if (!dni) {
                res.status(400).send({ error: 'El estudiante no tiene registrado un DNI.' });
                return;
            }
            // Generar nuevo hash bcrypt para el DNI del alumno
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(dni.trim(), salt);
            // Actualizar en Firestore
            await studentRef.update({
                hashedPassword,
                mustChangePassword: true
            });
            res.status(200).send({ message: 'Contraseña del estudiante restablecida exitosamente a su DNI.' });
        }
        else {
            res.status(400).send({ error: 'userType inválido. Debe ser parent, administrative o student.' });
        }
    }
    catch (error) {
        console.error('Error en cf_resetUserPasswordToDni:', error);
        res.status(500).send({ error: error.message || 'Error interno del servidor.' });
    }
});
/**
 * 9. cf_changeStudentPassword
 * Invocada por el propio estudiante o administrador para actualizar la contraseña del estudiante.
 */
exports.cf_changeStudentPassword = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        const { studentId, newPassword } = req.body;
        if (!studentId || !newPassword) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (studentId, newPassword).' });
            return;
        }
        // Permitir si es el propio estudiante o si es un administrador
        if (callerClaims.role !== 'user_admin' && callerClaims.uid !== studentId) {
            res.status(403).send({ error: 'Permisos insuficientes.' });
            return;
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.collection('students').doc(studentId).update({
            hashedPassword,
            mustChangePassword: false
        });
        res.status(200).send({ message: 'Contraseña del estudiante actualizada con éxito.' });
    }
    catch (error) {
        console.error('Error en cf_changeStudentPassword:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 10. cf_updateUserProfile
 * Invocada por un user_admin para modificar datos de perfiles (padre, alumno o administrativo).
 */
exports.cf_updateUserProfile = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        if (callerClaims.role !== 'user_admin') {
            res.status(403).send({ error: 'Permisos insuficientes.' });
            return;
        }
        const { targetId, targetType, fields } = req.body;
        if (!targetId || !targetType || !fields) {
            res.status(400).send({ error: 'Faltan parámetros requeridos (targetId, targetType, fields).' });
            return;
        }
        if (targetType === 'parent' || targetType === 'administrative') {
            const userRef = db.collection('users').doc(targetId);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                res.status(404).send({ error: 'Usuario no encontrado.' });
                return;
            }
            // Si se modifica el email, actualizar también en Firebase Auth
            if (fields.email) {
                await admin.auth().updateUser(targetId, {
                    email: fields.email,
                    displayName: fields.nombre || undefined
                });
            }
            else if (fields.nombre) {
                await admin.auth().updateUser(targetId, {
                    displayName: fields.nombre
                });
            }
            await userRef.update(fields);
            res.status(200).send({ message: 'Perfil de usuario actualizado exitosamente.' });
        }
        else if (targetType === 'student') {
            const studentRef = db.collection('students').doc(targetId);
            const studentDoc = await studentRef.get();
            if (!studentDoc.exists) {
                res.status(404).send({ error: 'Estudiante no encontrado.' });
                return;
            }
            await studentRef.update(fields);
            res.status(200).send({ message: 'Perfil de estudiante actualizado exitosamente.' });
        }
        else {
            res.status(400).send({ error: 'targetType inválido. Debe ser parent, administrative o student.' });
        }
    }
    catch (error) {
        console.error('Error en cf_updateUserProfile:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 11. cf_completePasswordChange
 * Invocada por cualquier usuario autenticado tras cambiar su contraseña para marcar mustChangePassword como false.
 */
exports.cf_completePasswordChange = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        const role = callerClaims.role;
        if (role === 'Estudiante') {
            await db.collection('students').doc(callerClaims.uid).update({ mustChangePassword: false });
        }
        else {
            await db.collection('users').doc(callerClaims.uid).update({ mustChangePassword: false });
        }
        res.status(200).send({ message: 'Estado de cambio de contraseña registrado exitosamente.' });
    }
    catch (error) {
        console.error('Error en cf_completePasswordChange:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 12. cf_getStudentGrades
 * Endpoint GET. Devuelve las calificaciones del alumno autenticado para su boletín.
 * El alumno solo puede consultar SUS PROPIAS calificaciones (RF HU4).
 * Un user_admin puede consultar las notas de cualquier alumno pasando ?studentId=.
 */
exports.cf_getStudentGrades = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        const role = callerClaims.role;
        if (role !== 'Estudiante' && role !== 'user_admin') {
            res.status(403).send({ error: 'Permisos insuficientes: Solo el alumno o un administrador puede consultar notas.' });
            return;
        }
        // El alumno solo accede a su propio legajo; el admin puede indicar otro estudiante
        let studentUid = callerClaims.uid;
        if (role === 'user_admin' && req.query.studentId) {
            studentUid = String(req.query.studentId);
        }
        const studentRef = db.collection('students').doc(studentUid);
        const studentDoc = await studentRef.get();
        if (!studentDoc.exists) {
            res.status(404).send({ error: 'Estudiante no encontrado.' });
            return;
        }
        const studentData = studentDoc.data() || {};
        const anio = Number(req.query.anio) || new Date().getFullYear();
        const califSnap = await db.collection('calificaciones')
            .where('studentId', '==', studentUid)
            .where('anio', '==', anio)
            .get();
        // Agrupar notas por materia y trimestre
        const porMateria = new Map();
        for (const doc of califSnap.docs) {
            const data = doc.data();
            const materiaId = data.materiaId;
            if (!porMateria.has(materiaId)) {
                porMateria.set(materiaId, { materia: data.materia || materiaId, trimestres: { 1: [], 2: [], 3: [] } });
            }
            const entry = porMateria.get(materiaId);
            const trim = Number(data.trimestre);
            if ((data.notas && Array.isArray(data.notas))) {
                entry.trimestres[trim] = entry.trimestres[trim] || [];
                entry.trimestres[trim].push(...data.notas.map((n) => Number(n)).filter((n) => !isNaN(n)));
            }
        }
        const calcularPromedio = (notas) => notas.length > 0 ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : 0;
        const CANT_TRIMESTRES = 3;
        const materias = Array.from(porMateria.entries()).map(([materiaId, entry]) => {
            const trimestres = [];
            const promediosTrimestrales = [];
            for (let t = 1; t <= CANT_TRIMESTRES; t++) {
                const notas = entry.trimestres[t] || [];
                const promedio = calcularPromedio(notas);
                trimestres.push({ trimestre: t, notas, promedio });
                if (notas.length > 0)
                    promediosTrimestrales.push(promedio);
            }
            const promedioAnual = promediosTrimestrales.length > 0
                ? Math.round((promediosTrimestrales.reduce((a, b) => a + b, 0) / promediosTrimestrales.length) * 100) / 100
                : 0;
            return { materiaId, materia: entry.materia, trimestres, promedioAnual };
        });
        const promediosGenerales = materias.filter(m => m.promedioAnual > 0).map(m => m.promedioAnual);
        const promedioGeneral = promediosGenerales.length > 0
            ? Math.round((promediosGenerales.reduce((a, b) => a + b, 0) / promediosGenerales.length) * 100) / 100
            : 0;
        res.status(200).send({
            alumno: {
                uid: studentUid,
                nombre: studentData.nombre || '',
                studentID_login: studentData.studentID_login || '',
                dni: studentData.dni || '',
                nivel: studentData.nivel || ''
            },
            anio,
            materias,
            promedioGeneral
        });
    }
    catch (error) {
        console.error('Error en cf_getStudentGrades:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
/**
 * 13. cf_seedMateriasYCalificaciones
 * Invocada por un user_admin para registrar materias curriculares y generar
 * calificaciones de ejemplo para los alumnos de un nivel (o de un alumno puntual).
 * Permite poblar el boletín del alumno mientras el módulo docente está en desarrollo.
 */
const MATERIAS_POR_NIVEL = {
    inicial: ['Juegos y Expresión', 'Lengua Inicial', 'Matemática Inicial', 'Mundo Natural y Social', 'Música', 'Educación Física'],
    primaria: ['Matemática', 'Lengua y Literatura', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés', 'Educación Física'],
    secundaria: ['Matemática', 'Lengua y Literatura', 'Historia', 'Geografía', 'Física', 'Química', 'Biología', 'Inglés', 'Educación Física']
};
exports.cf_seedMateriasYCalificaciones = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const callerClaims = await verifyAuth(req);
        if (callerClaims.role !== 'user_admin') {
            res.status(403).send({ error: 'Permisos insuficientes: Requiere rol user_admin.' });
            return;
        }
        const { nivel, studentId, anio } = req.body || {};
        const materiasNivel = MATERIAS_POR_NIVEL[nivel];
        if (!materiasNivel) {
            res.status(400).send({ error: 'Nivel inválido. Debe ser inicial, primaria o secundaria.' });
            return;
        }
        const anioLectivo = Number(anio) || new Date().getFullYear();
        // 1) Registrar materias curriculares del nivel si aún no existen
        const materiasIds = [];
        const materiasPorId = {};
        for (const nombre of materiasNivel) {
            const existing = await db.collection('materias')
                .where('nivel', '==', nivel)
                .where('nombre', '==', nombre)
                .limit(1)
                .get();
            let materiaRef;
            if (existing.empty) {
                const docRef = await db.collection('materias').add({
                    nombre,
                    nivel,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                materiaRef = docRef;
            }
            else {
                materiaRef = existing.docs[0].ref;
            }
            materiasIds.push(materiaRef.id);
            materiasPorId[materiaRef.id] = nombre;
        }
        // 2) Determinar los alumnos objetivo (uno puntual o todos los del nivel)
        let alumnosSnap;
        if (studentId) {
            const doc = await db.collection('students').doc(studentId).get();
            if (!doc.exists) {
                res.status(404).send({ error: 'Estudiante no encontrado.' });
                return;
            }
            alumnosSnap = { docs: [doc] };
        }
        else {
            alumnosSnap = await db.collection('students').where('nivel', '==', nivel).get();
        }
        const alumnos = alumnosSnap.docs;
        if (alumnos.length === 0) {
            res.status(200).send({ message: 'Materias registradas. No hay alumnos en el nivel para cargar calificaciones.', materiasRegistradas: materiasIds.length, calificacionesCargadas: 0 });
            return;
        }
        // 3) Generar calificaciones de ejemplo (3 trimestres, notas 1-10)
        const CANT_TRIMESTRES = 3;
        const CANT_NOTAS_POR_TRIMESTRE = 2;
        let calificacionesCargadas = 0;
        const generaNota = () => Math.floor(Math.random() * 10) + 1;
        // Limpiar calificaciones previas del año para evitar duplicados
        for (const alumnoDoc of alumnos) {
            const prev = await db.collection('calificaciones')
                .where('studentId', '==', alumnoDoc.id)
                .where('anio', '==', anioLectivo)
                .get();
            if (!prev.empty) {
                const batch = db.batch();
                prev.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }
        for (const alumnoDoc of alumnos) {
            for (const materiaId of materiasIds) {
                for (let trimestre = 1; trimestre <= CANT_TRIMESTRES; trimestre++) {
                    const notas = Array.from({ length: CANT_NOTAS_POR_TRIMESTRE }, generaNota);
                    await db.collection('calificaciones').add({
                        studentId: alumnoDoc.id,
                        materiaId,
                        materia: materiasPorId[materiaId] || materiaId,
                        anio: anioLectivo,
                        trimestre,
                        notas,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    calificacionesCargadas++;
                }
            }
        }
        res.status(201).send({
            message: 'Materias y calificaciones de ejemplo generadas con éxito.',
            materiasRegistradas: materiasIds.length,
            calificacionesCargadas
        });
    }
    catch (error) {
        console.error('Error en cf_seedMateriasYCalificaciones:', error);
        res.status(500).send({ error: error.message || 'Error interno.' });
    }
});
//# sourceMappingURL=index.js.map