// cadastro-mae.js
import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, setDoc } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const form = document.querySelector('.cadastro-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = form.querySelector('[name="nome"]').value;
  const email = form.querySelector('[name="email"]').value;
  const telefone = form.querySelector('[name="telefone"]').value;
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (senha !== senha2) {
    alert("As senhas não coincidem!");
    return;
  }

  try {
    // Criar usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Salvar dados adicionais no Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      nome: nome,
      email: email,
      telefone: telefone,
      tipo: "mae"
    });

    // Enviar e-mail de verificação
    await sendEmailVerification(user, {
      url: "http://localhost:5500/home.html", // ajuste para sua URL real
      handleCodeInApp: false
    });

    alert("Cadastro realizado com sucesso! Verifique seu e-mail para ativar a conta.");
    // Não redireciona ainda → só depois de confirmar o e-mail
    window.location.href = "logMae.html";
  } catch (error) {
    console.error("Erro no cadastro:", error.code, error.message);
    alert(`Erro ao realizar o cadastro: ${error.message}`);
  }
});
