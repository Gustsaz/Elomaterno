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
  deleteDoc,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const boasVindas = document.getElementById("boasVindas");
const logoutBtn = document.getElementById("logoutBtn");

const addPostBtn = document.querySelector(".add-post-btn");
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
      boasVindas.textContent = `Olá, ${nomeEmpresaAtual}!`;
      carregarPostsDoParceiro(nomeEmpresaAtual);
      carregarEventosDoParceiro(nomeEmpresaAtual);
    } else {
      boasVindas.textContent = "Olá, parceiro!";
    }
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    boasVindas.textContent = "Olá!";
  }
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
    categoria: "posts",
    postadoPor: nomeEmpresaAtual,
    datahorapost: new Date()
  };

  try {
    await addDoc(collection(db, "artigos"), artigo);
    postMsg.style.color = "green";
    postMsg.textContent = "Post criado com sucesso!";
    postForm.reset();
    modal.classList.add("hidden");
    carregarPostsDoParceiro(nomeEmpresaAtual);
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

addEventBtn.addEventListener("click", () => eventModal.classList.remove("hidden"));
addEventBtn2.addEventListener("click", () => eventModal.classList.remove("hidden"));
closeEventModal.addEventListener("click", () => eventModal.classList.add("hidden"));

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const evento = {
    titulo: document.getElementById("tituloEvento").value.trim(),
    descricao: document.getElementById("descricaoEvento").value.trim(),
    data: Timestamp.fromDate(new Date(document.getElementById("dataEvento").value)),
    local: document.getElementById("localEvento").value.trim(),
    capa: document.getElementById("capaEvento").value.trim(),
    enviadoPor: nomeEmpresaAtual
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
  const q = query(collection(db, "eventos"), where("enviadoPor", "==", nomeEmpresa));
  const querySnapshot = await getDocs(q);

  eventList.innerHTML = "";

  querySnapshot.forEach((d) => {
    const ev = d.data();
    const item = document.createElement("div");
    item.classList.add("event");
    item.innerHTML = `
      <div class="delete-btn"><i class="fa-solid fa-trash"></i></div>
      <img src="${ev.capa}" alt="${ev.titulo}" style="width:100%; height:120px; border-radius:8px; object-fit:cover; margin-bottom:8px;">
      <strong>${new Date(ev.data.toDate()).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} • ${ev.titulo}</strong>
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
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
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
