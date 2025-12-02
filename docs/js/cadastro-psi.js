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

  const nome = form.querySelector('[name="nome"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const crp = form.querySelector('[name="crp"]').value.trim();
  const senha = form.querySelector('[name="senha"]').value;
  const senha2 = form.querySelector('[name="senha2"]').value;

  if (!nome || !email || !crp || !senha || !senha2) {
    alert("Preencha todos os campos.");
    return;
  }

  if (senha !== senha2) {
    alert("As senhas não coincidem.");
    return;
  }

  
  const psicologosRef = collection(db, "psicologos");
  const q = query(psicologosRef, where("crp", "==", crp));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    alert("Este CRP já está cadastrado.");
    return;
  }

  
  try {
    const resposta = await fetch(`https://api.crpapi.vercel.app/validate?crp=${crp}`);
    const dados = await resposta.json();

    if (!dados.valido) {
      alert("CRP inválido. Verifique o número digitado.");
      return;
    }

    if (dados.nome && !nome) {
      form.querySelector('[name="nome"]').value = dados.nome;
    }

  } catch (error) {
    console.warn("Não foi possível validar o CRP automaticamente:", error);
  }

  try {
    
    const cred = await createUserWithEmailAndPassword(auth, email, senha);

    
    await setDoc(doc(db, "psicologos", cred.user.uid), {
      nome,
      email,
      crp,
      tipo: "psicologo",
      status: "pendente",
      uid: cred.user.uid,

      
      extras: {
        login_load: {
          mae: false,
          parceiro: false,
          advogado: false,
          psicologo: true
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

    alert("Cadastro realizado! Aguarde a aprovação da sua conta.");
    window.location.href = "logPsi.html";

  } catch (error) {
    console.error("Erro ao cadastrar:", error);
    let msg = "Erro ao cadastrar.";
    if (error.code === "auth/email-already-in-use") msg = "Email já cadastrado.";
    if (error.code === "auth/weak-password") msg = "Senha muito fraca.";
    alert(msg);
  }
});
