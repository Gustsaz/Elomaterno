import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const avatarEl = document.getElementById("menu-avatar");
const nomeEl = document.getElementById("menu-nome");
const emailEl = document.getElementById("menu-email");


// === Atualiza avatar/nome/email no header (corrigido) ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      if (snap.exists()) {
        const dados = snap.data();
        nomeEl.textContent = dados.nome || user.displayName || "Usuário";
        emailEl.textContent = dados.email || user.email || "";
        if (dados.fotoURL || dados.avatar) {
          // prioriza foto do documento, fallback para campo 'avatar'
          avatarEl.src = dados.fotoURL || dados.avatar;
        }
      } else {
        nomeEl.textContent = user.displayName || "Usuário";
        emailEl.textContent = user.email || "";
      }
    } catch (err) {
      console.error("Erro ao obter dados do usuário:", err);
      nomeEl.textContent = user.displayName || "Usuário";
      emailEl.textContent = user.email || "";
    }
  } else {
    // usuário deslogado — limpa placeholders (opcional)
    nomeEl.textContent = "";
    emailEl.textContent = "";
    avatarEl.src = "./img/avatar_usuario.png";
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
    const classesToRemove = modes.map((m) => m.className).filter(Boolean);
    if (classesToRemove.length) document.body.classList.remove(...classesToRemove);

    const mode = modes[index];

    if (mode.className) {
      document.body.classList.add(mode.className);
    }

    localStorage.setItem("colorblindMode", mode.name);

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

  selectAll("reading-mask").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = readingMaskOverlay.style.display === "block";
      readingMaskOverlay.style.display = active ? "none" : "block";
      document.body.classList.toggle("reading-mask-active", !active);
      savedAccessibility.readingMask = !active;
      saveAccessibility();
    })
  );

  selectAll("bold-text").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = document.body.classList.toggle("bold-text-active");
      savedAccessibility.boldText = active;
      saveAccessibility();
    })
  );

  selectAll("high-contrast").forEach((btn) =>
    btn.addEventListener("click", () => {
      const active = document.body.classList.toggle("high-contrast-active");
      savedAccessibility.highContrast = active;
      saveAccessibility();
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

// ---------------- Extender top / dropdown behavior ----------------
const extenderToggle = document.getElementById("extenderToggle");
// botoesMenu já existe no seu globals.js: const botoesMenu = document.querySelector(".botoes");
let lastScrollY = window.scrollY || 0;
let ticking = false;

function handleScrollForExtender() {
  const y = window.scrollY || window.pageYOffset;
  // aparecer após pequeno scroll
  if (y > 30) {
    extenderToggle?.classList.add("visible");
    extenderToggle?.classList.remove("minimized");
  } else {
    // volta ao topo -> anima reduzir opacidade e depois some se menu fechado
    if (extenderToggle) {
      extenderToggle.classList.add("minimized");
      // se o menu está fechado, escondemos depois do efeito
      setTimeout(() => {
        if ((window.scrollY || window.pageYOffset) <= 5 && !extenderToggle.classList.contains("open")) {
          extenderToggle.classList.remove("visible");
        }
      }, 260);
    }

    // se abriu como top-dropdown e usuário voltou ao topo, fecha
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

// clique no extender
extenderToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!botoesMenu) return;

  const desktop = window.innerWidth > 768;
  if (desktop) {
    // posiciona como top-dropdown e abre/fecha
    botoesMenu.classList.toggle("top-dropdown");
    botoesMenu.classList.toggle("aberto");
    extenderToggle.classList.toggle("open");
    const expanded = extenderToggle.classList.contains("open");
    extenderToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  } else {
    // mobile: apenas mantém o toggle lateral já existente
    botoesMenu.classList.toggle("aberto");
    extenderToggle.classList.toggle("open");
    extenderToggle.setAttribute("aria-expanded", botoesMenu.classList.contains("aberto") ? "true" : "false");
  }
});

// cliques fora fecham (para o dropdown top)
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

// adapta ao redimensionamento (se trocar para mobile, remove top-dropdown)
window.addEventListener("resize", () => {
  if (!botoesMenu || !extenderToggle) return;
  if (window.innerWidth <= 768) {
    botoesMenu.classList.remove("top-dropdown");
    extenderToggle.classList.remove("open");
    extenderToggle.setAttribute("aria-expanded", "false");
  }
});


// === Intercepta links para consultoria.html e redireciona conforme extras.consult_load ===
document.addEventListener("click", async (ev) => {
  const a = ev.target.closest && ev.target.closest("a[href]");
  if (!a) return;

  const hrefAttr = a.getAttribute("href") || "";
  // ignora links que sejam apenas âncoras vazias
  if (!hrefAttr || hrefAttr === "#" || hrefAttr.startsWith("javascript:")) return;

  // normaliza (remove query/hash) e verifica se termina com 'consultoria.html'
  const normalized = hrefAttr.split("?")[0].split("#")[0].toLowerCase();
  if (!normalized.endsWith("consultoria.html")) return;

  // intercepta o comportamento padrão do link
  ev.preventDefault();

  try {
    // aguarda auth (usa currentUser se disponível)
    let user = auth.currentUser;
    if (!user) {
      // espera uma vez pelo onAuthStateChanged (se ainda inicializando)
      user = await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => {
          unsub();
          resolve(u);
        });
      });
    }

    // se não autenticado, vai para a página informativa (consultoria)
    if (!user) {
      window.location.href = "consultoria.html";
      return;
    }

    // lê o documento do usuário
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
    // fallback seguro
    window.location.href = "consultoria.html";
  }
});

