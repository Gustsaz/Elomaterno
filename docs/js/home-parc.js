import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  setDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const boasVindas = document.getElementById("boasVindas");
const logoutBtn = document.getElementById("logoutBtn");

const addPostBtn = document.querySelector(".add-post-btn");
const addPostBtnArtigos = document.querySelector(".add-post-btn-artigos");
const articlesGridArtigos = document.getElementById("articlesGridArtigos");
addPostBtnArtigos?.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

const modal = document.getElementById("postModal");
const closeModal = document.getElementById("closeModal");
const postForm = document.getElementById("postForm");
const postMsg = document.getElementById("postMsg");
const articlesGrid = document.querySelector(".articles-grid");

const addEventBtn = document.querySelector(".add-event-btn");
const addEventBtn2 = document.querySelector(".add-consult-btn");
const eventModal = document.getElementById("eventModal");
const closeEventModal = document.getElementById("closeEventModal");
const eventForm = document.getElementById("eventForm");
const eventMsg = document.getElementById("eventMsg");
const eventList = document.querySelector(".event-list.horizontal");

let nomeEmpresaAtual = "";
let itemParaExcluir = null;
let tipoParaExcluir = "";

const confirmModal = document.createElement("div");
confirmModal.className = "modal hidden";
confirmModal.innerHTML = `
  <div class="modal-content" style="max-width:400px;text-align:center;">
    <h3>Tem certeza que deseja excluir?</h3>
    <p>Essa ação não pode ser desfeita.</p>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:15px;">
      <button id="confirmDelete" style="background:#d9534f;">Excluir</button>
      <button id="cancelDelete" style="background:#aaa;">Cancelar</button>
    </div>
  </div>
`;
document.body.appendChild(confirmModal);
const confirmDeleteBtn = confirmModal.querySelector("#confirmDelete");
const cancelDeleteBtn = confirmModal.querySelector("#cancelDelete");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "logParc.html";
    return;
  }

  try {
    const docRef = doc(db, "parceiros", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      nomeEmpresaAtual = docSnap.data().nomeEmpresa || "Parceiro";
      const verificado = true;
      boasVindas.innerHTML = `Olá, ${nomeEmpresaAtual} 
  <img src="./img/selinho-ver.svg" class="verificado-icon">
`;

      carregarTodosArtigosHome(nomeEmpresaAtual).then(() => {
        configurarFiltrosArtigos();
      });

      carregarEventosDoParceiro(nomeEmpresaAtual);
    } else {
      boasVindas.textContent = "Olá, parceiro!";
    }
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    boasVindas.textContent = "Olá!";
  }
  card.innerHTML = `
  <img src="${art.img}" class="article-img">
  <div class="article-body">
    <h3>${art.titulo}</h3>
    <p>${art.descricao}</p>
    <span class="categoria-tag">${art.categoria}</span>
  </div>
`;

});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "logParc.html";
});

addPostBtn.addEventListener("click", () => modal.classList.remove("hidden"));
closeModal.addEventListener("click", () => modal.classList.add("hidden"));

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const artigo = {
    titulo: document.getElementById("titulo").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    resumo: document.getElementById("resumo").value.trim(),
    img: document.getElementById("img").value.trim(),
    link: document.getElementById("link").value.trim(),
    categoria: document.getElementById("categoria").value,
    postadoPor: nomeEmpresaAtual,
    datahorapost: new Date(),
  };

  try {
    await addDoc(collection(db, "artigos"), artigo);
    postMsg.style.color = "green";
    postMsg.textContent = "Post criado com sucesso!";
    postForm.reset();
    modal.classList.add("hidden");
    carregarArtigosDoParceiro(nomeEmpresaAtual, "posts");
    carregarArtigosDoParceiro(nomeEmpresaAtual, "dicas");
    carregarArtigosDoParceiro(nomeEmpresaAtual, "educacionais");
    carregarArtigosDoParceiro(nomeEmpresaAtual, "legislativos");
  } catch (err) {
    console.error("Erro ao criar post:", err);
    postMsg.style.color = "red";
    postMsg.textContent = "Erro ao criar post.";
  }
});

