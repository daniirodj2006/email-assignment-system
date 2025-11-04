// ===================================
// DATOS INICIALES DEL EQUIPO
// ===================================
const teamMembers = [
    'Ali', 'Ale', 'Moni', 'Sofi', 'Steph', 'Dani', 'Jose'
];

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ===================================
// ESTADO DE LA APLICACIÓN
// ===================================
let appState = {
    weekAssignments: {}, // {Lunes: 'Ali', Martes: 'Moni', ...}
    queue: [...teamMembers], // Cola de turnos
    currentIndex: 0, // Índice de la persona actual
    teamStatus: {} // {Ali: 'presente', Moni: 'lunch', ...}
};

// ===================================
// INICIALIZACIÓN - Se ejecuta al cargar la página
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage(); // Carga datos guardados
    initializeTeamStatus(); // Inicializa estados del equipo
    updateQueue(); //  NUEVO: Actualiza la cola según el día actual
    renderWeekGrid(); // Muestra el grid semanal
    renderQueue(); // Muestra el sistema de turnos
    renderTeamStatus(); // Muestra las tarjetas del equipo
    setupEventListeners(); // Configura los botones
});
// ===================================
// FUNCIÓN 1: CARGAR DATOS DEL LOCALSTORAGE
// ===================================
function loadFromLocalStorage() {
    const saved = localStorage.getItem('emailAssignmentSystem');
    if (saved) {
        appState = JSON.parse(saved);
        console.log('✅ Datos cargados desde localStorage');
    }
}

// ===================================
// FUNCIÓN 2: GUARDAR DATOS EN LOCALSTORAGE
// ===================================
function saveToLocalStorage() {
    localStorage.setItem('emailAssignmentSystem', JSON.stringify(appState));
    console.log('💾 Datos guardados en localStorage');
}

// ===================================
// FUNCIÓN 3: INICIALIZAR ESTADO DEL EQUIPO
// ===================================
function initializeTeamStatus() {
    // Si no hay estados guardados, todos empiezan como "presente"
    if (Object.keys(appState.teamStatus).length === 0) {
        teamMembers.forEach(member => {
            appState.teamStatus[member] = 'presente';
        });
    }
}

// ===================================
// FUNCIÓN 4: OBTENER PERSONAS DISPONIBLES
// ===================================
function getAvailableMembers() {
    // Detectar el día actual de la semana
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
    
    // Filtrar personas con estado "presente"
    let available = teamMembers.filter(member => 
        appState.teamStatus[member] === 'presente'
    );
    
    // REGLA: Ali solo trabaja los LUNES en el sistema de turnos
    // Si hoy NO es Lunes (1), excluir a Ali del sistema de turnos
    if (dayOfWeek !== 1) {
        available = available.filter(member => member !== 'Ali');
        console.log('📅 Hoy no es Lunes - Ali excluida del sistema de turnos');
    } else {
        console.log('📅 Hoy es Lunes - Ali incluida en el sistema de turnos');
    }
    
    return available;
}

// ===================================
// FUNCIÓN 5: GENERAR ASIGNACIÓN SEMANAL ALEATORIA
// ===================================
function generateWeekAssignments() {
    // Limpiar asignaciones previas
    appState.weekAssignments = {};
    
    // TODAS las personas disponibles (incluyendo Ali)
    const allMembers = [...teamMembers];
    
    // Mezclar aleatoriamente
    const shuffled = allMembers.sort(() => Math.random() - 0.5);
    
    // Asignar a los 5 días SIN REPETIR
    // Solo se asignan 5 personas de las 7 disponibles
    weekDays.forEach((day, index) => {
        appState.weekAssignments[day] = shuffled[index];
    });
    
    saveToLocalStorage();
    renderWeekGrid();
    
    console.log('📅 Semana generada:', appState.weekAssignments);
    console.log('✅ Nadie se repite en la semana');
    console.log('✅ Ali puede aparecer cualquier día (o ninguno)');
    console.log('ℹ️ Los estados (Lunch/Meeting/Ausente) NO afectan el generador semanal');
}

// ===================================
// FUNCIÓN 6: RENDERIZAR GRID SEMANAL
// ===================================
function renderWeekGrid() {
    const weekGrid = document.getElementById('weekGrid');
    weekGrid.innerHTML = ''; // Limpia el contenido anterior
    
    weekDays.forEach(day => {
        // Crea la tarjeta del día
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        
        // Nombre del día
        const dayName = document.createElement('div');
        dayName.className = 'day-name';
        dayName.textContent = day;
        
        // Select para elegir persona
        const select = document.createElement('select');
        select.id = `select-${day}`;
        
        // Opción vacía
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Seleccionar --';
        select.appendChild(emptyOption);
        
        // Agregar todas las personas al select
        teamMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            
            // Si hay asignación guardada, seleccionarla
            if (appState.weekAssignments[day] === member) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        // Evento: cuando cambia la selección
        select.addEventListener('change', (e) => {
            appState.weekAssignments[day] = e.target.value;
            saveToLocalStorage();
            console.log(`${day} asignado a: ${e.target.value}`);
        });
        
        dayCard.appendChild(dayName);
        dayCard.appendChild(select);
        weekGrid.appendChild(dayCard);
    });
}

