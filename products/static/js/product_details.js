document.addEventListener('DOMContentLoaded', function () {

    /* ================= BACK TO TOP BUTTON ================= */
    const backToTopBtn = document.getElementById('backToTopBtn');

    function toggleBackToTop() {
        if (!backToTopBtn) return;
        backToTopBtn.classList.toggle('visible', window.scrollY > 400);
    }

    window.addEventListener('scroll', toggleBackToTop);
    toggleBackToTop();

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ================= IMAGE GALLERY ================= */
    // Placeholder icon set used until Django wires real product images per thumbnail.
    const galleryIcons = ['bi-headphones', 'bi-headphones', 'bi-soundwave', 'bi-box-seam', 'bi-tag'];

    const mainImage = document.getElementById('pdMainImage');
    const imageWrap = document.getElementById('pdImageWrap');
    const thumbs = Array.from(document.querySelectorAll('.pd-thumb'));
    const imageCounter = document.getElementById('pdImageCounter');
    const prevBtn = document.getElementById('pdPrevBtn');
    const nextBtn = document.getElementById('pdNextBtn');
    const fullscreenBtn = document.getElementById('pdFullscreenBtn');
    const fullscreenOverlay = document.getElementById('pdFullscreenOverlay');
    const fullscreenImage = document.getElementById('pdFullscreenImage');
    const fullscreenClose = document.getElementById('pdFullscreenClose');

    let currentImageIndex = 0;
    const totalImages = thumbs.length || 1;

    function setActiveThumb(index) {
        thumbs.forEach(function (thumb, i) {
            thumb.classList.toggle('is-active', i === index);
        });
    }

    function updateCounter(index) {
        if (imageCounter) {
            imageCounter.textContent = (index + 1) + ' / ' + totalImages;
        }
    }

    function goToImage(index) {
        if (!totalImages) return;

        currentImageIndex = (index + totalImages) % totalImages;
        setActiveThumb(currentImageIndex);
        updateCounter(currentImageIndex);

        if (!mainImage) return;

        // Smooth fade transition between images.
        // Note: image `src` will be swapped by Django with the real product image URL;
        // here we only rotate the placeholder icon to demonstrate the switching behavior.
        mainImage.classList.add('pd-fade-out');

        window.setTimeout(function () {
            mainImage.classList.remove('pd-fade-out');
        }, 180);
    }

    thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
            const index = parseInt(thumb.dataset.index, 10) || 0;
            goToImage(index);
        });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            goToImage(currentImageIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            goToImage(currentImageIndex + 1);
        });
    }

    // Keyboard navigation when gallery is focused/hovered.
    const galleryEl = document.getElementById('pdGallery');
    if (galleryEl) {
        galleryEl.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') {
                goToImage(currentImageIndex - 1);
            } else if (e.key === 'ArrowRight') {
                goToImage(currentImageIndex + 1);
            }
        });
    }

    /* ================= FULLSCREEN VIEWER ================= */
    function openFullscreen() {
        if (!fullscreenOverlay) return;
        fullscreenOverlay.classList.remove('d-none');
        document.body.style.overflow = 'hidden';
    }

    function closeFullscreen() {
        if (!fullscreenOverlay) return;
        fullscreenOverlay.classList.add('d-none');
        document.body.style.overflow = '';
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', openFullscreen);
    }

    if (fullscreenClose) {
        fullscreenClose.addEventListener('click', closeFullscreen);
    }

    if (fullscreenOverlay) {
        fullscreenOverlay.addEventListener('click', function (e) {
            if (e.target === fullscreenOverlay) {
                closeFullscreen();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeFullscreen();
        }
    });

    /* ================= QUANTITY SELECTOR ================= */
    const qtyInput = document.getElementById('pdQtyInput');
    const qtyMinus = document.getElementById('pdQtyMinus');
    const qtyPlus = document.getElementById('pdQtyPlus');

    function pulseQtyBtn(btn) {
        if (!btn) return;
        btn.classList.add('pd-qty-pop');
        window.setTimeout(function () {
            btn.classList.remove('pd-qty-pop');
        }, 150);
    }

    function clampQty(value) {
        if (!qtyInput) return value;
        const min = parseInt(qtyInput.min, 10) || 1;
        const max = parseInt(qtyInput.max, 10) || 99;
        return Math.min(Math.max(value, min), max);
    }

    if (qtyMinus && qtyInput) {
        qtyMinus.addEventListener('click', function () {
            const current = parseInt(qtyInput.value, 10) || 1;
            qtyInput.value = clampQty(current - 1);
            pulseQtyBtn(qtyMinus);
        });
    }

    if (qtyPlus && qtyInput) {
        qtyPlus.addEventListener('click', function () {
            const current = parseInt(qtyInput.value, 10) || 1;
            qtyInput.value = clampQty(current + 1);
            pulseQtyBtn(qtyPlus);
        });
    }

    if (qtyInput) {
        qtyInput.addEventListener('change', function () {
            const current = parseInt(qtyInput.value, 10) || 1;
            qtyInput.value = clampQty(current);
        });
    }

    /* ================= SHARE POPOVER ================= */
    const shareBtn = document.getElementById('pdShareBtn');
    const sharePopover = document.getElementById('pdSharePopover');
    const copyLinkBtn = document.getElementById('pdCopyLinkBtn');

    if (shareBtn && sharePopover) {
        shareBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = sharePopover.classList.toggle('is-open');
            shareBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        document.addEventListener('click', function (e) {
            if (!sharePopover.contains(e.target) && e.target !== shareBtn) {
                sharePopover.classList.remove('is-open');
                shareBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', function () {
            const icon = copyLinkBtn.querySelector('i');
            if (!icon) return;

            const originalClass = 'bi-link-45deg';
            icon.classList.remove(originalClass);
            icon.classList.add('bi-check2');

            window.setTimeout(function () {
                icon.classList.remove('bi-check2');
                icon.classList.add(originalClass);
            }, 1500);
        });
    }

    /* ================= ADD TO CART FEEDBACK ================= */
    function bindAddToCartFeedback(btn) {
        if (!btn) return;
        const originalHTML = btn.innerHTML;

        btn.addEventListener('click', function () {
            btn.classList.add('pd-btn-pulse');
            btn.innerHTML = '<i class="bi bi-check2"></i> Added';

            window.setTimeout(function () {
                btn.innerHTML = originalHTML;
                btn.classList.remove('pd-btn-pulse');
            }, 1400);
        });
    }

    bindAddToCartFeedback(document.getElementById('pdAddToCartBtn'));
    bindAddToCartFeedback(document.getElementById('pdMobileAddToCartBtn'));

    document.querySelectorAll('.add-to-cart-btn:not([disabled])').forEach(function (btn) {
        const originalHTML = btn.innerHTML;

        btn.addEventListener('click', function () {
            btn.innerHTML = '<i class="bi bi-check2"></i> Added';
            btn.disabled = true;

            window.setTimeout(function () {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 1500);
        });
    });

    /* ================= BUY NOW / MOBILE BUTTON PULSE ================= */
    ['pdBuyNowBtn', 'pdMobileBuyNowBtn'].forEach(function (id) {
        const btn = document.getElementById(id);
        if (!btn) return;

        btn.addEventListener('click', function () {
            btn.classList.add('pd-btn-pulse');
            window.setTimeout(function () {
                btn.classList.remove('pd-btn-pulse');
            }, 400);
        });
    });

    /* ================= HELPFUL / REPORT REVIEW ACTIONS ================= */
    document.querySelectorAll('.pd-helpful-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const countEl = btn.querySelector('span');
            if (!countEl) return;

            const isActive = btn.classList.toggle('is-active');
            let count = parseInt(countEl.textContent, 10) || 0;
            count = isActive ? count + 1 : Math.max(count - 1, 0);
            countEl.textContent = String(count);
        });
    });

    document.querySelectorAll('.pd-report-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-flag-fill"></i> Reported';
            btn.disabled = true;

            window.setTimeout(function () {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 2000);
        });
    });

    /* ================= FREQUENTLY BOUGHT TOGETHER TOTAL ================= */
    const fbtCheckboxes = Array.from(document.querySelectorAll('.pd-fbt-check .form-check-input'));
    const fbtTotalEl = document.getElementById('pdFbtTotal');
    const fbtAddAllBtn = document.getElementById('pdFbtAddAll');

    function formatFbtPrice(value) {
        return 'Rs. ' + Number(value || 0).toLocaleString('en-IN');
    }

    function recalcFbtTotal() {
        if (!fbtTotalEl) return;

        let total = 0;
        fbtCheckboxes.forEach(function (checkbox) {
            if (!checkbox.checked) return;
            const priceEl = checkbox.closest('.pd-fbt-item').querySelector('.pd-fbt-price');
            if (priceEl) {
                total += parseInt(priceEl.dataset.price, 10) || 0;
            }
        });

        fbtTotalEl.textContent = formatFbtPrice(total);
    }

    fbtCheckboxes.forEach(function (checkbox) {
        checkbox.addEventListener('change', recalcFbtTotal);
    });

    recalcFbtTotal();

    if (fbtAddAllBtn) {
        bindAddToCartFeedback(fbtAddAllBtn);
    }

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

    /* ================= RECENTLY VIEWED SLIDER ================= */
    const recentSlider = document.getElementById('pdRecentSlider');
    const recentPrevBtn = document.getElementById('pdRecentPrev');
    const recentNextBtn = document.getElementById('pdRecentNext');

    function scrollRecentSlider(direction) {
        if (!recentSlider) return;
        const scrollAmount = recentSlider.clientWidth * 0.8 * direction;
        recentSlider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    if (recentPrevBtn) {
        recentPrevBtn.addEventListener('click', function () {
            scrollRecentSlider(-1);
        });
    }

    if (recentNextBtn) {
        recentNextBtn.addEventListener('click', function () {
            scrollRecentSlider(1);
        });
    }

    /* ================= STICKY MOBILE PURCHASE BAR ================= */
    const mobileStickyBar = document.getElementById('pdMobileStickyBar');
    const purchaseControls = document.querySelector('.pd-purchase-controls');

    function toggleMobileStickyBar() {
        if (!mobileStickyBar || !purchaseControls || window.innerWidth > 767.98) {
            if (mobileStickyBar) mobileStickyBar.classList.remove('is-visible');
            return;
        }

        const rect = purchaseControls.getBoundingClientRect();
        const isPastControls = rect.bottom < 0;

        mobileStickyBar.classList.toggle('is-visible', isPastControls);
    }

    window.addEventListener('scroll', toggleMobileStickyBar);
    window.addEventListener('resize', toggleMobileStickyBar);
    toggleMobileStickyBar();

    /* ================= SCROLL REVEAL ANIMATIONS ================= */
    const revealTargets = document.querySelectorAll(
        '.pd-feature-card, .why-us-card, .product-card, .pd-review-card, .pd-seller-card, .newsletter-inner'
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
