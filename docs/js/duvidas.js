document.querySelectorAll(".duvida-item").forEach(item => {
    item.addEventListener("click", () => {
        const duvida = item.parentElement;
        const conteudo = duvida.querySelector(".duvida-conteudo");

        document.querySelectorAll(".duvida-conteudo").forEach(c => {
            if (c !== conteudo) {
                c.classList.remove("active");
                c.previousElementSibling.classList.remove("active");
            }
        });

        conteudo.classList.toggle("active");
        item.classList.toggle("active");
    });
});
