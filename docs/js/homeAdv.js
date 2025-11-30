// ./js/homeAdv.js  (versão corrigida para loader + listas separadas)
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  increment,
  where,
  arrayUnion,
  arrayRemove,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ========== HELPERS DE MODAL (forçam inline styles para evitar problemas de stacking) ========== */
function showModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
  modalEl.style.display = "flex";
  modalEl.style.position = "fixed";
  modalEl.style.top = "0";
  modalEl.style.left = "0";
  modalEl.style.width = "100vw";
  modalEl.style.height = "100vh";
  modalEl.style.zIndex = "99999";
}
function hideModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  modalEl.style.display = "none";
}

/* FECHAR MODAIS AO CLICAR NO BACKDROP OU ESCAPE (global) */
document.addEventListener("click", (e) => {
  const modal = e.target.closest(".modal");
  if (!modal) return;
  const inner = modal.querySelector(".modal-content, .popup-content, .detalhes-consulta-card");
  if (inner && !inner.contains(e.target)) hideModal(modal);
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal:not(.hidden), .popup:not(.hidden)").forEach(m => hideModal(m));
});

/* -----------------------
   VARS GLOBAIS
   ----------------------- */
let eventosParceiro = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

let consultas = [];
let consultasGlobal = [];
let usuarioAtual = null;

/* -----------------------
   ELEMENTOS (modal e cabeçalho)
   ----------------------- */
const logoutBtn = document.getElementById("logoutBtn");
const lista = document.getElementById("consultas-list"); // lista principal de "Consultas" (tela completa)
const titulo = document.getElementById("titulo-consultas");
const boasVindasEl = document.getElementById("boasVindas");

const detalhesModal = document.getElementById("detalhesConsultaModal");
const detalhesAvatar = document.getElementById("detalhesAvatar");
const detalhesNome = document.getElementById("detalhesNome");
const detalhesTelefone = document.getElementById("detalhesTelefone");
const detalhesMotivo = document.getElementById("detalhesMotivo");
const detalhesDataConsulta = document.getElementById("detalhesDataConsulta");
const detalhesHoraConsulta = document.getElementById("detalhesHoraConsulta");
const detalhesStatus = document.getElementById("detalhesStatus");
const detalhesModalActions = detalhesModal?.querySelector(".modal-actions");

/* -----------------------
   LOGOUT
   ----------------------- */
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "logAdv.html";
  } catch (err) {
    console.error("Erro ao deslogar:", err);
  }
});

/* DOMContentLoaded */
document.addEventListener("DOMContentLoaded", () => {
  initMenuButtons();
  initTabs();

  try {
    document.getElementById("closeDetalhesConsulta")?.addEventListener("click", () => hideModal(detalhesModal));
    document.getElementById("close-post-modal")?.addEventListener("click", () => hideModal(document.getElementById("modal-post")));
    document.getElementById("cancelar-post")?.addEventListener("click", () => hideModal(document.getElementById("modal-post")));
    document.getElementById("closeEventModal")?.addEventListener("click", () => hideModal(document.getElementById("eventModal")));
    document.getElementById("closePopup")?.addEventListener("click", () => hideModal(document.getElementById("notesPopup")));
  } catch (err) {
    console.warn("Erro ao conectar listeners de fechamento de modal no DOMContentLoaded:", err);
  }
});

function initMenuButtons() {
  const buttons = document.querySelectorAll(".menu-btn");
  const contents = document.querySelectorAll(".content");
  const lastSection = localStorage.getItem('homeadv_lastSection') || 'dashboard';

  // Clear all active classes and hide all contents
  buttons.forEach(button => button.classList.remove('active'));
  contents.forEach(content => content.classList.add('hidden'));

  // Set initial active based on lastSection
  buttons.forEach(btn => {
    const target = btn.getAttribute("data-target");
    if (target === lastSection) {
      btn.classList.add("active");
    }
  });
  contents.forEach(c => {
    if (c.id === lastSection) {
      c.classList.remove("hidden");
    }
  });

  // Event listeners
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-target");
      contents.forEach(c => c.classList.toggle("hidden", c.id !== target));
      localStorage.setItem('homeadv_lastSection', target);
    });
  });
}

function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  if (!tabs || tabs.length === 0) return;
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filtrar(tab.dataset.status);
    });
  });
  if (!document.querySelector(".tab-btn.active")) {
    const first = document.querySelector(".tab-btn");
    if (first) first.classList.add("active");
  }
}

/* -----------------------
   HELPERS: loader para consultas (aparece em duas posições)
   ----------------------- */
