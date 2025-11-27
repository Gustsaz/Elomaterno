import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc,
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


let eventosPsi = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "logPsi.html";
});

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".menu-btn");
  const contents = document.querySelectorAll(".content");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.getAttribute("data-target");
      contents.forEach((c) => c.classList.toggle("hidden", c.id !== target));

      if (target === "agenda") carregarEventos();
      if (target === "chats") carregarChatsPsi();
      if (target === "pacientes") carregarPacientes();

    });
  });

});

function carregarEventos() {
  eventosPsi = [
    {
      titulo: "Sessão de Terapia em Grupo",
      descricao: "Atividade de apoio coletivo para mães.",
      local: "Sala 2 - Online",
      data: new Date(2025, 10, 12, 10, 0),
    },
    {
      titulo: "Palestra sobre Ansiedade Pós-Parto",
      descricao: "Encontro aberto sobre saúde mental materna.",
      local: "Auditório EloMaterno",
      data: new Date(2025, 10, 15, 14, 0),
    },
  ];

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
    for (let y = year - 1; y <= year + 2; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
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

window.prevMonth = () => {
  currentMonth = (currentMonth - 1 + 12) % 12;
  if (currentMonth === 11) currentYear--;
  atualizarSelects();
};
window.nextMonth = () => {
  currentMonth = (currentMonth + 1) % 12;
  if (currentMonth === 0) currentYear++;
  atualizarSelects();
};
window.onMonthChange = () => {
  const el = document.getElementById("month-select");
  if (el) currentMonth = parseInt(el.value);
  renderCalendar();
};
window.onYearChange = () => {
  const el = document.getElementById("year-select");
  if (el) currentYear = parseInt(el.value);
  renderCalendar();
};

async function renderCalendar() {
  const calendarDates = document.getElementById("calendarDates");
  if (!calendarDates) return;

  const today = new Date();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  calendarDates.innerHTML = "";

  // Render dias vazios no início do mês
  for (let i = 0; i < firstDay; i++) {
    calendarDates.appendChild(document.createElement("div"));
  }

  // Render cada dia
  for (let d = 1; d <= daysInMonth; d++) {
    const div = document.createElement("div");
    div.classList.add("date");
    div.textContent = d;

    const current = new Date(currentYear, currentMonth, d);
    if (current.toDateString() === today.toDateString()) {
      div.classList.add("today");
    }

    calendarDates.appendChild(div);
  }

  // 🔹 Depois de renderizar o calendário, marcar dias com disponibilidade do Firebase
  await marcarDiasComDisponibilidade();
}

async function marcarDiasComDisponibilidade() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const q = query(collection(db, "psicologos"), where("uid", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) return;

    const data = snap.docs[0].data();
    const disponibilidade = data.disponibilidade || [];

    // Filtra horários dentro do mês atual
    const diasComHorarios = new Set();
    disponibilidade.forEach((t) => {
      const d = t.toDate();
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        diasComHorarios.add(d.getDate());
      }
    });

    // Adiciona a classe "has-event" aos dias que têm horários salvos
    document.querySelectorAll("#calendarDates .date").forEach((div) => {
      const dia = parseInt(div.textContent);
      if (diasComHorarios.has(dia)) {
        div.classList.add("has-event");
      }
    });
  } catch (err) {
    console.error("Erro ao marcar dias com disponibilidade:", err);
  }
}

function renderListaEventos() {
  const list = document.querySelector("#calendario .event-list");
  if (!list) return;
  list.innerHTML = "";
  eventosPsi
    .sort((a, b) => a.data - b.data)
    .forEach((ev) => {
      const div = document.createElement("div");
      div.classList.add("event");
      div.innerHTML = `<strong>${ev.data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })} • ${ev.titulo}</strong>
    <p>${ev.descricao}</p><small>${ev.local}</small>`;
      list.appendChild(div);
    });
}

/* ================================
   SEÇÃO DE CONSULTAS
================================ */

const lista = document.getElementById("consultas-list");
const tituloConsultas = document.getElementById("titulo-consultas");
const abas = document.querySelectorAll(".tab-btn");

let consultasCache = [];
let statusAtual = "pendente";

// Trocar abas
abas.forEach(btn => {
  btn.addEventListener("click", () => {
    abas.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    statusAtual = btn.dataset.status;
    renderizarConsultas();
  });
});

// Ouvir consultas em tempo real
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const q = query(collection(db, "Consultas"), where("Psicologo", "==", user.uid));

  onSnapshot(q, async (snapshot) => {
    const consultasTemp = [];

    for (const docSnap of snapshot.docs) {
      const consulta = { id: docSnap.id, ...docSnap.data() };

      // Buscar nome da mãe
      try {
        const maeRef = doc(db, "usuarios", consulta.Mae);
        const maeSnap = await getDoc(maeRef);

        consulta.maeNome = maeSnap.exists() ? maeSnap.data().nome : "Mãe não encontrada";

      } catch (e) {
        consulta.maeNome = "Erro ao carregar mãe";
      }

      consultasTemp.push(consulta);
    }

    consultasCache = consultasTemp;
    renderizarConsultas();
  });
});

async function carregarUltimasAtividades() {
  const user = auth.currentUser;
  if (!user) return;

  const ul = document.querySelector(".last-activities ul");
  if (!ul) return;

  ul.innerHTML = "<div class='loader'><div class='dot'></div><div class='dot'></div><div class='dot'></div></div>";

  const q = query(
    collection(db, "Consultas"),
    where("Psicologo", "==", user.uid)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    ul.innerHTML = "<li>Nenhuma atividade encontrada.</li>";
    return;
  }

  const consultas = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const agora = new Date();

  // 🔹 Última concluída
  const concluidas = consultas
    .filter(c => c.status === "realizado" && c.Datahora)
    .sort((a, b) => b.Datahora.toDate() - a.Datahora.toDate());

  const ultimaConcluida = concluidas.sort((a, b) => b.Datahora.toDate() - a.Datahora.toDate())[0];

  // 🔹 Próxima agendada
  const futuras = consultas
    .filter(c => c.status === "aceito" && c.Datahora?.toDate() > agora)
    .sort((a, b) => a.Datahora.toDate() - b.Datahora.toDate());

  const proxima = futuras[0];

  ul.innerHTML = "";

  ul.innerHTML += ultimaConcluida
    ? `<li>Consulta concluída - ${ultimaConcluida.Datahora.toDate().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</li>`
    : `<li>Nenhuma consulta concluída ainda</li>`;

  ul.innerHTML += proxima
    ? `<li>Nova consulta - ${proxima.Datahora.toDate().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</li>`
    : `<li>Sem próximas consultas</li>`;
}

