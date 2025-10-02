import { auth } from "./firebase.js";
import { sendEmailVerification, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const btnReenviar = document.getElementById("reenviar");

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
    window.location.href = "logMae.html";
  }
});
