import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const form = document.querySelector(".login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const oab = form.querySelector('[name="oab"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;

  if (!oab || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    const advRef = collection(db, "advogados");
    const q = query(advRef, where("oab", "==", oab));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("OAB não encontrada.");
      return;
    }

    const userData = querySnapshot.docs[0].data();
    const uid = userData.uid;
    const email = userData.email;

    if (userData.status !== "aprovado") {
      alert("Sua conta ainda está em análise.");
      return;
    }

    
    await signInWithEmailAndPassword(auth, email, senha);

    
    
    
    const userRef = doc(db, "usuarios", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      await updateDoc(userRef, {
        "extras.login_load.advogado": true
      });
    } else {
      
      await setDoc(userRef, {
        nome: userData.nome,
        email,
        telefone: "",
        tipo: "advogado",
        avatar: null,
        extras: {
          login_load: {
            mae: false,
            parceiro: false,
            advogado: true,
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
    }

    alert("Login realizado com sucesso!");
    window.location.href = "homeadv.html";

  } catch (error) {
    console.error("Erro no login:", error);
    let msg = "Erro ao fazer login.";
    if (error.code === "auth/wrong-password") msg = "Senha incorreta.";
    if (error.code === "auth/user-not-found") msg = "Conta não encontrada.";
    alert(msg);
  }
});


document.getElementById("forgot-password-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("oab-modal").style.display = "flex";
  document.getElementById("reset-oab-input").focus();
});

document.getElementById("cancel-reset-btn").addEventListener("click", () => {
  document.getElementById("oab-modal").style.display = "none";
  document.getElementById("reset-oab-input").value = "";
});

document.getElementById("reset-password-btn").addEventListener("click", async () => {
  const oab = document.getElementById("reset-oab-input").value.trim();

  if (!oab) {
    alert("Número da OAB é obrigatório.");
    return;
  }

  try {
    const advRef = collection(db, "advogados");
    const q = query(advRef, where("oab", "==", oab));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("OAB não encontrada.");
      document.getElementById("oab-modal").style.display = "none";
      document.getElementById("reset-oab-input").value = "";
      return;
    }

    const userData = querySnapshot.docs[0].data();

    if (userData.status !== "aprovado") {
      alert("Sua conta ainda está em análise. Não é possível redefinir a senha neste momento.");
      document.getElementById("oab-modal").style.display = "none";
      document.getElementById("reset-oab-input").value = "";
      return;
    }

    const email = userData.email;

    await sendPasswordResetEmail(auth, email);

    document.getElementById("oab-modal").style.display = "none";
    document.getElementById("reset-oab-input").value = "";

    alert("Confirmação: O e-mail de redefinição de senha foi enviado com sucesso!");

  } catch (error) {
    console.error("Erro ao enviar redefinição de senha:", error);
    document.getElementById("oab-modal").style.display = "none";
    document.getElementById("reset-oab-input").value = "";
    alert("Erro ao enviar redefinição de senha. Tente novamente.");
  }
});

// Close modal when clicking outside
document.getElementById("oab-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("oab-modal")) {
    document.getElementById("oab-modal").style.display = "none";
    document.getElementById("reset-oab-input").value = "";
  }
});
