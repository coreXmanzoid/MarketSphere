/* =========================================================================
   MARKETSPHERE ADMIN — BUYER DETAIL (buyer_detail.js)
   Frontend-only interactions for admin_panel/templates/user_management/
   buyer/detail.html. No fetch(), no AJAX, no backend calls, no external
   libraries — matches the pattern already used across the admin shell
   (see admin_panel/static/js/admin_dashboard.js, overview.js, buyers.js).

   Sections:
     1. DOM Cache
     2. Toast Helper
     3. Scroll Reveal
     4. Animated Counters
     5. Score Ring + Bar Chart Animation
     6. Tab Navigation
     7. Dropdown Menus (header "more" + row action menus)
     8. Ripple Effect
     9. Orders Table: Search / Sort
    10. Timeline Filtering
    11. Admin Notes: Add / Cancel / Save
    12. Confirm Action Modal
    13. Image Preview Modal
    14. Header / Security / Actions Panel Buttons
    15. Back Button
    16. Init
   ========================================================================= */

(function () {
    'use strict';

    var page = document.getElementById('bdPage');
    if (!page) return; // not on the buyer detail page

    /* ================= 1. DOM CACHE ================= */
    var toastContainer = document.getElementById('bdToastContainer');

    /* ================= 2. TOAST HELPER ================= */
    function showToast(message, type) {
        if (!toastContainer || !message) return;

        var toast = document.createElement('div');
        toast.className = 'bd-toast bd-toast-' + (type || 'info');
        toast.setAttribute('role', 'status');

        var iconMarkup = type === 'success'
            ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>'
            : type === 'danger'
                ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
                : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

        toast.innerHTML = iconMarkup + '<span></span>';
        toast.querySelector('span').textContent = message;

        toastContainer.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add('is-leaving');
            toast.addEventListener('animationend', function () {
                toast.remove();
            }, { once: true });
        }, 3600);
    }

    /* ================= 3. SCROLL REVEAL ================= */
    function initScrollReveal() {
        var targets = Array.prototype.slice.call(document.querySelectorAll('.bd-reveal'));
        if (!targets.length) return;

        if (!('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;
                var delay = Math.min(targets.indexOf(el) * 30, 220);

                window.setTimeout(function () {
                    el.classList.add('is-visible');
                }, delay);

                obs.unobserve(el);
            });
        }, { threshold: 0.06 });

        targets.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 4. ANIMATED COUNTERS ================= */
    function animateCounter(el) {
        var target = parseFloat(el.getAttribute('data-count-to'));
        if (!isFinite(target)) return;

        var prefix = el.getAttribute('data-prefix') || '';
        var duration = 900;
        var startTime = null;

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function step(timestamp) {
            if (startTime === null) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var eased = easeOutCubic(progress);
            var current = Math.round(target * eased);

            el.textContent = prefix + current.toLocaleString('en-US');

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = prefix + target.toLocaleString('en-US');
            }
        }

        window.requestAnimationFrame(step);
    }

    function initCounters() {
        var counters = document.querySelectorAll('.bd-stat-value[data-count-to]');
        if (!counters.length) return;

        if (!('IntersectionObserver' in window)) {
            counters.forEach(animateCounter);
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        counters.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 5. SCORE RING + BAR CHART ANIMATION ================= */
    function initScoreRing() {
        var ring = document.getElementById('bdScoreRing');
        if (!ring) return;

        if (!('IntersectionObserver' in window)) {
            ring.classList.add('is-animated');
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    ring.classList.add('is-animated');
                    obs.unobserve(ring);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(ring);
    }

    function initBarChart() {
        var chart = document.getElementById('bdSpendChart');
        if (!chart) return;

        if (!('IntersectionObserver' in window)) {
            chart.classList.add('is-animated');
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    chart.classList.add('is-animated');
                    obs.unobserve(chart);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(chart);
    }

    /* ================= 6. TAB NAVIGATION ================= */
    var tabsNav = document.getElementById('bdTabs');
    var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.bd-tab'));
    var tabPanels = Array.prototype.slice.call(document.querySelectorAll('.bd-tab-panel'));

    function activateTab(tabName) {
        tabButtons.forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tabName);
        });

        tabPanels.forEach(function (panel) {
            panel.classList.toggle('is-active', panel.getAttribute('data-panel') === tabName);
        });
    }

    function initTabs() {
        if (!tabsNav) return;

        tabsNav.addEventListener('click', function (e) {
            var btn = e.target.closest('.bd-tab');
            if (!btn) return;
            activateTab(btn.getAttribute('data-tab'));
        });

        // "View All Orders" style links inside panels jump to another tab.
        document.addEventListener('click', function (e) {
            var jumpBtn = e.target.closest('[data-goto-tab]');
            if (!jumpBtn) return;

            var targetTab = jumpBtn.getAttribute('data-goto-tab');
            activateTab(targetTab);

            var targetButton = tabButtons.find(function (btn) {
                return btn.getAttribute('data-tab') === targetTab;
            });
            if (targetButton) {
                targetButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
    }

    /* ================= 7. DROPDOWN MENUS ================= */
    function closeAllDropdowns(exceptEl) {
        document.querySelectorAll('.bd-dropdown.is-open').forEach(function (dropdown) {
            if (dropdown === exceptEl) return;
            dropdown.classList.remove('is-open');
            var trigger = dropdown.querySelector('.bd-dropdown-trigger, #bdMoreTrigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    function initDropdowns() {
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest('.bd-dropdown-trigger, #bdMoreTrigger');

            if (trigger) {
                e.stopPropagation();
                var dropdown = trigger.closest('.bd-dropdown');
                var isOpen = dropdown.classList.contains('is-open');

                closeAllDropdowns(dropdown);

                dropdown.classList.toggle('is-open', !isOpen);
                trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
                return;
            }

            if (!e.target.closest('.bd-dropdown-menu')) {
                closeAllDropdowns();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllDropdowns();
        });
    }

    /* ================= 8. RIPPLE EFFECT ================= */
    function bindRipple(el) {
        el.addEventListener('click', function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement('span');
            var size = Math.max(rect.width, rect.height);

            ripple.className = 'bd-ripple';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

            el.style.position = el.style.position || 'relative';
            el.style.overflow = 'hidden';
            el.appendChild(ripple);

            window.requestAnimationFrame(function () {
                ripple.style.transition = 'transform 0.5s ease, opacity 0.6s ease';
                ripple.style.transform = 'scale(2.4)';
                ripple.style.opacity = '0';
            });

            window.setTimeout(function () {
                ripple.remove();
            }, 600);
        });
    }

    function initRipples() {
        document.querySelectorAll('.bd-action-btn, .bd-stat-card, .bd-sec-card').forEach(bindRipple);
    }

    /* ================= 9. ORDERS TABLE: SEARCH / SORT ================= */
    function initOrdersTable() {
        var searchInput = document.getElementById('bdOrdersSearch');
        var tableBody = document.getElementById('bdOrdersTableBody');
        var emptyState = document.getElementById('bdOrdersEmpty');
        var table = document.getElementById('bdOrdersTable');

        if (!tableBody) return;

        function applySearch() {
            var query = (searchInput ? searchInput.value : '').toLowerCase().trim();
            var rows = Array.prototype.slice.call(tableBody.querySelectorAll('tr'));
            var visibleCount = 0;

            rows.forEach(function (row) {
                var haystack = (row.getAttribute('data-search') || row.textContent).toLowerCase();
                var matches = !query || haystack.indexOf(query) !== -1;
                row.classList.toggle('bd-row-hidden', !matches);
                if (matches) visibleCount += 1;
            });

            if (emptyState) {
                emptyState.classList.toggle('is-visible', visibleCount === 0);
            }
        }

        if (searchInput) {
            searchInput.addEventListener('input', applySearch);
        }

        // Column sorting (client-side, purely for UI affordance)
        if (table) {
            table.querySelectorAll('th[data-sort]').forEach(function (th) {
                th.addEventListener('click', function () {
                    var key = th.getAttribute('data-sort');
                    var currentDir = th.classList.contains('is-sorted-asc') ? 'asc'
                        : th.classList.contains('is-sorted-desc') ? 'desc' : null;
                    var nextDir = currentDir === 'asc' ? 'desc' : 'asc';

                    table.querySelectorAll('th[data-sort]').forEach(function (otherTh) {
                        otherTh.classList.remove('is-sorted-asc', 'is-sorted-desc');
                    });
                    th.classList.add(nextDir === 'asc' ? 'is-sorted-asc' : 'is-sorted-desc');

                    var columnIndex = Array.prototype.indexOf.call(th.parentElement.children, th);
                    var rows = Array.prototype.slice.call(tableBody.querySelectorAll('tr'));

                    rows.sort(function (rowA, rowB) {
                        var cellA = rowA.children[columnIndex] ? rowA.children[columnIndex].textContent.trim() : '';
                        var cellB = rowB.children[columnIndex] ? rowB.children[columnIndex].textContent.trim() : '';

                        var numA = parseFloat(cellA.replace(/[^0-9.\-]/g, ''));
                        var numB = parseFloat(cellB.replace(/[^0-9.\-]/g, ''));

                        var compareResult;
                        if (!isNaN(numA) && !isNaN(numB) && key !== 'date') {
                            compareResult = numA - numB;
                        } else if (key === 'date') {
                            compareResult = new Date(cellA) - new Date(cellB);
                        } else {
                            compareResult = cellA.localeCompare(cellB);
                        }

                        return nextDir === 'asc' ? compareResult : -compareResult;
                    });

                    rows.forEach(function (row) { tableBody.appendChild(row); });
                });
            });
        }
    }

    /* ================= 10. TIMELINE FILTERING ================= */
    function initTimelineFilters() {
        var filterBar = document.getElementById('bdTimelineFilters');
        var timeline = document.getElementById('bdTimeline');
        if (!filterBar || !timeline) return;

        var items = Array.prototype.slice.call(timeline.querySelectorAll('.bd-timeline-item'));

        filterBar.addEventListener('click', function (e) {
            var pill = e.target.closest('.bd-pill');
            if (!pill) return;

            filterBar.querySelectorAll('.bd-pill').forEach(function (p) {
                p.classList.toggle('is-active', p === pill);
            });

            var filter = pill.getAttribute('data-filter');

            items.forEach(function (item) {
                var matches = filter === 'all' || item.getAttribute('data-type') === filter;
                item.classList.toggle('bd-timeline-hidden', !matches);
            });
        });
    }

    /* ================= 11. ADMIN NOTES ================= */
    function initAdminNotes() {
        var addBtn = document.getElementById('bdAddNoteBtn');
        var composer = document.getElementById('bdNoteComposer');
        var input = document.getElementById('bdNoteInput');
        var prioritySelect = document.getElementById('bdNotePriority');
        var cancelBtn = document.getElementById('bdCancelNoteBtn');
        var saveBtn = document.getElementById('bdSaveNoteBtn');
        var notesList = document.getElementById('bdNotesList');

        if (!addBtn || !composer) return;

        function openComposer() {
            composer.classList.remove('is-hidden');
            addBtn.classList.add('is-hidden');
            if (input) input.focus();
        }

        function closeComposer() {
            composer.classList.add('is-hidden');
            addBtn.classList.remove('is-hidden');
            if (input) input.value = '';
            if (prioritySelect) prioritySelect.value = 'normal';
        }

        addBtn.addEventListener('click', openComposer);
        if (cancelBtn) cancelBtn.addEventListener('click', closeComposer);

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                var text = input ? input.value.trim() : '';

                if (!text) {
                    showToast('Please write a note before saving.', 'danger');
                    if (input) input.focus();
                    return;
                }

                var priority = prioritySelect ? prioritySelect.value : 'normal';
                var priorityLabel = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Normal';
                var priorityClass = priority === 'high' ? 'c-danger' : priority === 'low' ? 'c-muted' : 'c-info';

                var now = new Date();
                var dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    + ' \u00b7 ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                var noteCard = document.createElement('div');
                noteCard.className = 'bd-note-card';
                noteCard.innerHTML =
                    '<div class="bd-note-head">' +
                    '<span class="bd-note-avatar">A</span>' +
                    '<div class="bd-note-meta"><strong>Admin</strong><span>' + dateStr + '</span></div>' +
                    '<span class="bd-badge ' + priorityClass + '">' + priorityLabel + '</span>' +
                    '</div>' +
                    '<p class="bd-note-content"></p>' +
                    '<div class="bd-note-actions">' +
                    '<button type="button" class="bd-btn bd-btn-ghost bd-btn-sm" data-toast="Editing notes isn\u2019t available yet.">Edit</button>' +
                    '<button type="button" class="bd-btn bd-btn-ghost bd-btn-sm c-danger" data-toast="Deleting notes isn\u2019t available yet.">Delete</button>' +
                    '</div>';

                noteCard.querySelector('.bd-note-content').textContent = text;

                if (notesList) {
                    notesList.insertBefore(noteCard, notesList.firstChild);
                }

                closeComposer();
                showToast('Note added successfully.', 'success');
            });
        }
    }

    /* ================= 12. CONFIRM ACTION MODAL ================= */
    var confirmOverlay = document.getElementById('bdConfirmModalOverlay');
    var confirmTitleEl = document.getElementById('bdConfirmModalTitle');
    var confirmTextEl = document.getElementById('bdConfirmModalText');
    var confirmCancelBtn = document.getElementById('bdConfirmModalCancel');
    var confirmConfirmBtn = document.getElementById('bdConfirmModalConfirm');
    var pendingConfirmCallback = null;

    function openConfirmModal(title, text, onConfirm) {
        if (!confirmOverlay) return;

        if (confirmTitleEl) confirmTitleEl.textContent = title;
        if (confirmTextEl) confirmTextEl.textContent = text;
        pendingConfirmCallback = onConfirm;

        confirmOverlay.classList.remove('is-hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeConfirmModal() {
        if (!confirmOverlay) return;
        confirmOverlay.classList.add('is-hidden');
        document.body.style.overflow = '';
        pendingConfirmCallback = null;
    }

    function initConfirmModal() {
        if (!confirmOverlay) return;

        if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirmModal);

        confirmOverlay.addEventListener('click', function (e) {
            if (e.target === confirmOverlay) closeConfirmModal();
        });

        if (confirmConfirmBtn) {
            confirmConfirmBtn.addEventListener('click', function () {
                var callback = pendingConfirmCallback;
                closeConfirmModal();
                if (typeof callback === 'function') callback();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && confirmOverlay && !confirmOverlay.classList.contains('is-hidden')) {
                closeConfirmModal();
            }
        });
    }

    /* ================= 13. IMAGE PREVIEW MODAL ================= */
    function initImageModal() {
        var trigger = document.getElementById('bdAvatarTrigger');
        var overlay = document.getElementById('bdImageModalOverlay');
        var closeBtn = document.getElementById('bdImageModalClose');

        if (!trigger || !overlay) return;

        function openModal() {
            overlay.classList.remove('is-hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            overlay.classList.add('is-hidden');
            document.body.style.overflow = '';
        }

        trigger.addEventListener('click', openModal);
        trigger.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal();
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !overlay.classList.contains('is-hidden')) {
                closeModal();
            }
        });
    }

    /* ================= 14. HEADER / SECURITY / ACTIONS PANEL BUTTONS ================= */
    function setButtonLoading(btn, isLoading, workingLabel) {
        if (!btn) return;
        var label = btn.querySelector('.bd-btn-label');

        if (isLoading) {
            btn.classList.add('is-loading');
            btn.disabled = true;
            if (label) {
                btn.dataset.originalLabel = label.textContent;
                label.textContent = workingLabel || 'Working\u2026';
            }
        } else {
            btn.classList.remove('is-loading');
            btn.disabled = false;
            if (label && btn.dataset.originalLabel) {
                label.textContent = btn.dataset.originalLabel;
            }
        }
    }
    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    }
    function initHeaderActions() {
        var statusBadge = document.getElementById('bdStatusBadge');

        var sendEmailBtn = document.getElementById('bdSendEmailBtn');
        var userId = document.querySelector(".bd-header-actions").dataset.userId;

        if (sendEmailBtn) {
            sendEmailBtn.addEventListener('click', function () {
                showToast('Opening email composer for Ayesha Khan\u2026', 'info');
            });
        }

        const resetPwBtns = [
            document.getElementById('bdResetPasswordBtn'),
            document.getElementById('bdSecResetPasswordBtn'),
            document.getElementById('pwdresetemail')
        ].filter(Boolean);

        resetPwBtns.forEach(button => {
            button.addEventListener('click', async function () {
                try {
                    const response = await fetch(`/admin-db/user/buyers/${userId}/reset-password/`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCSRFToken(),
                        }
                    });

                    const data = await response.json();

                    if (data.success) {
                        showToast(data.message, "success");
                    } else {
                        showToast(data.error || "Unable to send password reset email.", "error");
                    }

                } catch (error) {
                    console.error(error);
                    showToast("Something went wrong.", "error");
                }

            });
        });

        var suspendBtn = document.getElementById('bdSuspendBtn');
        if (suspendBtn) {
            suspendBtn.addEventListener('click', function () {

                if (suspendBtn.classList.contains('is-loading')) return;

                openConfirmModal(
                    'Suspend this buyer?',
                    'Ayesha Khan will temporarily lose access to her account until unsuspended.',
                    async function () {

                        setButtonLoading(suspendBtn, true, 'Suspending…');

                        try {

                            const formData = new FormData();
                            formData.append("userId", userId);
                            formData.append("state", "SUSPENDED");

                            const response = await fetch("/admin-db/change-account-state/", {
                                method: "POST",
                                headers: {
                                    "X-CSRFToken": getCSRFToken()
                                },
                                body: formData
                            });

                            const data = await response.json();

                            setButtonLoading(suspendBtn, false);

                            if (data.status === "success") {

                                if (statusBadge) {
                                    statusBadge.textContent = "Suspended";
                                    statusBadge.className = "bd-status-badge bd-status-suspended";
                                }

                                showToast("Buyer suspended successfully.", "success");

                            } else {

                                showToast(data.error || "Unable to suspend buyer.", "error");

                            }

                        } catch (error) {

                            console.error(error);
                            setButtonLoading(suspendBtn, false);
                            showToast("Something went wrong.", "error");

                        }

                    }
                );

            });
        }
        var actionSuspendBtn = document.getElementById('bdActionSuspend');
        if (actionSuspendBtn && suspendBtn) {
            actionSuspendBtn.addEventListener('click', function () {
                suspendBtn.click();
            });
        }

        var actionUnsuspendBtn = document.getElementById('bdActionUnsuspend');

        if (actionUnsuspendBtn) {
            actionUnsuspendBtn.addEventListener('click', function () {

                if (actionUnsuspendBtn.classList.contains('is-loading')) return;

                openConfirmModal(
                    'Unsuspend this buyer?',
                    'This buyer will regain access to their account immediately.',
                    async function () {

                        setButtonLoading(actionUnsuspendBtn, true, 'Unsuspending…');

                        try {

                            const formData = new FormData();
                            formData.append("userId", userId);
                            formData.append("state", "VERIFIED"); // or "ACTIVE" if that's your model value

                            const response = await fetch("/admin-db/change-account-state/", {
                                method: "POST",
                                headers: {
                                    "X-CSRFToken": getCSRFToken()
                                },
                                body: formData
                            });

                            const data = await response.json();

                            setButtonLoading(actionUnsuspendBtn, false);

                            if (data.status === "success") {

                                if (statusBadge) {
                                    statusBadge.textContent = "Active";
                                    statusBadge.className = "bd-status-badge bd-status-active";
                                }

                                showToast(data.message || "Buyer has been unsuspended.", "success");

                            } else {

                                showToast(data.error || "Unable to unsuspend buyer.", "error");

                            }

                        } catch (error) {

                            console.error(error);
                            setButtonLoading(actionUnsuspendBtn, false);
                            showToast("Something went wrong.", "error");

                        }

                    }
                );

            });
        }

        var blockBtn = document.getElementById('bdBlockBtn');

        if (blockBtn) {
            blockBtn.addEventListener('click', function () {

                if (blockBtn.classList.contains('is-loading')) return;

                openConfirmModal(
                    'Block this buyer?',
                    'Blocking prevents this buyer from logging in or placing new orders until unblocked.',
                    async function () {

                        setButtonLoading(blockBtn, true, 'Blocking…');

                        try {

                            const formData = new FormData();
                            formData.append("userId", userId);
                            formData.append("state", "BLOCKED");

                            const response = await fetch("/admin-db/change-account-state/", {
                                method: "POST",
                                headers: {
                                    "X-CSRFToken": getCSRFToken()
                                },
                                body: formData
                            });

                            const data = await response.json();

                            setButtonLoading(blockBtn, false);

                            if (data.status === "success") {

                                if (statusBadge) {
                                    statusBadge.textContent = "Blocked";
                                    statusBadge.className = "bd-status-badge bd-status-blocked";
                                }

                                showToast(data.message || "Buyer has been blocked.", "success");

                            } else {

                                showToast(data.error || "Unable to block buyer.", "error");

                            }

                        } catch (error) {

                            console.error(error);
                            setButtonLoading(blockBtn, false);
                            showToast("Something went wrong.", "error");

                        }

                    }
                );

            });
        }

        var deactivateBtn = document.getElementById('bdDeactivateBtn');

        if (deactivateBtn) {
            deactivateBtn.addEventListener('click', function () {

                if (deactivateBtn.classList.contains('is-loading')) return;

                openConfirmModal(
                    'Deactivate this buyer?',
                    'This buyer will no longer be able to access their account until it is reactivated.',
                    async function () {

                        setButtonLoading(deactivateBtn, true, 'Deactivating…');

                        try {

                            const formData = new FormData();
                            formData.append("userId", userId);
                            formData.append("state", "DEACTIVATED");

                            const response = await fetch("/admin-db/change-account-state/", {
                                method: "POST",
                                headers: {
                                    "X-CSRFToken": getCSRFToken()
                                },
                                body: formData
                            });

                            const data = await response.json();

                            setButtonLoading(deactivateBtn, false);

                            if (data.status === "success") {

                                if (statusBadge) {
                                    statusBadge.textContent = "Deactivated";
                                    statusBadge.className = "bd-status-badge bd-status-deactivated";
                                }

                                showToast(data.message || "Buyer has been deactivated.", "success");

                            } else {

                                showToast(data.error || "Unable to deactivate buyer.", "error");

                            }

                        } catch (error) {

                            console.error(error);
                            setButtonLoading(deactivateBtn, false);
                            showToast("Something went wrong.", "error");

                        }

                    }
                );

            });
        }

        var logoutDevicesBtn = document.getElementById("bdLogoutDevicesBtn");

        if (logoutDevicesBtn) {
            logoutDevicesBtn.addEventListener("click", async function () {

                setButtonLoading(logoutDevicesBtn, true, "Logging out...");

                try {

                    const formData = new FormData();
                    formData.append("userId", userId);

                    const response = await fetch("/admin-db/logout-all-devices/", {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCSRFToken()
                        },
                        body: formData
                    });

                    const data = await response.json();

                    setButtonLoading(logoutDevicesBtn, false);

                    if (data.status === "success") {
                        showToast(data.message, "success");
                    } else {
                        showToast(data.error || "Unable to log out devices.", "error");
                    }

                } catch (error) {
                    console.error(error);
                    setButtonLoading(logoutDevicesBtn, false);
                    showToast("Something went wrong.", "error");
                }

            }

            )
        };

        var exportProfileBtn = document.getElementById("bdExportProfileBtn");

        if (exportProfileBtn) {

            exportProfileBtn.addEventListener("click", function () {

                if (exportProfileBtn.classList.contains("is-loading")) return;

                setButtonLoading(exportProfileBtn, true, "Generating...");

                window.open(`/admin-db/buyers/${userId}/export/`, "_blank");

                // Restore the button after a short delay
                setTimeout(function () {
                    setButtonLoading(exportProfileBtn, false);
                    showToast("Your PDF download has started.", "success");
                }, 1500);

            });

        }
        var deleteBtn = document.getElementById('bdDeleteBtn');
        var dangerDeleteBtn = document.getElementById('bdDangerDeleteBtn');

        function confirmDelete() {
            openConfirmModal(
                'Delete this account?',
                'This will permanently remove Ayesha Khan and all associated data. This action cannot be undone.',
                function () {
                    showToast('Account deletion isn\u2019t available yet \u2014 connect the backend to enable this.', 'danger');
                }
            );
        }

        if (deleteBtn) deleteBtn.addEventListener('click', confirmDelete);
        if (dangerDeleteBtn) dangerDeleteBtn.addEventListener('click', confirmDelete);

        var editProfileBtn = document.getElementById('bdEditProfileBtn');
        var profileModal = document.getElementById('bdProfileEditModal');
        var closeProfileModalBtn = document.getElementById('bdCloseProfileModal');
        var cancelProfileEditBtn = document.getElementById('bdCancelProfileEdit');

        /* ==========================================
   PROFILE IMAGE UPLOAD
========================================== */

        var uploadProfileBtn = document.getElementById("bdUploadProfileBtn");
        var profileImageInput = document.getElementById("bdProfileImageInput");
        var profilePreview = document.getElementById("bdProfilePreview");
        var removeProfileBtn = document.querySelector(".bd-profile-upload-actions .bd-btn-ghost");

        // Store original image
        var originalProfileImage = profilePreview ? profilePreview.src : "";

        if (uploadProfileBtn && profileImageInput) {

            uploadProfileBtn.addEventListener("click", function () {

                profileImageInput.click();

            });

        }

        if (profileImageInput && profilePreview) {

            profileImageInput.addEventListener("change", function () {

                if (!this.files || !this.files.length) return;

                var file = this.files[0];

                // Optional validation
                if (!file.type.startsWith("image/")) {

                    if (typeof showToast === "function") {
                        showToast("Please select a valid image.", "error");
                    }

                    this.value = "";
                    return;
                }

                var reader = new FileReader();

                reader.onload = function (e) {

                    profilePreview.src = e.target.result;

                };

                reader.readAsDataURL(file);

            });

        }

        if (removeProfileBtn && profilePreview) {

            removeProfileBtn.addEventListener("click", function () {

                profileImageInput.value = "";

                // Placeholder image after removing
                profilePreview.src = "https://placehold.co/150x150?text=No+Photo";

                if (typeof showToast === "function") {
                    showToast("Profile photo removed.", "success");
                }

            });

        }
        function openProfileModal() {
            if (!profileModal) return;

            profileModal.classList.add('active');
            profileModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeProfileModal() {
            if (!profileModal) return;

            profileModal.classList.remove('active');
            profileModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', function () {
                openProfileModal();
            });
        }

        if (closeProfileModalBtn) {
            closeProfileModalBtn.addEventListener('click', closeProfileModal);
        }

        if (cancelProfileEditBtn) {
            cancelProfileEditBtn.addEventListener('click', closeProfileModal);
        }
        /* ==========================================
   SUBMIT PROFILE FORM
========================================== */

        const profileForm = document.getElementById("bdProfileEditForm");

        if (profileForm) {

            profileForm.addEventListener("submit", async function (e) {

                e.preventDefault();

                const submitBtn = document.getElementById("bdSaveProfileBtn");
                const originalHTML = submitBtn.innerHTML;

                submitBtn.disabled = true;
                submitBtn.innerHTML = `
            <svg class="bd-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-dasharray="50"
                    stroke-dashoffset="15">
                </circle>
            </svg>
            Saving...
        `;

                try {

                    const formData = new FormData(profileForm);

                    // Append profile image if selected
                    const imageInput = document.getElementById("bdProfileImageInput");

                    if (imageInput.files.length > 0) {
                        formData.append("profile_image", imageInput.files[0]);
                    }

                    console.log("FORM SUBMITTED");

                    e.preventDefault();
                    const response = await fetch(profileForm.action, {

                        method: "POST",

                        headers: {
                            "X-CSRFToken": getCSRFToken(),
                            "X-Requested-With": "XMLHttpRequest"
                        },

                        body: formData

                    });

                    const data = await response.json();

                    if (response.ok && data.success) {

                        showToast(data.message || "Profile updated successfully.", "success");

                        // Optional: Update profile card immediately
                        // updateBuyerProfile(data);

                        closeProfileModal();

                    } else {

                        showToast(data.message || "Unable to update profile.", "error");

                    }

                } catch (error) {

                    console.error(error);

                    showToast("Something went wrong. Please try again.", "error");

                } finally {

                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHTML;

                }

            });

        }

        if (profileModal) {

            profileModal.addEventListener('click', function (e) {

                if (e.target === profileModal) {
                    closeProfileModal();
                }

            });

        }

        document.addEventListener('keydown', function (e) {

            if (e.key === 'Escape' && profileModal && profileModal.classList.contains('active')) {
                closeProfileModal();
            }

        });

        var verifyPhoneBtn = document.getElementById('bdVerifyPhoneBtn');
        var actionVerifyPhoneBtn = document.getElementById('bdActionVerifyPhone');

        function verifyPhone() {
            document.querySelectorAll('.bd-inline-badge.is-unverified').forEach(function (badge) {
                badge.textContent = 'Verified';
                badge.classList.remove('is-unverified');
                badge.classList.add('is-verified');
                badge.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>Verified';
            });

            var phoneSecCard = document.querySelectorAll('.bd-sec-card')[1];
            if (phoneSecCard) {
                var badge = phoneSecCard.querySelector('.bd-badge');
                if (badge) {
                    badge.textContent = 'Verified';
                    badge.className = 'bd-badge c-success';
                }
                var icon = phoneSecCard.querySelector('.bd-sec-icon');
                if (icon) icon.className = 'bd-sec-icon c-success';
            }

            showToast('Phone number verified successfully.', 'success');
        }

        if (verifyPhoneBtn) verifyPhoneBtn.addEventListener('click', verifyPhone);
        if (actionVerifyPhoneBtn) actionVerifyPhoneBtn.addEventListener('click', verifyPhone);
    }

    /* Generic data-toast delegation for every remaining placeholder button */
    function initDataToastDelegation() {
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest('[data-toast]');
            if (!trigger || trigger.disabled) return;
            showToast(trigger.getAttribute('data-toast'), 'info');
        });
    }
    const viewModal = document.getElementById("bdViewAddressModal");
    const closemodels = [
        document.getElementById("bdCloseViewAddressModal"), document.getElementById("bdCloseViewAddressModaldown")
    ]

    closemodels.forEach(btn => {
        btn.addEventListener("click", function () {
            viewModal.classList.remove("active");
            viewModal.setAttribute("aria-hidden", "true");
        });
    });

    document.querySelectorAll(".bd-view-address-btn").forEach(button => {

        button.addEventListener("click", function () {

            document.getElementById("bdViewFullName").textContent = this.dataset.fullName;
            document.getElementById("bdViewPhone").textContent = this.dataset.phone;
            document.getElementById("bdViewAddressType").textContent = this.dataset.type;
            document.getElementById("bdViewDefaultAddress").textContent = this.dataset.default;
            document.getElementById("bdViewCountry").textContent = this.dataset.country;
            document.getElementById("bdViewProvince").textContent = this.dataset.province;
            document.getElementById("bdViewCity").textContent = this.dataset.city;
            document.getElementById("bdViewPostalCode").textContent = this.dataset.postalCode;
            document.getElementById("bdViewStreetAddress").textContent = this.dataset.address;
            viewModal.classList.add("active");
            viewModal.setAttribute("aria-hidden", "false");
        });

    });

    const editModal = document.getElementById("bdEditAddressModal");

    const openEditModal = () => {
        editModal.classList.add("active");
        editModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("bd-modal-open");
    };

    const closeEditModal = () => {
        editModal.classList.remove("active");
        editModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("bd-modal-open");
    };

    document.querySelectorAll(".bd-edit-address-btn").forEach(button => {

        button.addEventListener("click", function () {

            document.getElementById("bdEditFullName").value = this.dataset.fullName;
            document.getElementById("bdEditPhone").value = this.dataset.phone;
            // Assuming 'this' refers to the clicked element containing the dataset
            const addressType = this.dataset.type.toUpperCase();

            const selectElement = document.getElementById("bdEditAddressType");
            if (selectElement) {
                selectElement.value = addressType;
            }
            document.getElementById("bdEditCountry").value = this.dataset.country;
            document.getElementById("bdEditProvince").value = this.dataset.province;
            document.getElementById("bdEditCity").value = this.dataset.city;
            document.getElementById("bdEditPostalCode").value = this.dataset.postalCode;
            document.getElementById("bdEditStreetAddress").value = this.dataset.address;
            document.getElementById("bdEditAddressId").value = this.dataset.id;

            document.getElementById("bdEditDefaultAddress").checked =
                this.dataset.default === "True" ||
                this.dataset.default === "true" ||
                this.dataset.default === "1";

            document.getElementById("bdEditAddressForm").action =
                `/addresses/${this.dataset.id}/update/`;

            openEditModal();

        });

    });


    document.getElementById("bdCloseEditAddressModal").addEventListener("click", closeEditModal);
    document.getElementById("bdCancelEditAddress").addEventListener("click", closeEditModal);

    editModal.addEventListener("click", function (e) {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && editModal.classList.contains("active")) {
            closeEditModal();
        }
    });

    document.getElementById("bdEditAddressForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const saveButton = document.getElementById("bdSaveAddressBtn");

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {

            const response = await fetch("/accounts/buyer/address/update/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify({

                    addressId: document.getElementById("bdEditAddressId").value,
                    fullName: document.getElementById("bdEditFullName").value.trim(),
                    phone: document.getElementById("bdEditPhone").value.trim(),
                    type: document.getElementById("bdEditAddressType").value,
                    isDefault: document.getElementById("bdEditDefaultAddress").checked,
                    country: document.getElementById("bdEditCountry").value.trim(),
                    province: document.getElementById("bdEditProvince").value.trim(),
                    city: document.getElementById("bdEditCity").value.trim(),
                    postalCode: document.getElementById("bdEditPostalCode").value.trim(),
                    address: document.getElementById("bdEditStreetAddress").value.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update address.");
            }

            showToast(data.message || "Address updated successfully.", "success");

            closeEditModal();

            // Refresh the address card later
            // or update it directly in the DOM.

        } catch (error) {

            showToast(error.message, "error");

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";

        }
    });
    document.querySelectorAll(".bd-delete-address-btn").forEach(button => {

        button.addEventListener("click", async function () {

            const confirmed = confirm("Are you sure you want to delete this address?");

            if (!confirmed) {
                return;
            }

            button.disabled = true;
            button.textContent = "Deleting...";

            try {

                const response = await fetch("/accounts/buyer/address/delete/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: JSON.stringify({
                        addressId: this.dataset.id,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to delete address.");
                }

                showToast(data.message, "success");

                // Remove the address card from the page
                this.closest(".bd-address-card").remove();

            } catch (error) {

                showToast(error.message, "error");

                button.disabled = false;
                button.textContent = "Delete";
            }

        });

    });
    document.addEventListener("DOMContentLoaded", function () {
        // Use event delegation to handle clicks on current and dynamically added buttons
        document.body.addEventListener("click", function (event) {
            const removeBtn = event.target.closest(".wishlist-remove-inline-btn");
            if (!removeBtn) return;

            const productSlug = removeBtn.getAttribute("data-product-slug");
            const productCard = removeBtn.closest(".wishlist-grid-item");

            // Construct the URL using Django's slug pattern
            const url = `/wishlist/toggle/${productSlug}/`;

            fetch(url, {
                method: "POST", // Change to "GET" if your view is configured for GET requests
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRFToken": getCookie("csrftoken") // Required if your view requires CSRF protection
                },
            })
                .then(response => response.json())
                .then(data => {
                    // Adjust condition based on how your backend returns success JSON (e.g., data.status === 'success')
                    if (data) {
                        // Animate or directly remove the product grid item from the DOM
                        if (productCard) {
                            productCard.style.transition = "all 0.3s ease";
                            productCard.style.opacity = "0";
                            setTimeout(() => {
                                productCard.remove();

                                // Optional: Check if wishlist is empty and show empty state if needed
                                const remainingItems = document.querySelectorAll(".wishlist-grid-item");
                                if (remainingItems.length === 0) {
                                    location.reload(); // Or dynamically show your empty state HTML
                                }
                            }, 300);
                        }
                    } else {
                        alert("Could not remove item from wishlist.");
                    }
                })
                .catch(error => {
                    console.error("Error:", error);
                });
        });

        // Helper function to get CSRF token from cookies
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
    });

    /* ================= 15. BACK BUTTON ================= */
    function initBackButton() {
        var backBtn = document.getElementById('bdBackBtn');
        if (!backBtn) return;

        backBtn.addEventListener('click', function () {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                var buyersLink = document.querySelector('.bd-breadcrumb-mini a[href*="buyer"]');
                window.location.href = buyersLink ? buyersLink.href : '/';
            }
        });
    }

    const verificationBtn = document.getElementById("MVerificationBtn");

    if (verificationBtn) {

        verificationBtn.addEventListener("click", async function () {

            const userId = this.dataset.userId;

            this.disabled = true;

            try {

                const formData = new FormData();

                formData.append("userId", userId);
                formData.append("state", "VERIFIED");

                const response = await fetch("/admin-db/change-account-state/", {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok || data.status !== "success") {
                    throw new Error("Unable to verify account.");
                }

                showToast("Account verified successfully.", "success");

                // Optional: update button
                this.textContent = "Verified";
                this.disabled = true;

                // Optional: update account status badge on the page
                const statusBadge = document.getElementById("bdAccountStatus");
                if (statusBadge) {
                    statusBadge.textContent = "Verified";
                    statusBadge.className = "bd-status bd-status-verified";
                }

            } catch (error) {

                console.error(error);

                showToast(error.message, "error");

                this.disabled = false;

            }

        });

    }

    /* ================= 16. INIT ================= */
    document.addEventListener('DOMContentLoaded', function () {
        initScrollReveal();
        initCounters();
        initScoreRing();
        initBarChart();
        initTabs();
        initDropdowns();
        initRipples();
        initOrdersTable();
        initTimelineFilters();
        initAdminNotes();
        initConfirmModal();
        initImageModal();
        initHeaderActions();
        initDataToastDelegation();
        initBackButton();
    });
})();

