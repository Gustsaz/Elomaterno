import { db } from './firebase.js';
import { collection, getDocs, query, orderBy, limit } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const container = document.querySelector(".cards-grid.eventos-home");

function renderEventos(eventos) {
  container.innerHTML = "";

  if (eventos.length === 0) {
    container.innerHTML = `
      <div class="mini-card event-mini com-brilho">
        <div class="event-body">
          <div>
            <h4 class="mini-title">Nenhum evento disponível</h4>
            <span class="mini-date">Volte em breve</span>
          </div>
        </div>
      </div>`;
    return;
  }

  eventos.forEach(ev => {
    const d = ev.data;
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
      <a href="eventos.html" class="botao-acao pequeno">Ver evento</a>
    `;
    container.appendChild(card);
  });
}

async function carregarUltimosEventos() {
  const q = query(
    collection(db, "eventos"),
    orderBy("data", "desc"), 
    limit(2)                 
  );

  const snap = await getDocs(q);
  const eventos = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    eventos.push({
      id: docSnap.id,
      ...data,
      data: data.data?.toDate ? data.data.toDate() : data.data
    });
  });

  renderEventos(eventos);
}

carregarUltimosEventos();