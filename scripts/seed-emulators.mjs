// ============================================================
// SEED PARA EMULADORES DE FIREBASE
// ------------------------------------------------------------
// Carga datos de prueba SOLO en los emuladores locales usando el
// Admin SDK (solo tiene sentido apuntando a emuladores locales).
//   Auth      -> 127.0.0.1:9099  (admin, docente, tutores + claims)
//   Firestore -> 127.0.0.1:8080  (alumnos, tutores, materias, calificaciones,
//                                 deportes, recorridos, cuotas y pagos)
// Requisito: los emuladores deben estar corriendo (`npm run emulators`).
// Uso:       npm run seed:emulators
// ============================================================
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

import { createRequire } from 'node:module';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const bcrypt = require('../functions/node_modules/bcryptjs');

const PROJECT_ID = 'centro-educativo-f5cc5';

// Catálogo canónico: debe coincidir con src/pages/AdminPanel.jsx y functions/src/index.ts.
const MATERIAS_POR_NIVEL = {
  secundaria: [
    { id: 'sec-matematica', nombre: 'Matemática' },
    { id: 'sec-lengua', nombre: 'Lengua y Literatura' },
    { id: 'sec-historia', nombre: 'Historia' },
    { id: 'sec-geografia', nombre: 'Geografía' },
    { id: 'sec-fisica', nombre: 'Física' },
    { id: 'sec-quimica', nombre: 'Química' },
    { id: 'sec-biologia', nombre: 'Biología' },
    { id: 'sec-ingles', nombre: 'Inglés' },
    { id: 'sec-edfisica', nombre: 'Educación Física' },
  ],
  primaria: [
    { id: 'pri-matematica', nombre: 'Matemática' },
    { id: 'pri-lengua', nombre: 'Lengua y Literatura' },
    { id: 'pri-cnaturaleza', nombre: 'Ciencias Naturales' },
    { id: 'pri-csociales', nombre: 'Ciencias Sociales' },
    { id: 'pri-ingles', nombre: 'Inglés' },
    { id: 'pri-edfisica', nombre: 'Educación Física' },
  ],
  inicial: [
    { id: 'ini-juegos', nombre: 'Juegos y Expresión' },
    { id: 'ini-lengua', nombre: 'Lengua Inicial' },
    { id: 'ini-matematica', nombre: 'Matemática Inicial' },
    { id: 'ini-mundo', nombre: 'Mundo Natural y Social' },
    { id: 'ini-musica', nombre: 'Música' },
    { id: 'ini-edfisica', nombre: 'Educación Física' },
  ],
};

const app = initializeApp({ projectId: PROJECT_ID });
const authAdmin = getAuth(app);
const db = getFirestore(app);

async function upsertUser(email, password, displayName, role) {
  let uid;
  try {
    const user = await authAdmin.createUser({ email, password, displayName });
    uid = user.uid;
  } catch (err) {
    const code = err.code || err.errorInfo?.code;
    if (code !== 'auth/email-already-exists') throw err;
    const existing = await authAdmin.getUserByEmail(email);
    uid = existing.uid;
    await authAdmin.updateUser(uid, { password, displayName });
  }
  await authAdmin.setCustomUserClaims(uid, { role });
  return uid;
}

