import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, setDoc } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js"; 

const form = document.querySelector('.cadastro-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = form.querySelector('[name="nome"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const telefone = form.querySelector('[name="telefone"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (senha !== senha2) {
    showPopup("As senhas não coincidem. Digite novamente.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Agora já salva avatar como null
    await setDoc(doc(db, "usuarios", user.uid), {
      nome: nome,
      email: email,
      telefone: telefone,
      tipo: "mae",
      avatar: null
    });

    await sendEmailVerification(user, {
      url: "http://localhost:5500/home.html",
      handleCodeInApp: false
    });

    showPopup("Cadastro realizado com sucesso! Verifique sua caixa de e-mail (ou spam) para ativar sua conta.");
    setTimeout(() => {
      window.location.href = "logMae.html";
    }, 2500);

  } catch (error) {
    console.error("Erro no cadastro:", error.code, error.message);

    let mensagemAmigavel;
    switch (error.code) {
      case "auth/email-already-in-use":
        mensagemAmigavel = "Este e-mail já está em uso.";
        break;
      case "auth/invalid-email":
        mensagemAmigavel = "O e-mail informado não é válido.";
        break;
      case "auth/weak-password":
        mensagemAmigavel = "A senha deve ter pelo menos 6 caracteres.";
        break;
      default:
        mensagemAmigavel = "Erro ao realizar o cadastro. Por favor, tente novamente.";
    }
    showPopup(mensagemAmigavel);
  }
});
