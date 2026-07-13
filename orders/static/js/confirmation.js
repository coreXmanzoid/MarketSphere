document.addEventListener('DOMContentLoaded', function () {

    /* =========================================================
       NOTE: This page renders after the backend has already
       created the order, so there's nothing to submit or fetch
       here — just small presentation enhancements.
       ========================================================= */

    const TOAST_DURATION_MS = 3500;
    const toastContainer = document.getElementById('cfToastContainer');

    /* =========================================================
       TOAST HELPER
       ========================================================= */
    function showToast(message, type) {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'cf-toast cf-toast-' + (type || 'info');
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
       COPY ORDER NUMBER
       ========================================================= */
    const copyBtn = document.getElementById('cfCopyOrderNumberBtn');

    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            const orderNumber = copyBtn.dataset.orderNumber || '';

            if (!orderNumber) {
                showToast('No order number available to copy.', 'error');
                return;
            }

            const originalIcon = copyBtn.innerHTML;

            const markCopied = function () {
                copyBtn.classList.add('is-copied');
                copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                showToast('Order number copied to clipboard.', 'success');

                window.setTimeout(function () {
                    copyBtn.classList.remove('is-copied');
                    copyBtn.innerHTML = originalIcon;
                }, 1800);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(orderNumber).then(markCopied).catch(function () {
                    showToast('Could not copy the order number.', 'error');
                });
            } else {
                // Fallback for browsers without the async Clipboard API.
                const tempInput = document.createElement('textarea');
                tempInput.value = orderNumber;
                tempInput.style.position = 'fixed';
                tempInput.style.opacity = '0';
                document.body.appendChild(tempInput);
                tempInput.select();

                try {
                    document.execCommand('copy');
                    markCopied();
                } catch (err) {
                    showToast('Could not copy the order number.', 'error');
                }

                document.body.removeChild(tempInput);
            }
        });
    }


    /* =========================================================
       BUTTON RIPPLE EFFECT
       Applies to primary/secondary action buttons on this page.
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

    document.querySelectorAll('.cf-primary-action, .cf-secondary-action, .cf-copy-btn')
        .forEach(bindRipple);

    /* =========================================================
       SMOOTH PAGE ENTRANCE (scroll reveal, matches home.js pattern)
       ========================================================= */
    const revealTargets = document.querySelectorAll('.cf-card, .cf-summary-card');

    revealTargets.forEach(function (el) {
        el.classList.add('cf-reveal');
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
