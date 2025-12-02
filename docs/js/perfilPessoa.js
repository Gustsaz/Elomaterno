import { db } from "./firebase.js";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const uid = params.get("uid");

const nomeEl = document.getElementById("perfil-nome");
const tipoEl = document.getElementById("perfil-tipo");
const emailEl = document.getElementById("perfil-email");
const cidadeEl = document.getElementById("perfil-cidade");
const filhosEl = document.getElementById("perfil-filhos");
const empregoEl = document.getElementById("perfil-emprego");
const fotoEl = document.getElementById("perfil-foto");
const postsDiv = document.getElementById("perfil-posts");

function normalizePath(url) {
  if (!url) return "./img/avatar_usuario.png";
  try {
    
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    
    return url.replace(/^\.\//, "./");
  } catch (_) {
    return "./img/avatar_usuario.png";
  }
}

async function carregarPerfil() {
  console.log("Iniciando carregamento do perfil, uid:", uid);
  if (!uid) {
    console.log("Uid não encontrado na URL");
    return;
  }

  try {
    let dados;
    
    console.log("Carregando dados do perfil dos usuarios");
    const snapUser = await getDoc(doc(db, "usuarios", uid));
    console.log("snapUser.exists():", snapUser.exists());
    if (snapUser.exists()) {
      dados = snapUser.data();
      console.log("Dados do usuário carregados:", dados);
    } else {
      console.log("Perfil não encontrado em usuarios");
      
      console.log("Tentando carregando de advogados");
      const snapAdv = await getDoc(doc(db, "advogados", uid));
      if (snapAdv.exists()) {
        dados = snapAdv.data();
        console.log("Dados do advogado carregados:", dados);
      } else {
        console.log("Perfil não encontrado");
        return;
      }
    }

    nomeEl.textContent = dados.nome || "Usuário sem nome";
    tipoEl.textContent = dados.tipo || "Usuário";
    emailEl.textContent = `Email: ${dados.email || "Não informado"}`;
    cidadeEl.textContent = `Cidade: ${dados.cidade || "Não informada"}`;
    filhosEl.textContent = `Filhos: ${dados.filhos || "Não informado"}`;
    empregoEl.textContent = `Emprego: ${dados.emprego || "Não informado"}`;

    
    if (dados.tipo === "advogado") {
      console.log("Usuario é advogado, tentando carregar avatar de advogados");
      let dadosAdv = null;
      
      const snapAdv = await getDoc(doc(db, "advogados", uid));
      if (snapAdv.exists()) {
        dadosAdv = snapAdv.data();
        console.log("Dados do advogado para avatar (por ID):", dadosAdv);
      } else {
        
        console.log("Documento com ID não encontrado, tentando query por uid");
        const q = query(collection(db, "advogados"), where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          dadosAdv = querySnapshot.docs[0].data();
          console.log("Dados do advogado para avatar (por query):", dadosAdv);
        } else {
          console.log("Nenhum documento encontrado para avatar");
        }
      }
      if (dadosAdv && dadosAdv.avatar) {
        console.log("Definindo avatar de advogado:", dadosAdv.avatar);
        fotoEl.src = normalizePath(dadosAdv.avatar);
      } else {
        console.log("Avatar de advogado não encontrado, usando padrão");
        fotoEl.src = "./img/avatar_usuario.png";
      }
    } else {
      const preferido = dados.fotoURL || dados.avatar || "";
      console.log("Definindo avatar padrão:", preferido);
      fotoEl.src = normalizePath(preferido);
    }
    fotoEl.onerror = () => { fotoEl.src = "./img/avatar_usuario.png"; };
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
