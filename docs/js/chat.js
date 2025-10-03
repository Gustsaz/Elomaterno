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
  updateDoc,
  writeBatch,
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
let unsubUserChats = null;

// Cache para mapear chatId -> { liEl, otherUserId, unreadCount }
const chatListState = new Map();

// Áudio de notificação
let notifyAudio = null;
try {
  notifyAudio = new Audio("./sounds/not.mp3");
  notifyAudio.preload = "auto";
} catch(_) {}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function ensureNotificationPermission() {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default" && isMobile()) {
      await Notification.requestPermission();
    }
  } catch (_) {}
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Você precisa estar logado.");
    window.location.href = "formPerfil.html";
    return;
  }
  currentUser = user;

  loadUsers();
  listenUserChats();
  ensureNotificationPermission();
  // Desbloqueio do áudio na primeira interação do usuário
  const unlock = () => {
    try { if (notifyAudio) { notifyAudio.play().then(()=>{ notifyAudio.pause(); notifyAudio.currentTime = 0; }).catch(()=>{}); } } catch(_) {}
    window.removeEventListener("click", unlock, { capture: true });
    window.removeEventListener("touchstart", unlock, { capture: true });
  };
  window.addEventListener("click", unlock, { capture: true, once: true });
  window.addEventListener("touchstart", unlock, { capture: true, once: true });
});

