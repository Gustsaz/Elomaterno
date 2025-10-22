document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab");
    const conteudos = document.querySelectorAll(".conteudo-tab");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("ativo"));
            conteudos.forEach(c => c.classList.remove("ativo"));

            tab.classList.add("ativo");
            document.getElementById(tab.dataset.tab).classList.add("ativo");
        });
    });
});
