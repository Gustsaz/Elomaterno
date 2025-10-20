import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, setDoc } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js";

const form = document.querySelector(".cadastro-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = form.querySelector('[name="nome"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const crp = form.querySelector('[name="crp"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (!nome || !email || !crp || !senha || !senha2) {
    showPopup("Preencha todos os campos para continuar.");
    return;
  }

  if (senha !== senha2) {
    showPopup("As senhas não coincidem. Digite novamente.");
    return;
  }

  try {
    // Cria o usuário no Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Salva dados no Firestore com status pendente
    await setDoc(doc(db, "psicologos", user.uid), {
      nome: nome,
      email: email,
      crp: crp,
      status: "pendente", // 🔒 bloqueado até aprovação manual
      tipo: "psicologo",
      dataCadastro: new Date().toISOString()
    });

    // Mostra instrução personalizada
    showPopup(
      `Cadastro realizado com sucesso! 
      Envie uma foto da sua carteirinha do CRP para o e-mail: 
      <b>eloomaterno@gmail.com</b> com o assunto: 
      "Verificação CRP - ${nome}". 
      Assim que for validado, liberaremos seu acesso.`
    );

    // Redireciona ou limpa formulário
    setTimeout(() => {
      window.location.href = "logPsi.html";
    }, 5000);

  } catch (error) {
    console.error("Erro no cadastro:", error.code, error.message);
    let msg = "Erro ao realizar o cadastro. Tente novamente.";

    switch (error.code) {
      case "auth/email-already-in-use":
        msg = "Este e-mail já está em uso.";
        break;
      case "auth/invalid-email":
        msg = "E-mail inválido.";
        break;
      case "auth/weak-password":
        msg = "A senha deve ter pelo menos 6 caracteres.";
        break;
    }

    showPopup(msg);
  }
});
