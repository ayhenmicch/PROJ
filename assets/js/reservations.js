/* ============================================================
    Ashure Heaben Resort Management System
    Reservation Management (Screen 4)
    Handles page routing, reservation table rendering, filtering,
    pagination, and CRUD operations via modal forms.
    ============================================================ */

(function () {
    "use strict";

    // ---- Constants ----
    var ITEMS_PER_PAGE = 8;
    var PAGE_TITLES = {
        dashboard: "Dashboard",
        reservations: "Reservation Management",
        guests: "Guest Management",
        rooms: "Room Management",
        recordList: "Record List",
        addRecord: "Add Record",
        searchRecord: "Search Record",
        reports: "Reports & Analytics",
        about: "About"
    };

// ---- Storage key ----
var STORAGE_KEY = "ashure_reservations";

// ---- Load reservations from localStorage or initialize with sample data ----
var reservations = (function () {
    var stored = window.ASHURE_UTILS.loadStoredRecords(STORAGE_KEY,
        ["guestName", "email", "phone", "roomNumber", "roomType", "checkIn", "checkOut", "status"], ["id", "guests"]);
    if (stored !== null) {
        try {
            return stored;
        } catch (e) {
            // Corrupted data — fall through to initialize
        }
    }
    var sample = [
        { id: 1, guestName: "Mark Angelo Ty", email: "mark@example.com", phone: "+63 912 345 6789", roomNumber: "101", roomType: "standard", checkIn: "2026-07-21", checkOut: "2026-07-23", status: "checked-in", guests: 2 },
        { id: 2, guestName: "Mary Grace Piattos", email: "mary@example.com", phone: "+63 923 456 7890", roomNumber: "204", roomType: "deluxe", checkIn: "2026-07-22", checkOut: "2026-07-25", status: "confirmed", guests: 1 },
        { id: 3, guestName: "Lebron James", email: "lebron@example.com", phone: "+63 934 567 8901", roomNumber: "305", roomType: "suite", checkIn: "2026-07-22", checkOut: "2026-07-24", status: "pending", guests: 3 },
        { id: 4, guestName: "Nanny McPhee", email: "nanny@example.com", phone: "+63 945 678 9012", roomNumber: "112", roomType: "standard", checkIn: "2026-07-23", checkOut: "2026-07-26", status: "confirmed", guests: 2 },
        { id: 5, guestName: "Rene Baterbonia", email: "rene@example.com", phone: "+63 956 789 0123", roomNumber: "401", roomType: "family", checkIn: "2026-07-21", checkOut: "2026-07-22", status: "checked-out", guests: 4 },
        { id: 6, guestName: "Sofia Reyes", email: "sofia@example.com", phone: "+63 967 890 1234", roomNumber: "108", roomType: "standard", checkIn: "2026-07-24", checkOut: "2026-07-26", status: "confirmed", guests: 1 },
        { id: 7, guestName: "Carlos Mendoza", email: "carlos@example.com", phone: "+63 978 901 2345", roomNumber: "215", roomType: "deluxe", checkIn: "2026-07-25", checkOut: "2026-07-28", status: "pending", guests: 2 },
        { id: 8, guestName: "Aisha Patel", email: "aisha@example.com", phone: "+63 989 012 3456", roomNumber: "302", roomType: "suite", checkIn: "2026-07-23", checkOut: "2026-07-25", status: "cancelled", guests: 2 },
        { id: 9, guestName: "John Dela Cruz", email: "john@example.com", phone: "+63 990 123 4567", roomNumber: "110", roomType: "standard", checkIn: "2026-07-26", checkOut: "2026-07-28", status: "confirmed", guests: 1 },
        { id: 10, guestName: "Maria Santos", email: "maria@example.com", phone: "+63 901 234 5678", roomNumber: "208", roomType: "deluxe", checkIn: "2026-07-27", checkOut: "2026-07-30", status: "pending", guests: 2 },
        { id: 11, guestName: "David Kim", email: "david@example.com", phone: "+63 912 345 6780", roomNumber: "310", roomType: "suite", checkIn: "2026-07-28", checkOut: "2026-07-31", status: "confirmed", guests: 3 },
        { id: 12, guestName: "Elena Garcia", email: "elena@example.com", phone: "+63 923 456 7891", roomNumber: "405", roomType: "family", checkIn: "2026-07-29", checkOut: "2026-08-01", status: "checked-in", guests: 5 }
    ];
    window.ASHURE_UTILS.saveStoredRecords(STORAGE_KEY, sample);
    return sample;
})();

// Expose data for statistics computation
window.ASHURE_APP = window.ASHURE_APP || {};
window.ASHURE_APP.reservations = reservations;

    // ---- State ----
    var currentPage = 1;
    var editingId = null;
    var viewingId = null;
    var filteredReservations = reservations.slice();

    // ---- DOM references ----
    var contentArea = document.getElementById("contentArea");
    var pageTitle = document.getElementById("pageTitle");
    var sidebarLinks = document.querySelectorAll(".sidebar__link[data-page]");
    var sections = document.querySelectorAll("#contentArea > section");

    var reservationSearch = document.getElementById("reservationSearch");
    var statusFilter = document.getElementById("statusFilter");
    var roomTypeFilter = document.getElementById("roomTypeFilter");
    var dateFilter = document.getElementById("dateFilter");
    var btnNewReservation = document.getElementById("btnNewReservation");
    var btnExport = document.getElementById("btnExport");

    var reservationsTableBody = document.getElementById("reservationsTableBody");
    var reservationsEmpty = document.getElementById("reservationsEmpty");
    var reservationsPagination = document.getElementById("reservationsPagination");
    var reservationCount = document.getElementById("reservationCount");

    var reservationModal = document.getElementById("reservationModal");
    var reservationModalBackdrop = document.getElementById("reservationModalBackdrop");
    var reservationModalTitle = document.getElementById("reservationModalTitle");
    var reservationForm = document.getElementById("reservationForm");
    var closeReservationModal = document.getElementById("closeReservationModal");
    var closeReservationModalX = document.getElementById("closeReservationModalX");

    var resGuestName = document.getElementById("resGuestName");
    var resEmail = document.getElementById("resEmail");
    var resPhone = document.getElementById("resPhone");
    var resRoomType = document.getElementById("resRoomType");
    var resRoomNumber = document.getElementById("resRoomNumber");
    var resGuests = document.getElementById("resGuests");
    var resCheckIn = document.getElementById("resCheckIn");
    var resCheckOut = document.getElementById("resCheckOut");
    var resStatus = document.getElementById("resStatus");

    var viewReservationModal = document.getElementById("viewReservationModal");
    var viewReservationModalBackdrop = document.getElementById("viewReservationModalBackdrop");
    var viewReservationModalTitle = document.getElementById("viewReservationModalTitle");
    var btnEditFromView = document.getElementById("btnEditFromView");
    var btnCloseViewModal = document.getElementById("btnCloseViewModal");
    var viewGuestName = document.getElementById("viewGuestName");
    var viewEmail = document.getElementById("viewEmail");
    var viewPhone = document.getElementById("viewPhone");
    var viewReservationRoomNumber = document.getElementById("viewReservationRoomNumber");
    var viewReservationRoomType = document.getElementById("viewReservationRoomType");
    var viewGuests = document.getElementById("viewGuests");
    var viewCheckIn = document.getElementById("viewCheckIn");
    var viewCheckOut = document.getElementById("viewCheckOut");
    var viewStatus = document.getElementById("viewStatus");

    // ---- Utility: Badge class mapping ----
    function getStatusBadgeClass(status) {
        switch (status) {
            case "confirmed": return "badge--success";
            case "pending": return "badge--warning";
            case "checked-in": return "badge--info";
            case "checked-out": return "badge--info";
            case "cancelled": return "badge--danger";
            default: return "badge--info";
        }
    }

    // ---- Bind input listeners to clear validation on user input ----
    function bindValidationClear() {
        var validatable = [resGuestName, resRoomNumber, resCheckIn, resCheckOut, resGuests];
        for (var i = 0; i < validatable.length; i++) {
            if (validatable[i]) {
                validatable[i].addEventListener('input', window.ASHURE_UTILS.clearValidation);
                validatable[i].addEventListener('change', window.ASHURE_UTILS.clearValidation);
            }
        }
    }

    // ---- Persist reservations to localStorage ----
    function saveToLocalStorage() {
        try {
            return window.ASHURE_UTILS.saveStoredRecords(STORAGE_KEY, reservations);
        } catch (e) {
            // Storage unavailable or quota exceeded — continue silently
        }
    }

    // ---- Filter reservations ----
    function applyFilters() {
        var searchTerm = reservationSearch.value.trim().toLowerCase();
        var statusVal = statusFilter.value;
        var roomTypeVal = roomTypeFilter.value;
        var dateVal = dateFilter.value;

        filteredReservations = reservations.filter(function (r) {
            var matchesSearch =
                !searchTerm ||
                r.guestName.toLowerCase().indexOf(searchTerm) !== -1 ||
                r.roomNumber.toLowerCase().indexOf(searchTerm) !== -1 ||
                r.email.toLowerCase().indexOf(searchTerm) !== -1;

            var matchesStatus = !statusVal || r.status === statusVal;
            var matchesRoomType = !roomTypeVal || r.roomType === roomTypeVal;
            var matchesDate = !dateVal || r.checkIn === dateVal || r.checkOut === dateVal;

            return matchesSearch && matchesStatus && matchesRoomType && matchesDate;
        });

        currentPage = 1;
        renderTable();
        renderPagination();
    }

    // ---- Render table ----
    function renderTable() {
        var start = (currentPage - 1) * ITEMS_PER_PAGE;
        var end = start + ITEMS_PER_PAGE;
        var pageItems = filteredReservations.slice(start, end);

        reservationCount.textContent = filteredReservations.length + " reservation" + (filteredReservations.length !== 1 ? "s" : "");

        if (pageItems.length === 0) {
            reservationsTableBody.innerHTML = "";
            reservationsEmpty.style.display = "block";
            reservationsPagination.style.display = "none";
            return;
        }

        reservationsEmpty.style.display = "none";

        reservationsTableBody.innerHTML = pageItems.map(function (r) {
            return "<tr>" +
                "<td>" + window.ASHURE_UTILS.escapeHtml(r.guestName) + "</td>" +
                "<td>" + window.ASHURE_UTILS.escapeHtml(r.roomNumber) + "</td>" +
                "<td>" + window.ASHURE_UTILS.escapeHtml(window.ASHURE_UTILS.capitalize(r.roomType)) + "</td>" +
                "<td>" + window.ASHURE_UTILS.formatDate(r.checkIn) + "</td>" +
                "<td>" + window.ASHURE_UTILS.formatDate(r.checkOut) + "</td>" +
                "<td><span class=\"badge " + getStatusBadgeClass(r.status) + "\">" + window.ASHURE_UTILS.escapeHtml(window.ASHURE_UTILS.capitalize(r.status)) + "</span></td>" +
                "<td><div class=\"actions-cell\">" +
                "<button class=\"action-btn action-btn--view\" data-action=\"view\" data-id=\"" + r.id + "\" aria-label=\"View\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>" +
                "</button>" +
                "<button class=\"action-btn action-btn--edit\" data-action=\"edit\" data-id=\"" + r.id + "\" aria-label=\"Edit\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0-2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>" +
                "</button>" +
                "<button class=\"action-btn action-btn--delete\" data-action=\"delete\" data-id=\"" + r.id + "\" aria-label=\"Delete\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>" +
                "</button>" +
                "</div></td>" +
                "</tr>";
        }).join("");
    }

    // ---- Render pagination ----
    function renderPagination() {
        var totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);
        if (totalPages <= 1) {
            reservationsPagination.innerHTML = "";
            reservationsPagination.style.display = "none";
            return;
        }

        reservationsPagination.style.display = "flex";

        var html = "";

        // Previous button
        html += "<button class=\"pagination__btn\" data-page-num=\"" + (currentPage - 1) + "\" " + (currentPage === 1 ? "disabled" : "") + ">&laquo;</button>";

        // Page numbers
        for (var i = 1; i <= totalPages; i++) {
            html += "<button class=\"pagination__btn" + (i === currentPage ? " pagination__btn--active" : "") + "\" data-page-num=\"" + i + "\">" + i + "</button>";
        }

        // Next button
        html += "<button class=\"pagination__btn\" data-page-num=\"" + (currentPage + 1) + "\" " + (currentPage === totalPages ? "disabled" : "") + ">&raquo;</button>";

        reservationsPagination.innerHTML = html;
    }

    var resExistingGuest = document.getElementById("resExistingGuest");
    var resGuestLinkMessage = document.getElementById("resGuestLinkMessage");
    var guestLinkChanged = false;
    var selectedGuestId = null;

    function selectableGuests() {
        if (window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_guests")) return [];
        return (window.ASHURE_APP && window.ASHURE_APP.guests) || [];
    }

    function findSelectedGuest(value) {
        var matches = selectableGuests().filter(function (guest) { return String(guest.id) === value; });
        return matches.length === 1 ? matches[0] : null;
    }

    function populateGuestSelection(reservation) {
        guestLinkChanged = false;
        selectedGuestId = null;
        resExistingGuest.innerHTML = "";
        var manual = document.createElement("option");
        manual.value = "";
        manual.textContent = "Enter guest details manually";
        resExistingGuest.appendChild(manual);
        var guests = selectableGuests();
        guests.forEach(function (guest) {
            if (!Number.isSafeInteger(guest.id) || guest.id <= 0 || !findSelectedGuest(String(guest.id))) return;
            var option = document.createElement("option");
            option.value = String(guest.id);
            option.textContent = guest.name + " / " + guest.email + " (ID " + guest.id + ")";
            resExistingGuest.appendChild(option);
        });
        resExistingGuest.value = "";
        resGuestLinkMessage.textContent = window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_guests")
            ? "Guest records could not be loaded. Existing guest links are preserved; manual entry is available."
            : guests.length ? "" : "No existing guests. Enter guest details manually.";
        if (reservation && Object.prototype.hasOwnProperty.call(reservation, "guestId")) {
            var linked = findSelectedGuest(String(reservation.guestId));
            if (linked && Number.isSafeInteger(linked.id) && linked.id > 0) {
                resExistingGuest.value = String(linked.id);
            } else {
                var missing = document.createElement("option");
                missing.value = "__unresolved__";
                missing.textContent = "Unresolved guest link (preserved)";
                missing.disabled = true;
                resExistingGuest.appendChild(missing);
                resExistingGuest.value = missing.value;
                resGuestLinkMessage.textContent = "The linked guest is missing, ambiguous, or unavailable. The original link and booking details will be preserved unless you select another guest or manual entry.";
            }
        }
    }

    resExistingGuest.addEventListener("change", function () {
        guestLinkChanged = true;
        selectedGuestId = null;
        resGuestLinkMessage.textContent = "";
        if (!resExistingGuest.value) return;
        var guest = findSelectedGuest(resExistingGuest.value);
        if (!guest) {
            resGuestLinkMessage.textContent = "This guest is unavailable or ambiguous. Select another guest or manual entry.";
            return;
        }
        selectedGuestId = guest.id;
        resGuestName.value = guest.name;
        resEmail.value = guest.email;
        resPhone.value = guest.phone;
    });

    var rateConfirmationPending = false;
    var reservationModalVersion = 0;

    function bookingRate(room) {
        var price = room && room.price;
        if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
        var cents = price * 100, rounded = Math.round(cents);
        var tolerance = Math.min(0.000001, Number.EPSILON * Math.max(1, Math.abs(cents)) * 4);
        if (!Number.isSafeInteger(rounded) || rounded <= 0 || Math.abs(cents - rounded) > tolerance) return null;
        return rounded / 100;
    }

    // ---- Open modal for new reservation ----
    function openModal() {
        reservationModalVersion++;
        editingId = null;
        reservationModalTitle.textContent = "New Reservation";
        populateGuestSelection(null);
        resGuestName.value = "";
        resEmail.value = "";
        resPhone.value = "";
        resRoomType.value = "standard";
        resRoomNumber.value = "";
        resGuests.value = "1";
        resCheckIn.value = "";
        resCheckOut.value = "";
        resStatus.value = "confirmed";
        reservationModal.classList.add("modal--visible");
        reservationModal.setAttribute("aria-hidden", "false");
        resGuestName.focus();
    }

    // ---- Open modal for editing ----
    function openEditModal(id) {
        reservationModalVersion++;
        var r = reservations.find(function (item) { return item.id === id; });
        if (!r) return;

        editingId = id;
        reservationModalTitle.textContent = "Edit Reservation";
        populateGuestSelection(r);
        resGuestName.value = r.guestName;
        resEmail.value = r.email;
        resPhone.value = r.phone;
        resRoomType.value = r.roomType;
        resRoomNumber.value = r.roomNumber;
        resGuests.value = r.guests;
        resCheckIn.value = r.checkIn;
        resCheckOut.value = r.checkOut;
        resStatus.value = r.status;
        reservationModal.classList.add("modal--visible");
        reservationModal.setAttribute("aria-hidden", "false");
        resGuestName.focus();
    }

    // ---- Close modal ----
    function closeModal() {
        reservationModalVersion++;
        reservationModal.classList.remove("modal--visible");
        reservationModal.setAttribute("aria-hidden", "true");
        editingId = null;
    }

    // ---- Save reservation (add or update) ----
    async function saveReservation(e) {
        e.preventDefault();
        if (rateConfirmationPending) return;
        if (window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_reservations")) {
            window.alert("Restore access to stored reservations and reload before saving.");
            return;
        }

        var guestName = resGuestName.value.trim();
        var email = resEmail.value.trim();
        var phone = resPhone.value.trim();
        var roomType = resRoomType.value;
        var roomNumber = resRoomNumber.value.trim();
        var guests = Number(resGuests.value);
        var checkIn = resCheckIn.value;
        var checkOut = resCheckOut.value;
        var status = resStatus.value;

        var hasError = false;
        if (guestLinkChanged && resExistingGuest.value &&
            (!findSelectedGuest(resExistingGuest.value) || selectedGuestId === null)) {
            window.ASHURE_UTILS.showFieldError(resExistingGuest, "Select an available guest or choose manual entry.");
            return;
        }
        window.ASHURE_UTILS.clearValidation();

        if (!Number.isSafeInteger(guests) || guests <= 0) {
            window.ASHURE_UTILS.showFieldError(resGuests, "Guest count must be a positive integer.");
            hasError = true;
        }
        if (!guestName) {
            window.ASHURE_UTILS.showFieldError(resGuestName, "Guest name is required.");
            hasError = true;
        }
        if (!roomNumber) {
            window.ASHURE_UTILS.showFieldError(resRoomNumber, "Room number is required.");
            hasError = true;
        }
        if (!checkIn) {
            window.ASHURE_UTILS.showFieldError(resCheckIn, "Check-in date is required.");
            hasError = true;
        }
        if (!checkOut) {
            window.ASHURE_UTILS.showFieldError(resCheckOut, "Check-out date is required.");
            hasError = true;
        }
        if (hasError) {
            return;
        }

        var existingReservation = editingId ? reservations.find(function (r) {
            return r.id === editingId;
        }) : null;
        var bookingChanged = !existingReservation ||
            existingReservation.roomNumber !== roomNumber ||
            existingReservation.guests !== guests ||
            existingReservation.checkIn !== checkIn ||
            existingReservation.checkOut !== checkOut ||
            (existingReservation.status === "cancelled" && status !== "cancelled");

        if (bookingChanged) {
            if (window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_rooms")) {
                window.ASHURE_UTILS.showFieldError(resRoomNumber, "Room data is unavailable. Restore access and reload.");
                return;
            }
            var rooms = (window.ASHURE_APP && window.ASHURE_APP.rooms) || [];
            var room = rooms.find(function (r) { return r.roomNumber === roomNumber; });
            if (!room) {
                window.ASHURE_UTILS.showFieldError(resRoomNumber, "Select an existing room from Room Management.");
                return;
            }
            if (!Number.isSafeInteger(room.capacity) || room.capacity <= 0) {
                window.ASHURE_UTILS.showFieldError(resRoomNumber, "This room has no valid capacity. Update it in Room Management.");
                return;
            }
            if (guests > room.capacity) {
                window.ASHURE_UTILS.showFieldError(resGuests, "Guest count exceeds this room's capacity of " + room.capacity + ".");
                return;
            }
            if (["available", "occupied", "reserved"].indexOf(room.status) === -1) {
                window.ASHURE_UTILS.showFieldError(resRoomNumber, "This room is unavailable for booking.");
                return;
            }
        }

        // New reservations cannot check in earlier than today.
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var checkInDate = new Date(checkIn + "T00:00:00");
        if (!editingId && checkInDate < today) {
            window.ASHURE_UTILS.showFieldError(resCheckIn, "Check-in date cannot be in the past.");
            hasError = true;
        }

        // Check-out must be later than check-in
        var checkOutDate = new Date(checkOut + "T00:00:00");
        if (checkOutDate <= checkInDate) {
            window.ASHURE_UTILS.showFieldError(resCheckOut, "Check-out date must be after check-in.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Check for overlapping reservations in the same room
        var hasOverlap = reservations.some(function (r) {
            if (r.id === editingId) return false;
            if (status === "cancelled" || r.status === "cancelled") return false;
            if (r.roomNumber !== roomNumber) return false;
            var existingCheckIn = new Date(r.checkIn + "T00:00:00");
            var existingCheckOut = new Date(r.checkOut + "T00:00:00");
            return checkInDate < existingCheckOut && checkOutDate > existingCheckIn;
        });
        if (hasOverlap) {
            window.ASHURE_UTILS.showFieldError(resRoomNumber, "This room is already booked for the selected dates.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        var captureRate = !existingReservation || existingReservation.roomNumber !== roomNumber;
        var proposedRate = captureRate ? bookingRate(room) : null;
        if (captureRate && proposedRate === null) {
            window.ASHURE_UTILS.showFieldError(resRoomNumber,
                "This room needs a positive nightly rate with no more than two decimal places. Update it in Room Management.");
            return;
        }
        if (captureRate && !Number.isSafeInteger(Math.round(proposedRate * 100) *
            Math.ceil((checkOutDate - checkInDate) / 86400000))) {
            window.ASHURE_UTILS.showFieldError(resRoomNumber, "This rate is too large for the selected stay. Review the room rate.");
            return;
        }
        if (existingReservation && captureRate) {
            var originalId = editingId, modalVersion = reservationModalVersion;
            var originalRecord = JSON.stringify(existingReservation);
            var fields = [resGuestName, resEmail, resPhone, resRoomType, resRoomNumber, resGuests, resCheckIn, resCheckOut, resStatus, resExistingGuest];
            var originalForm = JSON.stringify(fields.map(function (field) { return field.value; }));
            var originalGuestId = selectedGuestId, originalLinkChanged = guestLinkChanged;
            var legacyNotice = Object.prototype.hasOwnProperty.call(existingReservation, "bookedRoomRate")
                ? "" : "The original historical nightly rate is unknown. ";
            rateConfirmationPending = true;
            var confirmed;
            try {
                confirmed = await window.ASHURE_UTILS.confirm(legacyNotice + "Change room " +
                    existingReservation.roomNumber + " to " + roomNumber + " at \u20b1" +
                    proposedRate.toFixed(2) + " per night? Accepting replaces the reservation's saved nightly rate.");
            } finally {
                rateConfirmationPending = false;
            }
            if (!confirmed) return;
            var currentRoom = ((window.ASHURE_APP && window.ASHURE_APP.rooms) || []).find(function (r) {
                return r.roomNumber === roomNumber;
            });
            var currentRecord = reservations.find(function (r) { return r.id === originalId; });
            var conflictNow = reservations.some(function (r) {
                return r.id !== originalId && r.roomNumber === roomNumber &&
                    status !== "cancelled" && r.status !== "cancelled" &&
                    checkInDate < new Date(r.checkOut + "T00:00:00") &&
                    checkOutDate > new Date(r.checkIn + "T00:00:00");
            });
            if (editingId !== originalId || reservationModalVersion !== modalVersion ||
                JSON.stringify(currentRecord) !== originalRecord ||
                JSON.stringify(fields.map(function (field) { return field.value; })) !== originalForm ||
                selectedGuestId !== originalGuestId || guestLinkChanged !== originalLinkChanged ||
                window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_reservations") ||
                window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_rooms") ||
                !currentRoom || bookingRate(currentRoom) !== proposedRate ||
                !Number.isSafeInteger(currentRoom.capacity) || currentRoom.capacity < guests ||
                ["available", "occupied", "reserved"].indexOf(currentRoom.status) === -1 || conflictNow) {
                window.alert("Booking or room details changed while confirming. Please review and save again.");
                return;
            }
        }

        if (editingId) {
            var index = reservations.findIndex(function (item) { return item.id === editingId; });
            if (index !== -1) {
                reservations[index] = Object.assign({}, reservations[index], {
                    id: editingId,
                    guestName: guestName,
                    email: email,
                    phone: phone,
                    roomNumber: roomNumber,
                    roomType: roomType,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    status: status,
                    guests: guests
                });
            }
        } else {
            var newId = reservations.length > 0 ? Math.max.apply(null, reservations.map(function (r) { return r.id; })) + 1 : 1;
            reservations.push({
                id: newId,
                guestName: guestName,
                email: email,
                phone: phone,
                roomNumber: roomNumber,
                roomType: roomType,
                checkIn: checkIn,
                checkOut: checkOut,
                status: status,
                guests: guests
            });
        }

        if (captureRate) {
            var pricedReservation = existingReservation
                ? reservations.find(function (r) { return r.id === editingId; })
                : reservations[reservations.length - 1];
            pricedReservation.bookedRoomRate = proposedRate;
        }

        if (guestLinkChanged) {
            var savedReservation = editingId
                ? reservations.find(function (r) { return r.id === editingId; })
                : reservations[reservations.length - 1];
            if (selectedGuestId === null) delete savedReservation.guestId;
            else savedReservation.guestId = selectedGuestId;
        }

        closeModal();
        applyFilters();
        var persisted = saveToLocalStorage();
        document.dispatchEvent(new CustomEvent("ashure:data-changed"));
        if (persisted) window.ASHURE_UTILS.showNotification("Reservation saved successfully.");
    }

    // ---- Delete reservation ----
    function deleteReservation(id) {
        window.ASHURE_UTILS.confirm("Are you sure you want to delete this reservation?").then(function (confirmed) {
            if (!confirmed) return;
            for (var i = reservations.length - 1; i >= 0; i--) {
                if (reservations[i].id === id) reservations.splice(i, 1);
            }
            applyFilters();
            var persisted = saveToLocalStorage();
            document.dispatchEvent(new CustomEvent("ashure:data-changed"));
            if (persisted) window.ASHURE_UTILS.showNotification("Reservation deleted.", "danger");
        });
    }

    // ---- View reservation (read-only modal) ----
    function viewReservation(id) {
        viewingId = id;
        var r = reservations.find(function (item) { return item.id === id; });
        if (!r) return;

        viewReservationModalTitle.textContent = "Reservation Details — " + r.guestName;
        viewGuestName.value = r.guestName;
        viewEmail.value = r.email;
        viewPhone.value = r.phone;
        viewReservationRoomNumber.value = r.roomNumber;
        viewReservationRoomType.value = window.ASHURE_UTILS.capitalize(r.roomType);
        viewGuests.value = r.guests;
        viewCheckIn.value = r.checkIn;
        viewCheckOut.value = r.checkOut;
        viewStatus.value = window.ASHURE_UTILS.capitalize(r.status);
        viewReservationModal.classList.add("modal--visible");
        viewReservationModal.setAttribute("aria-hidden", "false");
    }

    // ---- Close view reservation modal ----
    function closeViewModal() {
        viewReservationModal.classList.remove("modal--visible");
        viewReservationModal.setAttribute("aria-hidden", "true");
        viewingId = null;
    }

    // ---- Export reservations (demo: CSV download) ----
    function exportReservations() {
        var headers = ["Guest Name", "Email", "Phone", "Room", "Room Type", "Check-in", "Check-out", "Guests", "Status"];
        var rows = filteredReservations.map(function (r) {
            return [
                r.guestName,
                r.email,
                r.phone,
                r.roomNumber,
                window.ASHURE_UTILS.capitalize(r.roomType),
                r.checkIn,
                r.checkOut,
                r.guests,
                window.ASHURE_UTILS.capitalize(r.status)
            ].map(window.ASHURE_UTILS.csvField).join(",");
        });

        var csv = headers.map(window.ASHURE_UTILS.csvField).join(",") + "\r\n" + rows.join("\r\n");
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "reservations.csv");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ---- Page routing ----
    function navigateTo(page) {
        var targetSection = document.querySelector("#contentArea > section." + page);
        if (!targetSection) {
            targetSection = document.querySelector("#contentArea > section.dashboard");
        }

        if (targetSection && targetSection.style.display !== "block") {
            sections.forEach(function (sec) {
                sec.style.display = "none";
            });
            targetSection.style.display = "block";
        }

        // Update sidebar active state
        sidebarLinks.forEach(function (link) {
            link.classList.remove("sidebar__link--active");
            if (link.getAttribute("data-page") === page) {
                link.classList.add("sidebar__link--active");
            }
        });

        // Update page title
        if (pageTitle) {
            pageTitle.textContent = PAGE_TITLES[page] || "Dashboard";
        }
    }

    // ---- Event listeners for sidebar navigation ----
    sidebarLinks.forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            var page = link.getAttribute("data-page");
            if (page && page !== "logout") {
                navigateTo(page);
            }
        });
    });

    // ---- Toolbar filter listeners ----
    if (reservationSearch) reservationSearch.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    if (roomTypeFilter) roomTypeFilter.addEventListener("change", applyFilters);
    if (dateFilter) dateFilter.addEventListener("change", applyFilters);

    // ---- Button listeners ----
    if (btnNewReservation) btnNewReservation.addEventListener("click", openModal);
    if (btnExport) btnExport.addEventListener("click", exportReservations);
    if (reservationForm) reservationForm.addEventListener("submit", saveReservation);
    if (closeReservationModal) closeReservationModal.addEventListener("click", closeModal);
    if (closeReservationModalX) closeReservationModalX.addEventListener("click", closeModal);
    if (reservationModalBackdrop) reservationModalBackdrop.addEventListener("click", closeModal);
    if (viewReservationModalBackdrop) viewReservationModalBackdrop.addEventListener("click", closeViewModal);
    if (btnEditFromView) btnEditFromView.addEventListener("click", function () {
        closeViewModal();
        if (viewingId) openEditModal(viewingId);
    });
    if (btnCloseViewModal) btnCloseViewModal.addEventListener("click", closeViewModal);

    // ---- Table action listeners (delegation) ----
    if (reservationsTableBody) {
        reservationsTableBody.addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-action]");
            if (!btn) return;
            var action = btn.getAttribute("data-action");
            var id = parseInt(btn.getAttribute("data-id"), 10);

            if (action === "view") viewReservation(id);
            else if (action === "edit") openEditModal(id);
            else if (action === "delete") deleteReservation(id);
        });
    }

    // ---- Pagination listener (delegation) ----
    if (reservationsPagination) {
        reservationsPagination.addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-page-num]");
            if (!btn || btn.disabled) return;
            var pageNum = parseInt(btn.getAttribute("data-page-num"), 10);
            var totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);
            if (pageNum >= 1 && pageNum <= totalPages) {
                currentPage = pageNum;
                renderTable();
                renderPagination();
            }
        });
    }

    // ---- Keyboard shortcut to close modal ----
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            if (viewReservationModal.classList.contains("modal--visible")) {
                closeViewModal();
            } else if (reservationModal.classList.contains("modal--visible")) {
                closeModal();
            }
        }
    });

    // ---- Initialize reservations page ----
    function initReservations() {
        applyFilters();
        // Hide reservations section initially; dashboard is visible by default
        var reservationsSection = document.getElementById("reservationsPage");
        if (reservationsSection) {
            reservationsSection.style.display = "none";
        }
        bindValidationClear();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initReservations);
    } else {
        initReservations();
    }
})();