onAuthStateChanged(auth, () => {
  carregarUltimasAtividades();
});

async function atualizarStatsPainel() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "psicologos"), where("uid", "==", user.uid));
  const snap = await getDocs(q);

  if (snap.empty) return;

  const data = snap.docs[0].data();

  const agendados = (data.agendados || []).map(t => t.toDate());

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const hojeCount = agendados.filter(d => {
    const dataLimpa = new Date(d);
    dataLimpa.setHours(0, 0, 0, 0);
    return dataLimpa.getTime() === hoje.getTime();
  }).length;

  const totalCount = agendados.length;

  document.querySelector("#dashboard .stat-card:nth-child(1) span").textContent =
    hojeCount;

  document.querySelector("#dashboard .stat-card:nth-child(2) span").textContent =
    totalCount;
}

onAuthStateChanged(auth, () => {
  atualizarStatsPainel();
});

// Renderiza de acordo com a aba selecionada
function renderizarConsultas() {
  lista.innerHTML = "";

  const filtradas = consultasCache.filter((c) => c.status === statusAtual);

  tituloConsultas.textContent =
    statusAtual === "pendente" ? "Consultas Pendentes" :
      statusAtual === "aceito" ? "Consultas Agendadas" :
        statusAtual === "realizado" ? "Consultas Realizadas" :
          "Consultas Negadas";

  if (filtradas.length === 0) {
    lista.innerHTML = `<p>Nenhuma consulta encontrada.</p>`;
    return;
  }

  filtradas.forEach((consulta) => {
    const card = document.createElement("div");
    card.className = "consulta-card";

    card.innerHTML = `
      <div class="consulta-info">
        <img src="./img/account_icon.png">
        <div class="consulta-detalhes">
          <h3>${consulta.maeNome}</h3>
          <p>${consulta.Datahora?.toDate
        ? consulta.Datahora.toDate().toLocaleString("pt-BR")
        : "Data não definida"
      }</p>
          <p><strong>Motivo:</strong> ${consulta.Motivo}</p>
        </div>
      </div>

      <div class="consulta-actions">
        ${statusAtual === "pendente"
        ? `
                <button class="btn-aceitar">Aceitar</button>
                <button class="btn-recusar">Recusar</button>
              `
        : statusAtual === "aceito"
          ? `<button class="btn-finalizar">Finalizar</button>`
          : `<button class="btn-ver">Ver</button>`
      }
      </div>
    `;

    // Aceitar
    card.querySelector(".btn-aceitar")?.addEventListener("click", () => {
      atualizarStatus(consulta.id, "aceito");
    });

    // Recusar
    card.querySelector(".btn-recusar")?.addEventListener("click", () => {
      atualizarStatus(consulta.id, "negado");
    });

    // Finalizar
    card.querySelector(".btn-finalizar")?.addEventListener("click", () => {
      atualizarStatus(consulta.id, "realizado");
    });

    lista.appendChild(card);
  });
}

// Atualiza status no Firebase
// Atualiza status no Firebase (substitua pela versão abaixo)
async function atualizarStatus(id, novoStatus) {
  try {
    const consultaRef = doc(db, "Consultas", id);

    // busca dados atuais da consulta (precisamos do Datahora e do Psicologo)
    const consultaSnap = await getDoc(consultaRef);
    if (!consultaSnap.exists()) {
      console.warn("Consulta não encontrada ao atualizar status:", id);
      // tenta apenas atualizar o status mesmo assim
      await updateDoc(consultaRef, { status: novoStatus });
      return;
    }

    const consultaData = consultaSnap.data();

    // 1) atualiza o status da consulta
    await updateDoc(consultaRef, { status: novoStatus });

    // 2) se a consulta foi finalizada ou negada, devolver horário ao array 'disponibilidade'
    if (novoStatus === "realizado" || novoStatus === "negado") {
      const psicologoId = consultaData.Psicologo;
      const datahora = consultaData.Datahora; // deve ser um Timestamp

      if (psicologoId && datahora) {
        try {
          const snapPsi = await getDocs(
            query(collection(db, "psicologos"), where("uid", "==", psicologoId))
          );

          if (snapPsi.empty) {
            console.error("Psicólogo não encontrado!");
            return;
          }

          const psiRef = doc(db, "psicologos", snapPsi.docs[0].id);

          // remove dos agendados e adiciona em disponibilidade
          // (arrayRemove/arrayUnion tratam objetos Timestamp corretamente)
          await updateDoc(psiRef, {
            agendados: arrayRemove(datahora),
            disponibilidade: arrayUnion(datahora),
          });

          console.log(
            `Horário ${datahora?.toDate?.().toISOString?.() || datahora} movido de agendados → disponibilidade para psicólogo ${psicologoId}`
          );
        } catch (err) {
          console.error("Erro ao mover horário entre arrays do psicólogo:", err);
        }
      } else {
        console.warn("Consulta não possui Psicologo ou Datahora válidos:", consultaData);
      }
    }

  } catch (e) {
    console.error("Erro ao atualizar status:", e);
  }
}

