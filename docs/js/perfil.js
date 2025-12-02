import { auth, db } from "./firebase.js"
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"


const nomeEl = document.querySelector(".perfil-info h2")
const tagEl = document.querySelector(".perfil-tag")
const emailEl = document.querySelector(".card p:nth-of-type(1)")
const cidadeEl = document.querySelector(".card p:nth-of-type(2)")
const filhosEl = document.querySelector(".card p:nth-of-type(3)")
const empregoInfoEl = document.getElementById("info-emprego")
const fotoEl = document.querySelector(".perfil-top .perfil-avatar")
const menuAvatarEl = document.getElementById("menu-avatar")
const perfilAvatarEl = document.getElementById("perfil-foto")
const headerAvatarEl = document.getElementById("perfil-avatar")
const btnEditar = document.querySelector(".btn-editar")

const modalEditar = document.getElementById("modal-editar")
const formEditar = document.getElementById("form-editar")
const inputNome = document.getElementById("nome")
const inputCidade = document.getElementById("cidade")
const inputFilhos = document.getElementById("filhos")
const inputEmprego = document.getElementById("emprego")
const btnCancelar = document.getElementById("cancelar")

const btnEditAvatar = document.querySelector(".btn-edit-avatar")
const modalAvatar = document.getElementById("modal-avatar")
const confirmarAvatarBtn = document.getElementById("confirmar-avatar")

let usuarioRef
let avatarSelecionado = null

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "logMae.html"
  usuarioRef = doc(db, "usuarios", user.uid)
  try {
    const snap = await getDoc(usuarioRef)
    if (!snap.exists()) return
    const dados = snap.data()
    nomeEl.textContent = dados.nome || "Usuário sem nome"
    tagEl.textContent = dados.tipo || "Usuário"
    emailEl.textContent = `Email: ${dados.email}`
    cidadeEl.textContent = `Cidade: ${dados.cidade || "Não informada"}`
    filhosEl.textContent = `Filhos: ${dados.filhos || "Não informado"}`
    if (empregoInfoEl) empregoInfoEl.textContent = dados.emprego || "Não informado"
    if (inputEmprego) inputEmprego.value = dados.emprego || ""
    const avatarSrc = dados.fotoURL || dados.avatar || "./img/avatar_usuario.png"
    fotoEl.src = avatarSrc
    perfilAvatarEl.src = avatarSrc
    menuAvatarEl.src = avatarSrc
    headerAvatarEl.src = avatarSrc
  } catch (err) {
    console.error("Erro ao carregar perfil:", err)
  }
  carregarInteracoes(user.uid)
})

function carregarInteracoes(uid) {
  const interacoesCard = document.querySelector(".perfil-cards .card:nth-of-type(3)")
  const q = query(collection(db, "posts"), where("autorId", "==", uid), orderBy("data", "desc"))
  onSnapshot(q, (snapshot) => {
    let html = "<h3>Minhas interações</h3>"
    if (snapshot.empty) {
      html += "<p>Você ainda não publicou nada.</p>"
    } else {
      snapshot.forEach((doc) => {
        const p = doc.data()
        html += `<p><strong>${p.titulo}</strong> - ${p.conteudo.substring(0, 50)}...</p>`
      })
    }
    html += `<a href="forum.html">Ver no fórum</a>`
    interacoesCard.innerHTML = html
  })
}

btnEditar.addEventListener("click", () => {
  inputNome.value = nomeEl.textContent
  inputCidade.value = cidadeEl.textContent.replace("Cidade: ", "")
  inputFilhos.value = filhosEl.textContent.replace("Filhos: ", "")
  try {
    // tenta preencher emprego se houver na tela (não exibido atualmente)
    // deixamos vazio por padrão; será carregado do Firestore no onAuthStateChanged
  } catch(_) {}
  modalEditar.classList.add("show")
})

btnCancelar.addEventListener("click", () => modalEditar.classList.remove("show"))

