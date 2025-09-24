import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const forumPreview = document.getElementById("forum-preview");

async function carregarUltimosPosts() {
  try {
    const q = query(
      collection(db, "posts"),
      orderBy("data", "desc"),
      limit(2)
    );
    const snapshot = await getDocs(q);

    forumPreview.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      const dataFormatada = post.data?.toDate().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) || "Agora";

      forumPreview.innerHTML += `
        <a href="comentResp.html?postId=${postId}" class="mini-card com-brilho">
          <div class="mini-header">
            <img src="${post.autorFoto || './img/account_icon.png'}" alt="Avatar" class="mini-avatar">
            <div>
              <strong>${post.autorNome || "Usuário"}</strong>
              <span class="mini-date">${dataFormatada}</span>
            </div>
          </div>
          <h4 class="mini-title">${escapeHtml(post.titulo)}</h4>
          <p class="mini-text">${escapeHtml(post.conteudo).slice(0, 80)}...</p>
        </a>
      `;
    });
  } catch (err) {
    console.error("Erro ao carregar posts do fórum:", err);
    forumPreview.innerHTML = "<p>Não foi possível carregar os posts.</p>";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

carregarUltimosPosts();