function initForum() {
  const postsList = document.getElementById("posts-list");
  const modal = document.getElementById("modal-post");
  const form = document.getElementById("form-post");
  const cancelar = document.getElementById("cancelar-post");
  const closeModal = document.getElementById("close-post-modal");
  const addBtn = document.getElementById("nova-post-btn");

  // Carrega posts sem exigir login
  const q = query(collection(db, "posts"), orderBy("data", "desc"));
  onSnapshot(q, (snap) => {
    postsList.innerHTML = "";
    snap.forEach((docSnap) => {
      const post = docSnap.data();
      const id = docSnap.id;
      const data = post.data?.toDate
        ? post.data.toDate().toLocaleString("pt-BR")
        : "";
      const div = document.createElement("div");
      div.className = "post-card com-brilho";
      div.dataset.id = id;
      div.innerHTML = `
        <h3 class="post-title">${post.titulo}</h3>
        <div class="post-meta">
          <img src="${post.autorFoto || "./img/account_icon.png"
        }" class="author-avatar">
          <div><span class="author-name">${post.autorNome
        }</span><span class="post-date">${data}</span></div>
        </div>
        <p class="post-content">${post.conteudo}</p>
        <div class="like-wrap" data-id="${id}">
          <img src="./img/like_icon.png" class="like-icon">
          <span class="like-count">${post.likes || 0}</span>
        </div>`;
      postsList.appendChild(div);
    });

    document.querySelectorAll(".like-wrap").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.id;
        const ref = doc(db, "posts", postId);
        await updateDoc(ref, { likes: increment(1) });
      });
    });
  });

  addBtn?.addEventListener("click", () => modal.classList.remove("hidden"));
  cancelar?.addEventListener("click", () => modal.classList.add("hidden"));
  closeModal?.addEventListener("click", () => modal.classList.add("hidden"));

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = document.getElementById("titulo").value.trim();
    const conteudo = document.getElementById("conteudo").value.trim();
    if (!titulo || !conteudo) return alert("Preencha todos os campos");

    const user = auth.currentUser || {
      uid: "anon",
      displayName: "Visitante",
      photoURL: "",
    };
    const newPost = {
      autorId: user.uid,
      autorNome: "Dra. " + (user.displayName || "Psicóloga"),
      autorFoto: user.photoURL || "./img/account_icon.png",
      titulo,
      conteudo,
      likes: 0,
      data: serverTimestamp(),
    };
    await addDoc(collection(db, "posts"), newPost);
    form.reset();
    modal.classList.add("hidden");
  });
}

async function carregarArtigos() {
  const sec = document.getElementById("artigos");
  if (!sec) return;
  sec.innerHTML = `<h2>Artigos Recentes</h2><div class="articles-grid"></div>`;
  const grid = sec.querySelector(".articles-grid");
  try {
    const snap = await getDocs(collection(db, "artigos"));
    const artigos = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const dataPost = data.datahorapost?.toDate
        ? data.datahorapost.toDate()
        : null;
      artigos.push({
        id: docSnap.id,
        ...data,
        datahorapost: dataPost,
      });
    });
    artigos.sort((a, b) => b.datahorapost - a.datahorapost);
    artigos.forEach((art) => {
      const card = document.createElement("div");
      card.className = "article-card";
      const dataStr = art.datahorapost
        ? `<span class="article-meta">${art.datahorapost.toLocaleDateString(
          "pt-BR",
          { day: "2-digit", month: "short" }
        )} • ${art.postadoPor}</span>`
        : "";
      card.innerHTML = `
        <img src="${art.img}" alt="Imagem artigo" class="article-img">
        <div class="article-body">
          <h3>${art.titulo}</h3>
          ${dataStr}
          <p>${art.descricao}</p>
          <a class="saiba-mais" href="./artigo_ind.html?id=${art.id}">Saiba mais…</a>
        </div>`;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Erro ao carregar artigos:", err);
    sec.innerHTML = "<p>Não foi possível carregar artigos.</p>";
  }
}

(async () => {
  // Carregar tudo sem redirecionar
  await carregarEventos();
  await carregarArtigos();
  initForum();
})();

// --- substitua daqui para baixo ---
import {
  setDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const infoBtn = document.getElementById("infoBtn");
  const buttons = document.querySelectorAll(".menu-btn");
  const contents = document.querySelectorAll(".content");
  const psiForm = document.getElementById("psiForm");

  // ✅ Botão de informações — abre a aba "informações" e carrega os dados
  infoBtn?.addEventListener("click", async () => {
    buttons.forEach((b) => b.classList.remove("active"));
    contents.forEach((c) => c.classList.add("hidden"));

    const infoSection = document.getElementById("informacoes");
    if (infoSection) infoSection.classList.remove("hidden");

    const user = auth.currentUser;
    if (user) await carregarInformacoesPsi(user);
    else {
      onAuthStateChanged(auth, async (u) => {
        if (u) await carregarInformacoesPsi(u);
      });
    }
  });

  // ✅ Exibir nome no header
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const q = query(collection(db, "psicologos"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          const nome = data.nome?.split(" ")[0] || "Psicólogo";
          const headerTitle = document.querySelector("header h1");
          if (headerTitle)
            headerTitle.textContent = `Bem-vindo(a), Dr. ${nome}`;
        }
      } catch (err) {
        console.error("Erro ao carregar nome do psicólogo:", err);
      }
    }
  });

  // ✅ Função que carrega dados atuais do psicólogo
  async function carregarInformacoesPsi(user) {
    try {
      const q = query(collection(db, "psicologos"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      if (snap.empty) return alert("Psicólogo não encontrado.");

      const data = snap.docs[0].data();

      document.getElementById("psiNome").value = data.nome || "";
      document.getElementById("psiEmail").value = data.email || "";
      document.getElementById("psiCRP").value = data.crp || "";
      document.getElementById("psiArea").value = data.area || "";
      document.getElementById("psiEspecializacoes").value = (data.especializacoes || []).join(", ");

      // Desabilita o botão de editar do CRP
      const crpBtn = document.querySelector('.edit-btn[data-field="crp"]');
      if (crpBtn) crpBtn.style.display = "none";
    } catch (err) {
      console.error("Erro ao carregar informações:", err);
    }
  }

  // ✅ Edição individual de campos
  document.addEventListener("click", async (e) => {
    if (e.target.closest(".edit-btn")) {
      const btn = e.target.closest(".edit-btn");
      const field = btn.dataset.field;
      const input = document.getElementById(
        "psi" + field.charAt(0).toUpperCase() + field.slice(1)
      );

      if (field === "crp") return; // 🔒 bloqueia edição do CRP

      if (input.disabled) {
        input.disabled = false;
        input.focus();
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      } else {
        input.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-pen"></i>';

        const user = auth.currentUser;
        if (!user) return alert("Usuário não autenticado.");

        const q = query(collection(db, "psicologos"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (snap.empty) return alert("Erro: psicólogo não encontrado.");

        const ref = snap.docs[0].ref;
        let value = input.value.trim();

        if (field === "especializacoes") {
          value = value.split(",").map((s) => s.trim()).filter(Boolean);
        }

        try {
          await updateDoc(ref, { [field]: value });
          alert(`Campo "${field}" atualizado com sucesso!`);
        } catch (err) {
          console.error("Erro ao atualizar campo:", err);
          alert("Erro ao atualizar. Verifique o console.");
        }
      }
    }
  });
});


psiForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return alert("Usuário não autenticado.");

  const ref = doc(db, "psicologos", user.uid);

  const especializacoes = document
    .getElementById("psiEspecializacoes")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await setDoc(
    ref,
    {
      nome: document.getElementById("psiNome").value,
      email: document.getElementById("psiEmail").value,
      crp: document.getElementById("psiCRP").value,
      area: document.getElementById("psiArea").value,
      especializacoes,
      notas: [],
      consultas: [],
      tipo: "psicologo",
      status: "aprovado",
    },
    { merge: true }
  );

  alert("Informações atualizadas com sucesso!");
});

