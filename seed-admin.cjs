const admin = require('firebase-admin');

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: 'demo-test'
});

async function seedAdmin() {
  try {
    const email = 'admin@admin.com';
    const password = 'password123';
    
    console.log('Creando usuario en Auth...');
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
      displayName: 'Administrador Local'
    });

    console.log('Agregando Custom Claim (user_admin)...');
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'user_admin' });

    console.log('Creando documento en Firestore...');
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      role: 'user_admin',
      email: email,
      nombre: 'Administrador Local',
      dni: '12345678',
      mustChangePassword: false,
      emailInvalid: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('\n✅ ¡Usuario Administrador creado exitosamente!');
    console.log(`Email: ${email}`);
    console.log(`Contraseña: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creando el admin:', error);
    process.exit(1);
  }
}

seedAdmin();
