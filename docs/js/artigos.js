import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const wrapper = document.querySelector(".articles-wrapper");
const botoes = document.querySelectorAll(".categoria");

async function carregarArtigos() {
  const snap = await getDocs(collection(db, "artigos"));
  const artigos = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();

    // se tiver timestamp, converte para Date
    const dataPost = data.datahorapost?.toDate ? data.datahorapost.toDate() : null;

    artigos.push({
      id: docSnap.id,
      ...data,
      datahorapost: dataPost
    });
  });

  console.log("🔥 Artigos carregados:", artigos);
  renderArtigos(artigos);
}

function renderArtigos(artigos) {
  wrapper.innerHTML = ""; // limpa loader

  // Agrupar artigos por categoria
  const categorias = {};
  artigos.forEach(a => {
    if (!categorias[a.categoria]) categorias[a.categoria] = [];
    categorias[a.categoria].push(a);
  });

  Object.keys(categorias).forEach(cat => {
    const grid = document.createElement("div");
    grid.className = "articles-grid hidden";
    grid.dataset.categoria = cat;

    categorias[cat].forEach(art => {
      const card = document.createElement("div");
      card.className = "article-card";

      // imagem com fallback
      const imgSrc = art.img || "./img/placeholder.png";

      // apenas descricao
      const descricao = art.descricao || "";

      // formata data se existir (opcional, se quiser mostrar)
      let dataFormatada = "";
      if (art.datahorapost instanceof Date) {
        const d = art.datahorapost;
        const dataStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        const horaStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        dataFormatada = `
        <span class="article-meta">
          ${dataStr} • ${horaStr} - ${art.postadoPor || "autor"}
        </span>
      `;
      }

      card.innerHTML = `
        <img src="${imgSrc}" alt="Imagem artigo" class="article-img">
        <div class="article-body">
          <h3>${art.titulo || "Sem título"}</h3>
          ${dataFormatada}
          <p>${descricao}</p>
          <a href="${art.link || "#"}" target="_blank">Saiba mais…</a>
        </div>
      `;
      grid.appendChild(card);
    });

    wrapper.appendChild(grid);
  });

  aplicarFiltro();
}

function aplicarFiltro() {
  const grids = document.querySelectorAll(".articles-grid");

  botoes.forEach(botao => {
    botao.addEventListener("click", () => {
      botoes.forEach(b => b.classList.remove("ativa"));
      botao.classList.add("ativa");

      const categoria = botao.dataset.categoria;
      grids.forEach(grid => {
        grid.classList.toggle("hidden", grid.dataset.categoria !== categoria);
      });
    });
  });

  // mostrar a categoria ativa no carregamento
  const ativa = document.querySelector(".categoria.ativa");
  if (ativa) {
    const cat = ativa.dataset.categoria;
    grids.forEach(grid => {
      grid.classList.toggle("hidden", grid.dataset.categoria !== cat);
    });
  }
}

carregarArtigos();
