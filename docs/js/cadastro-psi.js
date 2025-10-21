import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const form = document.querySelector(".cadastro-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = form.querySelector('[name="nome"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const crp = form.querySelector('[name="crp"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (!nome || !email || !crp || !senha || !senha2) {
    alert("Preencha todos os campos.");
    return;
  }

  if (senha !== senha2) {
    alert("As senhas não coincidem.");
    return;
  }

  // 🔍 Verifica se o CRP já existe
  const psicologosRef = collection(db, "psicologos");
  const q = query(psicologosRef, where("crp", "==", crp));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    alert("Este CRP já está cadastrado.");
    return;
  }

  // ✅ Validação do CRP com API pública
  try {
    const resposta = await fetch(`https://api.crpapi.vercel.app/validate?crp=${crp}`);
    const dados = await resposta.json();

    if (!dados.valido) {
      alert("CRP inválido. Verifique o número digitado.");
      return;
    }

    // Preenche automaticamente o nome se vier da API
    if (dados.nome && !nome) {
      form.querySelector('[name="nome"]').value = dados.nome;
    }

  } catch (error) {
    console.warn("Não foi possível validar o CRP automaticamente:", error);
  }

  try {
    // Cria o usuário no Auth
    const cred = await createUserWithEmailAndPassword(auth, email, senha);

    // Cria no Firestore
    await addDoc(collection(db, "psicologos"), {
      nome,
      email,
      crp,
      tipo: "psicologo",
      status: "pendente", // Pode ser "pendente" até ser validado manualmente
      uid: cred.user.uid
    });

    alert("Cadastro realizado! Aguarde a aprovação da sua conta.");
    window.location.href = "logPsi.html";

  } catch (error) {
    console.error("Erro ao cadastrar:", error);
    let msg = "Erro ao cadastrar.";
    if (error.code === "auth/email-already-in-use") msg = "Email já cadastrado.";
    if (error.code === "auth/weak-password") msg = "Senha muito fraca.";
    alert(msg);
  }
});
