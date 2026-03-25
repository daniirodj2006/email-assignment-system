import { saveFieldToFirebase, loadFieldFromFirebase, listenFieldFromFirebase } from './firebase-config.js';

// ===================================
// COLORES DE NOTAS
// ===================================
const NOTE_COLORS = [
    { key: 'yellow',  bg: '#FEF9C3', border: '#FDE047', label: '🟡' },
    { key: 'blue',    bg: '#DBEAFE', border: '#93C5FD', label: '🔵' },
    { key: 'green',   bg: '#DCFCE7', border: '#86EFAC', label: '🟢' },
    { key: 'red',     bg: '#f1c5f1', border: '#eb52b0', label: '🩷' },
    { key: 'purple',  bg: '#EDE9FE', border: '#C4B5FD', label: '🟣' },
    { key: 'orange',  bg: '#FFEDD5', border: '#FDBA74', label: '🟠' },
];

// Categorías tipo etiqueta
const NOTE_TAGS = [
    '📌 General',
    '🚨 Importante',
    '📋 Proceso',
    
];

// ===================================
// ESTADO
// ===================================
let importanteState = {
    notes: []
    /**
     * Cada nota:
     * {
     *   id:        string,
     *   title:     string,
     *   content:   string,
     *   color:     string,   // key del color
     *   tag:       string,
     *   pinned:    boolean,
     *   createdAt: string (ISO),
     *   updatedAt: string (ISO)
     * }
     */
};

let isLoadingFromFirebase = false;
let hasInitialized        = false;
let activeFilter          = 'all'; // 'all' | tag string

// ===================================
// INICIALIZACIÓN
// ===================================
export function initImportanteSection() {
    console.log('🚀 Iniciando sección IMPORTANTE...');
    renderNotes();
    renderFilters();
    setupImportanteListeners();

    if (!hasInitialized) {
        hasInitialized = true;
        loadImportanteData();
    }
}

// ===================================
// FIREBASE
// ===================================
let isSyncingFromFirebase = false;

function loadImportanteData() {
    // 1. Carga inicial
    loadFieldFromFirebase('importanteNotes', (data) => {
        if (Array.isArray(data)) {
            importanteState.notes = data;
            console.log('✅ Notas cargadas:', importanteState.notes.length);
        }
        renderNotes();
        renderFilters();
    });

    // 2. Escuchar cambios en tiempo real (otros usuarios)
    listenFieldFromFirebase('importanteNotes', (data) => {
        if (isSyncingFromFirebase) return;
        isSyncingFromFirebase = true;
        if (Array.isArray(data)) {
            importanteState.notes = data;
            renderNotes();
            renderFilters();
        }
        setTimeout(() => { isSyncingFromFirebase = false; }, 200);
    });
}

function saveImportanteData() {
    // Marcar como "yo estoy guardando" para ignorar el eco del listener
    isSyncingFromFirebase = true;
    saveFieldToFirebase('importanteNotes', importanteState.notes);
    setTimeout(() => { isSyncingFromFirebase = false; }, 500);
}

// ===================================
// RENDERIZAR FILTROS POR TAG
// ===================================
function renderFilters() {
    const container = document.getElementById('noteFilters');
    if (!container) return;

    container.innerHTML = '';

    // Botón "Todas"
    const allBtn = document.createElement('button');
    allBtn.className = 'note-filter-btn' + (activeFilter === 'all' ? ' active' : '');
    allBtn.textContent = '📋 Todas';
    allBtn.onclick = () => { activeFilter = 'all'; renderFilters(); renderNotes(); };
    container.appendChild(allBtn);

    // Botón "Fijadas"
    const pinnedCount = importanteState.notes.filter(n => n.pinned).length;
    if (pinnedCount > 0) {
        const pinBtn = document.createElement('button');
        pinBtn.className = 'note-filter-btn' + (activeFilter === 'pinned' ? ' active' : '');
        pinBtn.textContent = `📌 Fijadas (${pinnedCount})`;
        pinBtn.onclick = () => { activeFilter = 'pinned'; renderFilters(); renderNotes(); };
        container.appendChild(pinBtn);
    }

    // Botones por tag
    const usedTags = [...new Set(importanteState.notes.map(n => n.tag).filter(Boolean))];
    usedTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'note-filter-btn' + (activeFilter === tag ? ' active' : '');
        btn.textContent = tag;
        btn.onclick = () => { activeFilter = tag; renderFilters(); renderNotes(); };
        container.appendChild(btn);
    });
}

