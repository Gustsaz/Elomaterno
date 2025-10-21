import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const form = document.querySelector(".login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const crp = form.querySelector('[name="crp"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;

  if (!crp || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    let email = crp; // caso o usuário tenha digitado o email diretamente

    if (!crp.includes("@")) {
      // busca o email pelo CRP
      const psicologosRef = collection(db, "psicologos");
      const q = query(psicologosRef, where("crp", "==", crp));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("CRP não encontrado.");
        return;
      }

      const userData = querySnapshot.docs[0].data();
      email = userData.email;

      if (userData.status !== "aprovado") {
        alert("Sua conta ainda está em análise.");
        return;
      }
    }

    await signInWithEmailAndPassword(auth, email, senha);
    alert("Login realizado com sucesso!");
    window.location.href = "homePsi.html";

  } catch (error) {
    console.error("Erro no login:", error);
    let msg = "Erro ao fazer login.";
    if (error.code === "auth/wrong-password") msg = "Senha incorreta.";
    if (error.code === "auth/user-not-found") msg = "Conta não encontrada.";
    alert(msg);
  }
});
