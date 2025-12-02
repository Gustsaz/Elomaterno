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

function getPsiFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("psi");
}

let currentChatId = null;
let unsubscribeMessages = null;
let unsubUserChats = null;

const chatListState = new Map();

let notifyAudio = null;
try {
  notifyAudio = new Audio("./sounds/not.mp3");
  notifyAudio.preload = "auto";
} catch (_) { }

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function ensureNotificationPermission() {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default" && isMobile()) {
      await Notification.requestPermission();
    }
  } catch (_) { }
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

  
  const psiFromURL = getPsiFromURL();
  if (psiFromURL) {
    
    const waitList = setInterval(() => {
      const state = chatListState.get(psiFromURL);
      if (state) {
        clearInterval(waitList);
        openChatWith(psiFromURL, {
          nome: state.liEl.querySelector(".user-name")?.textContent || "Psicólogo",
          avatar: state.liEl.querySelector("img")?.src || "./img/avatar_usuario.png"
        });
      }
    }, 100);
  }

  ensureNotificationPermission();
  const unlock = () => {
    try { if (notifyAudio) { notifyAudio.play().then(() => { notifyAudio.pause(); notifyAudio.currentTime = 0; }).catch(() => { }); } } catch (_) { }
    window.removeEventListener("click", unlock, { capture: true });
    window.removeEventListener("touchstart", unlock, { capture: true });
  };
  window.addEventListener("click", unlock, { capture: true, once: true });
  window.addEventListener("touchstart", unlock, { capture: true, once: true });
});

