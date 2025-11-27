import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword
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
    const email = `${oab}@elomaterno.com`;

    if (userData.status !== "aprovado") {
      alert("Sua conta ainda está em análise.");
      return;
    }

    // Login Auth
    await signInWithEmailAndPassword(auth, email, senha);

    // --------------------------------------------------------
    // 🔥 ATUALIZA login_load DO USUÁRIO EM "usuarios/{uid}"
    // --------------------------------------------------------
    const userRef = doc(db, "usuarios", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      await updateDoc(userRef, {
        "extras.login_load.advogado": true
      });
    } else {
      // Caso raro: advogado cadastrado antes dessa lógica
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
