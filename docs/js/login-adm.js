
const ADMIN_EMAIL = "eloomaterno@gmail.com";
const ADMIN_SENHA = "admin123456"; 

document.getElementById("btnLoginAdm").addEventListener("click", (e) => {
    e.preventDefault(); 

    const email = document.getElementById("emailAdm").value.trim();
    const senha = document.getElementById("senhaAdm").value.trim();

    if(email === ADMIN_EMAIL && senha === ADMIN_SENHA){
        localStorage.setItem("adminLogado", "true"); 
        window.location.href = "admin-dashboard.html"; 
    } else {
        alert("❌ Email ou senha incorretos — acesso negado");
    }
});
