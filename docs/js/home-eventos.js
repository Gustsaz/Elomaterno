import { db, auth } from './firebase.js';
import { doc, getDoc, getDocs, collection } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const container = document.querySelector(".cards-grid.eventos-home");

function renderEventos(eventos) {
  container.innerHTML = "";

  if (eventos.length === 0) {
    container.innerHTML = `
      <div class="mini-card event-mini com-brilho">
        <div class="event-body">
          <div>
            <h4 class="mini-title">Nenhum evento futuro</h4>
            <span class="mini-date">Inscreva-se na página de eventos</span>
          </div>
        </div>
      </div>`;
    return;
  }

  eventos.forEach(ev => {
    const d = ev.data?.toDate ? ev.data.toDate() : new Date(ev.data);
    const dataFormatada = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });

    const card = document.createElement("div");
    card.className = "mini-card event-mini com-brilho";
    card.innerHTML = `
      <div class="event-body">
        <img src="${ev.capa || './img/default-event.png'}" 
             alt="Capa do evento" class="mini-cover">
        <div>
          <h4 class="mini-title">${ev.titulo}</h4>
          <span class="mini-date">${dataFormatada} • ${ev.local || "Online"}</span>
        </div>
      </div>
      <a href="eventos.html" class="botao-acao pequeno inscrito">
        ${ev.estaInscrito ? "Inscrito" : "Ver evento"}
      </a>
    `;
    container.appendChild(card);
  });
}

async function carregarEventosInscritos(user) {
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    renderEventos([]);
    return;
  }

  const inscritos = snap.data().eventosInscritos || [];
  if (inscritos.length === 0) {
    renderEventos([]);
    return;
  }

  // pega todos os eventos do Firestore
  const eventosSnap = await getDocs(collection(db, "eventos"));
  const eventosCompletos = [];
  eventosSnap.forEach(docSnap => {
    const data = docSnap.data();
    eventosCompletos.push({
      id: docSnap.id,
      ...data,
      data: data.data?.toDate ? data.data.toDate() : data.data
    });
  });

  // filtra só os que o usuário está inscrito
  const eventosInscritos = eventosCompletos
    .filter(ev => inscritos.some(e => e.id === ev.id))
    .sort((a, b) => a.data - b.data)
    .slice(0, 2)
    .map(ev => ({ ...ev, estaInscrito: true }));

  renderEventos(eventosInscritos);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    renderEventos([]);
    return;
  }
  await carregarEventosInscritos(user);
});