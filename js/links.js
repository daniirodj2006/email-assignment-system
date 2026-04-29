import { saveFieldToFirebase, loadFieldFromFirebase, listenFieldFromFirebase } from './firebase-config.js';

// ===================================
// CATEGORÍAS DE LINKS
// ===================================
const LINK_CATEGORIES = [
    '📌 General',
    '📋 Proceso',
    '🛠️ Herramientas',
    '📊 Reportes',
    '📚 Documentación',
    '🔗 Recursos',
];

// ===================================
// ESTADO
// ===================================
let linksState = {
    links: []
    /**
     * Cada link:
     * {
     *   id:          string,
     *   title:       string,
     *   url:         string,
     *   description: string,
     *   category:    string,
     *   pinned:      boolean,
     *   createdAt:   string (ISO),
     *   updatedAt:   string (ISO)
     * }
     */
};

let isSyncingFromFirebase = false;
let hasInitialized        = false;
let activeLinksFilter     = 'all';   // 'all' | category string | 'pinned'
let searchQuery           = '';

// ===================================
// INICIALIZACIÓN
// ===================================
export function initLinksSection() {
    console.log('🔗 Iniciando sección LINKS...');
    renderLinks();
    renderLinksFilters();
    setupLinksListeners();

    if (!hasInitialized) {
        hasInitialized = true;
        loadLinksData();
    }
}

// ===================================
// FIREBASE
// ===================================
function loadLinksData() {
    // 1. Carga inicial
    loadFieldFromFirebase('teamLinks', (data) => {
        if (Array.isArray(data)) {
            linksState.links = data;
            console.log('✅ Links cargados:', linksState.links.length);
        }
        renderLinks();
        renderLinksFilters();
    });

    // 2. Escuchar cambios en tiempo real (otros usuarios)
    listenFieldFromFirebase('teamLinks', (data) => {
        if (isSyncingFromFirebase) return;
        isSyncingFromFirebase = true;
        if (Array.isArray(data)) {
            linksState.links = data;
            renderLinks();
            renderLinksFilters();
        }
        setTimeout(() => { isSyncingFromFirebase = false; }, 200);
    });
}

function saveLinksData() {
    isSyncingFromFirebase = true;
    saveFieldToFirebase('teamLinks', linksState.links);
    setTimeout(() => { isSyncingFromFirebase = false; }, 500);
}

// ===================================
// RENDERIZAR FILTROS
// ===================================
function renderLinksFilters() {
    const container = document.getElementById('linkFilters');
    if (!container) return;

    container.innerHTML = '';

    // Botón "Todos"
    const allBtn = document.createElement('button');
    allBtn.className = 'note-filter-btn' + (activeLinksFilter === 'all' ? ' active' : '');
    allBtn.textContent = '🔗 Todos';
    allBtn.onclick = () => { activeLinksFilter = 'all'; renderLinksFilters(); renderLinks(); };
    container.appendChild(allBtn);

    // Botón "Fijados"
    const pinnedCount = linksState.links.filter(l => l.pinned).length;
    if (pinnedCount > 0) {
        const pinBtn = document.createElement('button');
        pinBtn.className = 'note-filter-btn' + (activeLinksFilter === 'pinned' ? ' active' : '');
        pinBtn.textContent = `📌 Fijados (${pinnedCount})`;
        pinBtn.onclick = () => { activeLinksFilter = 'pinned'; renderLinksFilters(); renderLinks(); };
        container.appendChild(pinBtn);
    }

    // Botones por categoría (solo categorías que tienen links)
    const usedCats = [...new Set(linksState.links.map(l => l.category).filter(Boolean))];
    usedCats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'note-filter-btn' + (activeLinksFilter === cat ? ' active' : '');
        btn.textContent = cat;
        btn.onclick = () => { activeLinksFilter = cat; renderLinksFilters(); renderLinks(); };
        container.appendChild(btn);
    });
}

