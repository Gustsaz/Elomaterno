import { db, auth } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const calendarDates = document.getElementById('calendarDates');
const monthSelect = document.getElementById('monthSelect'); // ✅ corrigido
const yearSelect = document.getElementById('yearSelect');   // ✅ corrigido

// Novo elemento de título (mês e ano)
const calendarHeader = document.querySelector('.calendar-header');
let monthTitle = document.createElement('h3');
monthTitle.className = 'month-title';

// Inserir ANTES do bloco .month-year-select
const monthYearSelectDiv = document.querySelector('.month-year-select');
calendarHeader.insertBefore(monthTitle, monthYearSelectDiv); // ✅ corrigido

const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let currentUser = null;

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

    calendarDates.innerHTML += `
      <div class="date ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">
        ${i}
      </div>`;
  }

  updateMonthTitle();
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

async function carregarEventosDoUsuario() {
  try {
    // 🔹 Apenas exibição do calendário (sem Firebase obrigatório)
    renderCalendar(currentMonth, currentYear, []);
  } catch (err) {
    console.error("Erro ao carregar eventos:", err);
    renderCalendar(currentMonth, currentYear, []);
  }
}

monthSelect.addEventListener('change', onMonthChange);
yearSelect.addEventListener('change', onYearChange);

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  carregarEventosDoUsuario();
});

window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
