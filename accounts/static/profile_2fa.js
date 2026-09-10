/* =========================================================
   MARKETSPHERE — TWO-FACTOR AUTHENTICATION PAGE JS
   Shared by profile_2fa_activate.html, profile_2fa_recovery.html
   and profile_2fa_deactivate.html.

   IMPORTANT: this file is purely presentational. It never marks
   2FA as enabled/disabled itself and never fakes success — every
   form here does a real POST to an allauth-backed MarketSphere
   view (ProfileActivateTOTPView / ProfileDeactivateTOTPView) and
   the resulting state always comes back from the server on the
   next page load. There are no fetch()/AJAX calls, matching the
   pattern used in profile.js / seller_account.js for pages that
   still do a full-page submit.
   ========================================================= */

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        initButtonLoadingState();
        initCodeInput();
        initCopySecret();
        initCopyRecoveryCodes();
        initRecoveryAck();
    });

    /* =========================================================
       BUTTON LOADING STATE (shared visual pattern with profile.js)
       ========================================================= */
    function setButtonLoading(btn, isLoading, loadingLabel) {
        if (!btn) return;

        if (isLoading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.classList.add("is-loading");
            btn.innerHTML = '<i class="bi bi-arrow-repeat bp2fa-spin"></i> ' + (loadingLabel || "Please wait...");
        } else {
            btn.classList.remove("is-loading");
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }
        }
    }

    function initButtonLoadingState() {
        const activateForm = document.getElementById("bp2faActivateForm");
        if (activateForm) {
            activateForm.addEventListener("submit", function () {
                setButtonLoading(document.getElementById("bp2faActivateBtn"), true, "Activating...");
            });
        }

        const deactivateForm = document.getElementById("bp2faDeactivateForm");
        if (deactivateForm) {
            deactivateForm.addEventListener("submit", function () {
                setButtonLoading(document.getElementById("bp2faDeactivateBtn"), true, "Deactivating...");
            });
        }
    }

    /* =========================================================
       ACTIVATION — 6-DIGIT CODE INPUT
       Digits-only, auto-strip, gentle formatting. Validation of
       the code itself always happens server-side via allauth's
       ActivateTOTPForm; this is presentation only.
       ========================================================= */
    function initCodeInput() {
        const input = document.querySelector(".bp2fa-code-input");
        if (!input) return;

        input.addEventListener("input", function () {
            const digitsOnly = input.value.replace(/\D/g, "").slice(0, 6);
            if (digitsOnly !== input.value) {
                input.value = digitsOnly;
            }
        });
    }

    /* =========================================================
       ACTIVATION — COPY MANUAL SECRET
       ========================================================= */
    function initCopySecret() {
        const btn = document.getElementById("bp2faCopySecretBtn");
        if (!btn) return;

        btn.addEventListener("click", function () {
            const secret = (btn.dataset.secret || "").trim();
            if (!secret) return;

            copyToClipboard(secret, function () {
                const originalIcon = btn.innerHTML;
                btn.classList.add("is-copied");
                btn.innerHTML = '<i class="bi bi-check-lg"></i>';

                window.setTimeout(function () {
                    btn.classList.remove("is-copied");
                    btn.innerHTML = originalIcon;
                }, 1800);
            });
        });
    }

    /* =========================================================
       RECOVERY CODES — COPY ALL CODES
       ========================================================= */
    function initCopyRecoveryCodes() {
        const btn = document.getElementById("bp2faCopyCodesBtn");
        if (!btn) return;

        btn.addEventListener("click", function () {
            const codes = (btn.dataset.codes || "")
                .split(",")
                .map(function (code) { return code.trim(); })
                .filter(Boolean)
                .join("\n");

            if (!codes) return;

            copyToClipboard(codes, function () {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied';

                window.setTimeout(function () {
                    btn.innerHTML = originalHtml;
                }, 1800);
            });
        });
    }

    function copyToClipboard(text, onSuccess) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
                fallbackCopy(text, onSuccess);
            });
        } else {
            fallbackCopy(text, onSuccess);
        }
    }

    function fallbackCopy(text, onSuccess) {
        const tempInput = document.createElement("textarea");
        tempInput.value = text;
        tempInput.style.position = "fixed";
        tempInput.style.opacity = "0";
        document.body.appendChild(tempInput);
        tempInput.select();

        try {
            document.execCommand("copy");
            if (onSuccess) onSuccess();
        } catch (err) {
            // Silently ignore — copy is a convenience, not a requirement.
        }

        document.body.removeChild(tempInput);
    }

    /* =========================================================
       RECOVERY CODES — "I HAVE SAVED MY CODES" GATES "DONE"
       ========================================================= */
    function initRecoveryAck() {
        const checkbox = document.getElementById("bp2faSavedCheckbox");
        const doneBtn = document.getElementById("bp2faDoneBtn");

        if (!checkbox || !doneBtn) return;

        function syncDoneState() {
            const isReady = checkbox.checked;
            doneBtn.classList.toggle("is-disabled", !isReady);
            doneBtn.setAttribute("aria-disabled", isReady ? "false" : "true");
        }

        checkbox.addEventListener("change", syncDoneState);

        doneBtn.addEventListener("click", function (e) {
            if (!checkbox.checked) {
                e.preventDefault();
            }
        });

        syncDoneState();
    }
})();
