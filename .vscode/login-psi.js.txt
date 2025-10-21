import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, query, where, getDocs } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js";

const form = document.querySelector(".login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const crp = form.querySelector('[name="crp"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;

  if (!crp || !senha) {
    showPopup("Preencha todos os campos.");
    return;
  }

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
    const status = userData.status;

    // Verifica se a conta foi aprovada
    if (status !== "aprovado") {
      showPopup(
        "Sua conta ainda está em análise. Aguarde a verificação da equipe antes de acessar o sistema."
      );
      return;
    }

    // Login liberado
    await signInWithEmailAndPassword(auth, email, senha);
    showPopup(`Bem-vindo(a), ${userData.nome || email}!`);
    setTimeout(() => {
      window.location.href = "homePsi.html";
    }, 2000);

  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    let msg = "Erro ao fazer login.";

    switch (error.code) {
      case "auth/wrong-password":
        msg = "Senha incorreta.";
        break;
      case "auth/user-not-found":
        msg = "Conta não encontrada.";
        break;
    }

    showPopup(msg);
  }
});