// --- fim da substituição ---

// ========== SISTEMA DE DISPONIBILIDADE AUTOMÁTICA ==========
import { Timestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ========== nova initDisponibilidade() (substituir a antiga) ==========
function initDisponibilidade() {
  try {
    const calendar = document.getElementById("calendarDates");
    if (!calendar) return;

    // cria o modal apenas 1 vez
    const modal = document.createElement("div");
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-content detalhes-consulta-card">
        <h3>Selecionar horários disponíveis</h3>
        <p id="dataSelecionada" style="font-weight:bold; margin-top: 10px;"></p>
        <div id="horariosContainer" class="horarios-container"></div>
        <div class="modal-actions">
          <button id="confirmarDisponibilidade" class="contact-btn">Confirmar</button>
          <button id="cancelarDisponibilidade" class="add-consult-btn">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const horariosPadrao = [
      "08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    ];

    // estilo adicional (mantive seu estilo)
    const style = document.createElement("style");
    style.textContent = `
      .horario-btn.ocupado { background: #ccc !important; color: #777 !important; border-color: #aaa !important; cursor: not-allowed !important; }
      .horario-btn.ocupado:hover { background: #ccc !important; }
    `;
    document.head.appendChild(style);

    // helper: exibe modal imediatamente com estilo inline
    function showModal() {
      modal.classList.remove("hidden");
      modal.style.display = "flex";
      try { window.modalManager?.adoptOne?.(modal); } catch (e) {}
    }
    function hideModal() {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }

    // cache simples do doc do psicólogo
    async function getPsiDocCached() {
      if (window.__psiCache) return window.__psiCache;
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");
      const q = query(collection(db, "psicologos"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Psicólogo não encontrado");
      const docSnap = snap.docs[0];
      window.__psiCache = { id: docSnap.id, data: docSnap.data() };
      return window.__psiCache;
    }

    calendar.addEventListener("click", async (e) => {
      const diaText = (e.target && e.target.textContent) ? e.target.textContent.trim() : "";
      if (!diaText || isNaN(diaText)) return;

      const diaNum = parseInt(diaText, 10);
      const dataClicada = new Date(currentYear, currentMonth, diaNum);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (dataClicada < hoje) {
        alert("Você não pode selecionar datas anteriores a hoje.");
        return;
      }

      // mostra modal imediatamente para evitar sensação de travamento
      showModal();
      document.getElementById("dataSelecionada").textContent =
        dataClicada.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

      const container = document.getElementById("horariosContainer");
      container.innerHTML = `<div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;

      const user = auth.currentUser;
      if (!user) {
        alert("Usuário não autenticado.");
        hideModal();
        return;
      }

      try {
        // pega doc do psicólogo (cache)
        const { id: psiDocId, data: psiData } = await getPsiDocCached();

        // constroi intervalo do dia (start <= Datahora < end)
        const startOfDay = new Date(dataClicada);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const startTS = Timestamp.fromDate(startOfDay);
        const endTS = Timestamp.fromDate(endOfDay);

        // consulta APENAS as consultas do dia (muito mais leve)
        const consultasQ = query(
          collection(db, "Consultas"),
          where("Psicologo", "==", user.uid),
          where("Datahora", ">=", startTS),
          where("Datahora", "<", endTS)
        );

        let consultasSnap;
        try {
          consultasSnap = await getDocs(consultasQ);
        } catch (qErr) {
          // se Firestore pedir índice composto, mostra aviso no console (link aparece no erro)
          console.error("Erro na query de consultas (verifique se precisa criar índice):", qErr);
          throw qErr;
        }

        const dataDiaStr = dataClicada.toDateString();
        const toHorario = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

        const horariosMarcados = {};
        const maesToLoad = new Set();

        consultasSnap.forEach(docSnap => {
          const c = docSnap.data();
          if (!c.Datahora) return;
          const d = c.Datahora.toDate();
          if (d.toDateString() !== dataDiaStr) return;
          const horario = toHorario(d);
          horariosMarcados[horario] = { status: c.status || "pendente", maeId: c.Mae };
          if (c.Mae) maesToLoad.add(c.Mae);
        });

        // agendados + disponibilidade atual (do psiData) para bloquear horários
        const horariosOcupados = new Set();
        (psiData.agendados || []).map(t => (t.toDate ? t.toDate() : new Date(t))).forEach(d => {
          if (d.toDateString() === dataDiaStr) horariosOcupados.add(toHorario(d));
        });
        (psiData.disponibilidade || []).map(t => (t.toDate ? t.toDate() : new Date(t))).forEach(d => {
          if (d.toDateString() === dataDiaStr) horariosOcupados.add(toHorario(d));
        });

        // buscar nomes das mães em paralelo (apenas as do dia)
        const maeIdList = Array.from(maesToLoad);
        const maesMap = {};
        if (maeIdList.length > 0) {
          const maePromises = maeIdList.map(id => getDoc(doc(db, "usuarios", id)).then(s => ({ id, snap: s })));
          const maesSnaps = await Promise.all(maePromises);
          maesSnaps.forEach(({ id, snap }) => {
            maesMap[id] = snap.exists() ? (snap.data().nome || "Paciente") : "Paciente";
          });
        }

        // renderiza botões
        container.innerHTML = "";
        horariosPadrao.forEach(h => {
          const btn = document.createElement("button");
          btn.textContent = h;
          btn.className = "horario-btn";

          if (horariosMarcados[h]) {
            const info = horariosMarcados[h];
            btn.title = maesMap[info.maeId] || "Paciente";
            if (info.status === "realizado") {
              btn.classList.add("finalizadobtn");
              btn.disabled = true;
            } else if (info.status === "aceito") {
              btn.classList.add("ocupado");
              btn.disabled = true;
            } else {
              btn.addEventListener("click", () => btn.classList.toggle("selecionado"));
            }
          } else if (horariosOcupados.has(h)) {
            btn.classList.add("ocupado");
            btn.disabled = true;
          } else {
            btn.addEventListener("click", () => btn.classList.toggle("selecionado"));
          }

          container.appendChild(btn);
        });

        // confirmar seleção
        document.getElementById("confirmarDisponibilidade").onclick = async () => {
          const selecionados = Array.from(container.querySelectorAll(".selecionado")).map(b => b.textContent);
          if (selecionados.length === 0) {
            alert("Selecione pelo menos um horário.");
            return;
          }

          const novosTimestamps = selecionados.map(h => {
            const [hr, min] = h.split(":").map(Number);
            const dataFinal = new Date(dataClicada.getFullYear(), dataClicada.getMonth(), dataClicada.getDate(), hr, min, 0, 0);
            return Timestamp.fromDate(dataFinal);
          });

          try {
            const psiDocRef = doc(db, "psicologos", psiDocId);
            const atuais = psiData.disponibilidade || [];
            const atuaisMs = new Set(atuais.map(t => (t.toMillis ? t.toMillis() : (t.seconds * 1000))));
            const novosUnicos = novosTimestamps.filter(t => !atuaisMs.has(t.toMillis()));

            if (novosUnicos.length === 0) {
              alert("Todos os horários selecionados já estão disponíveis.");
              hideModal();
              return;
            }

            await updateDoc(psiDocRef, { disponibilidade: arrayUnion(...novosUnicos) });

            // atualizar cache local (opcional)
            window.__psiCache = window.__psiCache || { id: psiDocId, data: psiData };
            window.__psiCache.data.disponibilidade = [...(psiData.disponibilidade || []), ...novosUnicos];

            alert("Disponibilidade atualizada com sucesso!");
            hideModal();
            marcarDiasComDisponibilidade().catch(() => {});
          } catch (err) {
            console.error("Erro ao salvar disponibilidade:", err);
            alert("Erro ao salvar disponibilidade. Verifique o console.");
          }
        };

        document.getElementById("cancelarDisponibilidade").onclick = () => hideModal();

      } catch (err) {
        console.error("Erro ao buscar disponibilidade existente:", err);
        // se for erro de índice do Firestore, o console já trará link para criar índice
        alert("Erro ao carregar dados. Veja o console para mais detalhes.");
        hideModal();
      }
    });
  } catch (err) {
    console.error("Erro ao inicializar disponibilidade:", err);
  }
}


// ---------- Fix + Debugger universal para modais ----------
// ---------- Fix + Debugger universal para modais (corrigido) ----------
(function () {
  if (window.__modalFixerInstalled) return;
  window.__modalFixerInstalled = true;

  function forceStyleForModal(el) {
    if (!el || !(el instanceof HTMLElement)) return;
    // marca pra evitar feedback loop
    el.dataset.__modalFixing = "1";
    try {
      Object.assign(el.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(0,0,0,0.55)",
        zIndex: "2147483647",
        pointerEvents: "auto",
      });
      const inner = el.querySelector(".modal-content, .popup-content, .detalhes-consulta-card");
      if (inner) {
        Object.assign(inner.style, {
          zIndex: "2147483648",
          position: "relative",
        });
      }
    } catch (err) {
      /* ignore */
    } finally {
      // remove a marca após o navegador aplicar estilos (pequeno delay)
      setTimeout(() => {
        try { delete el.dataset.__modalFixing; } catch (e) {}
      }, 50);
    }
  }

  function describeAncestors(el) {
    const list = [];
    let node = el.parentElement;
    while (node) {
      const cs = getComputedStyle(node);
      list.push({
        tag: node.tagName.toLowerCase(),
        id: node.id || null,
        classes: node.className || null,
        transform: cs.transform === "none" ? null : cs.transform,
        zIndex: cs.zIndex,
        position: cs.position,
        opacity: cs.opacity,
        display: cs.display,
      });
      node = node.parentElement;
    }
    return list;
  }

  function debugModalVisibility(modalEl) {
    if (!modalEl) return;
    console.groupCollapsed("🔍 Debug modal visibility");
    try {
      console.log("elemento modal:", modalEl);
      console.log("computedStyle of modal:", getComputedStyle(modalEl));
      console.log("bounding client rect:", modalEl.getBoundingClientRect());
      const ancestors = describeAncestors(modalEl);
      console.table(ancestors);
      const problematic = ancestors.find(
        (a) =>
          a.transform ||
          (a.zIndex && a.zIndex !== "auto" && Number(a.zIndex) > 0) ||
          a.opacity === "0" ||
          a.display === "none"
      );
      if (problematic) {
        console.warn("⚠️ Possível ancestral problemático encontrado:", problematic);
      } else {
        console.log("✅ Nenhum ancestral óbvio com transform/opacity/display encontrado.");
      }
    } catch (err) {
      console.error("Erro durante debugModalVisibility:", err);
    } finally {
      console.groupEnd();
    }
  }

  // Apenas observa alterações de class ou adição de nós — NÃO observa style para evitar loop
  const mo = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === "childList") {
        for (const node of mut.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches && (node.matches(".modal") || node.matches(".popup"))) {
            console.log("➕ Modal adicionado dinamicamente ao DOM:", node);
            // marca e força estilo
            forceStyleForModal(node);
            debugModalVisibility(node);
          }
        }
      } else if (mut.type === "attributes") {
        // ignorar mutações de elementos que nós mesmos estamos arrumando
        const t = mut.target;
        if (!(t instanceof HTMLElement)) continue;
        if (t.dataset && t.dataset.__modalFixing === "1") continue;
        // só reagir a mudanças de class (não react a style)
        if (mut.attributeName === "class") {
          if ((t.classList.contains("modal") || t.classList.contains("popup")) && !t.classList.contains("hidden")) {
            console.log("🛠 Modal alterado para visível (atributos):", t);
            forceStyleForModal(t);
            debugModalVisibility(t);
          }
        }
      }
    }
  });

  mo.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"] // <- removi "style" para evitar loops
  });

  // click handler pra detectar botões que abrem modais — aplica fix com proteção
  document.addEventListener("click", (ev) => {
    const target = ev.target;
    const modalSel = target?.dataset?.modal || target?.getAttribute("data-open-modal");
    if (modalSel) {
      const m = document.querySelector(modalSel);
      if (m && m instanceof HTMLElement) {
        // aplica com pequeno atraso, mas marca para evitar reentrada
        m.dataset.__modalFixing = "1";
        setTimeout(() => {
          forceStyleForModal(m);
          debugModalVisibility(m);
        }, 10);
      }
    }
  }, true);

  console.log("🧰 modal-fix detector rodando — watcher instalado.");
})();


document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log(
      "📢 DOM carregado — inicializando sistema de disponibilidade..."
    );
    initDisponibilidade();
  } catch (err) {
    console.error(
      "❌ Erro ao rodar initDisponibilidade no DOMContentLoaded:",
      err
    );
  }
});

/* ===========================================================
     CHAT DO PSICÓLOGO — versão interna do chat.html
=========================================================== */

let currentChatUser = null;
let unsubscribeMessages = null;

async function carregarChatsPsi() {
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
    // Consultas do psicólogo
    const q = query(collection(db, "Consultas"), where("Psicologo", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = "<p>Nenhum paciente encontrado.</p>";
      return;
    }

    const maes = [...new Set(snap.docs.map(d => d.data().Mae))];

    listEl.innerHTML = "";

    for (const uidMae of maes) {
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
          <span>${dados.email}</span>
        </div>
      `;

      // Ao clicar — abre o chat dentro da página
      card.addEventListener("click", () => {
        abrirChatInterno(uidMae, dados);
      });

      listEl.appendChild(card);
    }

  } catch (err) {
    console.error("Erro ao carregar chats:", err);
    listEl.innerHTML = "<p>Erro ao carregar chats.</p>";
  }
}


/* ===========================================================
     ABRIR CHAT DENTRO DO HOMEPSI
=========================================================== */

let currentChatId = null;

async function abrirChatInterno(uidMae, dadosMae) {
  currentChatUser = uidMae;

  document.getElementById("chatAvatarPsi").src = dadosMae.avatar || "./img/account_icon.png";
  document.getElementById("chatTitlePsi").textContent = "Chat com " + dadosMae.nome;

  document.getElementById("messageFormPsi").classList.remove("hidden");

  // Find chat doc
  const user = auth.currentUser;
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participantes", "array-contains", user.uid));
  const snap = await getDocs(q);
  let chatDoc = null;
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.participantes.includes(uidMae)) {
      chatDoc = { id: docSnap.id, ...data };
    }
  });

  if (!chatDoc) {
    // Create if not exists
    const newChat = await addDoc(chatsRef, {
      participantes: [user.uid, uidMae],
      criadoEm: serverTimestamp(),
      ultimoMensagem: "",
      ultimoEnviadoPor: ""
    });
    chatDoc = { id: newChat.id, participantes: [user.uid, uidMae] };
  }

  currentChatId = chatDoc.id;
  carregarMensagens(chatDoc.id, uidMae);
}

/* ===========================================================
     OUVE MENSAGENS EM TEMPO REAL
=========================================================== */
function carregarMensagens(chatId) {
  const user = auth.currentUser;
  const messagesEl = document.getElementById("messagesPsi");
  messagesEl.innerHTML = "";

  if (unsubscribeMessages) unsubscribeMessages();

  const msgsRef = collection(db, "chats", chatId, "mensagens");
  const q = query(msgsRef, orderBy("enviadoEm", "asc"));

  unsubscribeMessages = onSnapshot(q, snap => {
    messagesEl.innerHTML = "";

    snap.forEach(msg => {
      const m = msg.data();
      const div = document.createElement("div");

      div.className = m.enviadoPor === user.uid ? "msg msg-enviada" : "msg msg-recebida";

      let conteudo = "";

      // 🎤 Se for áudio
      if (m.audio && m.audio.startsWith("data:audio")) {
        conteudo = `
        <audio controls style="width: 100%; margin-top: 5px;">
            <source src="${m.audio}">
            Seu navegador não suporta áudio.
        </audio>
    `;
      }

      // 📝 Se for texto
      else if (m.texto && m.texto.trim() !== "") {
        conteudo = `<p>${m.texto}</p>`;
      }

      // 🛑 Se não tiver nada
      else {
        conteudo = `<p><i>(mensagem vazia)</i></p>`;
      }

      div.innerHTML = `
    ${conteudo}
    <span class="msg-time">
        ${new Date(m.enviadoEm?.toDate()).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })}
    </span>
`;

      messagesEl.appendChild(div);

    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}


/* ===========================================================
     ENVIAR MENSAGEM
=========================================================== */
document.getElementById("messageFormPsi")?.addEventListener("submit", enviarMensagem);

async function enviarMensagem(e) {
  e.preventDefault();
  const input = document.getElementById("messageInputPsi");
  const texto = input.value.trim();
  if (!texto || !currentChatId) return;

  const user = auth.currentUser;

  const msgsRef = collection(db, "chats", currentChatId, "mensagens");

  await addDoc(msgsRef, {
    texto,
    enviadoPor: user.uid,
    enviadoEm: serverTimestamp(),
    lido: false
  });

  await setDoc(doc(db, "chats", currentChatId), {
    ultimoMensagem: texto,
    ultimoEnviadoPor: user.uid,
    ultimaAtualizacao: serverTimestamp()
  }, { merge: true });

  input.value = "";
}

async function carregarConsultasDia() {
  const user = auth.currentUser;
  if (!user) return;

  const container = document.getElementById("todayAppointments");
  if (!container) return;

  container.innerHTML = "<div class='loader'><div class='dot'></div><div class='dot'></div><div class='dot'></div></div>";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, "Consultas"),
    where("Psicologo", "==", user.uid)
  );

  const snap = await getDocs(q);

  let consultasDoDia = [];

  for (const docSnap of snap.docs) {
    const c = docSnap.data();
    if (!c.Datahora) continue;

    const data = c.Datahora.toDate();
    const dataLimpa = new Date(data);
    dataLimpa.setHours(0, 0, 0, 0);

    if (dataLimpa.getTime() !== hoje.getTime()) continue;

    // Buscar mãe
    const maeRef = doc(db, "usuarios", c.Mae);
    const maeSnap = await getDoc(maeRef);

    consultasDoDia.push({
      id: docSnap.id,
      maeNome: maeSnap.exists() ? maeSnap.data().nome : "Mãe",
      maeAvatar: maeSnap.exists() ? (maeSnap.data().avatar || "./img/account_icon.png") : "./img/account_icon.png",
      horario: data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      maeId: c.Mae
    });
  }

  container.innerHTML = "";

  if (consultasDoDia.length === 0) {
    container.innerHTML = "<p>Nenhuma consulta hoje.</p>";
    return;
  }

  consultasDoDia.sort((a, b) => a.horario.localeCompare(b.horario));

  consultasDoDia.forEach(c => {
    const div = document.createElement("div");
    div.className = "appointment-card";

    div.innerHTML = `
  <div class="appointment-info">
    <img src="${c.maeAvatar}" class="appointment-avatar">
    <div class="appointment-text">
      <strong>${c.maeNome}</strong>
      <p>Hoje - ${c.horario}</p>
    </div>
  </div>

  <button class="contact-btn" data-uid="${c.maeId}">Entrar em contato</button>
`;


    // abrir chat ao clicar
    div.querySelector(".contact-btn").addEventListener("click", async () => {
      document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));
      document.querySelector('[data-target="chats"]').classList.add("active");

      document.querySelectorAll(".content").forEach(c => c.classList.add("hidden"));
      document.getElementById("chats").classList.remove("hidden");

      const uidMae = c.maeId;

      // pega dados da mãe
      const refMae = doc(db, "usuarios", uidMae);
      const snapMae = await getDoc(refMae);
      abrirChatInterno(uidMae, snapMae.data());
    });

    container.appendChild(div);
  });
}

onAuthStateChanged(auth, () => {
  carregarConsultasDia();
});


/* =========================
   GLOBAL MODAL MANAGER (corrigido)
   ========================= */
(function modalManagerInit() {
  if (window.__globalModalManagerInstalled) return;
  window.__globalModalManagerInstalled = true;

  const LOG = true;
  const processed = new WeakSet();

  function adoptAndFixModal(el) {
    if (!(el instanceof HTMLElement)) return;
    if (processed.has(el)) {
      if (LOG) console.debug('[modalManager] already adopted', el);
      return;
    }

    // marca pra evitar reação do observer
    el.dataset.__modalFixing = "1";
    try {
      if (el.parentElement !== document.body) {
        try { document.body.appendChild(el); } catch (e) { /* ignore */ }
      }

      Object.assign(el.style, {
        position: 'fixed',
        inset: '0',
        display: el.classList.contains('hidden') ? 'none' : 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.55)',
        zIndex: '2147483646',
        pointerEvents: 'auto'
      });

      const inner = el.querySelector('.modal-content, .popup-content, .detalhes-consulta-card');
      if (inner) {
        Object.assign(inner.style, {
          position: 'relative',
          zIndex: '2147483647',
          maxHeight: '90vh',
          overflow: 'auto',
          transform: 'none'
        });
      }

      processed.add(el);
      if (LOG) console.debug('[modalManager] adopted modal', el);
    } finally {
      // limpa marca após render
      setTimeout(() => {
        try { delete el.dataset.__modalFixing; } catch (e) {}
      }, 60);
    }
  }

  function handleNewNode(node) {
    if (!(node instanceof HTMLElement)) return;
    if (node.matches && (node.matches('.modal') || node.matches('.popup'))) {
      adoptAndFixModal(node);
    }
    node.querySelectorAll && node.querySelectorAll('.modal, .popup').forEach(adoptAndFixModal);
  }

  const mo = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'childList') {
        mut.addedNodes.forEach(n => handleNewNode(n));
      }
      if (mut.type === 'attributes' && mut.target instanceof HTMLElement) {
        const t = mut.target;
        // ignora mudanças causadas por nós
        if (t.dataset && t.dataset.__modalFixing === "1") continue;
        // só reagir a class changes (não style)
        if (mut.attributeName === 'class' && (t.classList.contains('modal') || t.classList.contains('popup'))) {
          adoptAndFixModal(t);
        }
      }
    }
  });

  mo.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'] // <- removi 'style' para evitar loops
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal, .popup').forEach(adoptAndFixModal);
    if (LOG) console.info('[modalManager] initial scan done');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      document.querySelectorAll('.modal:not(.hidden), .popup:not(.hidden)').forEach(m => {
        m.classList.add('hidden');
        m.style.display = 'none';
      });
    }
  });

  document.body.addEventListener('click', (ev) => {
    const target = ev.target;
    const modalEl = target.closest ? target.closest('.modal, .popup') : null;
    if (modalEl) {
      const inner = modalEl.querySelector('.modal-content, .popup-content, .detalhes-consulta-card');
      if (inner && !inner.contains(target)) {
        modalEl.classList.add('hidden');
        modalEl.style.display = 'none';
        if (LOG) console.debug('[modalManager] closed modal by outside click', modalEl);
      }
    }

    const closeBtn = target.closest && target.closest('[data-close-modal], .close-modal, #popup-close');
    if (closeBtn) {
      const parentModal = closeBtn.closest('.modal, .popup');
      if (parentModal) {
        parentModal.classList.add('hidden');
        parentModal.style.display = 'none';
      }
    }
  }, true);

  window.modalManager = {
    adoptAll: () => document.querySelectorAll('.modal, .popup').forEach(adoptAndFixModal),
    adoptOne: (el) => adoptAndFixModal(el),
    listVisible: () => Array.from(document.querySelectorAll('.modal:not(.hidden), .popup:not(.hidden)')),
    _mutationObserver: mo
  };

  if (typeof console !== 'undefined') console.info('[modalManager] ready');
})();