function consultasLoaderMarkup() {
  return `
    <div class="loader">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
}
function showConsultasLoader() {
  try {
    // loader na tela de consultas (principal)
    if (lista) lista.innerHTML = consultasLoaderMarkup();
    // loader também na coluna do calendário (sidebar)
    const side = document.querySelector("#calendario .event-list-consultas");
    if (side) side.innerHTML = consultasLoaderMarkup();
  } catch (err) { console.warn("Erro showConsultasLoader:", err); }
}
function hideConsultasLoader() {
  try {
    if (lista && lista.querySelector(".loader")) lista.querySelector(".loader").remove();
    const side = document.querySelector("#calendario .event-list-consultas");
    if (side && side.querySelector(".loader")) side.querySelector(".loader").remove();
  } catch (err) { console.warn("Erro hideConsultasLoader:", err); }
}

/* -----------------------
   CARREGAR EVENTOS (parceiros) — renderiza apenas em .event-list-eventos
   ----------------------- */
async function carregarEventos() {
  const eventList = document.querySelector("#calendario .event-list-eventos");
  if (eventList) {
    eventList.innerHTML = `
      <div class="loader">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    `;
  }

  try {
    const snap = await getDocs(collection(db, "eventos"));
    const eventos = [];
    snap.forEach(docSnap => {
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
    // renderiza os eventos em container separado (não toca na lista de consultas)
    renderListaEventos();
  } catch (err) {
    console.error("erro ao carregar eventos:", err);
  } finally {
    // limpa loader de eventos (se existir)
    if (eventList && eventList.querySelector(".loader")) eventList.querySelector(".loader").remove();
  }
}

function inicializarSelects() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  if (!monthSelect || !yearSelect) return;
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  if (monthSelect.options.length === 0) {
    months.forEach((m, i) => { const opt = document.createElement("option"); opt.value = i; opt.textContent = m; monthSelect.appendChild(opt); });
    const year = new Date().getFullYear();
    for (let y = year - 2; y <= year + 3; y++) { const opt = document.createElement("option"); opt.value = y; opt.textContent = y; yearSelect.appendChild(opt); }
  }
  atualizarSelects();
}

function atualizarSelects() {
  const ms = document.getElementById("month-select");
  const ys = document.getElementById("year-select");
  if (ms) ms.value = currentMonth;
  if (ys) ys.value = currentYear;
  renderCalendar();
}

window.prevMonth = () => { currentMonth = (currentMonth - 1 + 12) % 12; if (currentMonth === 11) currentYear--; atualizarSelects(); };
window.nextMonth = () => { currentMonth = (currentMonth + 1) % 12; if (currentMonth === 0) currentYear++; atualizarSelects(); };
window.onMonthChange = () => { const el = document.getElementById("month-select"); if (el) currentMonth = parseInt(el.value); renderCalendar(); };
window.onYearChange = () => { const el = document.getElementById("year-select"); if (el) currentYear = parseInt(el.value); renderCalendar(); };

function renderCalendar() {
  const calendarDates = document.getElementById("calendarDates");
  if (!calendarDates) return;
  const today = new Date();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  calendarDates.innerHTML = "";
  for (let i = 0; i < firstDay; i++) calendarDates.appendChild(document.createElement("div"));
  for (let d = 1; d <= daysInMonth; d++) {
    const div = document.createElement("div");
    div.classList.add("date");
    const current = new Date(currentYear, currentMonth, d);
    if (current.toDateString() === today.toDateString()) div.classList.add("today");
    const eventosDia = eventosParceiro.filter(ev =>
      ev.data && ev.data.getDate && ev.data.getDate() === d && ev.data.getMonth() === currentMonth && ev.data.getFullYear() === currentYear
    );
    if (eventosDia.length > 0) {
      div.classList.add("has-event");
      div.title = eventosDia.map(e => e.titulo).join(", ");
    }
    div.textContent = d;
    calendarDates.appendChild(div);
  }

  setTimeout(() => {
    marcarDiasComDisponibilidade().catch(err => console.error("marcarDiasComDisponibilidade erro:", err));
  }, 0);
}

async function marcarDiasComDisponibilidade() {
  const calendarDates = document.querySelectorAll("#calendarDates .date");
  if (!calendarDates || calendarDates.length === 0) return;
  calendarDates.forEach(div => div.classList.remove("date-past"));
  const user = auth.currentUser;
  if (!user) return;
  try {
    const q = query(collection(db, "advogados"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const advDoc = snap.docs[0];
    const advData = advDoc.data();
    const disponibilidade = (advData.disponibilidade || []).map(t => (t.toDate ? t.toDate() : new Date(t)));
    const agendados = (advData.agendados || []).map(t => (t.toDate ? t.toDate() : new Date(t)));
    const diasComHorario = new Set();
    disponibilidade.forEach(d => { if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) diasComHorario.add(d.getDate()); });
    agendados.forEach(d => { if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) diasComHorario.add(d.getDate()); });
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    calendarDates.forEach(div => {
      const dia = parseInt(div.textContent, 10);
      const data = new Date(currentYear, currentMonth, dia);
      if (data < hoje) div.classList.add("date-past");
      if (diasComHorario.has(dia)) div.classList.add("has-event");
    });
  } catch (err) {
    console.error("Erro ao marcar dias:", err);
  }
}

/* initDisponibilidade (mantido como antes) */
function initDisponibilidade() {
  const calendar = document.getElementById("calendarDates");
  if (!calendar) return;
  let modal = document.getElementById("advDisponModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "advDisponModal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-content detalhes-consulta-card">
        <button class="close" id="closeAdvDisponModal">&times;</button>
        <h3 id="tituloModalDispon">Disponibilidades</h3>
        <p id="dataSelecionada" style="font-weight:600;margin-bottom:8px;"></p>
        <div id="horariosContainer" class="horarios-container" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
          <button id="confirmarDisponibilidade" class="contact-btn">Confirmar</button>
          <button id="cancelarDisponibilidade" class="add-consult-btn">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.zIndex = "99999";
    document.getElementById("closeAdvDisponModal")?.addEventListener("click", () => hideModal(modal));
    document.getElementById("cancelarDisponibilidade")?.addEventListener("click", () => hideModal(modal));
  }

  const horariosPadrao = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  calendar.addEventListener("click", async (e) => {
    const dateEl = e.target.closest(".date");
    if (!dateEl) return;
    const diaTxt = dateEl.textContent.trim();
    if (!diaTxt || isNaN(diaTxt)) return;
    const dia = parseInt(diaTxt, 10);
    const dataClicada = new Date(currentYear, currentMonth, dia);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const podeSelecionar = dataClicada >= hoje;
    showModal(modal);
    document.getElementById("dataSelecionada").textContent = dataClicada.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const container = document.getElementById("horariosContainer");
    container.innerHTML = "<p>Carregando horários...</p>";
    const user = auth.currentUser;
    if (!user) { alert("Usuário não autenticado."); hideModal(modal); return; }

    try {
      const q = query(collection(db, "advogados"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      if (snap.empty) { container.innerHTML = "<p>Documento do advogado não encontrado.</p>"; return; }
      const advDoc = snap.docs[0];
      const advData = advDoc.data();
      const disponibilidade = (advData.disponibilidade || []).map(t => (t.toDate ? t.toDate() : new Date(t)));
      const agendados = (advData.agendados || []).map(t => (t.toDate ? t.toDate() : new Date(t)));
      const qCons = query(collection(db, "Consultas"), where("Advogado", "==", user.uid));
      const snapCons = await getDocs(qCons);
      const horariosMarcados = {};
      for (const docu of snapCons.docs) {
        const c = docu.data();
        if (!c.Datahora) continue;
        const d = c.Datahora.toDate ? c.Datahora.toDate() : new Date(c.Datahora);
        if (d.toDateString() !== dataClicada.toDateString()) continue;
        const h = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        let maeNome = "Usuário";
        try {
          if (c.Mae) {
            const maeSnap = await getDoc(doc(db, "usuarios", c.Mae));
            if (maeSnap.exists()) maeNome = maeSnap.data().nome || maeNome;
          }
        } catch (err) { console.warn("Erro buscando maeNome:", err); }
        horariosMarcados[h] = { status: c.status || "pendente", maeNome };
      }

      const horariosOcupados = new Set();
      agendados.filter(dt => dt.toDateString() === dataClicada.toDateString()).forEach(d => {
        horariosOcupados.add(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      });
      disponibilidade.filter(dt => dt.toDateString() === dataClicada.toDateString()).forEach(d => {
        horariosOcupados.add(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      });

      container.innerHTML = "";
      horariosPadrao.forEach(h => {
        const btn = document.createElement("button");
        btn.textContent = h;
        btn.className = "horario-btn";
        btn.type = "button";
        if (horariosMarcados[h]) {
          btn.classList.add("ocupado", "agendado");
          btn.title = `${horariosMarcados[h].maeNome} • ${horariosMarcados[h].status || ""}`;
          btn.disabled = true;
        } else if (horariosOcupados.has(h)) {
          btn.classList.add("ocupado", "existente");
          btn.title = "Já disponível / agendado";
          btn.disabled = true;
        } else {
          if (!podeSelecionar) {
            btn.classList.add("ocupado");
            btn.disabled = true;
          } else {
            btn.addEventListener("click", () => btn.classList.toggle("selecionado"));
          }
        }
        container.appendChild(btn);
      });

      document.getElementById("confirmarDisponibilidade").onclick = async () => {
        if (!podeSelecionar) { alert("Não é possível adicionar disponibilidade em datas passadas."); return; }
        const selecionados = Array.from(container.querySelectorAll(".horario-btn.selecionado")).map(b => b.textContent);
        if (selecionados.length === 0) { alert("Selecione ao menos um horário."); return; }
        const novos = selecionados.map(h => {
          const [hr, min] = h.split(":").map(Number);
          const dt = new Date(dataClicada.getFullYear(), dataClicada.getMonth(), dataClicada.getDate(), hr, min, 0, 0);
          return Timestamp.fromDate(dt);
        });
        try {
          const advRef = doc(db, "advogados", advDoc.id);
          const antigos = advData.disponibilidade || [];
          const antigosMillis = antigos.map(t => t.toMillis ? t.toMillis() : new Date(t).getTime());
          const novosFiltrados = novos.filter(t => !antigosMillis.includes(t.toMillis()));
          if (novosFiltrados.length === 0) { alert("Os horários selecionados já estão na sua disponibilidade."); hideModal(modal); return; }
          await updateDoc(advRef, { disponibilidade: [...antigos, ...novosFiltrados] });
          alert("Disponibilidade salva com sucesso!");
          hideModal(modal);
          renderCalendar();
          await marcarDiasComDisponibilidade();
        } catch (err) {
          console.error("Erro ao salvar disponibilidade:", err);
          alert("Erro ao salvar. Veja console.");
        }
      };

    } catch (err) {
      console.error("Erro ao abrir modal de disponibilidade:", err);
      container.innerHTML = "<p>Erro ao carregar horários.</p>";
    }
  });
}

/* -----------------------
   RENDERIZAÇÃO DE EVENTOS (PARCEIRO) -> usa .event-list-eventos
   ----------------------- */
function renderListaEventos() {
  const list = document.querySelector("#calendario .event-list-eventos");
  if (!list) return;
  list.innerHTML = "";
  eventosParceiro.sort((a, b) => a.data - b.data).forEach(ev => {
    const div = document.createElement("div");
    div.classList.add("event");
    div.innerHTML = `<strong>${ev.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} • ${ev.titulo}</strong>
      <p>${ev.descricao}</p><small>${ev.local || ""}</small>`;
    list.appendChild(div);
  });
}

/* -----------------------
   ARTIGOS / FÓRUM (mantidos)
   ----------------------- */
async function carregarArtigos() {
  const sec = document.getElementById("artigos");
  if (!sec) return;
  sec.innerHTML = `<h2>Artigos Recentes</h2><div class="articles-grid"></div>`;
  const grid = sec.querySelector(".articles-grid");
  try {
    const snap = await getDocs(collection(db, "artigos"));
    const artigos = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const dataPost = data.datahorapost?.toDate ? data.datahorapost.toDate() : null;
      artigos.push({ id: docSnap.id, ...data, datahorapost: dataPost });
    });

    artigos.sort((a, b) => (b.datahorapost || 0) - (a.datahorapost || 0));

    grid.innerHTML = ""; // limpa antes de renderizar
    artigos.forEach(art => {
      const card = document.createElement("div");
      card.className = "article-card";
      const dataStr = art.datahorapost
        ? `<span class="article-meta">${art.datahorapost.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} • ${art.postadoPor || ""}</span>`
        : "";
      card.innerHTML = `
        <img src="${art.img || './img/article_placeholder.png'}" alt="Imagem artigo" class="article-img">
        <div class="article-body">
          <h3>${art.titulo || ""}</h3>
          ${dataStr}
          <p>${art.descricao || ""}</p>
          <a class="saiba-mais" href="./artigo_ind.html?id=${art.id}">Saiba mais…</a>
        </div>
      `;
      card.addEventListener("click", () => { window.location.href = `./artigo_ind.html?id=${art.id}`; });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("erro ao carregar artigos:", err);
    sec.innerHTML = "<p>Não foi possível carregar artigos.</p>";
  }
}


function initForum() {
  const postsList = document.getElementById("posts-list");
  const modal = document.getElementById("modal-post");
  const form = document.getElementById("form-post");
  const cancelar = document.getElementById("cancelar-post");
  const closeModal = document.getElementById("close-post-modal");
  const addBtn = document.getElementById("nova-post-btn");

  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    const q = query(collection(db, "posts"), orderBy("data", "desc"));
    onSnapshot(q, (snap) => {
      postsList.innerHTML = "";
      snap.forEach((docSnap) => {
        const post = docSnap.data();
        const id = docSnap.id;
        const data = post.data?.toDate ? post.data.toDate().toLocaleString("pt-BR") : "";
        const div = document.createElement("div");
        div.className = "post-card com-brilho";
        div.dataset.id = id;
        div.innerHTML = `
          <h3 class="post-title">${post.titulo}</h3>
          <div class="post-meta">
            <img src="${post.autorFoto || './img/account_icon.png'}" class="author-avatar">
            <div><span class="author-name">${post.autorNome}</span><span class="post-date">${data}</span></div>
          </div>
          <p class="post-content">${post.conteudo}</p>
        `;
        postsList.appendChild(div);
      });

      // Likes functionality removed as per requirements
    }, (err) => console.error("Erro snapshot posts:", err));
  });

  addBtn?.addEventListener("click", () => showModal(modal));
  cancelar?.addEventListener("click", () => hideModal(modal));
  closeModal?.addEventListener("click", () => hideModal(modal));

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = document.getElementById("titulo").value.trim();
    const conteudo = document.getElementById("conteudo").value.trim();
    if (!titulo || !conteudo) return alert("Preencha todos os campos");
    const user = auth.currentUser;
    const newPost = {
      autorId: user.uid,
      autorNome: "Dr. " + (user.displayName || "Advogado"),
      autorFoto: user.photoURL || "./img/account_icon.png",
      titulo,
      conteudo,
      likes: 0,
      data: serverTimestamp()
    };
    await addDoc(collection(db, "posts"), newPost);
    form.reset();
    hideModal(modal);
  });
}

/* -----------------------
   CONSULTAS (reais) - com controle de loader
   ----------------------- */
async function carregarConsultas() {
  consultas = [];
  consultasGlobal = [];

  showConsultasLoader(); // mostra loader imediatamente

  try {
    // Otimizado: query direta por Advogado para reduzir dados transferidos
    const q = query(collection(db, "Consultas"), where("Advogado", "==", usuarioAtual));
    const snap = await getDocs(q);

    // Extrair UIDs únicos das mães para busca batch
    const maeUids = [...new Set(snap.docs.filter(doc => doc.data().Mae).map(doc => doc.data().Mae))];

    // Busca batch de usuarios para eficiência
    const maePromises = maeUids.map(uid => getDoc(doc(db, "usuarios", uid)));
    const maeSnaps = await Promise.all(maePromises);

    // Mapeamento UID -> dados para acesso rápido
    const maeMap = Object.fromEntries(
      maeSnaps
        .filter(snap => snap.exists())
        .map(snap => [snap.id, snap.data()])
    );

    for (const docu of snap.docs) {
      const dados = docu.data();

      let maeInfo = maeMap[dados.Mae] || null;

      const item = { id: docu.id, ...dados, maeInfo };
      consultas.push(item);
      consultasGlobal.push(item);
    }

    // depois de carregar, renderizamos a sidebar e a lista principal
    renderConsultasSidebar();
    // filtrar para aba pendente (limpa loader na tela principal)
    filtrar("pendente");

  } catch (err) {
    console.error("Erro ao carregar Consultas:", err);
    if (lista) lista.innerHTML = `<p class="empty">Não foi possível carregar consultas.</p>`;
  } finally {
    // garante que o loader seja removido em qualquer caso
    hideConsultasLoader();
  }
}

function renderConsultasSidebar() {
  // agora procura pelo selector específico das consultas (sidebar do calendário)
  const list = document.querySelector("#calendario .event-list-consultas");
  if (!list) {
    console.warn("renderConsultasSidebar: .event-list-consultas não encontrada");
    return;
  }

  list.innerHTML = ""; // limpa (não colocamos loader aqui)

  const copy = (consultas || []).slice();
  copy.sort((a, b) => {
    const da = a.Datahora?.toDate ? a.Datahora.toDate().getTime() : (a.Datahora ? new Date(a.Datahora).getTime() : 0);
    const dbv = b.Datahora?.toDate ? b.Datahora.toDate().getTime() : (b.Datahora ? new Date(b.Datahora).getTime() : 0);
    return da - dbv;
  });

  if (copy.length === 0) {
    list.innerHTML = `<p class="empty">Nenhuma consulta encontrada.</p>`;
    return;
  }

  copy.forEach(c => {
    const mae = c.maeInfo || {};
    const nomeMae = mae.nome || "Mãe";
    let dataStr = "Data não informada";
    try {
      const d = c.Datahora?.toDate ? c.Datahora.toDate() : new Date(c.Datahora);
      dataStr = `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) { }

    const motivo = c.Motivo || c.motivo || "";
    const status = (c.status || "").toLowerCase();

    const div = document.createElement("div");
    div.className = "event";
    div.dataset.consultaId = c.id;
    div.innerHTML = `
      <div class="event-title">
        <span>${nomeMae}</span>
        <span class="event-status">${status || '—'}</span>
      </div>
      <div class="meta">${dataStr}</div>
      <div class="meta" style="font-weight:600; margin-top:6px;">${motivo}</div>
    `;
    div.addEventListener("click", () => {
      const consulta = consultas.find(item => item.id === c.id);
      if (!consulta) {
        console.warn("Consulta não encontrada para abrir modal:", c.id);
        return;
      }
      openDetalhesModal(consulta);
    });

    list.appendChild(div);
  });
}

