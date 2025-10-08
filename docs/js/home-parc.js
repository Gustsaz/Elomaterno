import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const boasVindas = document.getElementById("boasVindas");
const logoutBtn = document.getElementById("logoutBtn");

// Verifica se o usuário está logado
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Se não estiver logado, redireciona pro login
    window.location.href = "logParc.html";
    return;
  }

  try {
    // Busca o documento da empresa no Firestore
    const docRef = doc(db, "parceiros", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const nomeEmpresa = docSnap.data().nomeEmpresa || "Parceiro";
      boasVindas.textContent = `Olá, ${nomeEmpresa}!`;
    } else {
      boasVindas.textContent = "Olá, parceiro!";
    }
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    boasVindas.textContent = "Olá!";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "logParc.html";
});
