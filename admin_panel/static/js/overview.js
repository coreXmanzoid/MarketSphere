/* =========================================================================
   MARKETSPHERE ADMIN — USER MANAGEMENT OVERVIEW (overview.js)
   Frontend-only interactions for admin_panel/templates/users/overview.html.
   No fetch(), no AJAX, no backend calls, no external libraries — matches
   the pattern already used across the admin shell and other dashboard
   pages (see admin_panel/static/js/admin_dashboard.js,
   seller_dashboard/static/js/products.js).

   Sections:
     1. DOM Cache
     2. Toast Helper
     3. Scroll Reveal
     4. Animated Counters
     5. Progress / Status Bar Fill
     6. Card + Button Ripple
     7. More Menu Dropdown
     8. Data-Toast Delegation (fake notifications for placeholder actions)
     9. Timeline Filtering
    10. Table Search
    11. Growth Charts (line / donut / bar / insight sparks)
    12. Export Button Feedback
    13. Init
   ========================================================================= */

(function () {
    'use strict';

    var page = document.getElementById('aduPage');
    if (!page) return; // not on the user management overview page


    /* ================= 3. SCROLL REVEAL ================= */
    function initScrollReveal() {
        var targets = Array.prototype.slice.call(document.querySelectorAll('.adu-reveal'));
        if (!targets.length) return;

        if (!('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;
                var delay = Math.min(targets.indexOf(el) * 35, 240);

                window.setTimeout(function () {
                    el.classList.add('is-visible');
                }, delay);

                obs.unobserve(el);
            });
        }, { threshold: 0.08 });

        targets.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 4. ANIMATED COUNTERS ================= */
    function animateCounter(el) {
        var raw = el.getAttribute('data-count-to');
        var target = parseFloat(raw);
        if (!isFinite(target)) return;

        var originalText = el.textContent.trim();
        var prefix = /^[^\d\-]*/.exec(originalText) ? originalText.match(/^[^\d\-]*/)[0] : '';
        var suffix = /[^\d,.]*$/.exec(originalText) ? originalText.match(/[^\d,.]*$/)[0] : '';
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

            el.textContent = prefix + current.toLocaleString('en-US') + suffix;

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = prefix + target.toLocaleString('en-US') + suffix;
            }
        }

        window.requestAnimationFrame(step);
    }

    function initCounters() {
        var counters = document.querySelectorAll('.adu-metric-value[data-count-to]');
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

    /* ================= 5. PROGRESS / STATUS BAR FILL ================= */
    function initBarFill(selector, fillClass) {
        var bars = document.querySelectorAll(selector);
        if (!bars.length) return;

        if (!('IntersectionObserver' in window)) {
            bars.forEach(function (el) { el.classList.add(fillClass); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add(fillClass);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        bars.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 6. CARD + BUTTON RIPPLE ================= */
    function bindRipple(el) {
        el.addEventListener('click', function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement('span');
            var size = Math.max(rect.width, rect.height);

            ripple.className = 'adu-ripple';
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
        document.querySelectorAll('.adu-action-card, .adu-type-card').forEach(bindRipple);
    }

    /* ================= 7. MORE MENU DROPDOWN ================= */
    function initMoreDropdown() {
        var dropdown = document.getElementById('aduMoreDropdown');
        var trigger = document.getElementById('aduMoreTrigger');
        if (!dropdown || !trigger) return;

        function close() {
            dropdown.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        function toggle() {
            var isOpen = dropdown.classList.toggle('is-open');
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggle();
        });

        dropdown.querySelector('.adu-dropdown-menu').addEventListener('click', function (e) {
            e.stopPropagation();
        });

        document.addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });
    }

    /* ================= 8. DATA-TOAST DELEGATION ================= */
    // Any element carrying data-toast fires a friendly "coming soon" style
    // notification instead of doing nothing — used for placeholder actions
    // across metric cards, type cards, quick actions, and table rows.
    function initDataToastDelegation() {
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest('[data-toast]');
            if (!trigger) return;

            // Avoid double-firing when a toast trigger also sits inside a
            // dropdown item that already stopped propagation elsewhere.
            showToast(trigger.getAttribute('data-toast'), 'info');
        });
    }

    /* ================= 9. TIMELINE FILTERING ================= */
    function initTimelineFilters() {
        var filterBar = document.getElementById('aduTimelineFilters');
        var timeline = document.getElementById('aduTimeline');
        if (!filterBar || !timeline) return;

        var items = Array.prototype.slice.call(timeline.querySelectorAll('.adu-timeline-item'));

        filterBar.addEventListener('click', function (e) {
            var pill = e.target.closest('.adu-filter-pill');
            if (!pill) return;

            filterBar.querySelectorAll('.adu-filter-pill').forEach(function (p) {
                p.classList.toggle('is-active', p === pill);
            });

            var filter = pill.getAttribute('data-filter');

            items.forEach(function (item) {
                var matches = filter === 'all' || item.getAttribute('data-type') === filter;
                item.classList.toggle('adu-hidden', !matches);
            });
        });
    }

    /* ================= 10. TABLE SEARCH ================= */
    function initTableSearch() {
        var input = document.getElementById('aduTableSearch');
        var tableBody = document.getElementById('aduUsersTableBody');
        var emptyState = document.getElementById('aduTableEmpty');
        if (!input || !tableBody) return;

        var rows = Array.prototype.slice.call(tableBody.querySelectorAll('tr'));

        function applySearch() {
            var query = input.value.trim().toLowerCase();
            var visibleCount = 0;

            rows.forEach(function (row) {
                var haystack = (row.getAttribute('data-search') || row.textContent).toLowerCase();
                var matches = !query || haystack.indexOf(query) !== -1;
                row.classList.toggle('adu-row-hidden', !matches);
                if (matches) visibleCount += 1;
            });

            if (emptyState) {
                emptyState.classList.toggle('is-visible', visibleCount === 0);
            }
        }

        input.addEventListener('input', applySearch);
    }

    /* ================= 11. GROWTH CHARTS ================= */
    function initLineChart() {
        var wrap = document.getElementById('aduLineChart');
        if (!wrap) return;

        if (!('IntersectionObserver' in window)) {
            wrap.classList.add('is-animated');
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    wrap.classList.add('is-animated');
                    obs.unobserve(wrap);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(wrap);
    }

    function initDonutChart() {
        var donut = document.getElementById('aduDonut');
        if (!donut) return;

        if (!('IntersectionObserver' in window)) {
            donut.classList.add('is-animated');
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    donut.classList.add('is-animated');
                    obs.unobserve(donut);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(donut);
    }

    function initBarChart() {
        var chart = document.getElementById('aduBarChart');
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

    /* ================= 12. EXPORT BUTTON FEEDBACK ================= */
    function initExportButtons() {
        [document.getElementById('aduExportBtn'), document.getElementById('aduExportActionBtn')]
            .filter(Boolean)
            .forEach(function (btn) {
                btn.addEventListener('click', function () {
                    if (btn.classList.contains('is-loading')) return;

                    var originalHTML = btn.innerHTML;
                    btn.classList.add('is-loading');
                    btn.disabled = true;
                    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3.5-7.1"></path></svg> Preparing\u2026';

                    window.setTimeout(function () {
                        btn.classList.remove('is-loading');
                        btn.disabled = false;
                        btn.innerHTML = originalHTML;
                        showToast('User export isn\u2019t available yet \u2014 check back soon.', 'info');
                    }, 700);
                });
            });
    }

    /* ================= 13. ADD ADMIN BUTTON ================= */
    function initAddAdminButton() {
        var btn = document.getElementById('aduAddAdminBtn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            showToast('Creating new admin accounts isn\u2019t available yet.', 'info');
        });
    }

    /* ================= INIT ================= */
    document.addEventListener('DOMContentLoaded', function () {
        initScrollReveal();
        initCounters();
        initBarFill('.adu-type-progress-fill', 'is-filled');
        initBarFill('.adu-status-bar-fill', 'is-filled');
        initRipples();
        initMoreDropdown();
        initDataToastDelegation();
        initTimelineFilters();
        initTableSearch();
        initLineChart();
        initDonutChart();
        initBarChart();
        initExportButtons();
        initAddAdminButton();
    });
})();
