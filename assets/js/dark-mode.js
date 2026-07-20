/* ============================================================
   Ashure Heaben Resort Management System
   Dark Mode Toggle
   ============================================================ */

(function () {
    "use strict";

    var THEME_KEY = "theme-preference";
    var toggle = document.getElementById("themeToggle");

    if (!toggle) {
        return;
    }

    function getSavedTheme() {
        return localStorage.getItem(THEME_KEY);
    }

    function applyTheme(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    }

    function toggleTheme() {
        var isDark = document.body.classList.contains("dark-mode");
        var newTheme = isDark ? "light" : "dark";
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    }

    var saved = getSavedTheme();
    if (saved) {
        applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        applyTheme("dark");
    }

    toggle.addEventListener("click", toggleTheme);
})();