async function loadUsers() {
  const q = collection(db, "usuarios");
  const snapshot = await getDocs(q);

  userListEl.innerHTML = "";
  // skeleton inicial enquanto monta lista
  for (let i=0;i<4;i++) {
    const sk = document.createElement("div");
    sk.className = "user-skel";
    sk.innerHTML = '<div class="avatar skeleton"></div><div class="lines"><div class="line1 skeleton"></div><div class="line2 skeleton"></div></div>';
    userListEl.appendChild(sk);
  }

  userListEl.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const u = docSnap.data();
    if (docSnap.id === currentUser.uid) return;

    const li = document.createElement("li");
    li.dataset.uid = docSnap.id;
    li.innerHTML = `
      <img src="${u.avatar}" alt="${u.nome}">
      <div class="user-meta">
        <span class="user-name">${u.nome}</span>
        <span class="last-message" data-last-msg="${docSnap.id}"></span>
      </div>
      <span class="badge" aria-label="mensagens não lidas"></span>
    `;
    li.addEventListener("click", () => openChatWith(docSnap.id, u));
    userListEl.appendChild(li);

    // mantém referência para atualização do badge
    chatListState.set(docSnap.id, { liEl: li, otherUserId: docSnap.id, unreadCount: 0 });
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

  // Reset de estado do painel de mensagens ao trocar de chat
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubTyping) unsubTyping();
  messagesDiv.innerHTML = "";
  messagesDiv.renderedIds = new Set();
  messagesDiv.initialRenderDone = false;
  delete messagesDiv.dataset.initialized;
  messagesDiv.lastOptimisticEl = null;

  currentChatId = chatDoc.id;
  chatTitle.textContent = "Chat com " + userData.nome;
  chatAvatar.src = userData.avatar || "./img/avatar_usuario.png";
  chatAvatar.classList.remove("hidden");

  messageForm.classList.remove("hidden");

  const msgsRef = collection(db, "chats", currentChatId, "mensagens");
  const qMsgs = query(msgsRef, orderBy("enviadoEm", "asc"));
  unsubscribeMessages = onSnapshot(qMsgs, (snap) => {
    // Render incremental: só adiciona novas mensagens.
    if (!messagesDiv.dataset.initialized) {
      // skeleton de carregamento rápido (apenas antes do primeiro snapshot)
      messagesDiv.innerHTML = "";
      messagesDiv.dataset.initialized = "1";
    }

    if (!messagesDiv.renderedIds) messagesDiv.renderedIds = new Set();
    if (!messagesDiv.initialRenderDone) messagesDiv.initialRenderDone = false;

    const changes = snap.docChanges();
    if (changes.length === 0) return;

    changes.forEach((change) => {
      if (change.type !== "added") return;
      const id = change.doc.id;
      if (messagesDiv.renderedIds.has(id)) return;
      const msg = change.doc.data();
      const mine = msg.enviadoPor === currentUser.uid;
      const div = document.createElement("div");
      div.classList.add("message", mine ? "sent" : "received");

      // Animação suave somente para itens adicionados após o primeiro render
      if (messagesDiv.initialRenderDone) {
        div.classList.add(mine ? "sent-anim" : "received-anim");
      }

      const time = msg.enviadoEm?.toDate ? msg.enviadoEm.toDate() : null;
      const hora = time ? time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
      const dataKey = time ? time.toLocaleDateString("pt-BR") : "";
      if (dataKey) div.setAttribute("data-date", dataKey);
      div.innerHTML = `<div class=\"msg-text\">${escapeHtml(msg.texto)}</div><div class=\"msg-time\">${hora}</div>`;
      messagesDiv.appendChild(div);
      messagesDiv.renderedIds.add(id);

      // Se havia uma bolha otimista, remove quando o doc real chegar
      if (mine && messagesDiv.lastOptimisticEl) {
        try { messagesDiv.lastOptimisticEl.remove(); } catch(_) {}
        messagesDiv.lastOptimisticEl = null;
      }
    });

    insertDateDividers();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Marca conclusão do primeiro render (após o primeiro lote de 'added')
    if (!messagesDiv.initialRenderDone) messagesDiv.initialRenderDone = true;
  });

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function insertDateDividers() {
    const children = Array.from(messagesDiv.querySelectorAll(".message"));
    let lastDate = "";
    // Remove divisores antigos para recompor corretamente
    messagesDiv.querySelectorAll(".date-divider").forEach((el) => el.remove());

    for (const msgEl of children) {
      const iso = msgEl.getAttribute("data-date") || "";
      let label = iso;
      try {
        // Reconstroi data
        const parts = iso.split("/");
        // formato pt-BR: dd/mm/aaaa
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[2],10), parseInt(parts[1],10)-1, parseInt(parts[0],10));
          label = formatDateHuman(d);
        }
      } catch(_) {}

      const date = label;
      if (!date) continue;
      if (date !== lastDate) {
        const divider = document.createElement("div");
        divider.className = "date-divider";
        divider.textContent = date;
        messagesDiv.insertBefore(divider, msgEl);
        lastDate = date;
      }
    }
  }

  function formatDateHuman(date) {
    const now = new Date();
    const diffMs = now - date;
    const oneDay = 24*60*60*1000;
    const sevenDays = 7*oneDay;
    if (diffMs >= 0 && diffMs < sevenDays) {
      // Dentro de uma semana: mostrar dia da semana por extenso
      return date.toLocaleDateString("pt-BR", { weekday: "long" });
    }
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  chatMain.classList.add("active");
  backBtn.classList.remove("hidden");

  chatMain.classList.add("active");
  backBtn.classList.remove("hidden");
  if (menuToggle) menuToggle.style.display = "none";

  // zera visualmente o badge imediatamente
  const state = chatListState.get(otherUid);
  if (state && state.liEl) {
    state.unreadCount = 0;
    const badge = state.liEl.querySelector(".badge");
    if (badge) badge.textContent = "";
    state.liEl.classList.remove("has-unread");
  }

  // marca mensagens do outro usuário como lidas ao abrir o chat (assíncrono)
  markMessagesAsRead(currentChatId, otherUid);

  // observa typing do outro
  watchTyping(currentChatId, otherUid);
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentChatId) return;

  const texto = messageInput.value.trim();
  if (!texto) return;
  // Limpa imediatamente e renderiza otimistamente a mensagem
  messageInput.value = "";
  const optimistic = document.createElement("div");
  optimistic.classList.add("message", "sent", "sent-anim");
  optimistic.textContent = texto;
  messagesDiv.appendChild(optimistic);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  messagesDiv.lastOptimisticEl = optimistic;

  const msgRef = collection(db, "chats", currentChatId, "mensagens");
  await addDoc(msgRef, {
    texto,
    enviadoPor: currentUser.uid,
    enviadoEm: serverTimestamp(),
    lido: false
  });

  await setDoc(doc(db, "chats", currentChatId), {
    ultimoMensagem: texto,
    ultimoEnviadoPor: currentUser.uid,
    ultimaAtualizacao: serverTimestamp()
  }, { merge: true });

  // A lista oficial virá do onSnapshot; a mensagem otimista permanece visualmente igual
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

