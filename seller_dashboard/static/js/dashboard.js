/* =========================================================
   MARKETSPHERE — SELLER DASHBOARD SHELL
   Frontend-only behavior for the reusable dashboard layout.
   No fetch, no AJAX, no backend calls, no external libraries.

   Responsibilities:
     1. Active nav-link highlighting (from body[data-active-page])
     2. Desktop sidebar collapse/expand (persisted in localStorage)
     3. Mobile off-canvas sidebar (hamburger, overlay, ESC, outside click)
     4. Flash message dismissal (frontend placeholder only)
   ========================================================= */

(function () {
    'use strict';

    var STORAGE_KEY = 'msSellerSidebarCollapsed';
    var MOBILE_BREAKPOINT = 992;

    var shell = document.getElementById('sdShell');
    var sidebar = document.getElementById('sdSidebar');
    var overlay = document.getElementById('sdSidebarOverlay');
    var collapseBtn = document.getElementById('sdCollapseBtn');
    var hamburgerBtn = document.getElementById('sdHamburgerBtn');

    if (!shell || !sidebar) {
        return; // shell markup not present on this page
    }

    /* =====================================================
       1. ACTIVE NAV LINK
       Reads data-active-page from <body> (set by each child
       template via {% block active_page %}) and highlights
       the sidebar link with the matching data-page attribute.
       Purely presentational — no routing/backend involved.
       ===================================================== */
    function highlightActiveNavLink() {
        var activePage = document.body.getAttribute('data-active-page').trim();
        if (!activePage) return;
        var links = sidebar.querySelectorAll('.sd-nav-link[data-page]');
        links.forEach(function (link) {
            var isMatch = link.getAttribute('data-page') === activePage;
            link.classList.toggle('is-active', isMatch);
            if (isMatch) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    /* =====================================================
       2. DESKTOP COLLAPSE / EXPAND
       ===================================================== */
    function isMobileViewport() {
        return window.innerWidth < MOBILE_BREAKPOINT;
    }

    function readStoredCollapsedState() {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === '1';
        } catch (err) {
            return false; // localStorage unavailable (private mode, etc.)
        }
    }

    function storeCollapsedState(isCollapsed) {
        try {
            window.localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0');
        } catch (err) {
            /* no-op: persistence is a nice-to-have, not a requirement */
        }
    }

    function setCollapsed(isCollapsed) {
        shell.classList.toggle('is-collapsed', isCollapsed);
        if (collapseBtn) {
            collapseBtn.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
            collapseBtn.setAttribute(
                'aria-label',
                isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            );
        }
        storeCollapsedState(isCollapsed);
    }

    function toggleCollapsed() {
        setCollapsed(!shell.classList.contains('is-collapsed'));
    }

    function initCollapseState() {
        // On mobile, the sidebar is an off-canvas drawer, not a collapse
        // rail — restoring "collapsed" there would be meaningless, so
        // only apply the persisted state on desktop-sized viewports.
        if (!isMobileViewport()) {
            setCollapsed(readStoredCollapsedState());
        }
    }

    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleCollapsed);
    }

    /* =====================================================
       3. MOBILE OFF-CANVAS SIDEBAR
       ===================================================== */
    function openMobileSidebar() {
        shell.classList.add('is-mobile-open');
        if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        shell.classList.remove('is-mobile-open');
        if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    function toggleMobileSidebar() {
        if (shell.classList.contains('is-mobile-open')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    }

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMobileSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }

    // ESC closes the mobile drawer
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && shell.classList.contains('is-mobile-open')) {
            closeMobileSidebar();
        }
    });

    // Click outside the sidebar (but not on the hamburger itself) closes it
    document.addEventListener('click', function (event) {
        if (!shell.classList.contains('is-mobile-open')) return;

        var clickedInsideSidebar = sidebar.contains(event.target);
        var clickedHamburger = hamburgerBtn && hamburgerBtn.contains(event.target);

        if (!clickedInsideSidebar && !clickedHamburger) {
            closeMobileSidebar();
        }
    });

    // Sidebar nav links close the mobile drawer once tapped
    sidebar.addEventListener('click', function (event) {
        var link = event.target.closest('.sd-nav-link:not(.is-disabled)');
        if (link && isMobileViewport()) {
            closeMobileSidebar();
        }
    });

    /* =====================================================
       RESIZE HANDLING
       Keeps mobile/desktop sidebar states from conflicting
       when the viewport crosses the breakpoint.
       ===================================================== */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
            if (!isMobileViewport()) {
                closeMobileSidebar();
                setCollapsed(readStoredCollapsedState());
            } else {
                shell.classList.remove('is-collapsed');
            }
        }, 150);
    });

    /* =====================================================
       4. FLASH MESSAGE / TOAST HANDLING
       Supports:
       - Close button dismissal
       - Auto-hide messages
       - Dynamically inserted toasts
    ===================================================== */

    (function () {

        function removeMessage(message) {
            if (!message) return;

            message.style.transition = "opacity 0.2s ease, transform 0.2s ease";
            message.style.opacity = "0";
            message.style.transform = "translateY(-6px)";

            window.setTimeout(function () {
                message.remove();
            }, 200);
        }
        function showToast(message, type = "info", autoHide = true) {
            const container = document.querySelector(".header-message-row .container, .header-message-row .container-fluid");

            if (!container) {
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

            const toastConfig = config[type] || config.info;

            const toast = document.createElement("div");
            toast.className = `app-message app-message-${type} alert alert-dismissible fade show`;
            toast.setAttribute("role", "alert");

            if (autoHide) {
                toast.dataset.autoHide = "true";
            }

            toast.innerHTML = `
        <div class="app-message__icon" aria-hidden="true">
            <i class="bi ${toastConfig.icon}"></i>
        </div>

        <div class="app-message__content">
            <span class="app-message__label">${toastConfig.label}</span>
            <span class="app-message__text">${message}</span>
        </div>

        <button type="button"
                class="btn-close app-message__close"
                aria-label="Close">
        </button>
    `;

            container.appendChild(toast);

            if (autoHide) {
                setTimeout(function () {
                    removeMessage(toast);
                }, 5000);
            }

            return toast;
        }

        // Close button (works for dynamically added messages too)
        document.addEventListener("click", function (event) {
            var closeBtn = event.target.closest(".app-message__close");
            if (!closeBtn) return;

            var message = closeBtn.closest(".app-message");
            removeMessage(message);
        });

        // Auto-hide existing messages
        document.querySelectorAll(".app-message[data-auto-hide='true']").forEach(function (message) {
            window.setTimeout(function () {
                removeMessage(message);
            }, 5000);
        });

        window.showToast = showToast;
        window.removeMessage = removeMessage;
    })();

    /* =====================================================
       INIT
       ===================================================== */
    highlightActiveNavLink();
    initCollapseState();
})();
document.addEventListener("DOMContentLoaded", () => {
    const profileChip = document.querySelector(".sd-seller-chip");
    const profileMenu = document.getElementById("adProfileMenu");

    if (!profileChip || !profileMenu) return;

    profileChip.setAttribute("aria-expanded", "false");

    function openProfileMenu() {
        profileMenu.classList.add("is-open");
        profileChip.setAttribute("aria-expanded", "true");
    }

    function closeProfileMenu() {
        profileMenu.classList.remove("is-open");
        profileChip.setAttribute("aria-expanded", "false");
    }

    function toggleProfileMenu() {
        profileMenu.classList.contains("is-open")
            ? closeProfileMenu()
            : openProfileMenu();
    }

    profileChip.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleProfileMenu();
    });

    profileMenu.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    document.addEventListener("click", () => {
        closeProfileMenu();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeProfileMenu();
        }
    });

    profileMenu.querySelectorAll("a").forEach((item) => {
        item.addEventListener("click", () => {
            closeProfileMenu();
        });
    });
});