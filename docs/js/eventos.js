import { db, auth } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return; // não logado

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
});
