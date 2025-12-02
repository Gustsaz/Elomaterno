import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js";

const form = document.querySelector('.login-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.querySelector('[name="email"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await sendEmailVerification(user);
      await auth.signOut();
      showPopup("Sua conta ainda não foi ativada. Verifique seu e-mail.");
      return;
    }

    const ref = doc(db, "usuarios", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {

      
      await updateDoc(ref, {
        "extras.login_load.mae": true
      });

      const data = snap.data();

      if (data.primeiroAcesso) {
        window.location.href = "form.html";
        return;
      }

      if (!data.avatar) {
        window.location.href = "avatar.html";
        return;
      }

      const nome = data.nome || user.email;
      showPopup(`Bem-vinda de volta, ${nome}!`);
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1600);

    } else {
      showPopup("Erro: conta não encontrada.");
    }

  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    let mensagemAmigavel = "Erro ao fazer login. Tente novamente.";

    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        mensagemAmigavel = "Senha incorreta.";
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
    }
    showPopup(mensagemAmigavel);
  }
});



const googleBtn = document.getElementById("googleLogin");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          nome: user.displayName,
          email: user.email,
          telefone: "",
          tipo: "mae",
          avatar: null,
          extras: {
            login_load: {
              mae: true,
              parceiro: false,
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
        await updateDoc(ref, {
          "extras.login_load.mae": true
        });
      }

      showPopup(`Bem-vinda, ${user.displayName || user.email}!`);
      setTimeout(() => {
        if (!snap.exists() || !snap.data().avatar) {
          window.location.href = "avatar.html";
        } else {
          window.location.href = "home.html";
        }
      }, 1500);

    } catch (error) {
      console.error("Erro no login com Google:", error);
      showPopup("Não foi possível entrar com o Google.");
    }
  });
}