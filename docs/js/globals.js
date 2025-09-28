import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const avatarEl = document.getElementById("menu-avatar");
const nomeEl = document.getElementById("menu-nome");
const emailEl = document.getElementById("menu-email");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) {
      const dados = snap.data();
      nomeEl.textContent = dados.nome || "Usuário";
      emailEl.textContent = dados.email || user.email;
      if (dados.fotoURL) {
        avatarEl.src = dados.fotoURL;
      }
    } else {
      nomeEl.textContent = user.displayName || "Usuário";
      emailEl.textContent = user.email;
    }
  }
});

// === EFEITO BRILHO NOS CARDS ===
document.querySelectorAll(".com-brilho").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  });
});

// === MENU MOBILE ===
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

  if (menu.classList.contains("aberto")) {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      menu.classList.remove("aberto");
    }
  }
});

// === LOGOUT (DESKTOP + MOBILE) ===
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

// === THEME TOGGLE (DESKTOP + MOBILE) ===
const themeToggleIcon = document.getElementById("theme-toggle-icon");
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

// Inicializa com o tema salvo
applyTheme(localStorage.getItem("theme") === "dark");

// Eventos de clique (desktop e mobile)
[themeToggleIcon, menuThemeToggleIcon].forEach((el) => {
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

  // abre/fecha menus
  toggles.forEach((toggle, idx) => {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menus[idx].classList.toggle("hidden");
    });
  });

  // Fecha todos ao clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".accessibility-selector")) {
      menus.forEach(menu => menu.classList.add("hidden"));
    }
  });

  // Helper para pegar elementos do desktop + mobile
  const selectAll = (action) =>
    document.querySelectorAll(`#${action}, [data-action="${action}"]`);

  // === FONTES ===
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

  function changeFontSize(delta) {
    currentFontSize += delta;
    applyFontSize(delta);
  }

  if (currentFontSize !== defaultFontSize) {
    applyFontSize(currentFontSize - defaultFontSize);
  }

  increaseBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      changeFontSize(2);
      localStorage.setItem("fontSize", currentFontSize);
    })
  );
  decreaseBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      changeFontSize(-2);
      localStorage.setItem("fontSize", currentFontSize);
    })
  );

  // === DALTONISMO ===
  const modes = [
    { name: "Filtros Daltonismo", className: "" },
    { name: "Protanopia", className: "colorblind-protanopia" },
    { name: "Deuteranopia", className: "colorblind-deuteranopia" },
    { name: "Tritanopia", className: "colorblind-tritanopia" },
    { name: "Acromatopsia", className: "colorblind-Acromatopsia" },
  ];
  let savedMode =
    localStorage.getItem("colorblindMode") || "Filtros Daltonismo";
  let currentModeIndex = modes.findIndex((m) => m.name === savedMode);
  if (currentModeIndex === -1) currentModeIndex = 0;

  function applyColorblindMode(index) {
    // Remove classes antigas
    const classesToRemove = modes.map((m) => m.className).filter(Boolean);
    if (classesToRemove.length) document.body.classList.remove(...classesToRemove);

    // Pega o modo atual
    const mode = modes[index];

    // Adiciona a classe no body se existir
    if (mode.className) {
      document.body.classList.add(mode.className);
    }

    // Salva no localStorage
    localStorage.setItem("colorblindMode", mode.name);

    // Atualiza os botões (desktop + mobile)
    const desktopBtn = document.querySelector("#colorblind-filter");
    const mobileBtn = document.querySelector('[data-action="colorblind-filter"]');

    if (desktopBtn) {
      desktopBtn.innerHTML = `<i class="fa fa-low-vision"></i> ${mode.name}`;
    }
    if (mobileBtn) {
      mobileBtn.innerHTML = `<i class="fa fa-low-vision"></i> ${mode.name}`;
    }
  }

  applyColorblindMode(currentModeIndex);

  selectAll("colorblind-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentModeIndex = (currentModeIndex + 1) % modes.length;
      applyColorblindMode(currentModeIndex);
    })
  );

  // === LEITURA EM VOZ ===
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
    })
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab") navigationMode = "tab";
  });
  window.addEventListener("mousemove", () => {
    navigationMode = "mouse";
  });

  // === MÁSCARA, CONTRASTE, BOLD, ESPAÇAMENTO ===
  const readingMaskOverlay = document.getElementById("reading-mask-overlay");
  let savedAccessibility =
    JSON.parse(localStorage.getItem("accessibilitySettings")) || {
      readingMask: false,
      boldText: false,
      highContrast: false,
      lineSpacing: "normal",
    };

  function saveAccessibility() {
    localStorage.setItem(
      "accessibilitySettings",
      JSON.stringify(savedAccessibility)
    );
  }

  // Reaplicar configurações salvas
  if (savedAccessibility.readingMask && readingMaskOverlay) {
    readingMaskOverlay.style.display = "block";
    document.body.classList.add("reading-mask-active");
  }
  if (savedAccessibility.boldText) document.body.classList.add("bold-text-active");
  if (savedAccessibility.highContrast) document.body.classList.add("high-contrast-active");
  if (savedAccessibility.lineSpacing) {
    document.body.classList.add(
      savedAccessibility.lineSpacing === "small"
        ? "line-spacing-sm"
        : savedAccessibility.lineSpacing === "large"
          ? "line-spacing-lg"
          : "line-spacing-normal"
    );
  }


  // Máscara
  selectAll("reading-mask").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = readingMaskOverlay.style.display === "block";
      readingMaskOverlay.style.display = active ? "none" : "block";
      document.body.classList.toggle("reading-mask-active", !active);
      savedAccessibility.readingMask = !active;
      saveAccessibility();
    })
  );

  // Bold
  selectAll("bold-text").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = document.body.classList.toggle("bold-text-active");
      savedAccessibility.boldText = active;
      saveAccessibility();
    })
  );

  // Alto contraste
  selectAll("high-contrast").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = document.body.classList.toggle("high-contrast-active");
      savedAccessibility.highContrast = active;
      saveAccessibility();
    })
  );

  // Espaçamento
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
    saveAccessibility();
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

  // === RESET ===
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
      };
      saveAccessibility();
      localStorage.removeItem("fontSize");
      localStorage.removeItem("colorblindMode");
      localStorage.removeItem("screenReader");

      if (speechEnabled) {
        disableSpeech();
        speechEnabled = false;
      }
    })
  );
}

initAccessibility();

