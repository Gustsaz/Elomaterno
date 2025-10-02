import { db } from "./firebase.js";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const uid = params.get("uid");

const nomeEl = document.getElementById("perfil-nome");
const tipoEl = document.getElementById("perfil-tipo");
const emailEl = document.getElementById("perfil-email");
const cidadeEl = document.getElementById("perfil-cidade");
const filhosEl = document.getElementById("perfil-filhos");
const fotoEl = document.getElementById("perfil-foto");
const postsDiv = document.getElementById("perfil-posts");

async function carregarPerfil() {
  if (!uid) return;

  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    if (snap.exists()) {
      const dados = snap.data();

      nomeEl.textContent = dados.nome || "Usuário sem nome";
      tipoEl.textContent = dados.tipo || "Usuário";
      emailEl.textContent = `Email: ${dados.email || "Não informado"}`;
      cidadeEl.textContent = `Cidade: ${dados.cidade || "Não informada"}`;
      filhosEl.textContent = `Filhos: ${dados.filhos || "Não informado"}`;

      if (dados.avatar) {
        fotoEl.src = normalizePath(dados.avatar);
      } else {
        fotoEl.src = "./img/avatar_usuario.png";
      }      
    } else {
      console.log("Usuário não encontrado");
    }
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
  }
}

function carregarPosts() {
  if (!uid) return;

  const q = query(
    collection(db, "posts"),
    where("autorId", "==", uid),
    orderBy("data", "desc")
  );

  onSnapshot(q, (snapshot) => {
    postsDiv.innerHTML = "";
    if (snapshot.empty) {
      postsDiv.innerHTML = "<p>Nenhum post ainda.</p>";
      return;
    }
    snapshot.forEach((doc) => {
      const p = doc.data();
      postsDiv.innerHTML += `
        <p><strong>${p.titulo}</strong> - ${p.conteudo.substring(0, 50)}...</p>
      `;
    });
  });
}

carregarPerfil();
carregarPosts();