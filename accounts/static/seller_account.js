document.addEventListener('DOMContentLoaded', function () {

    /* =========================================================
       NOTE: This file is intentionally frontend-only, matching
       the pattern used in orders/static/js/checkout.js and
       orders/static/js/order_detail.js. There are no fetch()
       calls and no real submissions here — "Save" actions only
       simulate a short delay and give UI feedback. Once the
       seller-account backend (views/URLs) exists, replace the
       simulated blocks below with real requests without touching
       the surrounding DOM/animation logic.
       ========================================================= */

    const TOAST_DURATION_MS = 4000;
    const toastContainer = document.getElementById('saToastContainer');

    /* =========================================================
       TOAST HELPER (mirrors od-toast / co-toast / cf-toast pattern)
       ========================================================= */
    function showToast(message, type) {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'sa-toast sa-toast-' + (type || 'info');
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
       BUTTON LOADING STATE HELPER
       ========================================================= */
    function setButtonLoading(btn, isLoading, loadingLabel) {
        if (!btn) return;

        if (isLoading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.classList.add('is-loading');
            btn.innerHTML = '<i class="bi bi-arrow-repeat sa-spin"></i> ' + (loadingLabel || 'Saving...');
        } else {
            btn.disabled = false;
            btn.classList.remove('is-loading');
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }
        }
    }

    /* =========================================================
       COPY STORE URL
       ========================================================= */
    const copyStoreUrlBtn = document.getElementById('saCopyStoreUrlBtn');

    if (copyStoreUrlBtn) {
        copyStoreUrlBtn.addEventListener('click', function () {
            const url = copyStoreUrlBtn.dataset.storeUrl || '';

            if (!url) {
                showToast('No store URL available to copy yet.', 'error');
                return;
            }

            const originalIcon = copyStoreUrlBtn.innerHTML;

            const markCopied = function () {
                copyStoreUrlBtn.classList.add('is-copied');
                copyStoreUrlBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                showToast('Store URL copied to clipboard.', 'success');

                window.setTimeout(function () {
                    copyStoreUrlBtn.classList.remove('is-copied');
                    copyStoreUrlBtn.innerHTML = originalIcon;
                }, 1800);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(markCopied).catch(function () {
                    showToast('Could not copy the store URL.', 'error');
                });
            } else {
                const tempInput = document.createElement('textarea');
                tempInput.value = url;
                tempInput.style.position = 'fixed';
                tempInput.style.opacity = '0';
                document.body.appendChild(tempInput);
                tempInput.select();

                try {
                    document.execCommand('copy');
                    markCopied();
                } catch (err) {
                    showToast('Could not copy the store URL.', 'error');
                }

                document.body.removeChild(tempInput);
            }
        });
    }

    /* =========================================================
       EDIT STORE INFORMATION (modal, placeholder save)
       ========================================================= */
    const editStoreModalEl = document.getElementById('saEditStoreModal');
    const saveStoreBtn = document.getElementById('saSaveStoreBtn');

    let editStoreModal = null;
    if (editStoreModalEl && window.bootstrap && window.bootstrap.Modal) {
        editStoreModal = new window.bootstrap.Modal(editStoreModalEl);
    }

    if (saveStoreBtn) {
        saveStoreBtn.addEventListener('click', function () {
            if (saveStoreBtn.classList.contains('is-loading')) return;

            const storeName = document.getElementById('saStoreNameInput');
            const storeEmail = document.getElementById('saStoreEmailInput');
            const description = document.getElementById('saStoreDescriptionInput');
            const storeLogo = document.getElementById('store_logo');
            const storeBanner = document.getElementById('store_banner');

            if (storeName && !storeName.value.trim()) {
                showToast('Please enter a store name before saving.', 'error');
                storeName.focus();
                return;
            }

            setButtonLoading(saveStoreBtn, true, 'Saving...');

            const formData = new FormData();

            formData.append("store_name", storeName.value.trim());
            formData.append("store_email", storeEmail.value.trim());
            formData.append("store_description", description.value.trim());

            if (storeLogo.files.length > 0) {
                formData.append("store_logo", storeLogo.files[0]);
            }

            if (storeBanner.files.length > 0) {
                formData.append("store_banner", storeBanner.files[0]);
            }

            fetch("/accounts/update-seller-info/", {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                },
                body: formData,
            })
                .then(response => response.json())
                .then(data => {
                    setButtonLoading(saveStoreBtn, false);

                    if (data.success) {
                        if (editStoreModal) {
                            editStoreModal.hide();
                        }

                        showToast(data.message, "success");

                        // Optional: refresh the page so updated information appears
                        window.location.reload();
                    } else {
                        showToast(data.message || "Unable to update store information.", "error");
                    }
                })
                .catch(error => {
                    console.error(error);

                    setButtonLoading(saveStoreBtn, false);

                    showToast("Something went wrong. Please try again.", "error");
                });
        });
    }

    /* =========================================================
       UPDATE BUSINESS ADDRESS (modal, placeholder save)
       ========================================================= */
    const editAddressModalEl = document.getElementById('saEditAddressModal');
    const saveAddressBtn = document.getElementById('saSaveAddressBtn');

    let editAddressModal = null;
    if (editAddressModalEl && window.bootstrap && window.bootstrap.Modal) {
        editAddressModal = new window.bootstrap.Modal(editAddressModalEl);
    }

    if (saveAddressBtn) {
        saveAddressBtn.addEventListener('click', function () {
            if (saveAddressBtn.classList.contains('is-loading')) return;

            const fullName = document.getElementById('saAddrFullNameInput');
            const phone = document.getElementById('saAddrPhoneInput');
            const addressLine = document.getElementById('saAddrLineInput');
            const city = document.getElementById('saAddrCityInput');
            const postalCode = document.getElementById('saAddrPostalInput');

            if (fullName && !fullName.value.trim()) {
                showToast('Please enter a business contact name.', 'error');
                fullName.focus();
                return;
            }

            if (addressLine && !addressLine.value.trim()) {
                showToast('Please enter a business address.', 'error');
                addressLine.focus();
                return;
            }

            setButtonLoading(saveAddressBtn, true, 'Saving...');

            const formData = new FormData();

            formData.append("fullName", fullName.value.trim());
            formData.append("phone", phone.value.trim());
            formData.append("address", addressLine.value.trim());
            formData.append("city", city.value.trim());
            formData.append("postalCode", postalCode.value.trim());

            fetch("/accounts/update-seller-address/", {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                },
                body: formData,
            })
                .then(response => response.json())
                .then(data => {
                    setButtonLoading(saveAddressBtn, false);

                    if (data.success) {
                        if (editAddressModal) {
                            editAddressModal.hide();
                        }

                        showToast(data.message, "success");

                        // Refresh the page to display updated address
                        window.location.reload();
                    } else {
                        showToast(data.message || "Unable to update business address.", "error");
                    }
                })
                .catch(error => {
                    console.error(error);

                    setButtonLoading(saveAddressBtn, false);

                    showToast("Something went wrong. Please try again.", "error");
                });
        });
    }

    /* =========================================================
       GO TO SELLER DASHBOARD (placeholder — no dashboard yet)
       ========================================================= */
    const dashboardBtn = document.getElementById('saDashboardBtn');

    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showToast('The seller dashboard isn\'t available yet — check back soon.', 'info');
        });
    }

    /* =========================================================
       REACTIVATE STORE (placeholder — no backend yet)
       ========================================================= */
    const reactivateBtn = document.getElementById('saReactivateBtn');

    if (reactivateBtn) {
        reactivateBtn.addEventListener('click', function () {
            if (reactivateBtn.classList.contains('is-loading')) return;

            const confirmed = window.confirm('Reactivate your store? Your listings will become visible to buyers again once this is live.');
            if (!confirmed) return;

            setButtonLoading(reactivateBtn, true, 'Reactivating...');

            window.setTimeout(function () {
                setButtonLoading(reactivateBtn, false);
                showToast('Reactivating your store isn\'t available yet — check back soon.', 'info');
            }, 700);
        });
    }

    /* =========================================================
       SELLER TOOLS GRID (Product Management, Analytics, etc.)
       ========================================================= */
    const futureToolButtons = document.querySelectorAll('.sa-future-btn.is-disabled');

    futureToolButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const feature = btn.dataset.feature || 'This tool';
            showToast(feature + ' isn\'t available yet — check back soon.', 'info');
        });
    });

    /* =========================================================
       BUTTON RIPPLE EFFECT (matches order_detail.js / confirmation.js)
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

    document.querySelectorAll('.sa-status-card-btn, .sa-edit-btn, .sa-future-btn')
        .forEach(bindRipple);

    /* =========================================================
       SCROLL REVEAL (matches home.js / order_detail.js pattern)
       ========================================================= */
    const revealTargets = document.querySelectorAll('.sa-card, .sa-profile-card');

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
