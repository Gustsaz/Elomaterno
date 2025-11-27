import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const artigoId = params.get("id");

  if (!artigoId) {
    document.querySelector(".artigo-card").innerHTML = "<p>⚠️ Nenhum artigo selecionado.</p>";
    return;
  }

  try {
    const artigoRef = doc(db, "artigos", artigoId);
    const artigoSnap = await getDoc(artigoRef);

    if (artigoSnap.exists()) {
      const artigo = artigoSnap.data();

      document.title = `Artigo • ${artigo.titulo}`;
      document.getElementById("artigo-titulo").textContent = artigo.titulo;
      document.getElementById("artigo-resumo").textContent = artigo.resumo;
      document.getElementById("artigo-link").href = artigo.link;
      const imgEl = document.getElementById("artigo-img");
      imgEl.src = artigo.img || "../img/placeholder.png";
      imgEl.alt = artigo.titulo || "Imagem do artigo";

    } else {
      document.querySelector(".artigo-card").innerHTML = "<p>Artigo não encontrado.</p>";
    }
  } catch (err) {
    console.error("Erro ao carregar artigo:", err);
    document.querySelector(".artigo-card").innerHTML = "<p>Erro ao carregar artigo.</p>";
  }
});