// ===================================
// FUNCIÓN 7: ACTUALIZAR COLA DE TURNOS
// ===================================
function updateQueue() {
    const available = getAvailableMembers();
    
    if (available.length === 0) {
        appState.queue = [];
        appState.currentIndex = 0;
        renderQueue();
        return;
    }
    
    // SIEMPRE reconstruir la cola con las personas disponibles
    // Esto asegura que los cambios de estado se reflejen inmediatamente
    appState.queue = [...available];
    
    // Si el índice actual está fuera de rango, reiniciar
    if (appState.currentIndex >= appState.queue.length) {
        appState.currentIndex = 0;
    }
    
    // Verificar que la persona actual sigue disponible
    const currentPerson = appState.queue[appState.currentIndex];
    if (!currentPerson || appState.teamStatus[currentPerson] !== 'presente') {
        appState.currentIndex = 0;
    }
    
    saveToLocalStorage();
    renderQueue();
}

// ===================================
// FUNCIÓN 8: AVANZAR AL SIGUIENTE TURNO
// ===================================
function nextTurn() {
    const available = getAvailableMembers();
    
    if (available.length === 0) {
        alert('⚠️ No hay personas disponibles en la cola.');
        return;
    }
    
    // Avanza al siguiente índice (circular)
    appState.currentIndex = (appState.currentIndex + 1) % appState.queue.length;
    
    saveToLocalStorage();
    renderQueue();
    
    console.log('➡️ Avanzó al siguiente turno');
}

// ===================================
// FUNCIÓN 9: RENDERIZAR SISTEMA DE TURNOS
// ===================================
function renderQueue() {
    const available = getAvailableMembers();
    
    // Actualizar persona actual
    const currentPersonEl = document.getElementById('currentPerson');
    if (available.length === 0) {
        currentPersonEl.textContent = 'Sin personas disponibles';
    } else {
        currentPersonEl.textContent = appState.queue[appState.currentIndex] || '-';
    }
    
    // Actualizar siguiente persona
    const nextPersonEl = document.getElementById('nextPerson');
    if (available.length === 0) {
        nextPersonEl.textContent = '-';
    } else {
        const nextIndex = (appState.currentIndex + 1) % appState.queue.length;
        nextPersonEl.textContent = appState.queue[nextIndex] || '-';
    }
    
    // Renderizar lista completa de turnos
    const queueListEl = document.getElementById('queueList');
    queueListEl.innerHTML = '';
    
    appState.queue.forEach((member, index) => {
        const li = document.createElement('li');
        li.textContent = member;
        
        // Resaltar la persona actual
        if (index === appState.currentIndex) {
            li.style.background = '#FFD100';
            li.style.fontWeight = 'bold';
            li.style.color = '#003087';
        }
        
        queueListEl.appendChild(li);
    });
}

// ===================================
// FUNCIÓN 10: RENDERIZAR ESTADO DEL EQUIPO
// ===================================
function renderTeamStatus() {
    const teamStatusEl = document.getElementById('teamStatus');
    teamStatusEl.innerHTML = '';
    
    teamMembers.forEach(member => {
        // Crear tarjeta de persona
        const personCard = document.createElement('div');
        personCard.className = 'person-card';
        
        // Nombre
        const nameEl = document.createElement('div');
        nameEl.className = 'person-name';
        nameEl.textContent = member;
        
        // Contenedor de botones
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'status-buttons';
        
        // Estados disponibles
        const statuses = [
            { key: 'presente', label: 'Presente' },
            { key: 'lunch', label: 'Lunch' },
            { key: 'meeting', label: 'Meeting' },
            { key: 'ausente', label: 'Ausente' }
        ];
        
        statuses.forEach(status => {
            const btn = document.createElement('button');
            btn.className = `status-btn ${status.key}`;
            btn.textContent = status.label;
            
            // Si es el estado actual, marcarlo como activo
            if (appState.teamStatus[member] === status.key) {
                btn.classList.add('active');
            }
            
            // Evento: cambiar estado
            btn.addEventListener('click', () => {
                changePersonStatus(member, status.key);
            });
            
            buttonsDiv.appendChild(btn);
        });
        
        personCard.appendChild(nameEl);
        personCard.appendChild(buttonsDiv);
        teamStatusEl.appendChild(personCard);
    });
}

// ===================================
// FUNCIÓN 11: CAMBIAR ESTADO DE UNA PERSONA
// ===================================
function changePersonStatus(member, newStatus) {
    appState.teamStatus[member] = newStatus;
    
    // Actualizar la cola según disponibilidad
    updateQueue();
    
    saveToLocalStorage();
    renderTeamStatus();
    renderQueue();
    
    console.log(`${member} cambió a: ${newStatus}`);
}

// ===================================
// FUNCIÓN 12: CONFIGURAR EVENT LISTENERS
// ===================================
function setupEventListeners() {
    // Botón: Generar Semana
    document.getElementById('generateWeek').addEventListener('click', () => {
        generateWeekAssignments();
    });
    
    // Botón: Siguiente
    document.getElementById('nextBtn').addEventListener('click', () => {
        nextTurn();
    });
}

// ===================================
// CONSOLA: Mensaje de bienvenida
// ===================================
console.log(`
🚀 Sistema de Asignación de Correos
📧 Equipo: ${teamMembers.join(', ')}
✅ Sistema inicializado correctamente
ℹ️ Ali solo aparece en turnos los LUNES
`);