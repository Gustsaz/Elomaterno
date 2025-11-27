// ./js/consultas.js
import { auth, db } from "./firebase.js";
import {
    doc,
    getDocs,
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* === ELEMENTOS === */
const tabAgendadas = document.getElementById("agendadas");
const tabRealizadas = document.getElementById("realizadas");
const tabCanceladas = document.getElementById("canceladas");
const tabs = document.querySelectorAll(".tab");

/* === SISTEMA DE ABAS === */
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("ativo"));
        document.querySelectorAll(".conteudo-tab").forEach(c => c.classList.remove("ativo"));

        tab.classList.add("ativo");
        const target = tab.dataset.tab;
        document.getElementById(target)?.classList.add("ativo");
    });
});

/* === MODAL (dinâmico) === */
const modal = document.createElement("div");
modal.className = "modal hidden";
modal.innerHTML = `
  <div class="modal-content detalhes-psi-modal">
    <button class="close-modal" title="Fechar">&times;</button>
    <img id="prof-foto-modal" class="psi-foto-modal" src="./img/avatar_usuario.png" alt="Foto profissional">
    <h2 id="prof-nome-modal"></h2>
    <p id="prof-email-modal"></p>
    <p id="prof-id-modal"></p>
    <p id="prof-area-modal"></p>
    <p id="prof-espec-modal"></p>
  </div>
`;
document.body.appendChild(modal);
modal.querySelector(".close-modal")?.addEventListener("click", () => modal.classList.add("hidden"));

modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
});


/* === HELPERS === */
function gerarBadge(status) {
    if (status === "pendente") return `<span class="badge badge-pendente">Pendente</span>`;
    if (status === "aceito") return `<span class="badge badge-aceito">Agendada</span>`;
    if (status === "realizado") return `<span class="badge badge-realizado">Realizada</span>`;
    if (status === "negado") return `<span class="badge badge-negado">Negada</span>`;
    return "";
}

