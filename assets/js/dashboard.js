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

    // ---- Utility: Format number with commas ----
    function formatNumber(num) {
        return Math.round(num).toLocaleString("en-US");
    }

    // ---- Utility: Ease out cubic ----
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
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

    function startAnimations() {
        updateGreeting();
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
