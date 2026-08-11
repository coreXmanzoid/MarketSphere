/* ==========================================================================
   MARKETSPHERE ADMIN — CATALOG: PRODUCT MANAGEMENT (list.js)
   Frontend-only interactivity for admin_dashboard/catalog/products/list.html.
   Vanilla JS, IIFE-scoped, no external libraries, no network calls.
   All actions are simulated locally; backend wiring happens separately.

   Sections:
     1. Bootstrap / DOM cache
     2. Helpers (ripple, toast)
     3. Reveal-on-scroll
     4. Animated counters
     5. Sticky toolbar "more filters" toggle
     6. Search input UI
     7. Quick filter chips
     8. Column sort UI
     9. Row / bulk checkbox selection
    10. Bulk actions bar
    11. Row action dropdowns
    12. Delete confirmation modal
    13. Pagination UI
    14. Header dropdown ("More Actions")
    15. Generic data-toast triggers
    16. Empty state / reset filters
    17. Init
   ========================================================================== */

(function () {
    "use strict";

    var root = document.getElementById("pclPage");
    if (!root) return;

    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    /* ================= 2. HELPERS: RIPPLE + TOAST ================= */
    function attachRipple(el) {
        el.addEventListener("click", function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement("span");
            var size = Math.max(rect.width, rect.height);
            ripple.className = "pcl-ripple";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
            var prevPosition = getComputedStyle(el).position;
            if (prevPosition === "static") el.style.position = "relative";
            el.style.overflow = el.style.overflow || "hidden";
            el.appendChild(ripple);
            requestAnimationFrame(function () {
                ripple.style.transition = "transform .5s ease, opacity .5s ease";
                ripple.style.transform = "scale(2.6)";
                ripple.style.opacity = "0";
            });
            window.setTimeout(function () { ripple.remove(); }, 520);
        });
    }

    function initRipples() {
        qsa(".pcl-btn, .pcl-chip, .pcl-page-btn").forEach(attachRipple);
    }


    /* ================= 3. REVEAL ON SCROLL ================= */
    function initReveal() {
        var items = qsa(".pcl-reveal");
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
        }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

        items.forEach(function (el, i) {
            el.style.transitionDelay = Math.min(i * 45, 240) + "ms";
            observer.observe(el);
        });
    }

    /* ================= 4. ANIMATED COUNTERS ================= */
    function animateCounter(el) {
        var target = parseFloat(el.getAttribute("data-count-to"));
        if (!isFinite(target)) return;

        var duration = 900;
        var start = null;

        function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var value = Math.round(target * eased);
            el.textContent = value.toLocaleString("en-US");
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target.toLocaleString("en-US");
            }
        }
        requestAnimationFrame(step);
    }

    function initCounters() {
        var counters = qsa(".pcl-metric-value[data-count-to]");
        if (!counters.length) return;

        if (!("IntersectionObserver" in window)) {
            counters.forEach(animateCounter);
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        counters.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 5. MORE FILTERS TOGGLE ================= */
    function initMoreFilters() {
        var btn = qs("#pclMoreFiltersBtn");
        var row = qs("#pclMoreFiltersRow");
        if (!btn || !row) return;

        btn.addEventListener("click", function () {
            var isOpen = row.classList.toggle("is-open");
            btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    }

    /* ================= 6. SEARCH + FILTER + SORT ENGINE ================= */
    var tableBody = qs("#pclProductsTableBody");
    var emptyState = qs("#pclEmptyState");
    var tableWrap = qs(".pcl-table-wrap");

    function getAllRows() {
        return tableBody ? qsa(".pcl-row", tableBody) : [];
    }

    function getVisibleRows() {
        return getAllRows().filter(function (row) {
            return !row.classList.contains("pcl-row-hidden");
        });
    }

    function checkEmptyState() {
        if (!emptyState) return;
        var visible = getVisibleRows().length;
        var isEmpty = visible === 0;
        emptyState.classList.toggle("is-visible", isEmpty);
        if (tableWrap) tableWrap.style.display = isEmpty ? "none" : "";
    }

    var searchInput = qs("#pclSearchInput");
    var categoryFilter = qs("#pclCategoryFilter");
    var statusFilter = qs("#pclStatusFilter");
    var approvalFilter = qs("#pclApprovalFilter");
    var brandFilter = qs("#pclBrandFilter");
    var sellerFilter = qs("#pclSellerFilter");
    var stockFilter = qs("#pclStockFilter");
    var activeChip = "all";

    function stockStateOf(row) {
        var stock = parseInt(row.getAttribute("data-stock"), 10) || 0;
        if (stock <= 0) return "out-of-stock";
        if (stock <= 10) return "low-stock";
        return "in-stock";
    }

    function matchesChip(row, chip) {
        if (chip === "all") return true;
        if (chip === "published") return row.getAttribute("data-status") === "published";
        if (chip === "pending") return row.getAttribute("data-approval") === "pending";
        if (chip === "draft") return row.getAttribute("data-status") === "draft";
        if (chip === "hidden") return row.getAttribute("data-status") === "hidden";
        if (chip === "archived") return row.getAttribute("data-status") === "archived";
        if (chip === "out-of-stock") return stockStateOf(row) === "out-of-stock";
        if (chip === "featured") return row.getAttribute("data-featured") === "true";
        if (chip === "low-stock") return stockStateOf(row) === "low-stock";
        return true;
    }

    function applyFilters() {
        var query = (searchInput ? searchInput.value : "").toLowerCase().trim();
        var category = categoryFilter ? categoryFilter.value : "";
        var status = statusFilter ? statusFilter.value : "";
        var approval = approvalFilter ? approvalFilter.value : "";
        var brand = brandFilter ? brandFilter.value : "";
        var seller = sellerFilter ? sellerFilter.value : "";
        var stock = stockFilter ? stockFilter.value : "";

        getAllRows().forEach(function (row) {
            var name = (row.getAttribute("data-name") || "");
            var sku = (row.getAttribute("data-sku") || "").toLowerCase();
            var sellerName = (row.getAttribute("data-seller") || "");

            var matchesSearch = !query
                || name.indexOf(query) !== -1
                || sku.indexOf(query) !== -1
                || sellerName.indexOf(query) !== -1;

            var matchesCategory = !category || row.getAttribute("data-category") === category;
            var matchesStatus = !status || row.getAttribute("data-status") === status || (status === "out-of-stock" && stockStateOf(row) === "out-of-stock");
            var matchesApproval = !approval || row.getAttribute("data-approval") === approval;
            var matchesBrand = !brand || row.getAttribute("data-brand") === brand;
            var matchesSeller = !seller || sellerName.indexOf(seller.replace(/-/g, " ")) !== -1;
            var matchesStock = !stock || stockStateOf(row) === stock;
            var matchesChipFilter = matchesChip(row, activeChip);

            var isMatch = matchesSearch && matchesCategory && matchesStatus && matchesApproval
                && matchesBrand && matchesSeller && matchesStock && matchesChipFilter;

            row.classList.toggle("pcl-row-hidden", !isMatch);
            if (!isMatch) {
                var cb = row.querySelector(".pcl-row-checkbox");
                if (cb) cb.checked = false;
            }
        });

        checkEmptyState();
        updateBulkBarState();
    }

    function bindFilterEvents() {
        if (searchInput) {
            var debounce = null;
            searchInput.addEventListener("input", function () {
                window.clearTimeout(debounce);
                debounce = window.setTimeout(applyFilters, 200);
            });
        }
        [categoryFilter, statusFilter, approvalFilter, brandFilter, sellerFilter, stockFilter].forEach(function (el) {
            if (el) el.addEventListener("change", applyFilters);
        });

        var resetBtn = qs("#pclResetFiltersBtn");
        var emptyResetBtn = qs("#pclEmptyResetBtn");

        function resetAll() {
            if (searchInput) searchInput.value = "";
            [categoryFilter, statusFilter, approvalFilter, brandFilter, sellerFilter, stockFilter].forEach(function (el) {
                if (el) el.value = "";
            });
            var priceMin = qs("#pclPriceMin"); if (priceMin) priceMin.value = "";
            var priceMax = qs("#pclPriceMax"); if (priceMax) priceMax.value = "";
            var dateFrom = qs("#pclDateFrom"); if (dateFrom) dateFrom.value = "";
            var dateTo = qs("#pclDateTo"); if (dateTo) dateTo.value = "";
            setActiveChip("all");
            applyFilters();
            showToast("Filters reset.", "info");
        }

        if (resetBtn) resetBtn.addEventListener("click", resetAll);
        if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetAll);
    }

    /* ================= 7. QUICK FILTER CHIPS ================= */
    function setActiveChip(chip) {
        activeChip = chip;
        qsa(".pcl-chip").forEach(function (c) {
            c.classList.toggle("is-active", c.getAttribute("data-chip") === chip);
        });
    }

    function initQuickFilters() {
        var wrap = qs("#pclQuickFilters");
        if (!wrap) return;

        wrap.addEventListener("click", function (e) {
            var chipBtn = e.target.closest(".pcl-chip");
            if (!chipBtn) return;
            setActiveChip(chipBtn.getAttribute("data-chip"));
            applyFilters();
        });

        // Sidebar shortcuts that jump directly to a quick filter chip
        qsa("[data-chip-jump]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                setActiveChip(btn.getAttribute("data-chip-jump"));
                applyFilters();
                var toolbar = qs(".pcl-toolbar-card");
                if (toolbar) toolbar.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }

    /* ================= 8. COLUMN SORT UI ================= */
    function initColumnSort() {
        var headers = qsa("th[data-sort]");
        if (!headers.length || !tableBody) return;

        headers.forEach(function (th) {
            th.addEventListener("click", function () {
                var key = th.getAttribute("data-sort");
                var wasAsc = th.classList.contains("is-sorted-asc");
                var nextDir = wasAsc ? "desc" : "asc";

                headers.forEach(function (h) {
                    h.classList.remove("is-sorted-asc", "is-sorted-desc");
                });
                th.classList.add(nextDir === "asc" ? "is-sorted-asc" : "is-sorted-desc");

                var rows = getAllRows();
                rows.sort(function (a, b) {
                    var aVal = sortValue(a, key);
                    var bVal = sortValue(b, key);
                    if (aVal < bVal) return nextDir === "asc" ? -1 : 1;
                    if (aVal > bVal) return nextDir === "asc" ? 1 : -1;
                    return 0;
                });

                rows.forEach(function (row) { tableBody.appendChild(row); });
                showToast("Sorted by " + key + " (" + nextDir + "ending).", "info");
            });
        });
    }

    function sortValue(row, key) {
        var numericKeys = { price: 1, stock: 1, orders: 1, rating: 1 };
        var dateKeys = { created: 1, updated: 1 };
        var attr = "data-" + key;
        var raw = row.getAttribute(attr) || "";

        if (numericKeys[key]) return parseFloat(raw) || 0;
        if (dateKeys[key]) return new Date(raw).getTime() || 0;
        return raw.toLowerCase();
    }

    /* ================= 9. ROW / BULK CHECKBOX SELECTION ================= */
    var selectAllCheckbox = qs("#pclSelectAll");
    var bulkBar = qs("#pclBulkBar");
    var bulkCount = qs("#pclBulkCount");
    var clearSelectionBtn = qs("#pclClearSelectionBtn");

    function getRowCheckboxes() {
        return tableBody ? qsa(".pcl-row-checkbox", tableBody) : [];
    }

    function toggleRowHighlight(row, highlight) {
        if (!row) return;
        row.classList.toggle("is-selected", highlight);
    }

    function updateBulkBarState() {
        var checked = getRowCheckboxes().filter(function (cb) { return cb.checked; });
        var count = checked.length;

        if (bulkCount) bulkCount.textContent = String(count);
        if (bulkBar) bulkBar.classList.toggle("pcl-hidden", count === 0);

        if (selectAllCheckbox) {
            var visibleCheckboxes = getVisibleRows()
                .map(function (row) { return row.querySelector(".pcl-row-checkbox"); })
                .filter(Boolean);
            var visibleChecked = visibleCheckboxes.filter(function (cb) { return cb.checked; });

            if (visibleChecked.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (visibleChecked.length === visibleCheckboxes.length) {
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
                getVisibleRows().forEach(function (row) {
                    var cb = row.querySelector(".pcl-row-checkbox");
                    if (cb) {
                        cb.checked = isChecked;
                        toggleRowHighlight(row, isChecked);
                    }
                });
                updateBulkBarState();
            });
        }

        if (tableBody) {
            tableBody.addEventListener("change", function (e) {
                if (e.target.classList.contains("pcl-row-checkbox")) {
                    var row = e.target.closest(".pcl-row");
                    toggleRowHighlight(row, e.target.checked);
                    updateBulkBarState();
                }
            });
        }

        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener("click", function () {
                getRowCheckboxes().forEach(function (cb) {
                    cb.checked = false;
                    toggleRowHighlight(cb.closest(".pcl-row"), false);
                });
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                }
                updateBulkBarState();
            });
        }
    }

    /* ================= 10. BULK ACTIONS ================= */
    var BULK_LABELS = {
        approve: "approved",
        publish: "published",
        hide: "hidden",
        archive: "archived",
        export: "exported",
        delete: "deleted"
    };

    function initBulkActions() {
        qsa("[data-bulk-action]").forEach(function (button) {
            button.addEventListener("click", function () {
                var action = button.getAttribute("data-bulk-action");
                var selectedRows = getRowCheckboxes()
                    .filter(function (cb) { return cb.checked; })
                    .map(function (cb) { return cb.closest(".pcl-row"); });

                if (!selectedRows.length) return;

                if (action === "delete") {
                    openDeleteModal(
                        "Delete " + selectedRows.length + " products?",
                        "Are you sure you want to permanently delete these " + selectedRows.length + " selected products? This cannot be undone.",
                        function () {
                            selectedRows.forEach(function (row) { row.remove(); });
                            updateBulkBarState();
                            checkEmptyState();
                            showToast(selectedRows.length + " product(s) deleted.", "success");
                        }
                    );
                    return;
                }

                var label = BULK_LABELS[action] || action;
                showToast(selectedRows.length + " product(s) " + label + ".", "success");
            });
        });
    }

    /* ================= 11. ROW ACTION DROPDOWNS ================= */
    var activeMenu = null;
    var activePlaceholder = null;
    var activeTrigger = null;

    function closeMenu() {
        if (!activeMenu) return;


        activeMenu.classList.remove("pcl-open");
        activeMenu.classList.remove("pcl-row-menu");

        if (activePlaceholder) {
            activePlaceholder.appendChild(activeMenu);
        }

        activeMenu = null;
        activePlaceholder = null;

        if (activeTrigger) {
            activeTrigger.setAttribute("aria-expanded", "false");
            activeTrigger = null;
        }


    }

    function positionMenu(trigger, menu) {
        var rect = trigger.getBoundingClientRect();
        var menuWidth = menu.offsetWidth;
        var menuHeight = menu.offsetHeight;
        var gap = 8;
        var padding = 12;


        var left = rect.left;
        var top = rect.bottom + gap;

        if (left + menuWidth > window.innerWidth - padding) {
            left = rect.right - menuWidth;
        }

        left = Math.max(
            padding,
            Math.min(left, window.innerWidth - menuWidth - padding)
        );

        if (top + menuHeight > window.innerHeight - padding) {
            top = rect.top - menuHeight - gap;
        }

        top = Math.max(
            padding,
            Math.min(top, window.innerHeight - menuHeight - padding)
        );

        menu.style.left = left + "px";
        menu.style.top = top + "px";


    }

    function initRowDropdowns() {
        document.addEventListener("click", function (e) {
            var trigger = e.target.closest(".pcl-dropdown-trigger");


            if (trigger) {
                e.stopPropagation();

                var dropdown = trigger.closest(".pcl-dropdown");
                var menu = dropdown
                    ? dropdown.querySelector(".pcl-dropdown-menu")
                    : null;

                if (!menu) return;

                if (activeMenu === menu) {
                    closeMenu();
                    return;
                }

                closeMenu();

                activePlaceholder = dropdown;
                document.body.appendChild(menu);

                menu.classList.add("pcl-row-menu");
                menu.classList.add("pcl-open");

                positionMenu(trigger, menu);

                activeTrigger = trigger;
                trigger.setAttribute("aria-expanded", "true");
                activeMenu = menu;

                return;
            }

            if (!e.target.closest(".pcl-dropdown-menu")) {
                closeMenu();
            }
        });

        window.addEventListener("resize", closeMenu);
        window.addEventListener("scroll", closeMenu, true);

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                closeMenu();
            }
        });

    }

    /* =========================================================
    PRODUCT ROW ACTIONS
    ========================================================= */

    var ROW_ACTION_LABELS = {
        view: "Opening product\u2026",
        hide: "Product hidden from storefront.",
        unhide: "Product visible on storefront.",
        feature: "Product featured.",
        unfeature: "Product unfeatured.",
        archive: "Product archived.",
        delete: "Product deleted."
    };

    /* =========================================================
    CSRF
    ========================================================= */

    function getCSRFToken() {
        var cookieValue = null;


        if (!document.cookie) {
            return null;
        }

        var cookies = document.cookie.split(";");

        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();

            if (cookie.substring(0, 10) === "csrftoken=") {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }

        return cookieValue;


    }

    /* =========================================================
    STATUS BADGE
    ========================================================= */

    function setRowStatusBadge(row, statusClass, statusLabel) {
        if (!row) return;


        var statusCell = row.querySelector(
            'td[data-label="Status"] .pcl-badge'
        );

        if (!statusCell) return;

        statusCell.className = "pcl-badge " + statusClass;
        statusCell.textContent = statusLabel;


    }

    /* =========================================================
    GET PRODUCT ROW
    ========================================================= */

    function getActionRow(actionItem) {
        var row = null;
        var menu = actionItem.closest(".pcl-dropdown-menu");

        /*
         * Because the dropdown menu is temporarily moved to body,
         * actionItem.closest(".pcl-row") may not work.
         *
         * activePlaceholder is the original .pcl-dropdown element.
         */
        if (menu && activePlaceholder) {
            row = activePlaceholder.closest(".pcl-row");
        }

        if (!row) {
            row = actionItem.closest(".pcl-row");
        }

        return row;

    }

    /* =========================================================
    BACKEND REQUEST
    ========================================================= */

    function sendProductAction(url, productSlug) {
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
                "X-Requested-With": "XMLHttpRequest"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                productSlug: productSlug
            })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || data.status !== "success") {
                        throw new Error(
                            data.message || "Something went wrong."
                        );
                    }

                    return data;
                });
            });
    }

    /* =========================================================
    HIDE PRODUCT
    ========================================================= */

    function hideProduct(row) {
        var productSlug = row.getAttribute("data-product-slug");

        if (!productSlug) {
            showToast("Product slug is missing.", "danger");
            return Promise.reject(new Error("Product slug is missing."));
        }

        return sendProductAction(
            "/seller/products/hide-product",
            productSlug
        ).then(function (data) {
            setRowStatusBadge(row, "c-warning", "Hidden");

            row.setAttribute("data-status", "hidden");

            return data;
        });

    }

    /* =========================================================
    UNHIDE PRODUCT
    ========================================================= */

    function unhideProduct(row) {
        var productSlug = row.getAttribute("data-product-slug");

        if (!productSlug) {
            showToast("Product slug is missing.", "danger");
            return Promise.reject(new Error("Product slug is missing."));
        }

        return sendProductAction(
            "/seller/products/unhide-product",
            productSlug
        ).then(function (data) {
            setRowStatusBadge(row, "c-success", "Published");

            row.setAttribute("data-status", "published");

            return data;
        });

    }

    /* =========================================================
    DELETE PRODUCT
    ========================================================= */

    function deleteProduct(row) {
        var productSlug = row.getAttribute("data-product-slug");

        if (!productSlug) {
            showToast("Product slug is missing.", "danger");
            return Promise.reject(new Error("Product slug is missing."));
        }

        return sendProductAction(
            "/seller/products/delete-product",
            productSlug
        ).then(function (data) {

            /*
             * The backend can return:
             *
             * archived: true
             *
             * when the product has previous orders.
             *
             * In that case the product was NOT permanently deleted.
             */
            if (data.archived) {
                setRowStatusBadge(row, "c-muted", "Archived");

                row.setAttribute("data-status", "archived");

                return data;
            }

            row.remove();

            if (typeof checkEmptyState === "function") {
                checkEmptyState();
            }

            if (typeof updateBulkBarState === "function") {
                updateBulkBarState();
            }

            return data;
        });

    }

    /* =========================================================
    ROW ACTION HANDLER
    ========================================================= */

    function initRowActions() {
        document.addEventListener("click", function (e) {
            var actionItem = e.target.closest("[data-row-action]");


            if (!actionItem) return;

            e.preventDefault();
            e.stopPropagation();

            var action = actionItem.getAttribute("data-row-action");

            /*
             * The dropdown menu is moved to <body>, so the action
             * button may no longer be inside the original table row.
             *
             * Therefore get product information directly from the
             * clicked button first.
             */
            var productSlug = actionItem.getAttribute("data-product-slug");

            var productName =
                actionItem.getAttribute("data-product-name") ||
                actionItem.getAttribute("data-name") ||
                "this product";

            /*
             * Find the original product row.
             */
            var row = null;

            if (
                typeof activePlaceholder !== "undefined" &&
                activePlaceholder
            ) {
                row = activePlaceholder.closest(".pcl-row");
            }

            /*
             * Fallback if the menu hasn't been moved.
             */
            if (!row) {
                row = actionItem.closest(".pcl-row");
            }

            /*
             * If the button doesn't have the slug, try the row.
             */
            if (!productSlug && row) {
                productSlug = row.getAttribute("data-product-slug");
            }

            if (!productSlug) {
                showToast("Product slug is missing.", "danger");
                closeMenu();
                return;
            }


            /* =====================================================
               VIEW PRODUCT
            ===================================================== */

            if (action === "view") {
                var detailUrl =
                    actionItem.getAttribute("data-detail-url");

                if (!detailUrl && row) {
                    detailUrl =
                        row.getAttribute("data-detail-url");
                }

                closeMenu();

                if (detailUrl) {
                    window.location.href = detailUrl;
                } else {
                    showToast(
                        "Product detail URL is missing.",
                        "danger"
                    );
                }

                return;
            }


            /* =====================================================
               DELETE PRODUCT
            ===================================================== */

            if (action === "delete") {
                closeMenu();

                openDeleteModal(
                    "Delete this product?",
                    "This action cannot be undone. \u201c" +
                    productName +
                    "\u201d will be permanently removed from the marketplace.",

                    function () {

                        showToast(
                            "Deleting product\u2026",
                            "info"
                        );

                        sendProductAction(
                            "/seller/products/delete-product",
                            productSlug
                        )
                            .then(function (data) {

                                /*
                                 * Product had previous orders.
                                 * Backend archived it instead of deleting.
                                 */
                                if (data.archived) {

                                    if (row) {
                                        setRowStatusBadge(
                                            row,
                                            "c-muted",
                                            "Archived"
                                        );

                                        row.setAttribute(
                                            "data-status",
                                            "archived"
                                        );
                                    }

                                } else {

                                    if (row) {
                                        row.remove();
                                    }
                                }

                                if (
                                    typeof checkEmptyState ===
                                    "function"
                                ) {
                                    checkEmptyState();
                                }

                                if (
                                    typeof updateBulkBarState ===
                                    "function"
                                ) {
                                    updateBulkBarState();
                                }

                                showToast(
                                    data.message ||
                                    "Product deleted successfully.",
                                    "success"
                                );
                            })
                            .catch(function (error) {

                                showToast(
                                    error.message ||
                                    "Unable to delete product.",
                                    "danger"
                                );
                            });
                    }
                );

                return;
            }


            /* =====================================================
               HIDE PRODUCT
            ===================================================== */

            if (action === "hide") {
                closeMenu();

                showToast(
                    "Hiding product\u2026",
                    "info"
                );

                sendProductAction(
                    "/seller/products/hide-product",
                    productSlug
                )
                    .then(function (data) {

                        if (row) {
                            setRowStatusBadge(
                                row,
                                "c-warning",
                                "Hidden"
                            );

                            row.setAttribute(
                                "data-status",
                                "hidden"
                            );
                        }

                        showToast(
                            data.message ||
                            "Product hidden from storefront.",
                            "success"
                        );
                    })
                    .catch(function (error) {

                        showToast(
                            error.message ||
                            "Unable to hide product.",
                            "danger"
                        );
                    });

                return;
            }

            /* =====================================================
               UNHIDE PRODUCT
            ===================================================== */

            if (action === "unhide") {
                closeMenu();

                showToast(
                    "Making product visible\u2026",
                    "info"
                );

                sendProductAction(
                    "/seller/products/unhide-product",
                    productSlug
                )
                    .then(function (data) {

                        if (row) {
                            setRowStatusBadge(
                                row,
                                "c-success",
                                "Published"
                            );

                            row.setAttribute(
                                "data-status",
                                "published"
                            );
                        }

                        showToast(
                            data.message ||
                            "Product visible on storefront.",
                            "success"
                        );
                    })
                    .catch(function (error) {

                        showToast(
                            error.message ||
                            "Unable to unhide product.",
                            "danger"
                        );
                    });

                return;
            }

            /* =====================================================
               FEATURE / UNFEATURE
            ===================================================== */

            function toggleProductFeatured(productSlug, action) {
                return fetch("/seller/products/toggle-featured/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        productSlug: productSlug,
                        action: action
                    })
                })
                    .then(function (response) {
                        return response.json().then(function (data) {
                            if (!response.ok || data.status !== "success") {
                                throw new Error(
                                    data.message ||
                                    "Unable to update featured status."
                                );
                            }

                            return data;
                        });
                    });
            }
            if (
                action === "feature" ||
                action === "unfeature"
            ) {
                closeMenu();

                showToast(
                    action === "feature"
                        ? "Featuring product\u2026"
                        : "Unfeaturing product\u2026",
                    "info"
                );

                toggleProductFeatured(productSlug, action)
                    .then(function (data) {

                        /*
                         * Django returns the actual featured state
                         * after updating the product.
                         */
                        var featured = data.featured;

                        /*
                         * Update the clicked action button.
                         *
                         * If the product is now featured:
                         *      action = unfeature
                         *      label  = Unfeature
                         *
                         * If the product is now unfeatured:
                         *      action = feature
                         *      label  = Feature
                         */
                        actionItem.setAttribute(
                            "data-row-action",
                            featured ? "unfeature" : "feature"
                        );

                        actionItem.setAttribute(
                            "data-featured",
                            featured ? "true" : "false"
                        );

                        actionItem.innerHTML =
                            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<path d="m12 2 2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.6 5.8 21 7 14.14l7.1-1.01L12 2Z"></path>' +
                            '</svg>' +
                            (featured ? "Unfeature" : "Feature");

                        /*
                         * Keep the product row synchronized with
                         * the database state.
                         */
                        if (row) {
                            row.setAttribute(
                                "data-featured",
                                featured ? "true" : "false"
                            );
                        }

                        /*
                         * Use the backend message instead of assuming
                         * that the requested operation succeeded.
                         */
                        showToast(
                            data.message ||
                            (
                                featured
                                    ? "Product featured successfully."
                                    : "Product unfeatured successfully."
                            ),
                            "success"
                        );
                    })
                    .catch(function (error) {

                        /*
                         * The database was not successfully updated,
                         * so do not change the button or row state.
                         */
                        showToast(
                            error.message ||
                            "Unable to update featured status.",
                            "danger"
                        );
                    });

                return;

            }

            /* =====================================================
               ARCHIVE
            ===================================================== */
            function toggleProductArchive(productSlug, action) {
                return fetch("/seller/products/toggle-archive/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        productSlug: productSlug,
                        action: action
                    })
                })
                    .then(function (response) {
                        return response.json().then(function (data) {
                            if (!response.ok || data.status !== "success") {
                                throw new Error(
                                    data.message ||
                                    "Unable to update archive status."
                                );
                            }

                            return data;
                        });
                    });
            }
            if (
                action === "archive" ||
                action === "unarchive"
            ) {
                closeMenu();

                showToast(
                    action === "archive"
                        ? "Archiving product\u2026"
                        : "Restoring product\u2026",
                    "info"
                );

                toggleProductArchive(productSlug, action)
                    .then(function (data) {

                        var archived = data.archived;

                        /*
                         * Update the product row according to the
                         * actual state returned by Django.
                         */
                        if (row) {
                            setRowStatusBadge(
                                row,
                                archived
                                    ? "c-muted"
                                    : "c-success",
                                archived
                                    ? "Archived"
                                    : "Published"
                            );

                            row.setAttribute(
                                "data-status",
                                archived
                                    ? "archived"
                                    : "published"
                            );
                        }

                        /*
                         * Update the action button so the next action
                         * is the opposite of the current state.
                         */
                        actionItem.setAttribute(
                            "data-row-action",
                            archived
                                ? "unarchive"
                                : "archive"
                        );

                        actionItem.setAttribute(
                            "data-archived",
                            archived
                                ? "true"
                                : "false"
                        );

                        actionItem.innerHTML =
                            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<polyline points="21 8 21 21 3 21 3 8"></polyline>' +
                            '<rect x="1" y="3" width="22" height="5"></rect>' +
                            '</svg>' +
                            (
                                archived
                                    ? "Unarchive"
                                    : "Archive"
                            );

                        showToast(
                            data.message ||
                            (
                                archived
                                    ? "Product archived successfully."
                                    : "Product restored successfully."
                            ),
                            "success"
                        );
                    })
                    .catch(function (error) {

                        /*
                         * Do not change the UI state if the backend
                         * request failed.
                         */
                        showToast(
                            error.message ||
                            "Unable to update archive status.",
                            "danger"
                        );
                    });

                return;

            }



            /* =====================================================
               UNKNOWN ACTION
            ===================================================== */

            closeMenu();

            showToast(
                "Unsupported product action.",
                "danger"
            );
        });

    }


    /* ================= 12. DELETE CONFIRMATION MODAL ================= */
    var deleteModalOverlay = qs("#pclDeleteModalOverlay");
    var deleteModalTitle = qs("#pclDeleteModalTitle");
    var deleteModalText = qs("#pclDeleteModalText");
    var deleteModalConfirm = qs("#pclDeleteModalConfirm");
    var deleteModalCancel = qs("#pclDeleteModalCancel");
    var confirmCallback = null;

    function openDeleteModal(title, text, onConfirm) {
        if (!deleteModalOverlay) return;
        if (deleteModalTitle) deleteModalTitle.textContent = title;
        if (deleteModalText) deleteModalText.textContent = text;
        confirmCallback = onConfirm;
        deleteModalOverlay.classList.remove("is-hidden");
        document.body.style.overflow = "hidden";
    }

    function closeDeleteModal() {
        if (!deleteModalOverlay || deleteModalOverlay.classList.contains("is-hidden")) return;
        deleteModalOverlay.classList.add("is-hidden");
        document.body.style.overflow = "";
        confirmCallback = null;
    }

    function initDeleteModal() {
        if (deleteModalCancel) deleteModalCancel.addEventListener("click", closeDeleteModal);
        if (deleteModalOverlay) {
            deleteModalOverlay.addEventListener("click", function (e) {
                if (e.target === deleteModalOverlay) closeDeleteModal();
            });
        }
        if (deleteModalConfirm) {
            deleteModalConfirm.addEventListener("click", function () {
                if (confirmCallback) confirmCallback();
                closeDeleteModal();
            });
        }
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeDeleteModal();
        });
    }

    /* ================= 13. PAGINATION UI ================= */
    function initPagination() {
        var buttons = qsa(".pcl-page-btn", qs("#pclPaginationNav"));
        buttons.forEach(function (btn) {
            if (btn.disabled) return;
            btn.addEventListener("click", function () {
                if (btn.classList.contains("is-active")) return;
                buttons.forEach(function (b) { b.classList.remove("is-active"); });
                var isNumeric = /^\d+$/.test(btn.textContent.trim());
                if (isNumeric) {
                    btn.classList.add("is-active");
                    var jumpInput = qs("#pclJumpInput");
                    if (jumpInput) jumpInput.value = btn.textContent.trim();
                }
                var tableCard = qs(".pcl-table-card");
                if (tableCard) tableCard.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });

        var rowsPerPage = qs("#pclRowsPerPage");
        if (rowsPerPage) {
            rowsPerPage.addEventListener("change", function () {
                showToast("Showing " + rowsPerPage.value + " products per page.", "info");
            });
        }

        var jumpInput = qs("#pclJumpInput");
        if (jumpInput) {
            jumpInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    showToast("Jumped to page " + (jumpInput.value || 1) + ".", "info");
                }
            });
        }
    }

    /* ================= 14. HEADER "MORE ACTIONS" DROPDOWN ================= */
    function initHeaderDropdown() {
        var dropdown = qs("#pclMoreDropdown");
        var trigger = qs("#pclMoreTrigger");
        var menu = qs("#pclMoreMenu");
        if (!dropdown || !trigger || !menu) return;

        function close() {
            menu.classList.remove("pcl-open");
            trigger.setAttribute("aria-expanded", "false");
        }

        function toggle(e) {
            e.stopPropagation();
            var isOpen = menu.classList.toggle("pcl-open");
            trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
            if (isOpen) {
                menu.style.position = "absolute";
                menu.style.right = "0";
                menu.style.top = "calc(100% + 8px)";
                menu.style.left = "auto";
            }
        }

        trigger.addEventListener("click", toggle);
        document.addEventListener("click", function (e) {
            if (!dropdown.contains(e.target)) close();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") close();
        });
    }

    /* ================= 15. GENERIC data-toast TRIGGERS ================= */
    function initGenericToastTriggers() {
        document.addEventListener("click", function (e) {
            var el = e.target.closest("[data-toast]");
            if (!el) return;
            if (el.hasAttribute("data-row-action") || el.hasAttribute("data-bulk-action")) return;
            var type = el.getAttribute("data-toast") || "info";
            var message = el.getAttribute("data-toast-msg") || "Done";
            showToast(message, type);
        });

        var addProductBtn = qs("#pclAddProductBtn");
        if (addProductBtn) {
            addProductBtn.addEventListener("click", function () {
                showToast("Opening the add product form\u2026", "info");
            });
        }

        var exportBtn = qs("#pclExportBtn");
        if (exportBtn) {
            exportBtn.addEventListener("click", function () {
                showToast("Preparing product export\u2026", "info");
            });
        }

        var refreshBtn = qs("#pclRefreshBtn");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", function () {
                showToast("Product list refreshed.", "success");
            });
        }
    }

    /* ================= 17. INIT ================= */
    function init() {
        initReveal();
        initCounters();
        initMoreFilters();
        bindFilterEvents();
        initQuickFilters();
        initColumnSort();
        initSelection();
        initBulkActions();
        initRowDropdowns();
        initRowActions();
        initDeleteModal();
        initPagination();
        initHeaderDropdown();
        initGenericToastTriggers();
        initRipples();
        checkEmptyState();
        updateBulkBarState();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
