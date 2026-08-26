/* =========================================================================
   MARKETSPHERE ADMIN — ORDER DETAIL (order_detail.js)
   Frontend-only interactivity for admin_panel/templates/sales/orders/detail.html.
   Vanilla JS, IIFE-scoped, no external libraries, no network calls.

   IMPORTANT: this file NEVER constructs order/seller/item/timeline/activity
   markup. All of that content is rendered server-side via Django template
   tags in detail.html. This script only wires up interactions on top of
   the HTML that already exists in the DOM (modals, dropdowns, toggles,
   copy-to-clipboard, toasts, print, reveal animation).

   Sections:
     1. Bootstrap / DOM cache
     2. Reveal on scroll
     3. Ripple + toast helpers
     4. More-actions dropdown
     5. Seller order item toggles
     6. Modal open/close/confirm
     7. Refund modal (full/partial toggle + live total)
     8. Copy to clipboard
     9. Print actions
    10. Primary action / quick status buttons
    11. Init
   ========================================================================= */

(function () {
    "use strict";

    var root = document.getElementById("odPage");
    if (!root) return;

    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    /* ================= 2. REVEAL ON SCROLL ================= */
    function initReveal() {
        var items = qsa(".od-reveal");
        if (!items.length) return;

        if (!("IntersectionObserver" in window)) {
            items.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

        items.forEach(function (el, i) {
            el.style.transitionDelay = Math.min(i * 45, 220) + "ms";
            observer.observe(el);
        });
    }

    /* ================= 3. TOAST HELPER ================= */
    function showToast(message, type) {
        var container = document.getElementById("odToastContainer");
        if (!container || !message) return;

        var toast = document.createElement("div");
        toast.className = "od-toast" + (type ? " od-toast-" + type : "");
        toast.setAttribute("role", "status");

        var iconPath = type === "success"
            ? '<path d="M20 6 9 17l-5-5"></path>'
            : type === "danger"
                ? '<circle cx="12" cy="12" r="10"></circle><path d="m4.9 4.9 14.2 14.2"></path>'
                : '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path>';

        toast.innerHTML =
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">' + iconPath + '</svg>' +
            '<span>' + message + '</span>';

        container.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add("is-leaving");
            window.setTimeout(function () { toast.remove(); }, 250);
        }, 4200);
    }

    function bindRipple(el) {
        el.addEventListener("click", function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement("span");
            var size = Math.max(rect.width, rect.height);
            ripple.style.position = "absolute";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
            ripple.style.borderRadius = "50%";
            ripple.style.background = "rgba(192,138,78,.28)";
            ripple.style.pointerEvents = "none";
            ripple.style.transform = "scale(0)";
            ripple.style.transition = "transform .5s ease, opacity .6s ease";

            var prevPosition = getComputedStyle(el).position;
            if (prevPosition === "static") el.style.position = "relative";
            el.style.overflow = el.style.overflow || "hidden";
            el.appendChild(ripple);

            requestAnimationFrame(function () {
                ripple.style.transform = "scale(2.4)";
                ripple.style.opacity = "0";
            });
            window.setTimeout(function () { ripple.remove(); }, 600);
        });
    }

    function initRipples() {
        qsa(".od-btn, .od-action-btn, .od-export-option").forEach(bindRipple);
    }

    /* ================= 4. MORE-ACTIONS DROPDOWN ================= */
    function initDropdown() {
        var dropdown = document.getElementById("odMoreDropdown");
        var trigger = document.getElementById("odMoreTrigger");
        if (!dropdown || !trigger) return;

        function close() {
            dropdown.classList.remove("is-open");
            trigger.setAttribute("aria-expanded", "false");
        }
        function toggle() {
            var isOpen = dropdown.classList.toggle("is-open");
            trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        }

        trigger.addEventListener("click", function (e) {
            e.stopPropagation();
            toggle();
        });

        var menu = qs(".od-dropdown-menu", dropdown);
        if (menu) menu.addEventListener("click", function (e) { e.stopPropagation(); });

        document.addEventListener("click", close);
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") close();
        });
    }

    /* ================= 5. SELLER ORDER ITEM TOGGLES ================= */
    function initSellerOrderToggles() {
        qsa("[data-toggle-seller-order]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var index = btn.getAttribute("data-toggle-seller-order");
                var panel = document.getElementById("odSellerOrderItems" + index);
                if (!panel) return;

                var isOpen = panel.classList.toggle("is-open");
                btn.innerHTML = isOpen
                    ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"></path></svg>Hide Items'
                    : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>View Items';
            });
        });
    }

    /* ================= 6. MODALS ================= */
    var lastFocusedEl = null;

    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) return;
        lastFocusedEl = document.activeElement;
        modal.classList.remove("is-hidden");
        document.body.style.overflow = "hidden";
        var focusable = qs(".od-modal-close", modal);
        if (focusable) focusable.focus();
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add("is-hidden");
        document.body.style.overflow = "";
        if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
            lastFocusedEl.focus();
        }
    }

    function closeAllModals() {
        qsa(".od-modal-overlay").forEach(function (m) {
            if (!m.classList.contains("is-hidden")) closeModal(m);
        });
    }

    function initModals() {
        qsa("[data-od-open-modal]").forEach(function (trigger) {
            trigger.addEventListener("click", function (e) {
                if (trigger.tagName === "A") e.preventDefault();
                openModal(trigger.getAttribute("data-od-open-modal"));
            });
        });

        qsa("[data-od-close-modal]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                closeModal(btn.closest(".od-modal-overlay"));
            });
        });

        qsa(".od-modal-overlay").forEach(function (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) closeModal(overlay);
            });
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeAllModals();
        });

        qsa("[data-od-confirm-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (btn.disabled) return;
                var overlay = btn.closest(".od-modal-overlay");
                var message = btn.getAttribute("data-od-toast") || "Done.";
                var originalHTML = btn.innerHTML;

                btn.disabled = true;
                btn.innerHTML = "Processing&hellip;";

                window.setTimeout(function () {
                    btn.disabled = false;
                    btn.innerHTML = originalHTML;
                    closeModal(overlay);
                    showToast(message, "success");
                }, 650);
            });
        });
    }

    /* ================= 7. REFUND MODAL ================= */
    function initRefundModal() {
        var fullRadio = document.getElementById("odRefundTypeFull");
        var partialRadio = document.getElementById("odRefundTypePartial");
        var itemsWrap = document.getElementById("odRefundItemsWrap");
        var amountInput = document.getElementById("odRefundAmount");
        var checkboxes = qsa(".od-refund-item-checkbox");

        if (!fullRadio || !partialRadio || !amountInput) return;

        function recalcAmount() {
            var isFull = fullRadio.checked;
            var total = 0;

            checkboxes.forEach(function (cb) {
                if (isFull || cb.checked) {
                    total += parseFloat(cb.getAttribute("data-amount")) || 0;
                }
            });

            amountInput.value = "Rs. " + Math.round(total).toLocaleString("en-IN");
        }

        function toggleItemsWrap() {
            if (itemsWrap) itemsWrap.style.opacity = fullRadio.checked ? "0.5" : "1";
            checkboxes.forEach(function (cb) { cb.disabled = fullRadio.checked; });
            recalcAmount();
        }

        fullRadio.addEventListener("change", toggleItemsWrap);
        partialRadio.addEventListener("change", toggleItemsWrap);
        checkboxes.forEach(function (cb) { cb.addEventListener("change", recalcAmount); });

        // Support opening straight into "partial" mode from action-center buttons
        qsa('[data-od-open-modal="odRefundModal"]').forEach(function (btn) {
            btn.addEventListener("click", function () {
                var type = btn.getAttribute("data-refund-type");
                if (type === "partial") {
                    partialRadio.checked = true;
                } else if (type === "full") {
                    fullRadio.checked = true;
                }
                toggleItemsWrap();
            });
        });

        toggleItemsWrap();
    }

    /* ================= 8. COPY TO CLIPBOARD ================= */
    function copyValue(value, triggerEl) {
        if (!value) {
            showToast("Nothing to copy yet.", "danger");
            return;
        }

        function finish() {
            if (triggerEl) {
                triggerEl.classList.add("is-copied");
                window.setTimeout(function () { triggerEl.classList.remove("is-copied"); }, 1400);
            }
            showToast("Copied to clipboard.", "success");
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(finish).catch(finish);
        } else {
            var temp = document.createElement("textarea");
            temp.value = value;
            temp.style.position = "fixed";
            temp.style.opacity = "0";
            document.body.appendChild(temp);
            temp.select();
            try { document.execCommand("copy"); } catch (err) { /* no-op */ }
            document.body.removeChild(temp);
            finish();
        }
    }

    function initCopyButtons() {
        qsa("[data-copy-target]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var targetId = btn.getAttribute("data-copy-target");
                var target = document.getElementById(targetId);
                if (!target) return;
                var value = target.getAttribute("data-copy-value") || target.textContent.trim();
                copyValue(value, btn);
            });
        });
    }

    /* ================= 9. PRINT ACTIONS ================= */
    function initPrintActions() {
        ["odPrintBtn", "odPrintActionBtn", "odExportPrintOption"].forEach(function (id) {
            var btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener("click", function () {
                window.print();
            });
        });
    }

    /* ================= 10. QUICK STATUS / GENERIC TOASTS ================= */
    function initQuickStatusButtons() {
        qsa("[data-set-status]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var status = btn.getAttribute("data-set-status");
                showToast("Order marked as " + status.replace(/_/g, " ") + ".", "success");
            });
        });

        var confirmBtn = document.getElementById("odConfirmOrderAction");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", function () {
                showToast("Order confirmed.", "success");
            });
        }

        var primaryBtn = document.getElementById("odPrimaryActionBtn");
        if (primaryBtn && !primaryBtn.disabled) {
            primaryBtn.addEventListener("click", function () {
                var next = primaryBtn.getAttribute("data-next-status");
                showToast(next ? ("Order moved to " + next.replace(/_/g, " ") + ".") : "Order updated.", "success");
            });
        }

        qsa("[data-toast]").forEach(function (el) {
            if (el.hasAttribute("data-od-confirm-action") || el.hasAttribute("data-od-open-modal")) return;
            el.addEventListener("click", function () {
                showToast(el.getAttribute("data-toast"), "info");
            });
        });
    }

    /* ================= 11. INIT ================= */
    function init() {
        initReveal();
        initRipples();
        initDropdown();
        initSellerOrderToggles();
        initModals();
        initRefundModal();
        initCopyButtons();
        initPrintActions();
        initQuickStatusButtons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();