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

    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
    }

    updateThemeImages();

    
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

    
    if (document.getElementById('typed-text')) {
        new Typed('#typed-text', {
            strings: ['comunidade.', 'força.', 'rede de apoio.'],
            typeSpeed: 70,
            backSpeed: 50,
            backDelay: 2500,
            loop: true
        });
    }

    
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
