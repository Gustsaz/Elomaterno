import { db, auth } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const calendarDates = document.getElementById('calendarDates');
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');

const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let currentUser = null; // usuário logado

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
  // mostra todos os eventos passados e futuros no calendário
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  calendarDates.innerHTML = '';

  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  for (let i = 0; i < firstDay; i++) {
    calendarDates.innerHTML += `<div class="empty"></div>`;
  }
  for (let i = 1; i <= lastDate; i++) {
    const dateObj = new Date(year, month, i);
    const today = new Date();
    const isToday = i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    const isPastDay = dateObj < hoje;

    const eventosDoDia = eventos.filter(ev => {
      const d = ev.data;
      if (!d || !(d instanceof Date) || isNaN(d)) return false;
      return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
    });

    const hasEvent = eventosDoDia.length > 0;
    const tooltip = hasEvent ? eventosDoDia.map(e => e.titulo).join(", ") : "";

    // adiciona classe 'past' para dias anteriores a hoje (apenas visual)
    const pastClass = isPastDay ? ' past' : '';

    calendarDates.innerHTML += `
      <div class="date ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}${pastClass}"
           ${tooltip ? `data-tooltip="${tooltip}"` : ''}>
        ${i}
      </div>`;
  }
  monthSelect.value = month;
  yearSelect.value = year;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// animação de troca de mês: delta = +1 (next) / -1 (prev)
// dir: 'left' -> next (slide left), 'right' -> prev (slide right)
async function changeMonthWithAnimation(delta, dir) {
  if (!calendarDates) {
    // fallback simples
    currentMonth += delta;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    await carregarEventosDoUsuario();
    return;
  }

  const exitClass = dir === 'left' ? 'anim-exit-left' : 'anim-exit-right';
  const enterClass = dir === 'left' ? 'anim-enter-right' : 'anim-enter-left';

  // start exit anim
  calendarDates.classList.remove(enterClass);
  // ensure repaint
  void calendarDates.offsetWidth;
  calendarDates.classList.add(exitClass);

  // wait exit animation (keep small margin)
  await sleep(220);

  // update month/year
  currentMonth += delta;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }

  // recarrega e renderiza com novo mês
  await carregarEventosDoUsuario();

  // entry animation
  calendarDates.classList.remove(exitClass);
  // ensure repaint
  void calendarDates.offsetWidth;
  calendarDates.classList.add(enterClass);

  // remove enter class after animation ends
  setTimeout(() => calendarDates.classList.remove(enterClass), 350);
}

function prevMonth() { changeMonthWithAnimation(-1, 'right'); }
function nextMonth() { changeMonthWithAnimation(1, 'left'); }

function onMonthChange() {
  // seleção direta: aplica troca sem slide (fade rápido)
  currentMonth = parseInt(monthSelect.value);
  calendarDates.classList.add('anim-exit-fade');
  setTimeout(async () => {
    await carregarEventosDoUsuario();
    calendarDates.classList.remove('anim-exit-fade');
    // pequena entrada
    calendarDates.classList.add('anim-enter-fade');
    setTimeout(() => calendarDates.classList.remove('anim-enter-fade'), 220);
  }, 150);
}
function onYearChange() {
  currentYear = parseInt(yearSelect.value);
  calendarDates.classList.add('anim-exit-fade');
  setTimeout(async () => {
    await carregarEventosDoUsuario();
    calendarDates.classList.remove('anim-exit-fade');
    calendarDates.classList.add('anim-enter-fade');
    setTimeout(() => calendarDates.classList.remove('anim-enter-fade'), 220);
  }, 150);
}

populateMonthYearSelects();
renderCalendar(currentMonth, currentYear, []);

// utilitária para normalizar datas (Timestamp -> Date, string -> Date, Date -> Date)
function parseToDate(maybe) {
  if (!maybe) return null;
  if (typeof maybe === 'object' && typeof maybe.toDate === 'function') {
    return maybe.toDate();
  }
  if (maybe instanceof Date) return maybe;
  const d = new Date(maybe);
  return isNaN(d.getTime()) ? null : d;
}

async function carregarEventosDoUsuario() {
  const list = document.querySelector('.event-list');

  if (list) {
    list.innerHTML = `
      <div class="loader">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>`;
  }

  try {
    if (!currentUser) {
      if (list) {
        list.innerHTML = `<div class="event"><strong>Faça login para ver seus eventos inscritos.</strong></div>`;
      }
      renderCalendar(currentMonth, currentYear, []);
      return;
    }

    const userRef = doc(db, "usuarios", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const inscritos = userSnap.exists() ? (userSnap.data().eventosInscritos || []) : [];

    if (!inscritos || inscritos.length === 0) {
      if (list) {
        list.innerHTML = `<div class="event"><strong>Nenhum evento inscrito</strong><p>Inscreva-se em eventos na página Eventos.</p></div>`;
      }
      renderCalendar(currentMonth, currentYear, []);
      return;
    }

    const carregamentos = inscritos.map(async (ins) => {
      try {
        if (ins.id) {
          const evRef = doc(db, "eventos", ins.id);
          const evSnap = await getDoc(evRef);
          if (evSnap.exists()) {
            const data = evSnap.data();
            const d = parseToDate(data.data ?? ins.date ?? data.date ?? null);
            return {
              id: evSnap.id,
              titulo: data.titulo ?? ins.titulo ?? "Evento",
              descricao: data.descricao ?? ins.descricao ?? "",
              local: data.local ?? ins.local ?? "Online",
              capa: data.capa ?? ins.capa ?? "",
              data: d
            };
          } else {
            const d = parseToDate(ins.date ?? ins.data);
            if (!d) return null;
            return {
              id: ins.id,
              titulo: ins.titulo ?? "Evento",
              descricao: ins.descricao ?? "",
              local: ins.local ?? "Online",
              capa: ins.capa ?? "",
              data: d
            };
          }
        } else {
          const d = parseToDate(ins.date ?? ins.data);
          if (!d) return null;
          return {
            id: ins.id ?? null,
            titulo: ins.titulo ?? "Evento",
            descricao: ins.descricao ?? "",
            local: ins.local ?? "Online",
            capa: ins.capa ?? "",
            data: d
          };
        }
      } catch (err) {
        console.error("Erro carregando inscrito:", ins, err);
        return null;
      }
    });

    const eventosCarregados = (await Promise.all(carregamentos)).filter(Boolean);

    // Lista lateral: apenas próximos
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximosEventos = eventosCarregados
      .filter(ev => ev.data && ev.data >= hoje)
      .sort((a, b) => a.data - b.data);

    if (list) {
      list.innerHTML = '';
      if (proximosEventos.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'event';
        msg.innerHTML = `<strong>Nenhum evento futuro inscrito</strong>
                         <p>Inscreva-se em eventos na página Eventos.</p>`;
        list.appendChild(msg);
      } else {
        proximosEventos.forEach(ev => {
          const d = ev.data;
          const dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          const div = document.createElement('div');
          div.className = 'event';
          div.innerHTML = `<strong>${dataFormatada} • ${ev.titulo}</strong><p>${ev.descricao}</p>`;
          list.appendChild(div);
        });
      }
    }

    // Calendário: mostra TODOS (passados + futuros) dos inscritos
    renderCalendar(currentMonth, currentYear, eventosCarregados);

  } catch (error) {
    console.error("Erro ao carregar eventos do usuário:", error);
    if (list) {
      list.innerHTML = `<div class="event"><strong>Erro ao carregar eventos</strong></div>`;
    }
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
