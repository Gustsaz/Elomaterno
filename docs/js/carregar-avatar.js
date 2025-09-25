// carregar-avatar.js
import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Elementos que receberão o avatar
const avatars = [
  document.getElementById("perfil-avatar"),   // section perfil-top
  document.getElementById("menu-avatar")      // menu lateral
];

// Função para carregar a imagem com loader
function loadAvatar(imgElement, url) {
  if (!imgElement) return;
  const container = imgElement.closest(".avatar-loader-container");
  const loader = container?.querySelector(".loader");

  if (loader) loader.style.display = "flex";

  const img = new Image();
  img.src = url;

  img.onload = () => {
    imgElement.src = url;
    if (loader) loader.style.display = "none";
  };

  img.onerror = () => {
    imgElement.src = "/docs/img/avatar-padrao.png";
    if (loader) loader.style.display = "none";
  };
}

// Nova função: troca a imagem da section perfil-top
function loadPerfilTopAvatar(url) {
  const perfilTopImg = document.querySelector(".perfil-top .perfil-avatar");
  if (perfilTopImg) {
    perfilTopImg.src = url;
  }
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.avatar) {
          avatars.forEach(img => loadAvatar(img, data.avatar));
        }
      }
    } catch (e) {
      console.error("Erro ao carregar avatar:", e);
    }
  }
});