/* -----------------------
   RENDER / FILTRAR / RENDER ITEM (tela principal de consultas)
   ----------------------- */
function filtrar(status) {
  if (!lista) return;
  lista.innerHTML = ""; // garante a remoção do loader

  document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
  const activeTab = document.querySelector(`.tab-btn[data-status="${status}"]`);
  if (activeTab) activeTab.classList.add("active");

  const filtradas = consultas.filter((c) => (c.status || "").toLowerCase() === (status || "").toLowerCase());
  if (filtradas.length === 0) {
    lista.innerHTML = `<p class="empty">Nenhuma consulta encontrada.</p>`;
    return;
  }
  filtradas.forEach(renderItem);
}

function renderItem(c) {
  const mae = c.maeInfo || {};
  const avatar = mae.avatar || "./img/avatar_usuario.png";
  const nomeMae = mae.nome || "Mãe";
  let dataText = "Data não informada";
  try {
    const d = c.Datahora?.toDate ? c.Datahora.toDate() : new Date(c.Datahora);
    dataText = `${d.toLocaleDateString()} às ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) { }

  const status = (c.status || "").toLowerCase();
  let actionsHtml = "";

  if (status === "pendente") {
    actionsHtml = `
      <button class="btn-aceitar" data-id="${c.id}">Aceitar</button>
      <button class="btn-recusar" data-id="${c.id}">Recusar</button>
      <button class="btn-ver" data-id="${c.id}">Ver detalhes</button>
    `;
  } else if (status === "aceito") {
    actionsHtml = `
      <button class="btn-finalizar" data-id="${c.id}">Finalizar</button>
      <button class="btn-ver" data-id="${c.id}">Ver detalhes</button>
    `;
  } else {
    actionsHtml = `<button class="btn-ver" data-id="${c.id}">Ver detalhes</button>`;
  }

  const html = `
    <div class="consulta-card" data-id="${c.id}">
      <div class="consulta-info">
        <img src="${avatar}" class="consulta-avatar">
        <div class="consulta-detalhes">
          <h3>${nomeMae}</h3>
          <p>${dataText}</p>
          <p><strong>Status:</strong> <span class="status">${c.status || ''}</span></p>
        </div>
      </div>
      <div class="consulta-actions">
        ${actionsHtml}
      </div>
    </div>
  `;
  lista.insertAdjacentHTML("beforeend", html);
}

/* -----------------------
   ABRIR MODAL (detalhes)
   ----------------------- */
function openDetalhesModal(consulta) {
  const mae = consulta.maeInfo || {};
  detalhesAvatar.src = mae.avatar || "./img/avatar_usuario.png";
  detalhesNome.textContent = mae.nome || "Mãe";
  detalhesTelefone.textContent = "tel " + (mae.telefone || "Não informado");
  detalhesMotivo.textContent = consulta.Motivo || consulta.motivo || "Não informado";

  try {
    if (consulta.Datahora?.toDate) {
      const d = consulta.Datahora.toDate();
      detalhesDataConsulta.textContent = d.toLocaleDateString();
      detalhesHoraConsulta.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (consulta.dataConsulta) {
      detalhesDataConsulta.textContent = consulta.dataConsulta;
      detalhesHoraConsulta.textContent = consulta.horaConsulta || "";
    } else {
      detalhesDataConsulta.textContent = "Não informado";
      detalhesHoraConsulta.textContent = "";
    }
  } catch (e) {
    detalhesDataConsulta.textContent = "Não informado";
    detalhesHoraConsulta.textContent = "";
  }

  detalhesStatus.textContent = consulta.status || "—";

  if (detalhesModalActions) detalhesModalActions.innerHTML = "";

  const status = (consulta.status || "").toLowerCase();

  const createBtn = (label, cls, onClick) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.className = cls;
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  };

  const fechar = createBtn("Fechar", "btn-fechar", () => hideModal(detalhesModal));

  if (status === "pendente") {
    const aceitar = createBtn("Aceitar", "btn-aceitar-modal", async () => {
      await atualizarStatus(consulta.id, "aceito");
      hideModal(detalhesModal);
    });
    const recusar = createBtn("Recusar", "btn-recusar-modal", async () => {
      await atualizarStatus(consulta.id, "negado");
      hideModal(detalhesModal);
    });
    detalhesModalActions.appendChild(recusar);
    detalhesModalActions.appendChild(aceitar);
    detalhesModalActions.appendChild(fechar);
  } else if (status === "aceito") {
    const finalizar = createBtn("Finalizar", "btn-finalizar-modal", async () => {
      await atualizarStatus(consulta.id, "realizado");
      hideModal(detalhesModal);
    });
    detalhesModalActions.appendChild(finalizar);
    detalhesModalActions.appendChild(fechar);
  } else {
    detalhesModalActions.appendChild(fechar);
  }

  showModal(detalhesModal);
}

/* -----------------------
   DELEGATION: BOTOES
   ----------------------- */
document.addEventListener("click", async (e) => {
  const aceitarBtn = e.target.closest(".btn-aceitar");
  const recusarBtn = e.target.closest(".btn-recusar");
  const finalizarBtn = e.target.closest(".btn-finalizar");
  const verBtn = e.target.closest(".btn-ver");
  const maisDetalhesBtn = e.target.closest(".btn-mais-detalhes");

  try {
    if (aceitarBtn) {
      const id = aceitarBtn.dataset.id;
      if (!id) return;
      await atualizarStatus(id, "aceito");
      filtrar("pendente");
      return;
    }
    if (recusarBtn) {
      const id = recusarBtn.dataset.id;
      if (!id) return;
      await atualizarStatus(id, "negado");
      filtrar("pendente");
      return;
    }
    if (finalizarBtn) {
      const id = finalizarBtn.dataset.id;
      if (!id) return;
      await atualizarStatus(id, "realizado");
      filtrar("aceito");
      return;
    }
    if (verBtn) {
      const id = verBtn.dataset.id;
      const consulta = consultas.find(c => c.id === id);
      if (!consulta) return;
      openDetalhesModal(consulta);
      return;
    }
    if (maisDetalhesBtn) {
      const id = maisDetalhesBtn.dataset.id;
      const consulta = consultas.find(c => c.id === id);
      if (!consulta) return;
      openDetalhesModal(consulta);
      return;
    }
  } catch (err) {
    console.error("Erro no handler de botões:", err);
    alert("Erro ao executar ação. Veja console.");
  }
});

/* -----------------------
   ATUALIZAR STATUS (Firestore)
   ----------------------- */
async function atualizarStatus(id, novoStatus) {
  try {
    await updateDoc(doc(db, "Consultas", id), { status: novoStatus });
    await carregarConsultas();
    await carregarPacientesVinculados();
    filtrar(novoStatus);
  } catch (err) {
    console.error("Erro atualizando status:", err);
    alert("Não foi possível atualizar o status.");
  }
}

/* -----------------------
   BUSCAR NOME DO PERFIL E ATUALIZAR CABEÇALHO
   ----------------------- */
async function fetchAndSetProfileName(uid) {
  try {
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.nome) {
        if (boasVindasEl) boasVindasEl.textContent = `Bem vindo(a) Dr. ${data.nome}`;
        return;
      }
    }

    const q = query(collection(db, "advogados"), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const adv = snap.docs[0].data();
      if (adv.nome && boasVindasEl) {
        boasVindasEl.textContent = `Bem vindo(a) Dr. ${adv.nome}`;
        return;
      }
    }

    const authUser = auth.currentUser;
    const fallbackName = (authUser && authUser.displayName) ? authUser.displayName : "Advogado";
    if (boasVindasEl) boasVindasEl.textContent = `Bem vindo(a) Dr. ${fallbackName}`;
  } catch (err) {
    console.error("Erro buscando nome do perfil:", err);
  }
}

/* -----------------------
   AUTH STATE (ponto único)
   ----------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "logAdv.html";
    return;
  }

  usuarioAtual = user.uid;
  await fetchAndSetProfileName(usuarioAtual);

  // carrega dados
  await carregarEventos();
  initDisponibilidade();
  await carregarArtigos();
  initForum();

  // carregar consultas REAIS do Firestore (agora controla loader/tela)
  await carregarConsultas();
  await carregarPacientesVinculados();

  // filtrar e já renderiza a sidebar (carregarConsultas já chama renderConsultasSidebar e filtrar)

  // Render dashboard appointments and stats
  renderDashboardAppointments();
  renderStats();

  // Load and render last activities (proximas consultas aceitas)
  renderLastActivities();
});

/* -----------------------
   DASHBOARD: Appointments and Stats
   ----------------------- */

function renderDashboardAppointments() {
  const container = document.getElementById("dashboard-appointments");
  if (!container) return;

  container.innerHTML = ""; // Remove loader

  // Get upcoming accepted consultations, sort by date, limit to 2
  const now = new Date();
  const upcoming = consultas
    .filter(c => c.status === "aceito" && c.Datahora?.toDate() > now)
    .sort((a, b) => a.Datahora?.toDate() - b.Datahora?.toDate())
    .slice(0, 2);

  if (upcoming.length === 0) {
    container.innerHTML = "<p>Nenhuma consulta agendada.</p>";
    return;
  }

  upcoming.forEach(c => {
    const mae = c.maeInfo || {};
    const nome = mae.nome || "Mãe";
    const data = c.Datahora.toDate();
    const dataStr = `${data.getDate()} de ${data.toLocaleString("pt-BR", { month: "long" })} de ${data.getFullYear()} às ${data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const card = document.createElement("div");
    card.className = "appointment-card";
    card.innerHTML = `
      <div>
        <strong>${nome}</strong>
        <p>${dataStr}</p>
      </div>
      <button class="contact-btn">Entrar em contato</button>
    `;
    // Optionally add click handler for contact

    container.appendChild(card);
  });
}