/* --- Substitui window.alert por um modal estilizado --- */
(function () {
  // Evita sobrescrever duas vezes se já for carregado
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

    // opcional: título
    // const title = document.createElement('div');
    // title.className = 'alert-title';
    // title.textContent = 'Aviso';

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

    // montar
    // content.appendChild(title); // se ativar título, descomente
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

    // comportamento de fechamento
    function closeAlert() {
      try {
        overlay.removeEventListener('click', overlayClick);
        document.removeEventListener('keydown', onKeyDown);
        btnOk.removeEventListener('click', onOk);
      } catch (e) { /* ignore */ }

      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
      enableBodyScroll();
      if (previousActive && previousActive.focus) {
        try { previousActive.focus(); } catch (e) { }
      }
      showing = false;
      // mostra próximo se houver na fila
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
        // Enter fecha (comportamento comum)
        e.preventDefault();
        closeAlert();
      }
      // simples foco-trap: se Tab e só um botão, evita sair
      if (e.key === 'Tab') {
        e.preventDefault();
        btnOk.focus();
      }
    }

    function overlayClick(e) {
      // evita fechar ao clicar no conteúdo
      if (!content.contains(e.target)) {
        // opcional: fechar clicando no fundo
        // closeAlert();
        // por enquanto não fecha clicando no backdrop, apenas via OK/Escape
        e.stopPropagation();
      }
    }

    document.body.appendChild(overlay);
    disableBodyScroll();

    // listeners
    btnOk.addEventListener('click', onOk);
    document.addEventListener('keydown', onKeyDown);
    overlay.addEventListener('click', overlayClick);

    // focus
    setTimeout(() => {
      try { btnOk.focus(); } catch (e) { }
    }, 30);
  }

  // API: manter assinatura igual (não-blocking)
  window.alert = function (message) {
    try {
      alertQueue.push({ message });
      // exibe em seguida (se não estiver mostrando)
      setTimeout(showNext, 0);
    } catch (err) {
      // fallback para alert original se der erro
      try { window.__nativeAlert__ && window.__nativeAlert__(String(message)); } catch (e) { }
    }
    // retorna undefined como o alert nativo
    return undefined;
  };

  // guarda referência do alert nativo caso queira usar
  if (!window.__nativeAlert__) window.__nativeAlert__ = window.alert;
})();
