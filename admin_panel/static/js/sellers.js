/* =========================================================================
   MARKETSPHERE ADMIN — SELLER MANAGEMENT
   Frontend-only interactions for admin_panel/templates/users/sellers.html.
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {

    /* ================= 1. DOM CACHE ================= */
    var page = document.getElementById('sellerPage');
    if (!page) return;

    var table = document.getElementById('sellerTable');
    var tableBody = document.getElementById('sellerTableBody');
    var selectAllCheckbox = document.getElementById('sellerSelectAll');
    var bulkBar = document.getElementById('sellerBulkBar');
    var bulkCount = document.getElementById('sellerBulkCount');
    var clearSelectionBtn = document.getElementById('sellerClearSelectionBtn');
    var emptyState = document.getElementById('sellerEmptyState');
    var tableCard = document.querySelector('.js-seller-table-card');

    var searchInput = document.getElementById('sellerSearchInput');
    var statusFilter = document.getElementById('sellerStatusFilter');
    var sortFilter = document.getElementById('sellerSortFilter');
    var resetFiltersBtn = document.getElementById('sellerResetFiltersBtn');
    var refreshBtn = document.getElementById('sellerRefreshBtn');
    var emptyRefreshBtn = document.getElementById('sellerEmptyRefreshBtn');
    var exportBtn = document.getElementById('sellerExportBtn');
    var addSellerBtn = document.getElementById('sellerAddBtn');
    var rowsPerPageSelect = document.getElementById('sellerRowsPerPage');

    var deleteModalOverlay = document.getElementById('sellerDeleteModalOverlay');
    var deleteModalTitle = document.getElementById('sellerDeleteModalTitle');
    var deleteModalText = document.getElementById('sellerDeleteModalText');
    var deleteModalConfirm = document.getElementById('sellerDeleteModalConfirm');
    var deleteModalCancel = document.getElementById('sellerDeleteModalCancel');


    var confirmCallback = null;
    var rowPendingDelete = null;


    /* ================= 3. SCROLL REVEAL / CARD ENTRANCE ================= */
    var revealTargets = Array.prototype.slice.call(document.querySelectorAll('.js-seller-reveal'));

    if ('IntersectionObserver' in window && revealTargets.length) {
        var revealObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;
                var delay = Math.min(revealTargets.indexOf(el) * 45, 260);

                window.setTimeout(function () {
                    el.classList.add('is-visible');
                }, delay);

                obs.unobserve(el);
            });
        }, { threshold: 0.08 });

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        revealTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    /* ================= 4. ROW DROPDOWN MANAGEMENT ================= */
    let activeMenu = null;
    let activePlaceholder = null;
    let activeTrigger = null;

    function closeMenu() {
        if (!activeMenu) return;

        activeMenu.classList.remove("bu-open");
        activePlaceholder.appendChild(activeMenu);

        activeMenu = null;
        activePlaceholder = null;
        if (activeTrigger) {
            activeTrigger.setAttribute("aria-expanded", "false");
            activeTrigger = null;
        }
    }

    document.querySelectorAll(".js-seller-dropdown-trigger").forEach(button => {
        button.addEventListener("click", function (e) {
            e.stopPropagation();

            const dropdown = this.closest(".js-seller-dropdown");
            const menu = dropdown.querySelector(".js-seller-dropdown-menu");

            if (activeMenu === menu) {
                closeMenu();
                return;
            }

            closeMenu();

            activePlaceholder = dropdown;
            document.body.appendChild(menu);
            menu.classList.add("bu-open");

            const rect = this.getBoundingClientRect();
            const menuWidth = menu.offsetWidth;
            const menuHeight = menu.offsetHeight;

            const gap = 8;
            const padding = 12;

            let left = rect.left;
            let top = rect.bottom + gap;

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
            activeTrigger = this;
            this.setAttribute("aria-expanded", "true");

            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
            activeMenu = menu;
        });
    });

    document.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    /* ================= 5. CHECKBOX SELECTION / BULK BAR ================= */
    function getRowCheckboxes() {
        return Array.prototype.slice.call(tableBody.querySelectorAll('.js-seller-row-checkbox'));
    }

    function getVisibleRows() {
        return Array.prototype.slice.call(tableBody.querySelectorAll('.js-seller-row')).filter(function (row) {
            return !row.classList.contains('bu-hidden');
        });
    }

    function toggleRowHighlight(row, highlight) {
        if (!row) return;
        row.classList.toggle('is-selected', highlight);
    }

    function updateBulkBarState() {
        var checkedRows = getRowCheckboxes().filter(function (cb) { return cb.checked; });
        var totalCount = checkedRows.length;

        if (bulkCount) bulkCount.textContent = String(totalCount);
        if (bulkBar) bulkBar.classList.toggle('bu-hidden', totalCount === 0);

        if (selectAllCheckbox) {
            var visibleCheckboxes = getVisibleRows()
                .map(function (row) { return row.querySelector('.js-seller-row-checkbox'); })
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

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            var isChecked = selectAllCheckbox.checked;
            getVisibleRows().forEach(function (row) {
                var cb = row.querySelector('.js-seller-row-checkbox');
                if (cb) {
                    cb.checked = isChecked;
                    toggleRowHighlight(row, isChecked);
                }
            });
            updateBulkBarState();
        });
    }

    if (tableBody) {
        tableBody.addEventListener('change', function (e) {
            if (e.target.classList.contains('js-seller-row-checkbox')) {
                var row = e.target.closest('.js-seller-row');
                toggleRowHighlight(row, e.target.checked);
                updateBulkBarState();
            }
        });
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function () {
            getRowCheckboxes().forEach(function (cb) {
                cb.checked = false;
                toggleRowHighlight(cb.closest('.js-seller-row'), false);
            });
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
            updateBulkBarState();
        });
    }

    /* ================= 6. BULK ACTIONS ================= */
    document.querySelectorAll('[data-bulk-action]').forEach(function (button) {
        button.addEventListener('click', function (e) {
            // scope to seller page
            if (!button.closest('#sellerPage')) return;
            
            var action = e.currentTarget.dataset.bulkAction;
            var selectedRows = getRowCheckboxes()
                .filter(function (cb) { return cb.checked; })
                .map(function (cb) { return cb.closest('.js-seller-row'); });

            if (!selectedRows.length) return;

            if (action === 'verify') {
                selectedRows.forEach(function (row) { setRowStatus(row, 'verified', 'Verified'); });
                showToast(selectedRows.length + ' seller(s) marked as Verified.', 'success');
            } else if (action === 'suspend') {
                selectedRows.forEach(function (row) { setRowStatus(row, 'suspended', 'Suspended'); });
                showToast(selectedRows.length + ' seller(s) marked as Suspended.', 'success');
            } else if (action === 'export') {
                showToast('Exporting ' + selectedRows.length + ' seller(s) isn\u2019t available yet \u2014 check back soon.', 'info');
            } else if (action === 'block') {
                openDeleteModal(
                    'Block ' + selectedRows.length + ' sellers?',
                    'Are you sure you want to block these ' + selectedRows.length + ' selected sellers? This cannot be undone.',
                    function () {
                        selectedRows.forEach(function (row) { row.remove(); });
                        updateBulkBarState();
                        checkAndShowEmptyState();
                        showToast('Selected sellers blocked.', 'success');
                    }
                );
            }
        });
    });

    function setRowStatus(row, statusClass, statusLabel) {
        var badge = row.querySelector('.js-seller-badge');
        if (!badge) return;
        badge.className = 'bu-buyer-Verified js-seller-badge'; // Utilizing your existing layout styling structure
        badge.innerHTML = '<i class="bi bi-patch-check-fill"></i> ' + statusLabel;
        row.dataset.status = statusClass;
    }

    /* ================= 7. INDIVIDUAL ROW ACTIONS ================= */
    document.addEventListener('click', function (e) {
        var actionItem = e.target.closest("[data-row-action]");
        if (!actionItem) return;

        var menu = actionItem.closest(".js-seller-dropdown-menu");
        if (!menu) return;

        // Fetch row specifically from current seller table state
        var rowId = menu.dataset.userId;
        var row = Array.from(document.querySelectorAll('.js-seller-row')).find(r => r.querySelector('.js-seller-dropdown-menu[data-user-id="'+rowId+'"]') || r.dataset.userId === rowId) || actionItem.closest('.js-seller-row');
        
        var action = actionItem.dataset.rowAction;
        var userId = menu.dataset.userId;
        var sellerName = row ? (row.dataset.sellerName || 'this seller') : 'this seller';

        if (action === 'view-profile') {
            window.location.href = "/admin-db/user/sellers/" + userId;
        } else if (action === 'view-application') {
            window.location.href = "/admin-db/user/sellers/" + userId + "/application";
        } else if (action === 'view-products') {
            showToast('Viewing seller products isn\u2019t available yet \u2014 check back soon.', 'info');
        } else if (action === 'view-orders') {
            showToast('Viewing seller orders isn\u2019t available yet \u2014 check back soon.', 'info');
        } else if (action === 'send-email') {
            showToast('Sending email to ' + sellerName + ' isn\u2019t available yet \u2014 check back soon.', 'info');
        } else if (action === 'suspend') {
            fetch('/admin-db/change-account-state/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: new URLSearchParams({
                    userId: userId,
                    state: 'SUSPENDED'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && row) {
                    setRowStatus(row, 'suspended', 'Suspended');
                    showToast(sellerName + ' has been suspended.', 'success');
                } else {
                    showToast('Failed to suspend seller.', 'error');
                }
            })
            .catch(() => showToast('Something went wrong.', 'error'));
        } else if (action === 'verify') {
            fetch('/admin-db/change-account-state/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: new URLSearchParams({
                    userId: userId,
                    state: 'VERIFIED'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && row) {
                    setRowStatus(row, 'verified', 'Verified');
                    showToast(sellerName + ' has been verified.', 'success');
                } else {
                    showToast('Failed to verify seller.', 'error');
                }
            })
            .catch(() => showToast('Something went wrong.', 'error'));
        } else if (action === 'block') {
            rowPendingDelete = row;
            openDeleteModal(
                'Block this seller?',
                'Are you sure you want to Block "' + sellerName + '"?',
                function () {
                    if (rowPendingDelete) {
                        fetch('/admin-db/change-account-state/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'X-CSRFToken': getCookie('csrftoken'),
                            },
                            body: new URLSearchParams({
                                userId: userId,
                                state: 'BLOCKED'
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'success') {
                                setRowStatus(rowPendingDelete, 'blocked', 'Blocked');
                                showToast(sellerName + ' has been blocked.', 'success');
                            } else {
                                showToast('Failed to block seller.', 'error');
                            }
                        })
                        .catch(() => showToast('Something went wrong.', 'error'));
                    }
                }
            );
        }
        closeMenu();
    });

    /* ================= 8. DELETE CONFIRMATION MODAL ================= */
    function openDeleteModal(title, text, onConfirm) {
        if (!deleteModalOverlay) return;

        if (deleteModalTitle) deleteModalTitle.textContent = title;
        if (deleteModalText) deleteModalText.textContent = text;
        confirmCallback = onConfirm;

        deleteModalOverlay.classList.remove('bu-hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeDeleteModal() {
        if (!deleteModalOverlay || deleteModalOverlay.classList.contains('bu-hidden')) return;

        deleteModalOverlay.classList.add('bu-hidden');
        document.body.style.overflow = '';
        confirmCallback = null;
        rowPendingDelete = null;
    }

    if (deleteModalCancel) deleteModalCancel.addEventListener('click', closeDeleteModal);

    if (deleteModalOverlay) {
        deleteModalOverlay.addEventListener('click', function (e) {
            if (e.target === deleteModalOverlay) closeDeleteModal();
        });
    }

    if (deleteModalConfirm) {
        deleteModalConfirm.addEventListener('click', function () {
            if (confirmCallback) confirmCallback();
            closeDeleteModal();
        });
    }

    /* ================= 9. CLIENT-SIDE SEARCH / FILTER / SORT ================= */
    function performFiltering() {
        var searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        var statusVal = (statusFilter ? statusFilter.value : '').toLowerCase();

        Array.prototype.slice.call(tableBody.querySelectorAll('.js-seller-row')).forEach(function (row) {
            var name = (row.dataset.sellerName || '').toLowerCase();
            var username = (row.dataset.sellerUsername || '').toLowerCase();
            var email = (row.dataset.sellerEmail || '').toLowerCase();
            var status = (row.dataset.status || '').toLowerCase();

            var matchesSearch = !searchVal
                || name.indexOf(searchVal) !== -1
                || username.indexOf(searchVal) !== -1
                || email.indexOf(searchVal) !== -1;

            var matchesStatus = !statusVal
                || (statusVal === 'verified'
                    ? status === 'verified'
                    : status === statusVal);

            if (matchesSearch && matchesStatus) {
                row.classList.remove('bu-hidden');
            } else {
                row.classList.add('bu-hidden');
                var cb = row.querySelector('.js-seller-row-checkbox');
                if (cb) cb.checked = false;
            }
        });

        performSorting();
        updateBulkBarState();
        checkAndShowEmptyState();
    }

    function performSorting() {
        var sortVal = sortFilter ? sortFilter.value : 'newest';
        var rows = getVisibleRows();

        rows.sort(function (rowA, rowB) {
            if (sortVal === 'most-products') {
                return (parseInt(rowB.dataset.products, 10) || 0) - (parseInt(rowA.dataset.products, 10) || 0);
            }
            if (sortVal === 'highest-sales') {
                return (parseFloat(rowB.dataset.sales) || 0) - (parseFloat(rowA.dataset.sales) || 0);
            }
            if (sortVal === 'oldest' || sortVal === 'date-joined') {
                return new Date(rowA.dataset.joined) - new Date(rowB.dataset.joined);
            }
            // "newest" default
            return new Date(rowB.dataset.joined) - new Date(rowA.dataset.joined);
        });

        rows.forEach(function (row) { tableBody.appendChild(row); });
    }

    if (searchInput) {
        var searchDebounce = null;
        searchInput.addEventListener('input', function () {
            searchInput.parentElement.classList.add('is-typing');
            window.clearTimeout(searchDebounce);
            searchDebounce = window.setTimeout(function () {
                performFiltering();
                searchInput.parentElement.classList.remove('is-typing');
            }, 220);
        });
    }

    if (statusFilter) statusFilter.addEventListener('change', performFiltering);
    if (sortFilter) sortFilter.addEventListener('change', performFiltering);

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function () {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (sortFilter) sortFilter.value = 'newest';
            performFiltering();
            showToast('Filters reset.', 'info');
        });
    }

    /* ================= 10. EMPTY STATE ================= */
    function checkAndShowEmptyState() {
        if (!emptyState) return;

        var visibleCount = getVisibleRows().length;

        if (visibleCount === 0) {
            if (tableCard) {
                var wrap = tableCard.querySelector('.js-seller-table-wrap');
                if (wrap) wrap.style.display = 'none';
            }
            emptyState.classList.remove('bu-hidden');
        } else {
            if (tableCard) {
                var wrapVisible = tableCard.querySelector('.js-seller-table-wrap');
                if (wrapVisible) wrapVisible.style.display = '';
            }
            emptyState.classList.add('bu-hidden');
        }
    }

    /* ================= 11. PAGINATION UI ================= */
    var paginationButtons = document.querySelectorAll('.js-seller-page-btn');

    paginationButtons.forEach(function (btn) {
        if (btn.disabled) return;

        btn.addEventListener('click', function () {
            if (btn.classList.contains('is-active')) return;

            paginationButtons.forEach(function (b) { b.classList.remove('is-active'); });

            var isNumeric = /^\d+$/.test(btn.textContent.trim());
            if (isNumeric) {
                btn.classList.add('is-active');
            }

            if (tableCard) {
                tableCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    });

    if (rowsPerPageSelect) {
        rowsPerPageSelect.addEventListener('change', function () {
            showToast('Showing ' + rowsPerPageSelect.value + ' sellers per page.', 'info');
        });
    }

    /* ================= 12. TOOLBAR BUTTONS ================= */
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            refreshBtn.classList.add('is-spinning');
            window.setTimeout(function () {
                refreshBtn.classList.remove('is-spinning');
                showToast('Seller list refreshed.', 'success');
            }, 500);
        });
    }

    if (emptyRefreshBtn) {
        emptyRefreshBtn.addEventListener('click', function () {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            performFiltering();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            showToast('Exporting sellers isn\u2019t available yet \u2014 check back soon.', 'info');
        });
    }

    if (addSellerBtn) {
        addSellerBtn.addEventListener('click', function () {
            showToast('Adding a seller manually isn\u2019t available yet \u2014 check back soon.', 'info');
        });
    }

    /* ================= 13. BUTTON CLICK FEEDBACK (ripple) ================= */
    function bindRipple(el) {
        el.addEventListener('click', function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement('span');
            var size = Math.max(rect.width, rect.height);

            ripple.style.position = 'absolute';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.35)';
            ripple.style.pointerEvents = 'none';
            ripple.style.transform = 'scale(0)';
            ripple.style.opacity = '1';
            ripple.style.transition = 'transform 0.5s ease, opacity 0.6s ease';

            el.style.position = el.style.position || 'relative';
            el.style.overflow = 'hidden';
            el.appendChild(ripple);

            window.requestAnimationFrame(function () {
                ripple.style.transform = 'scale(2.2)';
                ripple.style.opacity = '0';
            });

            window.setTimeout(function () {
                ripple.remove();
            }, 600);
        });
    }

    document.querySelectorAll('#sellerPage .bu-btn-primary, #sellerPage .bu-btn-danger, #sellerPage .js-seller-page-btn').forEach(bindRipple);

    /* ================= 14. INIT ================= */
    updateBulkBarState();
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}