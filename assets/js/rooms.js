/* ============================================================
     Ashure Heaben Resort Management System
     Rooms Module — Data Foundation, Table Rendering, Filtering, Pagination, Add Room, View Room
     ============================================================ */
 
 (function () {
     "use strict";
 
     // ---- Storage key ----
    var STORAGE_KEY = "ashure_rooms";

    // ---- Room data ----
    var rooms = (function () {
        var stored = window.ASHURE_UTILS.loadStoredRecords(STORAGE_KEY,
            ["roomNumber", "roomType", "status"], ["id", "floor", "capacity", "price"]);
        if (stored !== null) {
            try {
                var parsed = stored;
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                // Corrupted data — fall through to initialize
            }
        }
        var sample = [
            { id: 1, roomNumber: "101", roomType: "standard", floor: 1, capacity: 2, price: 1200, status: "available", description: "" },
            { id: 2, roomNumber: "102", roomType: "standard", floor: 1, capacity: 2, price: 1200, status: "occupied", description: "" },
            { id: 3, roomNumber: "201", roomType: "deluxe", floor: 2, capacity: 3, price: 2500, status: "available", description: "" },
            { id: 4, roomNumber: "202", roomType: "deluxe", floor: 2, capacity: 3, price: 2500, status: "reserved", description: "" },
            { id: 5, roomNumber: "301", roomType: "suite", floor: 3, capacity: 4, price: 4800, status: "available", description: "" },
            { id: 6, roomNumber: "302", roomType: "suite", floor: 3, capacity: 4, price: 4800, status: "maintenance", description: "" },
            { id: 7, roomNumber: "401", roomType: "family", floor: 4, capacity: 5, price: 3500, status: "reserved", description: "" },
            { id: 8, roomNumber: "402", roomType: "family", floor: 4, capacity: 6, price: 4200, status: "occupied", description: "" }
        ];
        window.ASHURE_UTILS.saveStoredRecords(STORAGE_KEY, sample);
        return sample;
    })();

    // ---- DOM references ----
    var roomsTableBody = document.getElementById("roomsTableBody");
    var roomsEmpty = document.getElementById("roomsEmpty");
    var roomCount = document.getElementById("roomCount");
    var roomsPagination = document.getElementById("roomsPagination");

    var roomSearch = document.getElementById("roomSearch");
    var roomTypeFilter = document.querySelector("#roomsPage #roomsRoomTypeFilter");
    var floorFilter = document.getElementById("floorFilter");
    var roomStatusFilter = document.getElementById("roomStatusFilter");
    var btnResetRoomFilters = document.getElementById("btnResetRoomFilters");
    var btnRoomExport = document.getElementById("btnRoomExport");

    var btnAddRoom = document.getElementById("btnAddRoom");
    var addRoomModal = document.getElementById("addRoomModal");
    var addRoomModalBackdrop = document.getElementById("addRoomModalBackdrop");
    var closeAddRoomModalX = document.getElementById("closeAddRoomModalX");
    var closeAddRoomModalBtn = document.getElementById("closeAddRoomModal");
    var addRoomForm = document.getElementById("addRoomForm");

    var addRoomNumber = document.getElementById("addRoomNumber");
    var addRoomType = document.getElementById("addRoomType");
    var addRoomFloor = document.getElementById("addRoomFloor");
    var addRoomCapacity = document.getElementById("addRoomCapacity");
    var addRoomPrice = document.getElementById("addRoomPrice");
    var addRoomStatus = document.getElementById("addRoomStatus");

    var viewRoomModal = document.getElementById("viewRoomModal");
    var viewRoomModalBackdrop = document.getElementById("viewRoomModalBackdrop");
    var closeViewRoomModalX = document.getElementById("closeViewRoomModalX");
    var btnCloseViewRoomModal = document.getElementById("btnCloseViewRoomModal");
    var btnEditFromViewRoom = document.getElementById("btnEditFromViewRoom");

    var viewRoomNumber = document.getElementById("viewRoomNumber");
    var viewRoomType = document.getElementById("viewRoomType");
    var viewRoomFloor = document.getElementById("viewRoomFloor");
    var viewRoomCapacity = document.getElementById("viewRoomCapacity");
    var viewRoomPrice = document.getElementById("viewRoomPrice");
    var viewRoomStatus = document.getElementById("viewRoomStatus");

    var editRoomModal = document.getElementById("editRoomModal");
    var editRoomModalBackdrop = document.getElementById("editRoomModalBackdrop");
    var closeEditRoomModalX = document.getElementById("closeEditRoomModalX");
    var closeEditRoomModalBtn = document.getElementById("closeEditRoomModal");
    var editRoomForm = document.getElementById("editRoomForm");

    var editRoomNumber = document.getElementById("editRoomNumber");
    var editRoomType = document.getElementById("editRoomType");
    var editRoomFloor = document.getElementById("editRoomFloor");
    var editRoomCapacity = document.getElementById("editRoomCapacity");
    var editRoomPrice = document.getElementById("editRoomPrice");
    var editRoomStatus = document.getElementById("editRoomStatus");

    // ---- Configuration ----
    var ITEMS_PER_PAGE = 8;
    var currentPage = 1;
    var viewingRoomId = null;
    var editingRoomId = null;

    // ---- Expose data for statistics and cross-module use ----
    window.ASHURE_APP = window.ASHURE_APP || {};
    window.ASHURE_APP.rooms = rooms;

    // ---- Utility: Get badge class for room status ----
    function getStatusBadgeClass(status) {
        switch (status) {
            case "available": return "badge--success";
            case "occupied": return "badge--info";
            case "reserved": return "badge--warning";
            case "maintenance": return "badge--danger";
            default: return "badge--info";
        }
    }

    // ---- Bind input listeners to clear validation on user input ----
    function bindValidationClear() {
        var fields = [addRoomNumber, addRoomType, addRoomFloor, addRoomCapacity, addRoomPrice, addRoomStatus, editRoomNumber, editRoomType, editRoomFloor, editRoomCapacity, editRoomPrice, editRoomStatus];
        for (var i = 0; i < fields.length; i++) {
            if (fields[i]) {
                fields[i].addEventListener("input", window.ASHURE_UTILS.clearValidation);
                fields[i].addEventListener("change", window.ASHURE_UTILS.clearValidation);
            }
        }
    }

    // ---- Persist rooms to LocalStorage ----
    function saveRooms() {
        try {
            return window.ASHURE_UTILS.saveStoredRecords(STORAGE_KEY, rooms);
        } catch (e) {
            // Storage unavailable or quota exceeded — continue silently
        }
    }

    // ---- Update summary statistics ----
    function updateStats() {
        var total = rooms.length;
        var available = 0;
        var occupied = 0;
        var maintenance = 0;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].status === "available") available++;
            else if (rooms[i].status === "occupied") occupied++;
            else if (rooms[i].status === "maintenance") maintenance++;
        }

        var statValues = document.querySelectorAll("#roomsPage .stat-card__value");
        if (statValues[0]) statValues[0].textContent = total;
        if (statValues[1]) statValues[1].textContent = available;
        if (statValues[2]) statValues[2].textContent = occupied;
        if (statValues[3]) statValues[3].textContent = maintenance;
    }

    // ---- Apply filters and return matching rooms ----
    function getFilteredRooms() {
        var searchTerm = roomSearch ? roomSearch.value.trim().toLowerCase() : "";
        var roomTypeVal = roomTypeFilter ? roomTypeFilter.value : "";
        var floorVal = floorFilter ? floorFilter.value : "";
        var statusVal = roomStatusFilter ? roomStatusFilter.value : "";

        return rooms.filter(function (r) {
            var matchesSearch = !searchTerm ||
                r.roomNumber.toLowerCase().indexOf(searchTerm) !== -1 ||
                r.roomType.toLowerCase().indexOf(searchTerm) !== -1;

            var matchesRoomType = !roomTypeVal || r.roomType === roomTypeVal;
            var matchesFloor = !floorVal || String(r.floor) === floorVal;
            var matchesStatus = !statusVal || r.status === statusVal;

            return matchesSearch && matchesRoomType && matchesFloor && matchesStatus;
        });
    }

    // ---- Render table rows for current page ----
    function renderTable() {
        if (!roomsTableBody) return;

        var filtered = getFilteredRooms();

        if (filtered.length === 0) {
            roomsTableBody.innerHTML = "";
            if (roomsEmpty) roomsEmpty.style.display = "block";
            if (roomCount) roomCount.textContent = "0 rooms";
            if (roomsPagination) roomsPagination.style.display = "none";
            return;
        }

        if (roomsEmpty) roomsEmpty.style.display = "none";

        var totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        var start = (currentPage - 1) * ITEMS_PER_PAGE;
        var end = start + ITEMS_PER_PAGE;
        var pageItems = filtered.slice(start, end);

        var html = "";
        for (var i = 0; i < pageItems.length; i++) {
            var r = pageItems[i];
            html += "<tr>" +
                "<td>" + window.ASHURE_UTILS.escapeHtml(r.roomNumber) + "</td>" +
                "<td>" + window.ASHURE_UTILS.escapeHtml(window.ASHURE_UTILS.capitalize(r.roomType)) + "</td>" +
                "<td>" + r.floor + "</td>" +
                "<td>" + r.capacity + "</td>" +
                "<td>" + window.ASHURE_UTILS.formatCurrency(r.price) + "</td>" +
                "<td><span class=\"badge " + getStatusBadgeClass(r.status) + "\">" + window.ASHURE_UTILS.escapeHtml(window.ASHURE_UTILS.capitalize(r.status)) + "</span></td>" +
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
        }
        roomsTableBody.innerHTML = html;
        if (roomCount) roomCount.textContent = filtered.length + " room" + (filtered.length !== 1 ? "s" : "");

        renderPagination(filtered.length, totalPages);
    }

    // ---- Render pagination controls ----
    function renderPagination(filteredLength, totalPages) {
        if (!roomsPagination) return;

        if (totalPages <= 1) {
            roomsPagination.innerHTML = "";
            roomsPagination.style.display = "none";
            return;
        }

        roomsPagination.style.display = "flex";

        var html = "";
        html += "<button class=\"pagination__btn\" data-page-num=\"" + (currentPage - 1) + "\" " + (currentPage === 1 ? "disabled" : "") + ">&laquo;</button>";

        for (var i = 1; i <= totalPages; i++) {
            html += "<button class=\"pagination__btn" + (i === currentPage ? " pagination__btn--active" : "") + "\" data-page-num=\"" + i + "\">" + i + "</button>";
        }

        html += "<button class=\"pagination__btn\" data-page-num=\"" + (currentPage + 1) + "\" " + (currentPage === totalPages ? "disabled" : "") + ">&raquo;</button>";

        roomsPagination.innerHTML = html;
    }

    // ---- Handle pagination clicks ----
    function handlePaginationClick(e) {
        if (!roomsPagination) return;
        var btn = e.target.closest("button[data-page-num]");
        if (!btn) return;
        if (btn.disabled) return;

        var page = parseInt(btn.getAttribute("data-page-num"), 10);
        if (isNaN(page)) return;

        var filtered = getFilteredRooms();
        var totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        if (page < 1 || page > totalPages) return;

        currentPage = page;
        renderTable();
    }

    // ---- Open Add Room modal ----
    function openAddRoomModal() {
        if (!addRoomModal) return;
        addRoomModal.classList.add("modal--visible");
        addRoomModal.setAttribute("aria-hidden", "false");
        if (addRoomNumber) addRoomNumber.focus();
    }

    // ---- Close Add Room modal ----
    function closeAddRoomModal() {
        if (!addRoomModal) return;
        addRoomModal.classList.remove("modal--visible");
        addRoomModal.setAttribute("aria-hidden", "true");
        if (addRoomForm) addRoomForm.reset();
    }

    // ---- Save new room ----
    function saveRoom(e) {
        if (e) e.preventDefault();

        window.ASHURE_UTILS.clearValidation();

        var roomNumber = addRoomNumber ? addRoomNumber.value.trim() : "";
        var roomType = addRoomType ? addRoomType.value : "";
        var floor = addRoomFloor ? addRoomFloor.value : "";
        var capacity = addRoomCapacity ? addRoomCapacity.value.trim() : "";
        var price = addRoomPrice ? addRoomPrice.value.trim() : "";
        var status = addRoomStatus ? addRoomStatus.value : "";

        var hasError = false;

        if (!roomNumber) {
            window.ASHURE_UTILS.showFieldError(addRoomNumber, "Room number is required.");
            hasError = true;
        } else if (rooms.some(function (r) { return r.roomNumber.toLowerCase() === roomNumber.toLowerCase(); })) {
            window.ASHURE_UTILS.showFieldError(addRoomNumber, "Room number must be unique.");
            hasError = true;
        }

        if (!roomType) {
            window.ASHURE_UTILS.showFieldError(addRoomType, "Room type is required.");
            hasError = true;
        }

        var floorVal = Number(floor);
        if (!floor || !Number.isSafeInteger(floorVal) || floorVal <= 0) {
            window.ASHURE_UTILS.showFieldError(addRoomFloor, "Floor must be a positive integer.");
            hasError = true;
        }

        var capacityVal = Number(capacity);
        if (!capacity || !Number.isSafeInteger(capacityVal) || capacityVal <= 0) {
            window.ASHURE_UTILS.showFieldError(addRoomCapacity, "Capacity must be a positive integer.");
            hasError = true;
        }

        var priceVal = Number(price);
        if (!price || !Number.isFinite(priceVal) || priceVal <= 0) {
            window.ASHURE_UTILS.showFieldError(addRoomPrice, "Price per night must be greater than zero.");
            hasError = true;
        }

        if (!status) {
            window.ASHURE_UTILS.showFieldError(addRoomStatus, "Status is required.");
            hasError = true;
        }

        if (hasError) return;

        var newId = 1;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].id >= newId) newId = rooms[i].id + 1;
        }

        var newRoom = {
            id: newId,
            roomNumber: roomNumber,
            roomType: roomType,
            floor: floorVal,
            capacity: capacityVal,
            price: priceVal,
            status: status,
            description: ""
        };

        rooms.push(newRoom);
        closeAddRoomModal();
        currentPage = 1;
        updateStats();
        renderTable();
        var persisted = saveRooms();
        document.dispatchEvent(new CustomEvent("ashure:data-changed"));
        if (persisted) window.ASHURE_UTILS.showNotification("Room added successfully.");
    }

    // ---- View Room ----
    function openViewRoomModal(id) {
        var r = rooms.find(function (item) { return item.id === id; });
        if (!r) return;

        viewingRoomId = id;

        if (viewRoomNumber) viewRoomNumber.value = r.roomNumber || "";
        if (viewRoomType) viewRoomType.value = window.ASHURE_UTILS.capitalize(r.roomType) || "";
        if (viewRoomFloor) viewRoomFloor.value = r.floor || "";
        if (viewRoomCapacity) viewRoomCapacity.value = r.capacity || "";
        if (viewRoomPrice) viewRoomPrice.value = window.ASHURE_UTILS.formatCurrency(r.price) || "";
        if (viewRoomStatus) viewRoomStatus.value = window.ASHURE_UTILS.capitalize(r.status) || "";

        if (viewRoomModal) {
            viewRoomModal.classList.add("modal--visible");
            viewRoomModal.setAttribute("aria-hidden", "false");
        }
    }

    function closeViewRoomModal() {
        if (!viewRoomModal) return;
        viewRoomModal.classList.remove("modal--visible");
        viewRoomModal.setAttribute("aria-hidden", "true");
        viewingRoomId = null;
    }

    // ---- Edit Room ----
    function openEditRoomModal(id) {
        var r = rooms.find(function (item) { return item.id === id; });
        if (!r) return;

        editingRoomId = id;

        if (editRoomNumber) editRoomNumber.value = r.roomNumber || "";
        if (editRoomType) editRoomType.value = r.roomType || "";
        if (editRoomFloor) editRoomFloor.value = r.floor || "";
        if (editRoomCapacity) editRoomCapacity.value = r.capacity || "";
        if (editRoomPrice) editRoomPrice.value = r.price || "";
        if (editRoomStatus) editRoomStatus.value = r.status || "";

        if (editRoomModal) {
            editRoomModal.classList.add("modal--visible");
            editRoomModal.setAttribute("aria-hidden", "false");
            if (editRoomNumber) editRoomNumber.focus();
        }
    }

    function closeEditRoomModal() {
        if (!editRoomModal) return;
        editRoomModal.classList.remove("modal--visible");
        editRoomModal.setAttribute("aria-hidden", "true");
        if (editRoomForm) editRoomForm.reset();
        editingRoomId = null;
    }

    function saveEditRoom(e) {
        if (e) e.preventDefault();

        window.ASHURE_UTILS.clearValidation();

        var r = rooms.find(function (item) { return item.id === editingRoomId; });
        if (!r) return;

        var roomNumber = editRoomNumber ? editRoomNumber.value.trim() : "";
        var roomType = editRoomType ? editRoomType.value : "";
        var floor = editRoomFloor ? editRoomFloor.value : "";
        var capacity = editRoomCapacity ? editRoomCapacity.value.trim() : "";
        var price = editRoomPrice ? editRoomPrice.value.trim() : "";
        var status = editRoomStatus ? editRoomStatus.value : "";

        var hasError = false;

        if (!roomNumber) {
            window.ASHURE_UTILS.showFieldError(editRoomNumber, "Room number is required.");
            hasError = true;
        } else if (rooms.some(function (item) { return item.id !== editingRoomId && item.roomNumber.toLowerCase() === roomNumber.toLowerCase(); })) {
            window.ASHURE_UTILS.showFieldError(editRoomNumber, "Room number must be unique.");
            hasError = true;
        }

        if (!roomType) {
            window.ASHURE_UTILS.showFieldError(editRoomType, "Room type is required.");
            hasError = true;
        }

        var floorVal = Number(floor);
        if (!floor || !Number.isSafeInteger(floorVal) || floorVal <= 0) {
            window.ASHURE_UTILS.showFieldError(editRoomFloor, "Floor must be a positive integer.");
            hasError = true;
        }

        var capacityVal = Number(capacity);
        if (!capacity || !Number.isSafeInteger(capacityVal) || capacityVal <= 0) {
            window.ASHURE_UTILS.showFieldError(editRoomCapacity, "Capacity must be a positive integer.");
            hasError = true;
        }

        var priceVal = Number(price);
        if (!price || !Number.isFinite(priceVal) || priceVal <= 0) {
            window.ASHURE_UTILS.showFieldError(editRoomPrice, "Price per night must be greater than zero.");
            hasError = true;
        }

        if (!status) {
            window.ASHURE_UTILS.showFieldError(editRoomStatus, "Status is required.");
            hasError = true;
        }

        if (hasError) return;

        r.roomNumber = roomNumber;
        r.roomType = roomType;
        r.floor = floorVal;
        r.capacity = capacityVal;
        r.price = priceVal;
        r.status = status;

        closeEditRoomModal();
        updateStats();
        renderTable();
        var persisted = saveRooms();
        document.dispatchEvent(new CustomEvent("ashure:data-changed"));
        if (persisted) window.ASHURE_UTILS.showNotification("Room updated successfully.");
    }

    // ---- Delete Room ----
    function deleteRoom(id) {
        window.ASHURE_UTILS.confirm("Are you sure you want to delete this room?").then(function (confirmed) {
            if (!confirmed) return;

            var index = rooms.findIndex(function (r) { return r.id === id; });
            if (index === -1) return;

            rooms.splice(index, 1);

            var filtered = getFilteredRooms();
            var totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
            if (totalPages === 0) {
                currentPage = 1;
            } else if (currentPage > totalPages) {
                currentPage = totalPages;
            }

            updateStats();
            renderTable();
            var persisted = saveRooms();
            document.dispatchEvent(new CustomEvent("ashure:data-changed"));
            if (persisted) window.ASHURE_UTILS.showNotification("Room deleted.", "danger");
        });
    }

    // ---- Export Rooms ----
    function exportRooms() {
        var filtered = getFilteredRooms();
        var headers = ["Room Number", "Room Type", "Floor", "Capacity", "Price per Night", "Status"];
        var rows = filtered.map(function (r) {
            return [
                r.roomNumber,
                window.ASHURE_UTILS.capitalize(r.roomType),
                r.floor,
                r.capacity,
                r.price,
                window.ASHURE_UTILS.capitalize(r.status)
            ].map(function (cell) { return "\"" + cell + "\""; }).join(",");
        });

        var csv = headers.join(",") + "\n" + rows.join("\n");
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "rooms.csv");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ---- Rooms table action delegation ----
    if (roomsTableBody) {
        roomsTableBody.addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-action]");
            if (!btn) return;
            var action = btn.getAttribute("data-action");
            var id = parseInt(btn.getAttribute("data-id"), 10);
            if (action === "view") {
                openViewRoomModal(id);
            } else if (action === "edit") {
                openEditRoomModal(id);
            } else if (action === "delete") {
                deleteRoom(id);
            }
        });
    }

    // ---- Initialize rooms module ----
    function initRooms() {
        if (btnAddRoom) {
            btnAddRoom.addEventListener("click", openAddRoomModal);
        }
        if (closeAddRoomModalX) {
            closeAddRoomModalX.addEventListener("click", closeAddRoomModal);
        }
        if (closeAddRoomModalBtn) {
            closeAddRoomModalBtn.addEventListener("click", closeAddRoomModal);
        }
        if (addRoomModalBackdrop) {
            addRoomModalBackdrop.addEventListener("click", closeAddRoomModal);
        }
        if (addRoomForm) {
            addRoomForm.addEventListener("submit", saveRoom);
        }

        if (closeViewRoomModalX) {
            closeViewRoomModalX.addEventListener("click", closeViewRoomModal);
        }
        if (btnCloseViewRoomModal) {
            btnCloseViewRoomModal.addEventListener("click", closeViewRoomModal);
        }
        if (viewRoomModalBackdrop) {
            viewRoomModalBackdrop.addEventListener("click", closeViewRoomModal);
        }
        if (btnEditFromViewRoom) {
            btnEditFromViewRoom.addEventListener("click", function () {
                var roomId = viewingRoomId;
                closeViewRoomModal();
                if (roomId) {
                    openEditRoomModal(roomId);
                }
            });
        }

        if (closeEditRoomModalX) {
            closeEditRoomModalX.addEventListener("click", closeEditRoomModal);
        }
        if (closeEditRoomModalBtn) {
            closeEditRoomModalBtn.addEventListener("click", closeEditRoomModal);
        }
        if (editRoomModalBackdrop) {
            editRoomModalBackdrop.addEventListener("click", closeEditRoomModal);
        }
        if (editRoomForm) {
            editRoomForm.addEventListener("submit", saveEditRoom);
        }

        bindValidationClear();

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                if (editRoomModal && editRoomModal.classList.contains("modal--visible")) {
                    closeEditRoomModal();
                } else if (addRoomModal && addRoomModal.classList.contains("modal--visible")) {
                    closeAddRoomModal();
                } else if (viewRoomModal && viewRoomModal.classList.contains("modal--visible")) {
                    closeViewRoomModal();
                }
            }
        });

        if (roomSearch) {
            roomSearch.addEventListener("input", function () {
                currentPage = 1;
                renderTable();
            });
        }
        if (roomTypeFilter) {
            roomTypeFilter.addEventListener("change", function () {
                currentPage = 1;
                renderTable();
            });
        }
        if (floorFilter) {
            floorFilter.addEventListener("change", function () {
                currentPage = 1;
                renderTable();
            });
        }
        if (roomStatusFilter) {
            roomStatusFilter.addEventListener("change", function () {
                currentPage = 1;
                renderTable();
            });
        }
        if (btnResetRoomFilters) {
            btnResetRoomFilters.addEventListener("click", function () {
                if (roomSearch) roomSearch.value = "";
                if (roomTypeFilter) roomTypeFilter.value = "";
                if (floorFilter) floorFilter.value = "";
                if (roomStatusFilter) roomStatusFilter.value = "";
                currentPage = 1;
                renderTable();
            });
        }
        if (roomsPagination) {
            roomsPagination.addEventListener("click", handlePaginationClick);
        }
        if (btnRoomExport) {
            btnRoomExport.addEventListener("click", exportRooms);
        }

        updateStats();
        renderTable();
    }

    // ---- Start when DOM is ready ----
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initRooms);
    } else {
        initRooms();
    }
})();