// Escuta os chats do usuário para ordenar por atividade e atualizar badges
function listenUserChats() {
  if (unsubUserChats) unsubUserChats();
  const chatsRef = collection(db, "chats");
  const qChats = query(
    chatsRef,
    where("participantes", "array-contains", currentUser.uid),
    orderBy("ultimaAtualizacao", "desc")
  );

  unsubUserChats = onSnapshot(qChats, async (snap) => {
    // calcular não lidas para cada chat e reordenar lista de usuários
    const order = [];
    const promises = [];

    snap.forEach((chatDoc) => {
      const data = chatDoc.data();
      const otherId = data.participantes.find((p) => p !== currentUser.uid);
      if (!otherId) return;

      // consulta mensagens não lidas deste chat enviadas pelo outro
      const msgsRef = collection(db, "chats", chatDoc.id, "mensagens");
      const qFromOther = query(
        msgsRef,
        where("enviadoPor", "==", otherId)
      );

      const p = getDocs(qFromOther).then((snapMsgs) => {
        let count = 0;
        snapMsgs.forEach((d)=>{ if (d.data().lido === false) count++; });
        console.debug("[listenUserChats] chat=", chatDoc.id, "otherId=", otherId, "unread=", count);

        // Se o chat aberto é com este usuário, não exibe/atualiza badge
        if (currentChatId === chatDoc.id) {
          count = 0;
        }

        const state = chatListState.get(otherId);
        if (state && state.liEl) {
          state.unreadCount = count;
          const badge = state.liEl.querySelector(".badge");
          if (badge) {
            badge.textContent = String(count);
          }
          state.liEl.classList.toggle("has-unread", count > 0);

          // Atualiza última mensagem na lista
          const lastMsgEl = state.liEl.querySelector(`[data-last-msg="${otherId}"]`);
          if (lastMsgEl) {
            lastMsgEl.textContent = data.ultimoMensagem || "";
          }
        }

        order.push({ otherId, chatId: chatDoc.id, lastBy: data.ultimoEnviadoPor, count, lastText: data.ultimoMensagem, updated: data.ultimaAtualizacao?.seconds || data.criadoEm?.seconds || 0 });
      });
      promises.push(p);
    });

    await Promise.all(promises);

    // Ordena: quem tem não lidas primeiro; depois por ultimaAtualizacao desc
    order.sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (b.count > 0 && a.count === 0) return 1;
      if (b.updated !== a.updated) return b.updated - a.updated;
      // desempate estável por otherId para evitar flutuação
      return String(a.otherId).localeCompare(String(b.otherId));
    });

    // Reordena visualmente a userList conforme ordem calculada
    const fragment = document.createDocumentFragment();
    const used = new Set();
    order.forEach(({ otherId }) => {
      const state = chatListState.get(otherId);
      if (state && state.liEl) {
        fragment.appendChild(state.liEl);
        used.add(otherId);
      }
    });
    // adiciona quaisquer usuários que ainda não têm chat no final
    userListEl.querySelectorAll("li").forEach((li) => {
      if (!used.has(li.dataset.uid)) fragment.appendChild(li);
    });

    userListEl.innerHTML = "";
    userListEl.appendChild(fragment);
  });
}

