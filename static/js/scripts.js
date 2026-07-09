document.addEventListener("DOMContentLoaded", function () {
    const messages = document.querySelectorAll(".header-message-row [data-auto-hide='true']");

    messages.forEach((message) => {
        setTimeout(() => {
            message.classList.remove("show");

            message.addEventListener(
                "transitionend",
                () => {
                    message.classList.add("d-none");
                },
                { once: true }
            );
        }, 10000);
    });
});

function clearActiveMenuState() {
    document.querySelectorAll(".category-item, .child-item").forEach((item) => {
        item.classList.remove("is-active");
    });
}

function setActiveCategoryBySubmenu(submenu) {
    if (!submenu || !submenu.id) {
        return;
    }

    const categoryItem = document.querySelector(`.category-item[data-target="${submenu.id}"]`);
    if (categoryItem) {
        categoryItem.classList.add("is-active");
    }
}

function activateChildPath(childItem) {
    if (!childItem) {
        return;
    }

    clearActiveMenuState();

    const submenu = childItem.closest(".submenu");
    setActiveCategoryBySubmenu(submenu);
    childItem.classList.add("is-active");
}

document.querySelectorAll(".category-item").forEach(item => {
    item.addEventListener("mouseenter", function () {
        clearActiveMenuState();
        this.classList.add("is-active");

        document.querySelectorAll(".submenu").forEach(menu => {
            menu.classList.add("d-none");
        });

        const submenu = document.getElementById(this.dataset.target);
        if (submenu) {
            submenu.classList.remove("d-none");
        }
    });
});

document.querySelectorAll(".child-item").forEach((item) => {
    item.addEventListener("mouseenter", function () {
        activateChildPath(this);
    });
});

document.querySelectorAll(".grandchild-item").forEach((item) => {
    item.addEventListener("mouseenter", function () {
        activateChildPath(this.closest(".child-item"));
    });
});

const headerMainRow = document.querySelector(".header-main-row");

function setStickyHeaderHeight() {
    if (!headerMainRow) {
        return;
    }

    document.documentElement.style.setProperty(
        "--sticky-header-height",
        `${headerMainRow.offsetHeight}px`
    );
}

setStickyHeaderHeight();
window.addEventListener("resize", setStickyHeaderHeight);