/* ======================================================
      ÁUDIO NO CHAT DO PSICÓLOGO (HomePsi)
====================================================== */

let mediaRecorderPsi = null;
let audioChunksPsi = [];

const voiceBtnPsi = document.getElementById("voiceBtnPsi");

if (voiceBtnPsi) {
  voiceBtnPsi.addEventListener("click", async () => {

    // ⛔ agora usa o ID correto do chat!
    if (!currentChatId) return;

    // Iniciar gravação
    if (!mediaRecorderPsi || mediaRecorderPsi.state === "inactive") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorderPsi = new MediaRecorder(stream);
        audioChunksPsi = [];

        mediaRecorderPsi.ondataavailable = e => audioChunksPsi.push(e.data);

        mediaRecorderPsi.onstop = async () => {
          const audioBlob = new Blob(audioChunksPsi, { type: "audio/webm" });
          const reader = new FileReader();

          reader.onload = async () => {
            const base64Audio = reader.result;

            try {
              const msgRef = collection(db, "chats", currentChatId, "mensagens");

              await addDoc(msgRef, {
                audio: base64Audio,
                texto: "",
                enviadoPor: auth.currentUser.uid,
                enviadoEm: serverTimestamp(),
                lido: false
              });

              await setDoc(doc(db, "chats", currentChatId), {
                ultimoMensagem: "[Áudio]",
                ultimoEnviadoPor: auth.currentUser.uid,
                ultimaAtualizacao: serverTimestamp()
              }, { merge: true });

            } catch (err) {
              console.error("Erro ao enviar áudio (PSI):", err);
              alert("Erro ao enviar áudio.");
            }
          };

          reader.readAsDataURL(audioBlob);
        };

        mediaRecorderPsi.start();
        voiceBtnPsi.classList.add("recording");

      } catch (err) {
        alert("Não foi possível acessar o microfone.");
        console.error(err);
      }

      return;
    }

    // Parar gravação
    if (mediaRecorderPsi.state === "recording") {
      mediaRecorderPsi.stop();
      voiceBtnPsi.classList.remove("recording");
    }
  });
}

