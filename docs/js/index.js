document.addEventListener('DOMContentLoaded', function () {
    const splash = document.querySelector('.splash');
    const skipSplashButton = document.getElementById('skip-splash');
    const alreadyShown = localStorage.getItem('splashShown');

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

    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
    }

    themeToggleIcon.addEventListener('click', function () {
        if (body.hasAttribute('data-theme')) {
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
    });

    const mobileMenuIcon = document.querySelector('.mobile-menu-icon');
    const menu = document.querySelector('.menu');

    mobileMenuIcon.addEventListener('click', () => menu.classList.toggle('active'));

    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', () => {
            if (menu.classList.contains('active')) menu.classList.remove('active');
        });
    });

    const typed = new Typed('#typed-text', {
        strings: ['comunidade.', 'força.', 'rede de apoio.'],
        typeSpeed: 70,
        backSpeed: 50,
        backDelay: 2500,
        loop: true
    });

    const swiper = new Swiper('.swiper-container', {
        loop: true,
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
        effect: 'fade',
        fadeEffect: {
            crossFade: true
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
    });

});