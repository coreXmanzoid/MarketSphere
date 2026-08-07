/* =========================================================================
   MARKETSPHERE ADMIN — BUYER MANAGEMENT
   Frontend-only interactions for admin_panel/templates/users/buyers.html.
   No fetch(), no AJAX, no backend calls, no external libraries. Every
   action here (search, filter, sort, bulk select, row actions, delete
   confirmation, pagination) is a pure DOM / UI simulation until the
   buyer-management backend (views, URLs, models) exists — matching the
   pattern already used across the seller dashboard (see
   seller_dashboard/static/js/products.js, orders.js).

   Sections:
     1. DOM Cache
     2. Toast Helper
     3. Scroll Reveal / Card Entrance
     4. Row Dropdown Management
     5. Checkbox Selection / Bulk Bar
     6. Bulk Actions
     7. Individual Row Actions
     8. Delete Confirmation Modal
     9. Client-Side Search / Filter / Sort
    10. Empty State
    11. Pagination UI
    12. Toolbar Buttons (reset, refresh, export, add)
    13. Button Click Feedback (ripple)
    14. Init
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {

    /* ================= 1. DOM CACHE ================= */
    var page = document.getElementById('buPage');
    if (!page) return; // nothing to control on this page

    var table = document.getElementById('buBuyersTable');
    var tableBody = document.getElementById('buBuyersTableBody');
    var selectAllCheckbox = document.getElementById('buSelectAll');
    var bulkBar = document.getElementById('buBulkBar');
    var bulkCount = document.getElementById('buBulkCount');
    var clearSelectionBtn = document.getElementById('buClearSelectionBtn');
    var emptyState = document.getElementById('buEmptyState');
    var tableCard = document.querySelector('.bu-table-card');

    var searchInput = document.getElementById('buSearchInput');
    var statusFilter = document.getElementById('buStatusFilter');
    var sortFilter = document.getElementById('buSortFilter');
    var resetFiltersBtn = document.getElementById('buResetFiltersBtn');
    var refreshBtn = document.getElementById('buRefreshBtn');
    var emptyRefreshBtn = document.getElementById('buEmptyRefreshBtn');
    var exportBtn = document.getElementById('buExportBtn');
    var addBuyerBtn = document.getElementById('buAddBuyerBtn');
    var rowsPerPageSelect = document.getElementById('buRowsPerPage');

    var deleteModalOverlay = document.getElementById('buDeleteModalOverlay');
    var deleteModalTitle = document.getElementById('buDeleteModalTitle');
    var deleteModalText = document.getElementById('buDeleteModalText');
    var deleteModalConfirm = document.getElementById('buDeleteModalConfirm');
    var deleteModalCancel = document.getElementById('buDeleteModalCancel');


    var confirmCallback = null;
    var rowPendingDelete = null;

    /* ================= 3. SCROLL REVEAL / CARD ENTRANCE ================= */
    var revealTargets = Array.prototype.slice.call(document.querySelectorAll('.bu-reveal'));

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
    // document.addEventListener('click', function (e) {
    //     var trigger = e.target.closest('.bu-dropdown-trigger');

    //     if (trigger) {
    //         e.preventDefault();
    //         var dropdown = trigger.closest('.bu-dropdown');
    //         var isActive = dropdown.classList.contains('bu-active');

    //         closeAllDropdowns();

    //         if (!isActive) {
    //             dropdown.classList.add('bu-active');
    //             trigger.setAttribute('aria-expanded', 'true');
    //         }
    //     } else if (!e.target.closest('.bu-dropdown-menu')) {
    //         closeAllDropdowns();
    //     }
    // });

    // document.addEventListener('keydown', function (e) {
    //     if (e.key === 'Escape') {
    //         closeAllDropdowns();
    //         closeDeleteModal();
    //     }
    // });

    // function closeAllDropdowns() {
    //     document.querySelectorAll('.bu-dropdown.bu-active').forEach(function (dropdown) {
    //         dropdown.classList.remove('bu-active');
    //         var trigger = dropdown.querySelector('.bu-dropdown-trigger');
    //         if (trigger) trigger.setAttribute('aria-expanded', 'false');
    //     });
    // }

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

    document.querySelectorAll(".bu-dropdown-trigger").forEach(button => {

        button.addEventListener("click", function (e) {

            e.stopPropagation();

            const dropdown = this.closest(".bu-dropdown");
            const menu = dropdown.querySelector(".bu-dropdown-menu");

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

            // Default: menu starts from button's left edge
            let left = rect.left;
            let top = rect.bottom + gap;

            // Not enough room on the right?
            if (left + menuWidth > window.innerWidth - padding) {
                left = rect.right - menuWidth;
            }

            // Still overflowing?
            left = Math.max(
                padding,
                Math.min(left, window.innerWidth - menuWidth - padding)
            );

            // Open upward if needed
            if (top + menuHeight > window.innerHeight - padding) {
                top = rect.top - menuHeight - gap;
            }

            // Clamp to viewport
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
        return Array.prototype.slice.call(tableBody.querySelectorAll('.bu-row-checkbox'));
    }

    function getVisibleRows() {
        return Array.prototype.slice.call(tableBody.querySelectorAll('.bu-row')).filter(function (row) {
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
                .map(function (row) { return row.querySelector('.bu-row-checkbox'); })
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
                var cb = row.querySelector('.bu-row-checkbox');
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
            if (e.target.classList.contains('bu-row-checkbox')) {
                var row = e.target.closest('.bu-row');
                toggleRowHighlight(row, e.target.checked);
                updateBulkBarState();
            }
        });
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function () {
            getRowCheckboxes().forEach(function (cb) {
                cb.checked = false;
                toggleRowHighlight(cb.closest('.bu-row'), false);
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
            var action = e.currentTarget.dataset.bulkAction;
            var selectedRows = getRowCheckboxes()
                .filter(function (cb) { return cb.checked; })
                .map(function (cb) { return cb.closest('.bu-row'); });

            if (!selectedRows.length) return;

            if (action === 'activate') {
                selectedRows.forEach(function (row) { setRowStatus(row, 'active', 'Active'); });
                showToast(selectedRows.length + ' buyer(s) marked as Active.', 'success');
            } else if (action === 'suspend') {
                selectedRows.forEach(function (row) { setRowStatus(row, 'suspended', 'Suspended'); });
                showToast(selectedRows.length + ' buyer(s) marked as Suspended.', 'success');
            } else if (action === 'export') {
                showToast('Exporting ' + selectedRows.length + ' buyer(s) isn\u2019t available yet \u2014 check back soon.', 'info');
            } else if (action === 'delete') {
                openDeleteModal(
                    'Delete ' + selectedRows.length + ' buyers?',
                    'Are you sure you want to delete these ' + selectedRows.length + ' selected buyers? This cannot be undone.',
                    function () {
                        selectedRows.forEach(function (row) { row.remove(); });
                        updateBulkBarState();
                        checkAndShowEmptyState();
                        showToast('Selected buyers deleted.', 'success');
                    }
                );
            }
        });
    });

    function setRowStatus(row, statusClass, statusLabel) {
        var badge = row.querySelector('.bu-badge');
        if (!badge) return;
        badge.className = 'bu-badge bu-badge-' + statusClass;
        badge.textContent = statusLabel;
        row.dataset.status = statusClass;
    }

    /* ================= 7. INDIVIDUAL ROW ACTIONS ================= */
    document.addEventListener('click', function (e) {

        var buyerName = row ? (row.dataset.buyerName || 'this buyer') : 'this buyer';
        var actionItem = e.target.closest("[data-row-action]");
        if (!actionItem) return;
        
        var menu = actionItem.closest(".bu-dropdown-menu");
        if (!menu) return;
        var row = actionItem.closest('.bu-row');
        var action = actionItem.dataset.rowAction;

        var userId = menu.dataset.userId;
        if (action === 'view-profile') {
            window.location.href = "/admin-db/user/buyers/" + userId;
        } else if (action === 'view-orders') {
            showToast('Viewing buyer orders isn\u2019t available yet \u2014 check back soon.', 'info');
        } else if (action === 'view-wishlist') {
            showToast('Viewing buyer wishlists isn\u2019t available yet \u2014 check back soon.', 'info');
        } else if (action === 'send-email') {
            showToast('Sending email to ' + buyerName + ' isn\u2019t available yet \u2014 check back soon.', 'info');
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
                    if (data.status === 'success') {
                        setRowStatus(row, 'suspended', 'Suspended');
                        showToast(buyerName + ' has been suspended.', 'success');
                    } else {
                        showToast('Failed to suspend buyer.', 'error');
                    }
                })
                .catch(() => {
                    showToast('Something went wrong.', 'error');
                });

        } else if (action === 'activate') {
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
                    if (data.status === 'success') {
                        setRowStatus(row, 'active', 'Active');
                        showToast(buyerName + ' has been activated.', 'success');
                    } else {
                        showToast('Failed to suspend buyer.', 'error');
                    }
                })
                .catch(() => {
                    showToast('Something went wrong.', 'error');
                });
        } else if (action === 'block') {
            rowPendingDelete = row;
            openDeleteModal(
                'Block this buyer?',
                'Are you sure you want to Block "' + buyerName + '"?',
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
                                    setRowStatus(row, 'blocked', 'Blocked');
                                    showToast(buyerName + ' has been blocked.', 'success');
                                } else {
                                    showToast('Failed to suspend buyer.', 'error');
                                }
                            })
                            .catch(() => {
                                showToast('Something went wrong.', 'error');
                            });

                        // rowPendingDelete.remove();
                        // rowPendingDelete = null;
                        // updateBulkBarState();
                        // checkAndShowEmptyState();
                    }
                }
            );
        }

        closeAllDropdowns();
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

    Array.prototype.slice.call(tableBody.querySelectorAll('.bu-row')).forEach(function (row) {
        var name = (row.dataset.buyerName || '').toLowerCase();
        var username = (row.dataset.buyerUsername || '').toLowerCase();
        var email = (row.dataset.buyerEmail || '').toLowerCase();
        var status = (row.dataset.status || '').toLowerCase();

        var matchesSearch = !searchVal
            || name.indexOf(searchVal) !== -1
            || username.indexOf(searchVal) !== -1
            || email.indexOf(searchVal) !== -1;

        var matchesStatus = !statusVal
            || (statusVal === 'email-verified'
                ? !!row.querySelector('.bu-buyer-verified')
                : status === statusVal);

        if (matchesSearch && matchesStatus) {
            row.classList.remove('bu-hidden');
        } else {
            row.classList.add('bu-hidden');
            var cb = row.querySelector('.bu-row-checkbox');
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
        if (sortVal === 'most-orders') {
            return (parseInt(rowB.dataset.orders, 10) || 0) - (parseInt(rowA.dataset.orders, 10) || 0);
        }
        if (sortVal === 'highest-spending') {
            return (parseFloat(rowB.dataset.spent) || 0) - (parseFloat(rowA.dataset.spent) || 0);
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
            var wrap = tableCard.querySelector('.bu-table-wrap');
            if (wrap) wrap.style.display = 'none';
        }
        emptyState.classList.remove('bu-hidden');
    } else {
        if (tableCard) {
            var wrapVisible = tableCard.querySelector('.bu-table-wrap');
            if (wrapVisible) wrapVisible.style.display = '';
        }
        emptyState.classList.add('bu-hidden');
    }
}

/* ================= 11. PAGINATION UI ================= */
var paginationButtons = document.querySelectorAll('.bu-page-btn');

paginationButtons.forEach(function (btn) {
    if (btn.disabled) return;

    btn.addEventListener('click', function () {
        if (btn.classList.contains('is-active')) return;

        paginationButtons.forEach(function (b) { b.classList.remove('is-active'); });

        // Only page-number buttons (non-icon, non-prev/next) get the active state.
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
        showToast('Showing ' + rowsPerPageSelect.value + ' buyers per page.', 'info');
    });
}

/* ================= 12. TOOLBAR BUTTONS ================= */
if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
        refreshBtn.classList.add('is-spinning');
        window.setTimeout(function () {
            refreshBtn.classList.remove('is-spinning');
            showToast('Buyer list refreshed.', 'success');
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
        showToast('Exporting buyers isn\u2019t available yet \u2014 check back soon.', 'info');
    });
}

if (addBuyerBtn) {
    addBuyerBtn.addEventListener('click', function () {
        showToast('Adding a buyer manually isn\u2019t available yet \u2014 check back soon.', 'info');
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

document.querySelectorAll('.bu-btn-primary, .bu-btn-danger, .bu-page-btn').forEach(bindRipple);

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