async function loadUsers() {
  userListEl.innerHTML = "";

  // skeleton enquanto carrega
  for (let i = 0; i < 4; i++) {
    const sk = document.createElement("div");
    sk.className = "user-skel";
    sk.innerHTML = `
      <div class="avatar skeleton"></div>
      <div class="lines">
        <div class="line1 skeleton"></div>
        <div class="line2 skeleton"></div>
      </div>
    `;
    userListEl.appendChild(sk);
  }

  try {
    
    const consultasRef = collection(db, "Consultas");
    const q = query(consultasRef, where("Mae", "==", currentUser.uid));
    const snapConsultas = await getDocs(q);

    if (snapConsultas.empty) {
      userListEl.innerHTML = "<p style='padding: 15px;'>Você ainda não possui profissionais vinculados.</p>";
      return;
    }

    
    const psicSet = new Set();
    const advSet = new Set();

    snapConsultas.forEach(doc => {
      const data = doc.data();
      if (data.Psicologo) psicSet.add(data.Psicologo);
      if (data.Advogado) advSet.add(data.Advogado);
    });

    const psicUids = Array.from(psicSet).filter(Boolean);
    const advUids = Array.from(advSet).filter(Boolean);

    if (psicUids.length === 0 && advUids.length === 0) {
      userListEl.innerHTML = "<p style='padding: 15px;'>Nenhum profissional encontrado.</p>";
      return;
    }

    
    let psicDocs = [];
    if (psicUids.length > 0) {
      if (psicUids.length <= 10) {
        const qPsi = query(collection(db, "psicologos"), where("uid", "in", psicUids));
        const snapPsi = await getDocs(qPsi);
        snapPsi.forEach(s => psicDocs.push({ tipo: "psicologo", id: s.id, ...s.data() }));
      } else {
        const promises = psicUids.map(uid =>
          getDocs(query(collection(db, "psicologos"), where("uid", "==", uid))).then(snap => {
            if (!snap.empty) {
              const d = snap.docs[0];
              return { tipo: "psicologo", id: d.id, ...d.data() };
            }
            return null;
          })
        );
        psicDocs = (await Promise.all(promises)).filter(Boolean);
      }
    }

    
    let advDocs = [];
    if (advUids.length > 0) {
      if (advUids.length <= 10) {
        const qAdv = query(collection(db, "advogados"), where("uid", "in", advUids));
        const snapAdv = await getDocs(qAdv);
        snapAdv.forEach(s => advDocs.push({ tipo: "advogado", id: s.id, ...s.data() }));
      } else {
        const promises = advUids.map(uid =>
          getDocs(query(collection(db, "advogados"), where("uid", "==", uid))).then(snap => {
            if (!snap.empty) {
              const d = snap.docs[0];
              return { tipo: "advogado", id: d.id, ...d.data() };
            }
            return null;
          })
        );
        advDocs = (await Promise.all(promises)).filter(Boolean);
      }
    }

    
    userListEl.innerHTML = "";

    // 6) RENDERIZAR PSICÓLOGOS
    psicDocs.forEach(p => {
      const uid = p.uid || p.id;
      const li = document.createElement("li");
      li.dataset.uid = uid;
      li.dataset.tipo = "psicologo";
      li.innerHTML = `
        <img src="${p.avatar || './img/avatar_usuario.png'}">
        <div class="user-meta">
          <span class="user-name">${p.nome}</span>
          <span class="last-message" data-last-msg="${uid}"></span>
        </div>
        <span class="badge"></span>
      `;
      li.addEventListener("click", () => openChatWith(uid, { nome: p.nome, avatar: p.avatar }));
      userListEl.appendChild(li);

      chatListState.set(uid, {
        liEl: li,
        otherUserId: uid,
        unreadCount: 0
      });
    });

    
    advDocs.forEach(a => {
      const uid = a.uid || a.id;
      const li = document.createElement("li");
      li.dataset.uid = uid;
      li.dataset.tipo = "advogado";
      li.innerHTML = `
        <img src="${a.avatar || './img/avatar_usuario.png'}">
        <div class="user-meta">
          <span class="user-name">${a.nome}</span>
          <span class="last-message" data-last-msg="${uid}"></span>
        </div>
        <span class="badge"></span>
      `;
      li.addEventListener("click", () => openChatWith(uid, { nome: a.nome, avatar: a.avatar }));
      userListEl.appendChild(li);

      chatListState.set(uid, {
        liEl: li,
        otherUserId: uid,
        unreadCount: 0
      });
    });

  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
    userListEl.innerHTML = "<p style='padding: 15px;'>Erro ao carregar profissionais.</p>";
  }
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
  const qMsgs = query(
    msgsRef,
    orderBy("enviadoEm", "asc")
  );

  unsubscribeMessages = onSnapshot(qMsgs, (snap) => {
    messagesDiv.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data();
      const mine = m.enviadoPor === currentUser.uid;

      const div = document.createElement("div");
      div.classList.add("message", mine ? "sent" : "received");

      const hora = m.enviadoEm?.toDate().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });

      if (m.audio) {
        const audioId = "aud_" + d.id;

        div.innerHTML = `
    <div class="audio-message">
      <div class="custom-audio" data-audio="${audioId}">
        <button class="audio-play-btn"><i class="fa fa-play"></i></button>

        <input type="range" class="audio-progress" value="0" min="0" max="100">

        <span class="audio-time">00:00</span>
      </div>

      <audio id="${audioId}" preload="auto" src="${m.audio}"></audio>
    </div>

    <div class="msg-time">${hora}</div>
  `;

        setTimeout(() => setupCustomPlayer(audioId), 50);
      }
      else {
        div.innerHTML = `
    <div class="msg-text">${m.texto}</div>
    <div class="msg-time">${hora}</div>
  `;
      }


      messagesDiv.appendChild(div);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
    messagesDiv.querySelectorAll(".date-divider").forEach((el) => el.remove());

    for (const msgEl of children) {
      const iso = msgEl.getAttribute("data-date") || "";
      let label = iso;
      try {
        const parts = iso.split("/");
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          label = formatDateHuman(d);
        }
      } catch (_) { }

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
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    if (diffMs >= 0 && diffMs < sevenDays) {
      return date.toLocaleDateString("pt-BR", { weekday: "long" });
    }
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  chatMain.classList.add("active");
  backBtn.classList.remove("hidden");

  chatMain.classList.add("active");
  backBtn.classList.remove("hidden");
  if (menuToggle) menuToggle.style.display = "none";

  const state = chatListState.get(otherUid);
  if (state && state.liEl) {
    state.unreadCount = 0;
    const badge = state.liEl.querySelector(".badge");
    if (badge) badge.textContent = "";
    state.liEl.classList.remove("has-unread");
  }

  markMessagesAsRead(currentChatId, otherUid);

  watchTyping(currentChatId, otherUid);
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentChatId) return;

  const texto = messageInput.value.trim();
  if (!texto) return;
  messageInput.value = "";
  const optimistic = document.createElement("div");
  optimistic.classList.add("message", "sent", "sent-anim");
  const hora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
  optimistic.innerHTML = `
    <div class="msg-text">${texto}</div>
    <div class="msg-time">${hora}</div>
  `;
  messagesDiv.appendChild(optimistic);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  messagesDiv.lastOptimisticEl = optimistic;

  try {
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
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    
    if (messagesDiv.lastOptimisticEl) {
      messagesDiv.lastOptimisticEl.remove();
      messagesDiv.lastOptimisticEl = null;
    }
    
    messageInput.value = texto;
    alert("Erro ao enviar mensagem. Tente novamente.");
  }

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

