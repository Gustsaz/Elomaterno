import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ----- menu e navegação ----- */
const menuButtons = document.querySelectorAll('.menu-btn');
const sections = document.querySelectorAll('.content');

menuButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    menuButtons.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.add('hidden'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    target.classList.remove('hidden');
  });
});

/* ----- variáveis do gráfico ----- */
let usageChart = null;

/* ----- utilidades de data ----- */
function formatDateToDDMMYYYY(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* tenta extrair uma string DD/MM/YYYY do campo armazenado */
function extractDateString(field) {
  if (!field) return null;
  // se for string já no formato dd/mm/yyyy
  if (typeof field === 'string' && field.match(/^\d{2}\/\d{2}\/\d{4}$/)) return field;
  // se for Timestamp do Firestore
  if (typeof field.toDate === 'function') {
    return formatDateToDDMMYYYY(field.toDate());
  }
  // se for objeto com seconds (p.ex. serializado)
  if (field.seconds) {
    const d = new Date(field.seconds * 1000);
    return formatDateToDDMMYYYY(d);
  }
  return null;
}

async function atualizarDashboard() {
  try {
    const psicologosSnap = await getDocs(collection(db, "psicologos"));
    const advogadosSnap = await getDocs(collection(db, "advogados"));

    const psicologosAtivos = psicologosSnap.docs.filter(d => d.data().status === "aprovado").length;
    const advogadosAtivos = advogadosSnap.docs.filter(d => d.data().status === "aprovado").length;

    document.getElementById("psicoCount").textContent = psicologosAtivos;
    document.getElementById("advCount").textContent = advogadosAtivos;

    criarOuAtualizarGrafico({ psicologosAtivos, advogadosAtivos });

  } catch (e) {
    console.error("Erro dashboard:", e);
  }
}




/* ----- criar/atualizar gráfico ----- */
function criarOuAtualizarGrafico({ psicologosAtivos, advogadosAtivos, }) {
  const ctx = document.getElementById('usageChart').getContext('2d');

  const labels = ['Psicólogos', 'Advogados'];
  const values = [psicologosAtivos, advogadosAtivos,];

  const purpleColors = [
    'rgba(124,105,169,0.9)',
    'rgba(108,75,191,0.85)',
    'rgba(88,62,142,0.9)',
    'rgba(99,80,165,0.9)'
  ];

  if (usageChart) {
    // atualizar dados
    usageChart.data.datasets[0].data = values;
    usageChart.update();
    return;
  }

  usageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Quantidade',
        data: values,
        backgroundColor: purpleColors,
        borderColor: purpleColors.map(c => c.replace('0.9', '1')),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
  /* ==== GRÁFICO PIZZA (NOVO, SEM ALTERAR O ORIGINAL) ==== */
  const pie = document.getElementById('pieChart');
  if (pie) {
    new Chart(pie, {
      type: 'doughnut',
      data: {
        labels: ['Psicólogos', 'Advogados'],
        datasets: [{
          data: [psicologosAtivos, advogadosAtivos],
          backgroundColor: [
            'rgba(124,105,169,0.9)',
            'rgba(108,75,191,0.85)',
            'rgba(88,62,142,0.9)'
          ]
        }]
      },
      options: {
        cutout: '55%',
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

}

/* ----- carregar solicitações (autorizacoes) ----- */
async function carregarSolicitacoes() {
  const requestList = document.querySelector('.request-list');
  if (!requestList) return;
  requestList.innerHTML = ""; // Garante que a lista seja limpa antes de renderizar

  const colecoes = [
    { tipo: "psicologo", ref: collection(db, "psicologos") },
    { tipo: "advogado", ref: collection(db, "advogados") }
  ];

  for (const col of colecoes) {
    const snap = await getDocs(col.ref);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      // Renderiza apenas pendentes, para não poluir
      const status = data.status || "pendente";

      if (status !== "pendente") return;

      const corStatus = "pendente"; // O status sempre será "pendente" aqui.

      const card = document.createElement("div");
      card.classList.add("request-card");
      card.dataset.id = docSnap.id;
      card.innerHTML = `
        <div>
          <strong>${data.nome}</strong>
          <p>${col.tipo === "psicologo"
          ? "Psicólogo(a) | CRP: " + (data.crp || "-")
          : "Advogado(a) | OAB: " + (data.oab || "-")}</p>
          <p>Status: <span class="status ${corStatus}">${status}</span></p>
        </div>
        <div class="actions">
          ${status === "pendente"
          ? `<button class="approve-btn" data-id="${docSnap.id}" data-col="${col.tipo}">Aprovar</button>
                 <button class="deny-btn" data-id="${docSnap.id}" data-col="${col.tipo}">Recusar</button>`
          : ""
        }
        </div>
      `;
      requestList.appendChild(card);
    });
  }

  // Eventos de aprovar/recusar (sem alteração)
  document.querySelectorAll(".approve-btn").forEach(btn => {
    btn.onclick = async () => {
      const col = btn.dataset.col === "psicologo" ? "psicologos" : "advogados";
      const ref = doc(db, col, btn.dataset.id);
      await updateDoc(ref, { status: "aprovado" });
      alert("Profissional aprovado!");
      // Chamadas de atualização são importantes aqui:
      carregarSolicitacoes();
      carregarUsuarios();
      atualizarDashboard();
    };
  });

  document.querySelectorAll(".deny-btn").forEach(btn => {
    btn.onclick = async () => {
      const col = btn.dataset.col === "psicologo" ? "psicologos" : "advogados";
      const ref = doc(db, col, btn.dataset.id);
      await updateDoc(ref, { status: "recusado" });
      alert("Profissional recusado.");
      // Chamadas de atualização são importantes aqui:
      carregarSolicitacoes();
      atualizarDashboard();
    };
  });
}

/* ----- carregar usuarios (inclui maes) - OTIMIZADO COM Promise.all ----- */
async function carregarUsuarios() {
  const tbody = document.querySelector("#usuarios tbody");
  if (!tbody) return;

  // 1. Garante a limpeza do container ANTES de iniciar qualquer busca de dados.
  tbody.innerHTML = "";

  const colecoesConfig = [
    { tipoLabel: "Psicólogo", nomeColecao: "psicologos", ref: collection(db, "psicologos") },
    { tipoLabel: "Advogado", nomeColecao: "advogados", ref: collection(db, "advogados") },
    { tipoLabel: "Mãe", nomeColecao: "usuarios", ref: collection(db, "maes") }
  ];

  // 2. Busca todos os dados em PARALELO, garantindo que todas as promessas terminem.
  const snapshots = await Promise.all(
    colecoesConfig.map(col => getDocs(col.ref))
  );

  const todosOsDocs = [];

  // 3. Processa e mescla os dados APENAS DEPOIS que todas as buscas terminaram.
  snapshots.forEach((snap, index) => {
    const col = colecoesConfig[index];
    snap.forEach((docSnap) => {
      todosOsDocs.push({
        docSnap,
        colName: col.nomeColecao,
        colLabel: col.tipoLabel
      });
    });
  });

  // 4. Renderiza todos os documentos de uma vez.
  todosOsDocs.forEach(({ docSnap, colName, colLabel }) => {
    const data = docSnap.data();
    const status = data.status || "pendente";
    const corStatus =
      status === "aprovado"
        ? "ativo"
        : status === "recusado"
          ? "recusado"
          : "pendente";

    // ID de linha exclusivo combinando coleção e documento ID.
    const uniqueId = `${colName}-${docSnap.id}`;

    const emailOrDoc = data.email || data.crp || data.oab || "-";

    const tr = document.createElement("tr");
    tr.dataset.uniqueId = uniqueId;
    tr.dataset.id = docSnap.id;
    tr.dataset.col = colName;

    tr.innerHTML = `
        <td>${data.nome}</td>
        <td>${colLabel}</td>
        <td>${emailOrDoc}</td>
        <td><span class="status ${corStatus}">${status}</span></td>
        <td>
          <button class="remove-btn" data-id="${docSnap.id}" data-col="${colName}">Remover</button>
        </td>
      `;
    tbody.appendChild(tr);
  });

  // evento remover (precisa ser reanexado, pois o DOM foi reconstruído)
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const confirmar = confirm("Tem certeza que deseja remover este usuário?");
      if (!confirmar) return;

      const col = btn.dataset.col || "maes";
      const ref = doc(db, col, btn.dataset.id);
      await deleteDoc(ref);
      alert("Usuário removido!");
      // Chama as funções para atualizar o estado da aplicação
      carregarUsuarios();
      atualizarDashboard();
    });
  });
}
// O restante do código pode permanecer o mesmo que na última atualização.

/* ----- escutar mudanças realtime (APENAS para a dashboard e tabelas) ----- */
function escutarMudancas() {
  const colNames = ["psicologos", "advogados", "maes"];
  colNames.forEach(colName => {
    onSnapshot(collection(db, colName), () => {
      // Apenas atualiza o Dashboard com os novos contadores
      atualizarDashboard();

      // Para que as tabelas de Usuários/Solicitações sejam atualizadas,
      // você precisa chamar a função. O importante é que cada uma destas
      // FUNÇÕES LIMPAM A SI MESMAS antes de renderizar (`innerHTML = ""`).
      carregarUsuarios();
      if (colName !== "maes") carregarSolicitacoes();
    });
  });
}

/* ----- inicialização ----- */
// 1. Carregamento inicial de todas as seções
carregarSolicitacoes();
carregarUsuarios();
atualizarDashboard();

