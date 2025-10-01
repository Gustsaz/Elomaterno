import { db, auth } from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const userListEl = document.getElementById("userList");
const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const chatHeader = document.getElementById("chatHeader");

let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Você precisa estar logado.");
    window.location.href = "formPerfil.html";
    return;
  }
  currentUser = user;

  loadUsers();
});

async function loadUsers() {
  const q = collection(db, "usuarios");
  const snapshot = await getDocs(q);

  userListEl.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const u = docSnap.data();
    if (docSnap.id === currentUser.uid) return;

    const li = document.createElement("li");
    li.innerHTML = `
      <img src="${u.avatar}" alt="${u.nome}">
      <span>${u.nome}</span>
    `;
    li.addEventListener("click", () => openChatWith(docSnap.id, u));
    userListEl.appendChild(li);
  });
}

const chatMain = document.querySelector(".chat-main");
const backBtn = document.getElementById("backBtn");
const chatTitle = document.getElementById("chatTitle");
const chatAvatar = document.getElementById("chatAvatar");
const menuToggle = document.getElementById("menuToggle");

async function openChatWith(otherUid, userData) {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participantes", "array-contains", currentUser.uid));
  const snapshot = await getDocs(q);

  let chatDoc = null;
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.participantes.includes(otherUid)) {
      chatDoc = { id: docSnap.id, ...data };
    }
  });

  if (!chatDoc) {
    const newChatRef = await addDoc(chatsRef, {
      participantes: [currentUser.uid, otherUid],
      criadoEm: serverTimestamp(),
      ultimoMensagem: "",
      ultimoEnviadoPor: ""
    });
    chatDoc = { id: newChatRef.id, participantes: [currentUser.uid, otherUid] };
  }

  currentChatId = chatDoc.id;
  chatTitle.textContent = "Chat com " + userData.nome;
  chatAvatar.src = userData.avatar || "./img/avatar_usuario.png";
  chatAvatar.classList.remove("hidden");

  messageForm.classList.remove("hidden");

  if (unsubscribeMessages) unsubscribeMessages();

  const msgsRef = collection(db, "chats", currentChatId, "mensagens");
  const qMsgs = query(msgsRef, orderBy("enviadoEm", "asc"));
  unsubscribeMessages = onSnapshot(qMsgs, (snap) => {
    messagesDiv.innerHTML = "";
    snap.forEach((msgDoc) => {
      const msg = msgDoc.data();
      const div = document.createElement("div");
      div.classList.add("message", msg.enviadoPor === currentUser.uid ? "sent" : "received");
      div.textContent = msg.texto;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  chatMain.classList.add("active");
  backBtn.classList.remove("hidden");

  chatMain.classList.add("active");
  backBtn.classList.remove("hidden");
  if (menuToggle) menuToggle.style.display = "none";

}


messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentChatId) return;

  const texto = messageInput.value.trim();
  if (!texto) return;

  const msgRef = collection(db, "chats", currentChatId, "mensagens");
  await addDoc(msgRef, {
    texto,
    enviadoPor: currentUser.uid,
    enviadoEm: serverTimestamp(),
    lido: false
  });

  await setDoc(doc(db, "chats", currentChatId), {
    ultimoMensagem: texto,
    ultimoEnviadoPor: currentUser.uid
  }, { merge: true });

  messageInput.value = "";
});

backBtn.addEventListener("click", () => {
  chatMain.classList.remove("active");
  backBtn.classList.add("hidden");
  chatTitle.textContent = "Selecione um usuário";
  chatAvatar.classList.add("hidden");
  chatAvatar.src = "";
  messageForm.classList.add("hidden");
  messagesDiv.innerHTML = "";

  if (menuToggle) menuToggle.style.display = "block"; 

});
