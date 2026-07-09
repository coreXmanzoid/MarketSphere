document.addEventListener('DOMContentLoaded', function () {

    /* =========================================================
       CONSTANTS & DOM CACHE
       ========================================================= */
    const REQUEST_TIMEOUT_MS = 10000;
    const TOAST_DURATION_MS = 4500;
    const REMOVE_ANIMATION_MS = 400;

    const cartRoot = document.getElementById('cartRoot');
    const itemsList = document.getElementById('cartItemsList');
    const emptyState = document.getElementById('cartEmptyState');
    const clearCartBtn = document.getElementById('cartClearBtn');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    const promoForm = document.getElementById('cartPromoForm');
    const toastContainer = document.getElementById('cartToastContainer');

    const cartItemCountValue = document.getElementById('cartItemCountValue');
    const cartToolbarCount = document.getElementById('cartToolbarCount');

    const summaryEls = {
        subtotal: document.getElementById('summarySubtotal'),
        shipping: document.getElementById('summaryShipping'),
        tax: document.getElementById('summaryTax'),
        discount: document.getElementById('summaryDiscount'),
        discountRow: document.getElementById('summaryDiscountRow'),
        total: document.getElementById('summaryTotal')
    };

    // NOTE: requires base.html to give the cart badge span id="cartCounter".
    // Falls back to the old (unreliable) selector only if the id is missing,
    // so nothing breaks before that template change ships.
    const cartBadge =
        document.getElementById('cartCounter') ||
        document.querySelector('.site-header .badge.bg-danger');

    if (!cartRoot || !itemsList) {
        return;
    }

    /* =========================================================
       UTILITIES
       ========================================================= */
    function getCsrfToken() {
        // Read fresh on every call rather than caching once at load time,
        // since the cookie may not exist yet on first paint and can rotate.
        const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function formatCurrency(value) {
        const numeric = Number(value);
        const safeValue = Number.isFinite(numeric) ? numeric : 0;
        return 'Rs. ' + safeValue.toLocaleString('en-IN');
    }

    function parseCurrency(value) {
        const cleaned = String(value || '').replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function debounce(fn, delay) {
        let timer = null;
        return function debounced(...args) {
            window.clearTimeout(timer);
            timer = window.setTimeout(function () {
                fn.apply(null, args);
            }, delay);
        };
    }

    /* =========================================================
       TOAST / MESSAGE FEEDBACK
       ========================================================= */
    function showToast(message, type) {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'cart-toast cart-toast-' + (type || 'info');
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

    function showError(message) {
        showToast(message || 'Something went wrong. Please try again.', 'error');
    }

    /* =========================================================
       FETCH WRAPPER
       ========================================================= */
    async function requestJSON(url, options = {}) {
        if (!url) {
            throw new Error("Missing endpoint URL.");
        }

        const controller = new AbortController();

        const timeoutId = setTimeout(() => {
            controller.abort();
        }, REQUEST_TIMEOUT_MS);

        const csrfToken = getCsrfToken();

        const headers = {
            "X-Requested-With": "XMLHttpRequest",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
            ...(options.headers || {})
        };

        const fetchOptions = {
            method: options.method || "GET",
            credentials: "same-origin",
            headers,
            signal: controller.signal
        };

        if (options.body !== undefined) {
            fetchOptions.body = options.body;
        }

        try {
            const response = await fetch(url, fetchOptions);

            clearTimeout(timeoutId);

            if (
                response.redirected &&
                /\/accounts\/login|\/login\/?($|\?)/.test(response.url)
            ) {
                throw new Error("Your session has expired. Please log in again.");
            }

            if (response.status === 403) {
                const text = await response.text();
                console.error(text);

                throw new Error(
                    "CSRF verification failed. Check Django configuration."
                );
            }

            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }

            return await response.json();

        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === "AbortError") {
                throw new Error("Request timed out.");
            }

            throw err;
        }
    }

    /* =========================================================
       BUTTON / CARD LOADING STATES
       ========================================================= */
    function setButtonLoading(btn, isLoading) {
        if (!btn) return;

        if (isLoading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.classList.add('is-loading');
            btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i>';
        } else {
            btn.disabled = false;
            btn.classList.remove('is-loading');
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }
        }
    }

    function setCardBusy(card, isBusy) {
        if (!card) return;
        card.classList.toggle('is-updating', isBusy);

        card.querySelectorAll('button, input').forEach(function (el) {
            el.disabled = isBusy;
        });
    }

    /* =========================================================
       SUMMARY & BADGE SYNC
       ========================================================= */
    function updateSummary(data) {
        if (!data) return;
        console.log(data);
        if (summaryEls.subtotal && 'subtotal' in data) {
            summaryEls.subtotal.textContent = formatCurrency(data.subtotal);
        }

        if (summaryEls.shipping && 'shipping' in data) {
            summaryEls.shipping.textContent = formatCurrency(data.shipping);
        }

        if (summaryEls.tax && 'tax' in data) {
            summaryEls.tax.textContent = formatCurrency(data.tax);
        }

        if ('discount' in data) {
            const discountValue = Number(data.discount) || 0;

            if (summaryEls.discount) {
                summaryEls.discount.textContent = '- ' + formatCurrency(discountValue);
            }

            if (summaryEls.discountRow) {
                summaryEls.discountRow.classList.toggle('d-none', discountValue <= 0);
            }
        }

        if (summaryEls.total && 'total' in data) {
            summaryEls.total.textContent = formatCurrency(data.total);
        }

        if ('cart_count' in data) {
            updateCartCount(data.cart_count);
        }
    }

    function updateCartCount(count) {
        const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;

        if (cartItemCountValue) {
            cartItemCountValue.textContent = String(safeCount);
        }

        if (cartToolbarCount) {
            cartToolbarCount.textContent = String(safeCount);
        }

        if (cartBadge) {
            cartBadge.textContent = String(safeCount);
            cartBadge.classList.toggle('d-none', safeCount === 0);
        }
    }

    function flashSubtotal(card) {
        const subtotalValueEl = card.querySelector('.cart-item-subtotal-value');
        if (!subtotalValueEl) return;

        subtotalValueEl.classList.add('is-flashing');
        window.setTimeout(function () {
            subtotalValueEl.classList.remove('is-flashing');
        }, 400);
    }

    /* =========================================================
       EMPTY STATE
       ========================================================= */
    function checkEmptyState() {
        const remainingItems = itemsList.querySelectorAll('[data-cart-item]').length;
        const isEmpty = remainingItems === 0;

        itemsList.classList.toggle('d-none', isEmpty);

        if (emptyState) {
            emptyState.classList.toggle('d-none', !isEmpty);
        }

        if (checkoutBtn) checkoutBtn.disabled = isEmpty;
        if (clearCartBtn) clearCartBtn.disabled = isEmpty;
    }

    /* =========================================================
       QUANTITY CHANGES
       ========================================================= */
    async function changeQuantity(card, nextQuantity, endpointKey) {
        const url = card.dataset[endpointKey];
        const qtyInput = card.querySelector('.cart-qty-input');

        if (!url || !qtyInput) return;

        const min = parseInt(qtyInput.min, 10) || 1;
        const max = parseInt(qtyInput.max, 10) || 99;
        const clampedQuantity = Math.min(Math.max(nextQuantity, min), max);
        const currentQuantity = parseInt(card.dataset.quantity, 10) || 1;

        if (clampedQuantity === currentQuantity) {
            qtyInput.value = String(currentQuantity);
            return;
        }

        setCardBusy(card, true);

        try {
            // The update-quantity view reads request.POST (form-encoded),
            // not a JSON body — send it the way Django expects.
            const isUpdateEndpoint = endpointKey === 'updateUrl';
            const data = await requestJSON(url, {
                method: 'POST',
                headers: isUpdateEndpoint
                    ? { 'Content-Type': 'application/x-www-form-urlencoded' }
                    : {},
                body: isUpdateEndpoint
                    ? new URLSearchParams({ quantity: String(clampedQuantity) })
                    : undefined
            });

            card.dataset.quantity = String(clampedQuantity);
            qtyInput.value = String(clampedQuantity);

            const subtotalValueEl = card.querySelector('.cart-item-subtotal-value');
            const itemSubtotal = data && 'item_subtotal' in data
                ? data.item_subtotal
                : clampedQuantity * parseCurrency(card.dataset.unitPrice);

            if (subtotalValueEl) {
                subtotalValueEl.textContent = formatCurrency(itemSubtotal);
            }

            flashSubtotal(card);
            updateSummary(data);

            if (data && data.removed) {
                card.remove();
                checkEmptyState();
            }
        } catch (error) {
            // Revert the input to the last known-good value on failure.
            qtyInput.value = String(currentQuantity);
            showError(error.message);
        } finally {
            setCardBusy(card, false);
        }
    }

    const scheduleManualQuantityUpdate = debounce(function (card, quantity) {
        changeQuantity(card, quantity, 'updateUrl');
    }, 450);

    /* =========================================================
       REMOVE ITEM
       ========================================================= */
    async function removeItem(card) {
        const url = card.dataset.removeUrl;
        const removeBtn = card.querySelector('.cart-remove-btn');

        if (!url) return;

        setCardBusy(card, true);
        setButtonLoading(removeBtn, true);

        try {
            const data = await requestJSON(url, { method: 'POST' });

            card.classList.add('is-removing');

            window.setTimeout(function () {
                card.remove();
                checkEmptyState();
            }, REMOVE_ANIMATION_MS);

            updateSummary(data);
            showToast('Item removed from cart.', 'success');
        } catch (error) {
            setCardBusy(card, false);
            setButtonLoading(removeBtn, false);
            showError(error.message);
        }
    }

    /* =========================================================
       CLEAR CART
       ========================================================= */
    async function clearCart() {
        const url = cartRoot.dataset.clearCartUrl;
        if (!url) {
            showError('Clear cart is not available right now.');
            return;
        }

        const confirmed = window.confirm('Remove all items from your cart?');
        if (!confirmed) return;

        setButtonLoading(clearCartBtn, true);

        try {
            const data = await requestJSON(url, { method: 'POST' });

            itemsList.querySelectorAll('[data-cart-item]').forEach(function (card) {
                card.remove();
            });

            checkEmptyState();
            updateSummary(data || { cart_count: 0, subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 });
            showToast('Cart cleared.', 'success');
        } catch (error) {
            showError(error.message);
        } finally {
            setButtonLoading(clearCartBtn, false);
        }
    }

    /* =========================================================
       PROMO CODE
       ========================================================= */
    async function applyPromoCode(event) {
        event.preventDefault();

        const input = document.getElementById('cartPromoInput');
        const submitBtn = promoForm.querySelector('.cart-promo-btn');
        const code = input ? input.value.trim() : '';
        const url = promoForm.dataset.applyPromoUrl;

        if (!code) {
            showError('Please enter a promo code.');
            return;
        }

        if (!url) {
            showError('Promo codes are not available right now.');
            return;
        }

        setButtonLoading(submitBtn, true);

        try {
            const data = await requestJSON(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ code: code })
            });

            updateSummary(data);
            showToast('Promo code applied.', 'success');
        } catch (error) {
            showError(error.message);
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    /* =========================================================
       EVENT DELEGATION: CART ITEMS
       ========================================================= */
    itemsList.addEventListener('click', function (event) {
        const card = event.target.closest('[data-cart-item]');
        if (!card) return;

        const incrementBtn = event.target.closest('.cart-qty-increment');
        if (incrementBtn) {
            incrementBtn.classList.add('cart-qty-pop');
            window.setTimeout(function () { incrementBtn.classList.remove('cart-qty-pop'); }, 150);

            const currentQuantity = parseInt(card.dataset.quantity, 10) || 1;
            changeQuantity(card, currentQuantity + 1, 'incrementUrl');
            return;
        }

        const decrementBtn = event.target.closest('.cart-qty-decrement');
        if (decrementBtn) {
            decrementBtn.classList.add('cart-qty-pop');
            window.setTimeout(function () { decrementBtn.classList.remove('cart-qty-pop'); }, 150);

            const currentQuantity = parseInt(card.dataset.quantity, 10) || 1;
            changeQuantity(card, currentQuantity - 1, 'decrementUrl');
            return;
        }

        if (event.target.closest('.cart-remove-btn')) {
            removeItem(card);
        }
    });

    itemsList.addEventListener('change', function (event) {
        const qtyInput = event.target.closest('.cart-qty-input');
        if (!qtyInput) return;

        const card = qtyInput.closest('[data-cart-item]');
        if (!card) return;

        const nextQuantity = parseInt(qtyInput.value, 10);

        if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
            qtyInput.value = card.dataset.quantity;
            return;
        }

        scheduleManualQuantityUpdate(card, nextQuantity);
    });

    /* =========================================================
       INIT
       ========================================================= */
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }

    if (promoForm) {
        promoForm.addEventListener('submit', applyPromoCode);
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function () {
            checkoutBtn.classList.add('pd-btn-pulse');
            window.setTimeout(function () {
                checkoutBtn.classList.remove('pd-btn-pulse');
            }, 400);
            // Django will redirect to the checkout flow here.
        });
    }

    checkEmptyState();
});