document.addEventListener("DOMContentLoaded", function () {
    const wishlistSelectors = "button.wishlist-btn, button.pd-wishlist-btn, button.wishlist-remove-inline-btn";
    const pendingButtons = new WeakSet();
    const requestTimeoutMs = 15000;
    const removalAnimationMs = 350;

    const navbarCounter = document.getElementById("wishlistCounter");
    const wishlistResultsMeta = document.querySelector(".wishlist-results-meta");
    const wishlistGrid = document.getElementById("wishlistGrid");
    const wishlistEmptyState = document.getElementById("wishlistEmptyState");
    const wishlistEmptyStateDynamic = document.getElementById("wishlistEmptyStateDynamic");
    const wishlistContinueLink = document.querySelector(".wishlist-continue-link");

    function getCsrfToken() {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        if (cookieMatch) {
            return decodeURIComponent(cookieMatch[1]);
        }

        const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
        return tokenInput ? tokenInput.value : "";
    }
    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/["'()\/]/g, "")        // remove quotes, parentheses, and slashes
            .replace(/[^a-z0-9]+/g, "-")     // replace other non-alphanumerics with hyphen
            .replace(/^-+|-+$/g, "");        // trim leading/trailing hyphens
    }


    function resolveProductSlug(button) {
        if (!button) {
            return "";
        }

        if (button.dataset.productSlug) {
            return button.dataset.productSlug;
        }

        const card = button.closest(".product-card");
        if (card) {
            const cardName = card.querySelector(".product-name");
            if (cardName) {
                return slugify(cardName.textContent);
            }
        }

        const pdTitle = document.querySelector(".pd-title");
        if (pdTitle && button.id === "pdWishlistBtn") {
            return slugify(pdTitle.textContent);
        }

        return "";
    }

    function getToggleUrl(button) {
        if (!button) {
            return "";
        }

        if (button.dataset.toggleUrl) {
            return button.dataset.toggleUrl;
        }

        const slug = resolveProductSlug(button);
        if (!slug) {
            return "";
        }

        return "/wishlist/toggle/" + encodeURIComponent(slug) + "/";
    }

    function setButtonBusy(button, isBusy) {
        if (!button) {
            return;
        }

        button.disabled = isBusy;
        button.classList.toggle("is-loading", isBusy);
        button.setAttribute("aria-busy", isBusy ? "true" : "false");
    }

    function isWishlistPageButton(button) {
        return Boolean(button && (button.closest("#wishlistGrid") || button.classList.contains("wishlist-remove-inline-btn")));
    }

    function shouldSyncHeartState(button) {
        return Boolean(button && (button.classList.contains("wishlist-btn") || button.classList.contains("pd-wishlist-btn")));
    }

    function syncToggleButton(button, isAdded) {
        if (!shouldSyncHeartState(button)) {
            return;
        }

        button.classList.toggle("active", isAdded);

        const icon = button.querySelector("i");
        if (icon) {
            icon.classList.toggle("bi-heart-fill", isAdded);
            icon.classList.toggle("bi-heart", !isAdded);
        }

        const label = button.querySelector("span");
        if (label && button.classList.contains("pd-wishlist-btn")) {
            label.textContent = isAdded ? "Wishlisted" : "Wishlist";
        }

        button.setAttribute("aria-label", isAdded ? "Remove from wishlist" : "Add to wishlist");
        button.setAttribute("aria-pressed", isAdded ? "true" : "false");
    }

    function updateNavbarCounter(count) {
        if (!navbarCounter || typeof count === "undefined" || count === null) {
            return;
        }

        navbarCounter.textContent = String(count);
    }

    function updateWishlistPageMeta(count) {
        if (!wishlistResultsMeta || typeof count === "undefined" || count === null) {
            return;
        }

        const countEl = wishlistResultsMeta.querySelector("#wishlistCount");
        if (!countEl) {
            return;
        }

        wishlistResultsMeta.innerHTML = "<strong id=\"wishlistCount\">" + count + "</strong> item" + (count === 1 ? "" : "s") + " saved";
    }

    function setWishlistEmptyState(isEmpty) {
        if (wishlistGrid) {
            wishlistGrid.classList.toggle("d-none", isEmpty);
        }

        if (wishlistEmptyStateDynamic) {
            wishlistEmptyStateDynamic.classList.toggle("d-none", !isEmpty);
        }

        if (wishlistContinueLink) {
            wishlistContinueLink.classList.toggle("d-none", isEmpty);
        }

        if (!wishlistGrid && wishlistEmptyState) {
            wishlistEmptyState.classList.toggle("d-none", !isEmpty);
        }
    }

    function removeWishlistCard(button, nextCount) {
        const item = button ? button.closest(".wishlist-grid-item") : null;
        if (!item) {
            updateNavbarCounter(nextCount);
            updateWishlistPageMeta(nextCount);
            setWishlistEmptyState(nextCount === 0);
            return;
        }

        item.classList.add("is-removing");

        const heartButton = item.querySelector(".wishlist-remove-btn");
        if (heartButton) {
            heartButton.classList.add("is-removing");
        }

        const inlineButton = item.querySelector(".wishlist-remove-inline-btn");
        if (inlineButton) {
            inlineButton.disabled = true;
        }

        window.setTimeout(function () {
            item.remove();
            updateNavbarCounter(nextCount);
            updateWishlistPageMeta(nextCount);
            setWishlistEmptyState(nextCount === 0);
        }, removalAnimationMs);
    }

    function showWishlistMessage(message) {
        const container = document.querySelector(".header-message-row .container") || document.body;
        const alertEl = document.createElement("div");

        alertEl.className = "app-message app-message-error alert alert-dismissible fade show temp-message";
        alertEl.setAttribute("role", "alert");

        alertEl.innerHTML = [
            '<div class="app-message__icon" aria-hidden="true"><i class="bi bi-exclamation-triangle"></i></div>',
            '<div class="app-message__content">',
            '<span class="app-message__label">Action needed</span>',
            '<span class="app-message__text"></span>',
            "</div>",
            '<button type="button" class="btn-close app-message__close" aria-label="Close"></button>'
        ].join("");

        alertEl.querySelector(".app-message__text").textContent = message;
        container.prepend(alertEl);

        const closeButton = alertEl.querySelector(".btn-close");
        const dismissAlert = function () {
            alertEl.classList.remove("show");
            window.setTimeout(function () {
                alertEl.remove();
            }, 150);
        };

        if (closeButton) {
            closeButton.addEventListener("click", dismissAlert);
        }

        window.setTimeout(dismissAlert, 5000);
    }

    function getFriendlyErrorMessage(error, response) {
        if (error && error.name === "AbortError") {
            return "The wishlist request timed out. Please try again.";
        }

        if (error && error.message) {
            return error.message;
        }

        if (response) {
            if (response.status === 200){
                return "Product Successfully Added to Wishlist."
            }
            if (response.status === 403) {
                return "Please sign in to save items to your wishlist.";
            }

            if (response.status === 404) {
                return "We could not find that product.";
            }

            if (response.status >= 500) {
                return "The wishlist service is temporarily unavailable.";
            }
        }

        return "We could not update your wishlist right now. Please try again.";
    }

    async function handleWishlistToggle(button) {
        if (!button || pendingButtons.has(button)) {
            return;
        }

        const url = getToggleUrl(button);
        if (!url) {
            return;
        }

        pendingButtons.add(button);
        setButtonBusy(button, true);

        let timeoutId = 0;

        try {
            const controller = new AbortController();
            timeoutId = window.setTimeout(function () {
                controller.abort();
            }, requestTimeoutMs);

            const response = await fetch(url, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "X-CSRFToken": getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest"
                },
                signal: controller.signal
            });

            window.clearTimeout(timeoutId);

            if (response.redirected && /\/accounts\/login|\/login/.test(response.url)) {
                throw { message: "Please sign in to save items to your wishlist." };
            }

            const contentType = response.headers.get("content-type") || "";
            let data = null;

            if (contentType.indexOf("application/json") !== -1) {
                try {
                    data = await response.json();
                } catch (parseError) {
                    throw { message: "The server returned invalid data. Please try again." };
                }
            }

            if (!response.ok) {
                throw { message: getFriendlyErrorMessage(null, response) };
            }

            if (!data || !data.success) {
                throw { message: (data && data.message) ? data.message : "We could not update your wishlist right now." };
            }

            const isAdded = Boolean(data.is_added);
            const productSlug = resolveProductSlug(button);

            if (isWishlistPageButton(button) && !isAdded) {
                updateNavbarCounter(data.wishlist_count);
                updateWishlistPageMeta(data.wishlist_count);
                removeWishlistCard(button, data.wishlist_count);
            } else {
                syncToggleButton(button, isAdded);
                updateNavbarCounter(data.wishlist_count);

                if (productSlug) {
                    document.querySelectorAll('[data-product-slug="' + productSlug + '"]').forEach(function (matchButton) {
                        if (matchButton !== button) {
                            syncToggleButton(matchButton, isAdded);
                        }
                    });
                }
            }

            if (wishlistGrid) {
                const remainingItems = wishlistGrid.querySelectorAll(".wishlist-grid-item").length;
                if (!remainingItems) {
                    setWishlistEmptyState(true);
                } else {
                    setWishlistEmptyState(false);
                }
            }
        } catch (error) {
            showWishlistMessage(getFriendlyErrorMessage(error));
        } finally {
            window.clearTimeout(timeoutId);
            setButtonBusy(button, false);
            pendingButtons.delete(button);
        }
    }

    function syncInitialWishlistButtons() {
        document.querySelectorAll(wishlistSelectors).forEach(function (button) {
            if (button.classList.contains("wishlist-remove-inline-btn")) {
                return;
            }

            syncToggleButton(button, button.classList.contains("active"));
        });
    }

    document.addEventListener("click", function (event) {
        const button = event.target.closest(wishlistSelectors);
        if (!button) {
            return;
        }

        if (button.disabled || pendingButtons.has(button)) {
            event.preventDefault();
            return;
        }

        const url = getToggleUrl(button);
        if (!url) {
            return;
        }

        event.preventDefault();
        handleWishlistToggle(button);
    });

    if (wishlistGrid) {
        const initialCount = wishlistGrid.querySelectorAll(".wishlist-grid-item").length;
        updateNavbarCounter(initialCount);
        updateWishlistPageMeta(initialCount);
        setWishlistEmptyState(initialCount === 0);
    }

    syncInitialWishlistButtons();
});
function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {
            cookie = cookie.trim();

            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }

    return cookieValue;
}