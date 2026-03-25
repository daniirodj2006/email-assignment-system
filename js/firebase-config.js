import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTwqp83O1npnzTGXKSVrvqFhcX2OUsAZM",
  authDomain: "email-asignacion.firebaseapp.com",
  databaseURL: "https://email-asignacion-default-rtdb.firebaseio.com",
  projectId: "email-asignacion",
  storageBucket: "email-asignacion.firebasestorage.app",
  messagingSenderId: "470782090781",
  appId: "1:470782090781:web:f7c8fc4c39ea928348f0f4"
};

const app      = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ===================================
// FUNCIONES ORIGINALES (app.js las usa)
// ===================================

/** Guarda el estado principal (queue, turnos, teamStatus) sin tocar los otros módulos */
export function saveToFirebase(appState) {
  const stateRef = ref(database, 'emailAssignmentSystem');
  update(stateRef, {
    weekAssignments: appState.weekAssignments || {},
    queue:           appState.queue           || [],
    currentIndex:    appState.currentIndex    || 0,
    teamStatus:      appState.teamStatus      || {},
    lastUpdated:     new Date().toISOString()
  })
  .then(() => console.log('✅ Estado principal guardado en Firebase'))
  .catch((err) => console.error('❌ Error guardando estado:', err));
}

/** Carga datos iniciales una sola vez */
export function loadFromFirebase(callback) {
  const stateRef = ref(database, 'emailAssignmentSystem');
  onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    console.log(data ? '✅ Datos cargados desde Firebase' : 'ℹ️ No hay datos previos');
    callback(data);
  }, { onlyOnce: true });
}

/** Escucha cambios en tiempo real del nodo principal */
export function listenToFirebase(callback) {
  const stateRef = ref(database, 'emailAssignmentSystem');
  onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log('🔄 Sincronización en tiempo real recibida');
      callback(data);
    }
  });
}

// ===================================
// FUNCIONES POR MÓDULO
// Cada módulo guarda en su propio sub-path
// así no se sobreescriben entre sí
// ===================================

/**
 * Guarda un campo específico sin tocar los demás.
 * Ej: saveFieldToFirebase('calendarEvents', [...])
 */
export function saveFieldToFirebase(fieldName, value) {
  const fieldRef = ref(database, `emailAssignmentSystem/${fieldName}`);
  set(fieldRef, value)
    .then(() => console.log(`✅ ${fieldName} guardado`))
    .catch((err) => console.error(`❌ Error guardando ${fieldName}:`, err));
}

/**
 * Carga un campo específico una sola vez.
 * Ej: loadFieldFromFirebase('calendarEvents', (data) => { ... })
 */
export function loadFieldFromFirebase(fieldName, callback) {
  const fieldRef = ref(database, `emailAssignmentSystem/${fieldName}`);
  onValue(fieldRef, (snapshot) => {
    callback(snapshot.val());
  }, { onlyOnce: true });
}

/**
 * Escucha cambios en tiempo real de un campo específico.
 * Ej: listenFieldFromFirebase('calendarEvents', (data) => { ... })
 */
export function listenFieldFromFirebase(fieldName, callback) {
  const fieldRef = ref(database, `emailAssignmentSystem/${fieldName}`);
  onValue(fieldRef, (snapshot) => {
    callback(snapshot.val());
  });
}

console.log('🔥 Firebase configurado correctamente');