formEditar.addEventListener("submit", async (e) => {
  e.preventDefault()
  const novoNome = inputNome.value.trim()
  const novaCidade = inputCidade.value.trim()
  const novosFilhos = inputFilhos.value.trim()
  const novoEmprego = (inputEmprego?.value || "").trim()
  try {
    const updateData = { nome: novoNome, cidade: novaCidade, filhos: novosFilhos }
    if (novoEmprego) updateData.emprego = novoEmprego
    await updateDoc(usuarioRef, updateData)
    nomeEl.textContent = novoNome
    cidadeEl.textContent = `Cidade: ${novaCidade}`
    filhosEl.textContent = `Filhos: ${novosFilhos}`
    modalEditar.classList.remove("show")
    alert("Perfil atualizado com sucesso!")
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err)
    alert("Erro ao salvar alterações.")
  }
})

const btnFecharModal = modalAvatar.querySelector(".btn-fechar-modal")

btnEditAvatar.addEventListener("click", () => {
  avatarSelecionado = null
  confirmarAvatarBtn.disabled = true
  modalAvatar.classList.add("show")
  document.querySelectorAll("#modal-avatar .avatar-btn").forEach(b => b.classList.remove("selecionado"))
})

document.querySelectorAll("#modal-avatar .avatar-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#modal-avatar .avatar-btn").forEach(b => b.classList.remove("selecionado"))
    btn.classList.add("selecionado")
    avatarSelecionado = btn.dataset.url
    confirmarAvatarBtn.disabled = false
  })
})

confirmarAvatarBtn.addEventListener("click", async () => {
  if (!avatarSelecionado) return
  try {
    await updateDoc(usuarioRef, { avatar: avatarSelecionado })
    ;[fotoEl, perfilAvatarEl, menuAvatarEl, headerAvatarEl].forEach(img => img.src = avatarSelecionado)
    modalAvatar.classList.remove("show")
    confirmarAvatarBtn.disabled = true
    avatarSelecionado = null
  } catch (err) {
    console.error("Erro ao salvar avatar:", err)
    alert("Erro ao salvar avatar.")
  }
})

btnFecharModal.addEventListener("click", () => {
  modalAvatar.classList.remove("show")
  avatarSelecionado = null
  confirmarAvatarBtn.disabled = true
})

window.addEventListener("click", (e) => {
  if (e.target === modalAvatar) {
    modalAvatar.classList.remove("show")
    avatarSelecionado = null
    confirmarAvatarBtn.disabled = true
  }
})

const avatarParts = {
  base: { index: 1, max: 8, color: null },
  camisa: { index: 1, max: 6, color: null },
  sobrancelha: { index: 1, max: 6, color: null },
  cabelo: { index: 1, max: 11, color: null },
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
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

function mapImgIdToPart(imgId) {
  if (!imgId) return null;
  if (imgId.startsWith("cabelo")) return "cabelo";
  if (imgId.startsWith("cabelotras")) return "cabelo";
  if (imgId === "orelha") return "base";
  return imgId; 
}

function applyHueFilter(part, color) {
  const img = document.getElementById(part);
  if (!img) return;
  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(5, 2), 16);
  const hsl = rgbToHsl(r, g, b);
  img.style.filter = `hue-rotate(${hsl.h * 360}deg) saturate(${1 + hsl.s}) brightness(${0.9 + hsl.l / 2})`;
  const key = mapImgIdToPart(part);
  if (avatarParts[key]) avatarParts[key].color = color;
}

