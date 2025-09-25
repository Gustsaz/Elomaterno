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
    selectedAvatar = `./img/mamaesemfundo/${fileName}`;
    confirmarBtn.disabled = false;
  });
});

const modal = document.getElementById("successModal");
const closeBtn = document.querySelector(".close-btn");
const modalOkBtn = document.getElementById("modalOkBtn");

closeBtn.onclick = () => modal.style.display = "none";

window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

modalOkBtn.onclick = () => {
  window.location.href = "home.html";
};

confirmarBtn.addEventListener('click', async () => {
  const user = auth.currentUser;

  if (user && selectedAvatar) {
    try {
      await setDoc(doc(db, "usuarios", user.uid), {
        avatar: selectedAvatar
      }, { merge: true });

      modal.style.display = "flex"; 

    } catch (e) {
      console.error("Erro ao salvar avatar:", e);
      alert("Erro ao salvar avatar. Tente novamente.");
    }
  } else {
    alert("Nenhum usuário logado ou avatar não selecionado!");
  }
});

