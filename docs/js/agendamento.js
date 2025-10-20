document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("agendamentoForm");
  const listaConsultas = document.getElementById("listaConsultas");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const paciente = document.getElementById("paciente").value;
    const especialidade = document.getElementById("especialidade").value;
    const data = document.getElementById("data").value;
    const horario = document.getElementById("horario").value;

    if (!paciente || !especialidade || !data || !horario) {
      alert("Por favor, preencha todos os campos!");
      return;
    }

    const novaConsulta = document.createElement("li");
    novaConsulta.innerHTML = `
      <div>
        <strong>${paciente}</strong><br>
        <span>${especialidade} - ${new Date(data).toLocaleDateString("pt-BR")} às ${horario}</span>
      </div>
      <button class="cancelar-btn">Cancelar</button>
    `;

    novaConsulta.querySelector(".cancelar-btn").addEventListener("click", () => {
      novaConsulta.remove();
    });

    listaConsultas.appendChild(novaConsulta);
    form.reset();
  });
});
