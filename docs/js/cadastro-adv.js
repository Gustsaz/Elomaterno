import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const form = document.querySelector(".cadastro-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = form.querySelector('[name="nomeadv"]').value.trim();
  const oab = form.querySelector('[name="oab"]').value.trim();
  const atuacao = form.querySelector('[name="atuacaoadv"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (!nome || !oab || !atuacao || !senha || !senha2) {
    alert("Preencha todos os campos.");
    return;
  }

  if (senha !== senha2) {
    alert("As senhas não coincidem.");
    return;
  }

  // Verifica se OAB já existe
  const advRef = collection(db, "advogados");
  const q = query(advRef, where("oab", "==", oab));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    alert("Esta OAB já está cadastrada.");
    return;
  }

  try {
    // Cria o usuário no Auth com email genérico (OAB + domínio)
    const fakeEmail = `${oab}@elomaterno.com`;
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail, senha);
    const uid = cred.user.uid;

    // Adiciona documento na coleção advogados
    await addDoc(advRef, {
      nome,
      oab,
      atuacao,
      tipo: "advogado",
      status: "pendente",
      uid
    });

    // 🔥 CRIA TAMBÉM O DOCUMENTO EM "usuarios"
    await setDoc(doc(db, "usuarios", uid), {
      nome,
      email: fakeEmail,
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

    alert("Cadastro realizado com sucesso! Aguarde a validação da OAB por e-mail.");
    window.location.href = "logAdv.html";

  } catch (error) {
    console.error("Erro ao cadastrar advogado:", error);
    let msg = "Erro ao cadastrar.";
    if (error.code === "auth/email-already-in-use") msg = "OAB já cadastrada.";
    if (error.code === "auth/weak-password") msg = "Senha muito fraca.";
    alert(msg);
  }
});
