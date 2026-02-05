import { saveToFirebase, listenToFirebase } from './firebase-config.js';

// ===================================
// DATOS INICIALES DE BACKUPS
// ===================================
const initialBackups = {
    'Alejandra Murillo': { backup1: 'Mónica Murillo', backup2: 'Sofia Calderon' },
    'Alisson Elizondo': { backup1: 'Alejandra Murillo', backup2: '' },
    'Mónica Murillo': { backup1: 'Daniela Rodriguez', backup2: 'Stephanie Gutierrez' },
    'Stephanie Gutierrez': { backup1: 'Alejandra Murillo', backup2: 'Jose Solano' },
    'Sofia Calderon': { backup1: 'Jose Solano', backup2: 'Mónica Murillo' },
    'Jose Solano': { backup1: 'Stephanie Gutierrez', backup2: 'Daniela Rodriguez' },
    'Daniela Rodriguez': { backup1: 'Sofia Calderon', backup2: 'Alejandra Murillo' }
};

// ===================================
// HORARIOS DE LUNCH INICIALES
// ===================================
const initialLunchTimes = {
    'Alejandra Murillo': '12:00 - 1:00',
    'Alisson Elizondo': '12:00 - 1:00',
    'Mónica Murillo': '11:00 - 12:00',
    'Stephanie Gutierrez': '1:00 - 2:00',
    'Sofia Calderon': '12:00 - 1:00',
    'Jose Solano': '2:00 - 3:00',
    'Daniela Rodriguez': '1:00 - 2:00'
};

// ===================================
// ESTADO DE LA SECCIÓN INFO
// ===================================
let infoState = {
    backups: { ...initialBackups },
    lunchTimes: { ...initialLunchTimes },
    editingRow: null
};

// Lista de miembros del equipo
const teamMembers = [
    'Alejandra Murillo',
    'Alisson Elizondo', 
    'Mónica Murillo',
    'Stephanie Gutierrez',
    'Sofia Calderon',
    'Jose Solano',
    'Daniela Rodriguez'
];

let isLoadingFromFirebase = false;
let hasInitialized = false;

// ===================================
// INICIALIZACIÓN
// ===================================
export function initInfoSection() {
    console.log('🚀 Iniciando sección INFO...');
    
    // Siempre renderizar al entrar a la pestaña
    renderBackupTable();
    renderLunchSchedule();
    
    // Solo cargar de Firebase una vez
    if (!hasInitialized) {
        hasInitialized = true;
        loadInfoData();
    }
}

// ===================================
// CARGAR DATOS DESDE FIREBASE
// ===================================
function loadInfoData() {
    console.log('📥 Intentando cargar datos de Firebase...');
    
    listenToFirebase((data) => {
        if (isLoadingFromFirebase) return;
        
        isLoadingFromFirebase = true;
        
        if (data && data.infoData) {
            infoState = {
                backups: data.infoData.backups || { ...initialBackups },
                lunchTimes: data.infoData.lunchTimes || { ...initialLunchTimes },
                editingRow: null
            };
            console.log('✅ Datos INFO cargados desde Firebase:', infoState);
        } else {
            // Primera vez, usar datos iniciales
            infoState.backups = { ...initialBackups };
            infoState.lunchTimes = { ...initialLunchTimes };
            console.log('✅ Usando datos iniciales de INFO');
            saveInfoData();
        }
        
        // Volver a renderizar con los datos cargados
        renderBackupTable();
        renderLunchSchedule();
        
        setTimeout(() => {
            isLoadingFromFirebase = false;
        }, 100);
    });
}

// ===================================
// GUARDAR DATOS EN FIREBASE
// ===================================
function saveInfoData() {
    if (isLoadingFromFirebase) {
        console.log('⏸️ Guardado omitido (cargando desde Firebase)');
        return;
    }
    
    console.log('💾 Guardando datos INFO en Firebase...');
    
    // Obtener el estado actual completo de Firebase
    listenToFirebase((currentData) => {
        const updatedData = {
            ...currentData,
            infoData: {
                backups: infoState.backups,
                lunchTimes: infoState.lunchTimes
            }
        };
        saveToFirebase(updatedData);
        console.log('✅ Datos INFO guardados');
    }, true);
}

