import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, sendEmailVerification } 
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js";

const form = document.querySelector('.login-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.querySelector('[name="email"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    console.log("[login] sucesso -> uid:", user.uid, "email:", user.email);

    // Se não verificado, reenviar e deslogar (mesmo comportamento anterior)
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      await auth.signOut();
      showPopup("Sua conta ainda não foi ativada. Verifique a caixa de entrada do seu e-mail (ou a pasta de spam) para confirmar o cadastro.");
      return;
    }

    // 1) tenta buscar documento por UID
    let nome = null;
    try {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      console.log("[login] userDoc.exists():", snap.exists());
      if (snap.exists()) {
        const data = snap.data();
        console.log("[login] userDoc.data():", data);
        if (data && data.nome) nome = String(data.nome).trim();
      }
    } catch (err) {
      console.error("[login] erro ao buscar doc por uid:", err);
    }

    // 2) fallback: busca por email no campo 'email' da coleção usuarios
    if (!nome) {
      try {
        const q = query(collection(db, "usuarios"), where("email", "==", user.email));
        const qs = await getDocs(q);
        console.log("[login] query por email - tamanho:", qs.size);
        if (!qs.empty) {
          qs.forEach(docSnap => {
            const d = docSnap.data();
            console.log("[login] doc achado por email:", docSnap.id, d);
            if (!nome && d && d.nome) nome = String(d.nome).trim();
          });
        }
      } catch (err) {
        console.error("[login] erro ao buscar por email:", err);
      }
    }

    // 3) outros fallbacks
    if (!nome && user.displayName) nome = user.displayName;
    if (!nome) nome = user.email; // último recurso

    showPopup(`Bem-vinda de volta, ${nome}!`);
    setTimeout(() => {
      window.location.href = "home.html";
    }, 1600);

  } catch (error) {
    console.error("Erro no login:", error.code, error.message);

    let mensagemAmigavel = "Ocorreu um erro. Tente novamente.";

    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        mensagemAmigavel = "Senha incorreta. Verifique e tente novamente.";
        break;
      case "auth/user-not-found":
        mensagemAmigavel = "Não encontramos uma conta com este e-mail.";
        break;
      case "auth/invalid-email":
        mensagemAmigavel = "O e-mail informado não é válido.";
        break;
      case "auth/missing-password":
        mensagemAmigavel = "Digite sua senha para continuar.";
        break;
      default:
        mensagemAmigavel = "Erro ao fazer login. Por favor, tente novamente.";
    }

    showPopup(mensagemAmigavel);
  }
});
