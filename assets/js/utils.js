/* ============================================================
   Ashure Heaben Resort Management System
   Shared Utilities
   Common helper functions used across modules.
   ============================================================ */

(function () {
    "use strict";

    window.ASHURE_UTILS = window.ASHURE_UTILS || {};

    // Keep unreadable stored records untouched, including on later saves.
    var blockedStorageKeys = {};
    window.ASHURE_UTILS.loadStoredRecords = function (key, stringFields, numberFields) {
        try {
            var raw = localStorage.getItem(key);
            if (raw === null) return null;
            var records = JSON.parse(raw);
            if (!Array.isArray(records) || !records.every(function (record) {
                return record && typeof record === "object" &&
                    stringFields.every(function (field) { return typeof record[field] === "string"; }) &&
                    numberFields.every(function (field) {
                        return typeof record[field] === "number" && Number.isFinite(record[field]);
                    });
            })) throw new Error("Invalid stored records");
            return records;
        } catch (error) {
            blockedStorageKeys[key] = true;
            window.alert("Unable to load " + key + ". Existing stored data has not been changed. " +
                "This list is empty for this session and saving is blocked to protect existing records.");
            return [];
        }
    };

    window.ASHURE_UTILS.saveStoredRecords = function (key, records) {
        try {
            if (blockedStorageKeys[key]) throw new Error("Stored data requires recovery");
            localStorage.setItem(key, JSON.stringify(records));
            return true;
        } catch (error) {
            window.alert("Unable to save " + key + ". Changes are only in memory and will be lost on refresh. " +
                "Existing stored data has not been replaced.");
            return false;
        }
    };

    // ---- Format date ----
    window.ASHURE_UTILS.formatDate = function (dateStr) {
        if (!dateStr) return "—";
        var d = new Date(dateStr + "T00:00:00");
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
    };

    // ---- Format currency ----
    window.ASHURE_UTILS.formatCurrency = function (amount) {
        return "₱" + Math.round(amount).toLocaleString("en-US");
    };

    // ---- Escape HTML ----
    window.ASHURE_UTILS.escapeHtml = function (text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    };

    // ---- Capitalize first letter ----
    window.ASHURE_UTILS.capitalize = function (str) {
        if (!str || typeof str !== "string") return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // ---- UIkit notification helper ----
    window.ASHURE_UTILS.showNotification = function (message, status) {
        if (typeof UIkit !== "undefined" && UIkit.notification) {
            UIkit.notification({
                message: message,
                status: status || "success",
                pos: "top-right",
                timeout: 3000
            });
        }
    };

    // ---- UIkit confirmation modal helper ----
    var cancelActiveConfirmation = null;

    window.ASHURE_UTILS.confirm = function (message) {
        if (cancelActiveConfirmation) cancelActiveConfirmation();

        var messageEl = document.getElementById("confirmMessage");
        var yesBtn = document.getElementById("confirmYes");
        var confirmModalEl = document.getElementById("confirmModal");

        if (typeof UIkit === "undefined" || !UIkit || typeof UIkit.modal !== "function" ||
            !confirmModalEl || !messageEl || !yesBtn) {
            return Promise.resolve(window.confirm(message));
        }

        var modal = UIkit.modal("#confirmModal");
        if (!modal) {
            return Promise.resolve(window.confirm(message));
        }

        messageEl.textContent = message;

        return new Promise(function (resolve) {
            var resolved = false;

            function doResolve(value, hideModal) {
                if (resolved) return;
                resolved = true;
                yesBtn.removeEventListener("click", onConfirm);
                confirmModalEl.removeEventListener("hide", onHide);
                cancelActiveConfirmation = null;
                if (hideModal) modal.hide();
                resolve(value);
            }

            function onConfirm() {
                doResolve(true, true);
            }

            function onHide(event) {
                if (event.target === confirmModalEl) doResolve(false, false);
            }

            cancelActiveConfirmation = function () {
                doResolve(false, false);
            };
            yesBtn.addEventListener("click", onConfirm);
            confirmModalEl.addEventListener("hide", onHide);

            modal.show();
        });
    };

    // ---- Form validation helpers ----
    window.ASHURE_UTILS.showFieldError = function (fieldEl, message) {
        if (!fieldEl) return;
        var formGroup = fieldEl.closest(".form-group");
        if (formGroup) {
            formGroup.classList.add("form-group--error");
            fieldEl.classList.add("uk-form-danger");
        }
        var existing = formGroup ? formGroup.querySelector(".form-group__error") : null;
        if (existing) existing.remove();
        var errorEl = document.createElement("span");
        errorEl.className = "form-group__error";
        errorEl.textContent = message;
        if (formGroup) formGroup.appendChild(errorEl);
    };

    window.ASHURE_UTILS.clearValidation = function () {
        var errorEls = document.querySelectorAll(".form-group--error");
        for (var i = 0; i < errorEls.length; i++) {
            errorEls[i].classList.remove("form-group--error");
        }
        var dangerEls = document.querySelectorAll(".uk-form-danger");
        for (var j = 0; j < dangerEls.length; j++) {
            dangerEls[j].classList.remove("uk-form-danger");
        }
        var msgEls = document.querySelectorAll(".form-group__error");
        for (var k = 0; k < msgEls.length; k++) {
            msgEls[k].remove();
        }
    };
})();
