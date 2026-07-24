/* =========================================================
   MARKETSPHERE — ADMIN DASHBOARD HOME
   Frontend-only behavior for admin_panel/templates/admin_dashboard.html.
   No fetch, no AJAX, no backend calls, no external libraries.

   Responsibilities:
     1. Current date display
     2. Animated stat counters
     3. Scroll-reveal fade-in
     4. Sales overview chart bar animation + range dropdown UI
     5. Top category bar fill animation
     6. Quick action / task row ripple feedback
     7. Export report placeholder feedback
   ========================================================= */

(function () {
    'use strict';

    /* =====================================================
       1. CURRENT DATE
       ===================================================== */
    function initCurrentDate() {
        var dateEl = document.getElementById('adhCurrentDate');
        if (!dateEl) return;

        var now = new Date();
        dateEl.textContent = now.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /* =====================================================
       2. ANIMATED STAT COUNTERS
       ===================================================== */
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

            el.textContent = prefix + current.toLocaleString('en-IN');

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = prefix + target.toLocaleString('en-IN');
            }
        }

        window.requestAnimationFrame(step);
    }

    function initCounters() {
        var counters = document.querySelectorAll('.adh-stat-value[data-count-to]');
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

        counters.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* =====================================================
       3. SCROLL REVEAL
       ===================================================== */
    function initScrollReveal() {
        var revealTargets = document.querySelectorAll('.adh-reveal');
        if (!revealTargets.length) return;

        if (!('IntersectionObserver' in window)) {
            revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;
                var delay = Math.min(Array.prototype.indexOf.call(revealTargets, el) * 35, 210);

                window.setTimeout(function () {
                    el.classList.add('is-visible');
                }, delay);

                obs.unobserve(el);
            });
        }, { threshold: 0.08 });

        revealTargets.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* =====================================================
       4. SALES OVERVIEW CHART + RANGE DROPDOWN
       ===================================================== */
    function initChartPlaceholder() {
        var chart = document.getElementById('adhChartPlaceholder');
        if (!chart) return;

        if (!('IntersectionObserver' in window)) {
            chart.classList.add('is-animated');
        } else {
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
    }

    // Purely a UI affordance — swaps the placeholder bar heights so the
    // dropdown "feels" connected until a real chart library is wired up.
    var RANGE_PATTERNS = {
        today: [20, 35, 28, 55, 40, 62, 48, 70, 58, 66, 52, 80],
        '7d': [32, 48, 40, 63, 55, 74, 68, 85, 77, 92, 81, 100],
        '30d': [45, 30, 60, 50, 72, 40, 85, 55, 78, 60, 90, 68],
        '12m': [40, 55, 48, 65, 58, 72, 66, 80, 74, 88, 82, 96]
    };

    function initRangeSelect() {
        var select = document.getElementById('adhRangeSelect');
        var chart = document.getElementById('adhChartPlaceholder');
        if (!select || !chart) return;

        var bars = chart.querySelectorAll('.adh-chart-bars span');

        select.addEventListener('change', function () {
            var pattern = RANGE_PATTERNS[select.value] || RANGE_PATTERNS['7d'];

            bars.forEach(function (bar, index) {
                var height = pattern[index % pattern.length];
                bar.style.setProperty('--adh-bar-h', height + '%');
            });
        });
    }

    /* =====================================================
       5. TOP CATEGORY BAR FILL
       ===================================================== */
    function initCategoryBars() {
        var fills = document.querySelectorAll('.adh-category-bar-fill');
        if (!fills.length) return;

        if (!('IntersectionObserver' in window)) {
            fills.forEach(function (el) { el.classList.add('is-filled'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-filled');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        fills.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* =====================================================
       6. RIPPLE FEEDBACK (quick actions + task rows)
       ===================================================== */
    function bindRipple(el) {
        el.addEventListener('click', function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement('span');
            var size = Math.max(rect.width, rect.height);

            ripple.className = 'adh-ripple';
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
        document.querySelectorAll('.adh-action-card, .adh-task-btn').forEach(bindRipple);
    }

    /* =====================================================
       7. EXPORT REPORT PLACEHOLDER
       ===================================================== */
    function initExportButton() {
        var btn = document.getElementById('adhExportBtn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            var original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3.5-7.1"></path></svg> Preparing…';

            window.setTimeout(function () {
                btn.disabled = false;
                btn.innerHTML = original;
                window.alert('Report export isn\u2019t available yet \u2014 check back soon.');
            }, 700);
        });
    }

    /* =====================================================
       INIT
       ===================================================== */
    document.addEventListener('DOMContentLoaded', function () {
        initCurrentDate();
        initCounters();
        initScrollReveal();
        initChartPlaceholder();
        initRangeSelect();
        initCategoryBars();
        initRipples();
        initExportButton();
    });
})();