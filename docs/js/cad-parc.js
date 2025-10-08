import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const btn = document.getElementById("btnCadastrar");
const msg = document.getElementById("msgCNPJ");
const modal = document.getElementById("modalCNPJ");
const nomeEmpresaModal = document.getElementById("nomeEmpresaModal");
const confirmarCNPJ = document.getElementById("confirmarCNPJ");
const fecharModal = document.getElementById("fecharModal");

let empresaConfirmada = null; // guarda os dados temporariamente

btn.addEventListener("click", async () => {
  const cnpj = document.querySelector('input[name="CNPJ"]').value.trim();
  const email = document.querySelector('input[name="email_corp"]').value.trim();
  const senha = document.querySelector('input[name="senha"]').value.trim();
  const senha2 = document.querySelector('input[name="senha2"]').value.trim();
  const atuacao = document.querySelector('input[name="atuacao"]').value.trim();

  if (!cnpj || !email || !senha || !senha2 || !atuacao) {
    msg.textContent = "Preencha todos os campos.";
    return;
  }

  if (senha !== senha2) {
    msg.textContent = "As senhas não coincidem.";
    return;
  }

 msg.innerHTML = `<span style="font-size: 0.9rem; color: #6b6b6b; font-style: italic;">Verificando CNPJ...</span>`;


  try {
    const r = await fetch("http://localhost:3000/api/validate-cnpj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj })
    });

    const j = await r.json();

    if (!r.ok || !j.ok) {
      msg.textContent = j.message || "❌ CNPJ inválido ou não encontrado.";
      return;
    }

    const nomeEmpresa = j.data.nome || j.data.fantasia || "Sem nome encontrado";
    empresaConfirmada = {
      nome: nomeEmpresa,
      situacao: j.data.situacao,
      cnpj,
      email,
      senha,
      atuacao
    };

    // Mostra o modal para confirmação
    nomeEmpresaModal.innerHTML = `
  <p><strong>Empresa:</strong><br>${nomeEmpresa}</p>
  <p><strong>Situação:</strong> ${j.data.situacao}</p>
`;

    modal.style.display = "flex";

  } catch (err) {
    console.error(err);
    msg.textContent = "Erro ao validar o CNPJ.";
  }
});

// Fecha modal ao clicar no X
fecharModal.addEventListener("click", () => {
  modal.style.display = "none";
  empresaConfirmada = null;
});

// Confirma e cadastra no Firebase
confirmarCNPJ.addEventListener("click", async () => {
  if (!empresaConfirmada) return;

  modal.style.display = "none";
  msg.textContent = "Cadastrando empresa...";

  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      empresaConfirmada.email,
      empresaConfirmada.senha
    );

    await setDoc(doc(db, "parceiros", cred.user.uid), {
      cnpj: empresaConfirmada.cnpj,
      nomeEmpresa: empresaConfirmada.nome,
      email: empresaConfirmada.email,
      atuacao: empresaConfirmada.atuacao,
      situacao: empresaConfirmada.situacao,
      criadoEm: new Date().toISOString(),
    });

    alert("✅ Cadastro confirmado e salvo com sucesso!");
    window.location.href = "homeParc.html";
  } catch (err) {
    console.error(err);
    msg.textContent = "Erro ao cadastrar: " + err.message;
  }
});
