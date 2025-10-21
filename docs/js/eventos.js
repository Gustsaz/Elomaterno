import { db, auth } from './firebase.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const grid = document.querySelector(".eventos-grid");

let allEventos = [];
let currentUser = null;
let userInscritos = [];

function normalizeEventDoc(docData, id=null) {
  const obj = { ...docData, id };
  const raw = docData.data ?? docData.date ?? null;
  if (raw && raw.toDate) obj.data = raw.toDate();
  else if (typeof raw === 'string') {
    const parsed = new Date(raw);
    obj.data = isNaN(parsed) ? null : parsed;
  } else if (raw instanceof Date) obj.data = raw;
  else obj.data = null;
  return obj;
}

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
}
function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

async function carregarEventos() {
  grid.innerHTML = `<loader><dot></dot><dot></dot><dot></dot></loader>`;
  const snap = await getDocs(collection(db, "eventos"));
  const eventos = [];
  snap.forEach(docSnap => {
    eventos.push(normalizeEventDoc(docSnap.data(), docSnap.id));
  });
  allEventos = eventos.sort((a,b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0));
  renderGrid();
}

function renderGrid() {
  if (!allEventos.length) {
    grid.innerHTML = `<p>Nenhum evento encontrado.</p>`;
    return;
  }
  grid.innerHTML = '';
  allEventos.forEach(ev => {
    const card = document.createElement('article');
    card.className = 'evento-card';

    const capaHtml = ev.capa ? `<img class="evento-cover" src="${ev.capa}" alt="${(ev.titulo||'Evento')}">` : '';
    const dataFmt = ev.data ? `${formatDate(ev.data)} • ${formatTime(ev.data)}` : '';
    card.innerHTML = `
      ${capaHtml}
      <div class="evento-body">
        <h3>${ev.titulo ?? 'Evento'}</h3>
        <span class="evento-meta">${dataFmt}</span>
        <p>${ev.descricao ?? ''}</p>
        <br>
        <div class="acoes" style="margin-top:12px"></div>
      </div>
    `;

    const acoes = card.querySelector('.acoes');
    const btn = document.createElement('button');
    btn.className = 'btn-inscrever';

    const isInscrito = userInscritos.some(i => i.id === ev.id);

    if (isInscrito) {
      btn.textContent = 'Já inscrito';
      btn.classList.add('inscrito');
      btn.addEventListener('click', () => showEventModal(ev, { mode: 'inscrito' }));
    } else {
      btn.textContent = 'Mais informações';
      btn.addEventListener('click', () => showEventModal(ev, { mode: 'detalhes' }));
    }

    acoes.appendChild(btn);
    grid.appendChild(card);
  });
}

