import { db, auth } from './firebase.js';
import { collection, getDocs, doc, getDoc, updateDoc } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const grid = document.querySelector(".eventos-grid");

async function carregarEventos() {
  const snap = await getDocs(collection(db, "eventos"));
  const eventos = [];
  snap.forEach(docSnap => {
    eventos.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderEventos(eventos);
}

function renderEventos(eventos) {
  grid.innerHTML = "";
  eventos.forEach(ev => {
    const d = new Date(ev.data);
    const dataFormatada = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const card = document.createElement("article");
    card.className = "evento-card com-brilho";
    card.dataset.eventoId = ev.id;
    card.dataset.date = ev.data;
    card.innerHTML = `
      <img src="${ev.capa}" alt="Evento" class="evento-cover">
      <div class="evento-body">
        <h3>${ev.titulo}</h3>
        <span class="evento-meta">${dataFormatada} • ${hora} • ${ev.local}</span>
        <p>${ev.descricao}</p>
        <button class="btn-inscrever">Inscrever-se</button>
      </div>
    `;
    grid.appendChild(card);
  });

  aplicarInscricao();
}

function aplicarInscricao() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const userRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(userRef);
    let dadosUser = snap.exists() ? snap.data() : {};
    let inscritos = dadosUser.eventosInscritos || [];

    document.querySelectorAll(".evento-card").forEach((card) => {
      const id = card.dataset.eventoId;
      const titulo = card.querySelector("h3")?.textContent || "";
      const descricao = card.querySelector("p")?.textContent || "";
      const date = card.dataset.date;
      const btn = card.querySelector(".btn-inscrever");

      const estaInscrito = () => inscritos.some(e => e.id === id);

      const refresh = () => {
        if (estaInscrito()) {
          btn.textContent = "Inscrito";
          btn.classList.add("inscrito");
        } else {
          btn.textContent = "Inscrever-se";
          btn.classList.remove("inscrito");
        }
      };

      refresh();

      btn.addEventListener("click", async () => {
        const snapAtual = await getDoc(userRef);
        inscritos = snapAtual.exists() ? (snapAtual.data().eventosInscritos || []) : [];

        let novos;
        if (estaInscrito()) {
          novos = inscritos.filter(e => e.id !== id);
        } else {
          novos = [...inscritos, { id, titulo, descricao, date }];
        }

        await updateDoc(userRef, { eventosInscritos: novos });
        inscritos = novos;
        refresh();
      });
    });
  });
}

carregarEventos();
