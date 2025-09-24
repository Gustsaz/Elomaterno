// pesquisa.js
import { db } from "./firebase.js";
import {
    collection,
    getDocs,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("global-search");
    const resultsBox = document.getElementById("search-results");
    const filterBtn = document.querySelector(".btn-filter");
    const filterMenu = document.getElementById("filter-menu");

    if (!input || !resultsBox) return;

    // === Abrir/fechar menu de filtros ===
    filterBtn?.addEventListener("click", () => {
        filterMenu.classList.toggle("hidden");
        const rect = filterBtn.getBoundingClientRect();
        filterMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        filterMenu.style.left = `${rect.left}px`;
        filterMenu.style.width = `180px`;
    });

    // === Setup filtros ===
    const setupFilters = () => {
        const allCheckbox = filterMenu.querySelector("input[value='todos']");
        const checks = [...filterMenu.querySelectorAll("input[type=checkbox]")]
            .filter(i => i.value !== "todos");

        // Clique em "Todos"
        allCheckbox.addEventListener("click", (e) => {
            if (!allCheckbox.checked) {
                // Impede desmarcar manualmente
                e.preventDefault();
                allCheckbox.checked = true;
                return;
            }
            // Se marcou → desmarca todos os outros
            checks.forEach(c => c.checked = false);
            allCheckbox.checked = true;
        });

        // Clique em outros filtros
        checks.forEach(c => {
            c.addEventListener("change", () => {
                if (checks.some(chk => chk.checked)) {
                    allCheckbox.checked = false;
                } else {
                    allCheckbox.checked = true;
                }
            });
        });
    };

    setupFilters();

    // === Capturar filtros ativos ===
    const getActiveFilters = () => {
        const allCheckbox = filterMenu.querySelector("input[value='todos']");
        const checks = [...filterMenu.querySelectorAll("input[type=checkbox]")].filter(i => i.value !== "todos");

        if (allCheckbox.checked) {
            return ["posts", "artigos", "eventos", "perfis"];
        }
        return checks.filter(i => i.checked).map(i => i.value);
    };

    // === Normalizar string (ignora acentos e maiúsculas) ===
    const normalize = (str) => (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // === Busca principal ===
    const search = async (query) => {
        const q = normalize(query);
        const filters = getActiveFilters();
        let results = [];

        // ==== POSTS (Firebase) ====
        if (filters.includes("posts")) {
            const snap = await getDocs(collection(db, "posts"));
            snap.forEach(docSnap => {
                const p = docSnap.data();
                if (
                    normalize(p.titulo).includes(q) ||
                    normalize(p.conteudo).includes(q) ||
                    normalize(p.autorNome).includes(q)
                ) {
                    results.push({
                        type: "Post",
                        title: p.titulo || "Sem título",
                        desc: p.conteudo?.slice(0, 80) || "",
                        link: `comentResp.html?postId=${docSnap.id}`,
                        categoria: "posts"
                    });
                }
            });
        }

        // ==== PERFIS (Firebase) ====
        if (filters.includes("perfis")) {
            const snap = await getDocs(collection(db, "usuarios"));
            snap.forEach(docSnap => {
                const u = docSnap.data();
                if (
                    normalize(u.nome).includes(q) ||
                    normalize(u.email).includes(q)
                ) {
                    results.push({
                        type: "Perfil",
                        title: u.nome || "Usuário",
                        desc: u.email || "",
                        link: `perfilPessoa.html?uid=${docSnap.id}`,
                        categoria: "perfis"
                    });
                }
            });
        }

        // ==== EVENTOS (Firebase) ====
        if (filters.includes("eventos")) {
            const snap = await getDocs(collection(db, "eventos"));
            snap.forEach(docSnap => {
                const ev = docSnap.data();
                if (
                    normalize(ev.titulo || "").includes(q) ||
                    normalize(ev.descricao || "").includes(q) ||
                    normalize(ev.local || "").includes(q)
                ) {
                    results.push({
                        type: "Evento",
                        title: ev.titulo,
                        desc: ev.descricao,
                        link: `eventos.html#${docSnap.id}`,
                        categoria: "eventos"
                    });
                }
            });
        }


        // ==== ARTIGOS (DOM) ====
        if (filters.includes("artigos")) {
            document.querySelectorAll(".article-card").forEach(card => {
                const title = card.querySelector("h3")?.textContent || "";
                const desc = card.querySelector("p")?.textContent || "";
                const link = card.querySelector("a")?.getAttribute("href") || "artigos.html";
                if (normalize(title).includes(q) || normalize(desc).includes(q)) {
                    results.push({
                        type: "Artigo",
                        title,
                        desc,
                        link,
                        categoria: "artigos"
                    });
                }
            });
        }

        showResults(results);
    };

    // === Mostrar resultados ===
    const showResults = (results) => {
        resultsBox.innerHTML = "";
        if (results.length === 0) {
            resultsBox.classList.add("hidden");
            return;
        }

        results.forEach(r => {
            const item = document.createElement("div");
            item.className = "result-item animate-in";

            const icons = {
                posts: "fa-users",
                artigos: "fa-book",
                eventos: "fa-bell",
                perfis: "fa-user"
            };

            item.innerHTML = `
                <i class="fa ${icons[r.categoria] || "fa-search"} result-icon"></i>
                <div class="result-text">
                  <strong>${r.title}</strong><br>
                  <small>${r.desc}</small>
                </div>
                <span class="tag tag-${r.categoria}">${r.type}</span>
            `;

            item.addEventListener("click", () => {
                if (r.categoria === "eventos") {
                    window.location.href = r.link;
                    localStorage.setItem("highlightEvento", r.link.split("#")[1]);
                } else {
                    window.location.href = r.link;
                }
            });

            resultsBox.appendChild(item);
        });

        resultsBox.classList.remove("hidden");
    };

    // === Input de busca ===
    input.addEventListener("input", () => {
        const q = input.value.trim();
        if (q.length > 1) {
            search(q);
        } else {
            resultsBox.classList.add("hidden");
        }
    });
});

// === Destacar evento ao abrir eventos.html ===
document.addEventListener("DOMContentLoaded", () => {
    const eventoId = localStorage.getItem("highlightEvento");
    if (eventoId) {
        const card = document.querySelector(`.evento-card[data-evento-id="${eventoId}"]`);
        if (card) {
            card.style.border = "3px solid orange";
            setTimeout(() => { card.style.border = ""; }, 3000);
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        localStorage.removeItem("highlightEvento");
    }
});
