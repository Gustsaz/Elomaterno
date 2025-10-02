import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const avatars = [
  document.getElementById("perfil-avatar"),   
  document.getElementById("menu-avatar")      
];

function loadAvatar(imgElement, url) {
  if (!imgElement) return;
  const container = imgElement.closest(".avatar-loader-container");
  const loader = container?.querySelector(".loader");

  if (loader) loader.style.display = "flex";

  const fixedUrl = url;

  const img = new Image();
  img.src = fixedUrl;

  img.onload = () => {
    imgElement.src = fixedUrl;
    if (loader) loader.style.display = "none";
  };

  img.onerror = () => {
    imgElement.src = "./docs/img/avatar_usuario.png";
    if (loader) loader.style.display = "none";
  };
}

function loadPerfilTopAvatar(url) {
  const perfilTopImg = document.querySelector(".perfil-top .perfil-avatar");
  if (perfilTopImg) {
    perfilTopImg.src = normalizePath(url);
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