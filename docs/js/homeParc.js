document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".menu-btn");
  const contents = document.querySelectorAll(".content");

  let current = Array.from(contents).find(c => !c.classList.contains("hidden")) || contents[0];

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const target = document.getElementById(targetId);

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      if (target) {
        contents.forEach(c => c.classList.add("hidden"));
        target.classList.remove("hidden");
        current = target;
      }
    });
  });
});
