/* ============================================================
   Ashure Heaben Resort Management System
   Splash Screen Behavior (Screen 1) — Premium loader
   Simulates a loading process, animates the progress bar, and
   updates the dynamic loading text and percentage.
   ============================================================ */

(function () {
    "use strict";

    // ---- DOM references ----
    const progressFill = document.getElementById("progressFill");
    const progressBar = document.querySelector(".splash__progress");
    const loadingText = document.getElementById("loadingText");
    const percentText = document.getElementById("percentText");

    // ---- Loading configuration ----
    const DURATION_MS = 4000;   // Total loading time (~4 seconds)
    const TICK_MS = 30;         // Update interval
    const steps = Math.max(1, Math.floor(DURATION_MS / TICK_MS));
    const increment = 100 / steps;

    // ---- Dynamic loading messages mapped to progress ranges ----
    const LOADING_STAGES = [
        { at: 0,   text: "Initializing..." },
        { at: 25,  text: "Loading Resources..." },
        { at: 50,  text: "Preparing Interface..." },
        { at: 75,  text: "Starting System..." },
        { at: 100, text: "Ready!" }
    ];

    let current = 0;
    let lastStage = -1;

    /**
     * Update the progress bar width, percentage label, and
     * the accessible value attribute.
     */
    function updateProgress(value) {
        const rounded = Math.round(value);
        progressFill.style.width = value + "%";
        percentText.textContent = rounded + "%";
        if (progressBar) {
            progressBar.setAttribute("aria-valuenow", rounded);
        }
    }

    /**
     * Switch the loading message based on the current progress.
     */
    function updateLoadingText(value) {
        let active = LOADING_STAGES[0].text;
        for (let i = 0; i < LOADING_STAGES.length; i++) {
            if (value >= LOADING_STAGES[i].at) {
                active = LOADING_STAGES[i].text;
            }
        }
        const stageIndex = LOADING_STAGES.findIndex(function (s) {
            return s.text === active;
        });
        if (stageIndex !== lastStage) {
            lastStage = stageIndex;
            loadingText.textContent = active;
        }
    }

    /**
     * Simulated loading loop.
     * Increments the progress bar and updates the text until 100%.
     */
    const timer = setInterval(function () {
        current += increment;

        if (current >= 100) {
            current = 100;
            updateProgress(current);
            updateLoadingText(current);
            clearInterval(timer);
            onLoadingComplete();
            return;
        }

        updateProgress(current);
        updateLoadingText(current);
    }, TICK_MS);

    /**
     * Called once the simulated loading reaches 100%.
     * Logs where the future redirect to the Login page will be wired in.
     */
    function onLoadingComplete() {
        /*
         * ============================================================
         * FUTURE REDIRECT TO LOGIN PAGE WILL BE ADDED HERE
         * ------------------------------------------------------------
         * Example (when the Login screen is created):
         *     setTimeout(function () {
         *         window.location.href = "login.html";
         *     }, 600);
         * ============================================================
         */
        console.log("Splash loading complete. Redirect to Login page will be added here.");
    }
})();
