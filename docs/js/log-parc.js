import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const form = document.querySelector(".login-form");
const msgPopup = document.createElement("p");
msgPopup.style.color = "#6b6b6b";
msgPopup.style.fontSize = "0.9rem";
msgPopup.style.marginTop = "10px";
form.appendChild(msgPopup);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cnpj = document.querySelector('input[name="CNPJ"]').value.trim();
  const senha = document.querySelector('input[name="senha"]').value.trim();

  if (!cnpj || !senha) {
    msgPopup.textContent = "Preencha todos os campos.";
    return;
  }

  msgPopup.innerHTML = `<span style="font-size: 0.85rem; color: #6b6b6b; font-style: italic;">Verificando dados...</span>`;

  try {
    const parceirosRef = collection(db, "parceiros");
    const q = query(parceirosRef, where("cnpj", "==", cnpj));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      msgPopup.textContent = "❌ CNPJ não encontrado.";
      return;
    }

    let emailEncontrado = "";
    let uidParceiro = "";

    querySnapshot.forEach((docu) => {
      emailEncontrado = docu.data().email;
      uidParceiro = docu.id;
    });

    // Login com e-mail e senha
    const login = await signInWithEmailAndPassword(auth, emailEncontrado, senha);
    const user = login.user;

    // Referência ao documento do usuário
    const userRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(userRef);

    
    if (!snap.exists()) {
      await setDoc(userRef, {
        nome: emailEncontrado,
        email: emailEncontrado,
        telefone: "",
        tipo: "parceiro",
        avatar: null,
        extras: {
          login_load: {
            mae: false,
            parceiro: true,
            advogado: false,
            psicologo: false
          },
          consult_load: false,
          termos_load: false,
          fonte_number: 1,
          dark_mode: false,
          espacamento_number: 1,
          filtro_daltonismo: "Filtros_daltonismo",
          leitura_voz: false,
          letras_destaque: false,
          mascara_leitura: false
        }
      });
    } else {
      await updateDoc(userRef, {
        "extras.login_load.parceiro": true
      });
    }

    msgPopup.innerHTML = `<span style="font-size: 0.9rem; color: #4caf50;">Login realizado com sucesso!</span>`;
    setTimeout(() => {
      window.location.href = "homeParc.html";
    }, 1000);

  } catch (err) {
    console.error(err);
    if (err.code === "auth/wrong-password") {
      msgPopup.textContent = "Senha incorreta.";
    } else if (err.code === "auth/user-not-found") {
      msgPopup.textContent = "Usuário não encontrado.";
    } else {
      msgPopup.textContent = "Erro ao fazer login. Tente novamente.";
    }
  }
});


const forgotBtn = document.getElementById("forgot-pass");
const modal = document.getElementById("resetModal");
const closeModal = document.getElementById("closeModal");
const resetEmailInput = document.getElementById("resetEmail");
const sendResetBtn = document.getElementById("sendReset");

forgotBtn.addEventListener("click", (e) => {
  e.preventDefault();
  modal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

sendResetBtn.addEventListener("click", async () => {
  const email = resetEmailInput.value.trim();
  if (!email) {
    
    document.querySelector("#popup-message").textContent = "Digite um e-mail válido.";
    document.querySelector("#popup").classList.remove("hidden");
    return;
  }

  try {
    
    const parceirosRef = collection(db, "parceiros");
    const q = query(parceirosRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      document.querySelector("#popup-message").textContent = "E-mail não encontrado na lista de parceiros.";
      document.querySelector("#popup").classList.remove("hidden");
      return;
    }

    
    await sendPasswordResetEmail(auth, email);
    document.querySelector("#popup-message").textContent = "Enviamos o link para redefinir sua senha!";
    document.querySelector("#popup").classList.remove("hidden");
    modal.classList.add("hidden");
    resetEmailInput.value = "";
  } catch (err) {
    console.error("Erro reset:", err.code, err.message);
    let msg = "Erro ao processar.";
    if (err.code === "auth/user-not-found") msg = "Conta não encontrada.";
    else if (err.code === "auth/invalid-email") msg = "E-mail inválido.";
    document.querySelector("#popup-message").textContent = msg;
    document.querySelector("#popup").classList.remove("hidden");
  }
});
