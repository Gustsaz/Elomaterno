// login-mae.js
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, sendEmailVerification } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

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
      // desloga e manda para página de verificação
      await auth.signOut();
      window.location.href = "verity.html";
      return;
    }

    alert(`Bem-vinda de volta, ${user.email}!`);
    window.location.href = "home.html";
  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    alert("Erro ao fazer login: " + error.message);
  }
});