function showModalConfirm(titulo, mensagem, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'em-overlay';

  const modal = document.createElement('div');
  modal.className = 'em-modal';
  modal.innerHTML = `
    <div class="em-body">
      <h2 class="em-title">${titulo}</h2>
      <p class="em-desc">${mensagem}</p>
      <div class="em-actions">
        <button class="btn-fechar">Voltar</button>
        <button class="btn-inscrever">Sim, cancelar</button>
      </div>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector('.btn-fechar').addEventListener('click', () => overlay.remove());
  modal.querySelector('.btn-inscrever').addEventListener('click', async () => {
    await onConfirm();
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showModalInfo(titulo, mensagem) {
  const overlay = document.createElement('div');
  overlay.className = 'em-overlay';

  const modal = document.createElement('div');
  modal.className = 'em-modal';
  modal.innerHTML = `
    <div class="em-body">
      <h2 class="em-title">${titulo}</h2>
      <p class="em-desc">${mensagem}</p>
      <div class="em-actions"><button class="btn-fechar">Fechar</button></div>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector('.btn-fechar').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showEventModal(ev, opts = { mode: 'detalhes' }) {
  const overlay = document.createElement('div');
  overlay.className = 'em-overlay';

  const modal = document.createElement('div');
  modal.className = 'em-modal';

  const headerImg = ev.capa ? `<div class="em-header"><img src="${ev.capa}" alt="${ev.titulo}"></div>` : '';
  const titulo = `<h2 class="em-title">${ev.titulo ?? 'Evento'}</h2>`;
  const meta = `<p class="em-meta">${ev.local ?? ''} • ${ev.data ? formatDate(ev.data) + ' • ' + formatTime(ev.data) : ''}</p>`;
  const descricao = `<div class="em-desc">${ev.descricao ?? ''}</div>`;
  const actionsHtml = `<div class="em-actions"></div>`;

  modal.innerHTML = `
    ${headerImg}
    <div class="em-body">
      ${titulo}
      ${meta}
      ${descricao}
      ${actionsHtml}
    </div>
    <button class="em-close" aria-label="Fechar">✕</button>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const actionsDiv = modal.querySelector('.em-actions');
  const isInscrito = userInscritos.some(i => i.id === ev.id);

  if (!currentUser) {
    const btnLogin = document.createElement('button');
    btnLogin.className = 'btn-inscrever';
    btnLogin.textContent = 'Fazer login para se inscrever';
    btnLogin.addEventListener('click', () => showModalInfo('Login necessário', 'Você precisa estar logado para se inscrever em um evento.'));
    actionsDiv.appendChild(btnLogin);
  } else if (isInscrito) {
    const btnCancelar = document.createElement('button');
    btnCancelar.className = 'btn-inscrever';
    btnCancelar.style.background = '#d9534f';
    btnCancelar.textContent = 'Cancelar inscrição';
    btnCancelar.addEventListener('click', () => {
      showModalConfirm('Cancelar inscrição', 'Tem certeza que deseja cancelar sua inscrição neste evento?', async () => {
        try {
          const userRef = doc(db, 'usuarios', currentUser.uid);
          const snap = await getDoc(userRef);
          const eventosUser = snap.exists() ? (snap.data().eventosInscritos || []) : [];
          const atualizados = eventosUser.filter(e => e.id !== ev.id);
          await updateDoc(userRef, { eventosInscritos: atualizados });
          userInscritos = atualizados;
          showModalInfo('Cancelado', 'Sua inscrição foi cancelada com sucesso.');
          renderGrid();
          overlay.remove();
        } catch (err) {
          console.error(err);
          showModalInfo('Erro', 'Erro ao cancelar inscrição. Tente novamente.');
        }
      });
    });
    actionsDiv.appendChild(btnCancelar);
  } else {
    const btnInscrever = document.createElement('button');
    btnInscrever.className = 'btn-inscrever';
    btnInscrever.textContent = 'Inscrever-se';
    btnInscrever.addEventListener('click', async () => {
      try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const inscritosExist = userSnap.exists() ? (userSnap.data().eventosInscritos || []) : [];
        const ja = inscritosExist.some(i => i.id === ev.id);
        if (ja) {
          showModalInfo('Atenção', 'Você já está inscrito nesse evento.');
          return;
        }
        const toSave = {
          id: ev.id,
          titulo: ev.titulo ?? '',
          descricao: ev.descricao ?? '',
          date: ev.data ? ev.data.toString() : ''
        };
        const novos = [...inscritosExist, toSave];
        await updateDoc(userRef, { eventosInscritos: novos });
        userInscritos = novos;
        showModalInfo('Sucesso', 'Inscrição realizada com sucesso!');
        renderGrid();
        overlay.remove();
      } catch (err) {
        console.error(err);
        showModalInfo('Erro', 'Erro ao inscrever. Tente novamente.');
      }
    });
    actionsDiv.appendChild(btnInscrever);
  }

  const btnFechar = document.createElement('button');
  btnFechar.className = 'btn-fechar';
  btnFechar.textContent = 'Fechar';
  btnFechar.addEventListener('click', () => overlay.remove());
  actionsDiv.appendChild(btnFechar);

  modal.querySelector('.em-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    try {
      const userRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(userRef);
      userInscritos = snap.exists() ? (snap.data().eventosInscritos || []) : [];
    } catch {
      userInscritos = [];
    }
  } else {
    userInscritos = [];
  }
  renderGrid();
});

carregarEventos();
