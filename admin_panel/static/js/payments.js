/* =========================================================================
   MARKETSPHERE ADMIN — PAYMENT MANAGEMENT (payments.js)
   Frontend-only interactions for admin_panel/templates/sales/payments/payments.html.
   No fetch(), no AJAX, no backend calls, no external libraries. All payment
   data is already rendered server-side via Django template tags — this
   file only enhances the already-rendered HTML (search/filter UI, row
   selection, dropdowns, modals, quick view, copy-to-clipboard, toasts).

   Sections:
     1. DOM Cache
     2. Toast Helper
     3. Scroll Reveal
     4. Animated Counters
     5. Row Dropdown Management
     6. Checkbox Selection / Bulk Bar
     7. Bulk Actions
     8. Status Nav + Quick Filter Chips
     9. Client-Side Search / Filter / Sort
    10. Advanced Filter Panel
    11. Copy to Clipboard
    12. Quick View Drawer
    13. Export Modal
    14. Generic Modal Open/Close
    15. Empty State Handling
    16. Button Ripple Feedback
    17. Init
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {

    /* ================= 1. DOM CACHE ================= */
    var page = document.getElementById('pmtPage');
    if (!page) return;

    var table = document.getElementById('pmtTable');
    var tableBody = document.getElementById('pmtTableBody');
    var selectAllCheckbox = document.getElementById('pmtSelectAll');
    var bulkBar = document.getElementById('pmtBulkBar');
    var bulkCount = document.getElementById('pmtBulkCount');
    var clearSelectionBtn = document.getElementById('pmtClearSelectionBtn');
    var tableCard = document.querySelector('.pmt-table-card');
    var emptyState = document.getElementById('pmtEmptyState');
    var noSearchResults = document.getElementById('pmtNoSearchResults');

    var searchInput = document.getElementById('pmtSearchInput');
    var methodFilter = document.getElementById('pmtMethodFilter');
    var providerFilter = document.getElementById('pmtProviderFilter');
    var sortFilter = document.getElementById('pmtSortFilter');
    var resetFiltersBtn = document.getElementById('pmtResetFiltersBtn');
    var emptyResetBtn = document.getElementById('pmtEmptyResetBtn');
    var searchEmptyResetBtn = document.getElementById('pmtSearchEmptyResetBtn');

    var statusNav = document.getElementById('pmtStatusNav');
    var chipRow = document.getElementById('pmtChipRow');

    var advancedFiltersBtn = document.getElementById('pmtAdvancedFiltersBtn');
    var advancedPanel = document.getElementById('pmtAdvancedFilterPanel');
    var advancedResetBtn = document.getElementById('pmtAdvancedResetBtn');
    var advancedApplyBtn = document.getElementById('pmtAdvancedApplyBtn');

    var quickViewOverlay = document.getElementById('pmtQuickViewOverlay');
    var quickViewClose = document.getElementById('pmtQuickViewClose');

    var exportConfirmBtn = document.getElementById('pmtExportConfirmBtn');

    var activeMenu = null;
    var activePlaceholder = null;
    var activeTrigger = null;
    var currentStatusFilter = 'all';
    var currentSearchTerm = '';

    /* ================= 2. TOAST HELPER ================= */
    function showToast(message, type) {
        var container = document.getElementById('pmtToastContainer');
        if (!container) return;

        type = type || 'info';

        var icons = {
            success: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"></path></svg>',
            danger: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };

        var toast = document.createElement('div');
        toast.className = 'pmt-toast pmt-toast-' + type;
        toast.innerHTML = (icons[type] || icons.info) + '<span>' + message + '</span>';
        container.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add('is-leaving');
            window.setTimeout(function () { toast.remove(); }, 220);
        }, 3800);
    }
    window.pmtShowToast = showToast;

    /* ================= 3. SCROLL REVEAL ================= */
    var revealTargets = Array.prototype.slice.call(document.querySelectorAll('.pmt-reveal'));
    if ('IntersectionObserver' in window && revealTargets.length) {
        var revealObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var delay = Math.min(revealTargets.indexOf(el) * 45, 260);
                window.setTimeout(function () { el.classList.add('is-visible'); }, delay);
                obs.unobserve(el);
            });
        }, { threshold: 0.06 });
        revealTargets.forEach(function (el) { revealObserver.observe(el); });
    } else {
        revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ================= 4. ANIMATED COUNTERS ================= */
    function animateCounter(el) {
        var target = parseFloat(el.getAttribute('data-count-to'));
        if (!isFinite(target)) return;
        var prefix = el.getAttribute('data-prefix') || '';
        var duration = 850;
        var startTime = null;

        function step(ts) {
            if (startTime === null) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(target * eased);
            el.textContent = prefix + current.toLocaleString('en-IN');
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = prefix + target.toLocaleString('en-IN');
            }
        }
        window.requestAnimationFrame(step);
    }

    var counters = document.querySelectorAll('.pmt-metric-value[data-count-to]');
    if (counters.length) {
        if ('IntersectionObserver' in window) {
            var counterObserver = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.4 });
            counters.forEach(function (el) { counterObserver.observe(el); });
        } else {
            counters.forEach(animateCounter);
        }
    }

    /* ================= 5. ROW DROPDOWN MANAGEMENT ================= */
    function closeMenu() {
        if (!activeMenu) return;
        activeMenu.classList.remove('pmt-open');
        if (activePlaceholder) activePlaceholder.appendChild(activeMenu);
        activeMenu = null;
        activePlaceholder = null;
        if (activeTrigger) {
            activeTrigger.setAttribute('aria-expanded', 'false');
            activeTrigger = null;
        }
    }

    document.querySelectorAll('.pmt-dropdown-trigger').forEach(function (button) {
        button.addEventListener('click', function (e) {
            e.stopPropagation();
            var dropdown = this.closest('.pmt-dropdown');
            var menu = dropdown.querySelector('.pmt-dropdown-menu');

            if (activeMenu === menu) {
                closeMenu();
                return;
            }
            closeMenu();

            activePlaceholder = dropdown;
            document.body.appendChild(menu);
            menu.classList.add('pmt-open');

            var rect = this.getBoundingClientRect();
            var menuWidth = menu.offsetWidth;
            var menuHeight = menu.offsetHeight;
            var gap = 8;
            var padding = 12;

            var left = rect.right - menuWidth;
            var top = rect.bottom + gap;

            left = Math.max(padding, Math.min(left, window.innerWidth - menuWidth - padding));

            if (top + menuHeight > window.innerHeight - padding) {
                top = rect.top - menuHeight - gap;
            }
            top = Math.max(padding, Math.min(top, window.innerHeight - menuHeight - padding));

            activeTrigger = this;
            this.setAttribute('aria-expanded', 'true');
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
            activeMenu = menu;
        });
    });

    document.addEventListener('click', closeMenu);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
    });

    /* ================= 6. CHECKBOX SELECTION / BULK BAR ================= */
    function getRowCheckboxes() {
        if (!tableBody) return [];
        return Array.prototype.slice.call(tableBody.querySelectorAll('.pmt-row-checkbox'));
    }

    function getVisibleRows() {
        if (!tableBody) return [];
        return Array.prototype.slice.call(tableBody.querySelectorAll('.pmt-row')).filter(function (row) {
            return !row.classList.contains('pmt-row-hidden');
        });
    }

    function toggleRowHighlight(row, highlight) {
        if (!row) return;
        row.classList.toggle('is-selected', highlight);
    }

    function updateBulkBarState() {
        var checked = getRowCheckboxes().filter(function (cb) { return cb.checked; });
        var count = checked.length;

        if (bulkCount) bulkCount.textContent = String(count);
        if (bulkBar) bulkBar.classList.toggle('pmt-hidden', count === 0);

        if (selectAllCheckbox) {
            var visible = getVisibleRows().map(function (row) { return row.querySelector('.pmt-row-checkbox'); }).filter(Boolean);
            var visibleChecked = visible.filter(function (cb) { return cb.checked; });

            if (visibleChecked.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (visibleChecked.length === visible.length) {
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
                var cb = row.querySelector('.pmt-row-checkbox');
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
            if (e.target.classList.contains('pmt-row-checkbox')) {
                var row = e.target.closest('.pmt-row');
                toggleRowHighlight(row, e.target.checked);
                updateBulkBarState();
            }
        });
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function () {
            getRowCheckboxes().forEach(function (cb) {
                cb.checked = false;
                toggleRowHighlight(cb.closest('.pmt-row'), false);
            });
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
            updateBulkBarState();
        });
    }

    /* ================= 7. BULK ACTIONS ================= */
    document.querySelectorAll('[data-pmt-bulk-action]').forEach(function (button) {
        button.addEventListener('click', function (e) {
            var action = e.currentTarget.getAttribute('data-pmt-bulk-action');
            var selectedCount = getRowCheckboxes().filter(function (cb) { return cb.checked; }).length;

            if (!selectedCount) return;

            if (action === 'export') {
                showToast('Preparing export for ' + selectedCount + ' payment(s)&#8230;'.replace('&#8230;', '…'), 'info');
            } else if (action === 'review') {
                showToast(selectedCount + ' payment(s) marked as reviewed.', 'success');
            } else if (action === 'archive') {
                showToast(selectedCount + ' payment(s) archived.', 'success');
            }
        });
    });

    /* ================= 8. STATUS NAV + QUICK FILTER CHIPS ================= */
    function applyStatusFilter(status) {
        currentStatusFilter = status;

        if (statusNav) {
            statusNav.querySelectorAll('.pmt-status-pill').forEach(function (pill) {
                pill.classList.toggle('is-active', pill.getAttribute('data-pmt-status') === status);
            });
        }
        if (chipRow) {
            chipRow.querySelectorAll('.pmt-chip').forEach(function (chip) {
                chip.classList.toggle('is-active', chip.getAttribute('data-pmt-chip') === status);
            });
        }

        performFiltering();
    }

    if (statusNav) {
        statusNav.addEventListener('click', function (e) {
            var pill = e.target.closest('.pmt-status-pill');
            if (!pill) return;
            applyStatusFilter(pill.getAttribute('data-pmt-status'));
        });
    }

    if (chipRow) {
        chipRow.addEventListener('click', function (e) {
            var chip = e.target.closest('.pmt-chip');
            if (!chip) return;
            applyStatusFilter(chip.getAttribute('data-pmt-chip'));
        });
    }

    /* ================= 9. CLIENT-SIDE SEARCH / FILTER / SORT ================= */
    function performFiltering() {
        if (!tableBody) return;

        var query = currentSearchTerm.toLowerCase().trim();
        var rows = Array.prototype.slice.call(tableBody.querySelectorAll('.pmt-row'));
        var visibleCount = 0;

        rows.forEach(function (row) {
            var status = (row.getAttribute('data-status') || '').toLowerCase();
            var haystack = (
                (row.getAttribute('data-transaction-id') || '') + ' ' +
                (row.getAttribute('data-order-id') || '') + ' ' +
                row.textContent
            ).toLowerCase();

            var matchesStatus = currentStatusFilter === 'all' || status === currentStatusFilter;
            var matchesSearch = !query || haystack.indexOf(query) !== -1;

            var isVisible = matchesStatus && matchesSearch;
            row.classList.toggle('pmt-row-hidden', !isVisible);

            if (!isVisible) {
                var cb = row.querySelector('.pmt-row-checkbox');
                if (cb) cb.checked = false;
            } else {
                visibleCount += 1;
            }
        });

        updateBulkBarState();
        checkEmptyState(visibleCount, rows.length);
    }

    function checkEmptyState(visibleCount, totalRows) {
        if (!tableCard) return;
        var wrap = tableCard.querySelector('.pmt-table-wrap');

        if (totalRows === 0) return; // handled by server-rendered {% empty %}

        var showNoResults = visibleCount === 0;

        if (wrap) wrap.style.display = showNoResults ? 'none' : '';
        if (noSearchResults) noSearchResults.classList.toggle('pmt-hidden', !showNoResults);
    }

    if (searchInput) {
        var searchDebounce = null;
        searchInput.addEventListener('input', function () {
            window.clearTimeout(searchDebounce);
            searchDebounce = window.setTimeout(function () {
                currentSearchTerm = searchInput.value;
                performFiltering();
            }, 220);
        });
    }

    if (methodFilter) methodFilter.addEventListener('change', performFiltering);
    if (providerFilter) providerFilter.addEventListener('change', performFiltering);

    if (sortFilter) {
        sortFilter.addEventListener('change', function () {
            var value = sortFilter.value;
            var rows = getVisibleRows();
            var allRows = Array.prototype.slice.call(tableBody.querySelectorAll('.pmt-row'));

            allRows.sort(function (a, b) {
                if (value === 'amount_high_low' || value === 'amount_low_high') {
                    var amtA = parseFloat((a.querySelector('.pmt-amount-cell') || {}).textContent.replace(/[^\d.]/g, '')) || 0;
                    var amtB = parseFloat((b.querySelector('.pmt-amount-cell') || {}).textContent.replace(/[^\d.]/g, '')) || 0;
                    return value === 'amount_high_low' ? amtB - amtA : amtA - amtB;
                }
                if (value === 'status') {
                    var sA = a.getAttribute('data-status') || '';
                    var sB = b.getAttribute('data-status') || '';
                    return sA.localeCompare(sB);
                }
                return 0; // newest/oldest depend on server ordering
            });

            if (value === 'oldest') allRows.reverse();

            allRows.forEach(function (row) { tableBody.appendChild(row); });
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function () {
            if (searchInput) searchInput.value = '';
            if (methodFilter) methodFilter.value = '';
            if (providerFilter) providerFilter.value = '';
            if (sortFilter) sortFilter.value = 'newest';
            currentSearchTerm = '';
            applyStatusFilter('all');
            showToast('Filters reset.', 'info');
        });
    }

    if (emptyResetBtn) {
        emptyResetBtn.addEventListener('click', function () {
            if (resetFiltersBtn) resetFiltersBtn.click();
        });
    }

    if (searchEmptyResetBtn) {
        searchEmptyResetBtn.addEventListener('click', function () {
            if (searchInput) searchInput.value = '';
            currentSearchTerm = '';
            applyStatusFilter('all');
        });
    }

    /* ================= 10. ADVANCED FILTER PANEL ================= */
    if (advancedFiltersBtn && advancedPanel) {
        advancedFiltersBtn.addEventListener('click', function () {
            var isHidden = advancedPanel.hasAttribute('hidden');
            if (isHidden) {
                advancedPanel.removeAttribute('hidden');
            } else {
                advancedPanel.setAttribute('hidden', '');
            }
            advancedFiltersBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        });
    }

    if (advancedResetBtn) {
        advancedResetBtn.addEventListener('click', function () {
            advancedPanel.querySelectorAll('input').forEach(function (input) { input.value = ''; });
            advancedPanel.querySelectorAll('select').forEach(function (select) { select.selectedIndex = 0; });
            showToast('Advanced filters reset.', 'info');
        });
    }

    if (advancedApplyBtn) {
        advancedApplyBtn.addEventListener('click', function () {
            showToast('Filters applied.', 'success');
            if (advancedPanel) advancedPanel.setAttribute('hidden', '');
            if (advancedFiltersBtn) advancedFiltersBtn.setAttribute('aria-expanded', 'false');
        });
    }

    /* ================= 11. COPY TO CLIPBOARD ================= */
    function copyToClipboard(value, triggerEl) {
        if (!value) {
            showToast('Nothing to copy.', 'info');
            return;
        }

        var finish = function () {
            if (triggerEl) {
                triggerEl.classList.add('is-copied');
                window.setTimeout(function () { triggerEl.classList.remove('is-copied'); }, 1400);
            }
            showToast('Copied "' + value + '" to clipboard.', 'success');
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(finish).catch(finish);
        } else {
            var temp = document.createElement('textarea');
            temp.value = value;
            temp.style.position = 'fixed';
            temp.style.opacity = '0';
            document.body.appendChild(temp);
            temp.select();
            try { document.execCommand('copy'); } catch (err) { /* no-op */ }
            document.body.removeChild(temp);
            finish();
        }
    }

    document.addEventListener('click', function (e) {
        var copyTrigger = e.target.closest('[data-pmt-copy]');
        if (!copyTrigger) return;
        copyToClipboard(copyTrigger.getAttribute('data-pmt-copy'), copyTrigger);
    });

    /* ================= 12. QUICK VIEW DRAWER ================= */
    function openQuickView(trigger) {
        if (!quickViewOverlay) return;

        var fields = {
            pmtQvTransactionId: trigger.getAttribute('data-transaction-id') || '—',
            pmtQvOrderId: trigger.getAttribute('data-order-id') || '—',
            pmtQvBuyer: trigger.getAttribute('data-buyer') || '—',
            pmtQvSeller: trigger.getAttribute('data-seller') || '—',
            pmtQvMethod: trigger.getAttribute('data-method') || '—',
            pmtQvProvider: trigger.getAttribute('data-provider') || '—',
            pmtQvDate: trigger.getAttribute('data-date') || '—'
        };

        Object.keys(fields).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = fields[id];
        });

        var amount = trigger.getAttribute('data-amount') || 'Rs. 0';
        var amountEl = document.getElementById('pmtQvAmount');
        if (amountEl) amountEl.textContent = amount;

        var refund = trigger.getAttribute('data-refund') || '0';
        var refundEl = document.getElementById('pmtQvRefund');
        if (refundEl) refundEl.textContent = (parseFloat(refund) > 0) ? ('Rs. ' + refund) : 'No Refund';

        var statusSlug = trigger.getAttribute('data-status-slug') || 'pending';
        var statusLabel = trigger.getAttribute('data-status') || 'Pending';
        var statusBadge = document.getElementById('pmtQvStatusBadge');
        if (statusBadge) {
            statusBadge.textContent = statusLabel;
            statusBadge.className = 'pmt-badge pmt-badge-' + statusSlug;
        }

        var orderId = trigger.getAttribute('data-order-id');
        var viewOrderBtn = document.getElementById('pmtQvViewOrderBtn');
        if (viewOrderBtn) {
            viewOrderBtn.onclick = function () {
                if (orderId) {
                    showToast('Opening order #' + orderId + '&#8230;'.replace('&#8230;', '…'), 'info');
                }
            };
        }

        var viewBuyerBtn = document.getElementById('pmtQvViewBuyerBtn');
        if (viewBuyerBtn) {
            viewBuyerBtn.onclick = function () {
                showToast('Opening buyer profile\u2026', 'info');
            };
        }

        quickViewOverlay.classList.remove('pmt-hidden');
        window.requestAnimationFrame(function () {
            quickViewOverlay.classList.add('is-open');
        });
        document.body.style.overflow = 'hidden';
    }

    function closeQuickView() {
        if (!quickViewOverlay) return;
        quickViewOverlay.classList.remove('is-open');
        window.setTimeout(function () {
            quickViewOverlay.classList.add('pmt-hidden');
            document.body.style.overflow = '';
        }, 260);
    }

    document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-pmt-quickview]');
        if (trigger) {
            openQuickView(trigger);
        }
    });

    if (quickViewClose) quickViewClose.addEventListener('click', closeQuickView);
    if (quickViewOverlay) {
        quickViewOverlay.addEventListener('click', function (e) {
            if (e.target === quickViewOverlay) closeQuickView();
        });
    }

    /* ================= 13. EXPORT MODAL ================= */
    if (exportConfirmBtn) {
        exportConfirmBtn.addEventListener('click', function () {
            if (exportConfirmBtn.classList.contains('is-loading')) return;

            var originalHTML = exportConfirmBtn.innerHTML;
            exportConfirmBtn.classList.add('is-loading');
            exportConfirmBtn.disabled = true;
            exportConfirmBtn.innerHTML = '<span class="pmt-btn-label">Preparing\u2026</span>';

            window.setTimeout(function () {
                exportConfirmBtn.classList.remove('is-loading');
                exportConfirmBtn.disabled = false;
                exportConfirmBtn.innerHTML = originalHTML;
                closeAllModals();
                showToast('Export started \u2014 you\u2019ll be notified when it\u2019s ready.', 'success');
            }, 900);
        });
    }

    /* ================= 14. GENERIC MODAL OPEN/CLOSE ================= */
    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('pmt-hidden');
        document.body.style.overflow = 'hidden';
        var focusable = modal.querySelector('.pmt-modal-close');
        if (focusable) focusable.focus();
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add('pmt-hidden');
        document.body.style.overflow = '';
    }

    function closeAllModals() {
        document.querySelectorAll('.pmt-modal-overlay').forEach(function (m) {
            if (!m.classList.contains('pmt-hidden')) closeModal(m);
        });
    }

    document.querySelectorAll('[data-pmt-open-modal]').forEach(function (trigger) {
        trigger.addEventListener('click', function () {
            openModal(trigger.getAttribute('data-pmt-open-modal'));
        });
    });

    document.querySelectorAll('[data-pmt-close-modal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            closeModal(btn.closest('.pmt-modal-overlay'));
        });
    });

    document.querySelectorAll('.pmt-modal-overlay').forEach(function (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal(overlay);
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        closeAllModals();
        if (quickViewOverlay && quickViewOverlay.classList.contains('is-open')) closeQuickView();
    });

    /* Generic data-pmt-toast trigger (More menu / row action placeholders) */
    document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-pmt-toast]');
        if (!trigger) return;
        var type = trigger.getAttribute('data-pmt-toast') || 'info';
        var message = trigger.getAttribute('data-pmt-toast-msg') || 'Done.';
        showToast(message, type);
    });

    /* ================= MORE DROPDOWN (header) ================= */
    (function initMoreDropdown() {
        var dropdown = document.getElementById('pmtMoreDropdown');
        var trigger = document.getElementById('pmtMoreTrigger');
        if (!dropdown || !trigger) return;

        function close() {
            dropdown.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var willOpen = !dropdown.classList.contains('is-open');
            close();
            if (willOpen) {
                dropdown.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        var menu = dropdown.querySelector('.pmt-dropdown-menu');
        if (menu) menu.addEventListener('click', function (e) { e.stopPropagation(); });

        document.addEventListener('click', close);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    })();

    /* ================= 16. BUTTON RIPPLE FEEDBACK ================= */
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

            window.setTimeout(function () { ripple.remove(); }, 600);
        });
    }

    document.querySelectorAll('.pmt-btn-primary, .pmt-btn-danger, .pmt-page-btn, .pmt-status-pill, .pmt-chip').forEach(bindRipple);

    /* ================= 17. INIT ================= */
    updateBulkBarState();
});