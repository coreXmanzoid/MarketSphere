/* ==========================================================================
   MARKETSPHERE ADMIN — BRAND MANAGEMENT CONSOLE (list.js)
   Frontend-only interactivity for templates/admin_dashboard/catalog/brands/list.html.
   Vanilla JS, IIFE-scoped, no external libraries, no network calls.
   All data is local demo data; backend wiring happens in a later pass.

   Sections:
     1. Demo Data
     2. Bootstrap / DOM Cache
     3. Helpers (toast, ripple, loading state)
     4. Reveal on Scroll + Animated Counters
     5. Table Rendering
     6. Search / Filter / Sort / Chips
     7. Row Selection + Bulk Bar
     8. Row Dropdown Menus
     9. Table Sort (column headers)
    10. Brand Drawer (open/close/tabs)
    11. Drawer Edit Mode (Information)
    12. Toggle Switches (Visibility)
    13. SEO Character Counters + Preview
    14. Activity Timeline Filters
    15. Admin Notes
    16. Modals (generic open/close/confirm)
    17. Add Brand Modal Tabs
    18. Delete Brand (type-to-confirm)
    19. Document Preview Modal
    20. Import Dropzone
    21. Export Format Chips
    22. Chart Animations + Tooltips
    23. Header Dropdown
    24. Init
   ========================================================================== */

