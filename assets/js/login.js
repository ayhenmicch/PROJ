/* ============================================================
   Ashure Heaben Resort Management System
   Login Page Behavior (Screen 2)
   Validates inputs, simulates login, and handles exit.
   ============================================================ */

(function () {
    "use strict";

    // ---- DOM references ----
    var loginForm = document.getElementById("loginForm");
    var usernameInput = document.getElementById("username");
    var passwordInput = document.getElementById("password");
    var loginMessage = document.getElementById("loginMessage");
    var exitBtn = document.getElementById("exitBtn");
    var primaryBtn = document.querySelector(".login__btn--primary");

    /**
     * Show a validation or status message with animation.
     */
    function showMessage(text, isSuccess) {
        loginMessage.textContent = text;
        loginMessage.classList.add("login__message--visible");
        if (isSuccess) {
            loginMessage.classList.add("login__message--success");
        } else {
            loginMessage.classList.remove("login__message--success");
        }
    }

    /**
     * Hide the validation message.
     */
    function hideMessage() {
        loginMessage.classList.remove("login__message--visible", "login__message--success");
    }

    /**
     * Validate a single field and focus it if empty.
     */
    function validateField(field, message) {
        if (!field.value.trim()) {
            showMessage(message, false);
            field.focus();
            return false;
        }
        return true;
    }

    /**
     * Simulate a successful login after short delay.
     */
    function simulateLogin() {
        showMessage("Login successful! Redirecting...", true);

        usernameInput.disabled = true;
        passwordInput.disabled = true;
        primaryBtn.disabled = true;

        setTimeout(function () {
            console.log("Login simulation complete. Dashboard redirect would happen here.");
        }, 1500);
    }

    // ---- Form submit handler ----
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();
            hideMessage();

            var isUsernameValid = validateField(usernameInput, "Please enter your username.");
            var isPasswordValid = validateField(passwordInput, "Please enter your password.");

            if (isUsernameValid && isPasswordValid) {
                simulateLogin();
            }
        });
    }

    // ---- Exit button handler ----
    if (exitBtn) {
        exitBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to exit?")) {
                window.close();
                setTimeout(function () {
                    window.location.href = "about:blank";
                }, 100);
            }
        });
    }
})();
