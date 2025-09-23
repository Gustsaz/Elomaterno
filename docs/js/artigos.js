document.addEventListener("DOMContentLoaded", () => {
  const botoes = document.querySelectorAll(".categoria");
  const grids = document.querySelectorAll(".articles-grid");

  botoes.forEach(botao => {
    botao.addEventListener("click", () => {
      // remove ativo dos outros
      botoes.forEach(b => b.classList.remove("ativa"));
      botao.classList.add("ativa");

      // pega categoria do botão
      const categoria = botao.getAttribute("data-categoria");

      // mostra apenas a grid certa
      grids.forEach(grid => {
        if (grid.getAttribute("data-categoria") === categoria) {
          grid.classList.remove("hidden");
        } else {
          grid.classList.add("hidden");
        }
      });
    });
  });
});