function formatDataHora(timestamp) {
    if (!timestamp) return "";
    try {
        const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) +
            " às " +
            d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

/* === ABRIR MODAL DO PROFISSIONAL (psicologo ou advogado) === */
async function abrirModalProfissionalByUidAndType(uid, tipo) {
    try {
        const collectionName = tipo === "psicologo" ? "psicologos" : "advogados";
        const q = query(collection(db, collectionName), where("uid", "==", uid));
        const snap = await getDocs(q);
        if (snap.empty) return alert("Informações do profissional não encontradas.");

        const data = snap.docs[0].data();

        document.getElementById("prof-nome-modal").textContent = data.nome || "—";
        document.getElementById("prof-email-modal").textContent = data.email ? `Email: ${data.email}` : "";
        document.getElementById("prof-id-modal").textContent = tipo === "psicologo" ? (data.crp ? `CRP: ${data.crp}` : "") : (data.oab ? `OAB: ${data.oab}` : "");
        document.getElementById("prof-area-modal").textContent = data.area ? `Área: ${data.area}` : (data.atuacao ? `Atuação: ${data.atuacao}` : "");
        document.getElementById("prof-foto-modal").src = data.foto || "./img/avatar_usuario.png";
        document.getElementById("prof-espec-modal").textContent =
            Array.isArray(data.especializacoes) && data.especializacoes.length
                ? "Especializações: " + data.especializacoes.join(", ")
                : "";

        modal.classList.remove("hidden");
    } catch (err) {
        console.error("Erro ao abrir modal do profissional:", err);
        alert("Erro ao carregar dados do profissional. Veja o console.");
    }
}

/* === RENDER DE CARTÕES (insere dentro das abas corretas) === */
function limparAbasPadrao() {
    tabAgendadas.innerHTML = `
        <div class="loading-consultas">
            <div class="avatar-loader-container">
                <img id="perfil-avatar-temp">
                <div class="loader">
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        </div>
    `;

    tabRealizadas.innerHTML = `<div class="loading-consultas">
        <div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    </div>`;

    tabCanceladas.innerHTML = `<div class="loading-consultas">
        <div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    </div>`;
}

function ouvirConsultasDaMae(uidMae) {
    const q = query(collection(db, "Consultas"), where("Mae", "==", uidMae));

    onSnapshot(q, async (snapshot) => {
        tabAgendadas.innerHTML = "";
        tabRealizadas.innerHTML = "";
        tabCanceladas.innerHTML = "";

        if (snapshot.empty) {
            tabAgendadas.innerHTML = `
                <img src="./img/consultas-ilustracao.png" class="consulta-img">
                <h2>Você não tem consultas agendadas</h2>
                <p>Estamos aqui para te ajudar, agende uma consulta para manter em dia o bem-estar.</p>
                <a href="consulta-lista-psi.html"><button class="agendar-btn">Agendar consulta</button></a>
            `;
            tabRealizadas.innerHTML = `<h2>Você ainda não realizou nenhuma consulta</h2>`;
            tabCanceladas.innerHTML = `<h2>Você não possui consultas canceladas</h2>`;
            return;
        }

        const arr = [];
        snapshot.forEach(snapDoc => {
            arr.push({ id: snapDoc.id, ...snapDoc.data() });
        });

        arr.sort((a, b) => {
            const ta = a.Datahora?.toMillis ? a.Datahora.toMillis() : (a.Datahora?.seconds || 0);
            const tb = b.Datahora?.toMillis ? b.Datahora.toMillis() : (b.Datahora?.seconds || 0);
            return ta - tb;
        });

        let temAgendadas = false;

        arr.forEach(c => {
            const dataFormatada = formatDataHora(c.Datahora);

            // determinar tipo e uid do profissional do card
            const uidPsi = c.Psicologo || null;
            const uidAdv = c.Advogado || null;
            const profissionalUid = uidPsi || uidAdv || "";
            const tipo = uidPsi ? "psicologo" : (uidAdv ? "advogado" : null);

            const card = document.createElement("div");
            card.className = "consulta-card";
            card.innerHTML = `
                <div class="consulta-header">
                    <h3>${dataFormatada}</h3>
                    ${gerarBadge(c.status)}
                </div>
                <p><strong>Motivo:</strong> ${c.Motivo || "—"}</p>
                <div style="display:flex;gap:8px;margin-top:8px;">
                    ${profissionalUid ? `<button class="btn-detalhes" data-uid="${profissionalUid}" data-tipo="${tipo}">Detalhes do profissional</button>` : ""}
                    ${profissionalUid ? `<button class="btn-chat" data-uid="${profissionalUid}" data-tipo="${tipo}">Abrir chat</button>` : ""}
                </div>
            `;

            if (["pendente", "aceito"].includes(c.status)) {
                temAgendadas = true;
                tabAgendadas.appendChild(card);
            } else if (c.status === "realizado") {
                tabRealizadas.appendChild(card);
            } else if (c.status === "negado") {
                tabCanceladas.appendChild(card);
            }
        });

        // Se não houver agendadas (mesmo com snapshot não vazio)
        if (!temAgendadas) {
            tabAgendadas.innerHTML = `
                <img src="./img/consultas-ilustracao.png" class="consulta-img">
                <h2>Você não tem consultas agendadas</h2>
                <p>Estamos aqui para te ajudar, agende uma consulta para manter em dia o bem-estar.</p>
                <a href="consulta-lista-psi.html"><button class="agendar-btn">Agendar consulta</button></a>
            `;
        }

        // --- helper local: adiciona o botão depois do último .consulta-card do container ---
        function appendMakeMoreButton(container) {
            // remove se já existir para evitar duplicação
            const existing = container.querySelector('.fazer-outros-wrapper');
            if (existing) existing.remove();

            // só adiciona se existir ao menos um card
            if (!container.querySelector('.consulta-card')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'fazer-outros-wrapper';
            wrapper.innerHTML = `
                <a class="fazer-outros-link" href="consulta-lista-psi.html" aria-label="Fazer outros agendamentos">
                    <button type="button" class="fazer-outros-btn">Fazer outros agendamentos</button>
                </a>
            `;

            const lastCard = container.querySelector('.consulta-card:last-of-type');
            if (lastCard) lastCard.insertAdjacentElement('afterend', wrapper);
            else container.appendChild(wrapper);
        }

        // adiciona o botão em cada aba que tiver cards
        appendMakeMoreButton(tabAgendadas);
        appendMakeMoreButton(tabRealizadas);
        appendMakeMoreButton(tabCanceladas);
    });
}


/* === CLIQUES GLOBAIS (botões dentro dos cards) === */
document.addEventListener("click", (e) => {
    const btnDetalhes = e.target.closest(".btn-detalhes");
    if (btnDetalhes) {
        const uid = btnDetalhes.dataset.uid;
        const tipo = btnDetalhes.dataset.tipo || "psicologo";
        if (uid) abrirModalProfissionalByUidAndType(uid, tipo);
        return;
    }

    const btnChat = e.target.closest(".btn-chat");
    if (btnChat) {
        const uid = btnChat.dataset.uid;
        const tipo = btnChat.dataset.tipo || "psicologo";
        if (uid) {
            // redireciona para chat com query params contendo uid e tipo (se quiser diferenciar)
            window.location.href = `chat.html?uid=${encodeURIComponent(uid)}&tipo=${encodeURIComponent(tipo)}`;
        }
        return;
    }
});

/* === PEGAR UID DO USUÁRIO AUTENTICADO === */
auth.onAuthStateChanged((user) => {
    if (!user) {
        console.warn("Usuário não autenticado — carregamento de consultas pausado.");
        return;
    }

    console.log("Consultas: UID da mãe logada:", user.uid);
    ouvirConsultasDaMae(user.uid);
});
