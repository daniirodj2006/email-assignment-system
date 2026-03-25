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

export const eventTypes = [
    { key: 'curso',           label: '📚 Curso',           color: '#3B82F6' },
    { key: 'dia_libre',       label: '🌴 Día Libre',        color: '#10B981' },
    { key: 'sick_day',        label: '🤒 Sick Day',         color: '#EF4444' },
    { key: 'vacaciones',      label: '✈️ Vacaciones',       color: '#8B5CF6' },
    { key: 'meeting_externo', label: '🤝 Meeting Externo',  color: '#F59E0B' },
    { key: 'otro',            label: '📌 Otro',             color: '#6B7280' }
];

const DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAY_NAMES_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTH_NAMES     = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const HOUR_START = 7;
const HOUR_END   = 19;

// ===================================
// ESTADO
// ===================================
let calendarState = {
    currentYear:  new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    events: []
};

let isLoadingFromFirebase = false;
let hasInitialized        = false;

// ===================================
// INICIALIZACIÓN
// ===================================
export function initCalendarioSection() {
    console.log('🚀 Iniciando sección CALENDARIO...');
    renderCalendar();
    renderUpcomingEvents();
    setupCalendarNavigation();
    if (!hasInitialized) {
        hasInitialized = true;
        loadCalendarData();
    }
}

// ===================================
// API PÚBLICA
// ===================================
export function getPersonEventsToday(fullName) {
    return getEventsForDate(getTodayStr()).filter(ev => ev.persons.includes(fullName));
}
export function getTodayEvents() {
    return getEventsForDate(getTodayStr());
}

// ===================================
// LÓGICA DE RECURRENCIA
// ===================================
function eventOccursOnDate(ev, dateStr) {
    if (!ev.recurrence) return ev.date === dateStr;
    if (dateStr < ev.date) return false;
    if (ev.recurrence.endDate && dateStr > ev.recurrence.endDate) return false;
    if (ev.recurrence.type === 'daily') return true;
    if (ev.recurrence.type === 'weekly') {
        const dow = new Date(dateStr + 'T12:00:00').getDay();
        return ev.recurrence.days.includes(dow);
    }
    return false;
}

function getEventsForDate(dateStr) {
    return calendarState.events
        .filter(ev => eventOccursOnDate(ev, dateStr))
        .map(normalizeEvent);
}

// ===================================
// NORMALIZACIÓN
// ===================================
function normalizeEvent(ev) {
    const n = { ...ev };
    if (typeof n.person === 'string') { n.persons = [n.person]; delete n.person; }
    if (!n.persons)    n.persons    = [];
    if (!n.startTime)  n.startTime  = '';
    if (!n.endTime)    n.endTime    = '';
    if (n.allDay === undefined) n.allDay = !n.startTime;
    if (!n.recurrence) n.recurrence = null;
    return n;
}

// ===================================
// HELPERS
// ===================================
function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2,'0'); }
function formatDisplayDate(ds) {
    const [y,m,d] = ds.split('-');
    return `${parseInt(d)} ${MONTH_NAMES[parseInt(m)-1]} ${y}`;
}
function formatTimeRange(ev) {
    if (ev.allDay || !ev.startTime) return 'Todo el día';
    return ev.endTime ? `${ev.startTime} – ${ev.endTime}` : ev.startTime;
}
function timeToMinutes(t) {
    if (!t) return 0;
    const [h,m] = t.split(':').map(Number);
    return h*60+m;
}

// ===================================
// FIREBASE
// ===================================
function loadCalendarData() {
    listenToFirebase((data) => {
        if (isLoadingFromFirebase) return;
        isLoadingFromFirebase = true;
        if (data && data.calendarEvents) {
            calendarState.events = (data.calendarEvents || []).map(normalizeEvent);
        }
        renderCalendar();
        renderUpcomingEvents();
        setTimeout(() => { isLoadingFromFirebase = false; }, 100);
    });
}

function saveCalendarData() {
    if (isLoadingFromFirebase) return;
    listenToFirebase((currentData) => {
        saveToFirebase({ ...currentData, calendarEvents: calendarState.events });
    });
}