// ===================================
// RENDERIZAR NOTAS
// ===================================
function renderNotes() {
    const grid = document.getElementById('notesGrid');
    if (!grid) return;

    // Filtrar
    let notes = [...importanteState.notes];
    if (activeFilter === 'pinned') {
        notes = notes.filter(n => n.pinned);
    } else if (activeFilter !== 'all') {
        notes = notes.filter(n => n.tag === activeFilter);
    }

    // Ordenar: fijadas primero, luego por fecha de actualización
    notes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return  1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    if (notes.length === 0) {
        grid.innerHTML = `
            <div class="notes-empty">
                <div class="notes-empty-icon">📝</div>
                <p>${activeFilter === 'all'
                    ? 'No hay notas todavía. ¡Agrega una!'
                    : 'No hay notas con este filtro.'}</p>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    notes.forEach(note => {
        const colorDef = NOTE_COLORS.find(c => c.key === note.color) || NOTE_COLORS[0];
        const card     = document.createElement('div');
        card.className = 'note-card' + (note.pinned ? ' note-card--pinned' : '');
        card.style.background   = colorDef.bg;
        card.style.borderColor  = colorDef.border;

        const updatedLabel = formatRelativeDate(note.updatedAt);

        card.innerHTML = `
            <div class="note-card-header">
                <span class="note-tag">${note.tag || ''}</span>
                <div class="note-actions">
                    <button class="note-action-btn ${note.pinned ? 'pinned' : ''}"
                        title="${note.pinned ? 'Desfijar' : 'Fijar nota'}"
                        onclick="window.toggleNotePin('${note.id}')">📌</button>
                    <button class="note-action-btn"
                        title="Editar"
                        onclick="window.editNote('${note.id}')">✏️</button>
                    <button class="note-action-btn delete"
                        title="Eliminar"
                        onclick="window.deleteNote('${note.id}')">🗑️</button>
                </div>
            </div>
            ${note.title ? `<div class="note-title">${escapeHtml(note.title)}</div>` : ''}
            <div class="note-content">${escapeHtml(note.content).replace(/\n/g, '<br>')}</div>
            <div class="note-footer">
                <span class="note-date">${updatedLabel}</span>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ===================================
// MODAL: AGREGAR / EDITAR NOTA
// ===================================
function openNoteModal(editId = null) {
    const existing = editId ? importanteState.notes.find(n => n.id === editId) : null;

    let modal = document.getElementById('noteModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'noteModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const colorsHTML = NOTE_COLORS.map(c => `
        <label class="color-swatch-label" title="${c.key}">
            <input type="radio" name="noteColor" value="${c.key}"
                ${(existing?.color || 'yellow') === c.key ? 'checked' : ''}>
            <span class="color-swatch" style="background:${c.bg};border:2px solid ${c.border}">${c.label}</span>
        </label>`).join('');

    const tagsHTML = NOTE_TAGS.map(t => `
        <option value="${t}" ${existing?.tag === t ? 'selected' : ''}>${t}</option>`).join('');

    modal.innerHTML = `
        <div class="modal-content note-modal-content">
            <div class="note-modal-header">
                <h3>${editId ? '✏️ Editar Nota' : '➕ Nueva Nota'}</h3>
                <button class="modal-close-btn" id="closeNoteModal">✕</button>
            </div>

            <div class="note-modal-body">
                <!-- Color -->
                <div class="form-group">
                    <label class="form-label">🎨 Color</label>
                    <div class="color-swatches-row">${colorsHTML}</div>
                </div>

                <!-- Tag -->
                <div class="form-group">
                    <label class="form-label">🏷️ Categoría</label>
                    <select id="noteTag" class="modal-select">
                        <option value="">Sin categoría</option>
                        ${tagsHTML}
                    </select>
                </div>

                <!-- Título -->
                <div class="form-group">
                    <label class="form-label">📝 Título (opcional)</label>
                    <input type="text" id="noteTitle" class="modal-input"
                        placeholder="Ej: Proceso de escalación"
                        value="${escapeHtml(existing?.title || '')}">
                </div>

                <!-- Contenido -->
                <div class="form-group">
                    <label class="form-label">📄 Contenido</label>
                    <textarea id="noteContent" class="modal-textarea"
                        placeholder="Escribe aquí la información importante..."
                        rows="5">${escapeHtml(existing?.content || '')}</textarea>
                </div>

                <button id="saveNoteBtn" class="btn-confirm" style="width:100%">
                    ${editId ? 'Guardar Cambios' : 'Crear Nota'}
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');

    document.getElementById('closeNoteModal').onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    // Foco en el contenido
    setTimeout(() => document.getElementById('noteContent')?.focus(), 100);

    document.getElementById('saveNoteBtn').onclick = () => {
        const title   = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const color   = document.querySelector('input[name="noteColor"]:checked')?.value || 'yellow';
        const tag     = document.getElementById('noteTag').value;

        if (!content) { alert('⚠️ El contenido no puede estar vacío.'); return; }

        const now = new Date().toISOString();

        if (editId) {
            const idx = importanteState.notes.findIndex(n => n.id === editId);
            if (idx !== -1) {
                importanteState.notes[idx] = {
                    ...importanteState.notes[idx],
                    title, content, color, tag,
                    updatedAt: now
                };
            }
        } else {
            importanteState.notes.push({
                id:        `note_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                title, content, color, tag,
                pinned:    false,
                createdAt: now,
                updatedAt: now
            });
        }

        saveImportanteData();
        renderNotes();
        renderFilters();
        modal.classList.remove('active');
        console.log(editId ? '✅ Nota editada' : '✅ Nota creada');
    };
}

// ===================================
// ACCIONES GLOBALES
// ===================================
window.toggleNotePin = function(id) {
    const note = importanteState.notes.find(n => n.id === id);
    if (!note) return;
    note.pinned    = !note.pinned;
    note.updatedAt = new Date().toISOString();
    saveImportanteData();
    renderNotes();
    renderFilters();
};

window.editNote = function(id) {
    openNoteModal(id);
};

window.deleteNote = function(id) {
    if (!confirm('¿Eliminar esta nota?')) return;
    importanteState.notes = importanteState.notes.filter(n => n.id !== id);
    saveImportanteData();
    renderNotes();
    renderFilters();
};

// ===================================
// EVENT LISTENERS
// ===================================
function setupImportanteListeners() {
    document.getElementById('addNoteBtn')?.addEventListener('click', () => openNoteModal());
}

// ===================================
// UTILS
// ===================================
function escapeHtml(str = '') {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatRelativeDate(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  <  1) return 'Ahora mismo';
    if (mins  < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days  <  7) return `Hace ${days} día${days>1?'s':''}`;
    return new Date(iso).toLocaleDateString('es-CR', { day:'numeric', month:'short' });
}

console.log('📌 Módulo IMPORTANTE cargado correctamente');