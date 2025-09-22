import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

const nomeEl = document.querySelector(".perfil-info h2");
const tagEl = document.querySelector(".perfil-tag");
const emailEl = document.querySelector(".card p:nth-of-type(1)");
const cidadeEl = document.querySelector(".card p:nth-of-type(2)");
const filhosEl = document.querySelector(".card p:nth-of-type(3)");
const fotoEl = document.getElementById("perfil-foto");
const btnEditar = document.querySelector(".btn-editar");

// Modal
const modal = document.getElementById("modal-editar");
const formEditar = document.getElementById("form-editar");
const inputNome = document.getElementById("nome");
const inputCidade = document.getElementById("cidade");
const inputFilhos = document.getElementById("filhos");
const inputFoto = document.getElementById("foto");
const btnCancelar = document.getElementById("cancelar");

let usuarioRef;
const storage = getStorage();

// ------------------- CARREGAR PERFIL -------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioRef = doc(db, "usuarios", user.uid);

    try {
      const snap = await getDoc(usuarioRef);

      if (snap.exists()) {
        const dados = snap.data();

        nomeEl.textContent = dados.nome || "Usuário sem nome";
        tagEl.textContent = dados.tipo || "Usuário";
        emailEl.textContent = `Email: ${dados.email}`;
        cidadeEl.textContent = `Cidade: ${dados.cidade || "Não informada"}`;
        filhosEl.textContent = `Filhos: ${dados.filhos || "Não informado"}`;

        if (dados.fotoURL) {
          fotoEl.src = dados.fotoURL;
        }
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  } else {
    window.location.href = "logMae.html";
  }
});

// ------------------- ABRIR MODAL -------------------
btnEditar.addEventListener("click", () => {
  inputNome.value = nomeEl.textContent;
  inputCidade.value = cidadeEl.textContent.replace("Cidade: ", "");
  inputFilhos.value = filhosEl.textContent.replace("Filhos: ", "");
  inputFoto.value = ""; // limpa o campo
  modal.style.display = "flex";
});

// ------------------- CANCELAR -------------------
btnCancelar.addEventListener("click", () => {
  modal.style.display = "none";
});

// ------------------- SALVAR -------------------
formEditar.addEventListener("submit", async (e) => {
  e.preventDefault();

  const novoNome = inputNome.value.trim();
  const novaCidade = inputCidade.value.trim();
  const novosFilhos = inputFilhos.value.trim();

  let fotoURL;

  try {
    // Upload da foto, se o usuário escolheu
    if (inputFoto.files.length > 0) {
      const arquivo = inputFoto.files[0];
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}.jpg`);
      await uploadBytes(storageRef, arquivo);
      fotoURL = await getDownloadURL(storageRef);
    }

    // Atualiza no Firestore
    const updateData = {
      nome: novoNome,
      cidade: novaCidade,
      filhos: novosFilhos
    };

    if (fotoURL) {
      updateData.fotoURL = fotoURL;
    }

    await updateDoc(usuarioRef, updateData);

    alert("Perfil atualizado com sucesso!");

    // Atualiza na tela
    nomeEl.textContent = novoNome;
    cidadeEl.textContent = `Cidade: ${novaCidade}`;
    filhosEl.textContent = `Filhos: ${novosFilhos}`;
    if (fotoURL) {
      fotoEl.src = fotoURL;
    }

    modal.style.display = "none";
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    alert("Erro ao salvar alterações.");
  }
});