// ===================================
// RENDERIZAR TABLA DE BACKUPS
// ===================================
function renderBackupTable() {
    console.log('🎨 Renderizando tabla de backups...');
    
    const tbody = document.getElementById('backupTableBody');
    if (!tbody) {
        console.error('❌ ERROR: No se encontró el elemento backupTableBody');
        return;
    }
    
    tbody.innerHTML = '';
    
    teamMembers.forEach(member => {
        const row = document.createElement('tr');
        row.id = `backup-row-${member}`;
        
        // Inicializar backups si no existen
        if (!infoState.backups[member]) {
            infoState.backups[member] = { backup1: '', backup2: '' };
        }
        
        // Columna: Agente
        const cellAgent = document.createElement('td');
        cellAgent.innerHTML = `<strong>${member}</strong>`;
        
        // Columna: Backup 1
        const cellBackup1 = document.createElement('td');
        const select1 = createBackupSelect(member, 'backup1', infoState.backups[member].backup1 || '');
        select1.disabled = true;
        cellBackup1.appendChild(select1);
        
        // Columna: Backup 2
        const cellBackup2 = document.createElement('td');
        const select2 = createBackupSelect(member, 'backup2', infoState.backups[member].backup2 || '');
        select2.disabled = true;
        cellBackup2.appendChild(select2);
        
        // Columna: Acciones
        const cellActions = document.createElement('td');
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.textContent = 'Editar';
        btnEdit.onclick = () => toggleEditMode(member, btnEdit);
        cellActions.appendChild(btnEdit);
        
        row.appendChild(cellAgent);
        row.appendChild(cellBackup1);
        row.appendChild(cellBackup2);
        row.appendChild(cellActions);
        tbody.appendChild(row);
    });
    
    console.log(`✅ Tabla renderizada con ${teamMembers.length} filas`);
}

// ===================================
// CREAR SELECT DE BACKUP
// ===================================
function createBackupSelect(agent, backupKey, selectedValue) {
    const select = document.createElement('select');
    select.id = `${agent}-${backupKey}`;
    select.className = 'backup-select';
    
    // Opción vacía
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Sin asignar --';
    select.appendChild(emptyOption);
    
    // Agregar otros miembros (excepto el agente mismo)
    teamMembers.forEach(member => {
        if (member !== agent) {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            
            if (member === selectedValue) {
                option.selected = true;
            }
            
            select.appendChild(option);
        }
    });
    
    return select;
}

// ===================================
// TOGGLE MODO EDICIÓN
// ===================================
function toggleEditMode(member, button) {
    const select1 = document.getElementById(`${member}-backup1`);
    const select2 = document.getElementById(`${member}-backup2`);
    
    if (button.textContent === 'Editar') {
        // Activar modo edición
        select1.disabled = false;
        select2.disabled = false;
        button.textContent = 'Guardar';
        button.classList.add('editing');
        infoState.editingRow = member;
        console.log(`✏️ Modo edición activado para ${member}`);
    } else {
        // Guardar cambios (con confirmación)
        showConfirmModal(
            '¿Seguro que quieres cambiar los backups?',
            'Los cambios se guardarán permanentemente.',
            () => {
                // Confirmar
                if (!infoState.backups[member]) {
                    infoState.backups[member] = {};
                }
                
                infoState.backups[member].backup1 = select1.value;
                infoState.backups[member].backup2 = select2.value;
                
                select1.disabled = true;
                select2.disabled = true;
                button.textContent = 'Editar';
                button.classList.remove('editing');
                infoState.editingRow = null;
                
                saveInfoData();
                console.log(`✅ Backups actualizados para ${member}:`, infoState.backups[member]);
            },
            () => {
                // Cancelar - restaurar valores originales
                select1.value = infoState.backups[member]?.backup1 || '';
                select2.value = infoState.backups[member]?.backup2 || '';
                select1.disabled = true;
                select2.disabled = true;
                button.textContent = 'Editar';
                button.classList.remove('editing');
                infoState.editingRow = null;
                console.log(`❌ Edición cancelada para ${member}`);
            }
        );
    }
}

