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
    var loginPage = document.getElementById("loginPage");
    var appShell = document.getElementById("appShell");

    /**
     * Default credentials (demonstration only).
     * Stored as constants inside JavaScript — no database, no backend.
     */
    var DEFAULT_USERNAME = "admin";
    var DEFAULT_PASSWORD = "admin123";

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
     * Handle an incorrect login attempt.
     */
    function onAuthFailed() {
        showMessage("Invalid username or password.", false);
        passwordInput.value = "";
        usernameInput.focus();
        passwordInput.focus();
    }

    /**
     * Handle a successful login attempt.
     */
    function onAuthSuccess() {
        showMessage("Login Successful", true);

        usernameInput.disabled = true;
        passwordInput.disabled = true;
        primaryBtn.disabled = true;

        setTimeout(function () {
            navigateToDashboard();
        }, 1000);
    }

    /**
     * Reveal the Dashboard (app shell) and hide the login page.
     */
    function navigateToDashboard() {
        if (loginPage) loginPage.classList.remove("login--visible");
        if (appShell) appShell.classList.add("app--visible");
    }

    // ---- Form submit handler ----
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();
            hideMessage();

            var isUsernameValid = validateField(usernameInput, "Please enter your username.");
            var isPasswordValid = validateField(passwordInput, "Please enter your password.");

            if (!isUsernameValid || !isPasswordValid) {
                return;
            }

            var enteredUsername = usernameInput.value.trim();
            var enteredPassword = passwordInput.value;

            var credentialsMatch =
                enteredUsername === DEFAULT_USERNAME &&
                enteredPassword === DEFAULT_PASSWORD;

            if (credentialsMatch) {
                onAuthSuccess();
            } else {
                onAuthFailed();
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
