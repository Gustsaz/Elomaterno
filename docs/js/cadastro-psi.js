// cadastro-psi.js
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
  const crp = form.querySelector('[name="crp"]').value;
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (senha !== senha2) {
    alert("As senhas não coincidem!");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    await setDoc(doc(db, "psicologos", user.uid), {
      nome: nome,
      email: email,
      crp: crp,
      tipo: "psicologo"
    });

    await sendEmailVerification(user, {
      url: "http://localhost:5500/formPsi.html",
      handleCodeInApp: false
    });

    alert("Cadastro realizado com sucesso! Verifique seu e-mail para ativar a conta.");
    window.location.href = "formPsi.html";
  } catch (error) {
    console.error("Erro no cadastro:", error.code, error.message);
    alert("Erro ao cadastrar: " + error.message);
  }
});