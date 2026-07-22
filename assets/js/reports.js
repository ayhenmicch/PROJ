/* ============================================================
   Ashure Heaben Resort Management System
   Reports & Analytics (Screen 7)
   UI only — no filtering, exporting, charts, or analytics
   logic implemented yet.
   ============================================================ */

(function () {
    "use strict";

    var reportsPage = document.getElementById("reportsPage");

    function initReports() {
        if (reportsPage) {
            reportsPage.style.display = "none";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initReports);
    } else {
        initReports();
    }
})();
