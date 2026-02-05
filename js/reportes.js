import { saveToFirebase, listenToFirebase } from './firebase-config.js';

// ===================================
// CONFIGURACIÓN
// ===================================
const teamMembers = [
    'Alejandra Murillo',
    'Alisson Elizondo', 
    'Mónica Murillo',
    'Stephanie Gutierrez',
    'Sofia Calderon',
    'Jose Solano',
    'Daniela Rodriguez'
];

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ===================================
// ESTADO DE LA SECCIÓN REPORTES
// ===================================
let reportesState = {
    currentWeekOffset: 0, // 0 = semana actual, -1 = anterior, 1 = siguiente
    weeklyAssignments: {}, // { 'YYYY-WW': { Lunes: 'Persona', ... } }
    reports: [], // Array de reportes guardados
    editingDay: null
};

let isLoadingFromFirebase = false;
let hasInitialized = false;

// ===================================
// INICIALIZACIÓN
// ===================================
export function initReportesSection() {
    console.log('🚀 Iniciando sección REPORTES...');
    
    // Siempre renderizar al entrar a la pestaña
    renderCalendar();
    renderReportsList();
    setupEventListeners();
    
    // Solo cargar de Firebase una vez
    if (!hasInitialized) {
        hasInitialized = true;
        loadReportesData();
    }
}

// ===================================
// CARGAR DATOS DESDE FIREBASE
// ===================================
function loadReportesData() {
    console.log('📥 Intentando cargar datos de Reportes...');
    
    listenToFirebase((data) => {
        if (isLoadingFromFirebase) return;
        
        isLoadingFromFirebase = true;
        
        if (data && data.reportesData) {
            reportesState = {
                currentWeekOffset: 0,
                weeklyAssignments: data.reportesData.weeklyAssignments || {},
                reports: data.reportesData.reports || [],
                editingDay: null
            };
            console.log('✅ Datos REPORTES cargados desde Firebase:', reportesState);
        } else {
            console.log('✅ Inicializando datos REPORTES por primera vez');
            saveReportesData();
        }
        
        // Volver a renderizar con los datos cargados
        renderCalendar();
        renderReportsList();
        
        setTimeout(() => {
            isLoadingFromFirebase = false;
        }, 100);
    });
}

// ===================================
// GUARDAR DATOS EN FIREBASE
// ===================================
function saveReportesData() {
    if (isLoadingFromFirebase) {
        console.log('⏸️ Guardado omitido (cargando desde Firebase)');
        return;
    }
    
    console.log('💾 Guardando datos REPORTES en Firebase...');
    
    listenToFirebase((currentData) => {
        const updatedData = {
            ...currentData,
            reportesData: {
                weeklyAssignments: reportesState.weeklyAssignments,
                reports: reportesState.reports
            }
        };
        saveToFirebase(updatedData);
        console.log('✅ Datos REPORTES guardados');
    }, true);
}

