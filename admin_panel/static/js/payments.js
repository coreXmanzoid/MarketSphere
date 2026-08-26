/**
 * MarketSphere Admin: Payment Management
 * Handles frontend interactions, UI state, and component behaviors.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    /* ==========================================================================
       1. TOAST NOTIFICATION SYSTEM
       ========================================================================== */
    const toastContainer = document.getElementById('pmtToastContainer');

    function showToast(message, type = 'info') {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'pmt-toast';
        toast.setAttribute('role', 'alert');

        // Simple SVG icon for toast
        const icon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`;

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Bind declarative toast triggers
    document.querySelectorAll('[data-pmt-toast]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const msg = this.getAttribute('data-pmt-toast-msg') || 'Action completed successfully.';
            showToast(msg);
        });
    });


    /* ==========================================================================
       2. COPY TO CLIPBOARD
       ========================================================================== */
    document.querySelectorAll('[data-pmt-copy]').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const textToCopy = this.getAttribute('data-pmt-copy');
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast(`Copied: ${textToCopy}`);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        });
    });


    /* ==========================================================================
       3. DROPDOWN MENUS
       ========================================================================== */
    let openDropdown = null;

    function closeAllDropdowns() {
        if (openDropdown) {
            openDropdown.classList.remove('is-open');
            const trigger = openDropdown.previousElementSibling;
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
            openDropdown = null;
        }
    }

    document.querySelectorAll('.pmt-dropdown-trigger, #pmtMoreTrigger').forEach(trigger => {
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const menu = this.nextElementSibling;
            const isOpen = menu.classList.contains('is-open');

            closeAllDropdowns(); // Close others

            if (!isOpen) {
                menu.classList.add('is-open');
                this.setAttribute('aria-expanded', 'true');
                openDropdown = menu;
            }
        });
    });

    // Close dropdowns on outside click or Escape key
    document.addEventListener('click', closeAllDropdowns);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAllDropdowns();
    });


    /* ==========================================================================
       4. BULK SELECTION & TABLE CHECKBOXES
       ========================================================================== */
    const selectAllCheckbox = document.getElementById('pmtSelectAll');
    const rowCheckboxes = document.querySelectorAll('.pmt-row-checkbox');
    const bulkBar = document.getElementById('pmtBulkBar');
    const bulkCountDisplay = document.getElementById('pmtBulkCount');
    const clearSelectionBtn = document.getElementById('pmtClearSelectionBtn');

    function updateBulkActionUI() {
        if (!bulkBar || !selectAllCheckbox) return;

        const checkedBoxes = document.querySelectorAll('.pmt-row-checkbox:checked');
        const count = checkedBoxes.length;
        const total = rowCheckboxes.length;

        if (count > 0) {
            bulkCountDisplay.textContent = count;
            bulkBar.classList.remove('pmt-hidden');
        } else {
            bulkBar.classList.add('pmt-hidden');
        }

        selectAllCheckbox.checked = (count === total && total > 0);
        selectAllCheckbox.indeterminate = (count > 0 && count < total);
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            const isChecked = this.checked;
            rowCheckboxes.forEach(cb => {
                // Only select visible rows if filtering is applied
                const row = cb.closest('tr');
                if (!row.classList.contains('pmt-hidden')) {
                    cb.checked = isChecked;
                    if (isChecked) row.style.backgroundColor = 'var(--pmt-primary-light)';
                    else row.style.backgroundColor = '';
                }
            });
            updateBulkActionUI();
        });
    }

    rowCheckboxes.forEach(cb => {
        cb.addEventListener('change', function () {
            const row = this.closest('tr');
            if (this.checked) row.style.backgroundColor = 'var(--pmt-primary-light)';
            else row.style.backgroundColor = '';
            updateBulkActionUI();
        });
    });

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function () {
            rowCheckboxes.forEach(cb => {
                cb.checked = false;
                cb.closest('tr').style.backgroundColor = '';
            });
            updateBulkActionUI();
        });
    }


    /* ==========================================================================
       5. ADVANCED FILTER PANEL
       ========================================================================== */
    const advancedFiltersBtn = document.getElementById('pmtAdvancedFiltersBtn');
    const advancedFilterPanel = document.getElementById('pmtAdvancedFilterPanel');
    const advancedResetBtn = document.getElementById('pmtAdvancedResetBtn');
    const advancedApplyBtn = document.getElementById('pmtAdvancedApplyBtn');

    if (advancedFiltersBtn && advancedFilterPanel) {
        advancedFiltersBtn.addEventListener('click', function () {
            const isHidden = advancedFilterPanel.hasAttribute('hidden');
            if (isHidden) {
                advancedFilterPanel.removeAttribute('hidden');
                this.setAttribute('aria-expanded', 'true');
                this.classList.add('is-active');
            } else {
                advancedFilterPanel.setAttribute('hidden', '');
                this.setAttribute('aria-expanded', 'false');
                this.classList.remove('is-active');
            }
        });
    }

    if (advancedResetBtn) {
        advancedResetBtn.addEventListener('click', function () {
            const inputs = advancedFilterPanel.querySelectorAll('input, select');
            inputs.forEach(input => input.value = '');
            showToast('Advanced filters reset.');
        });
    }

    if (advancedApplyBtn) {
        advancedApplyBtn.addEventListener('click', function () {
            showToast('Filters applied successfully.');
            advancedFilterPanel.setAttribute('hidden', '');
            advancedFiltersBtn.setAttribute('aria-expanded', 'false');
        });
    }


    /* ==========================================================================
       6. QUICK VIEW DRAWER
       ========================================================================== */
    const quickViewOverlay = document.getElementById('pmtQuickViewOverlay');
    const quickViewClose = document.getElementById('pmtQuickViewClose');

    // DOM nodes to populate
    const qvStatusBadge = document.getElementById('pmtQvStatusBadge');
    const qvAmount = document.getElementById('pmtQvAmount');
    const qvTransactionId = document.getElementById('pmtQvTransactionId');
    const qvOrderId = document.getElementById('pmtQvOrderId');
    const qvBuyer = document.getElementById('pmtQvBuyer');
    const qvSeller = document.getElementById('pmtQvSeller');
    const qvMethod = document.getElementById('pmtQvMethod');
    const qvProvider = document.getElementById('pmtQvProvider');
    const qvRefund = document.getElementById('pmtQvRefund');
    const qvDate = document.getElementById('pmtQvDate');

    function closeQuickView() {
        if (quickViewOverlay) {
            quickViewOverlay.classList.add('pmt-hidden');
        }
    }

    document.querySelectorAll('[data-pmt-quickview]').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            closeAllDropdowns();
            
            // Extract data
            const txnId = this.getAttribute('data-transaction-id');
            const orderId = this.getAttribute('data-order-id');
            const buyer = this.getAttribute('data-buyer');
            const seller = this.getAttribute('data-seller');
            const amount = this.getAttribute('data-amount');
            const method = this.getAttribute('data-method');
            const provider = this.getAttribute('data-provider');
            const status = this.getAttribute('data-status');
            const statusSlug = this.getAttribute('data-status-slug');
            const refund = this.getAttribute('data-refund');
            const date = this.getAttribute('data-date');

            // Populate drawer
            if (qvStatusBadge) {
                qvStatusBadge.textContent = status;
                qvStatusBadge.className = `pmt-badge pmt-badge-${statusSlug}`;
            }
            if (qvAmount) qvAmount.textContent = amount;
            if (qvTransactionId) qvTransactionId.textContent = txnId;
            if (qvOrderId) qvOrderId.textContent = `#MS-${orderId}`;
            if (qvBuyer) qvBuyer.textContent = buyer;
            if (qvSeller) qvSeller.textContent = seller;
            if (qvMethod) qvMethod.textContent = method;
            if (qvProvider) qvProvider.textContent = provider;
            if (qvRefund) qvRefund.textContent = refund > 0 ? `Rs. ${refund}` : '—';
            if (qvDate) qvDate.textContent = date;

            // Open drawer
            quickViewOverlay.classList.remove('pmt-hidden');
        });
    });

    if (quickViewClose) quickViewClose.addEventListener('click', closeQuickView);
    if (quickViewOverlay) {
        quickViewOverlay.addEventListener('click', function (e) {
            if (e.target === quickViewOverlay) closeQuickView();
        });
    }


    /* ==========================================================================
       7. EXPORT MODAL
       ========================================================================== */
    const exportModalOverlay = document.getElementById('pmtExportModal');
    const exportConfirmBtn = document.getElementById('pmtExportConfirmBtn');

    function closeExportModal() {
        if (exportModalOverlay) {
            exportModalOverlay.classList.add('pmt-hidden');
        }
    }

    document.querySelectorAll('[data-pmt-open-modal="pmtExportModal"]').forEach(btn => {
        btn.addEventListener('click', function () {
            exportModalOverlay.classList.remove('pmt-hidden');
        });
    });

    document.querySelectorAll('[data-pmt-close-modal]').forEach(btn => {
        btn.addEventListener('click', closeExportModal);
    });

    if (exportModalOverlay) {
        exportModalOverlay.addEventListener('click', function (e) {
            if (e.target === exportModalOverlay) closeExportModal();
        });
    }

    if (exportConfirmBtn) {
        exportConfirmBtn.addEventListener('click', function () {
            // Simulate loading state
            const originalText = this.innerHTML;
            this.innerHTML = `<svg class="pmt-spinner" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Processing...`;
            this.style.pointerEvents = 'none';

            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.pointerEvents = 'auto';
                closeExportModal();
                showToast('Export generated successfully.', 'success');
            }, 1500);
        });
    }


    /* ==========================================================================
       8. UI STATUS FILTER SIMULATION (Frontend Demo interaction)
       ========================================================================== */
    const statusPills = document.querySelectorAll('.pmt-status-pill');
    const filterChips = document.querySelectorAll('.pmt-chip');
    
    function handleQuickFilter(type, elements) {
        elements.forEach(el => {
            el.addEventListener('click', function () {
                elements.forEach(c => c.classList.remove('is-active'));
                this.classList.add('is-active');
                
                // Simulate frontend filtering visually
                const status = this.getAttribute(`data-pmt-${type}`);
                filterTableRows(status);
            });
        });
    }

    function filterTableRows(targetStatus) {
        const rows = document.querySelectorAll('.pmt-row');
        const emptyState = document.getElementById('pmtNoSearchResults');
        const defaultEmpty = document.querySelector('.pmt-empty-row');
        let visibleCount = 0;

        if (!rows.length) return;

        rows.forEach(row => {
            const rowStatus = row.getAttribute('data-status');
            if (targetStatus === 'all' || rowStatus === targetStatus) {
                row.classList.remove('pmt-hidden');
                visibleCount++;
            } else {
                row.classList.add('pmt-hidden');
                // uncheck if hidden
                const cb = row.querySelector('.pmt-row-checkbox');
                if (cb && cb.checked) {
                    cb.checked = false;
                    row.style.backgroundColor = '';
                }
            }
        });

        // Toggle Empty states
        if (visibleCount === 0) {
            if (defaultEmpty) defaultEmpty.classList.add('pmt-hidden');
            if (emptyState) emptyState.classList.remove('pmt-hidden');
        } else {
            if (emptyState) emptyState.classList.add('pmt-hidden');
        }

        updateBulkActionUI();
    }

    handleQuickFilter('status', statusPills);
    handleQuickFilter('chip', filterChips);


    /* ==========================================================================
       9. ANIMATED NUMBER COUNTERS
       ========================================================================== */
    const counters = document.querySelectorAll('[data-count-to]');
    
    function animateCounters() {
        counters.forEach(counter => {
            const targetStr = counter.getAttribute('data-count-to').replace(/,/g, '');
            const target = parseFloat(targetStr);
            const prefix = counter.getAttribute('data-prefix') || '';
            
            if (isNaN(target)) return;
            
            const duration = 1500; // ms
            const frames = 60;
            const stepTime = Math.abs(Math.floor(duration / frames));
            const isCurrency = target > 1000 && targetStr.indexOf('.') === -1; 
            
            let current = 0;
            const increment = target / frames;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                // Format output
                let output = isCurrency ? Math.floor(current).toLocaleString('en-US') : Math.floor(current);
                counter.textContent = prefix + output;
            }, stepTime);
        });
    }

    // Run animation once on load
    animateCounters();


    /* ==========================================================================
       10. GLOBAL ACCESSIBILITY & ESCAPE HANDLERS
       ========================================================================== */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeExportModal();
            closeQuickView();
            // Dropdowns are already handled in section 3
        }
    });
});