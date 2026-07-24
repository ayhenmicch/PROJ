/* ============================================================
   Ashure Heaben Resort Management System
   Sidebar Toggle Behavior
   Handles collapsible sidebar on desktop and slide-in on mobile.
   ============================================================ */

(function () {
    "use strict";

    var sidebar = document.getElementById("sidebar");
    var menuToggle = document.getElementById("menuToggle");

    if (!sidebar || !menuToggle) {
        return;
    }

    var MOBILE_BREAKPOINT = 768;
    var SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function isCollapsed() {
        return sidebar.classList.contains("collapsed");
    }

    function isOpen() {
        return sidebar.classList.contains("open");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        document.body.style.overflow = "";
    }

    function openSidebar() {
        sidebar.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function toggleSidebar() {
        if (isMobile()) {
            if (isOpen()) {
                closeSidebar();
            } else {
                openSidebar();
            }
        } else {
            if (isCollapsed()) {
                sidebar.classList.remove("collapsed");
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "false");
            } else {
                sidebar.classList.add("collapsed");
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
            }
        }
    }

    function handleOutsideClick(e) {
        if (!isMobile()) {
            return;
        }

        if (!isOpen()) {
            return;
        }

        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            closeSidebar();
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Escape" && isMobile() && isOpen()) {
            closeSidebar();
            menuToggle.focus();
        }
    }

    function handleResize() {
        if (!isMobile()) {
            closeSidebar();
        }
    }

    function restoreState() {
        if (isMobile()) {
            closeSidebar();
            return;
        }

        var saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved === "true") {
            sidebar.classList.add("collapsed");
        } else {
            sidebar.classList.remove("collapsed");
        }
    }

    menuToggle.addEventListener("click", toggleSidebar);
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    restoreState();

    // ---- Logout handler ----
    var logoutLink = document.getElementById("sidebarLogout");
    if (logoutLink) {
        logoutLink.addEventListener("click", function (e) {
            e.preventDefault();
            try {
                localStorage.removeItem("ashure_heaben_auth");
            } catch (err) {
                // localStorage unavailable — continue
            }
            window.location.href = "login.html";
        });
    }
})();
