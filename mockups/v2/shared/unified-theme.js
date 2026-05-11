/* STAIRS Unified Theme - Easter Egg & Theme Switcher */
/* Paste this into the <head> of your v2 mockup HTML files */

// ============ EASTER EGG: "WTF Mode" ============
(function() {
    'use strict';

    let clickCount = 0;
    let clickTimer = null;
    const WTF_URL = '../v3/index.html';

    // Method 1: Click the logo 5 times rapidly
    document.addEventListener('DOMContentLoaded', function() {
        const logo = document.querySelector('.sidebar > div:first-child, .cyber-sidebar-header');
        if (logo) {
            logo.style.cursor = 'pointer';
            logo.title = 'Click me 5 times for a surprise...';

            logo.addEventListener('click', function(e) {
                e.stopPropagation();
                clickCount++;

                if (clickTimer) clearTimeout(clickTimer);

                clickTimer = setTimeout(function() {
                    clickCount = 0;
                }, 2000);

                if (clickCount >= 5) {
                    clickCount = 0;
                    activateWTFMode();
                }
            });
        }

        // Method 2: Konami Code (up up down down left right left right B A)
        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;

        document.addEventListener('keydown', function(e) {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    konamiIndex = 0;
                    activateWTFMode();
                }
            } else {
                konamiIndex = 0;
            }
        });

        // Method 3: Type "wtf" anywhere
        let typeBuffer = '';
        document.addEventListener('keydown', function(e) {
            if (e.key.length === 1) {
                typeBuffer += e.key.toLowerCase();
                if (typeBuffer.length > 3) {
                    typeBuffer = typeBuffer.slice(-3);
                }
                if (typeBuffer === 'wtf') {
                    typeBuffer = '';
                    activateWTFMode();
                }
            }
        });
    });

    function activateWTFMode() {
        // Create flash effect
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 99999;
            opacity: 0;
            transition: opacity 0.1s;
        `;
        document.body.appendChild(flash);

        // Flash and redirect
        setTimeout(() => { flash.style.opacity = '1'; }, 10);
        setTimeout(() => { flash.style.opacity = '0'; }, 200);
        setTimeout(() => {
            document.body.removeChild(flash);
            window.location.href = WTF_URL;
        }, 500);
    }

    // ============ THEME SWITCHER (Optional) ============
    window.STAIRSThemes = {
        themes: {
            'v1': '../original/catalog-browser.html',  // or a v1 CSS file
            'v2': 'catalog-browser.html',
            'cyber': 'sky-visualization.html',
            'wtf': '../v3/index.html'
        },

        switchTheme: function(themeName) {
            if (this.themes[themeName]) {
                window.location.href = this.themes[themeName];
            }
        },

        // Cycle through themes
        cycleTheme: function() {
            const themes = Object.keys(this.themes);
            const current = window.location.pathname;

            let currentIndex = themes.findIndex(t =>
                this.themes[t].includes(current.split('/').pop())
            );

            if (currentIndex === -1) currentIndex = 0;
            const nextIndex = (currentIndex + 1) % themes.length;
            this.switchTheme(themes[nextIndex]);
        }
    };

    // Optional: Add keyboard shortcut (Ctrl+Shift+T) to cycle themes
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            STAIRSThemes.cycleTheme();
        }
    });

})();
