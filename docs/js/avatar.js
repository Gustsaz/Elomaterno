import { auth, db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const avatarButtons = document.querySelectorAll('.avatar-btn');
const confirmarBtn = document.querySelector('.confirmar-btn');
let selectedAvatar = null;

avatarButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    avatarButtons.forEach(b => b.classList.remove('selecionado'));
    btn.classList.add('selecionado');

    const url = btn.getAttribute('data-url');
    const fileName = url.split('/').pop(); 
    selectedAvatar = `/docs/img/mamaesemfundo/${fileName}`;

    confirmarBtn.disabled = false;
  });
});

confirmarBtn.addEventListener('click', async () => {
  const user = auth.currentUser;

  if (user && selectedAvatar) {
    try {
      await setDoc(doc(db, "usuarios", user.uid), {
        avatar: selectedAvatar
      }, { merge: true });

      alert("Avatar salvo com sucesso!");
      window.location.href = "home.html";
    } catch (e) {
      console.error("Erro ao salvar avatar:", e);
      alert("Erro ao salvar avatar. Tente novamente.");
    }
  } else {
    alert("Nenhum usuário logado ou avatar não selecionado!");
  }
});
