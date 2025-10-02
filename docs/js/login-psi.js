import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, sendEmailVerification }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js"; 

const form = document.querySelector('.login-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const crp = form.querySelector('[name="crp"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;

  try {
    const psicologosRef = collection(db, "psicologos");
    const q = query(psicologosRef, where("crp", "==", crp));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showPopup("CRP não encontrado. Verifique o número informado.");
      return;
    }

    const userData = querySnapshot.docs[0].data();
    const email = userData.email;

    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await sendEmailVerification(user);
      await auth.signOut();
      showPopup("Sua conta ainda não foi ativada. Verifique seu e-mail (ou a pasta de spam) para confirmar o cadastro.");
      return;
    }

    const nome = userData.nome ? userData.nome : email;

    showPopup(`Bem-vindo(a) de volta, ${nome}!`);
    setTimeout(() => {
      window.location.href = "homePsi.html";
    }, 2000);

  } catch (error) {
    console.error("Erro no login:", error.code, error.message);

    let mensagemAmigavel = "Erro ao fazer login. Verifique seu CRP e senha.";

    switch (error.code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        mensagemAmigavel = "Senha incorreta. Tente novamente.";
        break;
      case "auth/user-not-found":
        mensagemAmigavel = "Conta não encontrada. Verifique seus dados.";
        break;
      case "auth/invalid-email":
        mensagemAmigavel = "E-mail associado ao CRP não é válido.";
        break;
      case "auth/missing-password":
        mensagemAmigavel = "Digite sua senha para continuar.";
        break;
      default:
        mensagemAmigavel = "Erro ao fazer login. Por favor, tente novamente.";
    }

    showPopup(mensagemAmigavel);
  }
});