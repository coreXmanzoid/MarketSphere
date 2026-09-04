document.addEventListener("DOMContentLoaded", function () {

    const notificationButton = document.getElementById("msNotificationBtn");
    const notificationPanel = document.getElementById("msNotificationPanel");
    const clearNotifications = document.getElementById("msClearNotifications");
    const notificationList = document.getElementById("msNotificationList");
    const notificationEmpty = document.getElementById("msNotificationEmpty");
    const notificationDot = document.querySelector(".ms-notification-dot");

    if (notificationButton && notificationPanel) {

        const userId = notificationButton.dataset.userId;
        let notificationsWereOpened = false;

        function getCsrfToken() {
            const csrfInput = document.querySelector(
                "[name=csrfmiddlewaretoken]"
            );

            if (csrfInput) {
                return csrfInput.value;
            }

            const cookie = document.cookie
                .split("; ")
                .find(row => row.startsWith("csrftoken="));

            return cookie
                ? decodeURIComponent(cookie.split("=")[1])
                : "";
        }

        async function markNotificationsAsRead() {
            if (!userId || !notificationsWereOpened) return;

            const unreadNotifications = notificationList
                ? notificationList.querySelectorAll(".is-unread")
                : [];

            if (!unreadNotifications.length) {
                notificationsWereOpened = false;
                return;
            }

            try {
                const response = await fetch(
                    `/notifications/mark-all-as-read/${userId}/`,
                    {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCsrfToken(),
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        credentials: "same-origin",
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to mark notifications as read."
                    );
                }

                unreadNotifications.forEach(notification => {
                    notification.classList.remove("is-unread");

                    const status = notification.querySelector(
                        ".ms-notification-status"
                    );

                    if (status) {
                        status.remove();
                    }
                });

                if (notificationDot) {
                    notificationDot.hidden = true;
                }

            } catch (error) {
                console.error(
                    "Notification read error:",
                    error
                );
            } finally {
                notificationsWereOpened = false;
            }
        }

        async function clearAllNotifications() {
            if (!userId) return;

            try {
                const response = await fetch(
                    `/notifications/clear-all/${userId}/`,
                    {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCsrfToken(),
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        credentials: "same-origin",
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to clear notifications."
                    );
                }

                const data = await response.json();

                if (data.status === "success") {
                    if (notificationList) {
                        notificationList.hidden = true;
                    }

                    if (notificationEmpty) {
                        notificationEmpty.hidden = false;
                    }

                    if (notificationDot) {
                        notificationDot.hidden = true;
                    }

                    notificationsWereOpened = false;
                }

            } catch (error) {
                console.error(
                    "Notification clear error:",
                    error
                );
            }
        }

        function closeNotifications() {
            if (!notificationPanel.classList.contains("is-open")) {
                return;
            }

            notificationPanel.classList.remove("is-open");
            notificationPanel.setAttribute("aria-hidden", "true");
            notificationButton.setAttribute("aria-expanded", "false");

            markNotificationsAsRead();
        }

        notificationButton.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = notificationPanel.classList.toggle(
                "is-open"
            );

            notificationPanel.setAttribute(
                "aria-hidden",
                isOpen ? "false" : "true"
            );

            notificationButton.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );

            if (isOpen) {
                notificationsWereOpened = true;
            } else {
                markNotificationsAsRead();
            }
        });

        notificationPanel.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        document.addEventListener("click", closeNotifications);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeNotifications();
            }
        });

        if (clearNotifications) {
            clearNotifications.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    clearAllNotifications();
                }
            );
        }
    }

    const profileChip = document.getElementById("buyerProfile");
    const profileMenu = document.getElementById("buyerProfileMenu");

    if (profileChip && profileMenu) {

        function closeProfileMenu() {
            profileMenu.classList.remove("show");
            profileChip.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        profileChip.addEventListener("click", function (event) {
            if (event.target.closest(".buyer-profile-menu")) {
                return;
            }

            event.stopPropagation();

            const isOpen = profileMenu.classList.toggle("show");

            profileChip.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );
        });

        profileChip.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            if (event.target.closest(".buyer-profile-menu")) {
                return;
            }

            event.preventDefault();
            profileChip.click();
        });

        profileMenu.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        document.addEventListener("click", closeProfileMenu);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeProfileMenu();
            }
        });
    }

    const messages = document.querySelectorAll(
        ".header-message-row [data-auto-hide='true']"
    );

    messages.forEach(message => {
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


function showToast(message, type = "info", autoHide = true) {
    const messageRow = document.querySelector(".header-message-row .container");

    if (!messageRow) {
        console.warn("Toast container not found.");
        return;
    }

    const config = {
        success: {
            icon: "bi-check2-circle",
            label: "Success"
        },
        error: {
            icon: "bi-exclamation-triangle",
            label: "Action needed"
        },
        warning: {
            icon: "bi-exclamation-circle",
            label: "Warning"
        },
        info: {
            icon: "bi-info-circle",
            label: "Notice"
        }
    };

    const toastType = config[type] || config.info;

    const toast = document.createElement("div");
    toast.className = `app-message app-message-${type} alert alert-dismissible fade show temp-message`;
    toast.setAttribute("role", "alert");

    toast.innerHTML = `
        <div class="app-message__icon" aria-hidden="true">
            <i class="bi ${toastType.icon}"></i>
        </div>

        <div class="app-message__content">
            <span class="app-message__label">${toastType.label}</span>
            <span class="app-message__text">${message}</span>
        </div>

        <button
            type="button"
            class="btn-close app-message__close"
            data-bs-dismiss="alert"
            aria-label="Close">
        </button>
    `;

    messageRow.appendChild(toast);

    if (autoHide) {
        setTimeout(() => {
            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();
            }, 150);
        }, 5000);
    }
}
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
            if (card.dataset.productSlug) {
                return card.dataset.productSlug;
            }

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

document.addEventListener('DOMContentLoaded', function() {
    function handleCompactUpload(inputId, outputId) {
        const input = document.getElementById(inputId);
        const output = document.getElementById(outputId);
        
        if (input && output) {
            input.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const filename = this.files[0].name;
                    output.textContent = filename;
                    output.style.display = 'inline-block'; // Show filename badge
                    
                    // Hide the main prompt text to save spacing
                    const labelText = this.closest('label').querySelector('.label-text');
                    if (labelText) labelText.style.display = 'none';
                }
            });
        }
    }

    // Initialize trackers for both discrete elements
    handleCompactUpload('store_logo', 'logo-file-name');
    handleCompactUpload('store_banner', 'banner-file-name');
});
