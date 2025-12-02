import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const avatarEl = document.getElementById("menu-avatar");
const nomeEl = document.getElementById("menu-nome");
const emailEl = document.getElementById("menu-email");



onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      if (snap.exists()) {
        const dados = snap.data();
        if (nomeEl) nomeEl.textContent = dados.nome || user.displayName || "Usuário";
        if (emailEl) emailEl.textContent = dados.email || user.email || "";
        if ((dados.fotoURL || dados.avatar) && avatarEl) {
          // prioriza foto do documento, fallback para campo 'avatar'
          avatarEl.src = dados.fotoURL || dados.avatar;
        }
      } else {
        if (nomeEl) nomeEl.textContent = user.displayName || "Usuário";
        if (emailEl) emailEl.textContent = user.email || "";
      }
    } catch (err) {
      console.error("Erro ao obter dados do usuário:", err);
      if (nomeEl) nomeEl.textContent = user.displayName || "Usuário";
      if (emailEl) emailEl.textContent = user.email || "";
    }
  } else {
    // usuário deslogado — limpa placeholders (opcional)
    if (nomeEl) nomeEl.textContent = "";
    if (emailEl) emailEl.textContent = "";
    if (avatarEl) avatarEl.src = "./img/avatar_usuario.png";
  }
});


document.querySelectorAll(".com-brilho").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  });
});

const menuToggle = document.getElementById("menuToggle");
const botoesMenu = document.querySelector(".botoes");

if (menuToggle && botoesMenu) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    botoesMenu.classList.toggle("aberto");
  });
}

document.addEventListener("click", (event) => {
  const menu = document.querySelector(".botoes");
  const toggle = document.querySelector("#menuToggle");

  if (!menu) return;

  if (menu.classList.contains("aberto")) {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      menu.classList.remove("aberto");
    }
  }
});

const logoutBtn = document.getElementById("logoutBtn");
const menuLogoutBtn = document.getElementById("menuLogoutBtn");

[logoutBtn, menuLogoutBtn].forEach((btn) => {
  if (btn) {
    btn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "formPerfil.html";
      } catch (error) {
        console.error("Erro ao sair:", error);
      }
    });
  }
});

const themeToggleIcon = document.getElementById("theme-toggle-icon");
const themeToggleDiv = document.getElementById("theme-toggle");
const menuThemeToggleIcon = document.getElementById("menu-theme-toggle-icon");
const body = document.body;

function updateThemeIcon(iconEl, isDark) {
  if (!iconEl) return;
  iconEl.classList.remove("fa-sun", "fa-moon");
  iconEl.classList.add(isDark ? "fa-sun" : "fa-moon");
}

function applyTheme(isDark) {
  if (isDark) {
    body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  } else {
    body.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
  }
  updateThemeIcon(themeToggleIcon, isDark);
  updateThemeIcon(menuThemeToggleIcon, isDark);
}

applyTheme(localStorage.getItem("theme") === "dark");

[themeToggleIcon, menuThemeToggleIcon, themeToggleDiv].forEach((el) => {
  if (el) {
    el.addEventListener("click", () => {
      const isDark = !body.hasAttribute("data-theme");
      applyTheme(isDark);
    });
  }
});


