import { saveToFirebase, listenToFirebase, loadFromFirebase } from './firebase-config.js';
import { initInfoSection } from './info.js';
import { initCalendarioSection, getPersonEventsToday, eventTypes } from './calendario.js';
import { initImportanteSection } from './importante.js';

// ===================================
// CONFIGURACIÓN DEL EQUIPO
// ===================================
const teamMembers = [
    'Moni', 'Ale', 'Jose', 'Steph', 'Dani', 'Sofi', 'Ali'
];

// Mapa de nombre corto → nombre completo (para cruzar con el calendario)
const nameMap = {
    'Moni':  'Mónica Murillo',
    'Ale':   'Alejandra Murillo',
    'Jose':  'Jose Solano',
    'Steph': 'Stephanie Gutierrez',
    'Dani':  'Daniela Rodriguez',
    'Sofi':  'Sofia Calderon',
    'Ali':   'Alisson Elizondo'
};

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ===================================
// ESTADO DE LA APLICACIÓN
// ===================================
let appState = {
    weekAssignments: {},
    queue:           [...teamMembers],
    currentIndex:    0,
    teamStatus:      {}
};

let isUpdatingFromFirebase = false;

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromFirebase((data) => {
        if (data) {
            appState = {
                weekAssignments: data.weekAssignments || {},
                queue:           data.queue           || [...teamMembers],
                currentIndex:    data.currentIndex    || 0,
                teamStatus:      data.teamStatus      || {}
            };
        }

        initializeTeamStatus();
        updateQueue();
        renderWeekGrid();
        renderQueue();
        renderTeamStatus();
        setupEventListeners();

        // Escuchar cambios en tiempo real
        listenToFirebase((newData) => {
            if (!isUpdatingFromFirebase) {
                isUpdatingFromFirebase = true;

                appState = {
                    weekAssignments: newData.weekAssignments || {},
                    queue:           newData.queue           || [...teamMembers],
                    currentIndex:    newData.currentIndex    || 0,
                    teamStatus:      newData.teamStatus      || {}
                };

                renderWeekGrid();
                renderQueue();
                renderTeamStatus();

                setTimeout(() => { isUpdatingFromFirebase = false; }, 100);
            }
        });
    });

    initTabs();
});

// ===================================
// GUARDAR EN FIREBASE
// ===================================
function saveState() {
    if (!isUpdatingFromFirebase) {
        saveToFirebase(appState);
    }
}

// ===================================
// INICIALIZAR ESTADO DEL EQUIPO
// ===================================
function initializeTeamStatus() {
    if (Object.keys(appState.teamStatus).length === 0) {
        teamMembers.forEach(member => {
            appState.teamStatus[member] = 'presente';
        });
    }
}

// ===================================
// OBTENER PERSONAS DISPONIBLES
// ===================================
function getAvailableMembers() {
    const today      = new Date();
    const dayOfWeek  = today.getDay();

    // Solo personas con estado "presente"
    let available = teamMembers.filter(member =>
        appState.teamStatus[member] === 'presente'
    );

    // Excluir personas con eventos en el calendario HOY
    available = available.filter(member => {
        const fullName     = nameMap[member];
        const calendarEvents = getPersonEventsToday(fullName);
        if (calendarEvents.length > 0) {
            console.log(`📅 ${member} excluido/a por evento en calendario: ${calendarEvents[0].type}`);
            return false;
        }
        return true;
    });

    // Ali solo trabaja los lunes
    if (dayOfWeek !== 1) {
        available = available.filter(member => member !== 'Ali');
        console.log('📅 Hoy no es Lunes — Ali excluida del sistema de turnos');
    } else {
        console.log('📅 Hoy es Lunes — Ali incluida en el sistema de turnos');
    }

    return available;
}

// ===================================
// GENERAR ASIGNACIÓN SEMANAL
// ===================================
function generateWeekAssignments() {
    appState.weekAssignments = {};

    const allMembers = [...teamMembers];

    // Fisher-Yates shuffle (más aleatorio que sort)
    for (let i = allMembers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allMembers[i], allMembers[j]] = [allMembers[j], allMembers[i]];
    }

    weekDays.forEach((day, index) => {
        appState.weekAssignments[day] = allMembers[index];
    });

    saveState();
    renderWeekGrid();

    console.log('📅 Semana generada:', appState.weekAssignments);
}