async function main() {
  console.log(`Seeding emuladores del proyecto ${PROJECT_ID}...`);

  // 1) USUARIOS LOCALES (Auth emulator)
  console.log('\n[Auth] Creando usuarios locales...');
  const adminAuth = await upsertUser(
    'admin@centro.local',
    'admin1234',
    'Director/a',
    'user_admin'
  );
  console.log('  ✓ admin@centro.local (user_admin)');
  const docenteAuth = await upsertUser(
    'docente@centro.local',
    'docente1234',
    'Prof. Analía Torres',
    'Staff'
  );
  console.log('  ✓ docente@centro.local (Staff)');
  const administrativoAuth = await upsertUser(
    'admininterno@centro.local',
    'admininterno1234',
    'Lic. Martín Ruiz',
    'Administrativo'
  );
  console.log('  ✓ admininterno@centro.local (Administrativo)');

  // Un tutor distinto por alumno
  const tutores = [
    {
      email: 'tutor1@centro.local',
      password: 'tutor1234',
      nombre: 'Eduardo Gómez',
      dni: '30123456',
    },
    {
      email: 'tutor2@centro.local',
      password: 'tutor1234',
      nombre: 'María Rodríguez',
      dni: '32123456',
    },
    {
      email: 'tutor3@centro.local',
      password: 'tutor1234',
      nombre: 'Carlos Fernández',
      dni: '34123456',
    },
  ];

  for (const tutor of tutores) {
    tutor.uid = await upsertUser(
      tutor.email,
      tutor.password,
      tutor.nombre,
      'Padre'
    );
    tutor.studentIds = [];
    console.log(`  ✓ ${tutor.email} (Padre) - ${tutor.nombre}`);
  }

  // Personal institucional (para asignar profesores a materias)
  const personalInstitucional = [
    {
      uid: adminAuth,
      email: 'admin@centro.local',
      nombre: 'Director/a',
      dni: '20123456',
      role: 'user_admin',
    },
    {
      uid: docenteAuth,
      email: 'docente@centro.local',
      nombre: 'Prof. Analía Torres',
      dni: '40123456',
      role: 'Staff',
    },
    {
      uid: administrativoAuth,
      email: 'admininterno@centro.local',
      nombre: 'Lic. Martín Ruiz',
      dni: '38123456',
      role: 'Administrativo',
    },
  ];

  // 2) MATERIAS (Firestore emulator)
  console.log('\n[Firestore] Registrando materias curriculares...');
  const materiaIdsPorNivel = {};
  const docente = {
    uid: docenteAuth,
    nombre: 'Prof. Analía Torres',
    dni: '40123456',
  };
  const MATERIAS_CON_PROFESOR = new Set([
    'sec-matematica',
    'sec-lengua',
    'pri-matematica',
    'pri-lengua',
    'ini-juegos',
    'ini-lengua',
  ]);
  for (const [nivel, materias] of Object.entries(MATERIAS_POR_NIVEL)) {
    materiaIdsPorNivel[nivel] = [];
    for (const materia of materias) {
      const conProfesor = MATERIAS_CON_PROFESOR.has(materia.id);
      await db
        .collection('materias')
        .doc(materia.id)
        .set({
          nombre: materia.nombre,
          nivel,
          profesorUid: conProfesor ? docente.uid : null,
          profesorNombre: conProfesor ? docente.nombre : null,
          profesorDni: conProfesor ? docente.dni : null,
          studentIds: [],
          createdAt: null,
        });
      materiaIdsPorNivel[nivel].push(materia.id);
      console.log(
        `  ✓ [${nivel}] ${materia.nombre}${conProfesor ? ` -> ${docente.nombre}` : ''}`
      );
    }
  }

  // 3) ALUMNOS + TUTORES + CALIFICACIONES (Firestore emulator)
  console.log('\n[Firestore] Creando alumnos, tutores y calificaciones...');
  const alumnos = {
    alumno1: {
      nombre: 'Lucía Gómez',
      dni: '48123456',
      nivel: 'secundaria',
      curso: '3°',
      division: 'A',
      genero: 'Femenino',
      fechaNacimiento: '2010-04-12',
      idLogin: 'EST-2026-88123',
      tutor: 0,
    },
    alumno2: {
      nombre: 'Mateo Gómez',
      dni: '45123987',
      nivel: 'primaria',
      curso: '5°',
      division: 'A',
      genero: 'Masculino',
      fechaNacimiento: '2014-09-30',
      idLogin: 'EST-2026-90412',
      tutor: 1,
    },
    alumno3: {
      nombre: 'Sofía Rodríguez',
      dni: '42987123',
      nivel: 'secundaria',
      curso: '3°',
      division: 'A',
      genero: 'Femenino',
      fechaNacimiento: '2011-01-25',
      idLogin: 'EST-2026-10492',
      tutor: 2,
    },
  };

  const anioLectivo = new Date().getFullYear();
  let cantCalificaciones = 0;
  const alumnosPorNivel = { inicial: [], primaria: [], secundaria: [] };

  for (const [docId, base] of Object.entries(alumnos)) {
    const tutor = tutores[base.tutor];
    const hashedPassword = await bcrypt.hash(base.dni, 10); // clave inicial = DNI
    await db.collection('students').doc(docId).set({
      studentID_login: base.idLogin,
      parentId: tutor.uid,
      emailPadre: tutor.email,
      hashedPassword,
      status: 'active',
      mustChangePassword: false,
      nombre: base.nombre,
      dni: base.dni,
      genero: base.genero,
      fechaNacimiento: base.fechaNacimiento,
      nivel: base.nivel,
      curso: base.curso,
      division: base.division,
      passwordResetRequestedAt: null,
      createdAt: null,
    });
    tutor.studentIds.push(docId);
    alumnosPorNivel[base.nivel].push(docId);
    console.log(
      `  ✓ ${base.nombre} (${base.idLogin}) -> tutor ${tutor.nombre}`
    );

    const materiaIds = materiaIdsPorNivel[base.nivel];
    for (const materiaId of materiaIds) {
      const materia = MATERIAS_POR_NIVEL[base.nivel].find(
        (m) => m.id === materiaId
      );
      for (let trimestre = 1; trimestre <= 3; trimestre++) {
        // Notas determinísticas por alumno (6-10) para que el boletín se vea completo
        const notas = Array.from(
          { length: 2 },
          () =>
            6 +
            ((docId.charCodeAt(docId.length - 1) +
              trimestre +
              materiaId.length) %
              5)
        );
        await db
          .collection('calificaciones')
          .doc(`${docId}_${materiaId}_t${trimestre}`)
          .set({
            studentId: docId,
            materiaId,
            materia: materia.nombre,
            anio: anioLectivo,
            trimestre,
            notas,
            createdAt: null,
          });
        cantCalificaciones++;
      }
    }
  }

  // Asignar a cada materia los alumnos de su mismo nivel educativo (inscripción inicial)
  for (const nivel of Object.keys(MATERIAS_POR_NIVEL)) {
    for (const materiaId of materiaIdsPorNivel[nivel]) {
      await db
        .collection('materias')
        .doc(materiaId)
        .update({ studentIds: alumnosPorNivel[nivel] });
    }
    console.log(
      `  ✓ Materias de ${nivel} -> ${alumnosPorNivel[nivel].length} alumno/s inscriptos`
    );
  }

  // 4) HORARIOS (Firestore emulator)
  console.log('\n[Firestore] Generando horarios...');
  const cursosPorNivel = {
    secundaria: [{ curso: '3°', division: 'A' }],
    primaria: [{ curso: '5°', division: 'A' }],
  };
  const BLOQUES_HORARIOS = [
    { inicio: '08:00', fin: '09:20' },
    { inicio: '09:30', fin: '10:50' },
    { inicio: '11:00', fin: '12:20' },
  ];
  const DIAS_HABILES = [1, 2, 3, 4, 5];
  const AULAS = ['Aula 12', 'Aula 13', 'Laboratorio', 'Gimnasio'];
  let cantHorarios = 0;

  for (const [nivel, cursos] of Object.entries(cursosPorNivel)) {
    const materiasNivel = MATERIAS_POR_NIVEL[nivel];
    for (const { curso, division } of cursos) {
      let indice = 0;
      for (const dia of DIAS_HABILES) {
        for (const bloque of BLOQUES_HORARIOS) {
          const materia = materiasNivel[indice % materiasNivel.length];
          const aula = AULAS[indice % AULAS.length];
          indice++;
          await db
            .collection('horarios')
            .doc(
              `hor-${nivel}-${curso}-${division}-${dia}-${bloque.inicio.replace(':', '')}`
            )
            .set({
              nivel,
              curso,
              division,
              dia,
              horaInicio: bloque.inicio,
              horaFin: bloque.fin,
              materiaId: materia.id,
              materia: materia.nombre,
              docente: MATERIAS_CON_PROFESOR.has(materia.id)
                ? docente.nombre
                : '',
              aula,
              anio: anioLectivo,
              createdAt: null,
            });
          cantHorarios++;
        }
      }
    }
  }
  console.log(`  ✓ ${cantHorarios} bloques horarios`);

  // 5) MATERIALES (Firestore emulator)
  console.log('\n[Firestore] Generando materiales de estudio...');
  let cantMateriales = 0;
  for (const [nivel, materias] of Object.entries(MATERIAS_POR_NIVEL)) {
    for (let i = 0; i < materias.length; i++) {
      const materia = materias[i];
      const esLink = i % 3 === 2;
      await db
        .collection('materiales')
        .doc(`mat-${materia.id}`)
        .set({
          materiaId: materia.id,
          materia: materia.nombre,
          nivel,
          titulo: `Guía de estudio: ${materia.nombre}`,
          descripcion: `Material de apoyo para las clases de ${materia.nombre} (${nivel}).`,
          tipo: esLink ? 'link' : 'pdf',
          url: esLink
            ? 'https://developer.mozilla.org/es/docs/Learn'
            : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          anio: anioLectivo,
          profesorNombre: MATERIAS_CON_PROFESOR.has(materia.id)
            ? docente.nombre
            : '',
          createdAt: Timestamp.now(),
        });
      cantMateriales++;
    }
  }
  console.log(`  ✓ ${cantMateriales} materiales`);

  // Limpiar enlaces de recuperación pendientes de ejecuciones anteriores
  const resetsPrevios = await db.collection('passwordResets').get();
  if (!resetsPrevios.empty) {
    const batchResets = db.batch();
    resetsPrevios.docs.forEach((doc) => batchResets.delete(doc.ref));
    await batchResets.commit();
  }

  // 6) ASISTENCIAS (Firestore emulator)
  console.log('\n[Firestore] Generando asistencias...');
  const fechasEscolares = [];
  const cursorFecha = new Date();
  cursorFecha.setHours(12, 0, 0, 0);
  while (fechasEscolares.length < 12) {
    const diaSemana = cursorFecha.getDay();
    if (diaSemana >= 1 && diaSemana <= 5) {
      fechasEscolares.push(new Date(cursorFecha));
    }
    cursorFecha.setDate(cursorFecha.getDate() - 1);
  }
  const ESTADOS_ASISTENCIA = [
    'presente',
    'presente',
    'presente',
    'presente',
    'tarde',
    'ausente',
    'justificada',
  ];
  let cantAsistencias = 0;

  for (const [docId, base] of Object.entries(alumnos)) {
    const previas = await db
      .collection('asistencias')
      .where('studentId', '==', docId)
      .get();
    if (!previas.empty) {
      const batch = db.batch();
      previas.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    const materiasNivel = MATERIAS_POR_NIVEL[base.nivel].slice(0, 3);
    for (const materia of materiasNivel) {
      for (const fecha of fechasEscolares) {
        const semilla =
          docId.charCodeAt(docId.length - 1) +
          materia.id.length +
          fecha.getDate() +
          fecha.getMonth();
        const estado = ESTADOS_ASISTENCIA[semilla % ESTADOS_ASISTENCIA.length];
        const fechaISO = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        await db
          .collection('asistencias')
          .doc(`${docId}_${materia.id}_${fechaISO}`)
          .set({
            studentId: docId,
            materiaId: materia.id,
            materia: materia.nombre,
            fecha: Timestamp.fromDate(fecha),
            fechaISO,
            anio: fecha.getFullYear(),
            estado,
            observacion:
              estado === 'justificada' ? 'Justificada por el tutor.' : '',
            registradoPor: docente.uid,
            createdAt: null,
          });
        cantAsistencias++;
      }
    }
  }
  console.log(`  ✓ ${cantAsistencias} registros de asistencia`);

  // 7) DEPORTES, RECORRIDOS, CUOTAS Y PAGOS (Firestore emulator)
  // Catálogo canónico: debe coincidir con functions/src/pagos.ts (cf_seedCuotas).
  console.log('\n[Firestore] Generando deportes, recorridos, cuotas y pagos...');
  const DEPORTES_SEED = [
    {
      id: 'dep-futbol',
      nombre: 'Fútbol',
      nivel: 'primaria',
      horario: 'Martes y Jueves 17:00 a 18:30',
      profesorNombre: 'Prof. Diego Sosa',
      arancel: 15000,
    },
    {
      id: 'dep-natacion',
      nombre: 'Natación',
      nivel: 'secundaria',
      horario: 'Lunes y Miércoles 18:30 a 20:00',
      profesorNombre: 'Prof. Laura Benítez',
      arancel: 18000,
    },
    {
      id: 'dep-basquet',
      nombre: 'Básquet',
      nivel: 'secundaria',
      horario: 'Martes y Viernes 19:00 a 20:30',
      profesorNombre: 'Prof. Marcos Pereyra',
      arancel: 16000,
    },
    {
      id: 'dep-voleibol',
      nombre: 'Voleibol',
      nivel: 'inicial',
      horario: 'Sábados 10:00 a 11:30',
      profesorNombre: 'Prof. Carla Ledesma',
      arancel: 12000,
    },
  ];
  const RECORRIDOS_SEED = [
    {
      id: 'rec-norte',
      nombre: 'Recorrido Norte',
      zona: 'Zona Norte',
      descripcion: 'Av. Central, Barrio Los Álamos, Plaza Norte',
      arancel: 9000,
    },
    {
      id: 'rec-sur',
      nombre: 'Recorrido Sur',
      zona: 'Zona Sur',
      descripcion: 'Ruta 9 km 4, Barrio San José, Terminal',
      arancel: 10000,
    },
    {
      id: 'rec-centro',
      nombre: 'Recorrido Centro',
      zona: 'Centro',
      descripcion: 'Microcentro, Municipalidad, Estación Central',
      arancel: 8500,
    },
  ];
  const IMPORTE_MENSUAL = 45000;
  const DIA_VENCIMIENTO = 10;

  for (const deporte of DEPORTES_SEED) {
    await db.collection('deportes').doc(deporte.id).set({
      ...deporte,
      activo: true,
      updatedAt: null,
    });
    console.log(`  ✓ Deporte: ${deporte.nombre} (${deporte.nivel}) - ${deporte.horario}`);
  }
  for (const recorrido of RECORRIDOS_SEED) {
    await db.collection('recorridos').doc(recorrido.id).set({
      ...recorrido,
      activo: true,
      updatedAt: null,
    });
    console.log(`  ✓ Recorrido: ${recorrido.nombre} (${recorrido.zona})`);
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}-${pad2(hoy.getDate())}`;
  const mesActual = hoy.getMonth() + 1;
  const vencimientoDe = (anio, mes) => `${anio}-${pad2(mes)}-${pad2(DIA_VENCIMIENTO)}`;
  // Estados del mes actual por alumno: 0 = pago completo, 1 = pago parcial, 2 = pendiente.
  const calcularPagoSeed = (index, anio, mes, importe) => {
    const clave = `${anio}-${pad2(mes)}`;
    const claveActual = `${hoy.getFullYear()}-${pad2(mesActual)}`;
    if (clave < claveActual) {
      return {
        importe,
        fechaPagoISO: `${anio}-${pad2(mes)}-05`,
        medioPago: 'transferencia',
      };
    }
    if (clave === claveActual) {
      const modo = index % 3;
      if (modo === 0)
        return { importe, fechaPagoISO: hoyISO, medioPago: 'transferencia' };
      if (modo === 1)
        return {
          importe: Math.round(importe / 2),
          fechaPagoISO: hoyISO,
          medioPago: 'efectivo',
        };
    }
    return null;
  };

  const alumnosLista = Object.entries(alumnos);
  let cantCuotas = 0;
  let cantPagos = 0;
  for (let index = 0; index < alumnosLista.length; index++) {
    const [docId, base] = alumnosLista[index];
    const tutor = tutores[base.tutor];
    const deporte = DEPORTES_SEED.find((d) => d.nivel === base.nivel) || null;
    const recorrido = RECORRIDOS_SEED[index % RECORRIDOS_SEED.length];

    for (let mes = 1; mes <= mesActual; mes++) {
      const conceptos = [
        {
          key: 'mensual',
          concepto: 'mensual',
          descripcion: 'Cuota mensual',
          importe: IMPORTE_MENSUAL,
        },
      ];
      if (deporte) {
        conceptos.push({
          key: `deporte-${deporte.id}`,
          concepto: 'deporte',
          descripcion: `Deporte: ${deporte.nombre}`,
          importe: deporte.arancel,
          deporteId: deporte.id,
          deporteNombre: deporte.nombre,
        });
      }
      if (recorrido) {
        conceptos.push({
          key: `transporte-${recorrido.id}`,
          concepto: 'transporte',
          descripcion: `Transporte: ${recorrido.nombre}`,
          importe: recorrido.arancel,
          recorridoId: recorrido.id,
          recorridoNombre: recorrido.nombre,
        });
      }

      for (const concepto of conceptos) {
        const cuotaId = `${docId}_${anioLectivo}_${pad2(mes)}_${concepto.key}`;
        await db.collection('cuotas').doc(cuotaId).set({
          studentId: docId,
          parentUid: tutor.uid,
          alumnoNombre: base.nombre,
          anio: anioLectivo,
          mes,
          concepto: concepto.concepto,
          descripcion: concepto.descripcion,
          deporteId: concepto.deporteId || null,
          deporteNombre: concepto.deporteNombre || null,
          recorridoId: concepto.recorridoId || null,
          recorridoNombre: concepto.recorridoNombre || null,
          nivel: base.nivel,
          importe: concepto.importe,
          vencimientoISO: vencimientoDe(anioLectivo, mes),
          createdAt: null,
        });
        cantCuotas++;

        const pago = calcularPagoSeed(index, anioLectivo, mes, concepto.importe);
        if (pago) {
          await db.collection('pagos').doc(`${cuotaId}_p1`).set({
            cuotaId,
            studentId: docId,
            parentUid: tutor.uid,
            anio: anioLectivo,
            mes,
            concepto: concepto.concepto,
            descripcion: concepto.descripcion,
            importe: pago.importe,
            fechaPagoISO: pago.fechaPagoISO,
            fechaPago: Timestamp.fromDate(
              new Date(`${pago.fechaPagoISO}T12:00:00.000Z`)
            ),
            medioPago: pago.medioPago,
            observacion: '',
            registradoPor: adminAuth,
            createdAt: null,
          });
          cantPagos++;
        }
      }
    }
  }
  console.log(
    `  ✓ ${cantCuotas} cuotas y ${cantPagos} pagos del ${anioLectivo} (meses 1 a ${mesActual})`
  );

  // Datos extendidos de cada tutor en la colección `users` (para el panel admin)
  for (const tutor of tutores) {
    await db.collection('users').doc(tutor.uid).set({
      role: 'Padre',
      email: tutor.email,
      nombre: tutor.nombre,
      dni: tutor.dni,
      mustChangePassword: false,
      emailInvalid: false,
      studentIds: tutor.studentIds,
      createdAt: null,
    });
    console.log(
      `  ✓ Tutor Firestore: ${tutor.nombre} (${tutor.email}, ${tutor.studentIds.length} alumno/s)`
    );
  }

  // Datos del personal institucional en `users` (para asignar profesores)
  for (const persona of personalInstitucional) {
    await db.collection('users').doc(persona.uid).set({
      role: persona.role,
      email: persona.email,
      nombre: persona.nombre,
      dni: persona.dni,
      mustChangePassword: false,
      emailInvalid: false,
      studentIds: [],
      createdAt: null,
    });
    console.log(
      `  ✓ Personal Firestore: ${persona.nombre} (${persona.email}, ${persona.role})`
    );
  }

  console.log('\n✅ Seed completado.');
  console.log('------------------------------------------------------------');
  console.log('Credenciales locales de prueba:');
  console.log('  Admin  :  admin@centro.local       / admin1234');
  console.log('  Docente:  docente@centro.local     / docente1234');
  console.log('  Admin.Int: admininterno@centro.local / admininterno1234');
  console.log(
    '  Tutor1 :  tutor1@centro.local      / tutor1234  (Eduardo Gómez)'
  );
  console.log(
    '  Tutor2 :  tutor2@centro.local      / tutor1234  (María Rodríguez)'
  );
  console.log(
    '  Tutor3 :  tutor3@centro.local      / tutor1234  (Carlos Fernández)'
  );
  console.log('  Alumno1:  EST-2026-88123           / 48123456   (tutor 1)');
  console.log('  Alumno2:  EST-2026-90412           / 45123987   (tutor 2)');
  console.log('  Alumno3:  EST-2026-10492           / 42987123   (tutor 3)');
  console.log(`  Calificaciones cargadas: ${cantCalificaciones}`);
  console.log(`  Horarios cargados: ${cantHorarios}`);
  console.log(`  Materiales cargados: ${cantMateriales}`);
  console.log(`  Asistencias cargadas: ${cantAsistencias}`);
  console.log(`  Cuotas cargadas: ${cantCuotas} / Pagos cargados: ${cantPagos}`);
  console.log('------------------------------------------------------------');
}

main().catch((err) => {
  console.error('\n✗ Falló el seed:', err.message);
  console.error(
    'Asegúrate de tener los emuladores corriendo: npm run emulators'
  );
  process.exit(1);
});
