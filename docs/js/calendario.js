import { db, auth } from './firebase.js';
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc
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

function normalizeEventosArray(arr = []) {
  return arr.map(ev => {
    const copy = { ...ev };
    const raw = ev.date ?? ev.data ?? ev.dataString ?? null;
    let dt = null;
    if (raw instanceof Date) {
      dt = raw;
    } else if (raw && typeof raw === 'string') {
      const parsed = new Date(raw);
      if (!isNaN(parsed)) dt = parsed;
    } else if (raw && raw.toDate) {
      try { dt = raw.toDate(); } catch (e) { dt = null; }
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
        dotsHtml += `<span class="more">${count - 3}</span>`;
      }
    }

    const titles = eventosDoDia.map(ev => ev.titulo ?? ev.title ?? '').filter(Boolean).join(' — ');

    calendarDates.innerHTML += `
      <div class="date ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''} ${isPast ? 'past' : ''}" ${titles ? `data-tooltip="${escapeHtml(titles)}"` : ''} data-day="${i}">
        <div class="day-number">${i}</div>
        ${hasEvent ? `<div class="event-dots" aria-hidden="true">${dotsHtml}</div>` : ''}
      </div>`;
  }

  updateMonthTitle();

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
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  carregarEventosDoUsuario();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  carregarEventosDoUsuario();
}

function onMonthChange() {
  currentMonth = parseInt(monthSelect.value);
  carregarEventosDoUsuario();
}

function onYearChange() {
  currentYear = parseInt(yearSelect.value);
  carregarEventosDoUsuario();
}

populateMonthYearSelects();
renderCalendar(currentMonth, currentYear, []);

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
    const div = document.createElement('div');
    div.className = 'event';
    const dataFmt = ev.data ? ev.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const horaFmt = ev.data ? ev.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
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
    eventList.appendChild(div);
  });
}

async function carregarEventosDoUsuario() {
  try {
    if (!currentUser) {
      renderCalendar(currentMonth, currentYear, []);
      renderEventList([]);
      return;
    }

    const userRef = doc(db, "usuarios", currentUser.uid);
    if (userUnsubscribe) userUnsubscribe();

    userUnsubscribe = onSnapshot(userRef, snap => {
      if (!snap.exists()) {
        renderCalendar(currentMonth, currentYear, []);
        renderEventList([]);
        return;
      }
      const data = snap.data();
      const inscritosRaw = data.eventosInscritos || [];
      const eventos = normalizeEventosArray(inscritosRaw);

      renderCalendar(currentMonth, currentYear, eventos);
      renderEventList(eventos);
    }, (err) => {
      console.error("Erro snapshot usuario:", err);
      renderCalendar(currentMonth, currentYear, []);
      renderEventList([]);
    });

  } catch (err) {
    console.error("Erro ao carregar eventos do usuário:", err);
    renderCalendar(currentMonth, currentYear, []);
    renderEventList([]);
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

    const imgHtml = ev.capa ? `<div class="ev-img"><img src="${ev.capa}" alt="${ev.titulo}"></div>` : '';
    const horaFmt = ev.data ? ev.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    item.innerHTML = `
      ${imgHtml}
      <div class="ev-info">
        <h3>${ev.titulo ?? ''}</h3>
        <p class="ev-meta">${ev.local ?? ''} • ${horaFmt}</p>
        <p class="ev-desc">${ev.descricao ?? ''}</p>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'ev-actions';

    if (currentUser) {
      (async () => {
        try {
          const userRef = doc(db, 'usuarios', currentUser.uid);
          const snapshot = await getDoc(userRef);
          const inscritos = snapshot.exists() ? (snapshot.data().eventosInscritos || []) : [];
          const esta = inscritos.some(i => i.id === ev.id);
          if (esta) {
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn-cancel-inscricao';
            btnCancel.textContent = 'Cancelar inscrição';
            btnCancel.addEventListener('click', async () => {
              try {
                const novos = inscritos.filter(i => i.id !== ev.id);
                await updateDoc(userRef, { eventosInscritos: novos });
                showStyledAlert('Inscrição cancelada.', 'success');
                overlay.remove();
              } catch (err) {
                console.error(err);
                showStyledAlert('Erro ao cancelar inscrição.', 'error');
              }
            });
            actions.appendChild(btnCancel);
          }
        } catch (err) {
          console.error('Erro lendo inscricoes', err);
        }
      })();
    }

    item.appendChild(actions);
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
    renderCalendar(currentMonth, currentYear, []);
    renderEventList([]);
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
  icon.style.marginBottom = "12px";
  icon.innerHTML =
    type === "success" ? "✅" :
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
