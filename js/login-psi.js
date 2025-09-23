import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, sendEmailVerification }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js"; 

const form = document.querySelector('.login-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const crp = form.querySelector('[name="crp"]').value;
  const senha = form.querySelector('[name="senha"]').value;

  try {
    const psicologosRef = collection(db, "psicologos");
    const q = query(psicologosRef, where("crp", "==", crp));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showPopup("CRP não encontrado. Por favor, verifique o número.");
      return;
    }

    const userData = querySnapshot.docs[0].data();
    const email = userData.email;
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    if (!user.emailVerified) {
      showPopup("Por favor, verifique seu e-mail para ativar sua conta.");
      await auth.signOut();
      return;
    }

    showPopup("Login feito com sucesso!");
    setTimeout(() => {
      window.location.href = "homePsi.html";
    }, 2000);

  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    let errorMessage = "Erro ao fazer login. Verifique seu CRP e senha.";
    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Senha incorreta.";
    }
    showPopup(errorMessage);
  }
});
