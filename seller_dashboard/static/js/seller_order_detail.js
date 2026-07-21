/* =========================================================================
   MARKETSPHERE — SELLER DASHBOARD: ORDER DETAIL
   Frontend-only interactions for seller_dashboard/templates/orders/detail.html.
   No fetch(), no AJAX, no backend calls, no external libraries. Every
   action here (status buttons, cancel/refund modals, copy tracking
   number, activity feed expand/collapse, timeline + card reveal, print)
   is a pure DOM / UI simulation until the seller-orders backend (views,
   URLs, models) exists — matching the pattern already used across the
   rest of the seller dashboard (see seller_dashboard/static/js/orders.js,
   products.js).

   Sections:
     1. DOM Cache
     2. Toast Helper
     3. Scroll Reveal (cards + timeline)
     4. Copy Tracking Number
     5. Activity Feed Expand / Collapse
     6. Status Badge Hover Micro-interaction
     7. Order Action Buttons (status transitions)
     8. Cancel Order Confirmation Modal
     9. Refund Placeholder Modal
    10. Print / Download Invoice Placeholders
    11. Smooth Scroll Between Sections
    12. Init
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {

    /* ================= 1. DOM CACHE ================= */
    const page = document.querySelector('.sod-page');
    if (!page) return; // nothing to control on this page

    const toastContainer = document.getElementById('sodToastContainer');

    /* ================= 2. TOAST HELPER ================= */
    function showToast(message, type) {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'sod-toast sod-toast-' + (type || 'info');
        toast.setAttribute('role', 'status');

        const iconMarkup = type === 'error'
            ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
            : type === 'success'
                ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>'
                : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

        toast.innerHTML = iconMarkup + '<span></span>';
        toast.querySelector('span').textContent = message;

        toastContainer.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add('is-leaving');
            toast.addEventListener('animationend', function () {
                toast.remove();
            }, { once: true });
        }, 4000);
    }

    /* ================= 3. SCROLL REVEAL ================= */
    const revealTargets = document.querySelectorAll('.sod-reveal');

    if ('IntersectionObserver' in window && revealTargets.length) {
        const observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        revealTargets.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        revealTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    // Timeline steps get a small staggered pop-in once the card is visible.
    const timelineCard = document.querySelector('.sod-timeline-card');
    const timelineSteps = document.querySelectorAll('.sod-timeline-step');

    if (timelineCard && timelineSteps.length && 'IntersectionObserver' in window) {
        timelineSteps.forEach(function (step) {
            step.style.opacity = '0';
            step.style.transform = 'translateY(8px)';
            step.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        });

        const timelineObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                timelineSteps.forEach(function (step, index) {
                    window.setTimeout(function () {
                        step.style.opacity = '1';
                        step.style.transform = 'translateY(0)';
                    }, index * 90);
                });

                obs.unobserve(entry.target);
            });
        }, { threshold: 0.2 });

        timelineObserver.observe(timelineCard);
    }

    /* ================= 4. COPY TRACKING NUMBER ================= */
    const copyTrackingBtn = document.getElementById('sodCopyTrackingBtn');

    if (copyTrackingBtn) {
        copyTrackingBtn.addEventListener('click', function () {
            const trackingNumber = copyTrackingBtn.dataset.trackingNumber || '';

            if (!trackingNumber) {
                showToast('No tracking number available to copy yet.', 'error');
                return;
            }

            const originalIcon = copyTrackingBtn.innerHTML;

            const markCopied = function () {
                copyTrackingBtn.classList.add('is-copied');
                copyTrackingBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';
                showToast('Tracking number copied to clipboard.', 'success');

                window.setTimeout(function () {
                    copyTrackingBtn.classList.remove('is-copied');
                    copyTrackingBtn.innerHTML = originalIcon;
                }, 1800);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(trackingNumber).then(markCopied).catch(function () {
                    showToast('Could not copy the tracking number.', 'error');
                });
            } else {
                const tempInput = document.createElement('textarea');
                tempInput.value = trackingNumber;
                tempInput.style.position = 'fixed';
                tempInput.style.opacity = '0';
                document.body.appendChild(tempInput);
                tempInput.select();

                try {
                    document.execCommand('copy');
                    markCopied();
                } catch (err) {
                    showToast('Could not copy the tracking number.', 'error');
                }

                document.body.removeChild(tempInput);
            }
        });
    }

    /* ================= 5. ACTIVITY FEED EXPAND / COLLAPSE ================= */
    const activityToggle = document.getElementById('sodActivityToggle');
    const activityFeed = document.getElementById('sodActivityFeed');
    const activityFade = document.getElementById('sodActivityFade');

    if (activityToggle && activityFeed) {
        activityToggle.addEventListener('click', function () {
            const isCollapsed = activityFeed.classList.toggle('is-collapsed');
            const isExpanded = !isCollapsed;

            activityToggle.setAttribute('aria-expanded', String(isExpanded));

            const label = activityToggle.querySelector('span');
            if (label) {
                label.textContent = isExpanded ? 'Show Less' : 'Show Full Activity';
            }

            if (activityFade) {
                activityFade.classList.toggle('is-hidden', isExpanded);
            }
        });
    }

    /* ================= 6. STATUS BADGE HOVER MICRO-INTERACTION ================= */
    // Handled purely in CSS (:hover transform) — this just adds a tiny
    // keyboard-accessible "tap" pulse for touch users on click.
    document.querySelectorAll('.sod-badge').forEach(function (badge) {
        badge.addEventListener('click', function () {
            badge.style.transform = 'scale(1.12)';
            window.setTimeout(function () {
                badge.style.transform = '';
            }, 160);
        });
    });

    /* ================= 7. ORDER ACTION BUTTONS (status transitions) ================= */
    // Every "mark as ..." action just updates the on-page badges/timeline
    // for a responsive feel — the real transition happens once the seller
    // orders backend + endpoints exist.
    const statusBadge = document.getElementById('sodStatusBadge');
    const timelineStepEls = {
        placed: document.querySelector('[data-timeline-step="placed"]'),
        confirmed: document.querySelector('[data-timeline-step="confirmed"]'),
        processing: document.querySelector('[data-timeline-step="processing"]'),
        shipped: document.querySelector('[data-timeline-step="shipped"]'),
        delivered: document.querySelector('[data-timeline-step="delivered"]')
    };
    // console.log(timelineStepEls);

    const STATUS_LABELS = {
        confirmed: 'Confirmed',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
    };

    const STATUS_ORDER = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

    function setBadgeStatus(statusKey) {
        if (!statusBadge) return;
        statusBadge.className = 'sod-badge sod-badge-' + statusKey;
        statusBadge.textContent = STATUS_LABELS[statusKey] || statusKey;
    }

    function advanceTimelineTo(stepKey) {
        const targetIndex = STATUS_ORDER.indexOf(stepKey);
        if (targetIndex === -1) return;

        STATUS_ORDER.forEach(function (key, index) {
            const el = timelineStepEls[key];
            if (!el) return;

            // Reset classes
            el.classList.remove("is-complete", "is-current", "is-cancelled");

            if (index < targetIndex) {
                // Previous steps
                el.classList.add("is-complete");
            } else if (index === targetIndex) {
                // Current step
                el.classList.add("is-complete", "is-current");
            }
            // Future steps remain with no extra classes
        });

        // Hide cancelled notice if it exists
        const cancelledNotice = document.getElementById("sodCancelledNotice");
        if (cancelledNotice) {
            cancelledNotice.classList.add("sod-hidden");
        }
    }

    function bindStatusAction(buttonId, statusKey, timelineKey, successMessage) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.addEventListener("click", async function () {
            if (btn.disabled) return;

            btn.disabled = true;


            try {
                await updateOrderStatus(statusKey);

                setBadgeStatus(statusKey);
                advanceTimelineTo(timelineKey);
                showToast(successMessage, "success");

                document.querySelectorAll(".sod-action-btn[data-status-step]").forEach(function (actionBtn) {
                    const step = actionBtn.dataset.statusStep;
                    const stepIndex = STATUS_ORDER.indexOf(step);
                    const currentIndex = STATUS_ORDER.indexOf(timelineKey);

                    if (stepIndex !== -1 && stepIndex <= currentIndex) {
                        actionBtn.disabled = true;
                    }
                });
            } catch (error) {
                btn.disabled = false;
                showToast(error.message || "Something went wrong.", "error");
            }
        });
    }

    const orderNumber = document.getElementById("sodActivityCard").dataset.orderNumber;

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

    async function updateOrderStatus(status) {
        try {
            const response = await fetch(`/seller/orders/${orderNumber}/${status}/`, {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest",
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to update order status.");
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    bindStatusAction('sodConfirmBtn', 'confirmed', 'confirmed', 'Order marked as Confirmed.');
    bindStatusAction('sodProcessingBtn', 'processing', 'processing', 'Order marked as Processing.');
    bindStatusAction('sodShippedBtn', 'shipped', 'shipped', 'Order marked as Shipped.');
    bindStatusAction('sodDeliveredBtn', 'delivered', 'delivered', 'Order marked as Delivered.');

    /* ================= 8. CANCEL ORDER CONFIRMATION MODAL ================= */
    const cancelBtn = document.getElementById('sodCancelBtn');
    const cancelModalOverlay = document.getElementById('sodCancelModalOverlay');
    const cancelModalConfirm = document.getElementById('sodCancelModalConfirm');
    const cancelModalDismiss = document.getElementById('sodCancelModalDismiss');

    function openModal(overlay) {
        if (!overlay) return;
        overlay.classList.remove('sod-hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(overlay) {
        if (!overlay) return;
        overlay.classList.add('sod-hidden');
        document.body.style.overflow = '';
    }

    if (cancelBtn && cancelModalOverlay) {
        cancelBtn.addEventListener('click', function () {
            if (cancelBtn.disabled) return;
            openModal(cancelModalOverlay);
        });
    }

    if (cancelModalDismiss) {
        cancelModalDismiss.addEventListener('click', function () {
            closeModal(cancelModalOverlay);
        });
    }

    if (cancelModalOverlay) {
        cancelModalOverlay.addEventListener('click', function (e) {
            if (e.target === cancelModalOverlay) closeModal(cancelModalOverlay);
        });
    }
    if (cancelModalConfirm) {
        cancelModalConfirm.addEventListener("click", async function () {
            try {
                const response = await fetch(
                    `/seller/orders/${orderNumber}/cancelled/`,
                    {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCookie("csrftoken"),
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to cancel order.");
                }

                setBadgeStatus("cancelled");

                document.querySelectorAll(".sod-timeline-step").forEach((step) => {
                    step.classList.remove(
                        "is-current",
                        "is-complete",
                        "is-cancelled"
                    );
                    step.classList.add("is-cancelled");
                });

                const cancelledNotice = document.getElementById("sodCancelledNotice");
                if (cancelledNotice) {
                    cancelledNotice.classList.remove("sod-hidden");
                }

                document
                    .querySelectorAll(".sod-action-btn")
                    .forEach((btn) => (btn.disabled = true));

                closeModal(cancelModalOverlay);
                showToast("Order has been cancelled.", "success");
            } catch (error) {
                showToast(error.message || "Unable to cancel order.", "error");
            }
        });

    }

    /* ================= 9. REFUND PLACEHOLDER MODAL ================= */
    const refundBtn = document.getElementById('sodRefundBtn');
    const refundModalOverlay = document.getElementById('sodRefundModalOverlay');
    const refundModalDismiss = document.getElementById('sodRefundModalDismiss');
    const refundModalConfirm = document.getElementById('sodRefundModalConfirm');

    if (refundBtn && refundModalOverlay) {
        refundBtn.addEventListener('click', function () {
            openModal(refundModalOverlay);
        });
    }

    if (refundModalDismiss) {
        refundModalDismiss.addEventListener('click', function () {
            closeModal(refundModalOverlay);
        });
    }

    if (refundModalOverlay) {
        refundModalOverlay.addEventListener('click', function (e) {
            if (e.target === refundModalOverlay) closeModal(refundModalOverlay);
        });
    }

    if (refundModalConfirm) {
        refundModalConfirm.addEventListener('click', function () {
            closeModal(refundModalOverlay);
            showToast('Refund processing isn\u2019t available yet \u2014 check back soon.', 'info');
        });
    }

    // Shared ESC-to-close for both modals.
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (cancelModalOverlay && !cancelModalOverlay.classList.contains('sod-hidden')) {
            closeModal(cancelModalOverlay);
        }
        if (refundModalOverlay && !refundModalOverlay.classList.contains('sod-hidden')) {
            closeModal(refundModalOverlay);
        }
    });

    /* ================= 10. PRINT / DOWNLOAD INVOICE PLACEHOLDERS ================= */
    const printBtn = document.getElementById('sodPrintInvoiceBtn');
    const downloadBtn = document.getElementById('sodDownloadInvoiceBtn');
    const downloadShippingLabelBtn = document.getElementById('soddownloadShippingLabelBtn');
    const downloadPackingLabelBtn = document.getElementById('sodDownloadPackingSlipBtn');

    // const orderNumber = document.querySelector(".sod-header-actions").dataset.orderNumber;
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            window.print();
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function () {
            showToast('Preparing your invoice download...', 'info');
            window.location.href = `/order/${orderNumber}/invoice`;
        });
    }

    if (downloadPackingLabelBtn) {
        downloadPackingLabelBtn.addEventListener('click', function () {
            showToast('Preparing your Packing-slip download...', 'info');
            window.location.href = `/order/${orderNumber}/packing-slip`;
        });
    }

    if (downloadShippingLabelBtn) {
        downloadShippingLabelBtn.addEventListener('click', function () {
            showToast('Preparing your Shipping-label download...', 'info');
            window.location.href = `/order/${orderNumber}/shipping-label/`;
        });
    }

    /* ================= 11. SMOOTH SCROLL BETWEEN SECTIONS ================= */
    document.querySelectorAll('[data-scroll-to]').forEach(function (trigger) {
        trigger.addEventListener('click', function (e) {
            const targetId = trigger.getAttribute('data-scroll-to');
            const target = targetId ? document.getElementById(targetId) : null;
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    /* ================= 12. BACK BUTTON ================= */
    const backBtn = document.getElementById('sodBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/seller/orders/';
            }
        });
    }
});

const shippingModal = document.getElementById("shippingModal");

const openShippingModal = document.querySelector(".edit-shipping");

const closeShippingModal = document.getElementById("closeShippingModal");

const cancelShipping = document.getElementById("cancelShipping");

openShippingModal.addEventListener("click", () => {
    shippingModal.classList.add("active");
    document.body.style.overflow = "hidden";
});

function hideShippingModal() {
    shippingModal.classList.remove("active");
    document.body.style.overflow = "";
}

closeShippingModal.addEventListener("click", hideShippingModal);

cancelShipping.addEventListener("click", hideShippingModal);

shippingModal.addEventListener("click", function(e) {

    if (e.target === shippingModal) {
        hideShippingModal();
    }

});

document.addEventListener("keydown", function(e){

    if(e.key === "Escape"){
        hideShippingModal();
    }

});

function getCSRFToken() {
    return document.querySelector("[name=csrfmiddlewaretoken]").value;
}

document.getElementById("shippingForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const formData = new FormData();

    formData.append(
        "courier",
        document.getElementById("shippingCourier").value
    );

    formData.append(
        "tracking_number",
        document.getElementById("shippingTracking").value
    );

    formData.append(
        "estimated_delivery",
        document.getElementById("shippingEta").value
    );

    formData.append(
        "shipping_notes",
        document.getElementById("shippingNotes").value
    );

    const response = await fetch(this.dataset.url, {
        method: "POST",
        headers: {
            "X-CSRFToken": getCSRFToken(),
        },
        body: formData,
    });

    const data = await response.json();

if (data.success) {
    document.getElementById("trackingNumber").textContent =
        data.tracking_number || "Not yet assigned";

    document.getElementById("courierName").textContent =
        data.courier || "Not yet assigned";

    document.getElementById("estimatedDelivery").textContent =
        data.estimated_delivery || "Not Found Yet.";

    document.getElementById("shippingNotesDisplay").textContent =
        data.shipping_notes || "No shipping notes yet.";

    document.getElementById("sodCopyTrackingBtn").dataset.trackingNumber =
        data.tracking_number || "";

        hideShippingModal();
}
});


