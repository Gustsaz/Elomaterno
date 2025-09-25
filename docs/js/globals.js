import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const avatarEl = document.getElementById("menu-avatar");
const nomeEl = document.getElementById("menu-nome");
const emailEl = document.getElementById("menu-email");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) {
      const dados = snap.data();
      nomeEl.textContent = dados.nome || "Usuário";
      emailEl.textContent = dados.email || user.email;
      if (dados.fotoURL) {
        avatarEl.src = dados.fotoURL;
      }
    } else {
      nomeEl.textContent = user.displayName || "Usuário";
      emailEl.textContent = user.email;
    }
  }
});

document.querySelectorAll(".com-brilho").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  });
});

const menuToggle = document.getElementById("menuToggle");
const botoesMenu = document.querySelector(".botoes");

if (menuToggle && botoesMenu) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation(); 
    botoesMenu.classList.toggle("aberto");
  });
}

document.addEventListener("click", (event) => {
  const menu = document.querySelector(".botoes");
  const toggle = document.querySelector("#menuToggle");

  if (menu.classList.contains("aberto")) {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      menu.classList.remove("aberto");
    }
  }
});