// ===================================
// RENDERIZAR LINKS
// ===================================
function renderLinks() {
    const grid = document.getElementById('linksGrid');
    if (!grid) return;

    // Filtrar por categoría / fijados
    let links = [...linksState.links];
    if (activeLinksFilter === 'pinned') {
        links = links.filter(l => l.pinned);
    } else if (activeLinksFilter !== 'all') {
        links = links.filter(l => l.category === activeLinksFilter);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        links = links.filter(l =>
            l.title.toLowerCase().includes(q) ||
            l.url.toLowerCase().includes(q) ||
            (l.description || '').toLowerCase().includes(q)
        );
    }

    // Ordenar: fijados primero, luego por fecha
    links.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return  1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    if (links.length === 0) {
        grid.innerHTML = `
            <div class="links-empty">
                <div class="links-empty-icon">🔗</div>
                <p>${
                    searchQuery.trim()
                        ? 'No se encontraron links con esa búsqueda.'
                        : activeLinksFilter === 'all'
                            ? 'No hay links todavía. ¡Agrega uno!'
                            : 'No hay links con este filtro.'
                }</p>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    links.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card' + (link.pinned ? ' link-card--pinned' : '');

        const favicon = getFaviconUrl(link.url);
        const domain  = getDomain(link.url);
        const dateLabel = formatRelativeDate(link.updatedAt);

        card.innerHTML = `
            <div class="link-card-header">
                <div class="link-favicon-wrap">
                    <img class="link-favicon" src="${favicon}" alt=""
                        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22><text y=%2215%22 font-size=%2215%22>🔗</text></svg>'">
                </div>
                <div class="link-meta">
                    <span class="link-category">${link.category || ''}</span>
                    <span class="link-domain">${domain}</span>
                </div>
                <div class="link-actions">
                    <button class="note-action-btn ${link.pinned ? 'pinned' : ''}"
                        title="${link.pinned ? 'Desfijar' : 'Fijar'}"
                        onclick="window.toggleLinkPin('${link.id}')">📌</button>
                    <button class="note-action-btn"
                        title="Editar"
                        onclick="window.editLink('${link.id}')">✏️</button>
                    <button class="note-action-btn delete"
                        title="Eliminar"
                        onclick="window.deleteLink('${link.id}')">🗑️</button>
                </div>
            </div>

            <div class="link-card-body">
                <h3 class="link-title">${escapeHtml(link.title)}</h3>
                ${link.description
                    ? `<p class="link-description">${escapeHtml(link.description)}</p>`
                    : ''}
            </div>

            <div class="link-card-footer">
                <span class="link-date">${dateLabel}</span>
                <div class="link-footer-actions">
                    <button class="btn-copy-link"
                        title="Copiar URL"
                        onclick="window.copyLinkUrl('${escapeHtml(link.url)}', this)">
                        📋 Copiar
                    </button>
                    <a class="btn-open-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">
                        🚀 Abrir
                    </a>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ===================================
// MODAL: AGREGAR / EDITAR LINK
// ===================================
function openLinkModal(editId = null) {
    const existing = editId ? linksState.links.find(l => l.id === editId) : null;

    let modal = document.getElementById('linkModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'linkModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const catsHTML = LINK_CATEGORIES.map(c =>
        `<option value="${c}" ${existing?.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    modal.innerHTML = `
        <div class="modal-content note-modal-content">
            <div class="note-modal-header">
                <h3>${editId ? '✏️ Editar Link' : '➕ Nuevo Link'}</h3>
                <button class="modal-close-btn" id="closeLinkModal">✕</button>
            </div>

            <div class="note-modal-body">

                <!-- URL -->
                <div class="form-group">
                    <label class="form-label">🔗 URL <span style="color:#EF4444">*</span></label>
                    <input type="url" id="linkUrl" class="modal-input"
                        placeholder="https://ejemplo.com"
                        value="${escapeHtml(existing?.url || '')}">
                </div>

                <!-- Título -->
                <div class="form-group">
                    <label class="form-label">📝 Título <span style="color:#EF4444">*</span></label>
                    <input type="text" id="linkTitle" class="modal-input"
                        placeholder="Ej: Portal de Reportes"
                        value="${escapeHtml(existing?.title || '')}">
                </div>

                <!-- Descripción -->
                <div class="form-group">
                    <label class="form-label">📄 Descripción (opcional)</label>
                    <textarea id="linkDescription" class="modal-textarea"
                        placeholder="¿Para qué sirve este link?"
                        rows="3">${escapeHtml(existing?.description || '')}</textarea>
                </div>

                <!-- Categoría -->
                <div class="form-group">
                    <label class="form-label">🏷️ Categoría</label>
                    <select id="linkCategory" class="modal-select">
                        <option value="">Sin categoría</option>
                        ${catsHTML}
                    </select>
                </div>

                <button id="saveLinkBtn" class="btn-confirm" style="width:100%">
                    ${editId ? 'Guardar Cambios' : 'Agregar Link'}
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');

    document.getElementById('closeLinkModal').onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    // Auto-completar título desde URL
    const urlInput   = document.getElementById('linkUrl');
    const titleInput = document.getElementById('linkTitle');
    urlInput.addEventListener('blur', () => {
        if (urlInput.value && !titleInput.value) {
            titleInput.value = getDomain(urlInput.value);
        }
    });

    setTimeout(() => urlInput.focus(), 100);

    document.getElementById('saveLinkBtn').onclick = () => {
        const url         = document.getElementById('linkUrl').value.trim();
        const title       = document.getElementById('linkTitle').value.trim();
        const description = document.getElementById('linkDescription').value.trim();
        const category    = document.getElementById('linkCategory').value;

        if (!url)   { alert('⚠️ La URL es obligatoria.');   return; }
        if (!title) { alert('⚠️ El título es obligatorio.'); return; }

        // Validación básica de URL
        try { new URL(url); } catch {
            alert('⚠️ La URL no es válida. Asegúrate de incluir https://');
            return;
        }

        const now = new Date().toISOString();

        if (editId) {
            const idx = linksState.links.findIndex(l => l.id === editId);
            if (idx !== -1) {
                linksState.links[idx] = {
                    ...linksState.links[idx],
                    url, title, description, category,
                    updatedAt: now
                };
            }
        } else {
            linksState.links.push({
                id:          `link_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                url, title, description, category,
                pinned:      false,
                createdAt:   now,
                updatedAt:   now
            });
        }

        saveLinksData();
        renderLinks();
        renderLinksFilters();
        modal.classList.remove('active');
        console.log(editId ? '✅ Link editado' : '✅ Link agregado');
    };
}

// ===================================
// ACCIONES GLOBALES
// ===================================
window.toggleLinkPin = function(id) {
    const link = linksState.links.find(l => l.id === id);
    if (!link) return;
    link.pinned    = !link.pinned;
    link.updatedAt = new Date().toISOString();
    saveLinksData();
    renderLinks();
    renderLinksFilters();
};

window.editLink = function(id) {
    openLinkModal(id);
};

window.deleteLink = function(id) {
    if (!confirm('¿Eliminar este link?')) return;
    linksState.links = linksState.links.filter(l => l.id !== id);
    saveLinksData();
    renderLinks();
    renderLinksFilters();
};

window.copyLinkUrl = function(url, btn) {
    navigator.clipboard.writeText(url).then(() => {
        const original = btn.textContent;
        btn.textContent = '✅ Copiado';
        btn.style.background = '#10B981';
        btn.style.color = 'white';
        setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    });
};

// ===================================
// EVENT LISTENERS
// ===================================
function setupLinksListeners() {
    document.getElementById('addLinkBtn')?.addEventListener('click', () => openLinkModal());

    const searchInput = document.getElementById('linksSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderLinks();
        });
        // Limpiar búsqueda
        document.getElementById('linksClearSearch')?.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            renderLinks();
        });
    }
}

// ===================================
// UTILS
// ===================================
function getFaviconUrl(url) {
    try {
        const { origin } = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
    } catch {
        return '';
    }
}

function getDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url;
    }
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatRelativeDate(iso) {
    if (!iso) return '';
    const diff  = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  <  1) return 'Ahora mismo';
    if (mins  < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days  <  7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    return new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
}

console.log('🔗 Módulo LINKS cargado correctamente');