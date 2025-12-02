
import { db, auth } from './firebase.js';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const calendarDates = document.getElementById('calendarDates');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const eventList = document.getElementById('eventList');
const calendarHeader = document.querySelector('.calendar-header');

let monthTitle = document.createElement('h3');
monthTitle.className = 'month-title';
const monthYearSelectDiv = document.querySelector('.month-year-select');
calendarHeader.insertBefore(monthTitle, monthYearSelectDiv);

const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let currentUser = null;
let userUnsubscribe = null;
let consultasUnsubscribe = null;

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function updateMonthTitle() {
  monthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

function populateMonthYearSelects() {
  monthSelect.innerHTML = '';
  yearSelect.innerHTML = '';

  monthNames.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m;
    if (i === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  });

  for (let y = 2020; y <= 2035; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  updateMonthTitle();
}


function parsePossibleDate(raw) {
  if (!raw) return null;
  if (raw.toDate && typeof raw.toDate === 'function') {
    try {
      const d = raw.toDate();
      if (!isNaN(d)) return d;
    } catch (e) {  }
  }
  if (raw instanceof Date) {
    if (!isNaN(raw)) return raw;
  }
  if (typeof raw === 'string') {
    const parsed = new Date(raw);
    if (!isNaN(parsed)) return parsed;
  }
  if (raw.toMillis && typeof raw.toMillis === 'function') {
    try {
      const maybe = new Date(raw.toMillis());
      if (!isNaN(maybe)) return maybe;
    } catch (e) { }
  }
  return null;
}

function normalizeEventosArray(arr = []) {
  return arr.map(ev => {
    const copy = { ...ev };
    const raw = ev.date ?? ev.data ?? ev.dataString ?? ev.Datahora ?? ev.DataHora ?? ev.Data ?? ev.date;
    let dt = parsePossibleDate(raw);
    if (!dt && typeof ev.date === 'string') {
      const parsed = new Date(ev.date);
      if (!isNaN(parsed)) dt = parsed;
    }
    copy.data = dt;
    return copy;
  }).filter(e => e.data instanceof Date && !isNaN(e.data));
}


function renderCalendar(month, year, eventos = []) {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  calendarDates.innerHTML = '';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (let i = 0; i < firstDay; i++) {
    calendarDates.innerHTML += `<div class="empty"></div>`;
  }

  for (let i = 1; i <= lastDate; i++) {
    const dateObj = new Date(year, month, i);
    const isToday =
      i === hoje.getDate() &&
      month === hoje.getMonth() &&
      year === hoje.getFullYear();

    const eventosDoDia = eventos.filter(ev => {
      const d = ev.data;
      if (!d || !(d instanceof Date) || isNaN(d)) return false;
      return (
        d.getDate() === i &&
        d.getMonth() === month &&
        d.getFullYear() === year
      );
    });

    const hasEvent = eventosDoDia.length > 0;
    const isPast = dateObj < hoje;

    let dotsHtml = '';
    if (hasEvent) {
      const count = eventosDoDia.length;
      const mostrar = Math.min(3, count);
      for (let k = 0; k < mostrar; k++) {
        dotsHtml += `<span class="dot ${isPast ? 'past' : ''}" aria-hidden="true"></span>`;
      }
      if (count > 3) {
        dotsHtml += `<span class="more">+${count - 3}</span>`;
      }
    }

    // use ev.titulo (preparado para consultas como "Consulta com [nome]")
    const titles = eventosDoDia.map(ev => ev.titulo ?? ev.title ?? (ev.type === 'consulta' ? `Consulta` : '')).filter(Boolean).join(' — ');

    calendarDates.innerHTML += `
      <div class="date ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''} ${isPast ? 'past' : ''}" ${titles ? `data-tooltip="${escapeHtml(titles)}"` : ''} data-day="${i}">
        <div class="day-number">${i}</div>
        ${hasEvent ? `<div class="event-dots" aria-hidden="true">${dotsHtml}</div>` : ''}
      </div>`;
  }

  updateMonthTitle();

  // attach click handlers for days with events
  document.querySelectorAll('.calendar-dates .date.has-event').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const day = parseInt(cell.dataset.day, 10);
      const eventosDoDia = eventos.filter(ev => {
        const d = ev.data;
        return d && d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
      });
      if (eventosDoDia.length) {
        showEventsModalForDate(eventosDoDia);
      }
    });
  });
}