// ===================================
// RENDERIZAR HORARIOS DE LUNCH
// ===================================
function renderLunchSchedule() {
    console.log('🎨 Renderizando horarios de lunch...');
    
    const container = document.getElementById('lunchSchedule');
    if (!container) {
        console.error('❌ ERROR: No se encontró el elemento lunchSchedule');
        return;
    }
    
    container.innerHTML = '';
    
    teamMembers.forEach(member => {
        const card = document.createElement('div');
        card.className = 'lunch-card';
        
        // Header con nombre
        const header = document.createElement('div');
        header.className = 'lunch-card-header';
        header.innerHTML = `<span>🍽️ ${member}</span>`;
        
        // Input de horario
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'lunch-time-input';
        input.value = infoState.lunchTimes[member] || '12:00 - 1:00';
        input.placeholder = 'Ej: 12:00 - 1:00';
        input.id = `lunch-input-${member.replace(/\s+/g, '-')}`;
        
        // Guardar valor original
        let originalValue = input.value;
        
        // Al hacer foco, guardar el valor original
        input.addEventListener('focus', () => {
            originalValue = input.value;
        });
        
        // Al perder el foco, verificar si cambió
        input.addEventListener('blur', () => {
            const newValue = input.value;
            
            // Solo mostrar confirmación si el valor cambió
            if (newValue !== originalValue) {
                showConfirmModal(
                    '¿Seguro que quieres cambiar el horario de lunch?',
                    `Cambiar horario de ${member} a: ${newValue}`,
                    () => {
                        // Confirmar - guardar
                        infoState.lunchTimes[member] = newValue;
                        originalValue = newValue; // Actualizar valor original
                        saveInfoData();
                        console.log(`✅ Horario de lunch actualizado para ${member}: ${newValue}`);
                    },
                    () => {
                        // Cancelar - restaurar valor original
                        input.value = originalValue;
                        console.log(`❌ Cambio de horario cancelado para ${member}`);
                    }
                );
            }
        });
        
        // También mostrar confirmación al presionar Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur(); // Esto activará el evento blur
            }
        });
        
        card.appendChild(header);
        card.appendChild(input);
        container.appendChild(card);
    });
    
    console.log(`✅ Horarios de lunch renderizados para ${teamMembers.length} personas`);
}

// ===================================
// MODAL DE CONFIRMACIÓN
// ===================================
function showConfirmModal(title, message, onConfirm, onCancel) {
    // Crear modal si no existe
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
                    <button class="btn-confirm" id="btnModalConfirm">Sí, guardar</button>
                    <button class="btn-cancel" id="btnModalCancel">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Actualizar contenido
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    
    // Mostrar modal
    modal.classList.add('active');
    
    // Limpiar event listeners anteriores
    const btnConfirm = document.getElementById('btnModalConfirm');
    const btnCancel = document.getElementById('btnModalCancel');
    
    const newBtnConfirm = btnConfirm.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    
    // Función para cerrar el modal
    const closeModal = () => {
        modal.classList.remove('active');
    };
    
    // Evento: Confirmar
    newBtnConfirm.onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };
    
    // Evento: Cancelar
    newBtnCancel.onclick = () => {
        closeModal();
        if (onCancel) onCancel();
    };
    
    // Cerrar con click fuera del modal
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    };
}

// ===================================
// LOG DE INICIALIZACIÓN
// ===================================
console.log('📋 Módulo INFO cargado correctamente');