function initAccessibility() {
  const toggles = document.querySelectorAll("#accessibility-toggle, #accessibility-toggle-mobile");
  const menus = document.querySelectorAll("#accessibility-menu, #accessibility-menu-mobile");

  if (!toggles.length || !menus.length) return;

  toggles.forEach((toggle, idx) => {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menus[idx].classList.toggle("hidden");
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".accessibility-selector")) {
      menus.forEach(menu => menu.classList.add("hidden"));
    }
  });

  const selectAll = (action) =>
    document.querySelectorAll(`#${action}, [data-action="${action}"]`);

  
  let savedAccessibility =
    JSON.parse(localStorage.getItem("accessibilitySettings")) || {
      readingMask: false,
      boldText: false,
      highContrast: false,
      lineSpacing: "normal",
      fonte_number: 1,
      espacamento_number: 1,
      filtro_daltonismo: "Filtros_daltonismo",
      leitura_voz: false,
      mascara_leitura: false,
      letras_destaque: false
    };

  
  function saveAccessibilityLocal() {
    localStorage.setItem("accessibilitySettings", JSON.stringify(savedAccessibility));
  }

  
  function setActiveFor(action, isActive) {
    selectAll(action).forEach(el => {
      if (!el) return;
      el.classList.toggle("active", !!isActive);
    });
  }

  
  function updateActiveStates() {
    const fonteActive = (savedAccessibility.fonte_number || 1) !== 1;
    setActiveFor("increase-font", fonteActive);
    setActiveFor("decrease-font", fonteActive);

    const espActive = (savedAccessibility.espacamento_number || 1) !== 1;
    setActiveFor("increase-line", espActive);
    setActiveFor("decrease-line", espActive);

    const filtroActive = (modes[currentModeIndex]?.name !== "Filtros Daltonismo");
    setActiveFor("colorblind-filter", filtroActive);

    setActiveFor("screen-reader", !!savedAccessibility.leitura_voz);
    setActiveFor("reading-mask", !!savedAccessibility.mascara_leitura);
    setActiveFor("bold-text", !!savedAccessibility.letras_destaque);

    
    setActiveFor("high-contrast", !!savedAccessibility.highContrast);
  }

  
  async function getUserDocRefOrNull() {
    let user = auth.currentUser;
    if (!user) {
      user = await new Promise(resolve => {
        const unsub = onAuthStateChanged(auth, (u) => {
          unsub();
          resolve(u);
        });
      });
    }
    if (!user) return null;
    return doc(db, "usuarios", user.uid);
  }

  
  async function saveExtrasToFirestore(updates = {}) {
    try {
      const userDocRef = await getUserDocRefOrNull();
      if (!userDocRef) return;
      const payload = {};
      for (const [k, v] of Object.entries(updates)) {
        payload[`extras.${k}`] = v;
      }
      try {
        await updateDoc(userDocRef, payload);
      } catch (err) {
        const base = { extras: {} };
        for (const [k, v] of Object.entries(updates)) base.extras[k] = v;
        await setDoc(userDocRef, base, { merge: true });
      }
    } catch (err) {
      console.error("[accessibility] Erro ao salvar extras no Firestore:", err);
    }
  }

  
  const modes = [
    { name: "Filtros Daltonismo", className: "" },
    { name: "Protanopia", className: "colorblind-protanopia" },
    { name: "Deuteranopia", className: "colorblind-deuteranopia" },
    { name: "Tritanopia", className: "colorblind-tritanopia" },
    { name: "Acromatopsia", className: "colorblind-Acromatopsia" },
  ];
  let savedMode =
    localStorage.getItem("colorblindMode") || (savedAccessibility.filtro_daltonismo === "Filtros_daltonismo" ? "Filtros Daltonismo" : savedAccessibility.filtro_daltonismo) || "Filtros Daltonismo";
  let currentModeIndex = modes.findIndex((m) => m.name === savedMode);
  if (currentModeIndex === -1) currentModeIndex = 0;

  function mapModeToFirestoreName(modeName) {
    if (modeName === "Filtros Daltonismo") return "Filtros_daltonismo";
    return modeName;
  }

  
  function applyColorblindMode(index, persist = true) {
    const classesToRemove = modes.map((m) => m.className).filter(Boolean);
    if (classesToRemove.length) document.body.classList.remove(...classesToRemove);

    const mode = modes[index];
    if (mode.className) document.body.classList.add(mode.className);

    localStorage.setItem("colorblindMode", mode.name);

    const desktopBtn = document.querySelector("#colorblind-filter");
    const mobileBtn = document.querySelector('[data-action="colorblind-filter"]');

    if (desktopBtn) desktopBtn.innerHTML = `<i class="fa fa-low-vision"></i> ${mode.name}`;
    if (mobileBtn) mobileBtn.innerHTML = `<i class="fa fa-low-vision"></i> ${mode.name}`;

    savedAccessibility.filtro_daltonismo = mapModeToFirestoreName(mode.name);
    saveAccessibilityLocal();
    if (persist) saveExtrasToFirestore({ filtro_daltonismo: savedAccessibility.filtro_daltonismo });
    updateActiveStates();
  }

  
  (async function hydrateFromFirestore() {
    try {
      const userDocRef = await getUserDocRefOrNull();
      if (!userDocRef) {
        
        updateActiveStates();
        return;
      }
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        updateActiveStates();
        return;
      }
      const extras = snap.data()?.extras || {};
      if (typeof extras.fonte_number === "number") savedAccessibility.fonte_number = extras.fonte_number;
      if (typeof extras.espacamento_number === "number") savedAccessibility.espacamento_number = extras.espacamento_number;
      if (typeof extras.filtro_daltonismo === "string") savedAccessibility.filtro_daltonismo = extras.filtro_daltonismo;
      if (typeof extras.leitura_voz === "boolean") savedAccessibility.leitura_voz = extras.leitura_voz;
      if (typeof extras.mascara_leitura === "boolean") savedAccessibility.mascara_leitura = extras.mascara_leitura;
      if (typeof extras.letras_destaque === "boolean") savedAccessibility.letras_destaque = extras.letras_destaque;

      
      if (savedAccessibility.leitura_voz) localStorage.setItem("screenReader", "true");
      else localStorage.removeItem("screenReader");

      if (savedAccessibility.filtro_daltonismo) {
        const mapBack = savedAccessibility.filtro_daltonismo === "Filtros_daltonismo" ? "Filtros Daltonismo" : savedAccessibility.filtro_daltonismo;
        localStorage.setItem("colorblindMode", mapBack);
        currentModeIndex = modes.findIndex(m => m.name === mapBack);
        if (currentModeIndex === -1) currentModeIndex = 0;
      }

      saveAccessibilityLocal();
      
      applyColorblindMode(currentModeIndex, false);
      updateActiveStates();
    } catch (err) {
      console.warn("[accessibility] hydrate error:", err);
      updateActiveStates();
    }
  })();

  
  const increaseBtns = selectAll("increase-font");
  const decreaseBtns = selectAll("decrease-font");
  const defaultFontSize = parseFloat(getComputedStyle(document.body).fontSize);
  let currentFontSize =
    parseFloat(localStorage.getItem("fontSize")) || defaultFontSize;

  function applyFontSize(delta) {
    document
      .querySelectorAll(
        "p, span, a, li, h1, h2, h3, h4, h5, h6, button, label, input, textarea"
      )
      .forEach((el) => {
        const baseSize = parseFloat(
          getComputedStyle(el).getPropertyValue("font-size")
        );
        el.style.fontSize = baseSize + delta + "px";
      });
  }

  function changeFontSize(delta, deltaFonteNumber = 0) {
    currentFontSize += delta;
    applyFontSize(delta);
    savedAccessibility.fonte_number = Math.max(1, (savedAccessibility.fonte_number || 1) + deltaFonteNumber);
    saveAccessibilityLocal();
    saveExtrasToFirestore({ fonte_number: savedAccessibility.fonte_number });
    updateActiveStates();
  }

  if (currentFontSize !== defaultFontSize) {
    applyFontSize(currentFontSize - defaultFontSize);
  }

  increaseBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      changeFontSize(2, +1);
      localStorage.setItem("fontSize", currentFontSize);
    })
  );
  decreaseBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      changeFontSize(-2, -1);
      localStorage.setItem("fontSize", currentFontSize);
    })
  );

  
  selectAll("colorblind-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentModeIndex = (currentModeIndex + 1) % modes.length;
      applyColorblindMode(currentModeIndex);
    })
  );

  
  let speechEnabled = localStorage.getItem("screenReader") === "true";
  let navigationMode = "mouse";
  let lastSpokenElement = null;

  function enableSpeech() {
    document.body.addEventListener("mouseover", handleSpeechMouse);
    document.body.addEventListener("focusin", handleSpeechTab);
  }
  function disableSpeech() {
    document.body.removeEventListener("mouseover", handleSpeechMouse);
    document.body.removeEventListener("focusin", handleSpeechTab);
    window.speechSynthesis.cancel();
  }
  function handleSpeechMouse(e) {
    if (!speechEnabled || navigationMode !== "mouse") return;
    if (e.target === lastSpokenElement) return;
    lastSpokenElement = e.target;
    speakTextFromElement(e.target);
  }
  function handleSpeechTab(e) {
    if (!speechEnabled || navigationMode !== "tab") return;
    if (e.target === lastSpokenElement) return;
    lastSpokenElement = e.target;
    speakTextFromElement(e.target);
  }
  function speakTextFromElement(el) {
    const ariaLabel = el.getAttribute?.("aria-label");
    const alt = el.alt || el.getAttribute?.("alt");
    const title = el.title || el.getAttribute?.("title");
    const value = el.value || "";
    const text = (ariaLabel || alt || title || value || el.innerText || "").trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  if (speechEnabled) enableSpeech();

  selectAll("screen-reader").forEach((btn) =>
    btn.addEventListener("click", () => {
      speechEnabled = !speechEnabled;
      if (speechEnabled) enableSpeech();
      else disableSpeech();
      localStorage.setItem("screenReader", speechEnabled);
      savedAccessibility.leitura_voz = !!speechEnabled;
      saveAccessibilityLocal();
      saveExtrasToFirestore({ leitura_voz: savedAccessibility.leitura_voz });
      updateActiveStates();
    })
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab") navigationMode = "tab";
  });
  window.addEventListener("mousemove", () => {
    navigationMode = "mouse";
  });

  
  const readingMaskOverlay = document.getElementById("reading-mask-overlay");
  const highlightWindow = readingMaskOverlay?.querySelector(".highlight-window");

  
  if (highlightWindow) {
    highlightWindow.style.pointerEvents = "none";
  }

  
  if (savedAccessibility.mascara_leitura && readingMaskOverlay) {
    readingMaskOverlay.style.display = "block";
    document.body.classList.add("reading-mask-active");
  }

  
  let readingMaskAttached = false;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function updateHighlightPositionByClientY(clientY) {
    if (!highlightWindow) return;
    const viewportH = window.innerHeight;
    const h = highlightWindow.offsetHeight || 120;
    
    const top = clamp(clientY - Math.round(h / 2), 0, Math.max(0, viewportH - h));
    highlightWindow.style.top = `${top}px`;
  }

  function onReadingMouseMove(e) {
    
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    if (typeof clientY === "number") updateHighlightPositionByClientY(clientY);
  }

  function onReadingScrollOrResize() {
    
    if (!highlightWindow) return;
    const currentTop = parseInt(highlightWindow.style.top || "0", 10) || 0;
    const h = highlightWindow.offsetHeight || 120;
    const maxTop = Math.max(0, window.innerHeight - h);
    const newTop = clamp(currentTop, 0, maxTop);
    highlightWindow.style.top = `${newTop}px`;
  }

  function attachReadingMaskListeners() {
    if (readingMaskAttached) return;
    window.addEventListener("mousemove", onReadingMouseMove, { passive: true });
    window.addEventListener("touchmove", onReadingMouseMove, { passive: true });
    window.addEventListener("scroll", onReadingScrollOrResize, { passive: true });
    window.addEventListener("resize", onReadingScrollOrResize, { passive: true });
    readingMaskAttached = true;
  }

  function detachReadingMaskListeners() {
    if (!readingMaskAttached) return;
    window.removeEventListener("mousemove", onReadingMouseMove);
    window.removeEventListener("touchmove", onReadingMouseMove);
    window.removeEventListener("scroll", onReadingScrollOrResize);
    window.removeEventListener("resize", onReadingScrollOrResize);
    readingMaskAttached = false;
  }

  
  selectAll("reading-mask").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = readingMaskOverlay.style.display === "block";
      
      readingMaskOverlay.style.display = active ? "none" : "block";
      document.body.classList.toggle("reading-mask-active", !active);

      
      savedAccessibility.mascara_leitura = !active;
      saveAccessibilityLocal();
      saveExtrasToFirestore({ mascara_leitura: savedAccessibility.mascara_leitura });

      
      if (!active) {
        
        attachReadingMaskListeners();
        
        
        const centerY = window.innerHeight / 2;
        updateHighlightPositionByClientY(centerY);
      } else {
        
        detachReadingMaskListeners();
      }

      updateActiveStates();
    })
  );

  
  if (readingMaskOverlay && readingMaskOverlay.style.display === "block") {
    attachReadingMaskListeners();
    
    updateHighlightPositionByClientY(window.innerHeight / 2);
  }


  
  if (savedAccessibility.boldText) document.body.classList.add("bold-text-active");

  selectAll("bold-text").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = document.body.classList.toggle("bold-text-active");
      savedAccessibility.letras_destaque = active;
      saveAccessibilityLocal();
      saveExtrasToFirestore({ letras_destaque: savedAccessibility.letras_destaque });
      updateActiveStates();
    })
  );

  
  selectAll("high-contrast").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = document.body.classList.toggle("high-contrast-active");
      savedAccessibility.highContrast = active;
      saveAccessibilityLocal();
      updateActiveStates();
    })
  );

  
  function applyLineSpacing(state) {
    document.body.classList.remove(
      "line-spacing-sm",
      "line-spacing-normal",
      "line-spacing-lg"
    );
    if (state === "small") document.body.classList.add("line-spacing-sm");
    else if (state === "normal") document.body.classList.add("line-spacing-normal");
    else if (state === "large") document.body.classList.add("line-spacing-lg");
    savedAccessibility.lineSpacing = state;
    if (state === "small") savedAccessibility.espacamento_number = Math.max(1, (savedAccessibility.espacamento_number || 1) - 1);
    else if (state === "normal") savedAccessibility.espacamento_number = 1;
    else if (state === "large") savedAccessibility.espacamento_number = Math.max(1, (savedAccessibility.espacamento_number || 1) + 1);
    saveAccessibilityLocal();
    saveExtrasToFirestore({ espacamento_number: savedAccessibility.espacamento_number });
    updateActiveStates();
  }

  selectAll("increase-line").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (savedAccessibility.lineSpacing === "small") applyLineSpacing("normal");
      else if (savedAccessibility.lineSpacing === "normal") applyLineSpacing("large");
    })
  );
  selectAll("decrease-line").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (savedAccessibility.lineSpacing === "large") applyLineSpacing("normal");
      else if (savedAccessibility.lineSpacing === "normal") applyLineSpacing("small");
    })
  );

  
  selectAll("reset-accessibility").forEach((btn) =>
    btn.addEventListener("click", () => {
      const removeClasses = [
        "reading-mask-active",
        "bold-text-active",
        "high-contrast-active",
        "line-spacing-lg",
        "line-spacing-sm",
        "line-spacing-normal",
        "colorblind-protanopia",
        "colorblind-deuteranopia",
        "colorblind-tritanopia",
        "colorblind-Acromatopsia",
      ];
      document.body.classList.remove(...removeClasses);
      if (readingMaskOverlay) readingMaskOverlay.style.display = "none";

      document.querySelectorAll("p, span, a, li, h1, h2, h3, h4, h5, h6, button, label, input, textarea")
        .forEach((el) => (el.style.fontSize = ""));

      savedAccessibility = {
        readingMask: false,
        boldText: false,
        highContrast: false,
        lineSpacing: "normal",
        fonte_number: 1,
        espacamento_number: 1,
        filtro_daltonismo: "Filtros_daltonismo",
        leitura_voz: false,
        mascara_leitura: false,
        letras_destaque: false
      };
      saveAccessibilityLocal();

      localStorage.removeItem("fontSize");
      localStorage.removeItem("colorblindMode");
      localStorage.removeItem("screenReader");

      if (speechEnabled) {
        disableSpeech();
        speechEnabled = false;
      }

      saveExtrasToFirestore({
        fonte_number: 1,
        espacamento_number: 1,
        filtro_daltonismo: "Filtros_daltonismo",
        leitura_voz: false,
        mascara_leitura: false,
        letras_destaque: false
      });

      
      updateActiveStates();
    })
  );

  
  updateActiveStates();
}