function escapeHtml(str) {
  return String(str).replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>');
}

/* ----------------- Month navigation ----------------- */
function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCombinedFromCaches();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCombinedFromCaches();
}

function onMonthChange() {
  currentMonth = parseInt(monthSelect.value);
  renderCombinedFromCaches();
}

function onYearChange() {
  currentYear = parseInt(yearSelect.value);
  renderCombinedFromCaches();
}

populateMonthYearSelects();
renderCalendar(currentMonth, currentYear, []);

/* ----------------- Event list UI ----------------- */
function renderEventList(eventos = []) {
  eventList.innerHTML = '';
  if (!eventos.length) {
    eventList.innerHTML = `<div class="event"><strong>Nenhum evento inscrito</strong><p>Inscreva-se em eventos para que eles apareçam aqui.</p></div>`;
    return;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const futuros = eventos.filter(ev => (ev.data && ev.data >= hoje));
  futuros.sort((a, b) => a.data - b.data);

  if (!futuros.length) {
    eventList.innerHTML = `<div class="event"><strong>Nenhum evento inscrito</strong><p>Todos os seus eventos inscritos já passaram.</p></div>`;
    return;
  }

  futuros.forEach(ev => {
    // se for consulta, classe 'consult', caso contrário 'event'
    const div = document.createElement('div');
    div.className = (ev.type === 'consulta') ? 'consult' : 'event';

    const dataFmt = ev.data ? ev.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const horaFmt = ev.data ? ev.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

    if (ev.type === 'consulta') {
      div.innerHTML = `
        <strong>Consulta${ev.profissionalNome ? ' com ' + ev.profissionalNome : ''}</strong>
        <p class="meta">${dataFmt} • ${horaFmt} • ${ev.status ?? ''}</p>
        <p class="descricao">${escapeHtml(ev.Motivo ?? ev.motivo ?? '')}</p>
      `;
    } else {
      div.innerHTML = `
        <strong>${ev.titulo ?? ev.title ?? 'Evento'}</strong>
        <p class="meta">${dataFmt} • ${horaFmt}</p>
        <p class="descricao">${ev.descricao ?? ev.description ?? ''}</p>
      `;
      if (ev.id) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => {
          window.location.href = `eventos.html?evento=${encodeURIComponent(ev.id)}`;
        });
      }
    }

    eventList.appendChild(div);
  });
}




let inscritosCache = [];   
let consultasCache = [];   
const profissionalNameCache = new Map(); 

function renderCombinedFromCaches() {
  const combined = [...inscritosCache, ...consultasCache];
  renderCalendar(currentMonth, currentYear, combined);
  renderEventList(combined);
}

