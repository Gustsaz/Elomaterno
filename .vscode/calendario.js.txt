import { db, auth } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


const calendarDates = document.getElementById('calendarDates');
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');

const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
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


async function carregarEventos() {
  const snap = await getDocs(collection(db, "eventos"));
  const eventos = [];
  snap.forEach(docSnap => {
    eventos.push({ id: docSnap.id, ...docSnap.data() });
  });
  return eventos;
}


async function carregarEventosDoUsuario() {
  const list = document.querySelector('.event-list');
  if (list) {
    // mostra loader antes de carregar
    list.innerHTML = `
      <div class="loader">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>`;
  }

  try {
    const eventos = await carregarEventos();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximosEventos = eventos
      .filter(ev => new Date(ev.data) >= hoje)
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    if (list) {
      list.innerHTML = ''; // remove loader

      if (proximosEventos.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'event';
        msg.innerHTML = `<strong>Nenhum evento futuro</strong>
                         <p>Inscreva-se em eventos na página Eventos.</p>`;
        list.appendChild(msg);
      } else {
        proximosEventos.forEach(ev => {
          const d = new Date(ev.data);
          const dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          const div = document.createElement('div');
          div.className = 'event';
          div.innerHTML = `<strong>${dataFormatada} • ${ev.titulo}</strong><p>${ev.descricao}</p>`;
          list.appendChild(div);
        });
      }
    }

    renderCalendar(currentMonth, currentYear, eventos);

  } catch (error) {
    console.error("Erro ao carregar eventos:", error);
    if (list) {
      list.innerHTML = `<div class="event"><strong>Erro ao carregar eventos</strong></div>`;
    }
  }
}



monthSelect.addEventListener('change', onMonthChange);
yearSelect.addEventListener('change', onYearChange);

onAuthStateChanged(auth, () => {
  carregarEventosDoUsuario();
});

window.prevMonth = prevMonth;
window.nextMonth = nextMonth;

