import { auth, db } from "./firebase.js"
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"
// Removido upload de foto do modal de edição

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