// ===================================
// RENDERIZAR GRID SEMANAL
// ===================================
function renderWeekGrid() {
    const weekGrid = document.getElementById('weekGrid');
    if (!weekGrid) return;

    weekGrid.innerHTML = '';

    weekDays.forEach(day => {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';

        const dayName = document.createElement('div');
        dayName.className = 'day-name';
        dayName.textContent = day;

        const select = document.createElement('select');
        select.id = `select-${day}`;

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Seleccionar --';
        select.appendChild(emptyOption);

        teamMembers.forEach(member => {
            const option    = document.createElement('option');
            option.value    = member;
            option.textContent = member;
            if (appState.weekAssignments[day] === member) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            appState.weekAssignments[day] = e.target.value;
            saveState();
            console.log(`${day} asignado a: ${e.target.value}`);
        });

        dayCard.appendChild(dayName);
        dayCard.appendChild(select);
        weekGrid.appendChild(dayCard);
    });
}

// ===================================
// ACTUALIZAR COLA DE TURNOS
// ===================================
function updateQueue() {
    const available = getAvailableMembers();

    if (available.length === 0) {
        appState.queue        = [];
        appState.currentIndex = 0;
        renderQueue();
        return;
    }

    appState.queue = [...available];

    if (appState.currentIndex >= appState.queue.length) {
        appState.currentIndex = 0;
    }

    const currentPerson = appState.queue[appState.currentIndex];
    if (!currentPerson || appState.teamStatus[currentPerson] !== 'presente') {
        appState.currentIndex = 0;
    }

    saveState();
    renderQueue();
}

// ===================================
// AVANZAR AL SIGUIENTE TURNO
// ===================================
function nextTurn() {
    const available = getAvailableMembers();

    if (available.length === 0) {
        alert('⚠️ No hay personas disponibles en la cola.');
        return;
    }

    appState.currentIndex = (appState.currentIndex + 1) % appState.queue.length;
    saveState();
    renderQueue();

    console.log('➡️ Avanzó al siguiente turno');
}

// ===================================
// RENDERIZAR SISTEMA DE TURNOS
// ===================================
function renderQueue() {
    const available = getAvailableMembers();

    const currentPersonEl = document.getElementById('currentPerson');
    if (currentPersonEl) {
        currentPersonEl.textContent = available.length === 0
            ? 'Sin personas disponibles'
            : (appState.queue[appState.currentIndex] || '-');
    }

    const nextPersonEl = document.getElementById('nextPerson');
    if (nextPersonEl) {
        if (available.length === 0) {
            nextPersonEl.textContent = '-';
        } else {
            const nextIndex = (appState.currentIndex + 1) % appState.queue.length;
            nextPersonEl.textContent = appState.queue[nextIndex] || '-';
        }
    }

    const queueListEl = document.getElementById('queueList');
    if (queueListEl) {
        queueListEl.innerHTML = '';
        appState.queue.forEach((member, index) => {
            const li = document.createElement('li');
            li.textContent = member;
            if (index === appState.currentIndex) {
                li.style.background  = '#FFD100';
                li.style.fontWeight  = 'bold';
                li.style.color       = '#003087';
            }
            queueListEl.appendChild(li);
        });
    }
}