// ===================================
// OBTENER INFORMACIÓN DE LA SEMANA
// ===================================
function getWeekInfo(offset = 0) {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + (offset * 7));
    
    // Obtener el lunes de la semana
    const dayOfWeek = targetDate.getDay();
    const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(targetDate.setDate(diff));
    
    // Calcular número de semana del año
    const onejan = new Date(monday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((monday - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    
    const weekKey = `${monday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    
    return {
        weekKey,
        monday,
        weekNumber,
        year: monday.getFullYear()
    };
}

// ===================================
// RENDERIZAR CALENDARIO
// ===================================
function renderCalendar() {
    console.log('📅 Renderizando calendario...');
    
    const calendarGrid = document.getElementById('calendarGrid');
    const weekDisplay = document.getElementById('currentWeekDisplay');
    
    if (!calendarGrid || !weekDisplay) {
        console.error('❌ ERROR: Elementos del calendario no encontrados');
        return;
    }
    
    const weekInfo = getWeekInfo(reportesState.currentWeekOffset);
    const { weekKey, monday } = weekInfo;
    
    // Actualizar display de semana
    const endDate = new Date(monday);
    endDate.setDate(endDate.getDate() + 4);
    weekDisplay.textContent = `Semana ${weekInfo.weekNumber} - ${formatDate(monday)} al ${formatDate(endDate)}`;
    
    // Obtener asignaciones de esta semana
    if (!reportesState.weeklyAssignments[weekKey]) {
        reportesState.weeklyAssignments[weekKey] = {};
    }
    
    calendarGrid.innerHTML = '';
    
    weekDays.forEach((day, index) => {
        const dayDate = new Date(monday);
        dayDate.setDate(dayDate.getDate() + index);
        
        const dayCard = createDayCard(day, dayDate, weekKey);
        calendarGrid.appendChild(dayCard);
    });
    
    console.log('✅ Calendario renderizado para', weekKey);
}

// ===================================
// CREAR TARJETA DE DÍA
// ===================================
function createDayCard(dayName, date, weekKey) {
    const card = document.createElement('div');
    card.className = 'calendar-day';
    
    // Header
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.innerHTML = `
        <span class="calendar-day-name">${dayName}</span>
        <span class="calendar-day-date">${formatDate(date)}</span>
    `;
    
    // Select de persona
    const personDiv = document.createElement('div');
    personDiv.className = 'calendar-day-person';
    
    const select = document.createElement('select');
    select.id = `day-select-${dayName}`;
    select.disabled = true;
    
    // Opción vacía
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Sin asignar --';
    select.appendChild(emptyOption);
    
    // Agregar personas
    teamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        
        // Si hay asignación guardada, seleccionarla
        if (reportesState.weeklyAssignments[weekKey][dayName] === member) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
    
    personDiv.appendChild(select);
    
    // Botón editar
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-edit-day';
    btnEdit.textContent = 'Editar';
    btnEdit.onclick = () => toggleDayEdit(dayName, weekKey, btnEdit);
    
    card.appendChild(header);
    card.appendChild(personDiv);
    card.appendChild(btnEdit);
    
    return card;
}

// ===================================
// TOGGLE EDICIÓN DE DÍA
// ===================================
function toggleDayEdit(dayName, weekKey, button) {
    const select = document.getElementById(`day-select-${dayName}`);
    
    if (button.textContent === 'Editar') {
        // Activar edición
        select.disabled = false;
        button.textContent = 'Guardar';
        button.classList.add('editing');
        reportesState.editingDay = dayName;
        console.log(`✏️ Editando ${dayName}`);
    } else {
        // Guardar con confirmación
        showConfirmModal(
            '¿Guardar cambios en el calendario?',
            `Se actualizará la asignación para ${dayName}`,
            () => {
                // Confirmar
                reportesState.weeklyAssignments[weekKey][dayName] = select.value;
                select.disabled = true;
                button.textContent = 'Editar';
                button.classList.remove('editing');
                reportesState.editingDay = null;
                
                saveReportesData();
                console.log(`✅ ${dayName} actualizado a: ${select.value}`);
            },
            () => {
                // Cancelar
                select.value = reportesState.weeklyAssignments[weekKey][dayName] || '';
                select.disabled = true;
                button.textContent = 'Editar';
                button.classList.remove('editing');
                reportesState.editingDay = null;
                console.log(`❌ Cambio cancelado para ${dayName}`);
            }
        );
    }
}

// ===================================
// GENERAR REPORTE
// ===================================
function generateReport() {
    const weekInfo = getWeekInfo(reportesState.currentWeekOffset);
    const { weekKey } = weekInfo;
    
    const assignments = reportesState.weeklyAssignments[weekKey];
    
    // Verificar que haya al menos una asignación
    const hasAssignments = Object.values(assignments || {}).some(person => person);
    
    if (!hasAssignments) {
        alert('⚠️ No hay asignaciones en esta semana para generar el reporte.');
        return;
    }
    
    // Crear reporte
    const report = {
        id: Date.now(),
        weekKey,
        weekNumber: weekInfo.weekNumber,
        year: weekInfo.year,
        createdAt: new Date().toISOString(),
        assignments: { ...assignments }
    };
    
    // Agregar al inicio del array
    reportesState.reports.unshift(report);
    
    saveReportesData();
    renderReportsList();
    
    alert(`✅ Reporte generado para la Semana ${weekInfo.weekNumber}`);
    console.log('📊 Reporte generado:', report);
}

// ===================================
// RENDERIZAR LISTA DE REPORTES
// ===================================
function renderReportsList() {
    console.log('📊 Renderizando lista de reportes...');
    
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) {
        console.error('❌ ERROR: Elemento reportsList no encontrado');
        return;
    }
    
    reportsList.innerHTML = '';
    
    if (reportesState.reports.length === 0) {
        reportsList.innerHTML = '<div class="empty-reports">📭 No hay reportes guardados aún</div>';
        return;
    }
    
    reportesState.reports.forEach(report => {
        const reportItem = createReportItem(report);
        reportsList.appendChild(reportItem);
    });
    
    console.log(`✅ ${reportesState.reports.length} reportes renderizados`);
}

// ===================================
// CREAR ITEM DE REPORTE
// ===================================
function createReportItem(report) {
    const item = document.createElement('div');
    item.className = 'report-item';
    
    // Header
    const header = document.createElement('div');
    header.className = 'report-header';
    header.innerHTML = `
        <div>
            <div class="report-title">📅 Semana ${report.weekNumber} - ${report.year}</div>
            <div class="report-date">Generado: ${formatDateTime(report.createdAt)}</div>
        </div>
        <button class="btn-delete-report" onclick="window.deleteReport(${report.id})">Eliminar</button>
    `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'report-content';
    
    weekDays.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'report-day';
        dayDiv.innerHTML = `
            <div class="report-day-name">${day}</div>
            <div class="report-day-person">${report.assignments[day] || '-- Sin asignar --'}</div>
        `;
        content.appendChild(dayDiv);
    });
    
    item.appendChild(header);
    item.appendChild(content);
    
    return item;
}

// ===================================
// ELIMINAR REPORTE
// ===================================
window.deleteReport = function(reportId) {
    showConfirmModal(
        '¿Eliminar este reporte?',
        'Esta acción no se puede deshacer',
        () => {
            reportesState.reports = reportesState.reports.filter(r => r.id !== reportId);
            saveReportesData();
            renderReportsList();
            console.log(`🗑️ Reporte ${reportId} eliminado`);
        }
    );
};

// ===================================
// LIMPIAR HISTORIAL
// ===================================
function clearHistory() {
    if (reportesState.reports.length === 0) {
        alert('⚠️ No hay reportes para eliminar');
        return;
    }
    
    showConfirmModal(
        '¿Limpiar todo el historial?',
        'Se eliminarán todos los reportes guardados',
        () => {
            reportesState.reports = [];
            saveReportesData();
            renderReportsList();
            console.log('🗑️ Historial limpiado');
        }
    );
}

// ===================================
// NAVEGACIÓN DE SEMANAS
// ===================================
function changeWeek(direction) {
    reportesState.currentWeekOffset += direction;
    renderCalendar();
    console.log(`📆 Navegando a offset: ${reportesState.currentWeekOffset}`);
}

// ===================================
// UTILIDADES
// ===================================
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// ===================================
// MODAL DE CONFIRMACIÓN (reutiliza del módulo info)
// ===================================
function showConfirmModal(title, message, onConfirm, onCancel) {
    let modal = document.getElementById('confirmModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 id="modalTitle"></h3>
                <p id="modalMessage"></p>
                <div class="modal-buttons">
                    <button class="btn-confirm" id="btnModalConfirm">Sí, continuar</button>
                    <button class="btn-cancel" id="btnModalCancel">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    modal.classList.add('active');
    
    const btnConfirm = document.getElementById('btnModalConfirm');
    const btnCancel = document.getElementById('btnModalCancel');
    
    const newBtnConfirm = btnConfirm.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    
    const closeModal = () => modal.classList.remove('active');
    
    newBtnConfirm.onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };
    
    newBtnCancel.onclick = () => {
        closeModal();
        if (onCancel) onCancel();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    };
}

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function setupEventListeners() {
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    if (prevWeekBtn) prevWeekBtn.onclick = () => changeWeek(-1);
    if (nextWeekBtn) nextWeekBtn.onclick = () => changeWeek(1);
    if (generateReportBtn) generateReportBtn.onclick = generateReport;
    if (clearHistoryBtn) clearHistoryBtn.onclick = clearHistory;
    
    console.log('✅ Event listeners de REPORTES configurados');
}

// ===================================
// LOG DE INICIALIZACIÓN
// ===================================
console.log('📊 Módulo REPORTES cargado correctamente');