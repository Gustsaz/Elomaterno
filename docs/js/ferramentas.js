import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { showPopup } from "./popup.js";

/*ESQUECI SENHA*/
const modal = document.getElementById("resetModal");
const closeModal = document.getElementById("closeModal");
const resetEmailInput = document.getElementById("resetEmail");
const sendResetBtn = document.getElementById("sendReset");

// Botão "Esqueci minha senha"
const forgotBtn = document.getElementById("forgot-pass");

if (forgotBtn) {
    forgotBtn.addEventListener("click", (e) => {
        e.preventDefault();

        // Pega email já escrito no login
        const emailLogin = document.querySelector('[name="email"]').value.trim();
        resetEmailInput.value = emailLogin;

        modal.classList.remove("hidden");
    });
}

// Fechar modal
closeModal.addEventListener("click", () => modal.classList.add("hidden"));

// Enviar reset
sendResetBtn.addEventListener("click", async () => {
    const email = resetEmailInput.value.trim();
    if (!email) {
        showPopup("Digite um e-mail válido.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showPopup("Enviamos o link para redefinir sua senha!");
        modal.classList.add("hidden");
    } catch (err) {
        console.error("Erro reset:", err.code, err.message);
        let msg = "Erro ao processar.";
        if (err.code === "auth/user-not-found") msg = "Conta não encontrada.";
        else if (err.code === "auth/invalid-email") msg = "E-mail inválido.";
        showPopup(msg);
    }
});

/*Visualizar senha*/

const senhaInput = document.getElementById("senha");
const togglePass = document.getElementById("togglePass");

if (togglePass && senhaInput) {
  togglePass.addEventListener("click", () => {
    const isPassword = senhaInput.type === "password";
    senhaInput.type = isPassword ? "text" : "password";
    togglePass.classList.toggle("fa-eye");
    togglePass.classList.toggle("fa-eye-slash");
  });
}
