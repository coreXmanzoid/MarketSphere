document.addEventListener('DOMContentLoaded', function () {
    /* ================= ADD TO CART FEEDBACK ================= */
    document.querySelectorAll('.wishlist-add-cart-btn:not([disabled])').forEach(function (btn) {
        const originalHTML = btn.innerHTML;

        btn.addEventListener('click', function () {
            btn.classList.add('is-loading');
            btn.innerHTML = '<i class="bi bi-check2"></i> Added';
            btn.disabled = true;

            window.setTimeout(function () {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                btn.classList.remove('is-loading');
            }, 1500);
        });
    });

    /* ================= SCROLL REVEAL (matches home.js pattern) ================= */
    const revealTargets = document.querySelectorAll('.wishlist-product-card');

    revealTargets.forEach(function (el) {
        el.classList.add('reveal-on-scroll');
    });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealTargets.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        revealTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }
});
