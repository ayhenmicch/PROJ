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
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
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
    var viewRoomNumber = document.getElementById("viewRoomNumber");
    var viewRoomType = document.getElementById("viewRoomType");
    var viewGuests = document.getElementById("viewGuests");
    var viewCheckIn = document.getElementById("viewCheckIn");
    var viewCheckOut = document.getElementById("viewCheckOut");
    var viewStatus = document.getElementById("viewStatus");

    // ---- Utility: Format date ----
    function formatDate(dateStr) {
        if (!dateStr) return "â€”";
        var d = new Date(dateStr + "T00:00:00");
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
    }

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

    // ---- Utility: Capitalize first letter ----
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ---- Validate a single form field, show inline error ----
    function showFieldError(fieldEl, message) {
        if (!fieldEl) return;
        var formGroup = fieldEl.closest('.form-group');
        if (!formGroup) return;

        formGroup.classList.add('form-group--error');

        var existing = formGroup.querySelector('.form-group__error');
        if (existing) existing.remove();

        var errorEl = document.createElement('span');
        errorEl.className = 'form-group__error';
        errorEl.textContent = message;
        formGroup.appendChild(errorEl);
    }

    // ---- Clear all inline validation errors ----
    function clearValidation() {
        var errorEls = document.querySelectorAll('.form-group--error');
        for (var i = 0; i < errorEls.length; i++) {
            errorEls[i].classList.remove('form-group--error');
        }
        var msgEls = document.querySelectorAll('.form-group__error');
        for (var j = 0; j < msgEls.length; j++) {
            msgEls[j].remove();
        }
    }

    // ---- Bind input listeners to clear validation on user input ----
    function bindValidationClear() {
        var validatable = [resGuestName, resRoomNumber, resCheckIn, resCheckOut];
        for (var i = 0; i < validatable.length; i++) {
            if (validatable[i]) {
                validatable[i].addEventListener('input', clearValidation);
                validatable[i].addEventListener('change', clearValidation);
            }
        }
    }

    // ---- Persist reservations to localStorage ----
    function saveToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
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
                "<td>" + escapeHtml(r.guestName) + "</td>" +
                "<td>" + escapeHtml(r.roomNumber) + "</td>" +
                "<td>" + escapeHtml(capitalize(r.roomType)) + "</td>" +
                "<td>" + formatDate(r.checkIn) + "</td>" +
                "<td>" + formatDate(r.checkOut) + "</td>" +
                "<td><span class=\"badge " + getStatusBadgeClass(r.status) + "\">" + escapeHtml(capitalize(r.status)) + "</span></td>" +
                "<td><div class=\"actions-cell\">" +
                "<button class=\"action-btn action-btn--view\" data-action=\"view\" data-id=\"" + r.id + "\" aria-label=\"View\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>" +
                "</button>" +
                "<button class=\"action-btn action-btn--edit\" data-action=\"edit\" data-id=\"" + r.id + "\" aria-label=\"Edit\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>" +
                "</button>" +
                "<button class=\"action-btn action-btn--delete\" data-action=\"delete\" data-id=\"" + r.id + "\" aria-label=\"Delete\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>" +
                "</button>" +
                "</div></td>" +
                "</tr>";
        }).join("");
    }

    // ---- Escape HTML ----
    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
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

    // ---- Open modal for new reservation ----
    function openModal() {
        editingId = null;
        reservationModalTitle.textContent = "New Reservation";
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
        var r = reservations.find(function (item) { return item.id === id; });
        if (!r) return;

        editingId = id;
        reservationModalTitle.textContent = "Edit Reservation";
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
        reservationModal.classList.remove("modal--visible");
        reservationModal.setAttribute("aria-hidden", "true");
        editingId = null;
    }

    // ---- Save reservation (add or update) ----
    function saveReservation(e) {
        e.preventDefault();

        var guestName = resGuestName.value.trim();
        var email = resEmail.value.trim();
        var phone = resPhone.value.trim();
        var roomType = resRoomType.value;
        var roomNumber = resRoomNumber.value.trim();
        var guests = parseInt(resGuests.value, 10) || 1;
        var checkIn = resCheckIn.value;
        var checkOut = resCheckOut.value;
        var status = resStatus.value;

        var hasError = false;
        clearValidation();

        if (!guestName) {
            showFieldError(resGuestName, "Guest name is required.");
            hasError = true;
        }
        if (!roomNumber) {
            showFieldError(resRoomNumber, "Room number is required.");
            hasError = true;
        }
        if (!checkIn) {
            showFieldError(resCheckIn, "Check-in date is required.");
            hasError = true;
        }
        if (!checkOut) {
            showFieldError(resCheckOut, "Check-out date is required.");
            hasError = true;
        }
        if (hasError) {
            return;
        }

        // Check-in cannot be earlier than today
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var checkInDate = new Date(checkIn + "T00:00:00");
        if (checkInDate < today) {
            showFieldError(resCheckIn, "Check-in date cannot be in the past.");
            hasError = true;
        }

        // Check-out must be later than check-in
        var checkOutDate = new Date(checkOut + "T00:00:00");
        if (checkOutDate <= checkInDate) {
            showFieldError(resCheckOut, "Check-out date must be after check-in.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Check for overlapping reservations in the same room
        var hasOverlap = reservations.some(function (r) {
            if (r.id === editingId) return false;
            if (r.roomNumber !== roomNumber) return false;
            var existingCheckIn = new Date(r.checkIn + "T00:00:00");
            var existingCheckOut = new Date(r.checkOut + "T00:00:00");
            return checkInDate < existingCheckOut && checkOutDate > existingCheckIn;
        });
        if (hasOverlap) {
            showFieldError(resRoomNumber, "This room is already booked for the selected dates.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (editingId) {
            var index = reservations.findIndex(function (item) { return item.id === editingId; });
            if (index !== -1) {
                reservations[index] = {
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
                };
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

        closeModal();
        applyFilters();
        saveToLocalStorage();
        document.dispatchEvent(new CustomEvent("ashure:data-changed"));
    }

    // ---- Delete reservation ----
    function deleteReservation(id) {
        if (!confirm("Are you sure you want to delete this reservation?")) {
            return;
        }
        reservations = reservations.filter(function (r) { return r.id !== id; });
        applyFilters();
        saveToLocalStorage();
        document.dispatchEvent(new CustomEvent("ashure:data-changed"));
    }

    // ---- View reservation (read-only modal) ----
    function viewReservation(id) {
        viewingId = id;
        var r = reservations.find(function (item) { return item.id === id; });
        if (!r) return;

        viewReservationModalTitle.textContent = "Reservation Details â€” " + r.guestName;
        viewGuestName.value = r.guestName;
        viewEmail.value = r.email;
        viewPhone.value = r.phone;
        viewRoomNumber.value = r.roomNumber;
        viewRoomType.value = capitalize(r.roomType);
        viewGuests.value = r.guests;
        viewCheckIn.value = r.checkIn;
        viewCheckOut.value = r.checkOut;
        viewStatus.value = capitalize(r.status);
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
                capitalize(r.roomType),
                r.checkIn,
                r.checkOut,
                r.guests,
                capitalize(r.status)
            ].map(function (cell) { return "\"" + cell + "\""; }).join(",");
        });

        var csv = headers.join(",") + "\n" + rows.join("\n");
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
    }

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
