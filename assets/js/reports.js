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

    function calendarDay(value) {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        var year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8));
        var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return null;
        var date = new Date(0);
        date.setUTCFullYear(year, month - 1, day);
        return date.getTime() / 86400000;
    }

    function normalizedReportStatus(status) {
        return typeof status === "string" ? status.trim().toLowerCase() : "";
    }

    function isFinanciallyEligible(record) {
        return ["confirmed", "checked-in", "checked-out"].indexOf(normalizedReportStatus(record && record.status)) !== -1;
    }

    function snapshotCents(rate) {
        if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null;
        var cents = rate * 100, rounded = Math.round(cents);
        var tolerance = Math.min(0.000001, Number.EPSILON * Math.max(1, Math.abs(cents)) * 4);
        return Number.isSafeInteger(rounded) && rounded > 0 && Math.abs(cents - rounded) <= tolerance ? rounded : null;
    }

    function inspectReportRecord(record) {
        record = record || {};
        var start = calendarDay(record.checkIn), end = calendarDay(record.checkOut);
        var nights = start !== null && end !== null && end > start ? end - start : null;
        var rooms = reportDataState().rooms ? window.ASHURE_APP.rooms : [];
        var room = typeof record.roomNumber === "string" && record.roomNumber.trim()
            ? rooms.find(function (r) { return r && r.roomNumber === record.roomNumber; }) : null;
        var financialEligible = isFinanciallyEligible(record);
        var rateCents = snapshotCents(record.bookedRoomRate);
        var amountCents = financialEligible && nights !== null && rateCents !== null &&
            Number.isSafeInteger(rateCents * nights) ? rateCents * nights : null;
        var normalizedStatus = normalizedReportStatus(record.status);
        return { nights: nights, amount: amountCents === null ? null : amountCents / 100,
            amountCents: amountCents, financialEligible: financialEligible,
            missingSnapshot: !Object.prototype.hasOwnProperty.call(record, "bookedRoomRate"),
            invalidSnapshot: rateCents === null, missingRoom: !room,
            excludedLegacyStatus: !financialEligible && ["pending", "cancelled"].indexOf(normalizedStatus) === -1 };
    }

    function reportQualityMessage() {
        if (!reportDataState().reservations) return "";
        var records = getFilteredReservations(), affected = 0, dates = 0, financialDates = 0, missingRates = 0, invalidRates = 0, amounts = 0, missingRooms = 0, statuses = 0, knownCents = 0;
        records.forEach(function (record) {
            var info = inspectReportRecord(record);
            var invalidAmount = info.financialEligible && (info.amountCents === null || !Number.isSafeInteger(knownCents + info.amountCents));
            if (info.financialEligible && !invalidAmount) knownCents += info.amountCents;
            if (info.nights === null) dates++;
            if (info.financialEligible && info.nights === null) financialDates++;
            if (info.financialEligible && info.missingSnapshot) missingRates++;
            else if (info.financialEligible && info.invalidSnapshot) invalidRates++;
            else if (info.nights !== null && invalidAmount) amounts++;
            var missingRoom = reportDataState().rooms && info.missingRoom;
            if (missingRoom) missingRooms++;
            if (info.excludedLegacyStatus) statuses++;
            if (info.nights === null || invalidAmount || missingRoom || info.excludedLegacyStatus) affected++;
        });
        var utilization = scheduledRoomNightUtilization(records);
        var utilizationWarning = (utilization.missingRooms ? "Scheduled utilization: " + utilization.missingRooms + " unmatched room reference(s) excluded. " : "") +
            (utilization.invalidStays ? "Scheduled utilization: " + utilization.invalidStays + " invalid stay(s); identifiable months are incomplete. " : "") +
            (utilization.unassignedStays ? utilization.unassignedStays + " invalid stay(s) cannot be assigned to a month. " : "");
        if (!affected) return utilizationWarning;
        return "Data quality: " + affected + " reservation record(s) need review. " +
            (dates ? dates + " invalid stay(s) excluded from duration/monthly calculations. Unassignable check-in dates remain in the record count for review. " : "") +
            (financialDates ? financialDates + " eligible booking(s) with invalid stays; booking value estimates are incomplete. " : "") +
            (missingRates ? missingRates + " eligible booking(s) missing saved booking rates: Unknown amounts; estimates are incomplete. " : "") +
            (invalidRates ? invalidRates + " eligible booking(s) with invalid saved booking rates: Unknown amounts; estimates are incomplete. " : "") +
            (amounts ? amounts + " unsafe booking amount(s); estimates are incomplete. " : "") +
            (missingRooms ? missingRooms + " missing current room reference(s); valid saved rates remain usable. " : "") +
            (statuses ? statuses + " legacy completed or unknown status(es) excluded from financial values; retained in reservation counts and booked-stay metrics. " : "") + utilizationWarning;
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
            (unsaved ? "Reports reflect unsaved in-memory changes; saved records may differ after refresh. " : "") + reportQualityMessage();
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
        var totalCents = 0;
        var knownAmounts = 0, incompleteRevenue = false;
        for (var r = 0; r < filteredReservations.length; r++) {
            var info = inspectReportRecord(filteredReservations[r]);
            if (!info.financialEligible) continue;
            if (info.amountCents === null || !Number.isSafeInteger(totalCents + info.amountCents)) incompleteRevenue = true;
            else { totalCents += info.amountCents; knownAmounts++; }
        }
        totalRevenue = totalCents / 100;
        if (valueEls["Estimated Booking Value"]) {
            valueEls["Estimated Booking Value"].textContent = window.ASHURE_UTILS.formatCurrency(totalRevenue);
            if (incompleteRevenue) valueEls["Estimated Booking Value"].textContent =
                (knownAmounts ? window.ASHURE_UTILS.formatCurrency(totalRevenue) + " known subtotal" : "Unknown") + " (incomplete)";
        }

        // Occupancy Rate
        var totalRooms = rooms.length;
        var occupiedRooms = 0;
        for (var o = 0; o < rooms.length; o++) {
            if (rooms[o] && rooms[o].status === "occupied") occupiedRooms++;
        }
        var occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        if (valueEls["Current Operational Occupancy"]) {
            valueEls["Current Operational Occupancy"].textContent = occupancyRate + "%";
        }

        // Average Stay
        var totalNights = 0;
        var validCount = 0;
        for (var s = 0; s < filteredReservations.length; s++) {
            var stayNights = inspectReportRecord(filteredReservations[s]).nights;
            if (stayNights !== null) {
                totalNights += stayNights;
                validCount++;
            }
        }
        var averageStay = validCount > 0 ? (totalNights / validCount) : 0;
        if (valueEls["Average Booked Stay"]) {
            valueEls["Average Booked Stay"].textContent = averageStay.toFixed(1) + " days";
            if (validCount < filteredReservations.length) valueEls["Average Booked Stay"].textContent =
                validCount ? averageStay.toFixed(1) + " days (partial)" : "Unknown (invalid stays)";
        }

        if (!state.reservations) {
            if (valueEls["Total Reservations"]) valueEls["Total Reservations"].textContent = "Unavailable";
            if (valueEls["Average Booked Stay"]) valueEls["Average Booked Stay"].textContent = "Unavailable";
        }
        if (!state.reservations || !state.rooms) {
            if (valueEls["Estimated Booking Value"]) valueEls["Estimated Booking Value"].textContent = "Unavailable";
        }
        if (!state.rooms && valueEls["Current Operational Occupancy"]) valueEls["Current Operational Occupancy"].textContent = "Unavailable";
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
            if (!res || calendarDay(res.checkIn) === null) return true;
            var checkIn = new Date(res.checkIn + "T00:00:00");
            return checkIn >= start && checkIn < end;
        });
    }

    function aggregateMonthlyData(reservations) {
        var rooms = reportDataState().rooms ? window.ASHURE_APP.rooms : [];
        var monthlyData = {};

        for (var i = 0; i < reservations.length; i++) {
            var res = reservations[i];
            var info = inspectReportRecord(res);
            var nights = info.nights;
            // Invalid eligible stays still affect their identifiable financial month.
            if (nights === null && (!info.financialEligible || !res || calendarDay(res.checkIn) === null)) continue;
            var monthKey = res.checkIn.slice(0, 7);

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    reservations: 0,
                    revenue: 0,
                    revenueCents: 0,
                    totalNights: 0,
                    financialReservations: 0
                };
            }

            if (nights !== null) monthlyData[monthKey].reservations++;
            if (info.financialEligible) {
                monthlyData[monthKey].financialReservations++;
                if (info.amountCents === null || !Number.isSafeInteger(monthlyData[monthKey].revenueCents + info.amountCents)) monthlyData[monthKey].incompleteRevenue = true;
                else {
                    monthlyData[monthKey].revenueCents += info.amountCents;
                    monthlyData[monthKey].revenue = monthlyData[monthKey].revenueCents / 100;
                    monthlyData[monthKey].knownAmounts = (monthlyData[monthKey].knownAmounts || 0) + 1;
                }
            }
            if (nights !== null) monthlyData[monthKey].totalNights += nights;
        }

        return { keys: Object.keys(monthlyData).sort(), data: monthlyData };
    }

    // Calendar-day ordinals avoid local timezone/DST shifts. Merge room intervals
    // within each month instead of allocating an object for every booked night.
    function scheduledRoomNightUtilization(records) {
        var state = reportDataState();
        var rooms = state.rooms ? window.ASHURE_APP.rooms : [];
        var result = { months: {}, missingRooms: 0, invalidStays: 0, unassignedStays: 0 };
        function monthFor(day) { return new Date(day * 86400000).toISOString().slice(0, 7); }
        function bucket(key) {
            if (!result.months[key]) result.months[key] = { intervals: new Map(), nights: 0, incomplete: false };
            return result.months[key];
        }
        records.forEach(function (record) {
            if (!isFinanciallyEligible(record)) return;
            var start = calendarDay(record.checkIn), end = calendarDay(record.checkOut);
            var matched = rooms.some(function (room) { return room && room.roomNumber === record.roomNumber; });
            if (state.rooms && !matched) result.missingRooms++;
            if (start === null || end === null || end <= start) {
                result.invalidStays++;
                var identifiable = start !== null ? start : end;
                if (identifiable === null) result.unassignedStays++;
                else bucket(monthFor(identifiable)).incomplete = true;
                return;
            }
            if (!matched) return;
            while (start < end) {
                var key = monthFor(start);
                var boundary = new Date(start * 86400000);
                boundary.setUTCMonth(boundary.getUTCMonth() + 1, 1);
                var stop = Math.min(end, boundary.getTime() / 86400000);
                var month = bucket(key);
                if (!month.intervals.has(record.roomNumber)) month.intervals.set(record.roomNumber, []);
                month.intervals.get(record.roomNumber).push([start, stop]);
                start = stop;
            }
        });
        Object.keys(result.months).forEach(function (key) {
            var month = result.months[key];
            month.intervals.forEach(function (intervals) {
                intervals.sort(function (a, b) { return a[0] - b[0]; });
                var start = intervals[0][0], end = intervals[0][1];
                for (var i = 1; i < intervals.length; i++) {
                    if (intervals[i][0] <= end) end = Math.max(end, intervals[i][1]);
                    else { month.nights += end - start; start = intervals[i][0]; end = intervals[i][1]; }
                }
                month.nights += end - start;
            });
        });
        return result;
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
        var utilization = scheduledRoomNightUtilization(filteredReservations);
        var keys = Array.from(new Set(aggregated.keys.concat(Object.keys(utilization.months)))).sort();
        var monthlyData = aggregated.data;

        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--color-text-muted); padding: 24px;">No data available</td></tr>';
            return;
        }

        var rows = [];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var data = monthlyData[key] || { reservations: 0, revenue: 0, totalNights: 0, financialReservations: 0 };
            var parts = key.split("-");
            var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
            var monthName = date.toLocaleString("en-US", { month: "long", year: "numeric" });
            var daysInMonth = new Date(parseInt(parts[0]), parseInt(parts[1]), 0).getDate();
            var scheduled = utilization.months[key];
            var utilizationText = !state.rooms || !rooms.length ? "Unknown" :
                formatOccupancy(Math.round(((scheduled ? scheduled.nights : 0) / (rooms.length * daysInMonth)) * 100)) +
                (scheduled && scheduled.incomplete ? " (incomplete)" : "");
            var avgStay = data.reservations > 0 ? (data.totalNights / data.reservations) : 0;

            var growthHtml;
            var previousFinancialKeys = keys.slice(0, k).filter(function (month) { return monthlyData[month] && monthlyData[month].financialReservations > 0; });
            if (!data.financialReservations) {
                growthHtml = "Not applicable";
            } else if (!previousFinancialKeys.length) {
                growthHtml = '<span class="growth-badge growth-badge--first"><span class="growth-badge__icon">⚪ —</span></span>';
            } else {
                var prevKey = previousFinancialKeys[previousFinancialKeys.length - 1];
                var prevRevenue = monthlyData[prevKey].revenue;
                var growth = prevRevenue > 0 ? ((data.revenue - prevRevenue) / prevRevenue) * 100 : 0;
                growthHtml = data.incompleteRevenue || monthlyData[prevKey].incompleteRevenue || !Number.isFinite(growth)
                    ? "Unavailable (incomplete estimate)" : formatGrowthBadge(growth);
            }

            rows.push(
                '<tr>' +
                '<td>' + monthName + '</td>' +
                '<td>' + data.reservations + '</td>' +
                '<td>' + (state.rooms ? data.incompleteRevenue
                    ? (data.knownAmounts ? window.ASHURE_UTILS.formatCurrency(data.revenue) + " known subtotal" : "Unknown") + " (incomplete)"
                    : window.ASHURE_UTILS.formatCurrency(data.revenue) : "Unavailable") + '</td>' +
                '<td>' + utilizationText + '</td>' +
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
        var keys = aggregated.keys.filter(function (key) { return aggregated.data[key].financialReservations > 0; });
        var monthlyData = aggregated.data;

        if (filteredReservations.some(function (record) {
            var info = inspectReportRecord(record);
            return info.financialEligible && info.amount === null;
        }) ||
            keys.some(function (key) { return monthlyData[key].incompleteRevenue || monthlyData[key].revenue > Number.MAX_VALUE / 100; })) {
            chartContainer.classList.remove("chart-container--single");
            chartContainer.textContent = "Booking value chart incomplete; review data-quality warnings and monthly table.";
            return;
        }

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
                if (label && label.textContent.trim() !== "Estimated Booking Value") {
                    statCards[i].style.display = "none";
                }
            }
            for (var i = 0; i < chartCards.length; i++) {
                var title = chartCards[i].querySelector(".card__title");
                if (title && title.textContent.trim() !== "Monthly Estimated Booking Value") {
                    chartCards[i].style.display = "none";
                }
            }
        } else if (type === "occupancy") {
            for (var i = 0; i < statCards.length; i++) {
                var label = statCards[i].querySelector(".stat-card__label");
                if (label && label.textContent.trim() !== "Current Operational Occupancy") {
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
                var qualityMessage = reportQualityMessage();
                if (qualityMessage) {
                    doc.setFontSize(8);
                    var qualityLines = doc.splitTextToSize(qualityMessage, contentWidth);
                    doc.text(qualityLines, margin, y);
                    y += qualityLines.length * 4 + 4;
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
                                var meta = statCards[i].querySelector(".stat-card__meta");
                                if (meta && meta.textContent.trim()) {
                                    doc.setFontSize(8);
                                    var explanationLines = doc.splitTextToSize(meta.textContent.trim(), contentWidth);
                                    doc.text(explanationLines, margin, y);
                                    y += explanationLines.length * 4 + 2;
                                }
                            }
                        }
                        y += 6;
                    }

                    var tableCard = reportsPage.querySelector(".reports-table-card");
                    if (tableCard && tableCard.style.display !== "none") {
                        var explanation = reportsPage.querySelector("#reportMonthlyExplanation");
                        if (explanation) {
                            doc.setFontSize(8);
                            var monthlyLines = doc.splitTextToSize(explanation.textContent.trim(), contentWidth);
                            if (y + monthlyLines.length * 4 > 270) { doc.addPage(); y = 22; }
                            doc.text(monthlyLines, margin, y);
                            y += monthlyLines.length * 4 + 4;
                        }
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
                            for (var h = 0; h < headers.length; h++) {
                                colLabels.push(stripHtml(headers[h].textContent || headers[h].innerText || ""));
                            }
                            // PDF-only labels and widths; the browser table is unchanged.
                            if (colLabels.length === 6) colLabels[3] = "Scheduled Utilization";
                            var colCount = colLabels.length;
                            var proportions = colCount === 6 ? [0.15, 0.09, 0.23, 0.16, 0.13, 0.24] : colLabels.map(function () { return 1 / colCount; });
                            var widths = proportions.map(function (share) { return contentWidth * share; });
                            var offsets = [], columnX = margin, padding = 2;
                            widths.forEach(function (width) { offsets.push(columnX); columnX += width; });

                            if (y + 15 > 297) { doc.addPage(); y = 22; }
                            doc.setFontSize(13);
                            doc.setTextColor(30, 41, 59);
                            doc.text("Monthly Performance Summary", margin, y);
                            y += 8;

                            doc.setFontSize(8);
                            doc.setFillColor(241, 245, 249);
                            var wrappedHeaders = colLabels.map(function (label, column) { return doc.splitTextToSize(label, widths[column] - padding * 2); });
                            var headerHeight = Math.max.apply(null, wrappedHeaders.map(function (lines) { return lines.length * 4 + 3; }));
                            function drawMonthlyHeader() {
                                if (y + headerHeight > 280) { doc.addPage(); y = 22; }
                                doc.setFillColor(241, 245, 249);
                                doc.rect(margin, y - 4, contentWidth, headerHeight, "F");
                                doc.setTextColor(51, 65, 85);
                                for (var h = 0; h < colLabels.length; h++) {
                                    doc.text(wrappedHeaders[h], offsets[h] + padding, y);
                                }
                                y += headerHeight;
                            }
                            drawMonthlyHeader();

                            var dataRows = tbody.querySelectorAll("tr");
                            for (var r = 0; r < dataRows.length; r++) {
                                var cells = dataRows[r].querySelectorAll("td");
                                var wrappedCells = [];
                                for (var c = 0; c < cells.length && c < colCount; c++) {
                                    var cellText = stripHtml(cells[c].innerHTML || "");
                                    if (c === 5) {
                                        // Browser badges contain decorative Unicode icons; export only their textual value.
                                        var icon = cells[c].querySelector(".growth-badge__icon");
                                        if (icon) cellText = cellText.replace(icon.textContent || "", "").trim() || "-";
                                    }
                                    wrappedCells.push(doc.splitTextToSize(cellText, widths[c] - padding * 2));
                                }
                                var rowHeight = Math.max(6, Math.max.apply(null, wrappedCells.map(function (lines) { return lines.length * 4 + 2; })));
                                if (y + rowHeight > 280) { doc.addPage(); y = 22; drawMonthlyHeader(); }
                                doc.setTextColor(51, 65, 85);
                                for (var c = 0; c < cells.length && c < colCount; c++) {
                                    doc.text(wrappedCells[c], offsets[c] + padding, y);
                                }
                                y += rowHeight;
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
