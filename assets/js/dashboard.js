/* ============================================================
   Ashure Heaben Resort Management System
   Dashboard Animations and Behaviors
   Handles count-up statistics, circular progress, progress bars,
   and dynamic greeting based on time of day.
   ============================================================ */

(function () {
    "use strict";

    // ---- DOM references ----
    var appShell = document.getElementById("appShell");
    var statValues = document.querySelectorAll(".stat-card__value");
    var circularFill = document.querySelector(".circular-progress__fill");
    var circularText = document.querySelector(".circular-progress__text");
    var progressFills = document.querySelectorAll(".progress-bar__fill");
    var greetingEl = document.getElementById("dashboardGreeting");

    // ---- Configuration ----
    var CIRCLE_CIRCUMFERENCE = 365; // 2 * PI * 58
    var CIRCLE_TARGET_PERCENT = 82;
    var CIRCLE_TARGET_OFFSET = 66; // circumference - (percent/100 * circumference)
    var COUNT_UP_DURATION = 1500; // ms
    var PROGRESS_DURATION = 800; // ms
    var TOTAL_ROOMS = 250;

    // ---- Utility: Format number with commas ----
    function formatNumber(num) {
        return Math.round(num).toLocaleString("en-US");
    }

    // ---- Utility: Format percentage ----
    function formatPercent(num) {
        return Math.round(num) + "%";
    }

    // ---- Update statistics cards from data ----
    function updateStatistics() {
        var reservations = (window.ASHURE_APP && window.ASHURE_APP.reservations) || [];
        var guests = (window.ASHURE_APP && window.ASHURE_APP.guests) || [];

        var totalReservations = reservations.length || 0;
        var totalGuests = guests.length || 0;
        var checkedInCount = 0;
        for (var i = 0; i < reservations.length; i++) {
            if (reservations[i].status === "checked-in") {
                checkedInCount++;
            }
        }
        var availableRooms = Math.max(0, TOTAL_ROOMS - checkedInCount);
        var occupancyRate = TOTAL_ROOMS > 0 ? (checkedInCount / TOTAL_ROOMS) * 100 : 0;

        // Update Total Reservations card
        var statCards = document.querySelectorAll(".dashboard .stat-card__value");
        if (statCards.length >= 1) {
            statCards[0].textContent = formatNumber(totalReservations);
        }

        // Update Available Rooms card
        if (statCards.length >= 2) {
            statCards[1].textContent = formatNumber(availableRooms);
        }

        // Update Total Guests card
        var totalGuestsEl = document.getElementById("totalGuestsCount");
        if (totalGuestsEl) {
            totalGuestsEl.textContent = formatNumber(totalGuests);
        }

        // Update Occupancy Rate card (in reports section)
        var occupancyEl = document.querySelector(".reports .stat-card__value");
        if (!occupancyEl) {
            var allStatCards = document.querySelectorAll(".stat-card__value");
            for (var j = 0; j < allStatCards.length; j++) {
                var parent = allStatCards[j].parentElement;
                if (parent && parent.querySelector(".stat-card__label")) {
                    var label = parent.querySelector(".stat-card__label").textContent;
                    if (label.indexOf("ccupancy") !== -1) {
                        occupancyEl = allStatCards[j];
                        break;
                    }
                }
            }
        }
        if (occupancyEl) {
            occupancyEl.textContent = formatPercent(occupancyRate);
        }
    }

    // ---- Quick Action navigation ----
    function initQuickActions() {
        var actionMap = {
            actionNewReservation: "reservations",
            actionManageGuests: "guests",
            actionManageRooms: "rooms",
            actionViewReports: "reports"
        };

        var keys = Object.keys(actionMap);
        for (var i = 0; i < keys.length; i++) {
            var el = document.getElementById(keys[i]);
            if (el) {
                el.style.cursor = "pointer";
                el.addEventListener("click", (function (page) {
                    return function () {
                        navigateToPage(page);
                    };
                })(actionMap[keys[i]]));
            }
        }
    }

    function navigateToPage(page) {
        var sidebarLink = document.querySelector('.sidebar__link[data-page="' + page + '"]');
        if (sidebarLink) {
            sidebarLink.click();
        }
    }

    // ---- Update Recent Reservations table ----
    function updateRecentReservations() {
        var reservations = (window.ASHURE_APP && window.ASHURE_APP.reservations) || [];
        var tbody = document.querySelector(".dashboard-table tbody");
        if (!tbody) return;

        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="dashboard-table__empty"><div class="empty-state"><div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><h3 class="empty-state__title">No reservations yet</h3><p class="empty-state__subtitle">New reservations will appear here once they are created.</p></div></td></tr>';
            return;
        }

        var sorted = reservations.slice().sort(function (a, b) {
            return new Date(b.checkIn + "T00:00:00") - new Date(a.checkIn + "T00:00:00");
        });
        var recent = sorted.slice(0, 5);
        var html = "";
        for (var i = 0; i < recent.length; i++) {
            var r = recent[i];
            var badgeClass = "badge--info";
            if (r.status === "confirmed") badgeClass = "badge--success";
            else if (r.status === "pending") badgeClass = "badge--warning";
            else if (r.status === "checked-out") badgeClass = "badge--info";
            else if (r.status === "cancelled") badgeClass = "badge--danger";

            html += '<tr>';
            html += '<td>' + escapeHtml(r.guestName) + '</td>';
            html += '<td>' + escapeHtml(r.roomNumber) + '</td>';
            html += '<td>' + escapeHtml(formatDate(r.checkIn)) + '</td>';
            html += '<td>' + escapeHtml(formatDate(r.checkOut)) + '</td>';
            html += '<td><span class="badge ' + badgeClass + '">' + escapeHtml(capitalizeStatus(r.status)) + '</span></td>';
            html += '</tr>';
        }
        tbody.innerHTML = html;
    }

    function escapeHtml(str) {
        if (!str) return "";
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        var d = new Date(dateStr + "T00:00:00");
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
    }

    function capitalizeStatus(status) {
        if (!status) return "";
        return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
    }

    // ---- Dynamic Greeting based on time ----
    function updateGreeting() {
        if (!greetingEl) return;
        var hour = new Date().getHours();
        var greeting = "Good Morning,";
        if (hour >= 12 && hour < 17) {
            greeting = "Good Afternoon,";
        } else if (hour >= 17) {
            greeting = "Good Evening,";
        }
        greetingEl.textContent = greeting;
    }

    // ---- Count-up animation for statistic cards ----
    function animateCountUp(element, targetText, duration) {
        // Parse target number (remove commas)
        var targetStr = targetText.replace(/,/g, "");
        var target = parseInt(targetStr, 10);
        if (isNaN(target)) return;

        var startTime = null;
        var startVal = 0;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var easedProgress = easeOutCubic(progress);
            var current = Math.round(startVal + (target - startVal) * easedProgress);
            element.textContent = formatNumber(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = formatNumber(target);
            }
        }

        requestAnimationFrame(step);
    }

    // ---- Animate all statistic cards ----
    function animateStatistics() {
        statValues.forEach(function (el) {
            var finalText = el.textContent;
            animateCountUp(el, finalText, COUNT_UP_DURATION);
        });
    }

    // ---- Animate circular progress from 0% to 82% ----
    function animateCircularProgress() {
        if (!circularFill || !circularText) return;

        // Start from 0%
        circularFill.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
        circularText.textContent = "0%";

        // Force reflow
        void circularFill.offsetWidth;

        // Animate to target
        circularFill.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)";
        circularFill.style.strokeDashoffset = CIRCLE_TARGET_OFFSET;

        // Animate text
        var startTime = null;
        function animateText(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / 1200, 1);
            var easedProgress = easeOutCubic(progress);
            var currentPercent = Math.round(easedProgress * CIRCLE_TARGET_PERCENT);
            circularText.textContent = currentPercent + "%";

            if (progress < 1) {
                requestAnimationFrame(animateText);
            } else {
                circularText.textContent = CIRCLE_TARGET_PERCENT + "%";
            }
        }

        requestAnimationFrame(animateText);
    }

    // ---- Animate progress bars from 0% to target ----
    function animateProgressBars() {
        progressFills.forEach(function (fill) {
            // Read target width from inline style
            var targetWidth = fill.style.width || "0%";

            // Reset to 0%
            fill.style.transition = "none";
            fill.style.width = "0%";

            // Force reflow
            void fill.offsetWidth;

            // Animate to target
            fill.style.transition = "width " + PROGRESS_DURATION + "ms cubic-bezier(0.22, 1, 0.36, 1)";
            fill.style.width = targetWidth;
        });
    }

    // ---- Initialize dashboard animations when app is visible ----
    function initDashboard() {
        if (!appShell || !appShell.classList.contains("app--visible")) {
            // Wait for app to become visible
            var observer = new MutationObserver(function () {
                if (appShell.classList.contains("app--visible")) {
                    observer.disconnect();
                    startAnimations();
                }
            });
            observer.observe(appShell, { attributes: true, attributeFilter: ["class"] });
            return;
        }

        startAnimations();
    }

    // ---- Listen for data changes to auto-refresh dashboard ----
    document.addEventListener("ashure:data-changed", function () {
        updateStatistics();
        updateRecentReservations();
    });

    function startAnimations() {
        updateGreeting();
        updateStatistics();
        updateRecentReservations();
        initQuickActions();
        animateStatistics();
        animateCircularProgress();
        animateProgressBars();
    }

    // ---- Start when DOM is ready ----
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDashboard);
    } else {
        initDashboard();
    }
})();
