document.addEventListener('DOMContentLoaded', function () {
    /* ================= ADD TO CART FEEDBACK ================= */
    document.querySelectorAll(".wishlist-add-cart-btn:not([disabled])").forEach((btn) => {
        const originalHTML = btn.innerHTML;

        btn.addEventListener("click", async function () {
            if (btn.disabled) return;

            btn.disabled = true;
            btn.classList.add("is-loading");

            try {
                const response = await fetch(btn.dataset.addUrl, {
                    method: "GET",
                    headers: {
                        "X-CSRFToken": getCookie("csrftoken"),
                        "X-Requested-With": "XMLHttpRequest",
                    },
                });

                const data = await response.json();

                if (data.success) {
                    btn.innerHTML = '<i class="bi bi-check2"></i> Added';

                    // Update navbar cart counter
                    const counter = document.querySelector("#cartCounter");
                    if (counter) {
                        counter.textContent = data.cart_count;
                    }
                } else {
                    alert("Unable to add product to cart.");
                }
            } catch (error) {
                console.error("Cart Error:", error);
                alert("Something went wrong. Please try again.");
            }

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                btn.classList.remove("is-loading");
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
