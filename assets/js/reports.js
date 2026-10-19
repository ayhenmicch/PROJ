/* ============================================================
    Ashure Heaben Resort Management System
    Reports & Analytics (Screen 7)
    Dynamic summary cards implementation.
    ============================================================ */

(function () {
    "use strict";

    var reportsPage = document.getElementById("reportsPage");

    function reportDataState() {
        var app = window.ASHURE_APP || {};
        return {
            reservations: Array.isArray(app.reservations) && !window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_reservations"),
            rooms: Array.isArray(app.rooms) && !window.ASHURE_UTILS.isStoredRecordsBlocked("ashure_rooms")
        };
    }

    function updateDataWarning(state) {
        var warning = reportsPage.querySelector("#reportDataWarning");
        if (!warning) {
            warning = document.createElement("p");
            warning.id = "reportDataWarning";
            warning.className = "uk-text-meta uk-margin-small";
            warning.setAttribute("role", "status");
            reportsPage.insertBefore(warning, reportsPage.firstChild);
        }
        var missing = [];
        if (!state.reservations) missing.push("reservation");
        if (!state.rooms) missing.push("room");
        var unsaved = window.ASHURE_UTILS.isStoredRecordsUnsaved("ashure_reservations") ||
            window.ASHURE_UTILS.isStoredRecordsUnsaved("ashure_rooms");
        warning.textContent = (missing.length ? "Unavailable " + missing.join(" and ") +
            " data: affected values are unknown and PDF export is blocked. " : "") +
            (unsaved ? "Reports reflect unsaved in-memory changes; saved records may differ after refresh." : "");
        warning.hidden = !warning.textContent;
    }

    function showUnavailable(container) {
        if (container) {
            container.classList.remove("chart-container--single");
            container.textContent = "Data unavailable";
        }
    }

    function canExportReport() {
        var state = reportDataState();
        if (state.reservations && state.rooms) return true;
        updateReportSummary();
        window.alert("PDF export is unavailable because " +
            (!state.reservations && !state.rooms ? "reservation and room data are" : !state.reservations ? "reservation data is" : "room data is") +
            " unavailable. Existing records have not been changed.");
        return false;
    }

    function updateReportSummary() {
        if (!reportsPage) return;

        var state = reportDataState();
        updateDataWarning(state);
        var filteredReservations = getFilteredReservations();
        var rooms = state.rooms ? window.ASHURE_APP.rooms : [];

        var statCards = reportsPage.querySelectorAll(".stat-card");
        var valueEls = {};
        for (var i = 0; i < statCards.length; i++) {
            var label = statCards[i].querySelector(".stat-card__label");
            if (label) {
                valueEls[label.textContent.trim()] = statCards[i].querySelector(".stat-card__value");
            }
        }

        // Total Reservations
        var totalReservations = filteredReservations.length;
        if (valueEls["Total Reservations"]) {
            valueEls["Total Reservations"].textContent = totalReservations.toLocaleString("en-US");
        }

        // Total Revenue
        var totalRevenue = 0;
        for (var r = 0; r < filteredReservations.length; r++) {
            var res = filteredReservations[r];
            var checkIn = new Date(res.checkIn + "T00:00:00");
            var checkOut = new Date(res.checkOut + "T00:00:00");
            var nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
            if (nights > 0) {
                var room = rooms.find(function (rm) { return rm.roomNumber === res.roomNumber; });
                var price = room ? room.price : 0;
                totalRevenue += nights * price;
            }
        }
        if (valueEls["Total Revenue"]) {
            valueEls["Total Revenue"].textContent = window.ASHURE_UTILS.formatCurrency(totalRevenue);
        }

        // Occupancy Rate
        var totalRooms = rooms.length;
        var occupiedRooms = 0;
        for (var o = 0; o < rooms.length; o++) {
            if (rooms[o].status === "occupied") occupiedRooms++;
        }
        var occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        if (valueEls["Occupancy Rate"]) {
            valueEls["Occupancy Rate"].textContent = occupancyRate + "%";
        }

        // Average Stay
        var totalNights = 0;
        var validCount = 0;
        for (var s = 0; s < filteredReservations.length; s++) {
            var stay = filteredReservations[s];
            var stayCheckIn = new Date(stay.checkIn + "T00:00:00");
            var stayCheckOut = new Date(stay.checkOut + "T00:00:00");
            var stayNights = (stayCheckOut - stayCheckIn) / (1000 * 60 * 60 * 24);
            if (stayNights > 0) {
                totalNights += stayNights;
                validCount++;
            }
        }
        var averageStay = validCount > 0 ? (totalNights / validCount) : 0;
        if (valueEls["Average Stay"]) {
            valueEls["Average Stay"].textContent = averageStay.toFixed(1) + " days";
        }

        if (!state.reservations) {
            if (valueEls["Total Reservations"]) valueEls["Total Reservations"].textContent = "Unavailable";
            if (valueEls["Average Stay"]) valueEls["Average Stay"].textContent = "Unavailable";
        }
        if (!state.reservations || !state.rooms) {
            if (valueEls["Total Revenue"]) valueEls["Total Revenue"].textContent = "Unavailable";
        }
        if (!state.rooms && valueEls["Occupancy Rate"]) valueEls["Occupancy Rate"].textContent = "Unavailable";
        refreshReports();
    }

    function refreshReports() {
        renderMonthlyPerformanceTable();
        renderMonthlyReservationsChart();
        renderMonthlyRevenueChart();
    }

    function getFilteredReservations() {
        if (!reportDataState().reservations) return [];
        var reservations = (window.ASHURE_APP && window.ASHURE_APP.reservations) || [];
        var dateRangeEl = reportsPage ? reportsPage.querySelector("#reportDateRange") : null;
        var dateRange = dateRangeEl ? dateRangeEl.value : "";

        if (!dateRange) return reservations;

        var now = new Date();
        var start, end;

        switch (dateRange) {
            case "today":
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case "week":
                var dayOfWeek = now.getDay();
                var diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                start = new Date(now);
                start.setDate(now.getDate() - diffToMonday);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(start.getDate() + 7);
                break;
            case "month":
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case "quarter":
                var quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
                start = new Date(now.getFullYear(), quarterStartMonth, 1);
                end = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
                break;
            case "year":
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear() + 1, 0, 1);
                break;
            default:
                return reservations;
        }

        return reservations.filter(function (res) {
            var checkIn = new Date(res.checkIn + "T00:00:00");
            return checkIn >= start && checkIn < end;
        });
    }

    function aggregateMonthlyData(reservations) {
        var rooms = reportDataState().rooms ? window.ASHURE_APP.rooms : [];
        var monthlyData = {};

        for (var i = 0; i < reservations.length; i++) {
            var res = reservations[i];
            var checkIn = new Date(res.checkIn + "T00:00:00");
            var checkOut = new Date(res.checkOut + "T00:00:00");
            var nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);

            if (nights <= 0) continue;

            var year = checkIn.getFullYear();
            var month = checkIn.getMonth();
            var monthKey = year + "-" + String(month + 1).padStart(2, "0");

            var room = rooms.find(function (rm) { return rm.roomNumber === res.roomNumber; });
            var price = room ? room.price : 0;
            var revenue = nights * price;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    reservations: 0,
                    revenue: 0,
                    totalNights: 0
                };
            }

            monthlyData[monthKey].reservations++;
            monthlyData[monthKey].revenue += revenue;
            monthlyData[monthKey].totalNights += nights;
        }

        return { keys: Object.keys(monthlyData).sort(), data: monthlyData };
    }

    function formatOccupancy(value) {
        return '<span class="occupancy-bar-wrap">' +
            '<span class="occupancy-bar"><span class="occupancy-bar__fill" style="width:' + value + '%;"></span></span>' +
            '<span class="occupancy-bar__text">' + value + '%</span>' +
            '</span>';
    }

    function formatGrowth(value) {
        var rounded = Math.round(value * 10) / 10;
        var sign = rounded > 0 ? "+" : "";
        var text = sign + rounded + "%";
        return text.replace(".0%", "%");
    }

    function formatGrowthBadge(value) {
        var rounded = Math.round(value * 10) / 10;
        var sign = rounded > 0 ? "+" : "";
        var text = sign + rounded + "%";
        text = text.replace(".0%", "%");

        var icon = "";
        var badgeClass = "";
        if (value > 0) {
            icon = "🟢 ▲ ";
            badgeClass = "growth-badge--positive";
        } else if (value < 0) {
            icon = "🔴 ▼ ";
            badgeClass = "growth-badge--negative";
        } else {
            icon = "⚪ ";
            badgeClass = "growth-badge--neutral";
        }

        return '<span class="growth-badge ' + badgeClass + '"><span class="growth-badge__icon">' + icon + '</span>' + text + '</span>';
    }

    function renderMonthlyPerformanceTable() {
        if (!reportsPage) return;

        var state = reportDataState();
        var rooms = state.rooms ? window.ASHURE_APP.rooms : [];

        var tbody = reportsPage.querySelector(".reports-table-card .table tbody");
        if (!tbody) return;
        if (!state.reservations) {
            tbody.innerHTML = '<tr><td colspan="6">Reservation data unavailable</td></tr>';
            return;
        }

        var filteredReservations = getFilteredReservations();
        var aggregated = aggregateMonthlyData(filteredReservations);
        var keys = aggregated.keys;
        var monthlyData = aggregated.data;

        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--color-text-muted); padding: 24px;">No data available</td></tr>';
            return;
        }

        var rows = [];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var data = monthlyData[key];
            var parts = key.split("-");
            var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
            var monthName = date.toLocaleString("en-US", { month: "long", year: "numeric" });
            var daysInMonth = new Date(parseInt(parts[0]), parseInt(parts[1]), 0).getDate();
            var occupancyRate = rooms.length > 0
                ? Math.round((data.totalNights / (rooms.length * daysInMonth)) * 100)
                : 0;
            var avgStay = data.reservations > 0 ? (data.totalNights / data.reservations) : 0;

            var growthHtml;
            if (k === 0) {
                growthHtml = '<span class="growth-badge growth-badge--first"><span class="growth-badge__icon">⚪ —</span></span>';
            } else {
                var prevKey = keys[k - 1];
                var prevRevenue = monthlyData[prevKey].revenue;
                var growth = prevRevenue > 0 ? ((data.revenue - prevRevenue) / prevRevenue) * 100 : 0;
                growthHtml = formatGrowthBadge(growth);
            }

            rows.push(
                '<tr>' +
                '<td>' + monthName + '</td>' +
                '<td>' + data.reservations + '</td>' +
                '<td>' + (state.rooms ? window.ASHURE_UTILS.formatCurrency(data.revenue) : "Unavailable") + '</td>' +
                '<td>' + (state.rooms ? formatOccupancy(occupancyRate) : "Unavailable") + '</td>' +
                '<td>' + avgStay.toFixed(1) + ' days</td>' +
                '<td>' + (state.rooms ? growthHtml : "Unavailable") + '</td>' +
                '</tr>'
            );
        }

        tbody.innerHTML = rows.join("");
    }

    function renderMonthlyReservationsChart() {
        var chartContainer = reportsPage.querySelector(".chart-card .chart-container");
        if (!chartContainer) return;
        if (!reportDataState().reservations) {
            showUnavailable(chartContainer);
            return;
        }

        var filteredReservations = getFilteredReservations();
        var aggregated = aggregateMonthlyData(filteredReservations);
        var keys = aggregated.keys;
        var monthlyData = aggregated.data;

        if (keys.length === 0) {
            chartContainer.classList.remove("chart-container--single");
            chartContainer.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);">No data available</div>';
            return;
        }

        var maxVal = 0;
        for (var i = 0; i < keys.length; i++) {
            if (monthlyData[keys[i]].reservations > maxVal) {
                maxVal = monthlyData[keys[i]].reservations;
            }
        }

        var isSingle = keys.length === 1;
        if (isSingle) {
            chartContainer.classList.add("chart-container--single");
            var singleData = monthlyData[keys[0]];
            var singleParts = keys[0].split("-");
            var singleDate = new Date(parseInt(singleParts[0]), parseInt(singleParts[1]) - 1, 1);
            var singleMonth = singleDate.toLocaleString("en-US", { month: "short" });
            var singleHeight = maxVal > 0 ? Math.round((singleData.reservations / maxVal) * 100) : 0;
            chartContainer.innerHTML =
                '<div class="chart-single-bar">' +
                '<span class="chart-single-value">' + singleData.reservations + '</span>' +
                '<div class="chart-bar chart-bar--single" style="height:' + singleHeight + '%;"></div>' +
                '<span class="chart-single-label">' + singleMonth + '</span>' +
                '</div>';
        } else {
            chartContainer.classList.remove("chart-container--single");
            var tickCount = 4;
            var tickStep = maxVal > 0 ? Math.ceil(maxVal / tickCount / 10) * 10 : 10;
            if (tickStep < 10) tickStep = 10;
            var yMax = tickStep * tickCount;
            while (yMax < maxVal) yMax += tickStep;

            var gridLines = "";
            var yLabels = "";
            for (var t = 0; t <= tickCount; t++) {
                var tickVal = t * tickStep;
                var yPercent = yMax > 0 ? (tickVal / yMax) * 100 : 0;
                gridLines += '<div class="chart-grid-line" style="bottom:' + yPercent + '%;"><span class="chart-grid-label">' + tickVal + '</span></div>';
            }

            var bars = [];
            var barCount = keys.length;
            var barGap = 24;
            var barWidth = barCount <= 6 ? 56 : Math.max(32, Math.floor((chartContainer.clientWidth - (barCount + 1) * barGap) / barCount));
            barWidth = Math.min(barWidth, 64);
            var actualGap = Math.max(barGap, Math.floor((chartContainer.clientWidth - barCount * barWidth) / (barCount + 1)));

            for (var k = 0; k < keys.length; k++) {
                var key = keys[k];
                var data = monthlyData[key];
                var parts = key.split("-");
                var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                var monthLabel = date.toLocaleString("en-US", { month: "short" });
                var heightPercent = maxVal > 0 ? Math.round((data.reservations / maxVal) * 100) : 0;

                bars.push(
                    '<div class="chart-bar-wrap" style="width:' + barWidth + 'px; margin: 0 ' + (actualGap / 2) + 'px;">' +
                    '<span class="chart-bar-value">' + data.reservations + '</span>' +
                    '<div class="chart-bar chart-bar--animated" style="height:' + heightPercent + '%;" data-month="' + monthLabel + '" data-value="' + data.reservations + '"></div>' +
                    '<span class="chart-bar-label">' + monthLabel + '</span>' +
                    '</div>'
                );
            }

            chartContainer.innerHTML =
                '<div class="chart-grid">' + gridLines + '</div>' +
                '<div class="chart-bars-row">' + bars.join("") + '</div>';
        }
    }

    function renderMonthlyRevenueChart() {
        var chartContainer = reportsPage.querySelector(".chart-container--line");
        if (!chartContainer) return;
        var state = reportDataState();
        if (!state.reservations || !state.rooms) {
            showUnavailable(chartContainer);
            return;
        }

        var filteredReservations = getFilteredReservations();
        var aggregated = aggregateMonthlyData(filteredReservations);
        var keys = aggregated.keys;
        var monthlyData = aggregated.data;

        if (keys.length === 0) {
            chartContainer.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);">No data available</div>';
            return;
        }

        var isSingle = keys.length === 1;
        if (isSingle) {
            chartContainer.classList.add("chart-container--single");
            var singleData = monthlyData[keys[0]];
            var singleParts = keys[0].split("-");
            var singleDate = new Date(parseInt(singleParts[0]), parseInt(singleParts[1]) - 1, 1);
            var singleMonth = singleDate.toLocaleString("en-US", { month: "long", year: "numeric" });
            chartContainer.innerHTML =
                '<div class="chart-single-revenue">' +
                '<div class="chart-single-point"></div>' +
                '<span class="chart-single-value">' + window.ASHURE_UTILS.formatCurrency(singleData.revenue) + '</span>' +
                '<span class="chart-single-label">' + singleMonth + '</span>' +
                '</div>';
        } else {
            chartContainer.classList.remove("chart-container--single");
            var svgWidth = 440;
            var svgHeight = 240;
            var pad = { top: 30, right: 20, bottom: 30, left: 65 };
            var chartW = svgWidth - pad.left - pad.right;
            var chartH = svgHeight - pad.top - pad.bottom;

        var maxRevenue = 0;
        for (var i = 0; i < keys.length; i++) {
            if (monthlyData[keys[i]].revenue > maxRevenue) {
                maxRevenue = monthlyData[keys[i]].revenue;
            }
        }

        var tickCount = 4;
        var tickStep = maxRevenue > 0 ? Math.ceil(maxRevenue / tickCount / 1000) * 1000 : 1000;
        if (tickStep < 1000) tickStep = 1000;
        var yMax = tickStep * tickCount;
        while (yMax < maxRevenue) yMax += tickStep;

        var gridLines = "";
        var yLabels = "";
        for (var t = 0; t <= tickCount; t++) {
            var tickVal = t * tickStep;
            var y = pad.top + chartH - (yMax > 0 ? (tickVal / yMax) * chartH : 0);
            gridLines += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (pad.left + chartW) + '" y2="' + y + '" class="chart-grid-line"/>';
            var label;
            if (tickVal >= 1000000) {
                label = "₱" + (tickVal / 1000000).toFixed(1) + "M";
            } else if (tickVal >= 1000) {
                label = "₱" + (tickVal / 1000).toFixed(1) + "K";
            } else {
                label = "₱" + tickVal;
            }
            yLabels += '<text x="' + (pad.left - 10) + '" y="' + (y + 4) + '" text-anchor="end" class="chart-y-label">' + label + '</text>';
        }

        var points = [];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var data = monthlyData[key];
            var x = pad.left + (keys.length === 1 ? chartW / 2 : (k / (keys.length - 1)) * chartW);
            var y = pad.top + chartH - (yMax > 0 ? (data.revenue / yMax) * chartH : 0);
            points.push({ x: x, y: y, revenue: data.revenue });
        }

        var linePath = "M" + points[0].x + "," + points[0].y;
        var areaPath = "M" + points[0].x + "," + points[0].y;
        for (var p = 1; p < points.length; p++) {
            var cpx = (points[p - 1].x + points[p].x) / 2;
            linePath += " Q" + cpx + "," + points[p - 1].y + " " + points[p].x + "," + points[p].y;
            areaPath += " Q" + cpx + "," + points[p - 1].y + " " + points[p].x + "," + points[p].y;
        }
        areaPath += " L" + points[points.length - 1].x + "," + (pad.top + chartH);
        areaPath += " L" + points[0].x + "," + (pad.top + chartH);
        areaPath += " Z";

        var circles = "";
        for (var c = 0; c < points.length; c++) {
            var rev = points[c].revenue;
            circles += '<circle cx="' + points[c].x + '" cy="' + points[c].y + '" r="5" fill="var(--color-white)" stroke="var(--color-primary)" stroke-width="2.5" class="chart-point-ring" style="animation-delay:' + (0.5 + c * 0.12) + 's" data-value="' + window.ASHURE_UTILS.formatCurrency(rev) + '"/>';
            circles += '<circle cx="' + points[c].x + '" cy="' + points[c].y + '" r="3" fill="var(--color-primary)" class="chart-point" style="animation-delay:' + (0.5 + c * 0.12) + 's" data-value="' + window.ASHURE_UTILS.formatCurrency(rev) + '"/>';
        }

        var labels = "";
        for (var l = 0; l < keys.length; l++) {
            var parts = keys[l].split("-");
            var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
            var monthLabel = date.toLocaleString("en-US", { month: "short" });
            labels += "<span>" + monthLabel + "</span>";
        }

        chartContainer.innerHTML =
            '<svg class="chart-line" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" preserveAspectRatio="none">' +
            '<defs>' +
            '<linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.15"/>' +
            '<stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>' +
            '</linearGradient>' +
            '</defs>' +
            gridLines +
            yLabels +
            '<path d="' + areaPath + '" fill="url(#lineGradient)" class="chart-area"/>' +
            '<path d="' + linePath + '" fill="none" stroke="var(--color-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="chart-line-path"/>' +
            circles +
            '</svg>' +
            '<div class="chart-line-labels">' + labels + '</div>';
        }
    }

    function updateReportTypeFilter() {
        if (!reportsPage) return;

        var reportTypeEl = reportsPage.querySelector("#reportType");
        var type = reportTypeEl ? reportTypeEl.value : "";

        var statsGrid = reportsPage.querySelector(".stats-grid");
        var tableCard = reportsPage.querySelector(".reports-table-card");
        var chartsContainer = reportsPage.querySelector(".reports-charts");

        if (!statsGrid || !tableCard || !chartsContainer) return;

        statsGrid.style.display = "";
        tableCard.style.display = "";
        chartsContainer.style.display = "";

        var statCards = statsGrid.querySelectorAll(".stat-card");
        for (var i = 0; i < statCards.length; i++) {
            statCards[i].style.display = "";
        }

        var chartCards = chartsContainer.querySelectorAll(".chart-card");
        for (var i = 0; i < chartCards.length; i++) {
            chartCards[i].style.display = "";
        }

        if (type === "reservations") {
            for (var i = 0; i < statCards.length; i++) {
                var label = statCards[i].querySelector(".stat-card__label");
                if (label && label.textContent.trim() !== "Total Reservations") {
                    statCards[i].style.display = "none";
                }
            }
            for (var i = 0; i < chartCards.length; i++) {
                var title = chartCards[i].querySelector(".card__title");
                if (title && title.textContent.trim() !== "Monthly Reservations") {
                    chartCards[i].style.display = "none";
                }
            }
        } else if (type === "revenue") {
            for (var i = 0; i < statCards.length; i++) {
                var label = statCards[i].querySelector(".stat-card__label");
                if (label && label.textContent.trim() !== "Total Revenue") {
                    statCards[i].style.display = "none";
                }
            }
            for (var i = 0; i < chartCards.length; i++) {
                var title = chartCards[i].querySelector(".card__title");
                if (title && title.textContent.trim() !== "Monthly Revenue") {
                    chartCards[i].style.display = "none";
                }
            }
        } else if (type === "occupancy") {
            for (var i = 0; i < statCards.length; i++) {
                var label = statCards[i].querySelector(".stat-card__label");
                if (label && label.textContent.trim() !== "Occupancy Rate") {
                    statCards[i].style.display = "none";
                }
            }
            chartsContainer.style.display = "none";
        } else if (type === "guests") {
            chartsContainer.style.display = "none";
            tableCard.style.display = "none";
        }
    }

    function loadJsPDF(callback) {
        if (window.jspdf && window.jspdf.jsPDF) {
            callback();
            return;
        }
        var script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = callback;
        script.onerror = function () {
            if (callback && typeof callback === "function") {
                callback();
            }
        };
        document.head.appendChild(script);
    }

    function stripHtml(html) {
        var div = document.createElement("div");
        div.innerHTML = html;
        return div.textContent || div.innerText || "";
    }

    function exportReportPDF() {
        if (!reportsPage) return;
        if (!canExportReport()) return;

        var btn = reportsPage.querySelector("#btnExportPDF");
        if (btn) btn.disabled = true;

        loadJsPDF(function () {
            try {
                if (!canExportReport()) return;
                updateReportSummary();
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    if (btn) btn.disabled = false;
                    return;
                }

                var doc = new window.jspdf.jsPDF();
                var pageWidth = doc.internal.pageSize.getWidth();
                var margin = 14;
                var contentWidth = pageWidth - margin * 2;
                var y = 22;

                var titleEl = reportsPage.querySelector(".page-header__title");
                var title = titleEl ? titleEl.textContent.trim() : "Reports & Analytics";

                var dateRangeEl = reportsPage.querySelector("#reportDateRange");
                var dateRangeText = dateRangeEl && dateRangeEl.options && dateRangeEl.selectedIndex >= 0
                    ? dateRangeEl.options[dateRangeEl.selectedIndex].text
                    : "All Time";

                var reportTypeEl = reportsPage.querySelector("#reportType");
                var reportTypeText = reportTypeEl && reportTypeEl.options && reportTypeEl.selectedIndex >= 0
                    ? reportTypeEl.options[reportTypeEl.selectedIndex].text
                    : "All Reports";

                doc.setFontSize(18);
                doc.setTextColor(30, 41, 59);
                doc.text(title, margin, y);
                y += 10;

                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text("Date Range: " + dateRangeText, margin, y);
                y += 6;
                doc.text("Report Type: " + reportTypeText, margin, y);
                y += 6;
                if (window.ASHURE_UTILS.isStoredRecordsUnsaved("ashure_reservations") ||
                    window.ASHURE_UTILS.isStoredRecordsUnsaved("ashure_rooms")) {
                    doc.text("Unsaved in-memory data; persisted records may differ.", margin, y);
                    y += 6;
                }
                doc.setDrawColor(226, 232, 240);
                doc.line(margin, y, pageWidth - margin, y);
                y += 8;

                var filteredReservations = getFilteredReservations();

                if (filteredReservations.length === 0) {
                    doc.setFontSize(11);
                    doc.setTextColor(100, 116, 139);
                    doc.text("No data available", margin, y);
                } else {
                    var statsGrid = reportsPage.querySelector(".stats-grid");
                    if (statsGrid && statsGrid.style.display !== "none") {
                        doc.setFontSize(13);
                        doc.setTextColor(30, 41, 59);
                        doc.text("Summary", margin, y);
                        y += 8;

                        var statCards = statsGrid.querySelectorAll(".stat-card");
                        for (var i = 0; i < statCards.length; i++) {
                            if (statCards[i].style.display === "none") continue;
                            var label = statCards[i].querySelector(".stat-card__label");
                            var value = statCards[i].querySelector(".stat-card__value");
                            var labelText = label ? label.textContent.trim() : "";
                            var valueText = value ? value.textContent.trim() : "";
                            if (labelText && valueText) {
                                doc.setFontSize(10);
                                doc.setTextColor(51, 65, 85);
                                doc.text(labelText + ": " + valueText, margin, y);
                                y += 7;
                            }
                        }
                        y += 6;
                    }

                    var tableCard = reportsPage.querySelector(".reports-table-card");
                    if (tableCard && tableCard.style.display !== "none") {
                        var tbody = tableCard.querySelector(".table tbody");
                        var hasNoData = false;
                        if (tbody) {
                            var rows = tbody.querySelectorAll("tr");
                            if (rows.length === 1) {
                                var cellText = (rows[0].querySelector("td") || {}).textContent || "";
                                if (/No data available/i.test(cellText)) {
                                    hasNoData = true;
                                }
                            }
                        }

                        if (hasNoData) {
                            if (y > 260) { doc.addPage(); y = 22; }
                            doc.setFontSize(10);
                            doc.setTextColor(100, 116, 139);
                            doc.text("Monthly Performance Summary", margin, y);
                            y += 7;
                            doc.text("No data available", margin, y);
                        } else if (tbody) {
                            var headers = tableCard.querySelectorAll(".table thead th");
                            var colLabels = [];
                            var headerWidths = [];
                            for (var h = 0; h < headers.length; h++) {
                                colLabels.push(stripHtml(headers[h].textContent || headers[h].innerText || ""));
                            }
                            var colCount = colLabels.length;
                            var cellWidth = contentWidth / colCount;

                            if (y + 15 > 297) { doc.addPage(); y = 22; }
                            doc.setFontSize(13);
                            doc.setTextColor(30, 41, 59);
                            doc.text("Monthly Performance Summary", margin, y);
                            y += 8;

                            doc.setFontSize(8);
                            doc.setFillColor(241, 245, 249);
                            doc.rect(margin, y - 4, contentWidth, 7, "F");
                            doc.setTextColor(51, 65, 85);
                            for (var h = 0; h < colLabels.length; h++) {
                                doc.text(colLabels[h], margin + h * cellWidth + 1, y);
                            }
                            y += 7;

                            var dataRows = tbody.querySelectorAll("tr");
                            for (var r = 0; r < dataRows.length; r++) {
                                if (y > 280) { doc.addPage(); y = 22; }
                                var cells = dataRows[r].querySelectorAll("td");
                                doc.setTextColor(51, 65, 85);
                                for (var c = 0; c < cells.length && c < colCount; c++) {
                                    var raw = cells[c].innerHTML || "";
                                    var txt = stripHtml(raw);
                                    doc.text(txt, margin + c * cellWidth + 1, y);
                                }
                                y += 6;
                            }
                        }
                    }
                }

                doc.save("report.pdf");
            } catch (e) {
                console.error("PDF export failed:", e);
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    }

    function initReports() {
        if (reportsPage) {
            reportsPage.style.display = "none";
        }

        var dateRangeEl = reportsPage ? reportsPage.querySelector("#reportDateRange") : null;
        var reportTypeEl = reportsPage ? reportsPage.querySelector("#reportType") : null;
        var generateBtn = reportsPage ? reportsPage.querySelector("#btnGenerateReport") : null;
        var exportBtn = reportsPage ? reportsPage.querySelector("#btnExportPDF") : null;

        if (dateRangeEl) {
            dateRangeEl.addEventListener("change", function () {
                updateReportSummary();
            });
        }

        if (generateBtn) {
            generateBtn.addEventListener("click", function () {
                if (generateBtn.disabled) return;
                generateBtn.disabled = true;
                updateReportSummary();
                refreshReports();
                updateReportTypeFilter();
                generateBtn.disabled = false;
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener("click", exportReportPDF);
        }

        if (reportTypeEl) {
            reportTypeEl.addEventListener("change", function () {
                updateReportSummary();
                updateReportTypeFilter();
            });
        }

        updateReportSummary();
        updateReportTypeFilter();
    }

    document.addEventListener("ashure:data-changed", updateReportSummary);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initReports);
    } else {
        initReports();
    }
})();
