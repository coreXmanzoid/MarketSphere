document.addEventListener('DOMContentLoaded', function () {

    /* ================= BACK TO TOP BUTTON ================= */
    const backToTopBtn = document.getElementById('backToTopBtn');

    function toggleBackToTop() {
        if (!backToTopBtn) return;
        if (window.scrollY > 400) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }

    window.addEventListener('scroll', toggleBackToTop);
    toggleBackToTop();

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ================= ADD TO CART FEEDBACK ================= */
    document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
        const originalHTML = btn.innerHTML;

        btn.addEventListener("click", async function () {
            if (btn.disabled) return;

            btn.disabled = true;
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
            }, 1500);
        });
    });

    /* ================= NEWSLETTER VALIDATION ================= */
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterEmail = document.getElementById('newsletterEmail');
    const newsletterFeedback = document.getElementById('newsletterFeedback');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const email = newsletterEmail.value.trim();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {
                newsletterFeedback.textContent = 'Please enter a valid email address.';
                newsletterFeedback.classList.remove('success');
                newsletterFeedback.classList.add('error');
                newsletterEmail.classList.add('is-invalid');
                return;
            }

            newsletterEmail.classList.remove('is-invalid');
            newsletterFeedback.textContent = 'Thanks for subscribing! Check your inbox soon.';
            newsletterFeedback.classList.remove('error');
            newsletterFeedback.classList.add('success');
            newsletterForm.reset();
        });
    }

    /* ================= SCROLL REVEAL ANIMATIONS ================= */
    const revealTargets = document.querySelectorAll(
        '.category-card, .product-card, .why-us-card, .promo-banner-inner, .newsletter-inner'
    );

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
        }, { threshold: 0.15 });

        revealTargets.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        revealTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    /* ================= HERO VISUAL SUBTLE TILT ================= */
    const heroVisual = document.getElementById('heroVisual');

    if (heroVisual && window.matchMedia('(min-width: 992px)').matches) {
        heroVisual.addEventListener('mousemove', function (e) {
            const rect = heroVisual.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            heroVisual.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
        });

        heroVisual.addEventListener('mouseleave', function () {
            heroVisual.style.transform = 'rotateY(0deg) rotateX(0deg)';
        });
    }

});
