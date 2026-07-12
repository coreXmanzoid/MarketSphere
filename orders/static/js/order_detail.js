document.addEventListener('DOMContentLoaded', function () {

    /* =========================================================
       NOTE: This file is intentionally frontend-only, matching
       the pattern used in orders/static/js/checkout.js and
       orders/static/js/confirmation.js. No fetch() calls, no
       order-cancellation / invoice / reorder API requests —
       those will be wired up once the corresponding backend
       endpoints exist.
       ========================================================= */

    const TOAST_DURATION_MS = 4000;
    const toastContainer = document.getElementById('odToastContainer');

    /* =========================================================
       TOAST HELPER (mirrors cf-toast / co-toast pattern)
       ========================================================= */
    function showToast(message, type) {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'od-toast od-toast-' + (type || 'info');
        toast.setAttribute('role', 'status');

        const iconClass = type === 'error'
            ? 'bi-exclamation-triangle'
            : type === 'success'
                ? 'bi-check2-circle'
                : 'bi-info-circle';

        toast.innerHTML = '<i class="bi ' + iconClass + '"></i><span></span>';
        toast.querySelector('span').textContent = message;

        toastContainer.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add('is-leaving');
            toast.addEventListener('animationend', function () {
                toast.remove();
            }, { once: true });
        }, TOAST_DURATION_MS);
    }

    /* =========================================================
       CANCEL ORDER (opens confirm modal, frontend feedback only)
       ========================================================= */
    const cancelModalEl = document.getElementById('odCancelModal');
    const confirmCancelBtn = document.getElementById('odConfirmCancelBtn');
    const cancelTriggerBtns = [
        document.getElementById('odCancelOrderBtn'),
        document.getElementById('odCancelOrderBtnMobile')
    ].filter(Boolean);

    let cancelModal = null;
    if (cancelModalEl && window.bootstrap && window.bootstrap.Modal) {
        cancelModal = new window.bootstrap.Modal(cancelModalEl);
    }

    cancelTriggerBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.disabled) return;

            if (cancelModal) {
                cancelModal.show();
            } else {
                showToast('Order cancellation isn\'t available yet.', 'info');
            }
        });
    });

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', function () {
            if (cancelModal) {
                cancelModal.hide();
            }
            showToast('Order cancellation will be available once this is connected to the backend.', 'info');
        });
    }

    /* =========================================================
       DOWNLOAD INVOICE (placeholder — no backend endpoint yet)
       ========================================================= */
    [
        document.getElementById('odDownloadInvoiceBtn'),
        document.getElementById('odDownloadInvoiceBtnMobile')
    ].filter(Boolean).forEach(function (btn) {
        btn.addEventListener('click', function () {
            showToast('Invoice downloads aren\'t available yet — check back soon.', 'info');
        });
    });

    /* =========================================================
       BUY AGAIN / REORDER (placeholder — no backend endpoint yet)
       ========================================================= */
    [
        document.getElementById('odReorderBtn'),
        document.getElementById('odReorderBtnMobile')
    ].filter(Boolean).forEach(function (btn) {
        btn.addEventListener('click', function () {
            showToast('Re-ordering these items will be available soon.', 'info');
        });
    });

    /* =========================================================
       BUTTON RIPPLE EFFECT (matches confirmation.js pattern)
       ========================================================= */
    function bindRipple(el) {
        el.addEventListener('click', function (e) {
            const rect = el.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);

            ripple.style.position = 'absolute';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.45)';
            ripple.style.pointerEvents = 'none';
            ripple.style.transform = 'scale(0)';
            ripple.style.opacity = '1';
            ripple.style.transition = 'transform 0.5s ease, opacity 0.6s ease';

            el.style.position = el.style.position || 'relative';
            el.style.overflow = 'hidden';
            el.appendChild(ripple);

            requestAnimationFrame(function () {
                ripple.style.transform = 'scale(1)';
                ripple.style.opacity = '0';
            });

            window.setTimeout(function () {
                ripple.remove();
            }, 600);
        });
    }

    document.querySelectorAll('.od-action-btn').forEach(bindRipple);

    /* =========================================================
       SCROLL REVEAL (matches confirmation.js / home.js pattern)
       ========================================================= */
    const revealTargets = document.querySelectorAll('.od-card, .od-summary-card');

    revealTargets.forEach(function (el) {
        el.classList.add('od-reveal');
    });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        revealTargets.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        revealTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }
});