initAccessibility();


const extenderToggle = document.getElementById("extenderToggle");

let lastScrollY = window.scrollY || 0;
let ticking = false;

function handleScrollForExtender() {
  const y = window.scrollY || window.pageYOffset;
  
  if (y > 30) {
    extenderToggle?.classList.add("visible");
    extenderToggle?.classList.remove("minimized");
  } else {
    
    if (extenderToggle) {
      extenderToggle.classList.add("minimized");
      
      setTimeout(() => {
        if ((window.scrollY || window.pageYOffset) <= 5 && !extenderToggle.classList.contains("open")) {
          extenderToggle.classList.remove("visible");
        }
      }, 260);
    }

    
    if (botoesMenu && botoesMenu.classList.contains("aberto") && window.innerWidth > 768) {
      botoesMenu.classList.remove("aberto", "top-dropdown");
      extenderToggle?.classList.remove("open");
      extenderToggle?.setAttribute("aria-expanded", "false");
    }
  }
  lastScrollY = y;
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!extenderToggle) return;
  if (!ticking) {
    window.requestAnimationFrame(handleScrollForExtender);
    ticking = true;
  }
});


extenderToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!botoesMenu) return;

  const desktop = window.innerWidth > 768;
  if (desktop) {
    
    botoesMenu.classList.toggle("top-dropdown");
    botoesMenu.classList.toggle("aberto");
    extenderToggle.classList.toggle("open");
    const expanded = extenderToggle.classList.contains("open");
    extenderToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  } else {
    
    botoesMenu.classList.toggle("aberto");
    extenderToggle.classList.toggle("open");
    extenderToggle.setAttribute("aria-expanded", botoesMenu.classList.contains("aberto") ? "true" : "false");
  }
});


