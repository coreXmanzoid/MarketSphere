/* =========================================================
   MARKETSPHERE — SELLER DASHBOARD HOME
   Frontend-only enhancements for seller_dashboard/dashboard.html.
   No fetch, no AJAX, no external libraries — every value here
   is placeholder/decorative until the backend is wired up.

   Responsibilities:
     1. Greeting + current date (time-aware, client-side only)
     2. Animated counters for the statistics cards
     3. Scroll-reveal fade-in for page sections
     4. Store-performance chart bar animation
     5. Quick action / stat card subtle hover polish
   ========================================================= */

(function () {
    'use strict';

    /* =====================================================
       1. GREETING + CURRENT DATE
       ===================================================== */
    function initGreetingAndDate() {
        var greetingEl = document.getElementById('dhGreeting');
        var dateEl = document.getElementById('dhCurrentDate');

        var now = new Date();

        if (greetingEl) {
            var hour = now.getHours();
            var greeting = 'Good Evening,';

            if (hour < 12) {
                greeting = 'Good Morning,';
            } else if (hour < 17) {
                greeting = 'Good Afternoon,';
            }

            greetingEl.textContent = greeting;
        }

        if (dateEl) {
            var formatted = now.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            dateEl.textContent = formatted;
        }
    }

    /* =====================================================
       2. ANIMATED COUNTERS
       Reads data-count-to (and optional data-prefix) off each
       .dh-stat-value and animates from 0 up to the target once
       the card scrolls into view.
       ===================================================== */
    function animateCounter(el) {
        var target = parseFloat(el.getAttribute('data-count-to'), 10);
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
        var counters = document.querySelectorAll('.dh-stat-value[data-count-to]');
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
       3. SCROLL-REVEAL FADE-IN
       Applies to every .dh-reveal section/card on the page —
       staggered slightly so sections don't all pop in at once.
       ===================================================== */
    function initScrollReveal() {
        var revealTargets = document.querySelectorAll('.dh-reveal');
        if (!revealTargets.length) return;

        if (!('IntersectionObserver' in window)) {
            revealTargets.forEach(function (el) {
                el.classList.add('is-visible');
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;
                var delay = Math.min(Array.prototype.indexOf.call(revealTargets, el) * 40, 240);

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
       4. STORE PERFORMANCE CHART BAR ANIMATION
       Purely decorative — grows the placeholder bars in once
       the chart scrolls into view.
       ===================================================== */
    function initChartPlaceholder() {
        var chart = document.querySelector('.dh-chart-placeholder');
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

    /* =====================================================
       5. QUICK ACTION / STAT CARD RIPPLE
       A small tactile hover/press response — matches the
       ripple pattern already used on other order pages
       (orders/static/js/order_detail.js, confirmation.js).
       ===================================================== */
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
            ripple.style.background = 'rgba(157, 102, 56, 0.16)';
            ripple.style.pointerEvents = 'none';
            ripple.style.transform = 'scale(0)';
            ripple.style.opacity = '1';
            ripple.style.transition = 'transform 0.5s ease, opacity 0.6s ease';

            el.style.position = el.style.position || 'relative';
            el.style.overflow = 'hidden';
            el.appendChild(ripple);

            window.requestAnimationFrame(function () {
                ripple.style.transform = 'scale(1)';
                ripple.style.opacity = '0';
            });

            window.setTimeout(function () {
                ripple.remove();
            }, 600);
        });
    }

    function initQuickActionRipple() {
        document.querySelectorAll('.dh-action-card').forEach(bindRipple);
    }

    /* =====================================================
       INIT
       ===================================================== */
    document.addEventListener('DOMContentLoaded', function () {
        initGreetingAndDate();
        initCounters();
        initScrollReveal();
        initChartPlaceholder();
        initQuickActionRipple();
    });
})();