// ===================================
// RENDERIZAR ESTADO DEL EQUIPO
// ===================================
function renderTeamStatus() {
    const teamStatusEl = document.getElementById('teamStatus');
    if (!teamStatusEl) return;

    teamStatusEl.innerHTML = '';

    teamMembers.forEach(member => {
        const fullName      = nameMap[member];
        const calEvents     = getPersonEventsToday(fullName);
        const hasCalEvent   = calEvents.length > 0;
        const calEventLabel = hasCalEvent
            ? (eventTypes.find(t => t.key === calEvents[0].type)?.label || calEvents[0].type)
            : null;

        const personCard = document.createElement('div');
        personCard.className = 'person-card';

        const nameEl = document.createElement('div');
        nameEl.className = 'person-name';
        nameEl.textContent = member;

        // Si tiene evento en calendario, mostrar badge
        if (hasCalEvent) {
            const badge = document.createElement('span');
            badge.className = 'cal-status-badge';
            badge.textContent = calEventLabel;
            nameEl.appendChild(badge);
        }

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'status-buttons';

        const statuses = [
            { key: 'presente', label: 'Presente' },
            { key: 'lunch',    label: 'Lunch'    },
            { key: 'meeting',  label: 'Meeting'  },
            { key: 'ausente',  label: 'Ausente'  }
        ];

        statuses.forEach(status => {
            const btn = document.createElement('button');
            btn.className = `status-btn ${status.key}`;
            btn.textContent = status.label;

            if (appState.teamStatus[member] === status.key) {
                btn.classList.add('active');
            }

            btn.addEventListener('click', () => {
                changePersonStatus(member, status.key, hasCalEvent, calEventLabel);
            });

            buttonsDiv.appendChild(btn);
        });

        personCard.appendChild(nameEl);
        personCard.appendChild(buttonsDiv);
        teamStatusEl.appendChild(personCard);
    });
}

// ===================================
// CAMBIAR ESTADO DE UNA PERSONA
// ===================================
function changePersonStatus(member, newStatus, hasCalEvent, calEventLabel) {
    // Si alguien con evento en calendario se quiere marcar como "presente"
    // → mostrar popup de confirmación
    if (newStatus === 'presente' && hasCalEvent) {
        showCalendarConflictModal(member, calEventLabel,
            () => {
                // Confirmado: agregar al queue igual
                applyStatusChange(member, newStatus);
            },
            () => {
                // Cancelado: no hacer nada
                console.log(`❌ Adición de ${member} al queue cancelada`);
            }
        );
        return;
    }

    applyStatusChange(member, newStatus);
}

function applyStatusChange(member, newStatus) {
    appState.teamStatus[member] = newStatus;
    updateQueue();
    saveState();
    renderTeamStatus();
    renderQueue();
    console.log(`${member} cambió a: ${newStatus}`);
}

// ===================================
// POPUP: CONFIRMAR AGREGAR AL QUEUE
// (cuando la persona tiene evento en el calendario)
// ===================================
function showCalendarConflictModal(member, calEventLabel, onConfirm, onCancel) {
    let modal = document.getElementById('calConflictModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'calConflictModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content cal-conflict-modal">
            <div class="cal-conflict-icon">📅</div>
            <h3>${member} está fuera</h3>
            <p class="cal-conflict-reason">
                Motivo: <strong>${calEventLabel}</strong>
            </p>
            <p class="cal-conflict-question">
                ¿Seguro que quieres agregarlo/a a la cola de turnos de todos modos?
            </p>
            <div class="modal-buttons">
                <button class="btn-confirm" id="calConflictConfirm">Sí, agregar al queue</button>
                <button class="btn-cancel"  id="calConflictCancel">Cancelar</button>
            </div>
        </div>
    `;

    modal.classList.add('active');

    const close = () => modal.classList.remove('active');

    document.getElementById('calConflictConfirm').onclick = () => {
        close();
        if (onConfirm) onConfirm();
    };

    document.getElementById('calConflictCancel').onclick = () => {
        close();
        if (onCancel) onCancel();
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            close();
            if (onCancel) onCancel();
        }
    };
}

// ===================================
// EVENT LISTENERS
// ===================================
function setupEventListeners() {
    const generateWeekBtn = document.getElementById('generateWeek');
    if (generateWeekBtn) {
        generateWeekBtn.addEventListener('click', generateWeekAssignments);
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', nextTurn);
    }
}

// ===================================
// SISTEMA DE NAVEGACIÓN POR PESTAÑAS
// ===================================
function initTabs() {
    const tabs  = document.querySelectorAll('.tab-item');
    const pages = document.querySelectorAll('.page-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPage = tab.dataset.tab;

            tabs.forEach(t  => t.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`page-${targetPage}`).classList.add('active');

            console.log(`📄 Navegando a: ${targetPage}`);

            if (targetPage === 'info')        initInfoSection();
            if (targetPage === 'reportes')    initCalendarioSection();
            if (targetPage === 'importante')  initImportanteSection();
        });
    });

    console.log('✅ Sistema de pestañas inicializado');
}