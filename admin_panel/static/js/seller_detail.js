/* ==========================================================================
   MARKETSPHERE ADMIN — SELLER DETAIL (detail.js)
   Vanilla JS behavior for templates/admin_dashboard/users/sellers/detail.html.
   No external dependencies, no fetch/AJAX — frontend-only interactions ready
   for backend wiring (see TODO markers).

   Sections:
     1. Utilities (toast, ripple, debounce, confirm modal)
     2. Scroll reveal (IntersectionObserver + fallback)
     3. Animated counters
     4. Chart animations (line / donut / bar / score ring)
     5. Tabs
     6. Header dropdown + row dropdowns
     7. Header quick actions (approve/suspend/deactivate/block/delete/reset)
     8. Products tab (search, filter, select-all, bulk bar)
     9. Orders tab (search, filter, empty state)
    10. Timeline filter pills
    11. Documents preview modal
    12. Admin notes composer
    13. Email composer modal
    14. Generic [data-toast] / [data-goto-tab] handlers
   ========================================================================== */
(function () {
    "use strict";

    var root = document.getElementById("sldPage");
    if (!root) return;

    /* ========================================================
       1. UTILITIES
       ======================================================== */
    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    function debounce(fn, wait) {
        var t;
        return function () {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait || 200);
        };
    }

    var toastContainer = document.getElementById("sldToastContainer");
    var toastIcons = {
        success: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
        danger: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        info: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    function showToast(message, type) {
        if (!toastContainer || !message) return;
        type = type || "info";
        var toast = document.createElement("div");
        toast.className = "sld-toast sld-toast-" + type;
        toast.setAttribute("role", "status");
        toast.innerHTML = (toastIcons[type] || toastIcons.info) + "<span>" + message + "</span>";
        toastContainer.appendChild(toast);
        var life = setTimeout(function () { dismissToast(toast); }, 3600);
        toast.addEventListener("click", function () {
            clearTimeout(life);
            dismissToast(toast);
        });
    }

    function dismissToast(toast) {
        if (!toast || toast.classList.contains("is-leaving")) return;
        toast.classList.add("is-leaving");
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 220);
    }
    window.sldShowToast = showToast;

    /* Ripple feedback on buttons */
    function attachRipple(el) {
        el.addEventListener("click", function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement("span");
            var size = Math.max(rect.width, rect.height);
            ripple.className = "sld-ripple";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
            if (getComputedStyle(el).position === "static") el.style.position = "relative";
            el.style.overflow = "hidden";
            el.appendChild(ripple);
            requestAnimationFrame(function () {
                ripple.style.transition = "transform .5s ease, opacity .5s ease";
                ripple.style.transform = "scale(2.4)";
                ripple.style.opacity = "0";
            });
            setTimeout(function () { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 520);
        });
    }
    qsa(".sld-btn, .sld-action-btn").forEach(attachRipple);

    /* Simple button loading-state helper */
    function withLoading(btn, callback, delay) {
        if (!btn || btn.classList.contains("is-loading")) return;
        var label = btn.querySelector(".sld-btn-label");
        var originalText = label ? label.textContent : null;
        btn.classList.add("is-loading");
        btn.disabled = true;
        if (label && btn.dataset.loadingLabel) label.textContent = btn.dataset.loadingLabel;
        setTimeout(function () {
            btn.classList.remove("is-loading");
            btn.disabled = false;
            if (label && originalText) label.textContent = originalText;
            if (typeof callback === "function") callback();
        }, delay || 900);
    }

    /* ---- Confirm modal (generic reusable) ---- */
    var confirmOverlay = document.getElementById("sldConfirmModalOverlay");
    var confirmTitleEl = document.getElementById("sldConfirmModalTitle");
    var confirmTextEl = document.getElementById("sldConfirmModalText");
    var confirmCancelBtn = document.getElementById("sldConfirmModalCancel");
    var confirmConfirmBtn = document.getElementById("sldConfirmModalConfirm");
    var pendingConfirmAction = null;

    function openConfirm(opts) {
        if (!confirmOverlay) return;
        confirmTitleEl.textContent = opts.title || "Are you sure?";
        confirmTextEl.textContent = opts.text || "This action needs to be confirmed.";
        confirmConfirmBtn.textContent = opts.confirmLabel || "Yes, Continue";
        confirmConfirmBtn.className = "sld-btn " + (opts.danger === false ? "sld-btn-primary" : "sld-btn-danger");
        pendingConfirmAction = opts.onConfirm || null;
        confirmOverlay.classList.remove("is-hidden");
        document.body.style.overflow = "hidden";
    }
    function closeConfirm() {
        if (!confirmOverlay) return;
        confirmOverlay.classList.add("is-hidden");
        document.body.style.overflow = "";
        pendingConfirmAction = null;
    }
    if (confirmCancelBtn) confirmCancelBtn.addEventListener("click", closeConfirm);
    if (confirmOverlay) confirmOverlay.addEventListener("click", function (e) { if (e.target === confirmOverlay) closeConfirm(); });
    if (confirmConfirmBtn) {
        confirmConfirmBtn.addEventListener("click", function () {
            var action = pendingConfirmAction;
            closeConfirm();
            if (typeof action === "function") action();
        });
    }
    window.sldOpenConfirm = openConfirm;

    /* ========================================================
       2. SCROLL REVEAL
       ======================================================== */
    (function initReveal() {
        var items = qsa(".sld-reveal");
        if (!items.length) return;

        if ("IntersectionObserver" in window) {
            var observer = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
            items.forEach(function (item) { observer.observe(item); });
        } else {
            items.forEach(function (item) { item.classList.add("is-visible"); });
        }
    })();

    /* ========================================================
       3. ANIMATED COUNTERS
       ======================================================== */
    (function initCounters() {
        var counters = qsa("[data-count-to]");
        if (!counters.length) return;

        function animateCounter(el) {
            var target = parseFloat(el.getAttribute("data-count-to")) || 0;
            var decimals = parseInt(el.getAttribute("data-decimal"), 10) || 0;
            var prefix = el.getAttribute("data-prefix") || "";
            var duration = 1100;
            var startTime = null;

            function step(ts) {
                if (!startTime) startTime = ts;
                var progress = Math.min((ts - startTime) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                var value = target * eased;
                el.textContent = prefix + formatNumber(value, decimals);
                if (progress < 1) requestAnimationFrame(step);
                else el.textContent = prefix + formatNumber(target, decimals);
            }
            requestAnimationFrame(step);
        }

        function formatNumber(num, decimals) {
            var fixed = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
            var parts = fixed.split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        }

        if ("IntersectionObserver" in window) {
            var observer = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.4 });
            counters.forEach(function (c) { observer.observe(c); });
        } else {
            counters.forEach(animateCounter);
        }
    })();

    /* ========================================================
       4. CHART ANIMATIONS
       ======================================================== */
    (function initCharts() {
        var chartTargets = qsa("#sldRevenueLineChart, #sldStatusDonut, #sldOverviewBarChart, #sldMonthlySalesBarChart, #sldScoreRing");
        if (!chartTargets.length) return;

        function activate(el) { el.classList.add("is-animated"); }

        if ("IntersectionObserver" in window) {
            var observer = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        activate(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });
            chartTargets.forEach(function (t) { observer.observe(t); });
        } else {
            chartTargets.forEach(activate);
        }

        /* progress + top-list bars fill on reveal */
        var bars = qsa(".sld-progress-fill");
        if (bars.length) {
            if ("IntersectionObserver" in window) {
                var barObserver = new IntersectionObserver(function (entries, obs) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("is-filled");
                            obs.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.3 });
                bars.forEach(function (b) { barObserver.observe(b); });
            } else {
                bars.forEach(function (b) { b.classList.add("is-filled"); });
            }
        }
    })();

    /* ========================================================
       5. TABS
       ======================================================== */
    (function initTabs() {
        var tabsNav = document.getElementById("sldTabs");
        if (!tabsNav) return;
        var tabs = qsa(".sld-tab", tabsNav);
        var panels = qsa(".sld-tab-panel");

        function activateTab(name, scroll) {
            tabs.forEach(function (t) {
                t.classList.toggle("is-active", t.getAttribute("data-tab") === name);
            });

            panels.forEach(function (p) {
                p.classList.toggle("is-active", p.getAttribute("data-panel") === name);
            });

            if (scroll) {
                var activePanel = document.querySelector('.sld-tab-panel[data-panel="' + name + '"]');

                if (activePanel) {
                    var headerOffset = 88; // Height of your sticky header
                    var y = activePanel.getBoundingClientRect().top + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: y,
                        behavior: "smooth"
                    });
                }
            }
        }

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                activateTab(tab.getAttribute("data-tab"), true);
            });
        });

        /* Elements elsewhere in the page that jump to a tab */
        qsa("[data-goto-tab]").forEach(function (el) {
            el.addEventListener("click", function () {
                activateTab(el.getAttribute("data-goto-tab"), true);
            });
        });
    })();

    /* ========================================================
       6. DROPDOWNS (header "more" menu + per-row menus)
       ======================================================== */
    (function initDropdowns() {
        function closeAllDropdowns(except) {
            qsa(".sld-dropdown.is-open").forEach(function (dd) {
                if (dd !== except) {
                    dd.classList.remove("is-open");
                    var trigger = dd.querySelector("[aria-expanded]");
                    if (trigger) trigger.setAttribute("aria-expanded", "false");
                }
            });
        }

        /* Header "more" dropdown */
        var moreDropdown = document.getElementById("sldMoreDropdown");
        var moreTrigger = document.getElementById("sldMoreTrigger");
        if (moreDropdown && moreTrigger) {
            moreTrigger.addEventListener("click", function (e) {
                e.stopPropagation();
                var isOpen = moreDropdown.classList.contains("is-open");
                closeAllDropdowns();
                moreDropdown.classList.toggle("is-open", !isOpen);
                moreTrigger.setAttribute("aria-expanded", String(!isOpen));
            });
        }

        /* Row-level dropdowns (products / orders tables) — event delegation since rows can be filtered */
        document.addEventListener("click", function (e) {
            var trigger = e.target.closest(".sld-dropdown-trigger");
            if (trigger) {
                e.stopPropagation();
                var dd = trigger.closest(".sld-dropdown");
                var isOpen = dd.classList.contains("is-open");
                closeAllDropdowns(dd);
                dd.classList.toggle("is-open", !isOpen);
                trigger.setAttribute("aria-expanded", String(!isOpen));
                return;
            }
            /* click outside closes everything */
            if (!e.target.closest(".sld-dropdown")) closeAllDropdowns();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeAllDropdowns();
        });
    })();

    /* ========================================================
       7. HEADER QUICK ACTIONS
       ======================================================== */
    (function initHeaderActions() {
        var approveBtn = document.getElementById("sldApproveBtn");
        var approveBtnDown = document.getElementById("sldApproveBtnDown");
        var approveBtnDown1 = document.getElementById("sldApproveBtnDown1");
        var approveBtnDown2 = document.getElementById("sldActionVerifyEmail");
        var approveBtnDown3 = document.getElementById("sldApproveBtnDown3");
        var suspendBtn = document.getElementById("sldSuspendBtn");
        var suspendBtnDown = document.getElementById("sldSuspendBtnDown");
        var suspendBtnDown1 = document.getElementById("sldSuspendBtnDown1");
        var deactivateBtn = document.getElementById("sldDeactivateStoreBtn");
        var deactivateBtn1 = document.getElementById("sldDeactivateStoreBtn1");
        var deactivateBtn2 = document.getElementById("sldDeactivateStoreBtn2");
        var resetPwBtn = document.getElementById("sldResetPasswordBtn");
        var blockBtn = document.getElementById("sldBlockBtn");
        var deleteBtn = document.getElementById("sldDeleteBtn");
        var dangerBlockBtn = document.getElementById("sldDangerBlockBtn");
        var dangerBlockBtn1 = document.getElementById("sldDangerBlockBtn1");
        var dangerDeleteBtn = document.getElementById("sldDangerDeleteBtn");
        var secResetBtn = document.getElementById("sldSecResetPasswordBtn");
        var terResetBtn = document.getElementById('sldTerResetPasswordBtn')
        var verifyEmailBtn = document.getElementById("sldActionVerifyEmail");
        var verifyPhoneBtn = document.getElementById("sldActionVerifyPhone");

        async function changeSellerStatus(button, status, successMessage) {
            try {
                const response = await fetch("/accounts/change-seller-status/", {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: new URLSearchParams({
                        seller_id: button.dataset.sellerId,
                        status: status,
                    }),
                });

                const data = await response.json();

                if (data.success) {
                    showToast(successMessage, "success");
                } else {
                    showToast(data.message, "error");
                }
            } catch (error) {
                showToast("Something went wrong.", "error");
            }
        }
        let approveBtns = [approveBtn, approveBtnDown, approveBtnDown1, approveBtnDown2, approveBtnDown3];

        approveBtns.forEach(function (btn) {
            if (btn) {
                btn.addEventListener("click", function () {
                    withLoading(btn, function () {
                        changeSellerStatus(
                            btn,
                            "verified",
                            "Seller approved successfully."
                        );
                    });
                });
            }
        });
        let suspendBtns = [suspendBtn, suspendBtnDown, suspendBtnDown1]
        suspendBtns.forEach(function (btn) {
            if (btn) {
                btn.addEventListener("click", function () {
                    openConfirm({
                        title: "Suspend this seller?",
                        text: "The seller's storefront and product listings will be hidden until reinstated.",
                        confirmLabel: "Suspend Seller",
                        danger: true,
                        onConfirm: function () {
                            withLoading(suspendBtn, function () {
                                changeSellerStatus(
                                    suspendBtn,
                                    "suspended",
                                    "Seller suspended."
                                );
                            });
                        }
                    });
                });
            }
        });

        let deactivateBtns = [deactivateBtn, deactivateBtn1, deactivateBtn2];
        deactivateBtns.forEach(function (btn) {

            if (btn) {
                btn.addEventListener("click", function () {
                    openConfirm({
                        title: "Deactivate this store?",
                        text: "The storefront will no longer be visible to buyers. The seller can request reactivation later.",
                        confirmLabel: "Deactivate Store",
                        danger: true,
                        onConfirm: function () {
                            withLoading(deactivateBtn, function () {
                                changeSellerStatus(
                                    deactivateBtn,
                                    "deactivated",
                                    "Store deactivated."
                                );
                            });
                        }
                    });
                });
            }
        });


        async function sendPasswordReset(userId) {
            try {
                const response = await fetch(`/admin-db/user/buyers/${userId}/reset-password/`, {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFToken(),
                    },
                });

                const data = await response.json();

                if (data.success) {
                    showToast(data.message, "success");
                } else {
                    showToast("Unable to send password reset email.", "error");
                }
            } catch (error) {
                showToast("Something went wrong.", "error");
            }
        }
        if (resetPwBtn) {
            resetPwBtn.addEventListener("click", function () {
                sendPasswordReset(resetPwBtn.dataset.userId);
            });
        }

        if (secResetBtn) {
            secResetBtn.addEventListener("click", function () {
                sendPasswordReset(secResetBtn.dataset.userId);
            });
        }
        if (terResetBtn) {
            terResetBtn.addEventListener("click", function () {
                sendPasswordReset(terResetBtn.dataset.userId);
            });
        }
        if (verifyEmailBtn) {
            verifyEmailBtn.addEventListener("click", function () { showToast("Email marked as verified.", "success"); });
        }
        if (verifyPhoneBtn) {
            verifyPhoneBtn.addEventListener("click", function () { showToast("Phone number marked as verified.", "success"); });
        }

        function confirmBlock(triggerBtn) {
            openConfirm({
                title: "Block this seller?",
                text: "This seller will be permanently restricted from selling on MarketSphere. This affects all their live listings immediately.",
                confirmLabel: "Block Seller",
                danger: true,
                onConfirm: function () {
                    withLoading(triggerBtn, function () {
                        changeSellerStatus(
                            triggerBtn,
                            "blocked",
                            "Seller has been blocked."
                        );
                    });
                }
            });
        }

        if (blockBtn) {
            blockBtn.addEventListener("click", function () {
                confirmBlock(blockBtn);
            });
        }

        if (dangerBlockBtn1) {
            dangerBlockBtn1.addEventListener("click", function () {
                confirmBlock(dangerBlockBtn1);
            });
        }
        if (dangerBlockBtn) {
            dangerBlockBtn.addEventListener("click", function () {
                confirmBlock(dangerBlockBtn);
            });
        }
        function confirmDelete() {
            openConfirm({
                title: "Delete this seller?",
                text: "This will permanently remove Urban Threads Co. and all associated products, orders, and data. This action cannot be undone.",
                confirmLabel: "Delete Permanently",
                danger: true,
                onConfirm: function () { showToast("Seller deleted.", "danger"); }
            });
        }
        if (deleteBtn) deleteBtn.addEventListener("click", confirmDelete);
        if (dangerDeleteBtn) dangerDeleteBtn.addEventListener("click", confirmDelete);


        // logout all devices
        const logoutAllDevicesBtn = document.getElementById("logoutAllDevicesBtn");

        if (logoutAllDevicesBtn) {
            logoutAllDevicesBtn.addEventListener("click", function () {
                const userId = this.dataset.userId;

                openConfirm({
                    title: "Log out from all devices?",
                    text: "This will immediately sign the user out from every active session.",
                    confirmLabel: "Log Out All",
                    danger: true,
                    onConfirm: function () {
                        withLoading(logoutAllDevicesBtn, function () {
                            fetch("/admin-db/logout-all-devices/", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded",
                                    "X-CSRFToken": getCSRFToken(),
                                },
                                body: new URLSearchParams({
                                    userId: userId,
                                }),
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.status === "success") {
                                        showToast(data.message, "success");
                                    } else {
                                        showToast(data.message || "Failed to log out all devices.", "danger");
                                    }
                                })
                                .catch(() => {
                                    showToast("Something went wrong.", "danger");
                                });
                        });
                    }
                });
            });
        }
    })();

    /* ========================================================
       8. PRODUCTS TAB — search, status filter, bulk select
       ======================================================== */
    (function initProductsTab() {
        var searchInput = document.getElementById("sldProductsSearch");
        var statusFilter = document.getElementById("sldProductsStatusFilter");
        var tableBody = document.getElementById("sldProductsTableBody");
        var selectAll = document.getElementById("sldProductsSelectAll");
        var bulkBar = document.getElementById("sldProductsBulkBar");
        var bulkCount = document.getElementById("sldProductsBulkCount");
        var exportBtn = document.getElementById("sldProductsExportBtn");
        if (!tableBody) return;

        function getRows() { return qsa(".sld-row", tableBody); }

        function applyFilters() {
            var term = (searchInput && searchInput.value || "").trim().toLowerCase();
            var status = statusFilter ? statusFilter.value : "";
            getRows().forEach(function (row) {
                var text = row.textContent.toLowerCase();
                var matchesTerm = !term || text.indexOf(term) !== -1;
                var matchesStatus = !status || row.getAttribute("data-status") === status;
                row.classList.toggle("sld-row-hidden", !(matchesTerm && matchesStatus));
            });
        }

        if (searchInput) searchInput.addEventListener("input", debounce(applyFilters, 180));
        if (statusFilter) statusFilter.addEventListener("change", applyFilters);

        function updateBulkBar() {
            var checked = qsa(".sld-row-checkbox", tableBody).filter(function (cb) { return cb.checked; });
            if (bulkBar) bulkBar.classList.toggle("sld-hidden", checked.length === 0);
            if (bulkCount) bulkCount.textContent = String(checked.length);
            if (selectAll) {
                var all = qsa(".sld-row-checkbox", tableBody);
                selectAll.checked = all.length > 0 && checked.length === all.length;
                selectAll.indeterminate = checked.length > 0 && checked.length < all.length;
            }
        }

        tableBody.addEventListener("change", function (e) {
            if (e.target.classList.contains("sld-row-checkbox")) updateBulkBar();
        });
        if (selectAll) {
            selectAll.addEventListener("change", function () {
                qsa(".sld-row-checkbox", tableBody).forEach(function (cb) { cb.checked = selectAll.checked; });
                updateBulkBar();
            });
        }
        if (exportBtn) {
            exportBtn.addEventListener("click", function () { showToast("Preparing product export\u2026", "info"); });
        }
    })();

    (function initEditStoreModal() {
        const overlay = document.getElementById("sldEditStoreModalOverlay");
        const openBtn = document.getElementById("sldEditStoreBtn");
        const openBtnDown = document.getElementById("sldEditStoreBtnDown");
        const closeBtn = document.getElementById("sldEditStoreModalClose");
        const cancelBtn = document.getElementById("sldEditStoreCancelBtn");

        if (!overlay) return;

        function openModal() {
            overlay.classList.remove("is-hidden");
            document.body.style.overflow = "hidden";
        }

        function closeModal() {
            overlay.classList.add("is-hidden");
            document.body.style.overflow = "";
        }
        let openBtns = [openBtn, openBtnDown];
        openBtns.forEach(function (Btn) {
            if (Btn) {
                Btn.addEventListener("click", openModal);
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener("click", closeModal);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", closeModal);
        }

        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) {
                closeModal();
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && !overlay.classList.contains("is-hidden")) {
                closeModal();
            }
        });
    })();
    document.addEventListener("DOMContentLoaded", function () {
        const saveBtn = document.getElementById("sldEditStoreSaveBtn");
        const modalOverlay = document.getElementById("sldEditStoreModalOverlay");

        if (!saveBtn) return;

        saveBtn.addEventListener("click", async function () {

            const storeData = {
                store_name: document.getElementById("editStoreName").value,
                slug: document.getElementById("editStoreSlug").value,
                store_email: document.getElementById("editStoreEmail").value,
                store_phone: document.getElementById("editStorePhone").value,
                store_description: document.getElementById("editStoreDesc").value,

                business_category: document.getElementById("editBizCat").value,
                website: document.getElementById("editWebsite").value,
                business_registration_number: document.getElementById("editBizReg").value,
                tax_id: document.getElementById("editTaxNum").value,

                facebook_label: document.getElementById("editFbLabel").value,
                facebook_url: document.getElementById("editFbUrl").value,
                instagram_label: document.getElementById("editIgLabel").value,
                instagram_url: document.getElementById("editIgUrl").value,
                linkedin_label: document.getElementById("editLiLabel").value,
                linkedin_url: document.getElementById("editLiUrl").value,
                twitter_label: document.getElementById("editTwLabel").value,
                twitter_url: document.getElementById("editTwUrl").value,

                country: document.getElementById("editCountry").value,
                city: document.getElementById("editCity").value,
                address_line_1: document.getElementById("editAddress").value,
                postal_code: document.getElementById("editPostalCode").value,
            };

            const originalHTML = saveBtn.innerHTML;

            saveBtn.disabled = true;
            saveBtn.innerHTML = "<span class='sld-btn-label'>Saving...</span>";

            try {
                const response = await fetch(`/accounts/${saveBtn.dataset.sellerId}/update-store/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: JSON.stringify(storeData),
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Unable to update store.");
                }

                showToast(data.message || "Store updated successfully.", "success");

                modalOverlay.classList.add("is-hidden");
                document.body.style.overflow = "";

                // Uncomment if you want to refresh after saving.
                // location.reload();

            } catch (error) {
                showToast(error.message, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalHTML;
            }
        });
    });

    /* ========================================================
       9. ORDERS TAB — search + status filter + empty state
       ======================================================== */
    (function initOrdersTab() {
        var searchInput = document.getElementById("sldOrdersSearch");
        var statusFilter = document.getElementById("sldOrdersStatusFilter");
        var tableBody = document.getElementById("sldOrdersTableBody");
        var emptyState = document.getElementById("sldOrdersEmpty");
        if (!tableBody) return;

        function applyFilters() {
            var term = (searchInput && searchInput.value || "").trim().toLowerCase();
            var status = statusFilter ? statusFilter.value : "";
            var visibleCount = 0;
            qsa(".sld-row", tableBody).forEach(function (row) {
                var text = row.textContent.toLowerCase();
                var matchesTerm = !term || text.indexOf(term) !== -1;
                var matchesStatus = !status || row.getAttribute("data-status") === status;
                var visible = matchesTerm && matchesStatus;
                row.classList.toggle("sld-row-hidden", !visible);
                if (visible) visibleCount++;
            });
            if (emptyState) emptyState.classList.toggle("is-visible", visibleCount === 0);
        }

        if (searchInput) searchInput.addEventListener("input", debounce(applyFilters, 180));
        if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    })();

    /* ========================================================
       10. ACTIVITY TIMELINE FILTER PILLS
       ======================================================== */
    (function initTimelineFilters() {
        var filterBar = document.getElementById("sldTimelineFilters");
        var timeline = document.getElementById("sldTimeline");
        if (!filterBar || !timeline) return;

        filterBar.addEventListener("click", function (e) {
            var pill = e.target.closest(".sld-pill");
            if (!pill) return;
            qsa(".sld-pill", filterBar).forEach(function (p) { p.classList.remove("is-active"); });
            pill.classList.add("is-active");
            var filter = pill.getAttribute("data-filter");
            qsa(".sld-timeline-item", timeline).forEach(function (item) {
                var match = filter === "all" || item.getAttribute("data-type") === filter;
                item.classList.toggle("sld-timeline-hidden", !match);
            });
        });
    })();

    /* ========================================================
       11. DOCUMENTS PREVIEW MODAL
       ======================================================== */
    (function initDocPreview() {
        var overlay = document.getElementById("sldImageModalOverlay");
        var closeBtn = document.getElementById("sldImageModalClose");
        var caption = document.getElementById("sldImageModalCaption");
        var previewImg = document.getElementById("sldImageModalImg");
        if (!overlay) return;

        function openModal(title, imageSrc) {
            if (caption) {
                caption.textContent = title || "Preview";
            }

            if (previewImg) {
                previewImg.src = imageSrc || "";
                previewImg.alt = title || "Preview";
            }

            overlay.classList.remove("is-hidden");
            document.body.style.overflow = "hidden";
        }
        function closeModal() {
            overlay.classList.add("is-hidden");
            document.body.style.overflow = "";
        }

        qsa("[data-doc-preview]").forEach(function (el) {
            el.addEventListener("click", function () { openModal(el.getAttribute("data-doc-title")); });
        });

        var logoTrigger = document.getElementById("sldLogoTrigger");

        if (logoTrigger) {

            function openLogoModal() {
                var storeName = logoTrigger.dataset.storeName || "Store";
                var img = logoTrigger.querySelector("img");

                openModal(
                    "Store Logo — " + storeName,
                    img ? img.src : ""
                );
            }

            logoTrigger.addEventListener("click", openLogoModal);

            logoTrigger.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLogoModal();
                }
            });
        }
        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && !overlay.classList.contains("is-hidden")) closeModal();
        });
    })();

    /* ========================================================
       12. ADMIN NOTES COMPOSER
       ======================================================== */
    (function initNotes() {
        var addBtn = document.getElementById("sldAddNoteBtn");
        var composer = document.getElementById("sldNoteComposer");
        var input = document.getElementById("sldNoteInput");
        var prioritySelect = document.getElementById("sldNotePriority");
        var cancelBtn = document.getElementById("sldCancelNoteBtn");
        var saveBtn = document.getElementById("sldSaveNoteBtn");
        var notesList = document.getElementById("sldNotesList");
        if (!addBtn || !composer || !notesList) return;

        var priorityMap = { low: "c-info", normal: "c-info", high: "c-danger" };
        var priorityLabel = { low: "Low", normal: "Normal", high: "High" };

        function resetComposer() {
            input.value = "";
            prioritySelect.value = "normal";
            composer.classList.add("sld-hidden");
        }

        addBtn.addEventListener("click", function () {
            composer.classList.toggle("sld-hidden");
            if (!composer.classList.contains("sld-hidden")) input.focus();
        });
        if (cancelBtn) cancelBtn.addEventListener("click", resetComposer);

        if (saveBtn) {
            saveBtn.addEventListener("click", function () {
                var text = input.value.trim();
                if (!text) {
                    showToast("Write a note before saving.", "danger");
                    input.focus();
                    return;
                }
                var priority = prioritySelect.value;
                var card = document.createElement("div");
                card.className = "sld-note-card";
                card.innerHTML =
                    '<div class="sld-note-head">' +
                    '<span class="sld-note-avatar">A</span>' +
                    '<div class="sld-note-meta"><strong>Admin User</strong><span>Just now</span></div>' +
                    '<span class="sld-badge ' + priorityMap[priority] + '">' + priorityLabel[priority] + '</span>' +
                    '</div>' +
                    '<p class="sld-note-content"></p>' +
                    '<div class="sld-note-actions">' +
                    '<button type="button" class="sld-btn sld-btn-ghost sld-btn-sm" data-toast="Editing notes isn&#8217;t available yet.">Edit</button>' +
                    '<button type="button" class="sld-btn sld-btn-ghost sld-btn-sm c-danger" data-toast="Note deleted.">Delete</button>' +
                    '</div>';
                card.querySelector(".sld-note-content").textContent = text;
                notesList.insertBefore(card, notesList.firstChild);
                resetComposer();
                showToast("Note saved.", "success");
            });
        }
    })();


    /* ========================================================
       14. GENERIC [data-toast] HANDLER
       ======================================================== */
    (function initGenericToastButtons() {
        document.addEventListener("click", function (e) {
            var el = e.target.closest("[data-toast]");
            if (!el || el.disabled) return;
            /* Skip elements that already have dedicated handlers above */
            if (el.hasAttribute("data-ec-open") || el.hasAttribute("data-goto-tab")) return;
            showToast(el.getAttribute("data-toast"), "info");
        });
    })();

    /* Back button — TODO: wire to Django URL (e.g. {% url 'admin_panel:sellers' %}) */
    var backBtn = document.getElementById("sldBackBtn");
    if (backBtn) {
        backBtn.addEventListener("click", function () {
            if (window.history.length > 1) window.history.back();
        });
    }

})();
function getCSRFToken() {
    const csrfInput = document.querySelector("[name=csrfmiddlewaretoken]");
    if (csrfInput) {
        return csrfInput.value;
    }

    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

const bannerBtn = document.getElementById("sldEditBannerBtn");

if (bannerBtn) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";

    bannerBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
        if (!fileInput.files.length) return;

        const formData = new FormData();
        formData.append("seller_id", bannerBtn.dataset.sellerId);
        formData.append("banner", fileInput.files[0]);

        try {
            const response = await fetch("/accounts/change-store-banner/", {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCSRFToken(),
                },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                document.querySelector("#sldBanner img").src =
                    data.banner_url + "?t=" + Date.now();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    });
}
// hide product
document.addEventListener("DOMContentLoaded", function () {
    // Select all hide-product buttons
    const hideButtons = document.querySelectorAll(".hide-product");

    hideButtons.forEach((btn) => {
        btn.addEventListener("click", async function () {
            // Retrieve the data-product-slug attribute (dataset converts dash-case to camelCase)
            const productSlug = this.dataset.productSlug;

            // Get Django CSRF token from cookies
            const csrfToken = getCSRFToken();

            try {
                const response = await fetch("/seller/products/hide-product", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken, // Mandatory for Django POST requests
                    },
                    body: JSON.stringify({
                        productSlug: productSlug,
                    }),
                });

                const data = await response.json();

                if (response.ok && data.status === "success") {
                    alert(data.message);
                    // Optional: Remove or hide the product card/row from the UI dynamically
                    // this.closest('.product-card').remove();
                } else {
                    console.error("Error:", data.message);
                }
            } catch (error) {
                console.error("Network error:", error);
            }
        });
    });
});
// delete or archive product
document.addEventListener("DOMContentLoaded", function () {
    // Select all buttons with the 'delete-product' class
    const deleteButtons = document.querySelectorAll(".delete-product");

    deleteButtons.forEach((btn) => {
        btn.addEventListener("click", async function () {
            // Confirm with user before proceeding
            if (!confirm("Are you sure you want to delete this product?")) {
                return;
            }

            // Extract the product slug from data-product-slug
            const productSlug = this.dataset.productSlug;
            const csrfToken = getCSRFToken();

            try {
                const response = await fetch("/seller/products/delete-product", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken,
                    },
                    body: JSON.stringify({
                        productSlug: productSlug,
                    }),
                });

                const data = await response.json();

                if (response.ok && data.status === "success") {
                    // Alert the user (displays either "Product deleted successfully" or the archive warning)
                    alert(data.message);

                    // Dynamically remove the product row/card from the UI if applicable:
                    const productCard = this.closest(".product-item"); // Replace '.product-item' with your container's class
                    if (productCard) {
                        productCard.remove();
                    } else {
                        // Or reload the page to refresh the list
                        location.reload();
                    }
                } else {
                    alert(data.message || "Failed to delete the product.");
                }
            } catch (error) {
                console.error("Delete request failed:", error);
                alert("An error occurred while deleting the product.");
            }
        });
    });
});