async function carregarPostsDoParceiro(nomeEmpresa) {
  const q = query(
    collection(db, "artigos"),
    where("postadoPor", "==", nomeEmpresa),
    where("categoria", "==", "posts")
  );
  const querySnapshot = await getDocs(q);

  articlesGrid.innerHTML = "";

  querySnapshot.forEach((d) => {
    const art = d.data();
    const card = document.createElement("div");
    card.classList.add("article-card");
    card.innerHTML = `
      <div class="delete-btn"><i class="fa-solid fa-trash"></i></div>
      <img src="${art.img}" alt="${art.titulo}" class="article-img">
      <div class="article-body">
        <h3>${art.titulo}</h3>
        <p>${art.descricao}</p>
      </div>
    `;
    card.querySelector(".delete-btn").addEventListener("click", () => {
      itemParaExcluir = d.id;
      tipoParaExcluir = "artigo";
      confirmModal.classList.remove("hidden");
    });
    articlesGrid.appendChild(card);
  });
}

addEventBtn.addEventListener("click", () =>
  eventModal.classList.remove("hidden")
);
addEventBtn2.addEventListener("click", () =>
  eventModal.classList.remove("hidden")
);
closeEventModal.addEventListener("click", () =>
  eventModal.classList.add("hidden")
);

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const evento = {
    titulo: document.getElementById("tituloEvento").value.trim(),
    descricao: document.getElementById("descricaoEvento").value.trim(),
    data: Timestamp.fromDate(
      new Date(document.getElementById("dataEvento").value)
    ),
    local: document.getElementById("localEvento").value.trim(),
    capa: document.getElementById("capaEvento").value.trim(),
    enviadoPor: nomeEmpresaAtual,
  };

  try {
    await addDoc(collection(db, "eventos"), evento);
    eventMsg.style.color = "green";
    eventMsg.textContent = "Evento criado com sucesso!";
    eventForm.reset();
    eventModal.classList.add("hidden");
    carregarEventosDoParceiro(nomeEmpresaAtual);
  } catch (err) {
    console.error("Erro ao criar evento:", err);
    eventMsg.style.color = "red";
    eventMsg.textContent = "Erro ao criar evento.";
  }
});

async function carregarEventosDoParceiro(nomeEmpresa) {
  const q = query(
    collection(db, "eventos"),
    where("enviadoPor", "==", nomeEmpresa)
  );
  const querySnapshot = await getDocs(q);

  eventList.innerHTML = "";

  querySnapshot.forEach((d) => {
    const ev = d.data();
    const item = document.createElement("div");
    item.classList.add("event");
    item.innerHTML = `
      <div class="delete-btn"><i class="fa-solid fa-trash"></i></div>
      <img src="${ev.capa}" alt="${
      ev.titulo
    }" style="width:100%; height:120px; border-radius:8px; object-fit:cover; margin-bottom:8px;">
      <strong>${new Date(ev.data.toDate()).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })} • ${ev.titulo}</strong>
      <p>${ev.descricao}</p>
      <p><em>${ev.local}</em></p>
    `;
    item.querySelector(".delete-btn").addEventListener("click", () => {
      itemParaExcluir = d.id;
      tipoParaExcluir = "evento";
      confirmModal.classList.remove("hidden");
    });
    eventList.appendChild(item);
  });
}

confirmDeleteBtn.addEventListener("click", async () => {
  if (!itemParaExcluir) return;
  try {
    if (tipoParaExcluir === "artigo") {
      await deleteDoc(doc(db, "artigos", itemParaExcluir));
      carregarPostsDoParceiro(nomeEmpresaAtual);
    } else if (tipoParaExcluir === "evento") {
      await deleteDoc(doc(db, "eventos", itemParaExcluir));
      carregarEventosDoParceiro(nomeEmpresaAtual);
    }
  } catch (err) {
    console.error("Erro ao excluir:", err);
  } finally {
    confirmModal.classList.add("hidden");
    itemParaExcluir = null;
    tipoParaExcluir = "";
  }
});

cancelDeleteBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  itemParaExcluir = null;
});

let eventosParceiro = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

async function carregarEventosParceiro(nomeEmpresa) {
  const eventosRef = collection(db, "eventos");
  const q = query(eventosRef, where("enviadoPor", "==", nomeEmpresa));
  const snap = await getDocs(q);

  const eventos = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    eventos.push({
      id: docSnap.id,
      ...data,
      data: data.data?.toDate ? data.data.toDate() : new Date(data.data),
    });
  });

  eventosParceiro = eventos;
  inicializarSelects();
  renderCalendar();
  renderListaEventos();
}

function inicializarSelects() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");

  if (!monthSelect || !yearSelect) return;

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  if (monthSelect.options.length === 0) {
    months.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    const year = new Date().getFullYear();
    for (let y = year - 2; y <= year + 3; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
  }

  atualizarSelects();
}

function atualizarSelects() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  if (!monthSelect || !yearSelect) return;
  monthSelect.value = currentMonth;
  yearSelect.value = currentYear;
  renderCalendar();
}

window.prevMonth = function () {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  atualizarSelects();
};

window.nextMonth = function () {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  atualizarSelects();
};

window.onMonthChange = function () {
  const monthSelect = document.getElementById("month-select");
  currentMonth = parseInt(monthSelect.value);
  renderCalendar();
};

window.onYearChange = function () {
  const yearSelect = document.getElementById("year-select");
  currentYear = parseInt(yearSelect.value);
  renderCalendar();
};

function renderCalendar() {
  const calendarDates = document.getElementById("calendarDates");
  if (!calendarDates) return;

  const today = new Date();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  calendarDates.innerHTML = "";

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.classList.add("empty");
    calendarDates.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("date");

    const current = new Date(currentYear, currentMonth, d);
    const todayCheck = current.toDateString() === today.toDateString();
    if (todayCheck) dateDiv.classList.add("today");

    const eventosDia = eventosParceiro.filter(
      (ev) =>
        ev.data.getDate() === d &&
        ev.data.getMonth() === currentMonth &&
        ev.data.getFullYear() === currentYear
    );

    if (eventosDia.length > 0) {
      dateDiv.classList.add("has-event");
      dateDiv.title = eventosDia.map((ev) => ev.titulo).join(", ");
    }

    dateDiv.textContent = d;
    calendarDates.appendChild(dateDiv);
  }
}

function renderListaEventos() {
  const eventList = document.querySelector("#calendario .event-list");
  if (!eventList) return;

  eventList.innerHTML = "";

  const eventosOrdenados = [...eventosParceiro].sort((a, b) => a.data - b.data);

  eventosOrdenados.forEach((ev) => {
    const div = document.createElement("div");
    div.classList.add("event");
    const dataFormatada = ev.data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    div.innerHTML = `
      <strong>${dataFormatada} • ${ev.titulo}</strong>
      <p>${ev.descricao}</p>
      <small>${ev.local}</small>
    `;
    eventList.appendChild(div);
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const parceiroRef = doc(db, "parceiros", user.uid);
  const parceiroSnap = await getDoc(parceiroRef);
  if (parceiroSnap.exists()) {
    const nomeEmpresa = parceiroSnap.data().nomeEmpresa;
    carregarEventosParceiro(nomeEmpresa);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".menu-btn");
  const contents = document.querySelectorAll(".content");

  let current =
    Array.from(contents).find((c) => !c.classList.contains("hidden")) ||
    contents[0];

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const target = document.getElementById(targetId);

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      contents.forEach((c) => c.classList.add("hidden"));
      target.classList.remove("hidden");

      
      if (targetId === "artigos") {
        carregarArtigosNaAbaArtigos(nomeEmpresaAtual);
      }
    });
  });
});
async function carregarTodosArtigosHome(nomeEmpresa) {
  const q = query(
    collection(db, "artigos"),
    where("postadoPor", "==", nomeEmpresa)
  );

  const snapshot = await getDocs(q);

  articlesGrid.innerHTML = "";

  snapshot.forEach((d) => {
    const art = d.data();
    const card = document.createElement("div");

    const categoriaClass = "cat-" + art.categoria;

    card.classList.add("article-card", categoriaClass);

    card.setAttribute("data-categoria", art.categoria);

    card.innerHTML = `
      <img src="${art.img}" class="article-img">
      <div class="article-body">
        <h3>${art.titulo}</h3>
        <p>${art.descricao}</p>
        <span class="categoria-tag">${art.categoria}</span>
      </div>
    `;

    articlesGrid.appendChild(card);
  });
}

