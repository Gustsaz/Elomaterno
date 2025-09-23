// login-psi.js
import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, sendEmailVerification }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const form = document.querySelector('.login-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const crp = form.querySelector('[name="crp"]').value;
  const senha = form.querySelector('[name="senha"]').value;

  try {
    // 1. Buscar o psicólogo no Firestore usando o CRP.
    const psicologosRef = collection(db, "psicologos");
    const q = query(psicologosRef, where("crp", "==", crp));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("CRP não encontrado. Por favor, verifique o número.");
      return;
    }

    // 2. Obter o e-mail do psicólogo a partir do documento encontrado.
    const userData = querySnapshot.docs[0].data();
    const email = userData.email;

    // 3. Fazer o login no Firebase Authentication usando o e-mail e a senha.
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);

    // 4. Se o login for bem-sucedido, verifique se o e-mail foi verificado.
    const user = userCredential.user;
    if (!user.emailVerified) {
      // Se o e-mail não for verificado, avisa o usuário e desloga.
      alert("Por favor, verifique seu e-mail para ativar sua conta.");
      await auth.signOut();
      return;
    }

    // 5. Login com sucesso, exibe mensagem e redireciona para a home.
    alert("Login feito com sucesso!");
    window.location.href = "homePsi.html";

  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    let errorMessage = "Erro ao fazer login. Verifique seu CRP e senha.";
    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Senha incorreta.";
    }
    alert(errorMessage);
  }
});