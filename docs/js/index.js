document.addEventListener('DOMContentLoaded', function () {
    const splash = document.querySelector('.splash');
    const skipSplashButton = document.getElementById('skip-splash');
    const alreadyShown = localStorage.getItem('splashShown');

    // --- SPLASH SCREEN ---
    if (splash) {
        if (!alreadyShown) {
            const hideSplash = () => {
                splash.classList.add('splash-hidden');
                localStorage.setItem('splashShown', 'true');
            };

            const splashTimeout = 3100;
            const splashTimer = setTimeout(hideSplash, splashTimeout);

            if (skipSplashButton) {
                skipSplashButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    clearTimeout(splashTimer);
                    hideSplash();
                });
            }
        } else {
            splash.classList.add('splash-hidden');
        }
    }

    // --- TEMA CLARO/ESCURO ---
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const body = document.body;

    // Função para atualizar imagens conforme o tema
    function updateThemeImages() {
        const isDark = body.hasAttribute('data-theme');
        document.querySelectorAll('img[data-dark-src]').forEach(img => {
            const darkSrc = img.getAttribute('data-dark-src');
            const originalSrc = img.getAttribute('data-original-src') || img.getAttribute('src');

            if (!img.getAttribute('data-original-src')) {
                img.setAttribute('data-original-src', originalSrc);
            }

            if (isDark && darkSrc) {
                img.setAttribute('src', darkSrc);
            } else {
                img.setAttribute('src', img.getAttribute('data-original-src'));
            }
        });
    }

    // Aplica tema salvo
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
    }

    updateThemeImages();

    // Alterna tema ao clicar no ícone
    themeToggleIcon.addEventListener('click', function () {
        const isDark = body.hasAttribute('data-theme');

        if (isDark) {
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggleIcon.classList.remove('fa-sun');
            themeToggleIcon.classList.add('fa-moon');
        } else {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }

        updateThemeImages();
    });

    // --- MENU MOBILE ---
    const mobileMenuIcon = document.querySelector('.mobile-menu-icon');
    const menu = document.querySelector('.menu');

    if (mobileMenuIcon && menu) {
        mobileMenuIcon.addEventListener('click', () => menu.classList.toggle('active'));

        document.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', () => {
                if (menu.classList.contains('active')) menu.classList.remove('active');
            });
        });
    }

    // --- TEXTO DIGITADO (Typed.js) ---
    if (document.getElementById('typed-text')) {
        new Typed('#typed-text', {
            strings: ['comunidade.', 'força.', 'rede de apoio.'],
            typeSpeed: 70,
            backSpeed: 50,
            backDelay: 2500,
            loop: true
        });
    }

    // --- SWIPER ---
    if (document.querySelector('.swiper-container')) {
        new Swiper('.swiper-container', {
            loop: true,
            autoplay: {
                delay: 4000,
                disableOnInteraction: false,
            },
            effect: 'fade',
            fadeEffect: { crossFade: true },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
        });
    }
});