async function fetchProfissionalNome(profissionalId, collectionName) {
  if (!profissionalId || !collectionName) return null;
  const key = `${collectionName}:${profissionalId}`;
  if (profissionalNameCache.has(key)) return profissionalNameCache.get(key);
  try {
    const q = query(collection(db, collectionName), where('uid', '==', profissionalId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const nome = snap.docs[0].data()?.nome ?? null;
      profissionalNameCache.set(key, nome);
      return nome;
    }
  } catch (err) {
    console.warn('Erro buscando profissional nome', err);
  }
  profissionalNameCache.set(key, null);
  return null;
}

async function setupConsultasListenerForUser(uid) {
  if (consultasUnsubscribe) {
    try { consultasUnsubscribe(); } catch (e) {  }
    consultasUnsubscribe = null;
  }

  if (!uid) {
    consultasCache = [];
    renderCombinedFromCaches();
    return;
  }

  const q = query(collection(db, 'Consultas'), where('Mae', '==', uid));
  consultasUnsubscribe = onSnapshot(q, async (snapshot) => {
    try {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const normalized = [];
      for (const raw of docs) {
        const copy = { ...raw };
        const dt = parsePossibleDate(raw.Datahora ?? raw.datahora ?? raw.DataHora ?? raw.Data ?? raw.date);
        copy.data = dt;
        copy.type = 'consulta';
        copy.Motivo = raw.Motivo ?? raw.motivo ?? '';
        copy.status = raw.status ?? '';
        let profissionalId = null;
        let collectionName = null;
        if (raw.Psicologo) {
          profissionalId = raw.Psicologo;
          collectionName = 'psicologos';
        } else if (raw.Advogado) {
          profissionalId = raw.Advogado;
          collectionName = 'advogados';
        }
        copy.profissionalId = profissionalId;
        copy.collectionName = collectionName;
        normalized.push(copy);
      }

      const fetchPromises = [];
      normalized.forEach(c => {
        if (c.profissionalId && c.collectionName) {
          const key = `${c.collectionName}:${c.profissionalId}`;
          if (!profissionalNameCache.has(key)) {
            fetchPromises.push(fetchProfissionalNome(c.profissionalId, c.collectionName));
          }
        }
      });
      if (fetchPromises.length) await Promise.all(fetchPromises);

      normalized.forEach(c => {
        c.profissionalNome = null;
        if (c.profissionalId && c.collectionName) {
          const key = `${c.collectionName}:${c.profissionalId}`;
          c.profissionalNome = profissionalNameCache.get(key) || '';
        }
        c.titulo = c.profissionalNome ? `Consulta com ${c.profissionalNome}` : 'Consulta';
      });

      consultasCache = normalizeEventosArray(normalized);
      consultasCache = consultasCache.map(orig => {
        const full = normalized.find(n => {
          const d1 = n.data; const d2 = orig.data;
          return n.id === orig.id || (d1 && d2 && d1.getTime() === d2.getTime());
        }) || {};
        return { ...orig, id: full.id, type: 'consulta', Motivo: full.Motivo, status: full.status, profissionalNome: full.profissionalNome, profissionalId: full.profissionalId, titulo: full.titulo, collectionName: full.collectionName };
      });

      renderCombinedFromCaches();
    } catch (err) {
      console.error('Erro no listener Consultas:', err);
    }
  }, (err) => {
    console.error('Erro snapshot Consultas:', err);
  });
}

async function setupUserListener(uid) {
  if (userUnsubscribe) {
    try { userUnsubscribe(); } catch (e) {  }
    userUnsubscribe = null;
  }

  if (!uid) {
    inscritosCache = [];
    renderCombinedFromCaches();
    return;
  }

  const userRef = doc(db, 'usuarios', uid);
  userUnsubscribe = onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      inscritosCache = [];
      renderCombinedFromCaches();
      return;
    }
    const data = snap.data();
    const inscritosRaw = data.eventosInscritos || [];
    const eventos = normalizeEventosArray(inscritosRaw).map(e => ({ ...e, type: 'evento' }));
    inscritosCache = eventos;
    renderCombinedFromCaches();
  }, (err) => {
    console.error("Erro snapshot usuario:", err);
    inscritosCache = [];
    renderCombinedFromCaches();
  });
}

async function carregarEventosDoUsuario() {
  try {
    if (!currentUser) {
      inscritosCache = [];
      consultasCache = [];
      renderCombinedFromCaches();
      return;
    }

    await setupUserListener(currentUser.uid);
    await setupConsultasListenerForUser(currentUser.uid);

  } catch (err) {
    console.error("Erro ao carregar eventos/consultas do usuário:", err);
    inscritosCache = [];
    consultasCache = [];
    renderCombinedFromCaches();
  }
}


