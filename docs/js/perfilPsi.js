
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const uidParam = params.get("uid"); 


const nomeEl = document.getElementById("perfil-nome");
const tipoEl = document.getElementById("perfil-tipo");
const emailEl = document.getElementById("perfil-email");
const cidadeEl = document.getElementById("perfil-cidade");
const filhosEl = document.getElementById("perfil-filhos");
const empregoEl = document.getElementById("perfil-emprego");
const fotoEl = document.getElementById("perfil-foto");
const postsDiv = document.getElementById("perfil-posts");

if (cidadeEl) cidadeEl.style.display = "none";
if (filhosEl) filhosEl.style.display = "none";
if (empregoEl) empregoEl.style.display = "none";

function normalizePath(url) {
  if (!url) return "./img/avatar_usuario.png";
  try {
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    return url.replace(/^\.\//, "./");
  } catch (_) {
    return "./img/avatar_usuario.png";
  }
}

function formatarDataHora(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) +
    " - " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

async function carregarPerfil() {
  if (!uidParam) return console.warn("nenhum uid passado na query string");

  let docRefId = null;
  let dados = null;

  try {
    
    const snap = await getDoc(doc(db, "psicologos", uidParam));
    if (snap.exists()) {
      docRefId = snap.id;
      dados = snap.data();
    } else {
      
      const q = query(collection(db, "psicologos"), where("uid", "==", uidParam));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        const s = snaps.docs[0];
        docRefId = s.id;
        dados = s.data();
      }
    }

    if (!dados) {
      console.error("Usuário (psicólogo) não encontrado na coleção 'psicologos' para:", uidParam);
      
      nomeEl.textContent = "Perfil não encontrado";
      tipoEl.textContent = "";
      return;
    }

    // preencher
    nomeEl.textContent = dados.nome || "Psicólogo(a)";
    tipoEl.textContent = `CRP: ${dados.crp || "Não informado"}`;
    emailEl.textContent = `Email: ${dados.email || "Não informado"}`;

    const pref = dados.foto || dados.fotoURL || "./img/avatar_usuario.png";
    fotoEl.src = normalizePath(pref);
    fotoEl.onerror = () => { fotoEl.src = "./img/avatar_usuario.png"; };

    // montar info extra
    let extraInfo = "";
    extraInfo += `<p><strong>Área:</strong> ${dados.area || "Não informado"}</p>`;
    extraInfo += `<p><strong>Status:</strong> ${dados.status || "N/D"}</p>`;

    if (Array.isArray(dados.especializacoes) && dados.especializacoes.length) {
      extraInfo += `<p><strong>Especializações:</strong> ${dados.especializacoes.join(", ")}</p>`;
    }

    if (Array.isArray(dados.disponibilidade) && dados.disponibilidade.length) {
      const lista = dados.disponibilidade
        .slice()
        .sort((a, b) => (a.toDate ? a.toDate() : new Date(a)) - (b.toDate ? b.toDate() : new Date(b)))
        .map(t => `<li>${formatarDataHora(t)}</li>`).join("");
      extraInfo += `<p><strong>Disponibilidade:</strong></p><ul style="padding-left:16px">${lista}</ul>`;
    }

    // insere no card (emailEl.parentElement é o .card "Informações")
    const infoCard = emailEl?.parentElement;
    if (infoCard) infoCard.innerHTML = `<h3>Informações</h3>${extraInfo}`;

    // carregar posts usando o campo uid do doc (se existir) — posts normalmente usam autorId == uidAuth
    const autorUid = dados.uid || docRefId; // tenta campo uid, senão usa doc id
    carregarPostsDoAutor(autorUid);

  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

function carregarPostsDoAutor(autorUid) {
  if (!autorUid) {
    postsDiv.innerHTML = "<p>Nenhum post encontrado.</p>";
    return;
  }
  const q = query(collection(db, "posts"), where("autorId", "==", autorUid), orderBy("data", "desc"));
  onSnapshot(q, (snapshot) => {
    postsDiv.innerHTML = "";
    if (snapshot.empty) {
      postsDiv.innerHTML = "<p>Nenhum post ainda.</p>";
      return;
    }
    snapshot.forEach((d) => {
      const p = d.data();
      postsDiv.innerHTML += `<p><strong>${p.titulo}</strong> - ${String(p.conteudo || "").substring(0, 60)}...</p>`;
    });
  }, (err) => {
    console.error("Erro ao carregar posts:", err);
  });
}

carregarPerfil();