async function markMessagesAsRead(chatId, otherUid) {
  const msgsRef = collection(db, "chats", chatId, "mensagens");
  const qFromOther = query(
    msgsRef,
    where("enviadoPor", "==", otherUid)
  );
  try {
    const unreadSnap = await getDocs(qFromOther);
    let toUpdate = 0;
    const batch = writeBatch(db);
    unreadSnap.forEach((d) => {
      const data = d.data();
      if (data.lido === false) {
        toUpdate++;
        batch.update(d.ref, { lido: true });
      }
    });
    console.debug("[markMessagesAsRead] chat=", chatId, "otherUid=", otherUid, "docs=", unreadSnap.size, "updating=", toUpdate);
    if (toUpdate > 0) await batch.commit();

    const state = chatListState.get(otherUid);
    if (state && state.liEl) {
      state.unreadCount = 0;
      const badge = state.liEl.querySelector(".badge");
      if (badge) badge.textContent = "";
      state.liEl.classList.remove("has-unread");
    }
  } catch (err) {
    console.error("[markMessagesAsRead] erro ao atualizar mensagens como lidas:", err);
  }
}

// Notificações e som quando chegar mensagem nova
// Observa globalmente todas as mensagens dos chats do usuário (aproveita listenUserChats para ordem)
const globalMsgUnsub = (() => {
  const chatsRef = collection(db, "chats");
  const qChats = query(chatsRef, where("participantes", "array-contains", auth.currentUser?.uid || "__placeholder__"));
  let innerUnsubs = [];

  onAuthStateChanged(auth, (u) => {
    // reconfigura quando logar
    innerUnsubs.forEach((fn) => fn());
    innerUnsubs = [];
    if (!u) return;

    getDocs(qChats).then((snap) => {
      snap.forEach((chatDoc) => {
        const data = chatDoc.data();
        const otherId = data.participantes.find((p) => p !== u.uid);
        const msgsRef = collection(db, "chats", chatDoc.id, "mensagens");
        const qLatest = query(msgsRef, orderBy("enviadoEm", "desc"));
        const unsub = onSnapshot(qLatest, (s) => {
          const docs = s.docs;
          if (docs.length === 0) return;
          const msg = docs[0].data();
          const isFromOther = msg.enviadoPor && msg.enviadoPor !== u.uid;
          if (!isFromOther) return;

          // Se o chat desse usuário está aberto, não toca e não notifica
          if (currentChatId === chatDoc.id) return;

          try { if (notifyAudio) notifyAudio.play().catch(()=>{}); } catch(_) {}

          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            getDoc(doc(db, "usuarios", otherId)).then((uSnap) => {
              const fromName = uSnap.exists() ? (uSnap.data().nome || "Mensagem nova") : "Mensagem nova";
              const n = new Notification(fromName, { body: msg.texto || "Nova mensagem", icon: "./img/iconelogo.png" });
              n.onclick = () => {
                window.focus();
              };
            }).catch(()=>{});
          }
        });
        innerUnsubs.push(unsub);
      });
    }).catch(()=>{});
  });
})();

// Indicador de digitando...
let typingTimeout = null;
const TYPING_DEBOUNCE_MS = 1200;

messageInput.addEventListener("input", async () => {
  if (!currentChatId) return;
  try {
    await setDoc(doc(db, "chats", currentChatId), { [`typing_${currentUser.uid}`]: true }, { merge: true });
  } catch(_) {}
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    try { await setDoc(doc(db, "chats", currentChatId), { [`typing_${currentUser.uid}`]: false }, { merge: true }); } catch(_) {}
  }, TYPING_DEBOUNCE_MS);
});

// Mostra loader de digitando do outro usuário no chat aberto
function renderTypingIndicator(show) {
  const existing = messagesDiv.querySelector(".typing-indicator");
  if (show) {
    if (existing) return;
    const el = document.createElement("div");
    el.className = "typing-indicator";
    el.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } else if (existing) {
    existing.remove();
  }
}

// Observa o doc do chat atual para exibir o typing do outro participante
let unsubTyping = null;
async function watchTyping(chatId, otherUid) {
  if (unsubTyping) unsubTyping();
  const chatDocRef = doc(db, "chats", chatId);
  unsubTyping = onSnapshot(chatDocRef, (snap) => {
    const data = snap.data();
    if (!data) return;
    const flag = data[`typing_${otherUid}`];
    renderTypingIndicator(Boolean(flag));
  });
}