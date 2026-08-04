/* ==========================================================================
   MARKETSPHERE ADMIN — SELLER APPLICATION DETAIL (detail.js)
   Frontend-only interactivity for admin_dashboard/users/seller_applications/detail.html.
   Vanilla JS, IIFE-scoped, no external libraries, no network calls.
   All actions are simulated locally; backend wiring happens in a later pass.

   Sections:
     1. Bootstrap / DOM cache
     2. Helpers (ripple, toast, loading state)
     3. Reveal-on-scroll (IntersectionObserver)
     4. Sticky tabs
     5. Animated counters
     6. Progress bar + score ring animation
     7. Dropdown menus
     8. Modal open/close/confirm
     9. Document preview / zoom modal
    10. Copy-to-clipboard
    11. Admin notes (add/clear, local only)
    12. Activity timeline filters
    13. Responsive nav helpers
    14. Init
   ========================================================================== */

(function () {
    "use strict";

    var root = document.getElementById("sadPage");
    if (!root) return;

    /* ================= 2. HELPERS ================= */

    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    // Ripple effect for any element with data-sad-ripple or .sad-btn
    function attachRipple(el) {
        el.addEventListener("click", function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement("span");
            var size = Math.max(rect.width, rect.height);
            ripple.className = "sad-ripple";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
            var prevPosition = getComputedStyle(el).position;
            if (prevPosition === "static") el.style.position = "relative";
            el.style.overflow = el.style.overflow || "hidden";
            el.appendChild(ripple);
            requestAnimationFrame(function () {
                ripple.style.transition = "transform .5s ease, opacity .5s ease";
                ripple.style.transform = "scale(2.6)";
                ripple.style.opacity = "0";
            });
            setTimeout(function () { ripple.remove(); }, 520);
        });
    }

    function initRipples() {
        qsa(".sad-btn, .sad-action-btn, .sad-comm-quick-btn").forEach(attachRipple);
    }

    // Toast notifications
    var toastContainer = qs("#sadToastContainer");
    var TOAST_ICONS = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>',
        danger: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    function showToast(message, type) {
        if (!toastContainer || !message) return;
        type = type && TOAST_ICONS[type] ? type : "info";
        var toast = document.createElement("div");
        toast.className = "sad-toast sad-toast-" + type;
        toast.setAttribute("role", "status");
        toast.innerHTML = TOAST_ICONS[type] + "<span>" + message + "</span>";
        toastContainer.appendChild(toast);
        setTimeout(function () {
            toast.classList.add("is-leaving");
            setTimeout(function () { toast.remove(); }, 240);
        }, 3600);
    }

    // Simulated async loading state on a button (no network calls — just a local delay)
    function runWithLoadingState(btn, callback, delay) {
        if (!btn || btn.classList.contains("is-loading")) return;
        var originalHTML = btn.innerHTML;
        var label = btn.querySelector(".sad-btn-label");
        btn.classList.add("is-loading");
        btn.disabled = true;
        if (!label) {
            btn.innerHTML = '<span class="sad-btn-label">' + btn.textContent.trim() + "</span>";
        }
        setTimeout(function () {
            btn.classList.remove("is-loading");
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            if (typeof callback === "function") callback();
        }, delay || 700);
    }

    /* ================= 3. REVEAL ON SCROLL ================= */
    function initReveal() {
        var items = qsa(".sad-reveal");
        if (!items.length) return;

        if (!("IntersectionObserver" in window)) {
            items.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

        items.forEach(function (el, i) {
            el.style.transitionDelay = Math.min(i * 60, 240) + "ms";
            observer.observe(el);
        });
    }

    /* ================= 4. STICKY TABS ================= */
    function initTabs() {
        var tabs = qsa(".sad-tab");
        var panels = qsa(".sad-tab-panel");
        if (!tabs.length) return;

        function activate(name) {
            tabs.forEach(function (t) {
                var isActive = t.getAttribute("data-sad-tab") === name;
                t.classList.toggle("is-active", isActive);
                t.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            panels.forEach(function (p) {
                p.classList.toggle("is-active", p.getAttribute("data-sad-panel") === name);
            });
        }

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                activate(tab.getAttribute("data-sad-tab"));
                tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            });
        });
    }

    /* ================= 5. ANIMATED COUNTERS ================= */
    function initCounters() {
        var counters = qsa("[data-sad-counter]");
        if (!counters.length) return;

        function animate(el) {
            var target = parseFloat(el.getAttribute("data-target")) || 0;
            var duration = 900;
            var start = null;
            var from = 0;

            function step(ts) {
                if (!start) start = ts;
                var progress = Math.min((ts - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                var value = Math.round(from + (target - from) * eased);
                el.textContent = value;
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target;
                }
            }
            requestAnimationFrame(step);
        }

        if (!("IntersectionObserver" in window)) {
            counters.forEach(animate);
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animate(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        counters.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 6. PROGRESS BARS + SCORE RING ================= */
    function initProgressAnimations() {
        var bars = qsa("[data-sad-progress]");
        var ring = qs("#sadScoreRing");

        function fillBars() {
            bars.forEach(function (bar) {
                bar.classList.add("is-filled");
            });
        }

        function fillRing() {
            if (!ring) return;
            ring.classList.add("is-animated");
        }

        var targets = bars.slice();
        if (ring) targets.push(ring);
        if (!targets.length) return;

        if (!("IntersectionObserver" in window)) {
            fillBars();
            fillRing();
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    if (entry.target === ring) {
                        fillRing();
                    } else {
                        entry.target.classList.add("is-filled");
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        targets.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 7. DROPDOWN MENUS ================= */
    function initDropdowns() {
        var dropdowns = qsa(".sad-dropdown");
        if (!dropdowns.length) return;

        function closeAll(except) {
            dropdowns.forEach(function (d) {
                if (d !== except) d.classList.remove("is-open");
            });
        }

        dropdowns.forEach(function (dropdown) {
            var toggle = qs("[data-sad-dropdown-toggle]", dropdown);
            if (!toggle) return;
            toggle.addEventListener("click", function (e) {
                e.stopPropagation();
                var willOpen = !dropdown.classList.contains("is-open");
                closeAll();
                dropdown.classList.toggle("is-open", willOpen);
            });
        });

        document.addEventListener("click", function () { closeAll(); });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeAll();
        });
    }

    /* ================= 8. MODALS ================= */
    var lastFocusedEl = null;

    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) return;
        lastFocusedEl = document.activeElement;
        modal.classList.remove("is-hidden");
        document.body.style.overflow = "hidden";
        var focusable = qs(".sad-modal-close", modal);
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
        qsa(".sad-modal-overlay").forEach(function (m) {
            if (!m.classList.contains("is-hidden")) closeModal(m);
        });
    }

    function initModals() {
        qsa("[data-sad-open-modal]").forEach(function (trigger) {
            trigger.addEventListener("click", function () {
                openModal(trigger.getAttribute("data-sad-open-modal"));
            });
        });

        qsa("[data-sad-close-modal]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                closeModal(btn.closest(".sad-modal-overlay"));
            });
        });

        qsa(".sad-modal-overlay").forEach(function (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) closeModal(overlay);
            });
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeAllModals();
        });

        // Confirm buttons inside modals: simulate loading, toast, then close
        qsa("[data-sad-confirm-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var overlay = btn.closest(".sad-modal-overlay");
                var message = btn.getAttribute("data-sad-toast-msg");
                var type = btn.getAttribute("data-sad-toast") || "success";
                runWithLoadingState(btn, function () {
                    closeModal(overlay);
                    showToast(message, type);
                }, 800);
            });
        });

        // Delete confirmation gating — requires typing DELETE
        var deleteInput = qs("#sadDeleteConfirmInput");
        var deleteBtn = qs("#sadDeleteConfirmBtn");
        if (deleteInput && deleteBtn) {
            deleteInput.addEventListener("input", function () {
                deleteBtn.disabled = deleteInput.value.trim().toUpperCase() !== "DELETE";
            });
            deleteBtn.addEventListener("click", function () {
                if (deleteBtn.disabled) return;
                var overlay = deleteBtn.closest(".sad-modal-overlay");
                var message = deleteBtn.getAttribute("data-sad-toast-msg");
                runWithLoadingState(deleteBtn, function () {
                    closeModal(overlay);
                    showToast(message, "danger");
                    deleteInput.value = "";
                    deleteBtn.disabled = true;
                }, 800);
            });
        }
    }

    /* ================= 9. DOCUMENT PREVIEW / ZOOM MODAL ================= */
    function initDocPreview() {
        var previewModal = qs("#sadDocPreviewModal");
        var previewImg = qs("#sadDocPreviewImg");
        var previewTitle = qs("#sadDocPreviewTitle");
        if (!previewModal || !previewImg) return;

        qsa("[data-sad-doc-preview]").forEach(function (trigger) {
            trigger.addEventListener("click", function () {
                var src = trigger.getAttribute("data-doc-src") || "";
                var title = trigger.getAttribute("data-doc-title") || "Document Preview";
                previewImg.src = src;
                previewImg.alt = title;
                if (previewTitle) previewTitle.textContent = title;
                openModal("sadDocPreviewModal");
            });
        });
    }

    /* ================= 10. COPY TO CLIPBOARD ================= */
    function initCopyButtons() {
        qsa("[data-sad-copy]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var value = btn.getAttribute("data-sad-copy") || "";
                var finish = function () {
                    btn.classList.add("is-copied");
                    showToast("Copied to clipboard", "success");
                    setTimeout(function () { btn.classList.remove("is-copied"); }, 1500);
                };
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
            });
        });
    }

    /* ================= 11. ADMIN NOTES (LOCAL ONLY) ================= */
    function initNotes() {
        var input = qs("#sadNoteInput");
        var flagCheckbox = qs("#sadNoteFlag");
        var addBtn = qs("#sadNoteAdd");
        var clearBtn = qs("#sadNoteClear");
        var list = qs("#sadNotesList");
        if (!input || !addBtn || !list) return;

        function resetComposer() {
            input.value = "";
            if (flagCheckbox) flagCheckbox.checked = false;
        }

        clearBtn && clearBtn.addEventListener("click", resetComposer);

        addBtn.addEventListener("click", function () {
            var text = input.value.trim();
            if (!text) {
                input.focus();
                return;
            }
            var isFlagged = flagCheckbox && flagCheckbox.checked;
            var card = document.createElement("div");
            card.className = "sad-note-card";
            card.innerHTML =
                '<div class="sad-note-head">' +
                    '<div class="sad-note-avatar">YOU</div>' +
                    '<div class="sad-note-meta"><strong>You</strong><span>Just now</span></div>' +
                    (isFlagged ? '<span class="sad-badge c-warning">Important</span>' : "") +
                '</div>' +
                '<p class="sad-note-content"></p>' +
                '<div class="sad-note-actions">' +
                    '<button type="button" class="sad-link-btn" data-sad-toast="info" data-sad-toast-msg="Edit note coming soon">Edit</button>' +
                    '<button type="button" class="sad-link-btn c-danger" data-sad-note-delete>Delete</button>' +
                '</div>';
            card.querySelector(".sad-note-content").textContent = text;
            list.insertBefore(card, list.firstChild);
            resetComposer();
            showToast("Note added", "success");
        });

        // Event delegation for dynamically added delete buttons
        list.addEventListener("click", function (e) {
            var deleteBtn = e.target.closest("[data-sad-note-delete]");
            if (!deleteBtn) return;
            var card = deleteBtn.closest(".sad-note-card");
            if (card) {
                card.style.transition = "opacity .2s ease, transform .2s ease";
                card.style.opacity = "0";
                card.style.transform = "translateY(-6px)";
                setTimeout(function () { card.remove(); }, 200);
            }
            showToast("Note removed", "danger");
        });
    }

    /* ================= 12. ACTIVITY TIMELINE FILTERS ================= */
    function initTimelineFilters() {
        var pills = qsa("#sadTimelineFilters .sad-pill");
        var items = qsa("#sadTimeline .sad-timeline-item");
        if (!pills.length || !items.length) return;

        pills.forEach(function (pill) {
            pill.addEventListener("click", function () {
                pills.forEach(function (p) { p.classList.remove("is-active"); });
                pill.classList.add("is-active");
                var filter = pill.getAttribute("data-sad-filter");
                items.forEach(function (item) {
                    var type = item.getAttribute("data-sad-event-type");
                    var show = filter === "all" || filter === type;
                    item.classList.toggle("sad-timeline-hidden", !show);
                });
            });
        });
    }

    /* ================= 13. GENERIC TOAST TRIGGERS ================= */
    // Any element with data-sad-toast (that ISN'T a confirm-action handled above)
    // fires an instant toast — used for lightweight, non-modal actions.
    function initGenericToastTriggers() {
        qsa("[data-sad-toast]").forEach(function (el) {
            if (el.hasAttribute("data-sad-confirm-action") || el.hasAttribute("data-sad-note-delete")) return;
            el.addEventListener("click", function () {
                var type = el.getAttribute("data-sad-toast") || "info";
                var message = el.getAttribute("data-sad-toast-msg") || "Done";
                if (el.classList.contains("sad-btn")) {
                    runWithLoadingState(el.querySelector(".sad-btn-label") ? el : el, function () {
                        showToast(message, type);
                    }, 500);
                } else {
                    showToast(message, type);
                }
            });
        });
    }

    /* ================= 14. STICKY TABS SHADOW ON SCROLL ================= */
    function initStickyShadow() {
        var tabs = qs("#sadTabs");
        if (!tabs) return;
        var ticking = false;
        function update() {
            var rect = tabs.getBoundingClientRect();
            var stuck = rect.top <= (parseInt(getComputedStyle(tabs).top, 10) || 0) + 1;
            tabs.style.boxShadow = stuck ? "var(--sad-shadow-md)" : "var(--sad-shadow-sm)";
            ticking = false;
        }
        window.addEventListener("scroll", function () {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }

    /* ================= 15. AVATAR CLICK → PREVIEW ================= */
    function initAvatarPreview() {
        var avatar = qs("#sadAvatarTrigger");
        if (!avatar) return;
        avatar.addEventListener("click", function () {
            var img = avatar.querySelector("img");
            var src = img ? img.getAttribute("src") : "";
            var previewImg = qs("#sadDocPreviewImg");
            var previewTitle = qs("#sadDocPreviewTitle");
            if (previewImg) previewImg.src = src || "";
            if (previewTitle) previewTitle.textContent = "Applicant Photo";
            openModal("sadDocPreviewModal");
        });
    }

    /* ================= INIT ================= */
    function init() {
        initReveal();
        initTabs();
        initCounters();
        initProgressAnimations();
        initDropdowns();
        initModals();
        initDocPreview();
        initCopyButtons();
        initNotes();
        initTimelineFilters();
        initGenericToastTriggers();
        initStickyShadow();
        initAvatarPreview();
        initRipples();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();