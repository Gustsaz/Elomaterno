import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, sendEmailVerification } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { showPopup } from "./popup.js"; 

const form = document.querySelector('.login-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.querySelector('[name="email"]').value;
  const senha = form.querySelector('[name="senha"]').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await sendEmailVerification(user);
      await auth.signOut();
      showPopup("Por favor, verifique seu e-mail para ativar sua conta.");
      return;
    }

    showPopup(`Bem-vinda de volta, ${user.email}!`);
    setTimeout(() => {
      window.location.href = "home.html";
    }, 2000);

  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    showPopup("Erro ao fazer login: " + error.message);
  }
});
