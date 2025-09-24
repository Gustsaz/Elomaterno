import { db, auth } from './firebase.js';
import { doc, getDoc }
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
        const d = new Date(ev.date);
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
        <img src="${ev.img || './img/default-event.png'}" alt="Evento" class="mini-cover">
        <div>
          <h4 class="mini-title">${ev.titulo}</h4>
          <span class="mini-date">${dataFormatada}</span>
        </div>
      </div>
      <a href="eventos.html" class="botao-acao pequeno inscrito">Inscrito</a>
    `;
        container.appendChild(card);
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        renderEventos([]);
        return;
    }

    const userRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        renderEventos([]);
        return;
    }

    const eventos = snap.data().eventosInscritos || [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const proximos = eventos
        .filter(ev => new Date(ev.date) >= hoje)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 2);

    renderEventos(proximos);
});