function createCustomAudioPlayers() {
  document.querySelectorAll("audio").forEach(audio => {
    if (audio.dataset.processed) return;
    audio.dataset.processed = true;

    const wrapper = document.createElement("div");
    wrapper.className = "audio-wrapper";

    const playBtn = document.createElement("button");
    playBtn.className = "audio-play-btn";
    playBtn.innerHTML = "►";

    const progress = document.createElement("input");
    progress.type = "range";
    progress.className = "audio-progress";
    progress.min = 0;
    progress.value = 0;

    const time = document.createElement("span");
    time.className = "audio-time";
    time.textContent = "00:00";

    wrapper.appendChild(playBtn);
    wrapper.appendChild(progress);
    wrapper.appendChild(time);

    audio.style.display = "none"; // esconde o player nativo
    audio.parentNode.insertBefore(wrapper, audio.nextSibling);

    // Play / Pause
    playBtn.onclick = () => {
      if (audio.paused) {
        audio.play();
        playBtn.innerHTML = "❚❚";
      } else {
        audio.pause();
        playBtn.innerHTML = "►";
      }
    };

    // Atualiza barra e tempo
    audio.addEventListener("timeupdate", () => {
      progress.value = audio.currentTime;
      time.textContent = formatTime(audio.currentTime);
    });

    audio.onloadedmetadata = () => {
      progress.max = audio.duration;
    };

    // Permite arrastar a barra
    progress.oninput = () => {
      audio.currentTime = progress.value;
    };
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// roda sempre que mensagens novas chegam
setInterval(createCustomAudioPlayers, 500);

/* ============================
   CARREGAR PACIENTES
=========================== */

async function carregarPacientes() {
  const user = auth.currentUser;
  if (!user) return;

  const grid = document.querySelector('.patients-grid');
  if (!grid) return;

  grid.innerHTML = `<div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;

  try {
    // Get all consultations for the psi
    const q = query(collection(db, "Consultas"), where("Psicologo", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      grid.innerHTML = "<p>Nenhum paciente encontrado.</p>";
      return;
    }

    // Collect unique maes and their last consultation date
    const maesMap = new Map();
    for (const docSnap of snap.docs) {
      const c = docSnap.data();
      const maeUid = c.Mae;
      const date = c.Datahora && c.Datahora.toDate ? c.Datahora.toDate() : null;
      if (maeUid && date) {
        if (!maesMap.has(maeUid) || date > maesMap.get(maeUid).lastDate) {
          maesMap.set(maeUid, { lastDate: date });
        }
      }
    }

    // Now get mae data
    const maesData = [];
    for (const uid of maesMap.keys()) {
      const ref = doc(db, "usuarios", uid);
      const snapMae = await getDoc(ref);
      if (!snapMae.exists()) continue;
      const mae = snapMae.data();
      const lastDate = maesMap.get(uid).lastDate;
      maesData.push({ uid, mae, lastDate });
    }

    if (maesData.length === 0) {
      grid.innerHTML = "<p>Nenhum paciente encontrado.</p>";
      return;
    }

    // Sort by lastDate descending
    maesData.sort((a, b) => b.lastDate - a.lastDate);

    grid.innerHTML = "";

    for (const item of maesData) {
      const { uid, mae, lastDate } = item;
      const ultimaStr = lastDate.toLocaleDateString("pt-BR");

      const card = document.createElement("div");
      card.classList.add("patient-card");

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
              <button class="contact-btn open-chat-btn" data-uid="${uid}">Abrir chat</button>
            </div>
          </div>
        `;

      grid.appendChild(card);
    }

    // Add event listeners
    document.querySelectorAll('.ver-perfil-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        window.location.href = `perfilPessoa.html?id=${uid}`;
      });
    });

    document.querySelectorAll('.open-chat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        // Switch to chats tab and open chat
        const contents = document.querySelectorAll(".content");
        document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
        contents.forEach(c => c.classList.add("hidden"));

        const chatSection = document.getElementById("chats");
        if (chatSection) chatSection.classList.remove("hidden");

        const menuBtn = document.querySelector('.menu-btn[data-target="chats"]');
        if (menuBtn) menuBtn.classList.add("active");

        // Load mae data
        const refMae = doc(db, "usuarios", uid);
        const snapMae = await getDoc(refMae);
        if (snapMae.exists()) {
          abrirChatInterno(uid, snapMae.data());
        }
      });
    });

  } catch (err) {
    console.error("Erro ao carregar pacientes:", err);
    grid.innerHTML = "<p>Erro ao carregar pacientes.</p>";
  }
}
