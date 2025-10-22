document.addEventListener("DOMContentLoaded", () => {
    const datas = document.querySelectorAll(".data");
    datas.forEach(d => {
        d.addEventListener("click", () => {
            datas.forEach(dt => dt.classList.remove("ativo"));
            d.classList.add("ativo");
        });
    });
});
