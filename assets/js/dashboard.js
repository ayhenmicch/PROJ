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
    var statValues = document.querySelectorAll(".dashboard .stat-card__value");
    var circularFill = document.querySelector(".circular-progress__fill");
    var circularText = document.querySelector(".circular-progress__text");
    var greetingEl = document.getElementById("dashboardGreeting");

    // ---- Configuration ----
    var CIRCLE_CIRCUMFERENCE = 365; // 2 * PI * 58
    var COUNT_UP_DURATION = 1500; // ms
    var PROGRESS_DURATION = 800; // ms

    // ---- Dynamic targets (set by update functions, read by animation functions) ----
    var occupancyTargetPercent = 0;
    var circularAnimationFrame = null;
    var circularAnimationVersion = 0;

    // ---- Utility: Format number with commas ----
    function formatNumber(num) {
        return Math.round(num).toLocaleString("en-US");
    }

    // ---- Utility: Format percentage ----
    function formatPercent(num) {
        return Math.round(num) + "%";
    }

    // ---- Utility: Ease-out cubic ----
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // ---- Update statistics cards from data ----
    function updateStatistics() {
        var reservations = (window.ASHURE_APP && window.ASHURE_APP.reservations) || [];
        var guests = (window.ASHURE_APP && window.ASHURE_APP.guests) || [];
        var rooms = (window.ASHURE_APP && window.ASHURE_APP.rooms) || [];

        var totalReservations = reservations.length || 0;
        var totalGuests = guests.length || 0;

        var checkedInCount = 0;
        for (var i = 0; i < reservations.length; i++) {
            if (reservations[i].status === "checked-in") {
                checkedInCount++;
            }
        }

        var availableRooms = 0;
        for (var j = 0; j < rooms.length; j++) {
            if (rooms[j].status === "available") {
                availableRooms++;
            }
        }

        var today = new Date();
        var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
        var checkedOutToday = 0;
        for (var k = 0; k < reservations.length; k++) {
            if (reservations[k].checkOut === todayStr) {
                checkedOutToday++;
            }
        }

        var statCards = document.querySelectorAll(".dashboard .stat-card__value");
        if (statCards.length >= 1) {
            statCards[0].textContent = formatNumber(totalReservations);
        }
        if (statCards.length >= 2) {
            statCards[1].textContent = formatNumber(availableRooms);
        }
        if (statCards.length >= 3) {
            statCards[2].textContent = formatNumber(checkedInCount);
        }
        if (statCards.length >= 4) {
            statCards[3].textContent = formatNumber(checkedOutToday);
        }

        var totalGuestsEl = document.getElementById("totalGuestsCount");
        if (totalGuestsEl) {
            totalGuestsEl.textContent = formatNumber(totalGuests);
        }
    }

    // ---- Update Hotel Occupancy Panel ----
    function updateOccupancyPanel() {
        var rooms = window.ASHURE_APP && window.ASHURE_APP.rooms;
        var detailItems = document.querySelectorAll(".occupancy-details__item span:last-child");
        if (window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_rooms") || !Array.isArray(rooms) ||
            !rooms.every(function (room) { return room && typeof room.status === "string"; })) {
            occupancyTargetPercent = null;
            cancelCircularAnimation();
            setCircularProgress(null);
            ["Occupied", "Available", "Total Rooms", "Reserved"].forEach(function (label, index) {
                if (detailItems[index]) detailItems[index].textContent = label + ": Unknown (room data unavailable)";
            });
            return;
        }

        var totalRooms = rooms.length || 0;
        var occupiedRooms = 0;
        var reservedRooms = 0;
        var availableRooms = 0;
        var maintenanceRooms = 0;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].status === "available") {
                availableRooms++;
            } else if (rooms[i].status === "occupied") {
                occupiedRooms++;
            } else if (rooms[i].status === "reserved") {
                reservedRooms++;
            } else if (rooms[i].status === "maintenance") {
                maintenanceRooms++;
            }
        }

        var occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        occupancyTargetPercent = occupancyRate;

        cancelCircularAnimation();
        setCircularProgress(occupancyRate);

        if (detailItems.length >= 3) {
            detailItems[0].textContent = "Occupied: " + occupiedRooms + " rooms";
            detailItems[1].textContent = "Available: " + availableRooms + " rooms";
            detailItems[2].textContent = "Total Rooms: " + totalRooms;
        }
        if (detailItems[3]) detailItems[3].textContent = "Reserved: " + reservedRooms + " rooms";
    }

    function updateReservationEvidenceSummary() {
        var summary = document.getElementById("dashboardReservationEvidence");
        var warningEl = document.getElementById("dashboardReservationWarnings");
        if (!summary || !warningEl) return;
        var app = window.ASHURE_APP || {};
        if (window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_rooms") ||
            window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_reservations") ||
            !Array.isArray(app.rooms) || !Array.isArray(app.reservations)) {
            summary.textContent = "Reservation evidence unavailable; room or reservation data could not be loaded.";
            warningEl.textContent = "Counts are unknown, not zero.";
            return;
        }
        var referenceDate;
        try {
            var parts = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit"
            }).formatToParts(new Date());
            function part(type) { return parts.find(function (p) { return p.type === type; }).value; }
            referenceDate = part("year") + "-" + part("month") + "-" + part("day");
        } catch (error) {
            summary.textContent = "Reservation evidence unavailable; hotel date could not be determined.";
            warningEl.textContent = "Counts are unknown, not zero.";
            return;
        }
        var current = new Set(), overdue = new Set(), confirmed = new Set(), pending = new Set();
        var roomNumbers = new Set(), missing = new Set(), warningCodes = new Set();
        var unknown = false;
        app.rooms.forEach(function (room) {
            var evidence = window.ASHURE_UTILS.getRoomReservationEvidence(room, app.reservations, referenceDate);
            if (evidence.dataState === "unknown") unknown = true;
            if (room && typeof room.roomNumber === "string") roomNumbers.add(room.roomNumber);
            if (evidence.current.checkedIn.length) current.add(room.roomNumber);
            if (evidence.overdueCheckedIn.length) overdue.add(room.roomNumber);
            if (evidence.upcoming.some(function (r) { return r.status === "confirmed"; })) confirmed.add(room.roomNumber);
            if (evidence.upcoming.some(function (r) { return r.status === "pending"; })) pending.add(room.roomNumber);
            evidence.warnings.forEach(function (warning) { warningCodes.add(warning.code); });
        });
        app.reservations.forEach(function (reservation) {
            if (!reservation || typeof reservation.roomNumber !== "string") {
                unknown = true;
                warningCodes.add("invalid-reservation");
            } else if (!roomNumbers.has(reservation.roomNumber)) missing.add(reservation.roomNumber);
        });
        summary.textContent = unknown ? "Reservation evidence incomplete; counts are unknown. Review reservation data."
            : "Rooms with current checked-in evidence: " + current.size +
                "; overdue checked-in: " + overdue.size +
                "; upcoming confirmed: " + confirmed.size +
                "; upcoming pending: " + pending.size + ". As of " + referenceDate + " (Asia/Manila).";
        var warningLabels = {
            "available-with-checked-in-evidence": "Stored available / checked-in disagreement",
            "maintenance-with-checked-in-evidence": "Maintenance / checked-in conflict",
            "conflicting-checked-in-evidence": "Multiple checked-in records for a room",
            "manual-occupancy-unverified": "Manual occupancy unverified",
            "checked-in-before-arrival": "Checked-in before scheduled arrival",
            "overdue-checked-in": "Overdue checked-in records need review",
            "past-due-booking": "Past-due booking statuses need review",
            "future-booking-not-current-occupancy": "Stored reserved with future bookings only",
            "unknown-room-status": "Unknown operational room status"
        };
        var warnings = [];
        warningCodes.forEach(function (code) {
            if (warningLabels[code]) warnings.push(warningLabels[code]);
            else if (warnings.indexOf("Invalid or unknown reservation data") === -1) warnings.push("Invalid or unknown reservation data");
        });
        if (missing.size) warnings.push("Reservations reference missing rooms: " + missing.size);
        warningEl.textContent = warnings.length ? "Review: " + warnings.join("; ") + "." : "";
    }

    // ---- Update Reservation Status Panel ----
    function updateReservationStatusPanel() {
        var reservations = (window.ASHURE_APP && window.ASHURE_APP.reservations) || [];

        var statuses = ["confirmed", "pending", "checked-in", "checked-out", "cancelled"];
        var counts = {};
        for (var s = 0; s < statuses.length; s++) {
            counts[statuses[s]] = 0;
        }

        for (var i = 0; i < reservations.length; i++) {
            var st = reservations[i].status;
            if (counts.hasOwnProperty(st)) {
                counts[st]++;
            }
        }

        var total = reservations.length || 0;

        var statusLabels = {
            "confirmed": { label: "Confirmed", color: "rgba(39, 174, 96, 0.85)" },
            "pending": { label: "Pending", color: "rgba(242, 201, 76, 0.9)" },
            "cancelled": { label: "Cancelled", color: "rgba(235, 87, 87, 0.85)" },
            "checked-in": { label: "Checked-in", color: "rgba(47, 128, 237, 0.85)" },
            "checked-out": { label: "Checked-out", color: "rgba(107, 114, 128, 0.75)" }
        };

        var panelBody = document.querySelector(".dashboard-panel:nth-child(2) .dashboard-panel__body");
        if (!panelBody) return;

        var html = '<div class="progress-group">';
        for (var j = 0; j < statuses.length; j++) {
            var st = statuses[j];
            var percent = total > 0 ? Math.round((counts[st] / total) * 100) : 0;
            var info = statusLabels[st] || { label: st, color: "rgba(47, 128, 237, 0.85)" };
            html += '<div class="progress-item">' +
                '<div class="progress-item__header">' +
                    '<span class="progress-item__label">' + info.label + '</span>' +
                    '<span class="progress-item__value" style="color: ' + info.color + ';">' + counts[st] + '</span>' +
                '</div>' +
                '<div class="progress-bar">' +
                    '<div class="progress-bar__fill" style="width: ' + percent + '%; background: ' + info.color + ';"></div>' +
                '</div>' +
            '</div>';
        }
        html += '</div>';

        panelBody.innerHTML = html;
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
            html += '<td>' + window.ASHURE_UTILS.escapeHtml(r.guestName) + '</td>';
            html += '<td>' + window.ASHURE_UTILS.escapeHtml(r.roomNumber) + '</td>';
            html += '<td>' + window.ASHURE_UTILS.escapeHtml(window.ASHURE_UTILS.formatDate(r.checkIn)) + '</td>';
            html += '<td>' + window.ASHURE_UTILS.escapeHtml(window.ASHURE_UTILS.formatDate(r.checkOut)) + '</td>';
            html += '<td><span class="badge ' + badgeClass + '">' + window.ASHURE_UTILS.escapeHtml(window.ASHURE_UTILS.capitalize(r.status)) + '</span></td>';
            html += '</tr>';
        }
        tbody.innerHTML = html;
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

    function cancelCircularAnimation() {
        circularAnimationVersion++;
        if (circularAnimationFrame !== null) cancelAnimationFrame(circularAnimationFrame);
        circularAnimationFrame = null;
    }

    function setCircularProgress(percent) {
        if (circularText) circularText.textContent = percent === null ? "Unknown" : percent + "%";
        if (circularFill) {
            circularFill.style.transition = "none";
            circularFill.style.opacity = percent === null ? "0" : "";
            circularFill.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
            circularFill.style.strokeDashoffset = percent === null ? CIRCLE_CIRCUMFERENCE
                : CIRCLE_CIRCUMFERENCE - (percent / 100 * CIRCLE_CIRCUMFERENCE);
        }
    }

    // ---- Animate circular progress from 0% to target ----
    function animateCircularProgress() {
        if (!circularFill || !circularText || occupancyTargetPercent === null) return;

        cancelCircularAnimation();
        var version = circularAnimationVersion;
        var targetPercent = occupancyTargetPercent;
        setCircularProgress(0);

        var startTime = null;
        function animateText(timestamp) {
            if (version !== circularAnimationVersion) return;
            circularAnimationFrame = null;
            if (startTime === null) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / 1200, 1);
            var easedProgress = easeOutCubic(progress);
            var currentPercent = Math.round(easedProgress * targetPercent);
            setCircularProgress(currentPercent);

            if (progress < 1) {
                circularAnimationFrame = requestAnimationFrame(animateText);
            }
        }

        circularAnimationFrame = requestAnimationFrame(animateText);
    }

    // ---- Animate progress bars from 0% to target ----
    function animateProgressBars() {
        var fills = document.querySelectorAll(".progress-bar__fill");
        fills.forEach(function (fill) {
            var targetWidth = fill.style.width || "0%";

            fill.style.transition = "none";
            fill.style.width = "0%";

            void fill.offsetWidth;

            fill.style.transition = "width " + PROGRESS_DURATION + "ms cubic-bezier(0.22, 1, 0.36, 1)";
            fill.style.width = targetWidth;
        });
    }

    // ---- Initialize dashboard animations when app is visible ----
    function initDashboard() {
        if (!appShell || !appShell.classList.contains("app--visible")) {
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
        updateOccupancyPanel();
        updateReservationStatusPanel();
        updateRecentReservations();
        updateReservationEvidenceSummary();
    });

    var dashboardLink = document.querySelector('.sidebar__link[data-page="dashboard"]');
    if (dashboardLink) dashboardLink.addEventListener("click", function () {
        updateOccupancyPanel();
        updateReservationEvidenceSummary();
    });

    function startAnimations() {
        updateGreeting();
        updateStatistics();
        updateOccupancyPanel();
        updateReservationStatusPanel();
        updateRecentReservations();
        updateReservationEvidenceSummary();
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
