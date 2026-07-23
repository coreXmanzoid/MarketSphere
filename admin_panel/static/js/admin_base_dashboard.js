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
    var flashArea = document.getElementById('adFlashArea');

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
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }

    function closeGroup(group) {
        group.classList.remove('is-open');
        var trigger = group.querySelector('.ad-nav-group-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    function toggleGroup(group) {
        if (group.classList.contains('is-open')) {
            closeGroup(group);
        } else {
            openGroup(group);
        }
    }

    function initGroups() {
        var triggers = nav.querySelectorAll('.ad-nav-group-trigger');
        triggers.forEach(function (trigger) {
            trigger.addEventListener('click', function () {
                // Collapsed desktop sidebar: expand it first so the
                // submenu has somewhere to render, rather than toggling
                // a group that's invisible anyway.
                if (shell.classList.contains('is-collapsed') && !isMobileViewport()) {
                    setCollapsed(false);
                }
                var group = trigger.closest('.ad-nav-group');
                if (group) toggleGroup(group);
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
       5. PROFILE DROPDOWN
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
       6. FLASH MESSAGE DISMISSAL
       ===================================================== */
    if (flashArea) {
        flashArea.addEventListener('click', function (event) {
            var closeBtn = event.target.closest('.ad-flash-close');
            if (!closeBtn) return;

            var flash = closeBtn.closest('.ad-flash');
            if (!flash) return;

            flash.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            flash.style.opacity = '0';
            flash.style.transform = 'translateY(-6px)';

            window.setTimeout(function () {
                flash.remove();
            }, 200);
        });
    }

    /* =====================================================
       7. GLOBAL SEARCH SHORTCUT ( / )
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
