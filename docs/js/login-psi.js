import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc
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
    let email = crp;

    
    if (!crp.includes("@")) {
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

    
    const login = await signInWithEmailAndPassword(auth, email, senha);
    const user = login.user;

    
    const ref = doc(db, "psicologos", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, {
        "extras.login_load.psicologo": true
      });
    }

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


function customPrompt(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'popup custom-alert';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.tabIndex = -1;

    const msg = document.createElement('div');
    msg.className = 'alert-msg';
    msg.textContent = message;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'alert-input';
    input.style.width = '100%';
    input.style.marginTop = '10px';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';

    const actions = document.createElement('div');
    actions.className = 'alert-actions';
    actions.style.marginTop = '15px';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'btn secondary';
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.marginRight = '10px';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = 'btn primary';
    btnOk.textContent = 'OK';

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);

    content.appendChild(msg);
    content.appendChild(input);
    content.appendChild(actions);
    overlay.appendChild(content);

    function closeModal() {
      document.body.removeChild(overlay);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    function onOk() {
      closeModal();
      resolve(input.value);
    }

    function onCancel() {
      closeModal();
      resolve(null);
    }

    function onKeyDown(e) {
      if (e.key === 'Enter') {
        onOk();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    }

    function overlayClick(e) {
      if (!content.contains(e.target)) {
        onCancel();
      }
    }

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);

    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
    overlay.addEventListener('click', overlayClick);

    setTimeout(() => {
      input.focus();
    }, 30);
  });
}


const forgotLink = document.getElementById("forgot-password");

forgotLink.addEventListener("click", async (e) => {
  e.preventDefault();

  const crp = await customPrompt("Digite seu CRP para redefinir a senha:");

  if (!crp || crp.trim() === "") {
    alert("CRP é obrigatório.");
    return;
  }

  try {
    const crpTrim = crp.trim();

    // Buscar email pelo CRP
    const psicologosRef = collection(db, "psicologos");
    const q = query(psicologosRef, where("crp", "==", crpTrim));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("CRP não encontrado.");
      return;
    }

    const userData = querySnapshot.docs[0].data();
    const email = userData.email;

    if (userData.status !== "aprovado") {
      alert("Sua conta ainda está em análise.");
      return;
    }

    
    await sendPasswordResetEmail(auth, email);

    alert("Email de redefinição de senha enviado! Verifique sua caixa de entrada.");

  } catch (error) {
    console.error("Erro ao enviar email de reset:", error);
    let msg = "Erro ao enviar email de redefinição.";
    if (error.code === "auth/invalid-email") msg = "Email inválido.";
    if (error.code === "auth/user-not-found") msg = "Conta não encontrada.";
    alert(msg);
  }
});
