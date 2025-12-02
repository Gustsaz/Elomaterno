import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const container = document.getElementById("artigos-home");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeImg(src) {
  if (!src) return "./img/art1_img.png";
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return src.replace(/^\.\//, "./");
}

async function carregarUltimosArtigos() {
  try {
    const q = query(collection(db, "artigos"), orderBy("datahorapost", "desc"), limit(2));
    const snap = await getDocs(q);
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<p>Nenhum artigo publicado ainda.</p>";
      return;
    }

    snap.forEach((docSnap) => {
      const a = docSnap.data();
      const href = `artigo_ind.html?id=${docSnap.id}`;
      const titulo = a.titulo || "Artigo";
      const img = normalizeImg(a.img || "");
      const mini = document.createElement("a");
      mini.className = "mini-card artigo-card com-brilho";
      mini.href = href;
      
      mini.innerHTML = `
        <img src="${img}" alt="${escapeHtml(titulo)}" class="mini-cover">
        <h4 class="mini-title">${escapeHtml(titulo)}</h4>
        <span class="mini-link">Ler artigo</span>
      `;
      container.appendChild(mini);
    });
  } catch (e) {
    console.error("Erro ao carregar artigos:", e);
    container.innerHTML = "<p>Erro ao carregar artigos.</p>";
  }
}

carregarUltimosArtigos();