// ===================================
// RENDERIZAR CALENDARIO MENSUAL
// ===================================
function renderCalendar() {
    const calGrid      = document.getElementById('calendarMainGrid');
    const monthDisplay = document.getElementById('calendarMonthDisplay');
    if (!calGrid || !monthDisplay) return;

    const { currentYear: year, currentMonth: month } = calendarState;
    monthDisplay.textContent = `${MONTH_NAMES[month]} ${year}`;

    const firstDOW    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today       = new Date();

    calGrid.innerHTML = '';

    DAY_NAMES_SHORT.forEach(name => {
        const h = document.createElement('div');
        h.className = 'cal-header-cell';
        h.textContent = name;
        calGrid.appendChild(h);
    });

    for (let i = 0; i < firstDOW; i++) {
        const e = document.createElement('div');
        e.className = 'cal-cell cal-cell--empty';
        calGrid.appendChild(e);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${pad(month+1)}-${pad(day)}`;
        const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;

        const cell = document.createElement('div');
        cell.className = 'cal-cell' + (isToday ? ' cal-cell--today' : '');

        const num = document.createElement('span');
        num.className = 'cal-day-num';
        num.textContent = day;
        cell.appendChild(num);

        const dayEvents = getEventsForDate(dateStr).sort((a,b) => {
            if (a.allDay && !b.allDay) return -1;
            if (!a.allDay && b.allDay) return  1;
            return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        });

        dayEvents.slice(0,3).forEach(ev => {
            const evType = eventTypes.find(t => t.key === ev.type);
            const badge  = document.createElement('div');
            badge.className = 'cal-event-badge';
            badge.style.background = evType?.color || '#6B7280';
            const timeLabel = (!ev.allDay && ev.startTime) ? `${ev.startTime} ` : '';
            const recIcon   = ev.recurrence ? ' 🔁' : '';
            badge.textContent = `${timeLabel}${ev.persons.map(p=>p.split(' ')[0]).join(', ')}${recIcon}`;
            badge.title = `${ev.persons.join(', ')} | ${evType?.label||ev.type} | ${formatTimeRange(ev)}${ev.note?' | '+ev.note:''}`;
            cell.appendChild(badge);
        });

        if (dayEvents.length > 3) {
            const more = document.createElement('div');
            more.className = 'cal-more';
            more.textContent = `+${dayEvents.length-3} más`;
            cell.appendChild(more);
        }

        cell.addEventListener('click', () => openDayModal(dateStr));
        calGrid.appendChild(cell);
    }
}

// ===================================
// PRÓXIMOS EVENTOS (agrupados por semana)
// ===================================
function getWeekKey(dateStr) {
    // Devuelve 'YYYY-WNN' y el lunes de esa semana
    const d   = new Date(dateStr + 'T12:00:00');
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const key   = `${monday.getFullYear()}-${pad(monday.getMonth()+1)}-${pad(monday.getDate())}`;
    return { key, monday, sunday };
}

function getWeekLabel(monday, sunday, todayStr) {
    const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth()+1)}-${pad(monday.getDate())}`;
    const isThisWeek = mondayStr <= todayStr && todayStr <= `${sunday.getFullYear()}-${pad(sunday.getMonth()+1)}-${pad(sunday.getDate())}`;
    const mondayLabel = `${parseInt(pad(monday.getDate()))} ${MONTH_NAMES[monday.getMonth()]}`;
    const sundayLabel = `${parseInt(pad(sunday.getDate()))} ${MONTH_NAMES[sunday.getMonth()]}`;
    return isThisWeek
        ? `Esta semana (${mondayLabel} – ${sundayLabel})`
        : `${mondayLabel} – ${sundayLabel} ${sunday.getFullYear()}`;
}

function renderUpcomingEvents() {
    const container = document.getElementById('upcomingEventsList');
    if (!container) return;

    const today   = getTodayStr();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 28);

    // Expandir todos los eventos en ocurrencias concretas
    const expanded = [];
    calendarState.events.forEach(ev => {
        const n = normalizeEvent(ev);
        if (!n.recurrence) {
            if (n.date >= today) expanded.push({ ...n, _dateKey: n.date });
        } else {
            const cur = new Date(today + 'T12:00:00');
            while (cur <= horizon) {
                const ds = `${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`;
                if (eventOccursOnDate(n, ds)) expanded.push({ ...n, _dateKey: ds });
                cur.setDate(cur.getDate() + 1);
            }
        }
    });

    // Ordenar por fecha → hora
    expanded.sort((a, b) => {
        const dd = a._dateKey.localeCompare(b._dateKey);
        return dd !== 0 ? dd : timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    // Deduplicar (mismo evento mismo día)
    const seen  = new Set();
    const dedup = expanded.filter(ev => {
        const k = `${ev.id}_${ev._dateKey}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });

    if (dedup.length === 0) {
        container.innerHTML = '<div class="empty-reports">📭 No hay eventos próximos programados</div>';
        return;
    }

    // Agrupar por semana
    const weeks = {}; // weekKey → { label, events[] }
    dedup.forEach(ev => {
        const { key, monday, sunday } = getWeekKey(ev._dateKey);
        if (!weeks[key]) {
            weeks[key] = {
                label:  getWeekLabel(monday, sunday, today),
                order:  key,
                events: []
            };
        }
        weeks[key].events.push(ev);
    });

    // Renderizar semana por semana
    container.innerHTML = '';
    Object.values(weeks)
        .sort((a, b) => a.order.localeCompare(b.order))
        .forEach(week => {
            // Encabezado de semana
            const weekHeader = document.createElement('div');
            weekHeader.className = 'upcoming-week-header';
            weekHeader.textContent = `📆 ${week.label}`;
            container.appendChild(weekHeader);

            // Eventos de la semana
            week.events.forEach(ev => {
                const evType = eventTypes.find(t => t.key === ev.type);
                const dow    = new Date(ev._dateKey + 'T12:00:00').getDay();
                const item   = document.createElement('div');
                item.className = 'upcoming-event-item';
                item.innerHTML = `
                    <div class="upcoming-event-dot" style="background:${evType?.color||'#6B7280'}"></div>
                    <div class="upcoming-event-info">
                        <span class="upcoming-event-day">${DAY_NAMES_FULL[dow]} ${parseInt(ev._dateKey.split('-')[2])}</span>
                        <span class="upcoming-event-person">${ev.persons.join(', ')}</span>
                        <span class="upcoming-event-type">${evType?.label||ev.type}${ev.recurrence?' <span class="upcoming-recur-badge">🔁</span>':''}</span>
                        <span class="upcoming-event-time">🕐 ${formatTimeRange(ev)}</span>
                        ${ev.note?`<span class="upcoming-event-note">"${ev.note}"</span>`:''}
                    </div>
                    <button class="btn-delete-event" title="Eliminar"
                        onclick="window.deleteCalendarEvent('${ev.id}',${!!ev.recurrence},'${ev._dateKey}')">✕</button>
                `;
                container.appendChild(item);
            });
        });
}

// ===================================
// MODAL DEL DÍA
// ===================================
function openDayModal(dateStr) {
    const dayEvents = getEventsForDate(dateStr).sort((a,b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return  1;
        return timeToMinutes(a.startTime)-timeToMinutes(b.startTime);
    });

    const [y,m,d]   = dateStr.split('-');
    const dow        = new Date(dateStr+'T12:00:00').getDay();
    const dateLabel  = `${DAY_NAMES_FULL[dow]}, ${parseInt(d)} de ${MONTH_NAMES[parseInt(m)-1]} ${y}`;

    let modal = document.getElementById('dayModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dayModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    // ── Lista de eventos ─────────────────────────────────────
    const evListHTML = dayEvents.length === 0
        ? '<p class="no-events-msg">Sin eventos este día — agrega uno abajo 👇</p>'
        : dayEvents.map(ev => {
            const evType = eventTypes.find(t => t.key === ev.type);
            return `
                <div class="day-event-item" style="border-left:4px solid ${evType?.color||'#6B7280'}">
                    <div class="day-event-left">
                        <div class="day-event-time">${formatTimeRange(ev)}</div>
                        <div class="day-event-type">${evType?.label||ev.type}${ev.recurrence?' <span class="recur-tag">🔁</span>':''}</div>
                        <div class="day-event-persons">${ev.persons.join(' · ')}</div>
                        ${ev.note?`<div class="day-event-note">${ev.note}</div>`:''}
                    </div>
                    <button class="btn-delete-event"
                        onclick="window.deleteCalendarEvent('${ev.id}',${!!ev.recurrence},'${dateStr}')">✕</button>
                </div>`;
        }).join('');

    // ── Opciones de hora ─────────────────────────────────────
    let timeOptions = '<option value="">--:--</option>';
    for (let h = HOUR_START; h <= HOUR_END; h++) {
        ['00','30'].forEach(min => {
            if (h===HOUR_END && min==='30') return;
            timeOptions += `<option value="${pad(h)}:${min}">${pad(h)}:${min}</option>`;
        });
    }

    // ── Checkboxes de personas ───────────────────────────────
    const personsHTML = teamMembers.map(mb => `
        <label class="person-checkbox-label">
            <input type="checkbox" name="eventPerson" value="${mb}">
            <span>${mb.split(' ')[0]}</span>
        </label>`).join('');

    const typesHTML = eventTypes.map(t =>
        `<option value="${t.key}">${t.label}</option>`).join('');

    const recurDaysHTML = DAY_NAMES_SHORT.map((name,i) => `
        <label class="day-checkbox-label">
            <input type="checkbox" name="recurDay" value="${i}">
            <span>${name}</span>
        </label>`).join('');

    modal.innerHTML = `
        <div class="modal-content day-modal-content">

            <div class="day-modal-header">
                <h3>📅 ${dateLabel}</h3>
                <button class="modal-close-btn" id="closeDayModal">✕</button>
            </div>

            <div class="day-modal-events">${evListHTML}</div>

            <div class="day-modal-form">
                <h4>➕ Agregar Evento</h4>

                <div class="form-group">
                    <label class="form-label">👥 Personas</label>
                    <div class="persons-checkbox-grid">${personsHTML}</div>
                </div>

                <div class="form-group">
                    <label class="form-label">📋 Tipo</label>
                    <select id="eventType" class="modal-select">
                        <option value="">— Seleccionar —</option>
                        ${typesHTML}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">⏰ Horario</label>
                    <label class="allday-toggle">
                        <input type="checkbox" id="eventAllDay" checked>
                        <span>Todo el día</span>
                    </label>
                    <div id="timeFieldsWrapper" class="time-fields" style="display:none">
                        <div class="time-row">
                            <div class="time-col">
                                <label class="form-label-small">Desde</label>
                                <select id="eventStartTime" class="modal-select">${timeOptions}</select>
                            </div>
                            <div class="time-col">
                                <label class="form-label-small">Hasta</label>
                                <select id="eventEndTime" class="modal-select">${timeOptions}</select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">🔁 Recurrencia</label>
                    <select id="eventRecurrence" class="modal-select">
                        <option value="none">Sin recurrencia</option>
                        <option value="daily">Todos los días</option>
                        <option value="weekly">Semanal (elige días)</option>
                    </select>
                    <div id="weeklyDaysWrapper" style="display:none" class="weekly-days-wrapper">
                        ${recurDaysHTML}
                    </div>
                    <div id="recurrenceEndWrapper" style="display:none" class="recurrence-end-wrapper">
                        <label class="form-label-small">Termina el (opcional)</label>
                        <input type="date" id="recurrenceEndDate" class="modal-input">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">📝 Nota (opcional)</label>
                    <input type="text" id="eventNote" class="modal-input"
                        placeholder="Ej: Inglés...">
                </div>

                <button id="saveEventBtn" class="btn-confirm" style="width:100%;margin-top:4px">
                    Guardar Evento
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');

    // ── Listeners ────────────────────────────────────────────
    document.getElementById('closeDayModal').onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target===modal) modal.classList.remove('active'); };

    // Todo el día toggle
    const allDayChk      = document.getElementById('eventAllDay');
    const timeFieldsWrap = document.getElementById('timeFieldsWrapper');
    allDayChk.addEventListener('change', () => {
        timeFieldsWrap.style.display = allDayChk.checked ? 'none' : 'block';
    });

    // Recurrencia toggle
    const recurSel    = document.getElementById('eventRecurrence');
    const wklyWrapper = document.getElementById('weeklyDaysWrapper');
    const recurEnd    = document.getElementById('recurrenceEndWrapper');
    recurSel.addEventListener('change', () => {
        wklyWrapper.style.display = recurSel.value==='weekly' ? 'flex' : 'none';
        recurEnd.style.display    = recurSel.value!=='none'   ? 'block' : 'none';
    });

    // Guardar
    document.getElementById('saveEventBtn').onclick = () => {
        const persons   = [...document.querySelectorAll('input[name="eventPerson"]:checked')].map(c=>c.value);
        const type      = document.getElementById('eventType').value;
        const allDay    = document.getElementById('eventAllDay').checked;
        const startTime = allDay ? '' : document.getElementById('eventStartTime').value;
        const endTime   = allDay ? '' : document.getElementById('eventEndTime').value;
        const note      = document.getElementById('eventNote').value.trim();
        const recType   = document.getElementById('eventRecurrence').value;
        const endDate   = document.getElementById('recurrenceEndDate')?.value || null;

        if (persons.length===0) { alert('⚠️ Selecciona al menos una persona.'); return; }
        if (!type)               { alert('⚠️ Selecciona el tipo de evento.');   return; }
        if (!allDay && !startTime) { alert('⚠️ Selecciona la hora de inicio.'); return; }

        let recurrence = null;
        if (recType==='daily') {
            recurrence = { type:'daily', days:[], endDate: endDate||null };
        } else if (recType==='weekly') {
            const days = [...document.querySelectorAll('input[name="recurDay"]:checked')].map(c=>parseInt(c.value));
            if (days.length===0) { alert('⚠️ Elige al menos un día para la recurrencia semanal.'); return; }
            recurrence = { type:'weekly', days, endDate: endDate||null };
        }

        const newEvent = {
            id:        `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
            date:      dateStr,
            persons,
            type,
            note,
            allDay,
            startTime,
            endTime,
            recurrence
        };

        calendarState.events.push(newEvent);
        saveCalendarData();
        renderCalendar();
        renderUpcomingEvents();
        modal.classList.remove('active');
        console.log('✅ Evento guardado:', newEvent);
    };
}

// ===================================
// ELIMINAR EVENTO
// ===================================
window.deleteCalendarEvent = function(eventId, isRecurring, dateStr) {
    if (isRecurring) {
        showDeleteRecurrenceModal(eventId, dateStr);
    } else {
        if (!confirm('¿Eliminar este evento?')) return;
        calendarState.events = calendarState.events.filter(e=>e.id!==eventId);
        saveCalendarData();
        renderCalendar();
        renderUpcomingEvents();
        const m = document.getElementById('dayModal');
        if (m?.classList.contains('active') && dateStr) openDayModal(dateStr);
    }
};

function showDeleteRecurrenceModal(eventId, dateStr) {
    let modal = document.getElementById('deleteRecurModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteRecurModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal-content" style="text-align:center;padding:2rem">
            <div style="font-size:2.5rem;margin-bottom:0.75rem">🔁</div>
            <h3 style="color:var(--stryker-navy);margin-bottom:0.5rem">Evento Recurrente</h3>
            <p style="color:#555;margin-bottom:1.5rem">¿Qué deseas eliminar?</p>
            <div style="display:flex;flex-direction:column;gap:10px">
                <button class="btn-confirm" id="deleteAllRecur">Eliminar toda la serie</button>
                <button class="btn-cancel"  id="cancelDeleteRecur">Cancelar</button>
            </div>
        </div>`;
    modal.classList.add('active');

    document.getElementById('deleteAllRecur').onclick = () => {
        modal.classList.remove('active');
        calendarState.events = calendarState.events.filter(e=>e.id!==eventId);
        saveCalendarData();
        renderCalendar();
        renderUpcomingEvents();
        const dm = document.getElementById('dayModal');
        if (dm?.classList.contains('active') && dateStr) openDayModal(dateStr);
    };
    document.getElementById('cancelDeleteRecur').onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target===modal) modal.classList.remove('active'); };
}

// ===================================
// NAVEGACIÓN DE MESES
// ===================================
function setupCalendarNavigation() {
    document.getElementById('calPrevMonth')?.addEventListener('click', () => {
        calendarState.currentMonth--;
        if (calendarState.currentMonth < 0) { calendarState.currentMonth=11; calendarState.currentYear--; }
        renderCalendar();
    });
    document.getElementById('calNextMonth')?.addEventListener('click', () => {
        calendarState.currentMonth++;
        if (calendarState.currentMonth > 11) { calendarState.currentMonth=0; calendarState.currentYear++; }
        renderCalendar();
    });
}

console.log('📅 Módulo CALENDARIO cargado correctamente');