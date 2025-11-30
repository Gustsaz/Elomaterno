import { db } from "./firebase.js";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const forumPreview = document.getElementById("forum-preview");

async function getUserData(uid) {
  let snap = await getDoc(doc(db, "usuarios", uid));
  if (snap.exists()) return snap.data();

  snap = await getDoc(doc(db, "advogado", uid));
  if (snap.exists()) return snap.data();

  snap = await getDoc(doc(db, "psicologos", uid));
  if (snap.exists()) return snap.data();

  return null;
}

async function carregarUltimosPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("data", "desc"), limit(2));
    const snapshot = await getDocs(q);
    forumPreview.innerHTML = "";

    for (const docSnap of snapshot.docs) {
      const p = docSnap.data();
      const postId = docSnap.id;
      const dataFormatada = p.data?.toDate?.().toLocaleDateString("pt-BR") || "Agora";

      let autorFoto = p.autorFoto || "./img/account_icon.png";
      let autorNome = p.autorNome || "Usuário";
      if (p.autorId) {
        try {
          const data = await getUserData(p.autorId);
          if (data) {
            autorFoto = data.avatar || data.fotoURL || autorFoto;
            autorNome = data.nome || autorNome;
          }
        } catch (err) {
          console.error("Erro ao buscar avatar do autor:", err);
        }
      }

      forumPreview.innerHTML += `
        <a href="comentResp.html?postId=${postId}" class="mini-card com-brilho">
          <div class="mini-header">
            <img src="${autorFoto}" alt="Avatar do ${autorNome}" class="mini-avatar">
            <div>
              <strong class="nome">${autorNome}</strong>
              <span class="mini-date">${dataFormatada}</span>
            </div>
          </div>
          <h4 class="mini-title">${escapeHtml(p.titulo)}</h4>
          <p class="mini-text">${escapeHtml(p.conteudo).slice(0, 80)}...</p>
        </a>
      `;
    }
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
