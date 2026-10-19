/* ============================================================
   Ashure Heaben Resort Management System
   Shared Utilities
   Common helper functions used across modules.
   ============================================================ */

(function () {
    "use strict";

    window.ASHURE_UTILS = window.ASHURE_UTILS || {};

    // CSV output only: a leading apostrophe makes formula-like text safer for
    // spreadsheet imports. Some importers display it; CSV has no universal type metadata.
    window.ASHURE_UTILS.csvField = function (value) {
        var text = value === null || value === undefined ? "" : String(value);
        if (typeof value !== "number" && /^[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]*[=+\-@]/.test(text)) {
            text = "'" + text;
        }
        return '"' + text.replace(/"/g, '""') + '"';
    };

    // Keep unreadable stored records untouched, including on later saves.
    var blockedStorageKeys = {};
    var unsavedStorageKeys = {};
    window.ASHURE_UTILS.isStoredRecordsUnsaved = function (key) {
        return unsavedStorageKeys[key] === true;
    };
    window.ASHURE_UTILS.isStoredRecordsBlocked = function (key) {
        return blockedStorageKeys[key] === true;
    };
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
            delete unsavedStorageKeys[key];
            return true;
        } catch (error) {
            unsavedStorageKeys[key] = true;
            window.alert("Unable to save " + key + ". Changes are only in memory and will be lost on refresh. " +
                "Existing stored data has not been replaced.");
            return false;
        }
    };

    // Pure evidence only: referenceDate is a hotel-local YYYY-MM-DD string.
    // Supply an array, { available: true, records: [...] }, or { available: false }.
    window.ASHURE_UTILS.getRoomReservationEvidence = function (room, reservationData, referenceDate) {
        var result = {
            operationalStatus: room && room.status,
            referenceDate: referenceDate,
            dataState: "known",
            occupancyEvidence: "none",
            current: { pending: [], scheduled: [], checkedIn: [] },
            upcoming: [],
            overdueCheckedIn: [],
            pastDue: [],
            historical: [],
            cancelled: [],
            warnings: []
        };

        function warn(code, index) {
            var warning = { code: code };
            if (index !== undefined) warning.reservationIndex = index;
            result.warnings.push(warning);
        }

        function validDate(value) {
            if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            var year = Number(value.slice(0, 4));
            var month = Number(value.slice(5, 7));
            var day = Number(value.slice(8, 10));
            var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
            var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
        }

        var records = Array.isArray(reservationData) ? reservationData
            : reservationData && reservationData.available === true ? reservationData.records : null;
        if (!room || typeof room.roomNumber !== "string" || !room.roomNumber ||
            !validDate(referenceDate) || !Array.isArray(records)) {
            result.dataState = "unknown";
            result.occupancyEvidence = "unknown";
            warn(!room || typeof room.roomNumber !== "string" || !room.roomNumber ? "invalid-room"
                : !validDate(referenceDate) ? "invalid-reference-date" : "reservation-data-unavailable");
            return result;
        }

        records.forEach(function (reservation, index) {
            if (!reservation || typeof reservation.roomNumber !== "string") {
                result.dataState = "unknown";
                warn("invalid-reservation", index);
                return;
            }
            // Match exactly, as the existing booking-conflict check does.
            if (reservation.roomNumber !== room.roomNumber) return;
            if (!validDate(reservation.checkIn) || !validDate(reservation.checkOut) ||
                reservation.checkOut <= reservation.checkIn) {
                result.dataState = "unknown";
                warn("invalid-stay-dates", index);
                return;
            }
            var status = reservation.status;
            if (["pending", "confirmed", "checked-in", "checked-out", "completed", "cancelled"].indexOf(status) === -1) {
                result.dataState = "unknown";
                warn("unknown-reservation-status", index);
                return;
            }
            // Return detached descriptors, never references to input records.
            var evidence = { reservationIndex: index, status: status,
                checkIn: reservation.checkIn, checkOut: reservation.checkOut };
            if (status === "cancelled") {
                result.cancelled.push(evidence);
            } else if (status === "checked-out" || status === "completed") {
                result.historical.push(evidence);
            } else if (referenceDate < reservation.checkIn) {
                result.upcoming.push(evidence);
                if (status === "checked-in") warn("checked-in-before-arrival", index);
            } else if (referenceDate >= reservation.checkOut) {
                if (status === "checked-in") {
                    result.overdueCheckedIn.push(evidence);
                    warn("overdue-checked-in", index);
                } else {
                    result.pastDue.push(evidence);
                    warn("past-due-booking", index);
                }
            } else {
                var bucket = status === "pending" ? "pending" : status === "confirmed" ? "scheduled" : "checkedIn";
                result.current[bucket].push(evidence);
            }
        });

        var checkedIn = result.current.checkedIn.length;
        var unresolvedCheckedIn = checkedIn + result.overdueCheckedIn.length;
        if (room.status === "available" && checkedIn) warn("available-with-checked-in-evidence");
        if (room.status === "occupied" && !unresolvedCheckedIn && result.dataState === "known") warn("manual-occupancy-unverified");
        if (room.status === "maintenance" && unresolvedCheckedIn) warn("maintenance-with-checked-in-evidence");
        if (room.status === "reserved" && result.upcoming.length && !unresolvedCheckedIn &&
            !result.current.pending.length && !result.current.scheduled.length) warn("future-booking-not-current-occupancy");
        if (checkedIn > 1) warn("conflicting-checked-in-evidence");
        if (["available", "occupied", "reserved", "maintenance"].indexOf(room.status) === -1) warn("unknown-room-status");
        result.occupancyEvidence = result.dataState === "unknown" ? "unknown" : checkedIn ? "checked-in"
            : result.overdueCheckedIn.length ? "overdue-checked-in" : "none";
        return result;
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
