import { auth, db } from "./firebase.js";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { showPopup } from "./popup.js"; 

const form = document.querySelector('.cadastro-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = form.querySelector('[name="nome"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const telefone = form.querySelector('[name="telefone"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (senha !== senha2) {
    showPopup("As senhas não coincidem. Digite novamente.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    await setDoc(doc(db, "usuarios", user.uid), {
      nome,
      email,
      telefone,
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

    await sendEmailVerification(user, {
      url: "http://localhost:5500/home.html",
      handleCodeInApp: false
    });

    showPopup("Cadastro realizado com sucesso! Vamos escolher seu avatar!");
    setTimeout(() => {
      window.location.href = "avatar.html"; 
    }, 2000);

  } catch (error) {
    console.error("Erro no cadastro:", error.code, error.message);

    let mensagemAmigavel;
    switch (error.code) {
      case "auth/email-already-in-use":
        mensagemAmigavel = "Este e-mail já está em uso.";
        break;
      case "auth/invalid-email":
        mensagemAmigavel = "O e-mail informado não é válido.";
        break;
      case "auth/weak-password":
        mensagemAmigavel = "A senha deve ter pelo menos 6 caracteres.";
        break;
      default:
        mensagemAmigavel = "Erro ao realizar o cadastro. Por favor, tente novamente.";
    }
    showPopup(mensagemAmigavel);
  }
});



const googleBtn = document.getElementById("googleSignUp");
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
      console.error("Erro no cadastro com Google:", error);
      showPopup("Não foi possível continuar com o Google.");
    }
  });
}