console.log("home-parc.js carregado");

function initForumParceiro() {
  console.log("initForumParceiro() iniciando...");

  const postsList = document.getElementById("posts-list");
  const novaBtn = document.getElementById("nova-post-btn");
  const novaBtnFixa = document.getElementById("nova-post-fixa");
  const modal = document.getElementById("modal-post");
  const formPost = document.getElementById("form-post");
  const cancelarPost = document.getElementById("cancelar-post");
  const closePostModal = document.getElementById("close-post-modal");
  const inputTitulo = modal ? modal.querySelector("#titulo") : null;
  const inputConteudo = modal ? modal.querySelector("#conteudo") : null;
  const anonimoCheck = modal ? modal.querySelector("#anonimo-checkbox") : null;
  const searchInput = document.getElementById("forum-search-input");

  if (!postsList) {
    console.error("❌ posts-list não encontrado no DOM (id='posts-list')");
    return;
  }
  if (!modal || !formPost || !inputTitulo || !inputConteudo) {
    console.error(
      "❌ Elementos do modal do fórum não encontrados. modal, form-post, titulo ou conteudo ausentes"
    );
    return;
  }

  let usuarioLogado = null;
  let dadosParceiro = null;

  onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        console.log("usuário não logado (fórum) — espera autenticação");
        return;
      }
      usuarioLogado = user;
      console.log("usuário logado (fórum):", usuarioLogado.uid);

      try {
        const parceiroSnap = await getDoc(doc(db, "parceiros", user.uid));
        if (parceiroSnap.exists()) {
          dadosParceiro = parceiroSnap.data();
          console.log("dadosParceiro encontrados:", dadosParceiro.nomeEmpresa);
        } else {
          dadosParceiro = null;
        }
      } catch (err) {
        console.warn("⚠️ erro buscando parceiro:", err);
        dadosParceiro = null;
      }

      try {
        const q = query(collection(db, "posts"), orderBy("data", "desc"));
        onSnapshot(q, async (snapshot) => {
          try {
            const cards = [];
            for (const docSnap of snapshot.docs) {
              const post = docSnap.data();
              const id = docSnap.id;

              const dataFormatada = post.data?.toDate
                ? post.data.toDate().toLocaleString("pt-BR")
                : "Agora";

              const isParceiro =
                post.autorId && post.autorId.startsWith("parc_");

              const card = document.createElement("div");
              card.className = `post-card com-brilho ${
                isParceiro ? "parceiro" : ""
              }`;
              card.dataset.id = id;

              let comentariosCount = 0;
              try {
                const commentsSnap = await getDocs(
                  collection(db, "posts", id, "comentarios")
                );
                comentariosCount = commentsSnap.size;
              } catch (err) {
                console.warn("Erro ao carregar comentários:", err);
              }

              card.innerHTML = `
        <h3 class="post-title">${sanitize(post.titulo)}</h3>
        <div class="post-meta">
          <img src="${sanitize(
            post.autorFoto || "./img/account_icon.png"
          )}" class="author-avatar" alt="avatar">
          <div>
            <span class="author-name">${sanitize(
              post.autorNome || "Usuário"
            )}</span>
            <span class="post-date">${dataFormatada}</span>
          </div>
        </div>
        <p class="post-content">${sanitize(post.conteudo)}</p>
        <div class="like-wrap" data-id="${id}">
          <img src="./img/like_icon.png" alt="Curtir" class="like-icon">
          <span class="like-count">${post.likes || 0}</span>
        </div>
        <div class="post-actions">
          <div class="comments-info">
            <img src="./img/consult_icon.png" alt="Comentários" class="comment-icon">
            <span class="comment-count" data-id="${id}">${comentariosCount}</span>
          </div>
          ${
            usuarioLogado && usuarioLogado.uid === post.autorId
              ? `<button class="delete-btn action-btn" data-id="${id}">Excluir</button>`
              : ""
          }
        </div>
      `;
              cards.push(card);
            }

            postsList.innerHTML = "";
            cards.forEach((c) => postsList.appendChild(c));
            console.log("posts renderizados:", cards.length);
          } catch (renderErr) {
            console.error("Erro processando snapshot:", renderErr);
          }
        });

        snapshot.forEach(async (docSnap) => {
          const id = docSnap.id;
          try {
            const commentsSnap = await getDocs(
              collection(db, "posts", id, "comentarios")
            );
            const count = commentsSnap.size;
            const el = document.querySelector(
              `.comment-count[data-id="${id}"]`
            );
            if (el) el.textContent = count;
          } catch (e) {
            console.warn("Erro ao contar comentários:", e);
          }
        });
      } catch (qErr) {
        console.error("Erro criando snapshot/query de posts:", qErr);
      }
    } catch (outerErr) {
      console.error("Erro no onAuthStateChanged do fórum:", outerErr);
    }
  });

  async function criarPost(titulo, conteudo) {
    try {
      if (!usuarioLogado) {
        alert("Você precisa estar logado para postar.");
        return;
      }

      let autorId, autorNome, autorFoto;
      if (anonimoCheck && anonimoCheck.checked) {
        autorId = "anonimo";
        autorNome = "Anônimo";
        autorFoto = "./img/account_icon.png";
      } else if (dadosParceiro) {
        autorId = "parc_" + usuarioLogado.uid;
        autorNome = dadosParceiro.nomeEmpresa || "Parceiro";
        autorFoto = "./img/logo_icon.png";
      } else {
        const usuarioSnap = await getDoc(
          doc(db, "usuarios", usuarioLogado.uid)
        );
        const dadosUsuario = usuarioSnap.exists() ? usuarioSnap.data() : {};
        autorId = usuarioLogado.uid;
        autorNome = dadosUsuario.nome || "Usuário";
        autorFoto = dadosUsuario.avatar || "./img/account_icon.png";
      }

      const novo = {
        autorId,
        autorNome,
        autorFoto,
        titulo,
        conteudo,
        likes: 0,
        data: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "posts"), novo);
      console.log("Post criado com ID:", ref.id);
    } catch (err) {
      console.error("Erro ao criar post:", err);
      alert("Erro ao criar post. Veja console para mais detalhes.");
    }
  }

  [novaBtn, novaBtnFixa].forEach((btn) =>
    btn?.addEventListener("click", () => {
      inputTitulo.value = "";
      inputConteudo.value = "";
      modal.classList.remove("hidden");
    })
  );
  cancelarPost.addEventListener("click", () => modal.classList.add("hidden"));
  closePostModal.addEventListener("click", () => modal.classList.add("hidden"));

  formPost.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = inputTitulo.value.trim();
    const conteudo = inputConteudo.value.trim();
    if (!titulo || !conteudo) {
      alert("Título e conteúdo são obrigatórios.");
      return;
    }
    await criarPost(titulo, conteudo);
    modal.classList.add("hidden");
  });

  postsList.addEventListener("click", async (e) => {
    try {
      const card = e.target.closest(".post-card");
      if (!card) return;
      const postId = card.dataset.id;

      if (e.target.classList.contains("like-icon")) {
        e.stopPropagation();
        if (!usuarioLogado)
          return alert("É necessário estar logado para curtir.");

        const likeWrap = e.target.closest(".like-wrap");
        const countEl = likeWrap.querySelector(".like-count");
        const current = parseInt(countEl.textContent) || 0;
        const liked = e.target.src.includes("like_curtido.png");

        countEl.textContent = liked ? current - 1 : current + 1;
        e.target.src = liked ? "./img/like_icon.png" : "./img/like_curtido.png";

        const likeRef = doc(db, "posts", postId, "likes", usuarioLogado.uid);
        try {
          const snap = await getDoc(likeRef);
          if (snap.exists()) {
            await deleteDoc(likeRef);
            await updateDoc(doc(db, "posts", postId), { likes: increment(-1) });
          } else {
            await setDoc(likeRef, { curtido: true });
            await updateDoc(doc(db, "posts", postId), { likes: increment(1) });
          }
        } catch (err) {
          console.error("Erro ao curtir:", err);
        }
        return;
      }

      if (e.target.closest(".delete-btn")) {
        if (confirm("Deseja realmente excluir este post?")) {
          await deleteDoc(doc(db, "posts", postId));
        }
        return;
      }

      window.location.href = `comentResp.html?postId=${postId}`;
    } catch (err) {
      console.error("Erro no event listener de postsList:", err);
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const termo = searchInput.value.toLowerCase();
      document.querySelectorAll(".post-card").forEach((card) => {
        const titulo =
          card.querySelector(".post-title")?.textContent.toLowerCase() || "";
        const autor =
          card.querySelector(".author-name")?.textContent.toLowerCase() || "";
        card.style.display =
          titulo.includes(termo) || autor.includes(termo) ? "block" : "none";
      });
    });
  }

  function sanitize(str) {
    return (str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  console.log("initForumParceiro() pronto");

  document.addEventListener("mousemove", (e) => {
    document.querySelectorAll(".post-card.com-brilho").forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initForumParceiro);
} else {
  initForumParceiro();
}
async function carregarArtigosNaAbaArtigos(nomeEmpresa) {
  const q = query(
    collection(db, "artigos"),
    where("postadoPor", "==", nomeEmpresa),
    where("categoria", "in", ["posts", "legislativos", "educacionais", "dicas"])
  );

  const snapshot = await getDocs(q);

  articlesGridArtigos.innerHTML = "";

  snapshot.forEach((d) => {
    const art = d.data();
    const card = document.createElement("div");
    card.classList.add("article-card");

    card.innerHTML = `
      <div class="delete-btn"><i class="fa-solid fa-trash"></i></div>
      <img src="${art.img}" alt="${art.titulo}" class="article-img">
      <div class="article-body">
        <h3>${art.titulo}</h3>
        <p>${art.descricao}</p>
        <span class="categoria-tag">${art.categoria}</span>
      </div>
    `;

    
    card.querySelector(".delete-btn").addEventListener("click", () => {
      itemParaExcluir = d.id;
      tipoParaExcluir = "artigo";
      confirmModal.classList.remove("hidden");
    });

    articlesGridArtigos.appendChild(card);
  });
}
function configurarFiltrosArtigos() {
  const botoes = document.querySelectorAll(".filtro-btn");

  botoes.forEach((btn) => {
    btn.addEventListener("click", () => {
      botoes.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const categoria = btn.getAttribute("data-cat");

      document.querySelectorAll(".article-card").forEach((card) => {
        const cardCat = card.getAttribute("data-categoria");

        if (categoria === "todas" || categoria === cardCat) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}