document.querySelectorAll(".editable-note").forEach((note) => {

    note.addEventListener("dblclick", function () {

        if (note.dataset.editing === "true") return;

        note.dataset.editing = "true";

        const originalText = note.textContent.trim();

        const textarea = document.createElement("input");
        textarea.className = "editable-note-input";
        textarea.type = "text";
        textarea.value = originalText === "No seller Notes." ? "" : originalText;

        note.innerHTML = "";
        note.appendChild(textarea);

        textarea.focus();

        function finishEditing() {

            const newValue = textarea.value.trim();

            note.dataset.editing = "false";

            note.textContent = newValue || "No seller Notes.";

            if (newValue === originalText) return;

            /*
                Later:

                fetch(note.dataset.url,{
                    method:"POST",
                    body:...
                })

                On success keep updated text.
                On failure restore original text.
            */

            console.log("Updated Note:", newValue);

        }

        setTimeout(() => {

            document.addEventListener("click", outsideClick);

        }, 0);

        function outsideClick(e) {

            if (!note.contains(e.target)) {

                document.removeEventListener("click", outsideClick);

                finishEditing();

            }

        }

        textarea.addEventListener("keydown", function (e) {

            if (e.key === "Escape") {

                document.removeEventListener("click", outsideClick);

                note.dataset.editing = "false";
                note.textContent = originalText;

            }

            if (e.key === "Enter" && e.ctrlKey) {

                document.removeEventListener("click", outsideClick);

                finishEditing();

            }

        });

    });

});