function renderStats() {
  const dashboardSection = document.getElementById("dashboard");
  if (!dashboardSection) return;

  const statsDiv = dashboardSection.querySelector(".stats");
  if (!statsDiv) return;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);

  const hojeAgendadas = consultas.filter(c =>
    c.status === "aceito" &&
    c.Datahora?.toDate() >= startOfDay
  ).length;

  const semanaRealizadas = consultas.filter(c =>
    c.status === "realizado" &&
    c.Datahora?.toDate() >= startOfWeek
  ).length;

  const cards = statsDiv.querySelectorAll(".stat-card");
  if (cards[0]) {
    cards[0].innerHTML = `<span>${hojeAgendadas}</span><p>Consultas agendadas hoje</p>`;
  }
  if (cards[1]) {
    cards[1].innerHTML = `<span>${semanaRealizadas}</span><p>Sessões realizadas essa semana</p>`;
  }
}

/* -----------------------
   LAST ACTIVITIES: Próximas Consultas
   ----------------------- */

function renderLastActivities() {
  const lastActivities = document.querySelector(".last-activities");
  if (!lastActivities) return;

  lastActivities.querySelector("h3").textContent = "Próximas Consultas";

  const list = lastActivities.querySelector(".last-activities-list");
  if (!list) return;

  list.innerHTML = ""; // clear loader

  const now = new Date();
  const futureAccepted = consultas
    .filter(c => c.status === "aceito" && c.Datahora?.toDate() > now)
    .sort((a, b) => a.Datahora?.toDate() - b.Datahora?.toDate())
    .slice(0, 3); // limit 3

  if (futureAccepted.length === 0) {
    list.innerHTML = "<p>Nenhuma consulta aceita futura.</p>";
    return;
  }

  const ul = document.createElement("ul");
  futureAccepted.forEach(c => {
    const date = c.Datahora.toDate();
    const li = document.createElement("li");
    li.textContent = `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    ul.appendChild(li);
  });
  list.appendChild(ul);
}

/* -----------------------
   PACIENTES VINCULADOS (advogado) — renderiza .patients-grid
   ----------------------- */

async function carregarPacientesVinculados() {
  const grid = document.querySelector(".patients-grid");
  if (!grid) return;

  // loader
  grid.innerHTML = consultasLoaderMarkup();

  try {
    if (!usuarioAtual) {
      grid.innerHTML = `<p class="empty">Usuário não autenticado.</p>`;
      return;
    }

    // pega todas as consultas onde Advogado == usuarioAtual
    const qCons = query(collection(db, "Consultas"), where("Advogado", "==", usuarioAtual));
    const snapCons = await getDocs(qCons);

    // extrai UIDs únicos das mães (campo 'Mae' nas consultas)
    const maesUids = [...new Set(snapCons.docs.map(d => d.data().Mae).filter(Boolean))];

    if (maesUids.length === 0) {
      grid.innerHTML = `<p class="empty">Nenhum paciente vinculado.</p>`;
      return;
    }

    // Busca batch de usuarios para eficiência
    const maePromises = maesUids.map(uid => getDoc(doc(db, "usuarios", uid)));
    const maeSnaps = await Promise.all(maePromises);
    const maeMap = Object.fromEntries(
      maeSnaps
        .filter(snap => snap.exists())
        .map(snap => [snap.id, snap.data()])
    );

    grid.innerHTML = ""; // limpa para renderizar

    // para cada mãe UID, usa dados em cache e renderiza card
    for (const uidMae of maesUids) {
      try {
        const mae = maeMap[uidMae] || { nome: "Usuário", avatar: "./img/avatar_usuario.png", telefone: "", cidade: "", emprego: "" };
        console.log("MAE →", uidMae, mae);

        // busca última consulta dessa mãe com este advogado (para mostrar data/hora)
        const consultasMae = snapCons.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.Mae === uidMae)
          .sort((a, b) => {
            const ta = a.Datahora?.toDate ? a.Datahora.toDate().getTime() : (a.Datahora ? new Date(a.Datahora).getTime() : 0);
            const tb = b.Datahora?.toDate ? b.Datahora.toDate().getTime() : (b.Datahora ? new Date(b.Datahora).getTime() : 0);
            return tb - ta;
          });

        let ultimaStr = "Nenhuma";
        if (consultasMae.length > 0 && consultasMae[0].Datahora) {
          const d = consultasMae[0].Datahora.toDate ? consultasMae[0].Datahora.toDate() : new Date(consultasMae[0].Datahora);
          ultimaStr = `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} • ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }

        // monta o card (markup sem variáveis inexistentes)
        const card = document.createElement("div");
        card.className = "patient-card";
        card.dataset.uid = uidMae;

        card.innerHTML = `
          <div class="patient-header">
            <img src="${mae.avatar || './img/avatar_usuario.png'}" class="patient-avatar" alt="Avatar paciente">
            <div class="patient-header-info">
              <h3 class="patient-name">${mae.nome || "Paciente"}</h3>
              <div class="patient-subinfo">
                ${mae.cidade ? `<span class="chip">${mae.cidade}</span>` : ''}
                ${mae.emprego ? `<span class="chip">${mae.emprego}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="patient-body">
            <p class="patient-notes">${(mae.sobre || mae.observacao || '').trim() || "Nenhuma informação adicional."}</p>

            <p class="patient-last">
              <strong>Última consulta</strong>
              <span class="last-value">${ultimaStr}</span>
            </p>

            <div class="patient-actions">
              <button class="contact-btn ver-perfil-btn" data-uid="${uidMae}">Ver Perfil</button>
              <button class="contact-btn open-chat-btn" data-uid="${uidMae}">Abrir chat</button>
            </div>
          </div>
        `;

        grid.appendChild(card);

      } catch (err) {
        console.warn("Erro ao montar card de paciente", uidMae, err);
      }
    }

    // delegação única (evita adicionar N listeners)
    if (!grid._boundClicks) {
      grid._boundClicks = true;
      grid.addEventListener("click", async (e) => {
        const openBtn = e.target.closest(".open-chat-btn");
        if (openBtn) {
          const uid = openBtn.dataset.uid;
          if (!uid) return;
          try {
            const maeSnap = await getDoc(doc(db, "usuarios", uid));
            const dadosMae = maeSnap.exists() ? maeSnap.data() : { nome: "Usuário", avatar: "./img/avatar_usuario.png" };
            abrirChatInternoAdv(uid, dadosMae);

            // troca para a section de chats
            document.querySelectorAll(".content").forEach(c => c.classList.add("hidden"));
            const chatsSection = document.getElementById("chats");
            if (chatsSection) chatsSection.classList.remove("hidden");
            document.querySelectorAll(".menu-btn").forEach(b => b.classList.toggle("active", b.getAttribute("data-target") === "chats"));
            carregarChatsAdv().catch(err => console.warn("carregarChatsAdv erro:", err));
          } catch (err) {
            console.error("Erro ao abrir chat do paciente:", err);
            alert("Não foi possível abrir o chat. Veja o console.");
          }
        }

        const perfilBtn = e.target.closest(".ver-perfil-btn");
        if (perfilBtn) {
          const uid = perfilBtn.dataset.uid;
          if (!uid) return;
          abrirPerfilPaciente(uid);
        }
      });
    }

  } catch (err) {
    console.error("Erro ao carregar pacientes vinculados:", err);
    grid.innerHTML = `<p class="empty">Erro ao carregar pacientes.</p>`;
  }
}


// Abrir modal de perfil
async function abrirPerfilPaciente(uid) {
  const docRef = doc(db, "usuarios", uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const dados = snap.data();

  // garante que o modal exista no HTML (ver instrução de HTML abaixo)
  const modal = document.getElementById("perfilPacienteModal");
  if (!modal) {
    console.warn("perfilPacienteModal não encontrado no DOM. Adicione o HTML do modal conforme instruções.");
    return;
  }

  document.getElementById("perfilPacienteAvatar").src = dados.avatar || "./img/account_icon.png";
  document.getElementById("perfilPacienteNome").textContent = dados.nome || "Paciente";
  document.getElementById("perfilPacienteEmail").textContent = dados.email || "Não informado";
  document.getElementById("perfilPacienteTelefone").textContent = dados.telefone || "Não informado";
  document.getElementById("perfilPacienteSobre").textContent = dados.sobre || "Nenhuma informação disponível.";

  showModal(modal);
}


document.getElementById("closePerfilPaciente").onclick = () => {
  const modal = document.getElementById("perfilPacienteModal");
  hideModal(modal);
};

// Clicar fora fecha
document.getElementById("perfilPacienteModal").onclick = (e) => {
  if (e.target.id === "perfilPacienteModal") {
    e.target.classList.add("hidden");
  }
};

// Ativar cliques no botão "Ver perfil"
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("ver-perfil-btn")) {
    const uid = e.target.getAttribute("data-uid");
    abrirPerfilPaciente(uid);
  }
});

/* ===========================
   CHAT DO ADVOGADO (adaptado de homePsi)
   Mostra somente usuários que têm vínculo via Consultas (Advogado == user.uid)
   =========================== */

let currentChatUserAdv = null;
let unsubscribeMessagesAdv = null;
let currentChatIdAdv = null;
let mediaRecorderAdv = null;
let audioChunksAdv = [];

// 1) carregar lista de usuários (mães) vinculadas por Consultas onde Advogado == user.uid
async function carregarChatsAdv() {
  const listEl = document.getElementById("chatUsersList");
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="loader">
      <div class="dot"></div><div class="dot"></div><div class="dot"></div>
    </div>
  `;

  const user = auth.currentUser;
  if (!user) return;

  try {
    // pega consultas do advogado
    const q = query(collection(db, "Consultas"), where("Advogado", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = "<p>Nenhum paciente encontrado.</p>";
      return;
    }

    // lista única de UIDs das mães
    const maes = [...new Set(snap.docs.map(d => d.data().Mae))];

    listEl.innerHTML = "";

    for (const uidMae of maes) {
      if (!uidMae) continue;
      const ref = doc(db, "usuarios", uidMae);
      const snapMae = await getDoc(ref);
      if (!snapMae.exists()) continue;
      const dados = snapMae.data();

      const card = document.createElement("div");
      card.classList.add("chat-user-card");
      card.dataset.uid = uidMae;

      card.innerHTML = `
        <img src="${dados.avatar || './img/account_icon.png'}">
        <div class="chat-user-info">
          <strong>${dados.nome}</strong>
          <span>${dados.email || ''}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        abrirChatInternoAdv(uidMae, dados);
      });

      listEl.appendChild(card);
    }

  } catch (err) {
    console.error("Erro ao carregar chats (Adv):", err);
    listEl.innerHTML = "<p>Erro ao carregar chats.</p>";
  }
}

// 2) abrir chat interno (cria doc se necessário) e carregar mensagens
async function abrirChatInternoAdv(uidMae, dadosMae) {
  currentChatUserAdv = uidMae;

  // mostrar avatar e título corretamente
  const avatarEl = document.getElementById("chatAvatarAdv");
  const titleEl = document.getElementById("chatTitleAdv");
  const messageForm = document.getElementById("messageFormAdv");
  const backBtn = document.getElementById("backBtnAdv");

  if (avatarEl) {
    avatarEl.src = dadosMae.avatar || "./img/account_icon.png";
    avatarEl.classList.remove("hidden");
  }
  if (titleEl) {
    titleEl.textContent = "Chat com " + (dadosMae.nome || "Usuário");
  }
  if (messageForm) messageForm.classList.remove("hidden");
  if (backBtn) backBtn.classList.remove("hidden");

  // para mobile: mostra a área de chat principal
  const chatMain = document.querySelector(".chat-main");
  if (chatMain) chatMain.classList.add("active");

  // encontrar chat (onde o advogado atual é participante e o outro participante é a mãe)
  const user = auth.currentUser;
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participantes", "array-contains", user.uid));
  const snap = await getDocs(q);
  let chatDoc = null;
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (Array.isArray(data.participantes) && data.participantes.includes(uidMae)) {
      chatDoc = { id: docSnap.id, ...data };
    }
  });

  if (!chatDoc) {
    const newChatRef = await addDoc(chatsRef, {
      participantes: [user.uid, uidMae],
      criadoEm: serverTimestamp(),
      ultimoMensagem: "",
      ultimoEnviadoPor: ""
    });
    chatDoc = { id: newChatRef.id, participantes: [user.uid, uidMae] };
  }

  currentChatIdAdv = chatDoc.id;
  carregarMensagensAdv(chatDoc.id, uidMae);
}


// 3) ouvir mensagens em tempo real e renderizar
function carregarMensagensAdv(chatId) {
  const user = auth.currentUser;
  const messagesEl = document.getElementById("messagesAdv");
  messagesEl.innerHTML = "";

  if (unsubscribeMessagesAdv) unsubscribeMessagesAdv();

  const msgsRef = collection(db, "chats", chatId, "mensagens");
  const q = query(msgsRef, orderBy("enviadoEm", "asc"));

  unsubscribeMessagesAdv = onSnapshot(q, snap => {
    messagesEl.innerHTML = "";

    snap.forEach(msg => {
      const m = msg.data();
      const div = document.createElement("div");
      div.className = m.enviadoPor === user.uid ? "msg msg-enviada" : "msg msg-recebida";

      let conteudo = "";

      if (m.audio && typeof m.audio === "string" && m.audio.startsWith("data:audio")) {
        conteudo = `
          <audio controls style="width:100%; margin-top:5px;">
            <source src="${m.audio}">
            Seu navegador não suporta áudio.
          </audio>
        `;
      } else {
        conteudo = `<div class="text">${m.texto || ''}</div>`;
      }

      const meta = `<div class="meta">${m.enviadoEm?.toDate ? new Date(m.enviadoEm.toDate()).toLocaleString() : ''}</div>`;

      div.innerHTML = conteudo + meta;
      messagesEl.appendChild(div);
    });

    // scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// 4) enviar mensagem de texto (form submit)
document.addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "messageFormAdv") {
    e.preventDefault();
    const input = document.getElementById("messageInputAdv");
    const texto = input.value.trim();
    if (!texto || !currentChatIdAdv) return;

    try {
      const msgRef = collection(db, "chats", currentChatIdAdv, "mensagens");
      await addDoc(msgRef, {
        texto,
        enviadoPor: auth.currentUser.uid,
        enviadoEm: serverTimestamp(),
        lido: false
      });

      // atualiza meta do chat
      await updateDoc(doc(db, "chats", currentChatIdAdv), {
        ultimoMensagem: texto,
        ultimoEnviadoPor: auth.currentUser.uid,
        ultimaAtualizacao: serverTimestamp()
      }, { merge: true });

      input.value = "";
    } catch (err) {
      console.error("Erro ao enviar mensagem (Adv):", err);
      alert("Erro ao enviar mensagem.");
    }
  }
});

// 5) gravação de áudio (opcional, espelha homePsi)
const voiceBtnAdv = document.getElementById("voiceBtnAdv");
if (voiceBtnAdv) {
  voiceBtnAdv.addEventListener("click", async () => {
    if (!currentChatIdAdv) return alert("Abra um chat antes de gravar.");

    // iniciar gravação
    if (!mediaRecorderAdv || mediaRecorderAdv.state === "inactive") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderAdv = new MediaRecorder(stream);
        audioChunksAdv = [];

        mediaRecorderAdv.ondataavailable = e => audioChunksAdv.push(e.data);

        mediaRecorderAdv.onstop = async () => {
          const audioBlob = new Blob(audioChunksAdv, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Audio = reader.result;
            try {
              const msgRef = collection(db, "chats", currentChatIdAdv, "mensagens");
              await addDoc(msgRef, {
                audio: base64Audio,
                texto: "",
                enviadoPor: auth.currentUser.uid,
                enviadoEm: serverTimestamp(),
                lido: false
              });

              await updateDoc(doc(db, "chats", currentChatIdAdv), {
                ultimoMensagem: "[Áudio]",
                ultimoEnviadoPor: auth.currentUser.uid,
                ultimaAtualizacao: serverTimestamp()
              }, { merge: true });

            } catch (err) {
              console.error("Erro ao enviar áudio (Adv):", err);
              alert("Erro ao enviar áudio.");
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorderAdv.start();
        voiceBtnAdv.classList.add("recording");
      } catch (err) {
        alert("Não foi possível acessar o microfone.");
        console.error(err);
      }
      return;
    }

    // parar gravação
    if (mediaRecorderAdv.state === "recording") {
      mediaRecorderAdv.stop();
      voiceBtnAdv.classList.remove("recording");
    }
  });
}

// 6) mobilidade: botão voltar (apenas para UX em telas pequenas)
const backBtnAdv = document.getElementById("backBtnAdv");
if (backBtnAdv) {
  backBtnAdv.addEventListener("click", () => {
    // mostra a lista novamente (para mobile behavior pode-se controlar classes)
    document.querySelector(".chat-main")?.classList.remove("active");
    document.querySelector(".chat-sidebar")?.classList.remove("hidden");
  });
}

// 7) Integração com menu: quando o usuário clicar no menu 'chats', carregamos
//    (adapte se sua função initMenuButtons estiver noutro lugar)
(function patchMenuForChats() {
  const buttons = document.querySelectorAll(".menu-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (target === "chats") {
        // carregar chats só quando abrir a aba
        carregarChatsAdv().catch(err => console.error("carregarChatsAdv erro:", err));
      }
      if (target === "pacientes") {
        // carregar pacientes vinculados só quando abrir a aba
        carregarPacientesVinculados().catch(err => console.error("carregarPacientesVinculados erro:", err));
      }
    });
  });
})();