function listenUserChats() {
  if (unsubUserChats) unsubUserChats();
  const chatsRef = collection(db, "chats");
  const qChats = query(
    chatsRef,
    where("participantes", "array-contains", currentUser.uid),
    orderBy("ultimaAtualizacao", "desc")
  );

  unsubUserChats = onSnapshot(qChats, async (snap) => {
    const order = [];
    const promises = [];

    snap.forEach((chatDoc) => {
      const data = chatDoc.data();
      const otherId = data.participantes.find((p) => p !== currentUser.uid);
      if (!otherId) return;

      const msgsRef = collection(db, "chats", chatDoc.id, "mensagens");
      const qFromOther = query(
        msgsRef,
        where("enviadoPor", "==", otherId)
      );

      const p = getDocs(qFromOther).then((snapMsgs) => {
        let count = 0;
        snapMsgs.forEach((d) => { if (d.data().lido === false) count++; });
        console.debug("[listenUserChats] chat=", chatDoc.id, "otherId=", otherId, "unread=", count);

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

    order.sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (b.count > 0 && a.count === 0) return 1;
      if (b.updated !== a.updated) return b.updated - a.updated;
      // desempate estável por otherId para evitar flutuação
      return String(a.otherId).localeCompare(String(b.otherId));
    });

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



const globalMsgUnsub = (() => {
  const chatsRef = collection(db, "chats");
  const qChats = query(chatsRef, where("participantes", "array-contains", auth.currentUser?.uid || "__placeholder__"));
  let innerUnsubs = [];

  onAuthStateChanged(auth, (u) => {
    
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

          
          if (currentChatId === chatDoc.id) return;

          try { if (notifyAudio) notifyAudio.play().catch(() => { }); } catch (_) { }

          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            getDoc(doc(db, "usuarios", otherId)).then((uSnap) => {
              const fromName = uSnap.exists() ? (uSnap.data().nome || "Mensagem nova") : "Mensagem nova";
              const n = new Notification(fromName, { body: msg.texto || "Nova mensagem", icon: "./img/iconelogo.png" });
              n.onclick = () => {
                window.focus();
              };
            }).catch(() => { });
          }
        });
        innerUnsubs.push(unsub);
      });
    }).catch(() => { });
  });
})();


let typingTimeout = null;
const TYPING_DEBOUNCE_MS = 1200;

messageInput.addEventListener("input", async () => {
  if (!currentChatId) return;
  try {
    await setDoc(doc(db, "chats", currentChatId), { [`typing_${currentUser.uid}`]: true }, { merge: true });
  } catch (_) { }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    try { await setDoc(doc(db, "chats", currentChatId), { [`typing_${currentUser.uid}`]: false }, { merge: true }); } catch (_) { }
  }, TYPING_DEBOUNCE_MS);
});


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





let mediaRecorder = null;
let audioChunks = [];
const voiceBtn = document.getElementById("voiceBtn");

voiceBtn.addEventListener("click", async () => {
  if (!currentChatId) return;

  
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();

        reader.onload = async function () {
          const base64Audio = reader.result;

          try {
            const msgRef = collection(db, "chats", currentChatId, "mensagens");
            await addDoc(msgRef, {
              audio: base64Audio,
              texto: "",
              enviadoPor: currentUser.uid,
              enviadoEm: serverTimestamp(),
              lido: false
            });

            await setDoc(doc(db, "chats", currentChatId), {
              ultimoMensagem: "[Áudio]",
              ultimoEnviadoPor: currentUser.uid,
              ultimaAtualizacao: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            console.error("Erro ao enviar áudio:", err);
            alert("Erro ao enviar áudio.");
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      voiceBtn.classList.add("recording");
    } catch (err) {
      alert("Não foi possível acessar o microfone.");
      console.error(err);
    }

    return;
  }

  
  if (mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    voiceBtn.classList.remove("recording");
  }
});

function setupCustomPlayer(id) {
  const audio = document.getElementById(id);
  const wrapper = document.querySelector(`[data-audio="${id}"]`);

  if (!audio || !wrapper) return;

  const btn = wrapper.querySelector(".audio-play-btn");
  const range = wrapper.querySelector(".audio-progress");
  const timeLabel = wrapper.querySelector(".audio-time");

  let isDragging = false;

  
  audio.addEventListener("loadedmetadata", () => {
    range.max = Math.floor(audio.duration);
    timeLabel.textContent = "00:" + String(Math.floor(audio.duration)).padStart(2, "0");
  });

  
  btn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
      btn.innerHTML = `<i class="fa fa-pause"></i>`;
    } else {
      audio.pause();
      btn.innerHTML = `<i class="fa fa-play"></i>`;
    }
  });

  
  audio.addEventListener("timeupdate", () => {
    if (!isDragging) range.value = audio.currentTime;

    timeLabel.textContent =
      "00:" + String(Math.floor(audio.currentTime)).padStart(2, "0");
  });

  
  range.addEventListener("input", () => {
    isDragging = true;
  });

  
  range.addEventListener("change", () => {
    isDragging = false;
    audio.currentTime = range.value;
  });

  
  audio.addEventListener("ended", () => {
    btn.innerHTML = `<i class="fa fa-play"></i>`;
    audio.currentTime = 0;
    range.value = 0;
    timeLabel.textContent = "00:00";
  });
}
