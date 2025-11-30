// consulta-lista-psi.js
import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  addDoc,
  Timestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let snapGlobal = null; // manter snapshot de psicólogos + advogados (array de docs)

document.addEventListener("DOMContentLoaded", async () => {
  const psiContainer = document.querySelector(".psi-container");

  try {
    // Carrega psicólogos e advogados
    const [snapPsi, snapAdv] = await Promise.all([
      getDocs(collection(db, "psicologos")),
      getDocs(collection(db, "advogados"))
    ]);

    // Concatena todos os docs em um único array de "document snapshots"
    const docsAll = [
      ...snapPsi.docs.map(d => {
        d._tipo = "psicologo";
        return d;
      }),
      ...snapAdv.docs.map(d => {
        d._tipo = "advogado";
        return d;
      })
    ];


    if (docsAll.length === 0) {
      psiContainer.innerHTML += `
        <p style="text-align:center;margin-top:40px;color:gray">
          Nenhum profissional cadastrado no momento.
        </p>`;
      return;
    }

    // Remove card de exemplo estático (se houver)
    const exemplo = document.querySelector(".psi-card");
    if (exemplo) exemplo.remove();

    // Opcional: ordenar por nome (se existir campo nome)
    docsAll.sort((a, b) => {
      const na = (a.data().nome || "").toLowerCase();
      const nb = (b.data().nome || "").toLowerCase();
      return na.localeCompare(nb);
    });

    // Cria cards misturados
    docsAll.forEach((docSnapshot) => {
      const tipo = docSnapshot._tipo; // "psicologo" ou "advogado"
      const data = docSnapshot.data();

      const nome = data.nome || (tipo === "psicologo" ? "Psicólogo(a)" : "Advogado(a)");
      const identificacao = tipo === "psicologo" ? (data.crp || "Sem CRP") : (data.oab || "Sem OAB");
      const area = tipo === "psicologo" ? (data.area || "Área não informada") : (data.atuacao || "Atuação não informada");
      const especializacoes = (data.especializacoes || []).slice(0, 3);
      const extras = (data.especializacoes || []).length > 3 ? `<span>+${data.especializacoes.length - 3}</span>` : "";
      const foto = tipo === "psicologo" ? (data.avatar || "./img/account_icon.png") : "./img/adv1.png";
      const nota = data.notas?.length ? (data.notas.reduce((a, b) => a + b, 0) / data.notas.length).toFixed(2) : "5.00";
      const avaliacoes = data.notas?.length || 0;
      const atendimentos = data.atendimentos || Math.floor(Math.random() * 300 + 100);

      const disponibilidade = data.disponibilidade || [];
      const disponibilidadeFormatada = processarDisponibilidade(disponibilidade);

      const card = document.createElement("div");
      card.classList.add("psi-card");

      // meta para identificar o tipo e o documento
      card.dataset.tipo = tipo;
      card.dataset.docid = docSnapshot.id;
      card.dataset.uid = data.uid || docSnapshot.id;

      card.innerHTML = `
        <div class="psi-info">
          <img src="${foto}" alt="${tipo === 'psicologo' ? 'Psicólogo' : 'Advogado'}" class="psi-foto">
          <div class="psi-dados">
            <h3>${nome}</h3>
            <p class="psi-cargo">${tipo === 'psicologo' ? 'Psicólogo(a) - CRP' : 'Advogado - OAB'} ${identificacao}</p>
            <div class="psi-tags">
              ${especializacoes.map((e) => `<span>${e}</span>`).join("")}
              ${extras}
            </div>
            <div class="psi-stats">
              <span class="atendimentos"><i class="fa fa-comment-dots"></i> ${atendimentos} atendimentos</span>
            </div>
            <p class="psi-abordagem">${area}</p>
            <a href="#" class="ver-perfil">Ver perfil completo <i class="fa fa-arrow-right"></i></a>
          </div>
        </div>

        <div class="psi-agenda">
          <h4>Selecione uma data:</h4>
          <div class="datas">
            ${Object.keys(disponibilidadeFormatada)
          .map(
            (dataStr, i) =>
              `<button class="data ${i === 0 ? "ativo" : ""}" data-data="${dataStr}">${formatarBotaoData(
                dataStr
              )}</button>`
          )
          .join("")}
          </div>

          <div class="horarios">
            ${gerarHorarios(disponibilidadeFormatada, Object.keys(disponibilidadeFormatada)[0])}
          </div>

          <div class="preco-info">
            <span class="duracao">Duração: 45min</span>
          </div>
          <button class="btn-agendar">Agendar</button>
        </div>
      `;

      psiContainer.appendChild(card);
    });

    // Guardar snapGlobal como lista de docs (usado ao agendar)
    snapGlobal = docsAll;

    /* === EVENTOS GLOBAIS === */

    // Clique em "Ver perfil completo"
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".ver-perfil");
      if (!link) return;

      const card = link.closest(".psi-card");
      const tipo = card.dataset.tipo;
      const uid = card.dataset.uid;

      if (tipo === "psicologo") {
        // redireciona para perfil Psi
        window.location.href = `perfilPsi.html?uid=${encodeURIComponent(uid)}`;
      } else {
        // redireciona para perfil Advogado
        window.location.href = `perfilAdv.html?uid=${encodeURIComponent(uid)}`;
      }
    });

    // Selecionar data
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".data");
      if (!btn) return;

      const card = btn.closest(".psi-card");
      const horariosDiv = card.querySelector(".horarios");
      const docId = card.dataset.docid;

      const docSnapshot = snapGlobal.find(d => d.id === docId);
      const disponibilidade = processarDisponibilidade(docSnapshot.data().disponibilidade || []);

      // atualizar ativo nas datas
      btn.parentElement.querySelectorAll(".data").forEach((b) => b.classList.remove("ativo"));
      btn.classList.add("ativo");

      horariosDiv.innerHTML = gerarHorarios(disponibilidade, btn.dataset.data);
    });

    // Selecionar horário
    document.addEventListener("click", (e) => {
      const horarioBtn = e.target.closest(".horarios button");
      if (!horarioBtn) return;
      const horariosDiv = horarioBtn.closest(".horarios");
      horariosDiv.querySelectorAll("button").forEach((b) => b.classList.remove("ativo"));
      horarioBtn.classList.add("ativo");
    });

    // Clique em Agendar
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-agendar");
      if (!btn) return;

      const card = btn.closest(".psi-card");
      const dataBtn = card.querySelector(".data.ativo");
      const horaBtn = card.querySelector(".horarios button.ativo");
      if (!dataBtn || !horaBtn) {
        alert("Selecione uma data e um horário antes de agendar.");
        return;
      }

      const nome = card.querySelector(".psi-dados h3").textContent;
      const cargoText = card.querySelector(".psi-cargo").textContent;
      const area = card.querySelector(".psi-abordagem").textContent;
      const foto = card.querySelector(".psi-foto").src;
      const dataStr = dataBtn.dataset.data; // YYYY-MM-DD
      const dataFormatada = formatarBotaoData(dataStr).replace("<br><b>", " ").replace("</b>", "");
      const hora = horaBtn.textContent;
      const docId = card.dataset.docid;
      const tipo = card.dataset.tipo;
      const uidProf = card.dataset.uid;

      abrirModal({ nome, cargoText, area, foto, dataFormatada, hora, dataStr, docId, uidProf, tipo });
    });

  } catch (err) {
    console.error("Erro ao carregar profissionais:", err);
    psiContainer.innerHTML = `<p style="text-align:center;margin-top:40px;color:gray">Erro ao carregar profissionais. Veja o console.</p>`;
  }
});

