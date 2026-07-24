(function () {
    "use strict";

    var aboutPage = document.getElementById("aboutPage");

    function initAbout() {
        if (aboutPage) {
            aboutPage.style.display = "none";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAbout);
    } else {
        initAbout();
    }
})();