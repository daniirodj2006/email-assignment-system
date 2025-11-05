
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyCTwqp83O1npnzTGXKSVrvqFhcX2OUsAZM",
  authDomain: "email-asignacion.firebaseapp.com",
  databaseURL: "https://email-asignacion-default-rtdb.firebaseio.com",
  projectId: "email-asignacion",
  storageBucket: "email-asignacion.firebasestorage.app",
  messagingSenderId: "470782090781",
  appId: "1:470782090781:web:f7c8fc4c39ea928348f0f4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);


export function saveToFirebase(appState) {
  const stateRef = ref(database, 'emailAssignmentSystem');
  set(stateRef, {
    weekAssignments: appState.weekAssignments || {},
    queue: appState.queue || [],
    currentIndex: appState.currentIndex || 0,
    teamStatus: appState.teamStatus || {},
    lastUpdated: new Date().toISOString()
  })
  .then(() => {
    console.log('✅ Datos guardados en Firebase');
  })
  .catch((error) => {
    console.error('❌ Error guardando en Firebase:', error);
  });
}

/**
 * Cargar datos iniciales desde Firebase (una sola vez)
 */
export function loadFromFirebase(callback) {
  const stateRef = ref(database, 'emailAssignmentSystem');
  
  // Solo leer una vez al cargar la página
  onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log('✅ Datos cargados desde Firebase');
      callback(data);
    } else {
      console.log('ℹ️ No hay datos previos en Firebase');
      callback(null);
    }
  }, { onlyOnce: true });
}

/**
 * Escuchar cambios en tiempo real de Firebase
 */
export function listenToFirebase(callback) {
  const stateRef = ref(database, 'emailAssignmentSystem');
  
  onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log('🔄 Datos actualizados desde Firebase (sincronización en tiempo real)');
      callback(data);
    }
  });
}

console.log('🔥 Firebase configurado correctamente');