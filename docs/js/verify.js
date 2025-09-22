// verify.js
import { auth } from "./firebase.js";
import { sendEmailVerification, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const btnReenviar = document.getElementById("reenviar");

// Garante que temos o usuário logado em memória
onAuthStateChanged(auth, (user) => {
  if (user && !user.emailVerified) {
    btnReenviar.addEventListener("click", async () => {
      try {
        await sendEmailVerification(user);
        alert("E-mail de verificação reenviado! Confira sua caixa de entrada.");
      } catch (error) {
        console.error("Erro ao reenviar:", error.code, error.message);
        alert("Erro ao reenviar o e-mail: " + error.message);
      }
    });
  } else {
    // Se já verificou, manda pro login
    window.location.href = "logMae.html";
  }
});
