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

  const fixedUrl = url || "./img/avatar_usuario.png";

  const img = new Image();
  img.src = fixedUrl;

  img.onload = () => {
    imgElement.src = fixedUrl;
    if (loader) loader.style.display = "none";
  };

  img.onerror = () => {
    imgElement.src = "./img/avatar_usuario.png"; 
    if (loader) loader.style.display = "none";
  };
}

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  try {
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const foto =
        data.fotoURL || data.avatar || "./img/avatar_usuario.png"; 

      avatars.forEach(img => loadAvatar(img, foto));
    } else {
      avatars.forEach(img => loadAvatar(img, "./img/avatar_usuario.png"));
    }
  } catch (e) {
    console.error("Erro ao carregar avatar:", e);
    avatars.forEach(img => loadAvatar(img, "./img/avatar_usuario.png"));
  }
});