(function () {
    "use strict";

    var root = document.getElementById("bmPage");
    if (!root) return;
    var BRAND_API_URL = root.getAttribute("data-brand-api-url") || "";
    var BRAND_IMPORT_URL = root.getAttribute("data-brand-import-url") || "";
    var BRAND_EXPORT_URL = root.getAttribute("data-brand-export-url") || "";

    function csrfToken() {
        var match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
        var input = document.querySelector("input[name=csrfmiddlewaretoken]");
        return match ? decodeURIComponent(match[1]) : (input ? input.value : "");
    }
    function apiRequest(url, options) {
        options = options || {};
        options.headers = Object.assign({ "Accept": "application/json", "X-CSRFToken": csrfToken() }, options.headers || {});
        return fetch(url, options).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (payload) {
                if (!response.ok || payload.ok === false) throw new Error(payload.error || "Brand request failed.");
                return payload;
            });
        });
    }
    function brandApiUrl(id) { return BRAND_API_URL + (id ? String(id) + "/" : ""); }
    function reloadBrands() { window.location.reload(); }
    function submitBrand(url, formData, button, successMessage) {
        runWithLoadingState(button, function () {
            apiRequest(url, { method: "POST", body: formData }).then(function () {
                showToast(successMessage, "success");
                window.setTimeout(reloadBrands, 350);
            }).catch(function (error) { showToast(error.message, "danger"); });
        }, 150);
    }

    /* ================= 1. DEMO DATA ================= */
    var BRANDS = [];

    var NOTE_ID_COUNTER = 100;

    /* ================= 2. BOOTSTRAP / DOM CACHE ================= */
    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    var tableBody = qs("#bmBrandTableBody");
    var selectAllCheckbox = qs("#bmSelectAll");
    var bulkBar = qs("#bmBulkBar");
    var bulkCount = qs("#bmBulkCount");
    var emptyState = qs("#bmEmptyState");
    var tableWrap = qs(".bm-table-wrap");
    var searchInput = qs("#bmSearchInput");
    var statusFilter = qs("#bmStatusFilter");
    var verificationFilter = qs("#bmVerificationFilter");
    var featuredFilter = qs("#bmFeaturedFilter");
    var countryFilter = qs("#bmCountryFilter");
    var sortFilter = qs("#bmSortFilter");
    var chipsRow = qs("#bmChipsRow");

    var currentChip = "all";
    var selectedIds = new Set();

    /* ================= 3. HELPERS ================= */
    function escapeHtml(value) {
        var div = document.createElement("div");
        div.textContent = value == null ? "" : String(value);
        return div.innerHTML;
    }

    function formatCurrency(value) {
        if (value >= 1000000) return "Rs. " + (value / 1000000).toFixed(1) + "M";
        if (value >= 1000) return "Rs. " + (value / 1000).toFixed(0) + "K";
        return "Rs. " + value;
    }

    function formatDate(iso) {
        var d = new Date(String(iso).indexOf("T") !== -1 ? iso : iso + "T00:00:00");
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    function timeAgo(iso) {
        var d = new Date(iso + "T00:00:00");
        var diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (diffDays <= 0) return "Today";
        if (diffDays === 1) return "1 day ago";
        if (diffDays < 30) return diffDays + " days ago";
        var months = Math.floor(diffDays / 30);
        if (months < 12) return months + " month" + (months > 1 ? "s" : "") + " ago";
        var years = Math.floor(months / 12);
        return years + " year" + (years > 1 ? "s" : "") + " ago";
    }

    function showToast(message, type) {
        var container = qs("#bmToastContainer");
        if (!container || !message) return;

        var toastType = type || "info";
        var icons = {
            success: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"></path></svg>',
            danger: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"></circle><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"></line></svg>',
            info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };

        var toast = document.createElement("div");
        toast.className = "bm-toast bm-toast-" + toastType;
        toast.innerHTML = (icons[toastType] || icons.info) + '<span>' + message + '</span>';
        container.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add("is-leaving");
            window.setTimeout(function () { toast.remove(); }, 220);
        }, 4200);
    }
    window.bmShowToast = showToast;

    function attachRipple(el) {
        el.addEventListener("click", function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement("span");
            var size = Math.max(rect.width, rect.height);
            ripple.className = "bm-ripple";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
            var prevPosition = getComputedStyle(el).position;
            if (prevPosition === "static") el.style.position = "relative";
            el.style.overflow = el.style.overflow || "hidden";
            el.appendChild(ripple);
            window.requestAnimationFrame(function () {
                ripple.style.transition = "transform .5s ease, opacity .5s ease";
                ripple.style.transform = "scale(2.6)";
                ripple.style.opacity = "0";
            });
            window.setTimeout(function () { ripple.remove(); }, 520);
        });
    }
    function initRipples() {
        qsa(".bm-btn").forEach(attachRipple);
    }

    function runWithLoadingState(btn, callback, delay) {
        if (!btn || btn.classList.contains("is-loading")) return;
        var originalHTML = btn.innerHTML;
        btn.classList.add("is-loading");
        btn.disabled = true;
        if (!btn.querySelector(".bm-btn-label")) {
            btn.innerHTML = '<span class="bm-btn-label">' + btn.textContent.trim() + "</span>";
        }
        window.setTimeout(function () {
            btn.classList.remove("is-loading");
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            if (typeof callback === "function") callback();
        }, delay || 650);
    }

    /* ================= 4. REVEAL + COUNTERS ================= */
    function initReveal() {
        var items = qsa(".bm-reveal");
        if (!items.length) return;

        if (!("IntersectionObserver" in window)) {
            items.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        items.forEach(function (el, i) {
            el.style.transitionDelay = Math.min(i * 40, 240) + "ms";
            observer.observe(el);
        });
    }

    function initCounters() {
        var counters = qsa("[data-count-to]");
        if (!counters.length) return;

        function animate(el) {
            var target = parseFloat(el.getAttribute("data-count-to"));
            if (!isFinite(target)) return;
            var duration = 900;
            var start = null;

            function step(ts) {
                if (start === null) start = ts;
                var progress = Math.min((ts - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = Math.round(target * eased);
                el.textContent = current.toLocaleString("en-US");
                if (progress < 1) window.requestAnimationFrame(step);
                else el.textContent = target.toLocaleString("en-US");
            }
            window.requestAnimationFrame(step);
        }

        if (!("IntersectionObserver" in window)) {
            counters.forEach(animate);
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animate(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        counters.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 5. TABLE RENDERING ================= */
    function verificationBadge(v) {
        var map = {
            verified: '<span class="bm-badge c-success">Verified</span>',
            unverified: '<span class="bm-badge c-muted">Unverified</span>',
            pending: '<span class="bm-badge c-warning">Pending</span>',
            rejected: '<span class="bm-badge c-danger">Rejected</span>'
        };
        return map[v] || map.unverified;
    }

    function statusBadge(s) {
        return s === "active"
            ? '<span class="bm-badge c-success">Active</span>'
            : '<span class="bm-badge c-danger">Inactive</span>';
    }

    function renderRow(brand) {
        var tr = document.createElement("tr");
        tr.className = "bm-row";
        tr.dataset.id = brand.id;
        tr.dataset.name = brand.name.toLowerCase();
        tr.dataset.slug = brand.slug.toLowerCase();
        tr.dataset.country = brand.country.toLowerCase();
        tr.dataset.status = brand.status;
        tr.dataset.verification = brand.verification;
        tr.dataset.featured = brand.featured ? "1" : "0";
        tr.dataset.products = brand.products;
        tr.dataset.orders = brand.orders;
        tr.dataset.revenue = brand.revenue;
        tr.dataset.rating = brand.rating;
        tr.dataset.created = brand.created;

        tr.innerHTML =
            '<td data-label="" class="bm-col-checkbox">' +
            '<label class="bm-checkbox" onclick="event.stopPropagation();">' +
            '<input type="checkbox" class="bm-row-checkbox" data-id="' + brand.id + '" aria-label="Select ' + escapeHtml(brand.name) + '" />' +
            '<span class="bm-checkbox-box"></span>' +
            '</label>' +
            '</td>' +
            '<td data-label="" class="bm-col-logo"><span class="bm-logo-thumb">' + escapeHtml(brand.logo) + '</span></td>' +
            '<td data-label="Brand"><div class="bm-brand-cell"><span class="bm-brand-name">' + escapeHtml(brand.name) + '</span></div></td>' +
            '<td data-label="Slug"><span class="bm-brand-slug">/' + escapeHtml(brand.slug) + '</span></td>' +
            '<td data-label="Products"><span class="bm-count-value">' + brand.products + '</span></td>' +
            '<td data-label="Categories"><span class="bm-count-value">' + brand.categories + '</span></td>' +
            '<td data-label="Orders"><span class="bm-count-value">' + brand.orders.toLocaleString("en-US") + '</span></td>' +
            '<td data-label="Revenue"><span class="bm-count-value">' + formatCurrency(brand.revenue) + '</span></td>' +
            '<td data-label="Rating">' + (brand.rating > 0
                ? '<span class="bm-rating-inline"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="m12 2 2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.6 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2Z"></path></svg>' + brand.rating.toFixed(1) + '</span>'
                : '<span class="c-muted">&mdash;</span>') + '</td>' +
            '<td data-label="Verification">' + verificationBadge(brand.verification) + '</td>' +
            '<td data-label="Status">' + statusBadge(brand.status) + '</td>' +
            '<td data-label="Featured"><button type="button" class="bm-featured-star js-bm-toggle-featured' + (brand.featured ? ' is-featured' : '') + '" data-id="' + brand.id + '" aria-label="Toggle featured" onclick="event.stopPropagation();"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="m12 2 2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.6 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2Z"></path></svg></button></td>' +
            '<td data-label="Created">' + formatDate(brand.created) + '</td>' +
            '<td data-label="Updated">' + timeAgo(brand.updated) + '</td>' +
            '<td data-label="" class="bm-col-actions">' +
            '<div class="bm-dropdown">' +
            '<button type="button" class="bm-icon-btn js-bm-row-dropdown-trigger" data-id="' + brand.id + '" aria-haspopup="true" aria-expanded="false" aria-label="More actions for ' + escapeHtml(brand.name) + '" onclick="event.stopPropagation();">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="12" cy="19" r="1.2"></circle></svg>' +
            '</button>' +
            '<div class="bm-row-dropdown-menu" data-brand-id="' + brand.id + '">' +
            '<button type="button" class="bm-dropdown-item" data-row-action="view">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>View' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="edit">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"></path></svg>Edit' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="verify">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg>Verify' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="reject">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>Reject Verification' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="request-docs">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Request Documents' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="feature">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.6 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2Z"></path></svg>Feature' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="toggle-status">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"></line></svg>Activate / Deactivate' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="view-products">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"></path><path d="M3 8v8l9 5 9-5V8"></path></svg>View Products' +
            '</button>' +
            '<button type="button" class="bm-dropdown-item" data-row-action="export">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Export' +
            '</button>' +
            '<div class="bm-dropdown-divider"></div>' +
            '<button type="button" class="bm-dropdown-item is-danger" data-row-action="delete">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</td>';

        tr.addEventListener("click", function (e) {
            if (e.target.closest(".bm-dropdown") || e.target.closest(".bm-checkbox")) return;
            openDrawer(brand);
        });

        return tr;
    }

    function checkEmptyState() {
        var visibleRows = qsa(".bm-row", tableBody).filter(function (row) {
            return !row.classList.contains("bm-row-hidden");
        });
        var isEmpty = visibleRows.length === 0;
        if (tableWrap) tableWrap.classList.toggle("bm-hidden", isEmpty);
        if (emptyState) emptyState.classList.toggle("bm-hidden", !isEmpty);
    }

    function loadBrandsFromTable() {
        return qsa(".bm-row", tableBody).map(function (row) {
            return {
                id: row.dataset.id,
                name: (row.querySelector(".bm-brand-name") || {}).textContent || row.dataset.name,
                slug: row.dataset.slug,
                logo: (row.querySelector(".bm-logo-thumb") || {}).textContent || "",
                products: parseInt(row.dataset.products, 10) || 0,
                categories: parseInt((row.querySelector('[data-label="Categories"] .bm-count-value') || {}).textContent, 10) || 0,
                orders: parseInt(row.dataset.orders, 10) || 0,
                revenue: parseInt(row.dataset.revenue, 10) || 0,
                rating: parseFloat(row.dataset.rating) || 0,
                verification: row.dataset.verification,
                status: row.dataset.status,
                featured: row.dataset.featured === "1",
                country: row.dataset.country || "",
                created: row.dataset.created,
                updated: row.dataset.updated
            };
        });
    }

    function initBrandRows() {
        BRANDS = loadBrandsFromTable();
        if (!tableBody) return;
        tableBody.addEventListener("click", function (e) {
            if (e.target.closest(".bm-dropdown") || e.target.closest(".bm-checkbox")) return;
            var row = e.target.closest(".bm-row");
            if (!row) return;
            var brand = BRANDS.filter(function (item) { return String(item.id) === String(row.dataset.id); })[0];
            if (brand) openDrawer(brand);
        });
        checkEmptyState();
    }

    /* ================= 6. SEARCH / FILTER / SORT / CHIPS ================= */
    function applyFilters() {
        var query = (searchInput ? searchInput.value : "").trim().toLowerCase();
        var statusVal = statusFilter ? statusFilter.value : "";
        var verificationVal = verificationFilter ? verificationFilter.value : "";
        var featuredVal = featuredFilter ? featuredFilter.value : "";
        var countryVal = countryFilter ? countryFilter.value : "";

        qsa(".bm-row", tableBody).forEach(function (row) {
            var matchesSearch = !query ||
                row.dataset.name.indexOf(query) !== -1 ||
                row.dataset.slug.indexOf(query) !== -1 ||
                row.dataset.country.indexOf(query) !== -1;

            var matchesStatus = !statusVal || row.dataset.status === statusVal;
            var matchesVerification = !verificationVal || row.dataset.verification === verificationVal;
            var matchesFeatured = !featuredVal ||
                (featuredVal === "featured" && row.dataset.featured === "1") ||
                (featuredVal === "standard" && row.dataset.featured === "0");
            var matchesCountry = !countryVal || row.dataset.country === countryVal;

            var matchesChip = true;
            if (currentChip === "active") matchesChip = row.dataset.status === "active";
            else if (currentChip === "inactive") matchesChip = row.dataset.status === "inactive";
            else if (currentChip === "verified") matchesChip = row.dataset.verification === "verified";
            else if (currentChip === "unverified") matchesChip = row.dataset.verification === "unverified";
            else if (currentChip === "pending") matchesChip = row.dataset.verification === "pending";
            else if (currentChip === "featured") matchesChip = row.dataset.featured === "1";
            else if (currentChip === "no-products") matchesChip = parseInt(row.dataset.products, 10) === 0;

            var visible = matchesSearch && matchesStatus && matchesVerification && matchesFeatured && matchesCountry && matchesChip;
            row.classList.toggle("bm-row-hidden", !visible);
            if (!visible) {
                var cb = row.querySelector(".bm-row-checkbox");
                if (cb && cb.checked) {
                    cb.checked = false;
                    selectedIds.delete(row.dataset.id);
                }
            }
        });

        applySort();
        checkEmptyState();
        syncSelectionUI();
    }

    function applySort() {
        var sortVal = sortFilter ? sortFilter.value : "newest";
        var rows = qsa(".bm-row", tableBody);

        rows.sort(function (a, b) {
            if (sortVal === "name-az") return a.dataset.name.localeCompare(b.dataset.name);
            if (sortVal === "name-za") return b.dataset.name.localeCompare(a.dataset.name);
            if (sortVal === "most-products") return parseInt(b.dataset.products, 10) - parseInt(a.dataset.products, 10);
            if (sortVal === "highest-revenue") return parseInt(b.dataset.revenue, 10) - parseInt(a.dataset.revenue, 10);
            if (sortVal === "highest-rating") return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
            if (sortVal === "oldest") return new Date(a.dataset.created) - new Date(b.dataset.created);
            return new Date(b.dataset.created) - new Date(a.dataset.created); // newest default
        });

        rows.forEach(function (row) { tableBody.appendChild(row); });
    }

    function initSearchAndFilters() {
        var debounceTimer = null;
        if (searchInput) {
            searchInput.addEventListener("input", function () {
                window.clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(applyFilters, 200);
            });
        }
        [statusFilter, verificationFilter, featuredFilter, countryFilter, sortFilter].forEach(function (el) {
            if (el) el.addEventListener("change", applyFilters);
        });

        var resetBtn = qs("#bmResetFiltersBtn");
        var emptyResetBtn = qs("#bmEmptyResetBtn");
        function resetAll() {
            if (searchInput) searchInput.value = "";
            [statusFilter, verificationFilter, featuredFilter, countryFilter].forEach(function (el) { if (el) el.value = ""; });
            if (sortFilter) sortFilter.value = "newest";
            currentChip = "all";
            qsa(".bm-chip", chipsRow).forEach(function (chip) {
                chip.classList.toggle("is-active", chip.dataset.bmChip === "all");
            });
            applyFilters();
            showToast("Filters reset.", "info");
        }
        if (resetBtn) resetBtn.addEventListener("click", resetAll);
        if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetAll);

        var refreshBtn = qs("#bmRefreshBtn");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", function () {
                refreshBtn.style.transition = "transform 0.5s ease";
                refreshBtn.style.transform = "rotate(360deg)";
                window.setTimeout(function () { refreshBtn.style.transform = ""; }, 500);
                showToast("Brand list refreshed.", "success");
            });
        }

        if (chipsRow) {
            chipsRow.addEventListener("click", function (e) {
                var chip = e.target.closest(".bm-chip");
                if (!chip) return;
                qsa(".bm-chip", chipsRow).forEach(function (c) { c.classList.remove("is-active"); });
                chip.classList.add("is-active");
                currentChip = chip.dataset.bmChip;
                applyFilters();
            });
        }
    }

    /* ================= 7. ROW SELECTION + BULK BAR ================= */
    function getVisibleCheckboxes() {
        return qsa(".bm-row:not(.bm-row-hidden) .bm-row-checkbox", tableBody);
    }

    function syncSelectionUI() {
        var count = selectedIds.size;
        if (bulkCount) bulkCount.textContent = String(count);
        if (bulkBar) bulkBar.classList.toggle("bm-hidden", count === 0);

        qsa(".bm-row-checkbox", tableBody).forEach(function (cb) {
            cb.checked = selectedIds.has(cb.dataset.id);
            var row = cb.closest(".bm-row");
            if (row) row.classList.toggle("is-selected", cb.checked);
        });

        if (selectAllCheckbox) {
            var visible = getVisibleCheckboxes();
            var checkedVisible = visible.filter(function (cb) { return selectedIds.has(cb.dataset.id); });
            if (!visible.length || checkedVisible.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedVisible.length === visible.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    function initSelection() {
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener("change", function () {
                var isChecked = selectAllCheckbox.checked;
                getVisibleCheckboxes().forEach(function (cb) {
                    if (isChecked) selectedIds.add(cb.dataset.id);
                    else selectedIds.delete(cb.dataset.id);
                });
                syncSelectionUI();
            });
        }

        if (tableBody) {
            tableBody.addEventListener("change", function (e) {
                if (!e.target.classList.contains("bm-row-checkbox")) return;
                var id = e.target.dataset.id;
                if (e.target.checked) selectedIds.add(id);
                else selectedIds.delete(id);
                syncSelectionUI();
            });
        }

        var clearBtn = qs("#bmClearSelectionBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                selectedIds.clear();
                syncSelectionUI();
            });
        }

        qsa("[data-bulk-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var action = btn.dataset.bulkAction;
                var count = selectedIds.size;
                if (!count) return;

                var messages = {
                    activate: count + " brand(s) activated.",
                    deactivate: count + " brand(s) deactivated.",
                    verify: count + " brand(s) verified.",
                    feature: count + " brand(s) featured.",
                    hide: count + " brand(s) hidden from search.",
                    export: "Exporting " + count + " brand(s)&hellip;"
                };

                if (action === "delete") {
                    var modal = qs("#bmBulkDeleteModal");
                    var textEl = qs("#bmBulkDeleteModalText");
                    if (textEl) textEl.textContent = "This will permanently delete " + count + " selected brand(s). This cannot be undone.";
                    openModal("bmBulkDeleteModal");
                    var confirmBtn = qs("#bmBulkDeleteConfirmBtn");
                    if (confirmBtn) {
                        confirmBtn.onclick = function () {
                            var jobs = Array.from(selectedIds).map(function (id) { return apiRequest(brandApiUrl(id), { method: "DELETE" }); });
                            Promise.all(jobs).then(function () { closeModal(modal); showToast(count + " brand(s) deleted.", "danger"); reloadBrands(); }).catch(function (error) { showToast(error.message, "danger"); });
                        };
                    }
                    return;
                }

                showToast(messages[action] || "Action completed.", action === "hide" ? "info" : "success");
                selectedIds.clear();
                syncSelectionUI();
            });
        });
    }

    /* ================= 8. ROW DROPDOWN MENUS ================= */
    var activeRowMenu = null, activeRowPlaceholder = null, activeRowTrigger = null;

    function closeRowMenu() {
        if (!activeRowMenu) return;
        activeRowMenu.classList.remove("bm-open");
        if (activeRowPlaceholder) activeRowPlaceholder.appendChild(activeRowMenu);
        if (activeRowTrigger) activeRowTrigger.setAttribute("aria-expanded", "false");
        activeRowMenu = null;
        activeRowPlaceholder = null;
        activeRowTrigger = null;
    }

    function initRowDropdowns() {
        document.addEventListener("click", function (e) {
            var trigger = e.target.closest(".js-bm-row-dropdown-trigger");
            if (trigger) {
                e.stopPropagation();
                var dropdown = trigger.closest(".bm-dropdown");
                var menu = dropdown.querySelector(".bm-row-dropdown-menu");

                if (activeRowMenu === menu) { closeRowMenu(); return; }
                closeRowMenu();

                activeRowPlaceholder = dropdown;
                document.body.appendChild(menu);
                menu.classList.add("bm-open");

                var rect = trigger.getBoundingClientRect();
                var menuWidth = 220, menuHeight = menu.offsetHeight || 380;
                var gap = 6, padding = 12;
                var left = rect.right - menuWidth;
                var top = rect.bottom + gap;

                left = Math.max(padding, Math.min(left, window.innerWidth - menuWidth - padding));
                if (top + menuHeight > window.innerHeight - padding) top = rect.top - menuHeight - gap;
                top = Math.max(padding, top);

                menu.style.left = left + "px";
                menu.style.top = top + "px";

                activeRowTrigger = trigger;
                trigger.setAttribute("aria-expanded", "true");
                activeRowMenu = menu;
                return;
            }

            var actionItem = e.target.closest("[data-row-action]");
            if (actionItem) {
                var menuEl = actionItem.closest(".bm-row-dropdown-menu");
                var brandId = menuEl ? menuEl.dataset.brandId : null;
                var brand = BRANDS.filter(function (b) { return String(b.id) === String(brandId); })[0];
                handleRowAction(actionItem.dataset.rowAction, brand);
                closeRowMenu();
                return;
            }

            if (!e.target.closest(".bm-row-dropdown-menu")) closeRowMenu();
        });

        window.addEventListener("resize", closeRowMenu);
        window.addEventListener("scroll", closeRowMenu, true);
    }

    function handleRowAction(action, brand) {
        var name = brand ? brand.name : "this brand";

        if (action === "view" || action === "edit") {
            if (brand) openDrawer(brand);
            if (action === "edit") window.setTimeout(function () { activateDrawerTab("information"); toggleInfoEditMode(true); }, 260);
            return;
        }
        if (action === "verify") { openModal("bmVerifyModal"); return; }
        if (action === "reject") { openModal("bmRejectVerificationModal"); return; }
        if (action === "request-docs") { openModal("bmRequestDocsModal"); return; }
        if (action === "feature") {
            apiRequest(brandApiUrl(brand.id), { method: "POST", body: new URLSearchParams({ action: "toggle_featured" }) }).then(reloadBrands).catch(function (error) { showToast(error.message, "danger"); });
            return;
        }
        if (action === "toggle-status") {
            apiRequest(brandApiUrl(brand.id), { method: "POST", body: new URLSearchParams({ action: "toggle_active" }) }).then(reloadBrands).catch(function (error) { showToast(error.message, "danger"); });
            return;
        }
        if (action === "view-products") { showToast("Opening Product Management filtered by " + name + "&hellip;", "info"); return; }
        if (action === "export") { showToast("Use the Export button to download brands.", "info"); return; }
        if (action === "delete") { openModal("bmDeleteBrandModal"); return; }
    }

    /* ================= 9. TABLE SORT (COLUMN HEADERS) ================= */
    function initColumnSort() {
        var headers = qsa("th[data-sort]", root);
        headers.forEach(function (th) {
            th.addEventListener("click", function () {
                var key = th.dataset.sort;
                var isAsc = th.classList.contains("is-sorted-asc");
                headers.forEach(function (h) { h.classList.remove("is-sorted-asc", "is-sorted-desc"); });
                th.classList.add(isAsc ? "is-sorted-desc" : "is-sorted-asc");

                var rows = qsa(".bm-row", tableBody);
                var dir = isAsc ? -1 : 1;

                rows.sort(function (a, b) {
                    var av, bv;
                    if (key === "name") { av = a.dataset.name; bv = b.dataset.name; return dir * av.localeCompare(bv); }
                    if (key === "products") { av = parseInt(a.dataset.products, 10); bv = parseInt(b.dataset.products, 10); }
                    else if (key === "orders") { av = parseInt(a.dataset.orders, 10); bv = parseInt(b.dataset.orders, 10); }
                    else if (key === "revenue") { av = parseInt(a.dataset.revenue, 10); bv = parseInt(b.dataset.revenue, 10); }
                    else if (key === "rating") { av = parseFloat(a.dataset.rating); bv = parseFloat(b.dataset.rating); }
                    else if (key === "created") { av = new Date(a.dataset.created).getTime(); bv = new Date(b.dataset.created).getTime(); }
                    else { av = 0; bv = 0; }
                    return dir * (av - bv);
                });

                rows.forEach(function (row) { tableBody.appendChild(row); });
            });
        });
    }

    /* ================= FEATURED TOGGLE (inline star) ================= */
    function initFeaturedToggle() {
        document.addEventListener("click", function (e) {
            var star = e.target.closest(".js-bm-toggle-featured");
            if (!star) return;
            var isFeatured = star.classList.contains("is-featured");
            apiRequest(brandApiUrl(star.dataset.id), { method: "POST", body: new URLSearchParams({ action: isFeatured ? "unfeature" : "feature" }) })
                .then(function () { showToast(isFeatured ? "Removed from featured." : "Brand featured.", "success"); reloadBrands(); })
                .catch(function (error) { showToast(error.message, "danger"); });
        });
    }

    /* ================= 10. BRAND DRAWER ================= */
    var drawerOverlay = qs("#bmDrawerOverlay");
    var drawer = qs("#bmDrawer");
    var currentBrand = null;

    function openDrawer(brand) {
        currentBrand = brand;
        if (BRAND_API_URL) apiRequest(brandApiUrl(brand.id)).then(function (payload) {
            currentBrand = Object.assign(currentBrand, payload.brand || {});
            populateEditFields(currentBrand);
            populateDrawerDetails(currentBrand);
        }).catch(function () { });
        qs("#bmDrawerBrandName").textContent = brand.name;
        qs("#bmDrawerSlug").textContent = "/brands/" + brand.slug;
        qs("#bmDrawerLogo").textContent = brand.logo;

        var badgesEl = qs("#bmDrawerBadges");
        badgesEl.innerHTML = statusBadge(brand.status) + " " + verificationBadge(brand.verification) +
            (brand.featured ? ' <span class="bm-badge c-accent">Featured</span>' : "");

        qs("#bmQsProducts").textContent = brand.products.toLocaleString("en-US");
        qs("#bmQsOrders").textContent = brand.orders.toLocaleString("en-US");
        qs("#bmQsRevenue").textContent = formatCurrency(brand.revenue);
        qs("#bmQsRating").textContent = brand.rating > 0 ? brand.rating.toFixed(1) : "\u2014";
        qs("#bmQsCategories").textContent = brand.categories;
        populateEditFields(brand);

        activateDrawerTab("overview");

        drawerOverlay.classList.add("is-open");
        drawerOverlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function populateEditFields(brand) {
        var fields = { BrandName: "name", Slug: "slug", Website: "website", Country: "country_of_origin", Founded: "founded_year", Email: "official_email", Phone: "official_phone", Description: "description", DisplayOrder: "display_order", Facebook: "facebook", Instagram: "instagram", Linkedin: "linkedin" };
        Object.keys(fields).forEach(function (name) { var input = qs("#bmEdit" + name); if (input) input.value = brand[fields[name]] || ""; });
    }

    function populateDrawerDetails(brand) {
        qs("#bmQsProducts").textContent = (brand.products_count || 0).toLocaleString("en-US");
        qs("#bmQsOrders").textContent = (brand.orders || 0).toLocaleString("en-US");
        qs("#bmQsRevenue").textContent = formatCurrency(brand.revenue || 0);
        qs("#bmQsRating").textContent = "—";
        qs("#bmQsCategories").textContent = brand.categories_count || 0;
        var overview = brand.overview || {};
        function signed(value) { return value > 0 ? "+" + value + "%" : value + "%"; }
        var overviewValues = [brand.products_count || 0, brand.orders || 0, formatCurrency(brand.revenue || 0), overview.units_sold || 0, overview.categories || brand.categories_count || 0, overview.rating || "—", overview.reviews || "—", overview.return_rate || "—", overview.views || "—", overview.conversion_rate || "—"];
        qsa(".bm-overview-stat strong").forEach(function (el, index) { if (overviewValues[index] !== undefined) el.textContent = overviewValues[index]; });
        var overviewNotes = qsa(".bm-overview-stat small");
        ["+" + (overview.products_this_month || 0) + " this month", signed(overview.orders_change || 0) + " MoM", signed(overview.revenue_change || 0) + " MoM", "Current month", "Active listings", "No ratings recorded", "No reviews recorded", "No return data", "No view data", "No conversion data"].forEach(function (value, index) { if (overviewNotes[index]) overviewNotes[index].textContent = value; });
        var snapshot = qs("#bmOverviewBarChart"), weekly = brand.weekly_revenue || [];
        if (snapshot && weekly.length) { var maxWeekly = Math.max.apply(null, weekly.map(function (item) { return item.revenue; }).concat([1])); snapshot.innerHTML = weekly.map(function (item) { return '<span style="--bm-bar-h:' + Math.max(4, Math.round(item.revenue / maxWeekly * 100)) + '%"></span>'; }).join(""); var labels = snapshot.nextElementSibling; if (labels) labels.innerHTML = weekly.map(function (item) { return '<span>' + escapeHtml(item.label) + '</span>'; }).join(""); }
        var infoValues = qsa("#bmInfoDisplay .bm-info-value");
        var info = [brand.name, brand.slug, "—", brand.website || "—", brand.country_of_origin || "—", brand.founded_year || "—", brand.official_email || "—", brand.official_phone || "—", "—", "—", "—", brand.display_order || 0, brand.description || "—"];
        infoValues.forEach(function (el, index) { if (info[index] !== undefined) el.textContent = info[index]; });
        var website = infoValues[3] && infoValues[3].parentElement.querySelector("a");
        if (website) { website.textContent = brand.website || "—"; website.href = brand.website || "#"; }
        var socialValues = [brand.facebook, brand.instagram, brand.linkedin];
        qsa("#bmInfoDisplay .bm-social-chip").forEach(function (chip, index) { chip.textContent = socialValues[index] || "—"; });

        var productBody = qs('[data-bm-panel="products"] .bm-mini-table tbody');
        if (productBody) {
            productBody.innerHTML = (brand.products || []).slice(0, 10).map(function (product) {
                return '<tr><td><div class="bm-mini-product-cell"><span class="bm-mini-product-thumb">' + (product.image_url ? '<img src="' + escapeHtml(product.image_url) + '" alt="" />' : '—') + '</span><span class="bm-mini-product-name" onclick="window.open(\'/product/' + product.slug + '\', \'_blank\')">' + escapeHtml(product.name) + '</span></div></td><td>' + escapeHtml(product.sku) + '</td><td>' + escapeHtml(product.seller) + '</td><td>' + escapeHtml(product.category) + '</td><td>' + formatCurrency(product.price) + '</td><td>' + product.stock + '</td><td>' + product.orders + '</td><td>' + formatCurrency(product.revenue) + '</td><td><span class="bm-badge ' + (product.status === "published" ? "c-success" : "c-muted") + '">' + escapeHtml(product.status) + '</span></td><td></td></tr>';
            }).join("") || '<tr><td colspan="10" class="c-muted">No products assigned to this brand.</td></tr>';
        }
        var categoryList = qs("#bmCategoryList");
        if (categoryList) {
            var max = Math.max.apply(null, (brand.categories || []).map(function (item) { return item.products; }).concat([1]));
            categoryList.innerHTML = (brand.categories || []).map(function (category) {
                return '<div class="bm-category-row"><div class="bm-category-info"><strong>' + escapeHtml(category.name) + '</strong><div class="bm-category-bar"><span class="bm-category-bar-fill" style="--bm-pct:' + Math.round(category.products / max * 100) + '%"></span></div></div><span class="bm-category-value">' + category.products + ' products</span></div>';
            }).join("") || '<p class="c-muted">No categories assigned to this brand.</p>';
        }
        qsa('[data-bm-panel="visibility"] input[data-bm-toggle="active"]').forEach(function (input) { input.checked = !!brand.is_active; });
        qsa('[data-bm-panel="visibility"] input[data-bm-toggle="featured"]').forEach(function (input) { input.checked = !!brand.is_featured; });
        var orderInput = qs("#bmDisplayOrderInput"); if (orderInput) orderInput.value = brand.display_order || 0;
        var seoTitle = qs("#bmSeoTitle"), seoDesc = qs("#bmSeoDescription"), canonical = qs("#bmSeoCanonical");
        if (seoTitle) seoTitle.value = brand.name + " | MarketSphere";
        if (seoDesc) seoDesc.value = brand.description || "";
        if (canonical) canonical.value = window.location.origin + "/brands/" + brand.slug;
        var timeline = qs("#bmActivityTimeline");
        if (timeline && brand.activity && brand.activity.length) timeline.innerHTML = brand.activity.map(function (event) { return '<li class="bm-timeline-item" data-bm-type="' + escapeHtml(event.type) + '"><div class="bm-timeline-body"><div class="bm-timeline-top"><strong>' + escapeHtml(event.title) + '</strong></div><p>' + escapeHtml(event.description) + '</p><span class="bm-timeline-time">' + formatDate(event.time) + '</span></div></li>'; }).join("");
        // Verification, documents, and notes remain visible until their database models are implemented.
        var perfValues = qsa('[data-bm-panel="performance"] .bm-perf-card strong');
        if (perfValues.length) { perfValues[0].textContent = "—"; perfValues[1].textContent = brand.products_count || 0; perfValues[2].textContent = "—"; perfValues[3].textContent = "—"; perfValues[4].textContent = "—"; perfValues[5].textContent = "—"; perfValues[6].textContent = signed(overview.revenue_change || 0); perfValues[7].textContent = brand.top_category ? brand.top_category.name : "—"; perfValues[8].textContent = brand.latest_product ? brand.latest_product.name : "—"; perfValues[9].textContent = "—"; }
        var lineChart = qs("#bmRevenueLineChart"), lineSvg = lineChart && lineChart.querySelector("svg"), values = weekly.map(function (item) { return item.revenue; }), maxRevenue = Math.max.apply(null, values.concat([1]));
        if (lineSvg && weekly.length) { var points = weekly.map(function (item, index) { return { x: index * (560 / Math.max(weekly.length - 1, 1)), y: 170 - (item.revenue / maxRevenue * 140) }; }); var path = points.map(function (point, index) { return (index ? "L" : "M") + point.x + "," + point.y; }).join(" "); var area = path + " L560,190 L0,190 Z"; var pathEl = lineSvg.querySelector(".bm-line-chart-path"), areaEl = lineSvg.querySelector(".bm-line-chart-area"); if (pathEl) pathEl.setAttribute("d", path); if (areaEl) areaEl.setAttribute("d", area); qsa(".bm-line-chart-dot", lineSvg).forEach(function (dot, index) { if (!points[index]) { dot.style.display = "none"; return; } dot.style.display = ""; dot.setAttribute("cx", points[index].x); dot.setAttribute("cy", points[index].y); dot.dataset.value = formatCurrency(weekly[index].revenue); }); }
        var analytics = brand.analytics || {}, topProducts = analytics.top_products || [], topCategories = analytics.top_categories || [];
        var topLists = qsa('[data-bm-panel="analytics"] .bm-top-list');
        function renderTopList(items, isCategory) {
            var max = Math.max.apply(null, items.map(function (item) { return isCategory ? item.units_sold : item.units_sold; }).concat([1]));
            return items.map(function (item, index) { var value = isCategory ? item.units_sold + " units" : item.units_sold + " sold"; return '<div class="bm-top-list-row"><span class="bm-top-rank">' + (index + 1) + '</span><div class="bm-top-list-info"><strong>' + escapeHtml(item.name) + '</strong><div class="bm-top-list-bar"><span class="bm-top-list-bar-fill" style="width:' + Math.round((isCategory ? item.units_sold : item.units_sold) / max * 100) + '%"></span></div></div><span class="bm-top-list-value">' + value + '</span></div>'; }).join("") || '<p class="c-muted">No sales data available.</p>';
        }
        if (topLists[0]) topLists[0].innerHTML = renderTopList(topProducts, false);
        if (topLists[1]) topLists[1].innerHTML = renderTopList(topCategories, true);
        var monthly = analytics.monthly || [], monthlyMax = Math.max.apply(null, monthly.map(function (item) { return Math.max(item.orders, item.units); }).concat([1]));
        var growthChart = qs("#bmProductGrowthChart");
        if (growthChart && monthly.length) { growthChart.innerHTML = monthly.map(function (item) { return '<span style="--bm-bar-h:' + Math.max(4, Math.round(Math.max(item.orders, item.units) / monthlyMax * 100)) + '%"></span>'; }).join(""); var growthLabels = growthChart.nextElementSibling; if (growthLabels) growthLabels.innerHTML = monthly.map(function (item) { return '<span>' + escapeHtml(item.label) + '</span>'; }).join(""); }
        var kpis = qsa('[data-bm-panel="analytics"] .bm-kpi-card');
        if (kpis.length) { var last30 = (brand.overview || {}).orders_this_month || 0, units30 = (brand.overview || {}).units_sold || 0, avg = last30 ? (brand.overview.revenue_this_month / last30) : 0;[last30.toLocaleString("en-US"), units30.toLocaleString("en-US"), formatCurrency(avg), signed((brand.overview || {}).revenue_change || 0)].forEach(function (value, index) { var strong = kpis[index].querySelector("strong"); if (strong) strong.textContent = value; }); }
    }

    function closeDrawer() {
        drawerOverlay.classList.remove("is-open");
        drawerOverlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    function activateDrawerTab(tabName) {
        qsa(".bm-drawer-tab", drawer).forEach(function (tab) {
            var isActive = tab.dataset.bmTab === tabName;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        qsa(".bm-drawer-panel", drawer).forEach(function (panel) {
            panel.classList.toggle("is-active", panel.dataset.bmPanel === tabName);
        });

        if (tabName === "analytics") animateAnalyticsCharts();
        if (tabName === "categories") animateCategoryBars();
    }

    function initDrawer() {
        if (!drawerOverlay || !drawer) return;

        qs("#bmDrawerCloseBtn").addEventListener("click", closeDrawer);
        qs("#bmDrawerCloseFooterBtn").addEventListener("click", closeDrawer);

        var deactivateFooterBtn = qs("#bmDeactivateFooterBtn");
        if (deactivateFooterBtn) {
            deactivateFooterBtn.addEventListener("click", function () {
                if (!currentBrand) return;
                apiRequest(brandApiUrl(currentBrand.id), { method: "POST", body: new URLSearchParams({ action: "deactivate" }) }).then(function () { showToast("Brand deactivated.", "success"); reloadBrands(); }).catch(function (error) { showToast(error.message, "danger"); });
            });
        }

        drawerOverlay.addEventListener("click", function (e) {
            if (e.target === drawerOverlay) closeDrawer();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && drawerOverlay.classList.contains("is-open")) closeDrawer();
        });

        qs("#bmDrawerTabs").addEventListener("click", function (e) {
            var tab = e.target.closest(".bm-drawer-tab");
            if (!tab) return;
            activateDrawerTab(tab.dataset.bmTab);
        });

        var viewAllProductsBtn = qs("#bmViewAllProductsBtn");
        if (viewAllProductsBtn) {
            viewAllProductsBtn.addEventListener("click", function () {
                showToast("Opening Product Management filtered by " + (currentBrand ? currentBrand.name : "brand") + "&hellip;", "info");
            });
        }
        var exportBtn = qs("#bmDrawerExportBtn");
        if (exportBtn) exportBtn.addEventListener("click", function () {
            if (!currentBrand || !BRAND_EXPORT_URL) return;
            window.open(BRAND_EXPORT_URL + "?format=csv&id=" + encodeURIComponent(currentBrand.id), "_blank");
        });
    }

    /* ================= 11. DRAWER EDIT MODE (INFORMATION) ================= */
    function toggleInfoEditMode(showEdit) {
        var display = qs("#bmInfoDisplay");
        var form = qs("#bmInfoEditForm");
        if (!display || !form) return;
        display.classList.toggle("bm-hidden", showEdit);
        form.classList.toggle("bm-hidden", !showEdit);
    }

    function initInfoEdit() {
        var editBtn = qs("#bmEditInfoBtn");
        var cancelBtn = qs("#bmCancelEditInfoBtn");
        var form = qs("#bmInfoEditForm");

        if (editBtn) editBtn.addEventListener("click", function () { toggleInfoEditMode(true); });
        if (cancelBtn) cancelBtn.addEventListener("click", function () { toggleInfoEditMode(false); });

        if (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                var saveBtn = qs("#bmSaveInfoBtn");
                if (!currentBrand) { showToast("Select a brand before saving.", "danger"); return; }
                var data = new FormData();
                ["BrandName", "Slug", "Website", "Country", "Founded", "Email", "Phone", "Description", "DisplayOrder", "Facebook", "Instagram", "Linkedin"].forEach(function (name) {
                    var input = qs("#bmEdit" + name); if (input) data.append({ BrandName: "name", Slug: "slug", Website: "website", Country: "country_of_origin", Founded: "founded_year", Email: "official_email", Phone: "official_phone", Description: "description", DisplayOrder: "display_order", Facebook: "facebook", Instagram: "instagram", Linkedin: "linkedin" }[name], input.value);
                });
                var logoFile = qs("#bmEditLogoFile"), coverFile = qs("#bmEditCoverFile");
                if (logoFile && logoFile.files[0]) data.append("logo", logoFile.files[0]);
                if (coverFile && coverFile.files[0]) data.append("cover_image", coverFile.files[0]);
                submitBrand(brandApiUrl(currentBrand.id), data, saveBtn, "Brand information updated.");
            });
        }

        var changeLogoBtn = qs("#bmChangeLogoBtn");
        var logoInput = qs("#bmEditLogoFile");
        if (changeLogoBtn && logoInput) {
            changeLogoBtn.addEventListener("click", function () { logoInput.click(); });
            logoInput.addEventListener("change", function () {
                if (logoInput.files && logoInput.files[0]) showToast("Logo selected: " + logoInput.files[0].name, "info");
            });
        }

        var changeCoverBtn = qs("#bmChangeCoverBtn");
        var coverInput = qs("#bmEditCoverFile");
        if (changeCoverBtn && coverInput) {
            changeCoverBtn.addEventListener("click", function () { coverInput.click(); });
            coverInput.addEventListener("change", function () {
                if (coverInput.files && coverInput.files[0]) showToast("Cover image selected: " + coverInput.files[0].name, "info");
            });
        }
    }

    /* ================= 12. TOGGLE SWITCHES ================= */
    function initToggles() {
        document.addEventListener("change", function (e) {
            if (!e.target.matches('[data-bm-toggle], .bm-switch input')) return;
            var input = e.target;
            var row = input.closest(".bm-toggle-row");
            var label = row ? row.querySelector(".bm-toggle-text strong") : null;
            var name = label ? label.textContent : "Setting";
            if (currentBrand && (input.dataset.bmToggle === "active" || input.dataset.bmToggle === "featured")) {
                var action = input.dataset.bmToggle === "active" ? (input.checked ? "activate" : "deactivate") : (input.checked ? "feature" : "unfeature");
                apiRequest(brandApiUrl(currentBrand.id), { method: "POST", body: new URLSearchParams({ action: action }) }).then(function () { showToast(name + (input.checked ? " enabled." : " disabled."), "success"); }).catch(function (error) { input.checked = !input.checked; showToast(error.message, "danger"); });
                return;
            }
            showToast(name + (input.checked ? " enabled." : " disabled."), "success");
        });
    }

    /* ================= 13. SEO CHAR COUNTERS + PREVIEW ================= */
    function initSeoFields() {
        var titleInput = qs("#bmSeoTitle");
        var titleCounter = qs("#bmSeoTitleCounter");
        var descInput = qs("#bmSeoDescription");
        var descCounter = qs("#bmSeoDescCounter");
        var previewTitle = qs("#bmSeoPreviewTitle");
        var previewDesc = qs("#bmSeoPreviewDesc");

        function updateCounter(input, counterEl, max) {
            if (!input || !counterEl) return;
            var len = input.value.length;
            counterEl.textContent = len + " / " + max;
            counterEl.classList.toggle("is-near-limit", len > max * 0.85 && len <= max);
            counterEl.classList.toggle("is-at-limit", len >= max);
        }

        if (titleInput) {
            titleInput.addEventListener("input", function () {
                updateCounter(titleInput, titleCounter, 60);
                if (previewTitle) previewTitle.textContent = titleInput.value || "Untitled Brand";
            });
        }
        if (descInput) {
            descInput.addEventListener("input", function () {
                updateCounter(descInput, descCounter, 160);
                if (previewDesc) previewDesc.textContent = descInput.value;
            });
        }

        var saveSeoBtn = qs("#bmSaveSeoBtn");
        if (saveSeoBtn) {
            saveSeoBtn.addEventListener("click", function () {
                runWithLoadingState(saveSeoBtn, function () {
                    showToast("SEO settings saved.", "success");
                }, 600);
            });
        }
    }

    /* ================= 14. ACTIVITY TIMELINE FILTERS ================= */
    function initActivityFilters() {
        var filterBar = qs("#bmActivityFilters");
        var timeline = qs("#bmActivityTimeline");
        if (!filterBar || !timeline) return;

        var items = qsa(".bm-timeline-item", timeline);

        filterBar.addEventListener("click", function (e) {
            var pill = e.target.closest(".bm-pill");
            if (!pill) return;
            qsa(".bm-pill", filterBar).forEach(function (p) { p.classList.remove("is-active"); });
            pill.classList.add("is-active");
            var filter = pill.dataset.bmFilter;
            items.forEach(function (item) {
                var show = filter === "all" || item.dataset.bmType === filter;
                item.classList.toggle("bm-timeline-hidden", !show);
            });
        });
    }

    /* ================= 15. ADMIN NOTES ================= */
    function initAdminNotes() {
        var saveNoteBtn = qs("#bmSaveNoteBtn");
        var notesList = qs("#bmNotesList");
        if (!saveNoteBtn || !notesList) return;

        saveNoteBtn.addEventListener("click", function () {
            var textEl = qs("#bmNewNoteText");
            var priorityEl = qs("#bmNewNotePriority");
            var categoryEl = qs("#bmNewNoteCategory");
            var pinEl = qs("#bmNewNotePin");

            var text = textEl ? textEl.value.trim() : "";
            if (!text) {
                showToast("Please write a note before saving.", "danger");
                return;
            }

            runWithLoadingState(saveNoteBtn, function () {
                NOTE_ID_COUNTER += 1;
                var priority = priorityEl ? priorityEl.value : "normal";
                var priorityBadge = priority === "high" ? '<span class="bm-badge c-danger">High</span>'
                    : priority === "low" ? '<span class="bm-badge c-muted">Low</span>'
                        : '<span class="bm-badge c-accent">Normal</span>';
                var category = categoryEl ? categoryEl.value : "General";
                var isPinned = pinEl ? pinEl.checked : false;

                var card = document.createElement("div");
                card.className = "bm-note-card" + (isPinned ? " is-pinned" : "");
                card.innerHTML =
                    '<div class="bm-note-head">' +
                    '<span class="bm-note-avatar">A</span>' +
                    '<div class="bm-note-meta"><strong>Admin</strong><span>Just now &middot; ' + escapeHtml(category) + '</span></div>' +
                    (isPinned ? '<span class="bm-badge c-info">Pinned</span>' : priorityBadge) +
                    '</div>' +
                    '<p class="bm-note-content">' + escapeHtml(text) + '</p>' +
                    '<div class="bm-note-actions">' +
                    '<button type="button" class="bm-btn bm-btn-ghost bm-btn-sm" data-bm-toast="info" data-bm-toast-msg="Editing notes isn&#8217;t available yet.">Edit</button>' +
                    '<button type="button" class="bm-btn bm-btn-ghost bm-btn-sm" data-bm-toast="info" data-bm-toast-msg="Note pin toggled.">' + (isPinned ? "Unpin" : "Pin") + '</button>' +
                    '<button type="button" class="bm-btn bm-btn-ghost bm-btn-sm c-danger" data-bm-toast="danger" data-bm-toast-msg="Note deleted.">Delete</button>' +
                    '</div>';

                notesList.insertBefore(card, notesList.firstChild);

                if (textEl) textEl.value = "";
                if (pinEl) pinEl.checked = false;

                closeModal(qs("#bmAddNoteModal"));
                showToast("Note saved.", "success");
            }, 600);
        });

        notesList.addEventListener("click", function (e) {
            var deleteBtn = e.target.closest('[data-bm-toast-msg="Note deleted."]');
            if (deleteBtn) {
                var card = deleteBtn.closest(".bm-note-card");
                if (card) card.remove();
            }
        });
    }

    /* ================= 16. MODALS (GENERIC) ================= */
    var lastFocusedEl = null;

    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) return;
        if (currentBrand) {
            var title = modal.querySelector(".bm-modal-title");
            if (title && /Verify|Reject|Revoke|Activate|Deactivate|Feature|Delete/.test(title.textContent)) title.textContent = title.textContent.replace("Brand", currentBrand.name);
            if (id === "bmDeleteBrandModal") {
                var impactValues = qsa(".bm-impact-row strong", modal);
                if (impactValues[0]) impactValues[0].textContent = currentBrand.products_count || 0;
                if (impactValues[1]) impactValues[1].textContent = currentBrand.categories_count || 0;
                if (impactValues[2]) impactValues[2].textContent = currentBrand.orders || 0;
            }
        }
        lastFocusedEl = document.activeElement;
        modal.classList.remove("is-hidden");
        document.body.style.overflow = "hidden";
        var closeBtn = qs(".bm-modal-close", modal);
        if (closeBtn) closeBtn.focus();
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add("is-hidden");
        document.body.style.overflow = drawerOverlay && drawerOverlay.classList.contains("is-open") ? "hidden" : "";
        if (lastFocusedEl && typeof lastFocusedEl.focus === "function") lastFocusedEl.focus();
    }

    function closeAllModals() {
        qsa(".bm-modal-overlay").forEach(function (m) {
            if (!m.classList.contains("is-hidden")) closeModal(m);
        });
    }

    function initModals() {
        document.addEventListener("click", function (e) {
            var openTrigger = e.target.closest("[data-bm-open-modal]");
            if (openTrigger) {
                openModal(openTrigger.dataset.bmOpenModal);
                return;
            }
        });

        qsa("[data-bm-close-modal]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                closeModal(btn.closest(".bm-modal-overlay"));
            });
        });

        qsa(".bm-modal-overlay").forEach(function (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) closeModal(overlay);
            });
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeAllModals();
        });

        qsa("[data-bm-confirm-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var overlay = btn.closest(".bm-modal-overlay");
                var message = btn.dataset.bmToastMsg;
                var type = btn.dataset.bmToast || "success";
                runWithLoadingState(btn, function () {
                    closeModal(overlay);
                    showToast(message, type);
                }, 700);
            });
        });

        // Generic toast triggers not already handled as confirm actions
        document.addEventListener("click", function (e) {
            var el = e.target.closest("[data-bm-toast]");
            if (!el) return;
            if (el.hasAttribute("data-bm-confirm-action")) return;
            if (el.hasAttribute("data-bm-close-modal")) return;
            var type = el.dataset.bmToast || "info";
            var message = el.dataset.bmToastMsg || "Done.";
            showToast(message, type);
        });
    }

    /* ================= 17. ADD BRAND MODAL TABS ================= */
    function initAddBrandModal() {
        var addBtn = qs("#bmAddBrandBtn");
        if (addBtn) addBtn.addEventListener("click", function () { openModal("bmAddBrandModal"); });

        var tabsBar = qs("#bmAddBrandTabs");
        if (tabsBar) {
            tabsBar.addEventListener("click", function (e) {
                var tab = e.target.closest(".bm-modal-tab");
                if (!tab) return;
                qsa(".bm-modal-tab", tabsBar).forEach(function (t) { t.classList.remove("is-active"); });
                tab.classList.add("is-active");
                var panelName = tab.dataset.bmModalTab;
                qsa(".bm-modal-tab-panel", qs("#bmAddBrandModal")).forEach(function (panel) {
                    panel.classList.toggle("is-active", panel.dataset.bmModalPanel === panelName);
                });
            });
        }

        var form = qs("#bmAddBrandForm");
        if (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                var nameInput = qs("#bmNewBrandName");
                if (nameInput && !nameInput.value.trim()) {
                    showToast("Brand name is required.", "danger");
                    return;
                }
                var data = new FormData();
                var fields = { Name: "name", Slug: "slug", Website: "website", Country: "country_of_origin", Founded: "founded_year", Description: "description", Email: "official_email", Phone: "official_phone", Facebook: "facebook", Instagram: "instagram", Linkedin: "linkedin" };
                Object.keys(fields).forEach(function (key) { var el = qs("#bmNewBrand" + key) || qs("#bmNew" + key); if (el) data.append(fields[key], el.value); });
                var logo = qs("#bmNewLogo"), cover = qs("#bmNewCover");
                if (logo && logo.files[0]) data.append("logo", logo.files[0]);
                if (cover && cover.files[0]) data.append("cover_image", cover.files[0]);
                data.append("is_active", "true");
                data.append("is_featured", "false");
                submitBrand(BRAND_API_URL, data, qs("#bmCreateBrandBtn"), "Brand created successfully.");
            });
        }
        qsa("[data-file-input]").forEach(function (button) { button.addEventListener("click", function () { qs("#" + button.dataset.fileInput).click(); }); });
    }

    /* ================= 18. DELETE BRAND (TYPE TO CONFIRM) ================= */
    function initDeleteBrand() {
        var input = qs("#bmDeleteConfirmInput");
        var confirmBtn = qs("#bmDeleteConfirmBtn");
        if (!input || !confirmBtn) return;

        input.addEventListener("input", function () {
            confirmBtn.disabled = input.value.trim().toUpperCase() !== "DELETE";
        });

        confirmBtn.addEventListener("click", function () {
            if (confirmBtn.disabled) return;
            var overlay = confirmBtn.closest(".bm-modal-overlay");
            apiRequest(brandApiUrl(currentBrand.id), { method: "DELETE" }).then(function () {
                closeModal(overlay); closeDrawer(); showToast("Brand deleted permanently.", "danger"); window.setTimeout(reloadBrands, 350);
            }).catch(function (error) { showToast(error.message, "danger"); });
        });
        var removeProductsBtn = qs("#bmRemoveBrandProductsBtn");
        if (removeProductsBtn) removeProductsBtn.addEventListener("click", function () {
            if (!currentBrand) return;
            apiRequest(brandApiUrl(currentBrand.id) + "?remove_products=true", { method: "DELETE" }).then(function () { closeModal(qs("#bmDeleteBrandModal")); closeDrawer(); showToast("Brand removed from products and deleted.", "danger"); reloadBrands(); }).catch(function (error) { showToast(error.message, "danger"); });
        });
        var deactivateInsteadBtn = qs("#bmDeactivateInsteadBtn");
        if (deactivateInsteadBtn) deactivateInsteadBtn.addEventListener("click", function () {
            if (!currentBrand) return;
            apiRequest(brandApiUrl(currentBrand.id), { method: "POST", body: new URLSearchParams({ action: "deactivate" }) }).then(function () { closeModal(qs("#bmDeleteBrandModal")); closeDrawer(); showToast("Brand deactivated instead of deleted.", "success"); reloadBrands(); }).catch(function (error) { showToast(error.message, "danger"); });
        });
    }

    /* ================= 19. DOCUMENT PREVIEW MODAL ================= */
    function initDocPreview() {
        var previewTitle = qs("#bmDocPreviewTitle");
        document.addEventListener("click", function (e) {
            var trigger = e.target.closest("[data-bm-doc-preview]");
            if (!trigger) return;
            var title = trigger.dataset.docTitle || "Document Preview";
            if (previewTitle) previewTitle.textContent = title;
            openModal("bmDocPreviewModal");
        });
    }

    /* ================= 20. IMPORT DROPZONE ================= */
    function initImportModal() {
        var importBtn = qs("#bmImportBtn");
        if (importBtn) importBtn.addEventListener("click", function () { openModal("bmImportModal"); });

        var dropzone = qs("#bmImportDropzone");
        var fileInput = qs("#bmImportFileInput");
        var preview = qs("#bmImportPreview");
        if (!dropzone || !fileInput) return;

        dropzone.addEventListener("click", function () { fileInput.click(); });
        dropzone.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
        });

        fileInput.addEventListener("change", function () {
            if (fileInput.files && fileInput.files.length) {
                if (preview) preview.classList.remove("bm-hidden");
                showToast("File loaded: " + fileInput.files[0].name, "info");
            }
        });

        ["dragenter", "dragover"].forEach(function (evt) {
            dropzone.addEventListener(evt, function (e) {
                e.preventDefault(); e.stopPropagation();
                dropzone.style.borderColor = "var(--bm-accent)";
            });
        });
        ["dragleave", "drop"].forEach(function (evt) {
            dropzone.addEventListener(evt, function (e) {
                e.preventDefault(); e.stopPropagation();
                dropzone.style.borderColor = "";
            });
        });
        dropzone.addEventListener("drop", function (e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                try { var transfer = new DataTransfer(); transfer.items.add(e.dataTransfer.files[0]); fileInput.files = transfer.files; } catch (ignore) { }
                if (preview) preview.classList.remove("bm-hidden");
                showToast("File loaded: " + e.dataTransfer.files[0].name, "info");
            }
        });
        var importConfirm = qs("#bmImportModal [data-bm-confirm-action]");
        if (importConfirm) importConfirm.addEventListener("click", function (e) {
            e.stopImmediatePropagation();
            if (!fileInput.files[0]) { showToast("Choose a file first.", "danger"); return; }
            var formData = new FormData(); formData.append("file", fileInput.files[0]);
            submitBrand(BRAND_IMPORT_URL, formData, importConfirm, "Brands imported successfully.");
        });
    }

    /* ================= 21. EXPORT FORMAT CHIPS ================= */
    function initExportModal() {
        var exportBtn = qs("#bmExportBtn");
        if (exportBtn) exportBtn.addEventListener("click", function () { openModal("bmExportModal"); });

        var chips = qsa("[data-bm-export-format]");
        chips.forEach(function (chip) {
            chip.addEventListener("click", function () {
                chips.forEach(function (c) { c.classList.remove("is-active"); });
                chip.classList.add("is-active");
            });
        });
        var exportConfirm = qs("#bmExportModal [data-bm-confirm-action]");
        if (exportConfirm) exportConfirm.addEventListener("click", function (e) {
            e.stopImmediatePropagation();
            var format = (qs("[data-bm-export-format].is-active") || {}).dataset;
            var url = BRAND_EXPORT_URL + "?format=" + encodeURIComponent(format ? format.bmExportFormat : "csv");
            window.open(url, "_blank");
            closeModal(qs("#bmExportModal"));
        });
    }

    /* ================= 22. CHART ANIMATIONS + TOOLTIPS ================= */
    function animateAnalyticsCharts() {
        var lineChart = qs("#bmRevenueLineChart");
        if (lineChart) lineChart.classList.add("is-animated");

        var overviewBar = qs("#bmOverviewBarChart");
        if (overviewBar) overviewBar.classList.add("is-animated");

        var productGrowthBar = qs("#bmProductGrowthChart");
        if (productGrowthBar) productGrowthBar.classList.add("is-animated");
    }

    function animateCategoryBars() {
        qsa(".bm-category-bar-fill", qs("#bmCategoryList")).forEach(function (bar) {
            bar.classList.add("is-filled");
        });
    }

    function initChartTooltips() {
        var tooltip = qs("#bmChartTooltip");
        var chartWrap = qs("#bmRevenueLineChart");
        if (!tooltip || !chartWrap) return;

        qsa(".bm-line-chart-dot", chartWrap).forEach(function (dot) {
            dot.addEventListener("mouseenter", function () {
                var value = dot.dataset.value || "";
                tooltip.textContent = value;
                var cx = parseFloat(dot.getAttribute("cx"));
                var cy = parseFloat(dot.getAttribute("cy"));
                var svg = chartWrap.querySelector("svg");
                var svgRect = svg.getBoundingClientRect();
                var wrapRect = chartWrap.getBoundingClientRect();
                var scaleX = svgRect.width / 560;
                var scaleY = svgRect.height / 190;
                var left = (svgRect.left - wrapRect.left) + cx * scaleX;
                var top = (svgRect.top - wrapRect.top) + cy * scaleY;
                tooltip.style.left = left + "px";
                tooltip.style.top = top + "px";
                tooltip.classList.add("is-visible");
            });
            dot.addEventListener("mouseleave", function () {
                tooltip.classList.remove("is-visible");
            });
        });
    }

    /* ================= 23. HEADER DROPDOWN ================= */
    function initHeaderDropdown() {
        var dropdown = qs("#bmMoreDropdown");
        var trigger = qs("#bmMoreTrigger");
        if (!dropdown || !trigger) return;

        function close() {
            dropdown.classList.remove("is-open");
            trigger.setAttribute("aria-expanded", "false");
        }
        trigger.addEventListener("click", function (e) {
            e.stopPropagation();
            var willOpen = !dropdown.classList.contains("is-open");
            close();
            if (willOpen) {
                dropdown.classList.add("is-open");
                trigger.setAttribute("aria-expanded", "true");
            }
        });
        document.addEventListener("click", close);
        document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

        var bulkDeleteMenuBtn = qs("#bmBulkDeleteMenuBtn");
        if (bulkDeleteMenuBtn) {
            bulkDeleteMenuBtn.addEventListener("click", function () {
                var textEl = qs("#bmBulkDeleteModalText");
                if (textEl) textEl.textContent = "This will permanently delete all inactive brands (16). This cannot be undone.";
                openModal("bmBulkDeleteModal");
                var confirmBtn = qs("#bmBulkDeleteConfirmBtn");
                if (confirmBtn) {
                    confirmBtn.onclick = function () {
                        runWithLoadingState(confirmBtn, function () {
                            closeModal(qs("#bmBulkDeleteModal"));
                            showToast("Inactive brands deleted.", "danger");
                        }, 700);
                    };
                }
            });
        }
    }

    /* ================= 24. INIT ================= */
    function init() {
        initBrandRows();
        initReveal();
        initCounters();
        initSearchAndFilters();
        initSelection();
        initRowDropdowns();
        initFeaturedToggle();
        initColumnSort();
        initDrawer();
        initInfoEdit();
        initToggles();
        initSeoFields();
        initActivityFilters();
        initAdminNotes();
        initModals();
        initAddBrandModal();
        initDeleteBrand();
        initDocPreview();
        initImportModal();
        initExportModal();
        initChartTooltips();
        initHeaderDropdown();
        initRipples();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
