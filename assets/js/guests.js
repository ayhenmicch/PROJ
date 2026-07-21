/* ============================================================
   Ashure Heaben Resort Management System
   Guest Management (Screen 5)
   UI only — no CRUD functionality implemented.
   ============================================================ */

(function () {
    "use strict";

    // ---- Sample guest data ----
    var guests = [
        { id: 1, name: "James Wilson", email: "james.wilson@email.com", phone: "+1 555-0101", nationality: "American", visits: 5, status: "active", membership: "gold" },
        { id: 2, name: "Sophia Martinez", email: "sophia.martinez@email.com", phone: "+34 555-0102", nationality: "Spanish", visits: 12, status: "vip", membership: "platinum" },
        { id: 3, name: "Li Wei", email: "li.wei@email.com", phone: "+86 555-0103", nationality: "Chinese", visits: 3, status: "active", membership: "silver" },
        { id: 4, name: "Emma Johnson", email: "emma.johnson@email.com", phone: "+44 555-0104", nationality: "British", visits: 8, status: "vip", membership: "gold" },
        { id: 5, name: "Hiroshi Tanaka", email: "hiroshi.tanaka@email.com", phone: "+81 555-0105", nationality: "Japanese", visits: 2, status: "active", membership: "bronze" },
        { id: 6, name: "Isabella Rossi", email: "isabella.rossi@email.com", phone: "+39 555-0106", nationality: "Italian", visits: 6, status: "inactive", membership: "none" },
        { id: 7, name: "Michael O'Brien", email: "michael.obrien@email.com", phone: "+353 555-0107", nationality: "Irish", visits: 15, status: "vip", membership: "gold" },
        { id: 8, name: "Aisha Khan", email: "aisha.khan@email.com", phone: "+91 555-0108", nationality: "Indian", visits: 4, status: "active", membership: "silver" },
        { id: 9, name: "Carlos Silva", email: "carlos.silva@email.com", phone: "+55 555-0109", nationality: "Brazilian", visits: 1, status: "inactive", membership: "none" },
        { id: 10, name: "Sophie Dubois", email: "sophie.dubois@email.com", phone: "+33 555-0110", nationality: "French", visits: 7, status: "active", membership: "gold" }
    ];

    var ITEMS_PER_PAGE = 8;
    var currentPage = 1;

    var guestsTableBody = document.getElementById("guestsTableBody");
    var guestsEmpty = document.getElementById("guestsEmpty");
    var guestsPagination = document.getElementById("guestsPagination");
    var guestCount = document.getElementById("guestCount");
    var guestsPage = document.getElementById("guestsPage");
    var guestSearch = document.getElementById("guestSearch");
    var guestStatusFilter = document.getElementById("guestStatusFilter");
    var guestMembershipFilter = document.getElementById("guestMembershipFilter");
    var guestNationalityFilter = document.getElementById("guestNationalityFilter");
    var totalGuestsCount = document.getElementById("totalGuestsCount");
    var vipGuestsCount = document.getElementById("vipGuestsCount");
    var returningGuestsCount = document.getElementById("returningGuestsCount");
    var inactiveGuestsCount = document.getElementById("inactiveGuestsCount");

    var addGuestModal = document.getElementById("addGuestModal");
    var addGuestModalBackdrop = document.getElementById("addGuestModalBackdrop");
    var btnAddGuest = document.getElementById("btnAddGuest");
    var closeAddGuestModalX = document.getElementById("closeAddGuestModalX");
    var closeAddGuestModal = document.getElementById("closeAddGuestModal");
    var addGuestForm = document.getElementById("addGuestForm");

    // ---- Utility: Escape HTML ----
    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- Utility: Get initials from name ----
    function getInitials(name) {
        var parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    // ---- Utility: Get avatar background color by index ----
    function getAvatarColor(index) {
        var colors = [
            "#E3F2FD",
            "#E8F5E9",
            "#F3E5F5",
            "#FFF3E0",
            "#E0F2F1",
            "#FCE4EC",
            "#E8EAF6",
            "#E0F7FA",
            "#F1F8E9",
            "#FFF8E1"
        ];
        return colors[index % colors.length];
    }

    // ---- Utility: Get visits text ----
    function getVisitsText(count) {
        return count + " Visit" + (count !== 1 ? "s" : "");
    }

    // ---- Utility: Badge class mapping ----
    function getStatusBadgeClass(status) {
        switch (status) {
            case "active": return "badge--success";
            case "vip": return "badge--vip";
            case "inactive": return "badge--inactive";
            default: return "badge--info";
        }
    }

    // ---- Utility: Capitalize first letter ----
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ---- Update summary stats ----
    function updateStats() {
        var total = guests.length;
        var vip = guests.filter(function (g) { return g.status === "vip"; }).length;
        var returning = guests.filter(function (g) { return g.visits > 1; }).length;
        var inactive = guests.filter(function (g) { return g.status === "inactive"; }).length;

        totalGuestsCount.textContent = total;
        vipGuestsCount.textContent = vip;
        returningGuestsCount.textContent = returning;
        inactiveGuestsCount.textContent = inactive;
    }

    // ---- Render table ----
    function renderTable() {
        var searchTerm = guestSearch ? guestSearch.value.trim().toLowerCase() : "";
        var statusVal = guestStatusFilter ? guestStatusFilter.value : "";
        var membershipVal = guestMembershipFilter ? guestMembershipFilter.value : "";
        var nationalityVal = guestNationalityFilter ? guestNationalityFilter.value : "";

        var filtered = guests.filter(function (g) {
            var matchesSearch = !searchTerm ||
                g.name.toLowerCase().indexOf(searchTerm) !== -1 ||
                g.email.toLowerCase().indexOf(searchTerm) !== -1 ||
                g.phone.toLowerCase().indexOf(searchTerm) !== -1;

            var matchesStatus = !statusVal || g.status === statusVal;
            var matchesMembership = !membershipVal || g.membership === membershipVal;
            var matchesNationality = !nationalityVal || g.nationality.toLowerCase() === nationalityVal;

            return matchesSearch && matchesStatus && matchesMembership && matchesNationality;
        });

        var start = (currentPage - 1) * ITEMS_PER_PAGE;
        var end = start + ITEMS_PER_PAGE;
        var pageItems = filtered.slice(start, end);

        guestCount.textContent = filtered.length + " guest" + (filtered.length !== 1 ? "s" : "");

        if (pageItems.length === 0) {
            guestsTableBody.innerHTML = "";
            guestsEmpty.style.display = "block";
            guestsPagination.style.display = "none";
            return;
        }

        guestsEmpty.style.display = "none";

        guestsTableBody.innerHTML = pageItems.map(function (g, idx) {
            var initials = getInitials(g.name);
            var avatarColor = getAvatarColor(idx);
            var visitsText = getVisitsText(g.visits);

            return "<tr>" +
                "<td>" +
                    "<div class=\"guest-cell\">" +
                        "<div class=\"guest-avatar\" style=\"background: " + avatarColor + ";\">" + escapeHtml(initials) + "</div>" +
                        "<div class=\"guest-info\">" +
                            "<span class=\"guest-name\">" + escapeHtml(g.name) + "</span>" +
                            "<span class=\"guest-email\">" + escapeHtml(g.email) + "</span>" +
                        "</div>" +
                    "</div>" +
                "</td>" +
                "<td>" + escapeHtml(g.email) + "</td>" +
                "<td>" + escapeHtml(g.phone) + "</td>" +
                "<td>" + escapeHtml(g.nationality) + "</td>" +
                "<td><span class=\"visits-text\">" + visitsText + "</span></td>" +
                "<td><span class=\"badge " + getStatusBadgeClass(g.status) + "\">" + escapeHtml(capitalize(g.status)) + "</span></td>" +
                "<td><div class=\"actions-cell\">" +
                "<button class=\"action-btn action-btn--view\" aria-label=\"View\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>" +
                "</button>" +
                "<button class=\"action-btn action-btn--edit\" aria-label=\"Edit\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>" +
                "</button>" +
                "<button class=\"action-btn action-btn--delete\" aria-label=\"Delete\">" +
                "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>" +
                "</button>" +
                "</div></td>" +
                "</tr>";
        }).join("");
    }

    // ---- Render pagination (UI only) ----
    function renderPagination() {
        var searchTerm = guestSearch ? guestSearch.value.trim().toLowerCase() : "";
        var statusVal = guestStatusFilter ? guestStatusFilter.value : "";
        var membershipVal = guestMembershipFilter ? guestMembershipFilter.value : "";
        var nationalityVal = guestNationalityFilter ? guestNationalityFilter.value : "";

        var filtered = guests.filter(function (g) {
            var matchesSearch = !searchTerm ||
                g.name.toLowerCase().indexOf(searchTerm) !== -1 ||
                g.email.toLowerCase().indexOf(searchTerm) !== -1 ||
                g.phone.toLowerCase().indexOf(searchTerm) !== -1;

            var matchesStatus = !statusVal || g.status === statusVal;
            var matchesMembership = !membershipVal || g.membership === membershipVal;
            var matchesNationality = !nationalityVal || g.nationality.toLowerCase() === nationalityVal;

            return matchesSearch && matchesStatus && matchesMembership && matchesNationality;
        });

        var totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        if (totalPages <= 1) {
            guestsPagination.innerHTML = "";
            guestsPagination.style.display = "none";
            return;
        }

        guestsPagination.style.display = "flex";

        var html = "";
        html += "<button class=\"pagination__btn\" data-page-num=\"" + (currentPage - 1) + "\" " + (currentPage === 1 ? "disabled" : "") + ">&laquo;</button>";

        for (var i = 1; i <= totalPages; i++) {
            html += "<button class=\"pagination__btn" + (i === currentPage ? " pagination__btn--active" : "") + "\" data-page-num=\"" + i + "\">" + i + "</button>";
        }

        html += "<button class=\"pagination__btn\" data-page-num=\"" + (currentPage + 1) + "\" " + (currentPage === totalPages ? "disabled" : "") + ">&raquo;</button>";

        guestsPagination.innerHTML = html;
    }

    // ---- Initialize guests page ----
    function initGuests() {
        if (guestsPage) {
            guestsPage.style.display = "none";
        }
        updateStats();
        renderTable();
        renderPagination();
    }

    if (guestSearch) {
        guestSearch.addEventListener("input", function () {
            renderTable();
            renderPagination();
        });
    }

    if (guestStatusFilter) {
        guestStatusFilter.addEventListener("change", function () {
            renderTable();
            renderPagination();
        });
    }

    if (guestMembershipFilter) {
        guestMembershipFilter.addEventListener("change", function () {
            renderTable();
            renderPagination();
        });
    }

    if (guestNationalityFilter) {
        guestNationalityFilter.addEventListener("change", function () {
            renderTable();
            renderPagination();
        });
    }

    // ---- Add Guest Modal ----
    function openAddGuestModal() {
        if (addGuestModal) {
            addGuestModal.classList.add("modal--visible");
            addGuestModal.setAttribute("aria-hidden", "false");
        }
    }

    function closeAddGuestModal() {
        if (addGuestModal) {
            addGuestModal.classList.remove("modal--visible");
            addGuestModal.setAttribute("aria-hidden", "true");
        }
        if (addGuestForm) {
            addGuestForm.reset();
        }
    }

    if (btnAddGuest) {
        btnAddGuest.addEventListener("click", openAddGuestModal);
    }

    if (closeAddGuestModalX) {
        closeAddGuestModalX.addEventListener("click", closeAddGuestModal);
    }

    if (closeAddGuestModal) {
        closeAddGuestModal.addEventListener("click", closeAddGuestModal);
    }

    if (addGuestModalBackdrop) {
        addGuestModalBackdrop.addEventListener("click", closeAddGuestModal);
    }

    if (addGuestForm) {
        addGuestForm.addEventListener("submit", function (e) {
            e.preventDefault();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGuests);
    } else {
        initGuests();
    }
})();
