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


let usageChart = null;


function formatDateToDDMMYYYY(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}


function extractDateString(field) {
  if (!field) return null;
  
  if (typeof field === 'string' && field.match(/^\d{2}\/\d{2}\/\d{4}$/)) return field;
  
  if (typeof field.toDate === 'function') {
    return formatDateToDDMMYYYY(field.toDate());
  }
  
  if (field.seconds) {
    const d = new Date(field.seconds * 1000);
    return formatDateToDDMMYYYY(d);
  }
  return null;
}

async function atualizarDashboard() {
  try {
    const psicologosSnap = await getDocs(collection(db, "psicologos"));
    const advogadosSnap  = await getDocs(collection(db, "advogados"));

    const psicologosAtivos = psicologosSnap.docs.filter(d => d.data().status === "aprovado").length;
    const advogadosAtivos  = advogadosSnap.docs.filter(d => d.data().status === "aprovado").length;

    document.getElementById("psicoCount").textContent = psicologosAtivos;
    document.getElementById("advCount").textContent   = advogadosAtivos;

    criarOuAtualizarGrafico({ psicologosAtivos, advogadosAtivos });

  } catch(e){
    console.error("Erro dashboard:", e);
  }
}





function criarOuAtualizarGrafico({ psicologosAtivos, advogadosAtivos,  }) {
  const ctx = document.getElementById('usageChart').getContext('2d');

  const labels = ['Psicólogos', 'Advogados' ];
  const values = [psicologosAtivos, advogadosAtivos,  ];

  const purpleColors = [
    'rgba(124,105,169,0.9)',
    'rgba(108,75,191,0.85)',
    'rgba(88,62,142,0.9)',
    'rgba(99,80,165,0.9)'
  ];

  if (usageChart) {
    
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
  
const pie = document.getElementById('pieChart');
if(pie){
    new Chart(pie, {
        type: 'doughnut',
        data: {
            labels: ['Psicólogos','Advogados'],
            datasets: [{
                data: [psicologosAtivos, advogadosAtivos],
                backgroundColor: [
                    'rgba(124,105,169,0.9)',
                    'rgba(108,75,191,0.85)',
                    'rgba(88,62,142,0.9)'
                ]
            }]
        },
        options:{
            cutout:'55%',
            plugins:{ legend:{position:'bottom'} }
        }
    });
}

}


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
      
      const status = data.status || "pendente";

      if (status !== "pendente") return;

      const corStatus = "pendente"; 

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
          ${
            status === "pendente"
              ? `<button class="approve-btn" data-id="${docSnap.id}" data-col="${col.tipo}">Aprovar</button>
                 <button class="deny-btn" data-id="${docSnap.id}" data-col="${col.tipo}">Recusar</button>`
              : ""
          }
        </div>
      `;
      requestList.appendChild(card);
    });
  }

  
  document.querySelectorAll(".approve-btn").forEach(btn => {
    btn.onclick = async () => {
      const col = btn.dataset.col === "psicologo" ? "psicologos" : "advogados";
      const ref = doc(db, col, btn.dataset.id);
      await updateDoc(ref, { status: "aprovado" });
      alert("Profissional aprovado!");
      
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
      
      carregarSolicitacoes();
      atualizarDashboard();
    };
  });
}


async function carregarUsuarios() {
  const tbody = document.querySelector("#usuarios tbody");
  if (!tbody) return;
  
  
  tbody.innerHTML = ""; 

  const colecoesConfig = [
    { tipoLabel: "Psicólogo", nomeColecao: "psicologos", ref: collection(db, "psicologos") },
    { tipoLabel: "Advogado", nomeColecao: "advogados", ref: collection(db, "advogados") },
    { tipoLabel: "Mãe", nomeColecao: "usuarios", ref: collection(db, "maes") }
  ];

  
  const snapshots = await Promise.all(
    colecoesConfig.map(col => getDocs(col.ref))
  );

  const todosOsDocs = [];

  
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

  
  todosOsDocs.forEach(({ docSnap, colName, colLabel }) => {
      const data = docSnap.data();
      const status = data.status || "pendente";
      const corStatus =
        status === "aprovado"
          ? "ativo"
          : status === "recusado"
          ? "recusado"
          : "pendente";

      
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

  
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const confirmar = confirm("Tem certeza que deseja remover este usuário?");
      if (!confirmar) return;

      const col = btn.dataset.col || "maes";
      const ref = doc(db, col, btn.dataset.id);
      await deleteDoc(ref);
      alert("Usuário removido!");
      
      carregarUsuarios();
      atualizarDashboard();
    });
  });
}



function escutarMudancas() {
  const colNames = ["psicologos", "advogados", "maes"];
  colNames.forEach(colName => {
    onSnapshot(collection(db, colName), () => {
      
      atualizarDashboard();

      
      
      
      carregarUsuarios();
      if (colName !== "maes") carregarSolicitacoes();
    });
  });
}



carregarSolicitacoes();
carregarUsuarios();
atualizarDashboard();

