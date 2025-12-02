
import * as fb from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  


  const avatarParts = {
    base: { index: 1, max: 8, color: null },
    camisa: { index: 1, max: 6, color: null },
    sobrancelha: { index: 1, max: 6, color: null },
    cabelo: { index: 1, max: 11, color: null },
  };

  function updateAvatar(part) {
    const img = document.getElementById(part);
    if (!img) return;

    
    if (part === "cabelo") {
      const cabeloTras = document.getElementById("cabelotras");
      const cabeloIndex = avatarParts[part].index;
      const basePath = "./img/mamaesemfundo/cabelos/";

      
      img.src = `${basePath}${cabeloIndex}.png`;
      if (cabeloTras) cabeloTras.src = `${basePath}${cabeloIndex}_tras.png`;

      
      const colorLayer = document.getElementById("cabelo-colored");
      const colorLayerTras = document.getElementById("cabelotras-colored");
      if (colorLayer) colorLayer.style.backgroundColor = "transparent";
      if (colorLayerTras) colorLayerTras.style.backgroundColor = "transparent";

      if (avatarParts[part].color) {
        applyHueFilter("cabelo", avatarParts[part].color);
        applyHueFilter("cabelotras", avatarParts[part].color);
      }
      return;
    }

    
    if (part === "base") {
      const basePath = "./img/mamaesemfundo/bases/";
      img.src = `${basePath}${avatarParts[part].index}.png`;

      
      const orelha = document.getElementById("orelha");
      if (orelha) {
        orelha.src = `${basePath}${avatarParts[part].index}_orelha.png`;
      }

      if (avatarParts[part].color) applyHueFilter(part, avatarParts[part].color);
      return;
    }

    
    const basePath = `./img/mamaesemfundo/${part}s/`;
    img.src = `${basePath}${avatarParts[part].index}.png`;

    if (avatarParts[part].color) applyHueFilter(part, avatarParts[part].color);
  }

  
  document.querySelectorAll(".prev, .next").forEach(btn => {
    btn.addEventListener("click", () => {
      const part = btn.dataset.part;
      if (!avatarParts[part]) return;

      if (btn.classList.contains("prev")) {
        avatarParts[part].index--;
        if (avatarParts[part].index < 1) avatarParts[part].index = avatarParts[part].max;
      } else {
        avatarParts[part].index++;
        if (avatarParts[part].index > avatarParts[part].max) avatarParts[part].index = 1;
      }

      updateAvatar(part);
    });
  });

  


  const colorPickers = document.querySelectorAll(".color-picker");
  colorPickers.forEach(picker => {
    picker.addEventListener("input", () => {
      const part = picker.dataset.part;
      const color = picker.value;
      applyHueFilter(part, color);

      if (part === "cabelo") applyHueFilter("cabelotras", color); 
    });
  });

  const paletteBoxes = document.querySelectorAll(".color-box");
  paletteBoxes.forEach(box => {
    box.addEventListener("click", () => {
      const color = box.dataset.color;
      const palette = box.closest(".color-palette");
      if (!palette) return;
      const part = palette.id.replace("-palette", "");
      applyHueFilter(part, color);
    });
  });

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, l };
  }

  function applyHueFilter(part, color) {
    const img = document.getElementById(part);
    if (!img) return;

    // Extrai o matiz do input color (#rrggbb)
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);

    const hsl = rgbToHsl(r, g, b);

    // Aplica filtro de matiz no próprio <img>
    // Saturação e brilho levemente ajustados pra não "lavar" as cores
    img.style.filter = `hue-rotate(${hsl.h * 360}deg) saturate(${1 + hsl.s}) brightness(${0.9 + hsl.l / 2})`;

    
    avatarParts[part].color = color;
  }


  


  let selectedAvatarUrl = null;

  const avatarBtns = document.querySelectorAll('.avatar-btn');
  const confirmarBtn = document.querySelector('.confirmar-btn');

  avatarBtns.forEach(btn => {
    if (btn.id === 'criar-avatar-btn') return; 

    btn.addEventListener('click', () => {
      
      avatarBtns.forEach(b => b.classList.remove('selecionado'));
      
      btn.classList.add('selecionado');
      
      confirmarBtn.disabled = false;
      
      selectedAvatarUrl = btn.dataset.url;
    });
  });

  if (confirmarBtn) {
    confirmarBtn.addEventListener('click', async () => {
      if (!selectedAvatarUrl) return;

      try {
        const user = fb.auth?.currentUser;
        if (!user) {
          alert("É necessário estar logado para salvar o avatar.");
          return;
        }

        
        await setDoc(doc(fb.db, "usuarios", user.uid), { avatar: selectedAvatarUrl }, { merge: true });

        
        const successModal = document.getElementById("successModal");
        if (successModal) {
          successModal.style.display = "flex";

          const closeBtn = successModal.querySelector(".close-btn");
          const okBtn = successModal.querySelector("#modalOkBtn");

          if (closeBtn) closeBtn.onclick = () => (successModal.style.display = "none");
          if (okBtn) okBtn.onclick = () => (successModal.style.display = "none");

          window.onclick = (e) => {
            if (e.target === successModal) successModal.style.display = "none";
          };
        }

        console.log("Avatar selecionado salvo com sucesso! Link:", selectedAvatarUrl);

      } catch (err) {
        console.error("Erro ao salvar avatar:", err);
        alert("Erro ao salvar avatar. Veja o console.");
      }
    });
  }

  


  const criarAvatarBtn = document.getElementById("criar-avatar-btn");
  const avatarModal = document.getElementById("avatarModal");

  if (criarAvatarBtn && avatarModal) {
    const closeAvatarModalBtn = avatarModal.querySelector(".close-btn");

    criarAvatarBtn.addEventListener("click", () => {
      avatarModal.style.display = "flex";
      
      avatarBtns.forEach(b => b.classList.remove('selecionado'));
      confirmarBtn.disabled = true;
      selectedAvatarUrl = null;
    });

    if (closeAvatarModalBtn) {
      closeAvatarModalBtn.addEventListener("click", () => {
        avatarModal.style.display = "none";
      });
    }

    window.addEventListener("click", (e) => {
      if (e.target === avatarModal) avatarModal.style.display = "none";
    });
  }

  


  const salvarBtn = document.getElementById("salvarAvatarBtn");
  if (salvarBtn) {
    salvarBtn.addEventListener("click", async () => {
      try {
        const user = fb.auth?.currentUser;
        if (!user) {
          alert("É necessário estar logado para salvar o avatar.");
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
          await new Promise(resolve => {
            const draw = () => {
              
              const part = img.id;
              const color = avatarParts[part]?.color || null;

              if (color) {
                
                const r = parseInt(color.substr(1, 2), 16);
                const g = parseInt(color.substr(3, 2), 16);
                const b = parseInt(color.substr(5, 2), 16);
                const hsl = rgbToHsl(r, g, b);

                ctx.filter = `hue-rotate(${hsl.h * 360}deg) saturate(${1 + hsl.s}) brightness(${0.9 + hsl.l / 2})`;
              } else {
                ctx.filter = "none";
              }

              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              ctx.filter = "none"; 
              resolve();
            };

            if (img.complete) draw();
            else {
              img.onload = draw;
              img.onerror = resolve;
            }
          });
        }

        const dataUrl = canvas.toDataURL("image/png");
        const imageBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");

        // Upload para Imgbb
        const imgbbKey = "36597d22e15804939e4f93e0dc35445d";
        const formData = new FormData();
        formData.append("image", imageBase64);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        if (!result.success) throw new Error("Falha no upload Imgbb");

        const imageUrl = result.data.image.url;

        
        await setDoc(doc(fb.db, "usuarios", user.uid), { avatar: imageUrl }, { merge: true });

        
        const successModal = document.getElementById("successModal");
        if (successModal) {
          successModal.style.display = "flex";

          const closeBtn = successModal.querySelector(".close-btn");
          const okBtn = successModal.querySelector("#modalOkBtn");

          if (closeBtn) closeBtn.onclick = () => (successModal.style.display = "none");
          if (okBtn) okBtn.onclick = () => (successModal.style.display = "none");

          window.onclick = (e) => {
            if (e.target === successModal) successModal.style.display = "none";
          };
        }

        console.log("Avatar salvo com sucesso! Link:", imageUrl);

      } catch (err) {
        console.error("Erro ao salvar avatar:", err);
        alert("Erro ao salvar avatar. Veja o console.");
      }
    });
  }
});
