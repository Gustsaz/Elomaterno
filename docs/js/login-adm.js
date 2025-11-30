// 🔒 DADOS DO ADMIN
const ADMIN_EMAIL = "eloomaterno@gmail.com";
const ADMIN_SENHA = "admin123456"; // defina a senha que quiser

document.getElementById("btnLoginAdm").addEventListener("click", (e) => {
    e.preventDefault(); // impede envio do formulário

    const email = document.getElementById("emailAdm").value.trim();
    const senha = document.getElementById("senhaAdm").value.trim();

    if (email === ADMIN_EMAIL && senha === ADMIN_SENHA) {
        localStorage.setItem("adminLogado", "true"); // mantém sessão
        window.location.href = "admin-dashboard.html"; // libera acesso
    } else {
        alert("❌ Email ou senha incorretos — acesso negado");
    }
});