document.addEventListener("click", (event) => {
  if (!botoesMenu || !extenderToggle) return;
  if (botoesMenu.classList.contains("aberto") && window.innerWidth > 768) {
    if (!botoesMenu.contains(event.target) && !extenderToggle.contains(event.target)) {
      botoesMenu.classList.remove("aberto", "top-dropdown");
      extenderToggle.classList.remove("open");
      extenderToggle.setAttribute("aria-expanded", "false");
    }
  }
});


window.addEventListener("resize", () => {
  if (!botoesMenu || !extenderToggle) return;
  if (window.innerWidth <= 768) {
    botoesMenu.classList.remove("top-dropdown");
    extenderToggle.classList.remove("open");
    extenderToggle.setAttribute("aria-expanded", "false");
  }
});



document.addEventListener("click", async (ev) => {
  const a = ev.target.closest && ev.target.closest("a[href]");
  if (!a) return;

  const hrefAttr = a.getAttribute("href") || "";
  // ignora links que sejam apenas âncoras vazias
  if (!hrefAttr || hrefAttr === "#" || hrefAttr.startsWith("javascript:")) return;

  // normaliza (remove query/hash) e verifica se termina com 'consultoria.html'
  const normalized = hrefAttr.split("?")[0].split("#")[0].toLowerCase();
  if (!normalized.endsWith("consultoria.html")) return;

  
  ev.preventDefault();

  try {
    
    let user = auth.currentUser;
    if (!user) {
      
      user = await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => {
          unsub();
          resolve(u);
        });
      });
    }

    
    if (!user) {
      window.location.href = "consultoria.html";
      return;
    }

    
    const userSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (!userSnap.exists()) {
      window.location.href = "consultoria.html";
      return;
    }

    const consultLoad = userSnap.data()?.extras?.consult_load;
    if (consultLoad === true) {
      window.location.href = "consultas.html";
    } else {
      window.location.href = "consultoria.html";
    }
  } catch (err) {
    console.error("[globals] Erro ao verificar consult_load:", err);
    
    window.location.href = "consultoria.html";
  }
});


