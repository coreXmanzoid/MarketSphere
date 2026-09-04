/* =========================================================
   MARKETSPHERE — ADMIN DASHBOARD SHELL
   Frontend-only behavior for the reusable admin layout.
   No fetch, no AJAX, no backend calls, no external libraries.

   Responsibilities:
     1. Active nav-link / group highlighting (from body[data-active-page])
     2. Expandable sidebar groups (Catalog, Sales, ...)
     3. Desktop sidebar collapse/expand (persisted in localStorage)
     4. Mobile off-canvas sidebar (hamburger, overlay, ESC, outside click)
     5. Profile dropdown menu
     6. Flash message dismissal
     7. Global search keyboard shortcut ( / )
   ========================================================= */

(function () {
    'use strict';

    var STORAGE_KEY = 'msAdminSidebarCollapsed';
    var MOBILE_BREAKPOINT = 992;

    var shell = document.getElementById('adShell');
    var sidebar = document.getElementById('adSidebar');
    var nav = document.getElementById('adNav');
    var overlay = document.getElementById('adSidebarOverlay');
    var collapseBtn = document.getElementById('adCollapseBtn');
    var desktopToggleBtn = document.getElementById('adDesktopToggleBtn');
    var hamburgerBtn = document.getElementById('adHamburgerBtn');

    if (!shell || !sidebar) {
        return; // shell markup not present on this page
    }

    /* =====================================================
       1. ACTIVE NAV LINK / GROUP
       Reads data-active-page from <body> (set by each child
       template via {% block active_page %}) and highlights
       the sidebar link or submenu item with the matching
       data-page / data-subpage attribute. If the match lives
       inside a group, that group opens automatically.
       Purely presentational — no routing/backend involved.
       ===================================================== */
    function highlightActiveNavLink() {
        var activePage = document.body.getAttribute('data-active-page').trim();
        if (!activePage) return;

        var topLinks = nav.querySelectorAll('.ad-nav-link[data-page]');
        topLinks.forEach(function (link) {
            var isMatch = link.getAttribute('data-page') === activePage;
            link.classList.toggle('is-active', isMatch);
            if (isMatch) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        var subLinks = nav.querySelectorAll('.ad-nav-sublink[data-subpage]');
        subLinks.forEach(function (link) {
            var isMatch = link.getAttribute('data-subpage') === activePage;
            link.classList.toggle('is-active', isMatch);

            if (isMatch) {
                link.setAttribute('aria-current', 'page');
                var group = link.closest('.ad-nav-group');
                if (group) openGroup(group);
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    /* =====================================================
   2. EXPANDABLE SIDEBAR GROUPS
   ===================================================== */

    function openGroup(group) {
        group.classList.add('is-open');

        var trigger = group.querySelector('.ad-nav-group-trigger');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'true');
        }
    }

    function closeGroup(group) {
        group.classList.remove('is-open');

        var trigger = group.querySelector('.ad-nav-group-trigger');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
    }

    function toggleGroup(group) {
        if (group.classList.contains('is-open')) {
            closeGroup(group);
        } else {
            openGroup(group);
        }
    }

    function initActivePage() {
        var activePage = sidebar.getAttribute('data-active-page');

        if (!activePage) return;

        // Remove any existing active states
        nav.querySelectorAll('.ad-nav-link.is-active').forEach(function (link) {
            link.classList.remove('is-active');
        });

        nav.querySelectorAll('.ad-nav-sublink.is-active').forEach(function (link) {
            link.classList.remove('is-active');
        });

        /*
         * First check submenu pages.
         *
         * Example:
         * active_page = "products"
         *
         * This will activate:
         * [data-subpage="products"]
         *
         * And automatically open:
         * [data-group="catalog"]
         */
        var activeSubLink = nav.querySelector(
            '.ad-nav-sublink[data-subpage="' + activePage + '"]'
        );

        if (activeSubLink) {
            activeSubLink.classList.add('is-active');

            var parentGroup = activeSubLink.closest('.ad-nav-group');

            if (parentGroup) {
                openGroup(parentGroup);
            }

            return;
        }

        /*
         * If it isn't a submenu page, check normal
         * top-level navigation links.
         *
         * Example:
         * active_page = "users"
         */
        var activeLink = nav.querySelector(
            '.ad-nav-link[data-page="' + activePage + '"]:not(.ad-nav-group-trigger)'
        );

        if (activeLink) {
            activeLink.classList.add('is-active');
        }
    }

    function initGroups() {
        var triggers = nav.querySelectorAll('.ad-nav-group-trigger');

        triggers.forEach(function (trigger) {
            trigger.addEventListener('click', function () {
                // Collapsed desktop sidebar: expand it first so the
                // submenu has somewhere to render, rather than toggling
                // a group that's invisible anyway.
                if (
                    shell.classList.contains('is-collapsed') &&
                    !isMobileViewport()
                ) {
                    setCollapsed(false);
                }

                var group = trigger.closest('.ad-nav-group');

                if (group) {
                    toggleGroup(group);
                }
            });
        });
    }
    /* =====================================================
       3. DESKTOP COLLAPSE / EXPAND
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

        [collapseBtn, desktopToggleBtn].forEach(function (btn) {
            if (!btn) return;
            btn.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
            btn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
        });

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

    if (collapseBtn) collapseBtn.addEventListener('click', toggleCollapsed);
    if (desktopToggleBtn) desktopToggleBtn.addEventListener('click', toggleCollapsed);

    /* =====================================================
       4. MOBILE OFF-CANVAS SIDEBAR
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

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMobileSidebar);
    if (overlay) overlay.addEventListener('click', closeMobileSidebar);

    // ESC closes the mobile drawer and any open dropdowns
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (shell.classList.contains('is-mobile-open')) closeMobileSidebar();
        closeNotificationMenu();
        closeProfileMenu();
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

    // Sidebar links (not group triggers) close the mobile drawer once tapped
    sidebar.addEventListener('click', function (event) {
        var link = event.target.closest('.ad-nav-link:not(.ad-nav-group-trigger), .ad-nav-sublink');
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
       5. NOTIFICATIONS DROPDOWN
       ===================================================== */

    var notificationButton = document.getElementById('adNotifBtn');
    var notificationPanel = document.getElementById('adNotificationPanel');
    var clearNotifications = document.getElementById('adClearNotifications');
    var notificationList = document.getElementById('adNotificationList');
    var notificationEmpty = document.getElementById('adNotificationEmpty');
    var notificationDot = document.querySelector('.ad-notif-dot');

    var notificationsWereOpened = false;

    function getCsrfToken() {
        var csrfInput = document.querySelector(
            '[name=csrfmiddlewaretoken]'
        );

        if (csrfInput) {
            return csrfInput.value;
        }

        var cookie = document.cookie
            .split('; ')
            .find(function (row) {
                return row.startsWith('csrftoken=');
            });

        return cookie
            ? decodeURIComponent(cookie.split('=')[1])
            : '';
    }

    function markAdminNotificationsAsRead() {
        if (!notificationButton || !notificationsWereOpened) {
            return;
        }

        var userId = notificationButton.dataset.userId;

        if (!userId) {
            return;
        }

        var unreadNotifications = notificationList
            ? notificationList.querySelectorAll('.is-unread')
            : [];

        if (!unreadNotifications.length) {
            notificationsWereOpened = false;
            return;
        }

        fetch('/notifications/mark-all-as-read/' + userId + '/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(
                        'Failed to mark notifications as read.'
                    );
                }

                return response.json();
            })
            .then(function () {
                unreadNotifications.forEach(function (notification) {
                    notification.classList.remove('is-unread');

                    var status = notification.querySelector(
                        '.ad-notification-status'
                    );

                    if (status) {
                        status.remove();
                    }
                });

                if (notificationDot) {
                    notificationDot.hidden = true;
                }
            })
            .catch(function (error) {
                console.error(
                    'Notification read error:',
                    error
                );
            })
            .finally(function () {
                notificationsWereOpened = false;
            });
    }

    function clearAllAdminNotifications() {
        if (!notificationButton) {
            return;
        }

        var userId = notificationButton.dataset.userId;

        if (!userId) {
            return;
        }

        fetch('/notifications/clear-all/' + userId + '/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(
                        'Failed to clear notifications.'
                    );
                }

                return response.json();
            })
            .then(function (data) {
                if (data.status !== 'success') {
                    return;
                }

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
            })
            .catch(function (error) {
                console.error(
                    'Notification clear error:',
                    error
                );
            });
    }

    function closeNotificationMenu() {
        if (!notificationPanel) {
            return;
        }

        if (!notificationPanel.classList.contains('is-open')) {
            return;
        }

        notificationPanel.classList.remove('is-open');
        notificationPanel.setAttribute('aria-hidden', 'true');

        if (notificationButton) {
            notificationButton.setAttribute(
                'aria-expanded',
                'false'
            );
        }

        markAdminNotificationsAsRead();
    }

    if (notificationButton && notificationPanel) {

        notificationButton.addEventListener(
            'click',
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                var isOpen =
                    notificationPanel.classList.contains('is-open');

                if (isOpen) {
                    closeNotificationMenu();
                    return;
                }

                notificationPanel.classList.add('is-open');

                notificationPanel.setAttribute(
                    'aria-hidden',
                    'false'
                );

                notificationButton.setAttribute(
                    'aria-expanded',
                    'true'
                );

                notificationsWereOpened = true;
            }
        );

        notificationPanel.addEventListener(
            'click',
            function (event) {
                event.stopPropagation();
            }
        );

        document.addEventListener(
            'click',
            closeNotificationMenu
        );

        document.addEventListener(
            'keydown',
            function (event) {
                if (event.key === 'Escape') {
                    closeNotificationMenu();
                }
            }
        );

        if (clearNotifications) {
            clearNotifications.addEventListener(
                'click',
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    clearAllAdminNotifications();
                }
            );
        }
    }

    /* =====================================================
       6. PROFILE DROPDOWN
       ===================================================== */
    var profile = document.getElementById('adProfile');
    var profileTrigger = document.getElementById('adProfileTrigger');

    function closeProfileMenu() {
        if (!profile) return;
        profile.classList.remove('is-open');
        if (profileTrigger) profileTrigger.setAttribute('aria-expanded', 'false');
    }

    function toggleProfileMenu() {
        if (!profile) return;
        var isOpen = profile.classList.toggle('is-open');
        if (profileTrigger) profileTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    if (profileTrigger) {
        profileTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleProfileMenu();
        });
    }

    document.addEventListener('click', function (event) {
        if (profile && !profile.contains(event.target)) {
            closeProfileMenu();
        }
    });

    /* =====================================================
       7. FLASH MESSAGE DISMISSAL
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
       8. GLOBAL SEARCH SHORTCUT ( / )
       Focuses the search input when "/" is pressed, unless the
       person is already typing in a field. No search logic —
       purely a UX affordance for the input already on screen.
       ===================================================== */
    var searchInput = document.getElementById('adGlobalSearch');

    function isTypingInField(target) {
        var tag = target.tagName ? target.tagName.toLowerCase() : '';
        return tag === 'input' || tag === 'textarea' || target.isContentEditable;
    }

    document.addEventListener('keydown', function (event) {
        if (event.key !== '/' || !searchInput) return;
        if (isTypingInField(event.target)) return;

        event.preventDefault();
        searchInput.focus();
    });

    /* =====================================================
       INIT
       ===================================================== */
    highlightActiveNavLink();
    initGroups();
    initCollapseState();
})();