function showEventsModalForDate(eventosDoDia = []) {
  const overlay = document.createElement('div');
  overlay.className = 'em-overlay';

  const modal = document.createElement('div');
  modal.className = 'em-modal em-modal-list';

  const header = document.createElement('div');
  header.className = 'em-modal-header';
  header.innerHTML = `<h2>Eventos do dia</h2><button class="em-modal-close" aria-label="Fechar">✕</button>`;

  const body = document.createElement('div');
  body.className = 'em-modal-body';

  eventosDoDia.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'em-event-item';

    if (ev.type === 'consulta') {
      const horaFmt = ev.data ? ev.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      // h3 com "Consulta com [nome do profissional]"
      item.innerHTML = `
        <div class="ev-info" style="flex:1">
          <h3>Consulta${ev.profissionalNome ? ' com ' + ev.profissionalNome : ''}</h3>
          <p class="ev-meta">${horaFmt} • ${ev.status ?? ''}</p>
          <p class="ev-desc"><strong>Motivo:</strong> ${escapeHtml(ev.Motivo ?? ev.motivo ?? '')}</p>
        </div>
      `;
      // removido botão de cancelar (pedido)
    } else {
      const imgHtml = ev.capa ? `<div class="ev-img"><img src="${ev.capa}" alt="${ev.titulo}"></div>` : '';
      const horaFmt = ev.data ? ev.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      item.innerHTML = `
        ${imgHtml}
        <div class="ev-info">
          <h3>${ev.titulo ?? ev.title ?? ''}</h3>
          <p class="ev-meta">${ev.local ?? ''} • ${horaFmt}</p>
          <p class="ev-desc">${ev.descricao ?? ev.description ?? ''}</p>
        </div>
      `;
    }

    body.appendChild(item);
  });

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.querySelector('.em-modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
}


function connectHeaderButtons() {
  const buttons = calendarHeader.querySelectorAll('button');
  if (buttons.length >= 2) {
    buttons[0].addEventListener('click', prevMonth);
    buttons[buttons.length - 1].addEventListener('click', nextMonth);
  }
  const prev = document.querySelector('.prev-month') || document.getElementById('prevMonthBtn') || document.querySelector('[data-prev-month]');
  const next = document.querySelector('.next-month') || document.getElementById('nextMonthBtn') || document.querySelector('[data-next-month]');
  if (prev) prev.addEventListener('click', prevMonth);
  if (next) next.addEventListener('click', nextMonth);
}

connectHeaderButtons();

monthSelect.addEventListener('change', onMonthChange);
yearSelect.addEventListener('change', onYearChange);


onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    if (userUnsubscribe) { userUnsubscribe(); userUnsubscribe = null; }
    if (consultasUnsubscribe) { consultasUnsubscribe(); consultasUnsubscribe = null; }
    inscritosCache = [];
    consultasCache = [];
    renderCombinedFromCaches();
    return;
  }
  carregarEventosDoUsuario();
});


window.prevMonth = prevMonth;
window.nextMonth = nextMonth;


function showStyledAlert(message, type = "info") {
  const overlay = document.createElement("div");
  overlay.className = "em-overlay";

  const modal = document.createElement("div");
  modal.className = "em-modal";
  modal.style.maxWidth = "420px";
  modal.style.padding = "24px";
  modal.style.textAlign = "center";
  modal.style.animation = "fadeIn 0.3s ease";

  const icon = document.createElement("div");
  icon.style.fontSize = "36px";
  icon.style.color = "var(--accent-color)";
  icon.style.marginBottom = "12px";
  icon.innerHTML =
    type === "success" ? "✔️" :
      type === "error" ? "❌" : "ℹ️";

  const msg = document.createElement("p");
  msg.textContent = message;
  msg.style.marginBottom = "18px";
  msg.style.fontSize = "1.05rem";
  msg.style.color = "var(--text-color)";

  const btn = document.createElement("button");
  btn.textContent = "Fechar";
  btn.className = "btn-fechar";
  btn.addEventListener("click", () => overlay.remove());

  modal.appendChild(icon);
  modal.appendChild(msg);
  modal.appendChild(btn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });
}