(function () {
  
  if (window._customAlertInstalled) return;
  window._customAlertInstalled = true;

  const alertQueue = [];
  let showing = false;

  function disableBodyScroll() {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  function enableBodyScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function createAlertElement(message) {
    const overlay = document.createElement('div');
    overlay.className = 'popup custom-alert';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.tabIndex = -1;

    
    
    
    

    const msg = document.createElement('div');
    msg.className = 'alert-msg';
    msg.textContent = String(message);

    const actions = document.createElement('div');
    actions.className = 'alert-actions';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = 'btn primary';
    btnOk.textContent = 'OK';

    actions.appendChild(btnOk);

    
    
    content.appendChild(msg);
    content.appendChild(actions);
    overlay.appendChild(content);

    return { overlay, content, btnOk };
  }

  function showNext() {
    if (showing) return;
    if (!alertQueue.length) return;
    showing = true;

    const { message } = alertQueue.shift();

    const { overlay, content, btnOk } = createAlertElement(message);

    const previousActive = document.activeElement;

    
    function closeAlert() {
      try {
        overlay.removeEventListener('click', overlayClick);
        document.removeEventListener('keydown', onKeyDown);
        btnOk.removeEventListener('click', onOk);
      } catch (e) {  }

      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
      enableBodyScroll();
      if (previousActive && previousActive.focus) {
        try { previousActive.focus(); } catch (e) { }
      }
      showing = false;
      
      setTimeout(showNext, 10);
    }

    function onOk(e) {
      e && e.preventDefault();
      closeAlert();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAlert();
        return;
      }
      if (e.key === 'Enter') {
        
        e.preventDefault();
        closeAlert();
      }
      
      if (e.key === 'Tab') {
        e.preventDefault();
        btnOk.focus();
      }
    }

    function overlayClick(e) {
      
      if (!content.contains(e.target)) {
        
        
        
        e.stopPropagation();
      }
    }

    document.body.appendChild(overlay);
    disableBodyScroll();

    
    btnOk.addEventListener('click', onOk);
    document.addEventListener('keydown', onKeyDown);
    overlay.addEventListener('click', overlayClick);

    
    setTimeout(() => {
      try { btnOk.focus(); } catch (e) { }
    }, 30);
  }

  
  window.alert = function (message) {
    try {
      alertQueue.push({ message });
      
      setTimeout(showNext, 0);
    } catch (err) {
      
      try { window.__nativeAlert__ && window.__nativeAlert__(String(message)); } catch (e) { }
    }
    
    return undefined;
  };

  
  if (!window.__nativeAlert__) window.__nativeAlert__ = window.alert;
})();
