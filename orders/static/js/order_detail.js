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
            }
        });
    });

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', function () {
            if (cancelModal) {
                cancelModal.hide();
            }
            var orderNumber = confirmCancelBtn.dataset.orderNumber;

            if (!orderNumber) {
                showToast('Unable to cancel order: missing order number.', 'error');
                return;
            }

            fetch('/order/cancel-order/' + encodeURIComponent(orderNumber), {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(function (response) {
                    return response.json().then(function (data) {
                        return {
                            ok: response.ok,
                            data: data
                        };
                    }).catch(function () {
                        return {
                            ok: response.ok,
                            data: null
                        };
                    });
                })
                .then(function (result) {
                    // Changed result.data.success to result.data.status === 'success'
                    if (result.ok && result.data && result.data.status === 'success') {
                        window.location.reload();
                    } else {
                        var message = (result.data && result.data.message) ? result.data.message : 'Could not cancel order. Please try again.';
                        showToast(message, 'error');
                    }
                })
                .catch(function () {
                    showToast('Network error while cancelling order. Please try again.', 'error');
                });
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
            let orderNumber = btn.dataset.orderNumber;
            window.open(`/order/${orderNumber}/invoice/`, "_blank");
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
            let orderNumber = btn.dataset.orderNumber;
            if (!orderNumber) {
                showToast("missing order number", 'error');
                return; // Stop execution if order number is missing
            }

            // Make the fetch request to the reorder endpoint
            fetch('/order/reorder/' + encodeURIComponent(orderNumber) + '/', {
                method: 'GET', // Change to 'POST' if you implement CSRF later
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(function (data) {
                    // Check if backend returned success status
                    if (data.status === 'success') {
                        // Redirect directly to the cart page
                        window.location.href = '/cart/';
                    } else {
                        // Show backend error message if available
                        showToast(data.message || 'Failed to reorder items.', 'error');
                    }
                })
                .catch(function (error) {
                    console.error('Error during reorder:', error);
                    showToast('A network error occurred. Please try again.', 'error');
                });
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
