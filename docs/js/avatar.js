// ./js/avatar.js
import * as fb from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Seletores defensivos
  const avatarButtons = Array.from(document.querySelectorAll(".avatar-btn"));
  const confirmarBtn = document.querySelector(".confirmar-btn");
  const criarAvatarBtn = document.getElementById("criar-avatar-btn");
  const avatarModal = document.getElementById("avatarModal");
  const successModal = document.getElementById("successModal");
  const modalOkBtn = document.getElementById("modalOkBtn");

  if (!avatarButtons.length || !confirmarBtn) {
    console.warn("avatar.js: elementos essenciais não encontrados (avatarButtons ou confirmarBtn).");
    // continua porque talvez só queira usar o criador modal
  }

  // seleção de avatar (grid)
  let selectedAvatar = null;
  avatarButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      avatarButtons.forEach((b) => b.classList.remove("selecionado"));
      btn.classList.add("selecionado");

      const url = btn.getAttribute("data-url") || btn.querySelector("img")?.getAttribute("src");
      if (url) {
        const fileName = url.split("/").pop();
        selectedAvatar = `./img/mamaesemfundo/${fileName}`;
        if (confirmarBtn) confirmarBtn.disabled = false;
      }
    });
  });

  // Modal de sucesso
  if (successModal) {
    const closeSuccessBtn = successModal.querySelector(".close-btn");
    if (closeSuccessBtn) closeSuccessBtn.addEventListener("click", () => (successModal.style.display = "none"));
    if (modalOkBtn) modalOkBtn.addEventListener("click", () => (window.location.href = "home.html"));
    window.addEventListener("click", (e) => {
      if (e.target === successModal) successModal.style.display = "none";
    });
  }

  // Confirmar avatar (salva avatar pré-existente)
  if (confirmarBtn) {
    confirmarBtn.addEventListener("click", async () => {
      try {
        const user = fb.auth?.currentUser;
        if (!user) {
          alert("Nenhum usuário logado. Faça login para salvar o avatar.");
          return;
        }
        if (!selectedAvatar) {
          alert("Nenhum avatar selecionado.");
          return;
        }

        await setDoc(doc(fb.db, "usuarios", user.uid), { avatar: selectedAvatar }, { merge: true });

        if (successModal) successModal.style.display = "flex";
        else alert("Avatar salvo (modal de sucesso ausente).");
      } catch (err) {
        console.error("Erro ao salvar avatar:", err);
        alert("Erro ao salvar avatar. Veja console.");
      }
    });
  }

  // Abrir/fechar modal do criador
  if (criarAvatarBtn && avatarModal) {
    const closeAvatarModalBtn = avatarModal.querySelector(".close-btn");
    criarAvatarBtn.addEventListener("click", () => (avatarModal.style.display = "flex"));
    if (closeAvatarModalBtn) closeAvatarModalBtn.addEventListener("click", () => (avatarModal.style.display = "none"));
    window.addEventListener("click", (e) => {
      if (e.target === avatarModal) avatarModal.style.display = "none";
    });
  } else {
    if (!criarAvatarBtn) console.warn("avatar.js: #criar-avatar-btn não encontrado.");
    if (!avatarModal) console.warn("avatar.js: #avatarModal não encontrado.");
  }

  // Salvar avatar criado (canvas)
  const salvarBtn = document.getElementById("salvarAvatarBtn");
  if (salvarBtn) {
    salvarBtn.addEventListener("click", async () => {
      try {
        const user = fb.auth?.currentUser;
        if (!user) {
          alert("É necessário estar logado para salvar seu avatar.");
          return;
        }

        const avatarElement = document.getElementById("avatar-preview");
        if (!avatarElement) {
          alert("Preview do avatar não encontrado.");
          return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 250;
        canvas.height = 250;

        const layers = avatarElement.querySelectorAll(".layer img");
        for (const img of layers) {
          await new Promise((resolve) => {
            if (img.complete) {
              try { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); } catch (e) { console.warn("drawImage error", e, img.src); }
              resolve();
            } else {
              img.onload = () => { try { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); } catch (e) { console.warn("drawImage onload error", e, img.src); } resolve(); };
              img.onerror = () => { console.warn("img error:", img.src); resolve(); };
            }
          });
        }

        const dataUrl = canvas.toDataURL("image/png");
        await setDoc(doc(fb.db, "usuarios", user.uid), { avatar: dataUrl }, { merge: true });

        alert("Avatar personalizado salvo com sucesso!");
        if (avatarModal) avatarModal.style.display = "none";
      } catch (e) {
        console.error("Erro ao salvar avatar criado:", e);
        alert("Erro ao salvar avatar. Veja console.");
      }
    });
  }
});