/* === FUNÇÕES AUXILIARES === */
function processarDisponibilidade(arrayTimestamps) {
  const dias = {};
  (arrayTimestamps || []).forEach((t) => {
    const data = t?.toDate ? t.toDate() : new Date(t);

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    const dataStr = `${ano}-${mes}-${dia}`;

    const hora = data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!dias[dataStr]) dias[dataStr] = [];
    dias[dataStr].push(hora);
  });
  return dias;
}

function formatarBotaoData(dataStr) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);

  const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  return `${dias[data.getDay()]}<br><b>${String(data.getDate()).padStart(2, "0")} ${meses[data.getMonth()]}</b>`;
}

function gerarHorarios(disponibilidadeFormatada, dataSelecionada) {
  if (!dataSelecionada || !disponibilidadeFormatada[dataSelecionada]) return `<p style="color:gray">Sem horários disponíveis</p>`;
  return disponibilidadeFormatada[dataSelecionada]
    .map((hora) => `<button>${hora}</button>`)
    .join("");
}

/* === MODAL E SALVAMENTO (FUNCIONA PARA PSI E ADV) === */
function abrirModal({ nome, cargoText, area, foto, dataFormatada, hora, dataStr, docId, uidProf, tipo }) {
  let modal = document.getElementById("modalAgendamento");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modalAgendamento";
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <h2>Confirmar Agendamento</h2>
        <div class="psi-modal-info">
          <div class="foto"></div>
          <div class="dados">
            <h3 id="modalNome"></h3>
            <p id="modalCargo"></p>
            <p id="modalArea"></p>
          </div>
        </div>
        <div class="modal-detalhes">
          <p><b>Data:</b> <span id="modalData"></span></p>
          <p><b>Horário:</b> <span id="modalHora"></span></p>
        </div>
        <label for="motivo">Motivo da consulta:</label>
        <input id="motivo" placeholder="Ex: Ansiedade, Depressão, etc" />
        <div class="modal-botoes">
          <button id="confirmarAgendamento">Confirmar</button>
          <button id="cancelarAgendamento">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  // preencher modal
  modal.querySelector(".foto").style.backgroundImage = `url(${foto})`;
  modal.querySelector("#modalNome").textContent = nome;
  modal.querySelector("#modalCargo").textContent = cargoText;
  modal.querySelector("#modalArea").textContent = area;
  modal.querySelector("#modalData").textContent = dataFormatada;
  modal.querySelector("#modalHora").textContent = hora;
  modal.style.display = "flex";

  // fechar
  modal.querySelector("#cancelarAgendamento").onclick = () => (modal.style.display = "none");
  modal.querySelector(".modal-overlay").onclick = () => (modal.style.display = "none");

  // confirmar agendamento (tratamento genérico para psicólogo/advogado)
  modal.querySelector("#confirmarAgendamento").onclick = async () => {
    const motivo = modal.querySelector("#motivo").value.trim();
    if (!motivo) return alert("Por favor, informe o motivo da consulta.");

    // buscar documento da mãe (mesma lógica robusta do seu código anterior)
    async function getMaeDocIdOrFallback() {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado");

      const uid = currentUser.uid;
      const email = currentUser.email;

      // 1) documento com ID == UID
      try {
        const candidateRef = doc(db, "usuarios", uid);
        const candidateSnap = await getDocs(query(collection(db, "usuarios"), where("__name__", "==", uid)));
        // getDocs with where("__name__", "==", uid) is a reliable fallback if getDoc not desired
        // But we will still try getDoc as faster:
        try {
          // tentativa direta de getDoc (sem importar getDoc aqui para não alterar imports) - usamos getDocs fallback
        } catch (e) { }
        if (!candidateSnap.empty) return candidateSnap.docs[0].id;
      } catch (err) {
        // ignore
      }

      // 2) where uid == uid
      try {
        const q1 = query(collection(db, "usuarios"), where("uid", "==", uid));
        const s1 = await getDocs(q1);
        if (!s1.empty) return s1.docs[0].id;
      } catch (err) {
        // ignore
      }

      // 3) where email == email
      if (email) {
        try {
          const q2 = query(collection(db, "usuarios"), where("email", "==", email));
          const s2 = await getDocs(q2);
          if (!s2.empty) return s2.docs[0].id;
        } catch (err) {
          // ignore
        }
      }

      // fallback: retornar null para usar auth.uid diretamente
      return null;
    }

    let maeDocId = null;
    try {
      maeDocId = await getMaeDocIdOrFallback();
    } catch (err) {
      console.error("Erro ao localizar documento da mãe:", err);
      alert("Erro ao localizar a mãe: " + err.message);
      return;
    }

    const maeAuthUid = auth.currentUser?.uid;
    if (!maeAuthUid) {
      alert("Erro: usuário não autenticado.");
      return;
    }

    // montar Date a partir de dataStr (YYYY-MM-DD) e hora (HH:MM)
    const [horaH, horaM] = hora.split(":");
    const dataConsulta = new Date(`${dataStr}T${horaH}:${horaM}:00`);
    const timestampFinal = Timestamp.fromDate(dataConsulta);

    // localizar o docSnapshot na snapGlobal
    const profissionalDoc = snapGlobal.find(d => d.id === docId);
    if (!profissionalDoc) {
      alert("Erro: não foi possível localizar o profissional (snapshot).");
      return;
    }

    const timestampsDisponiveis = profissionalDoc.data().disponibilidade || [];

    // encontrar o timestamp original (compara ano/mês/dia/hora/minutos)
    const timestampOriginal = timestampsDisponiveis.find((t) => {
      const d = t?.toDate ? t.toDate() : new Date(t);
      return (
        d.getFullYear() === dataConsulta.getFullYear() &&
        d.getMonth() === dataConsulta.getMonth() &&
        d.getDate() === dataConsulta.getDate() &&
        d.getHours() === dataConsulta.getHours() &&
        d.getMinutes() === dataConsulta.getMinutes()
      );
    });

    if (!timestampOriginal) {
      alert("Erro: horário não encontrado na disponibilidade original. Pode ter sido reservado por outra pessoa.");
      return;
    }

    try {
      const maeToSave = maeDocId || maeAuthUid;

      // criar documento em Consultas com o campo correto (Psicologo ou Advogado)
      const payload = {
        Mae: maeToSave,
        Datahora: timestampFinal,
        Motivo: motivo,
        Chat: "",
        status: "pendente"
      };
      if (tipo === "psicologo") payload.Psicologo = uidProf;
      else payload.Advogado = uidProf;

      await addDoc(collection(db, "Consultas"), payload);

      // atualizar o documento do profissional respectivo
      const collectionName = tipo === "psicologo" ? "psicologos" : "advogados";
      const profRef = doc(db, collectionName, docId);

      // remover da disponibilidade e adicionar em agendados (mesmo timestampOriginal)
      await updateDoc(profRef, {
        disponibilidade: arrayRemove(timestampOriginal)
      });

      await updateDoc(profRef, {
        agendados: arrayUnion(timestampOriginal)
      });

      alert("✅ Consulta agendada com sucesso!");
      modal.style.display = "none";
      location.reload();
    } catch (err) {
      console.error("Erro ao salvar consulta:", err);
      alert("❌ Erro ao agendar. Tente novamente.");
    }
  };
}
