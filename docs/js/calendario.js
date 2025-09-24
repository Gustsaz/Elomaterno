import { db, auth } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const calendarDates = document.getElementById('calendarDates');
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');

const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

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
  for (let y = 2000; y <= 2030; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}

function renderCalendar(month, year, eventos = []) {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  calendarDates.innerHTML = '';
  for (let i = 0; i < firstDay; i++) {
    calendarDates.innerHTML += `<div class="empty"></div>`;
  }
  for (let i = 1; i <= lastDate; i++) {
    const today = new Date();
    const isToday = i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    const eventosDoDia = eventos.filter(ev => {
      const d = new Date(ev.date);
      return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
    });
    const hasEvent = eventosDoDia.length > 0;
    const tooltip = hasEvent ? eventosDoDia.map(e => e.titulo).join(", ") : "";
    calendarDates.innerHTML += `
      <div class="date ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}"
           ${tooltip ? `data-tooltip="${tooltip}"` : ''}>
        ${i}
      </div>`;
  }
  monthSelect.value = month;
  yearSelect.value = year;
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  carregarEventosDoUsuario();
}
function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
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
renderCalendar(currentMonth, currentYear);

async function carregarEventos(user) {
  if (!user) return [];
  const userRef = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return [];
  return snap.data().eventosInscritos || [];
}

async function carregarEventosDoUsuario() {
  const user = auth.currentUser;
  const eventos = user ? await carregarEventos(user) : [];
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const proximosEventos = eventos
    .filter(ev => new Date(ev.date) >= hoje)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const list = document.querySelector('.event-list');
  if (list) {
    list.innerHTML = '';
    if (proximosEventos.length === 0) {
      list.innerHTML = `
        <div class="event"><strong>Nenhum evento futuro</strong>
        <p>Inscreva-se em eventos na página Eventos.</p></div>`;
    } else {
      proximosEventos.forEach(ev => {
        const d = new Date(ev.date);
        const dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const div = document.createElement('div');
        div.className = 'event';
        div.innerHTML = `<strong>${dataFormatada} • ${ev.titulo}</strong><p>${ev.descricao}</p>`;
        list.appendChild(div);
      });
    }
  }
  renderCalendar(currentMonth, currentYear, eventos);
}

monthSelect.addEventListener('change', onMonthChange);
yearSelect.addEventListener('change', onYearChange);

onAuthStateChanged(auth, () => {
  carregarEventosDoUsuario();
});

window.prevMonth = prevMonth;
window.nextMonth = nextMonth;

