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

    const SELLER_APPLICATION_ID = document.getElementsByClassName("sad-header")[0].getAttribute("data-sad-application-id");

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
            deleteBtn.addEventListener("click", async function () {

                if (deleteBtn.disabled) return;

                const overlay = deleteBtn.closest(".sad-modal-overlay");

                runWithLoadingState(deleteBtn, async function () {

                    try {

                        const response = await fetch(
                            `/admin-db/user/seller/${SELLER_ID}/delete/`,
                            {
                                method: "POST",
                                headers: {
                                    "X-CSRFToken": getCSRFToken(),
                                },
                            }
                        );

                        const data = await response.json();

                        if (!response.ok) {
                            throw new Error(data.message || "Unable to delete seller.");
                        }

                        closeModal(overlay);

                        showToast("success", data.message);

                        deleteInput.value = "";
                        deleteBtn.disabled = true;

                        setTimeout(function () {
                            window.location.href = "/admin-db/user/sellers/";
                        }, 1200);

                    } catch (error) {
                        showToast("danger", error.message);
                    }

                }, 800);

            });
        }
    }

    /* ================= 9. DOCUMENT PREVIEW / ZOOM MODAL ================= */
    function initDocPreview() {

        const previewModal = qs("#sadDocPreviewModal");
        const previewImg = qs("#sadDocPreviewImg");
        const previewTitle = qs("#sadDocPreviewTitle");

        if (!previewModal || !previewImg) return;

        qsa("[data-sad-doc-preview]").forEach(function (trigger) {

            trigger.addEventListener("click", function (e) {

                e.preventDefault();

                const src = trigger.getAttribute("data-doc-src");
                const title = trigger.getAttribute("data-doc-title") || "Document Preview";

                if (!src) return;

                // Detect PDF
                const extension = src.split(".").pop().toLowerCase();

                if (extension === "pdf") {
                    window.open(src, "_blank");
                    return;
                }

                // Image Preview
                previewImg.src = src;
                previewImg.alt = title;

                if (previewTitle) {
                    previewTitle.textContent = title;
                }

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

    /* ================= 11. ADMIN NOTES ================= */
    function initNotes() {
        var input = qs("#sadNoteInput");
        var addBtn = qs("#sadNoteAdd");
        var clearBtn = qs("#sadNoteClear");

        if (!input || !addBtn) return;

        function resetComposer() {
            input.value = "";
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", resetComposer);
        }

        addBtn.addEventListener("click", async function () {

            var notes = input.value.trim();

            addBtn.disabled = true;

            try {

                const response = await fetch(
                    "/admin-db/user/seller/application/save-notes/",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": getCSRFToken(),
                        },
                        body: JSON.stringify({
                            application_id: SELLER_APPLICATION_ID,
                            notes: notes,
                        }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Unable to save notes."
                    );
                }

                showToast(
                    "Notes saved successfully.",
                    "success"
                );

            } catch (error) {

                console.error(error);

                showToast(
                    error.message || "Something went wrong.",
                    "danger"
                );

            } finally {

                addBtn.disabled = false;

            }

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
    function getCSRFToken() {
        const name = "csrftoken";
        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {
            cookie = cookie.trim();

            if (cookie.startsWith(name + "=")) {
                return decodeURIComponent(cookie.substring(name.length + 1));
            }
        }

        return "";
    }

    function initRejectApplication() {
        const rejectBtn = document.querySelector("#sadRejectModal [data-sad-confirm-action]");
        if (!rejectBtn) return;

        rejectBtn.addEventListener("click", async function () {
            const reason = document.getElementById("sadRejectReason").value;
            const notes = document.getElementById("sadRejectNote").value.trim();

            rejectBtn.disabled = true;
            try {
                const response = await fetch(
                    `/admin-db/user/seller/${SELLER_APPLICATION_ID}/application/reject/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": getCSRFToken(),
                        },
                        body: JSON.stringify({
                            reason: reason,
                            notes: notes,
                        }),
                    }
                );
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to reject application.");
                }

                showToast("danger", data.message);

                closeModal(document.getElementById("sadRejectModal"));

                setTimeout(function () {
                    location.reload();
                }, 1200);

            } catch (error) {
                console.error("Error rejecting application:", error);
                showToast("danger", error.message || "An error occurred while rejecting the application.");
            } finally {
                rejectBtn.disabled = false;
            }
        });
    }

    function initRequestChanges() {
        const sendBtn = document.querySelector(
            "#sadChangesModal [data-sad-confirm-action]"
        );

        if (!sendBtn) return;

        sendBtn.addEventListener("click", async function () {

            const note = document
                .getElementById("sadChangesNote")
                .value
                .trim();

            const requestedChanges = [];

            document
                .querySelectorAll("#sadChangesModal .sad-checkbox")
                .forEach(function (item) {

                    const checkbox = item.querySelector("input[type='checkbox']");

                    if (checkbox.checked) {
                        requestedChanges.push(
                            item.querySelector(".sad-checkbox-text").textContent.trim()
                        );
                    }
                });

            sendBtn.disabled = true;

            try {

                const response = await fetch(
                    `/admin-db/user/seller/${SELLER_APPLICATION_ID}/application/request-changes/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": getCSRFToken(),
                        },
                        body: JSON.stringify({
                            requested_changes: requestedChanges,
                            notes: note,
                        }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to send request.");
                }

                showToast("info", data.message);

                closeModal(document.getElementById("sadChangesModal"));

                setTimeout(function () {
                    location.reload();
                }, 1000);

            } catch (error) {
                showToast("danger", error.message);
            } finally {
                sendBtn.disabled = false;
            }

        });
    }

    function initApproveApplication() {
        const approveBtn = document.querySelector(
            "#sadApproveModal [data-sad-confirm-action]"
        );

        if (!approveBtn) return;

        approveBtn.addEventListener("click", async function () {

            approveBtn.disabled = true;

            try {

                const response = await fetch(
                    `/admin-db/user/seller/${SELLER_APPLICATION_ID}/application/approve/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": getCSRFToken(),
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to approve application.");
                }

                showToast("success", data.message);

                closeModal(document.getElementById("sadApproveModal"));
                window.location.href = `/admin-db/user/seller/${SELLER_APPLICATION_ID}/application/`;

                setTimeout(function () {
                    location.reload();
                }, 1000);

            } catch (error) {
                showToast("danger", error.message);
            } finally {
                approveBtn.disabled = false;
            }

        });
    }

    function initExportSellerPdf() {
        const exportBtn = document.getElementById("ExportSellerDataPdf");

        if (!exportBtn) return;

        exportBtn.addEventListener("click", function () {
            const SELLER_ID = exportBtn.dataset.sellerId;
            window.location.href = `/admin-db/sellers/${SELLER_ID}/export/`;
        });
    }


    function initDocumentActions() {

        document.addEventListener("click", async function (e) {

            const button = e.target.closest("[data-document-action]");
            if (!button) return;

            const action = button.dataset.documentAction;

            // Preview is already handled by initDocPreview()
            if (action === "preview") {
                return;
            }

            e.preventDefault();

            const documentId = button.dataset.documentId;
            const documentType = button.dataset.documentType;
            // alert(`Action: ${action}\nDocument ID: ${documentId}\nDocument Type: ${documentType}`);

            switch (action) {

                case "verify":
                    await verifyDocument(documentId, documentType);
                    break;

                case "flag":
                    openFlagIssueModal(documentId, documentType);
                    break;

                case "request":
                    openRequestDocumentModal(button);
                    break;

                default:
                    console.warn("Unknown document action:", action);
            }

        });

    }
    async function verifyDocument(documentId, documentType) {
        try {
            const response = await fetch(
                `/admin-db/user/seller/document/${documentId}/verify/`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFToken(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        document_type: documentType,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            showToast("success", data.message);

            setTimeout(() => location.reload(), 700);

        } catch (err) {
            showToast("danger", err.message);
        }
    }
    function openFlagIssueModal(documentId, documentType) {

        const modal = document.getElementById("sadFlagIssueModal");

        modal.dataset.documentId = documentId;
        modal.dataset.documentType = documentType;

        openModal("sadFlagIssueModal");
    }

    function openRequestDocumentModal(button) {

        const modal = document.getElementById("sadRequestDocumentModal");
        if (!modal) return;

        modal.dataset.documentType = button.dataset.documentType || "";

        const title = modal.querySelector("#sadRequestDocumentTitle");
        if (title) {
            title.textContent = button.dataset.documentType
                .replace(/_/g, " ")
                .replace(/\b\w/g, c => c.toUpperCase());
        }

        const textarea = modal.querySelector("#sadRequestDocumentNote");
        if (textarea) {
            textarea.value = "";
        }

        openModal("sadRequestDocumentModal");

    }
    function initFlagIssueSubmit() {

        const btn = document.getElementById("sadFlagIssueConfirm");
        if (!btn) return;

        btn.addEventListener("click", async function () {

            const modal = document.getElementById("sadFlagIssueModal");

            const documentId = modal.dataset.documentId;
            const issue = document.getElementById("sadFlagReason").value;
            const note = document.getElementById("sadFlagNote").value.trim();

            btn.disabled = true;

            try {

                const response = await fetch(
                    `/admin-db/user/seller/document/${documentId}/flag/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": getCSRFToken(),
                        },
                        body: JSON.stringify({
                            issue,
                            note,
                        }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message);
                }

                showToast("success", data.message);

                closeModal(modal);

                setTimeout(function () {
                    location.reload();
                }, 800);

            } catch (error) {

                showToast("danger", error.message);

            } finally {

                btn.disabled = false;

            }

        });

    }

    function initRequestDocumentSubmit() {

        const submitBtn = document.getElementById("sadRequestDocumentConfirmBtn");

        if (!submitBtn) return;

        submitBtn.addEventListener("click", async function () {

            const modal = document.getElementById("sadRequestDocumentModal");

            const documentType = modal.dataset.documentType;
            const reason = document.getElementById("sadRequestReason").value;
            const note = document.getElementById("sadRequestNote").value.trim();

            submitBtn.disabled = true;

            try {

                const response = await fetch(
                    `/admin-db/user/seller/document/request/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": getCSRFToken(),
                        },
                        body: JSON.stringify({
                            application_id: SELLER_APPLICATION_ID,
                            document_type: documentType,
                            reason: reason,
                            note: note,
                        }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Unable to send document request."
                    );
                }

                showToast("success", data.message);

                closeModal(modal);

                document.getElementById("sadRequestReason").selectedIndex = 0;
                document.getElementById("sadRequestNote").value = "";

                setTimeout(function () {
                    location.reload();
                }, 1000);

            } catch (error) {

                showToast("danger", error.message);

            } finally {

                submitBtn.disabled = false;

            }

        });

    }
    initRequestDocumentSubmit();
    initFlagIssueSubmit();

    initDocumentActions();
    initExportSellerPdf();
    initApproveApplication();
    initRequestChanges();
    initRejectApplication();

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