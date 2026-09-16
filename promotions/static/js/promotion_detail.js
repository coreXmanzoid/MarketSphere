/* =========================================================
   MARKETSPHERE — PROMOTION / SALE LANDING PAGE
   Vanilla JS only. No AJAX, no product/filter/pagination
   rendering here — all of that is server-rendered by Django
   (see promotion_detail.html / products/views.py). This file
   only handles small progressive-enhancement behaviors:
     1. Countdown timer (works for either a start date or an
        end date — whichever data-target the hero renders).
     2. "Get Reminders" button feedback for upcoming promotions.
   Reuses the global showToast() helper from static/js/scripts.js
   instead of building a second toast system.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    /* ================= COUNTDOWN ================= */
    const countdownEl = document.getElementById('promodCountdown');

    if (countdownEl && countdownEl.dataset.target) {
        const targetDate = new Date(countdownEl.dataset.target);

        const daysEl = countdownEl.querySelector('[data-unit="days"]');
        const hoursEl = countdownEl.querySelector('[data-unit="hours"]');
        const minutesEl = countdownEl.querySelector('[data-unit="minutes"]');
        const secondsEl = countdownEl.querySelector('[data-unit="seconds"]');

        function pad(value) {
            return String(value).padStart(2, '0');
        }

        let timerId = null;

        function updateCountdown() {
            const now = new Date();
            const diffMs = targetDate.getTime() - now.getTime();

            if (isNaN(targetDate.getTime()) || diffMs <= 0) {
                countdownEl.classList.add('is-finished');
                if (timerId) {
                    window.clearInterval(timerId);
                }
                return;
            }

            const totalSeconds = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (daysEl) daysEl.textContent = pad(days);
            if (hoursEl) hoursEl.textContent = pad(hours);
            if (minutesEl) minutesEl.textContent = pad(minutes);
            if (secondsEl) secondsEl.textContent = pad(seconds);
        }

        updateCountdown();
        timerId = window.setInterval(updateCountdown, 1000);
    }

    /* ================= REMIND ME (upcoming promotions) ================= */
    const remindBtn = document.getElementById('promodRemindBtn');

    if (remindBtn) {
        remindBtn.addEventListener('click', function () {
            if (typeof window.showToast === 'function') {
                window.showToast("We'll let you know when this sale goes live.", 'success');
            }

            remindBtn.disabled = true;
            remindBtn.innerHTML = '<i class="bi bi-check2"></i> Reminder Set';
        });
    }
});