function updateAvatar(part) {
  const img = document.getElementById(part);
  if (!img) return;

  if (part === "cabelo") {
    const cabeloTras = document.getElementById("cabelotras");
    const i = avatarParts.cabelo.index;
    const path = "./img/mamaesemfundo/cabelos/";
    img.src = `${path}${i}.png`;
    if (cabeloTras) cabeloTras.src = `${path}${i}_tras.png`;
    if (avatarParts.cabelo.color) {
      applyHueFilter("cabelo", avatarParts.cabelo.color);
      if (cabeloTras) applyHueFilter("cabelotras", avatarParts.cabelo.color);
    } else {
      img.style.filter = "";
      if (cabeloTras) cabeloTras.style.filter = "";
    }
    return;
  }

  if (part === "base") {
    const i = avatarParts.base.index;
    const path = "./img/mamaesemfundo/bases/";
    img.src = `${path}${i}.png`;
    const orelha = document.getElementById("orelha");
    if (orelha) orelha.src = `${path}${i}_orelha.png`;
    if (avatarParts.base.color) {
      applyHueFilter("base", avatarParts.base.color);
      if (orelha) applyHueFilter("orelha", avatarParts.base.color);
    } else {
      img.style.filter = "";
      if (orelha) orelha.style.filter = "";
    }
    return;
  }

  const path = `./img/mamaesemfundo/${part}s/`;
  img.src = `${path}${avatarParts[part].index}.png`;
  if (avatarParts[part].color) applyHueFilter(part, avatarParts[part].color);
  else img.style.filter = "";
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

document.querySelectorAll(".color-picker").forEach(p => {
  p.addEventListener("input", () => {
    const part = p.dataset.part;
    const color = p.value;
    if (part === "cabelo") {
      applyHueFilter("cabelo", color);
      const t = document.getElementById("cabelotras");
      if (t) applyHueFilter("cabelotras", color);
    } else {
      applyHueFilter(part, color);
    }
  });
});

document.querySelectorAll(".color-box").forEach(box => {
  box.addEventListener("click", () => {
    const color = box.dataset.color;
    const palette = box.closest(".color-palette");
    if (!palette) return;
    const part = palette.id.replace("-palette", "");
    if (part === "base") {
      applyHueFilter("base", color);
      const o = document.getElementById("orelha");
      if (o) applyHueFilter("orelha", color);
    } else {
      applyHueFilter(part, color);
    }
  });
});

const criarAvatarBtn = document.getElementById("criar-avatar-btn");
const avatarModal = document.getElementById("avatarModal");
const modalAvatarSelector = document.getElementById("modal-avatar"); 

if (criarAvatarBtn && avatarModal) {
  criarAvatarBtn.addEventListener("click", () => {
    avatarModal.classList.add("show");
  });

  const close = avatarModal.querySelector(".close-btn");
  if (close) close.addEventListener("click", () => avatarModal.classList.remove("show"));

  window.addEventListener("click", (e) => {
    if (e.target === avatarModal) avatarModal.classList.remove("show");
  });
}

const salvarBtn = document.getElementById("salvarAvatarBtn");
if (salvarBtn) {
  salvarBtn.addEventListener("click", async () => {
    try {
      if (!usuarioRef) { alert("Usuário não autenticado."); return; }

      const avatarEl = document.getElementById("avatar-preview");
      if (!avatarEl) { alert("Preview do avatar não encontrado."); return; }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 250;
      canvas.height = 250;

      const layers = avatarEl.querySelectorAll(".layer img");
      for (const img of layers) {
        await new Promise(resolve => {
          const draw = () => {
            const imgId = img.id;
            const partKey = mapImgIdToPart(imgId);
            const color = avatarParts[partKey]?.color || null;

            if (color) {
              const r = parseInt(color.substr(1,2),16);
              const g = parseInt(color.substr(3,2),16);
              const b = parseInt(color.substr(5,2),16);
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
          else { img.onload = draw; img.onerror = resolve; }
        });
      }

      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

      const imgbbKey = "36597d22e15804939e4f93e0dc35445d"; 
      const form = new FormData();
      form.append("image", base64);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: "POST", body: form });
      const json = await res.json();
      if (!json.success) throw new Error("Falha upload Imgbb");

      const imageUrl = json.data.image.url;

      await updateDoc(usuarioRef, { avatar: imageUrl });

      [fotoEl, perfilAvatarEl, menuAvatarEl, headerAvatarEl].forEach(img => { if (img) img.src = imageUrl; });

      const successModal = document.getElementById("successModal");
      if (successModal) {
        successModal.classList.add("show");
        const closeS = successModal.querySelector(".close-btn");
        const ok = successModal.querySelector("#modalOkBtn");
        if (closeS) closeS.addEventListener("click", () => successModal.classList.remove("show"));
        if (ok) ok.addEventListener("click", () => successModal.classList.remove("show"));
        window.addEventListener("click", (e) => { if (e.target === successModal) successModal.classList.remove("show"); });
      }

      if (avatarModal) avatarModal.classList.remove("show");

      console.log("Avatar salvo:", imageUrl);

    } catch (err) {
      console.error("Erro ao salvar avatar:", err);
      alert("Erro ao salvar avatar. Veja o console.");
    }
  });
}
