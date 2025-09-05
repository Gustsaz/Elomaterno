document.addEventListener("DOMContentLoaded", () => {
    const reveals = document.querySelectorAll(".reveal");
    const verticalBar = document.querySelector(".vertical-bar");
    const infoSection = document.querySelector(".info-section");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, { threshold: 0.2 });

    reveals.forEach(el => observer.observe(el));

    window.addEventListener("scroll", () => {
        const rect = infoSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        if (rect.top < windowHeight && rect.bottom > 0) {
            const total = rect.height;

            // quanto já percorremos dentro da section
            const scrolled = Math.min(total, windowHeight - rect.top);

            verticalBar.style.height = `${scrolled}px`;
        }
    });
});
