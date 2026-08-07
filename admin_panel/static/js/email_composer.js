/**
 * MarketSphere Admin - Email Composer Module
 * Production-ready Vanilla JavaScript
 */
function initEmailComposer() {
    // Templates object
    const templates = {
        custom: {
            subject: '',
            message: ''
        },
        welcome: {
            subject: 'Welcome to MarketSphere! Get Started Today',
            message: 'Hello,\n\nWelcome to MarketSphere! We are thrilled to have you on board. Your account has been successfully created and you can now explore our marketplace and features.\n\nIf you have any questions or need assistance, feel free to reach out to our support team.\n\nBest regards,\nThe MarketSphere Team'
        },
        account_verified: {
            subject: 'Your MarketSphere Account Has Been Verified',
            message: 'Hello,\n\nWe are pleased to inform you that your MarketSphere account has been successfully verified. You now have full access to all user features and services.\n\nThank you for verifying your identity with us.\n\nBest regards,\nThe MarketSphere Team'
        },
        account_suspended: {
            subject: 'Important Notice Regarding Your MarketSphere Account',
            message: 'Hello,\n\nWe are writing to inform you that your MarketSphere account has been temporarily suspended due to a violation of our terms of service or suspicious activity.\n\nIf you believe this is an error or wish to appeal this decision, please contact our support team immediately.\n\nBest regards,\nThe MarketSphere Team'
        },
        account_reactivated: {
            subject: 'Your MarketSphere Account Has Been Reactivated',
            message: 'Hello,\n\nGood news! Your MarketSphere account has been successfully reactivated. You can now log back in and resume your activities on our platform.\n\nThank you for your patience.\n\nBest regards,\nThe MarketSphere Team'
        },
        password_reset: {
            subject: 'Password Reset Instructions for Your MarketSphere Account',
            message: 'Hello,\n\nWe received a request to reset the password for your MarketSphere account. If you did not request this, please ignore this email.\n\nTo reset your password, please follow the instructions on the platform or contact support if you need assistance.\n\nBest regards,\nThe MarketSphere Team'
        },
        order_support: {
            subject: 'Update Regarding Your Recent MarketSphere Order / Support Request',
            message: 'Hello,\n\nWe are following up regarding your recent support request or order on MarketSphere. Our team is actively looking into your case to ensure a prompt resolution.\n\nWe will update you as soon as more information becomes available.\n\nBest regards,\nMarketSphere Support Team'
        },
        general_announcement: {
            subject: 'Important Announcement from MarketSphere',
            message: 'Hello,\n\nWe have an important update regarding the MarketSphere platform and services. We are constantly working to improve your experience.\n\nPlease read through our latest updates on the platform to learn more about new features and enhancements.\n\nBest regards,\nThe MarketSphere Team'
        }
    };

    // State management for attachments
    let attachments = [];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    // DOM Elements
    const backdrop = document.getElementById('ecBackdrop');
    const modalRoot = document.getElementById('ecModalRoot');
    const closeBtn = document.getElementById('ecCloseBtn');
    const cancelBtn = document.getElementById('ecCancelBtn');

    // Recipient elements
    const recipientAvatar = document.getElementById('ecRecipientAvatar');
    const recipientName = document.getElementById('ecRecipientName');
    const recipientEmail = document.getElementById('ecRecipientEmail');
    const recipientStatus = document.getElementById('ecRecipientStatus');

    // Form elements
    const templateSelect = document.getElementById('ecTemplateSelect');
    const subjectInput = document.getElementById('ecSubjectInput');
    const subjectCounter = document.getElementById('ecSubjectCounter');
    const subjectError = document.getElementById('ecSubjectError');
    const messageInput = document.getElementById('ecMessageInput');
    const messageCounter = document.getElementById('ecMessageCounter');
    const messageError = document.getElementById('ecMessageError');

    // Upload elements
    const uploadZone = document.getElementById('ecUploadZone');
    const fileInput = document.getElementById('ecFileInput');
    const attachmentList = document.getElementById('ecAttachmentList');
    const attachmentEmpty = document.getElementById('ecAttachmentEmpty');

    // Footer buttons
    const previewBtn = document.getElementById('ecPreviewBtn');
    const sendBtn = document.getElementById('ecSendBtn');

    // Preview Modal elements
    const previewModal = document.getElementById('ecPreviewModal');
    const previewCloseBtn = document.getElementById('ecPreviewCloseBtn');
    const previewBackBtn = document.getElementById('ecPreviewBackBtn');
    const previewSendBtn = document.getElementById('ecPreviewSendBtn');
    const previewTo = document.getElementById('ecPreviewTo');
    const previewSubject = document.getElementById('ecPreviewSubject');
    const previewMessage = document.getElementById('ecPreviewMessage');
    const previewAttachmentsSection = document.getElementById('ecPreviewAttachments');
    const previewAttachmentList = document.getElementById('ecPreviewAttachmentList');

    let currentUserId = null;
    // Open Modal
    function openModal(triggerEl = null) {

        if (!backdrop || !modalRoot) return;

        if (triggerEl) {
            const name = triggerEl.getAttribute('data-user-name') || 'User Name';
            const email = triggerEl.getAttribute('data-user-email') || 'user@example.com';
            const avatar = triggerEl.getAttribute('data-user-avatar') || '';
            const status = triggerEl.getAttribute('data-user-status') || 'Active';
            const initial = triggerEl.getAttribute('data-user-initial') || name.charAt(0).toUpperCase();
            currentUserId = triggerEl.dataset.userId;
            if (recipientName) recipientName.textContent = name;
            if (recipientEmail) recipientEmail.textContent = email;
            if (recipientStatus) recipientStatus.textContent = status;
            if (recipientAvatar) {
                if (avatar) {
                    recipientAvatar.style.backgroundImage = `url(${avatar})`;
                    recipientAvatar.textContent = '';
                } else {
                    recipientAvatar.style.backgroundImage = '';
                    recipientAvatar.textContent = initial;
                }
            }
        }

        backdrop.hidden = false;

        // Force a reflow so the transition runs
        requestAnimationFrame(() => {
            backdrop.classList.add('is-open');
            modalRoot.classList.add('is-active');
        });

        document.body.style.overflow = 'hidden';
        modalRoot.focus();
    }

    // Close Modals
    function closeModal() {

        backdrop.classList.remove('is-open');
        modalRoot.classList.remove('is-active');

        setTimeout(() => {
            backdrop.hidden = true;
        }, 250); // Match your CSS transition duration

        document.body.style.overflow = '';
    }

    function closePreviewModal() {

        previewModal.classList.remove("is-active");

        setTimeout(() => {

            previewModal.hidden = true;

            modalRoot.hidden = false;

            requestAnimationFrame(() => {
                modalRoot.classList.add("is-active");
            });

            modalRoot.focus();

        }, 200);
    }

    // Reset Form
    function resetForm() {
        if (templateSelect) templateSelect.value = 'custom';
        if (subjectInput) {
            subjectInput.value = '';
            subjectInput.classList.remove('ec-error');
        }
        if (subjectCounter) subjectCounter.textContent = '0 / 150';
        if (subjectError) subjectError.textContent = '';

        if (messageInput) {
            messageInput.value = '';
            messageInput.classList.remove('ec-error');
        }
        if (messageCounter) messageCounter.textContent = '0 characters';
        if (messageError) messageError.textContent = '';

        attachments = [];
        renderAttachments();
        restoreSendButtons();
    }

    // Restore Send Buttons state
    function restoreSendButtons() {
        [sendBtn, previewSendBtn].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                const label = btn.querySelector('.ec-btn-label');
                if (label) label.style.opacity = '1';
                const spinner = btn.querySelector('.ec-spinner');
                if (spinner) spinner.remove();
            }
        });
    }
    function getCSRFToken() {

        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {

            cookie = cookie.trim();

            if (cookie.startsWith("csrftoken=")) {
                return decodeURIComponent(cookie.substring("csrftoken=".length));
            }

        }

        return "";

    }

    // Character counters & validation updates
    function updateSubjectCounter() {
        if (!subjectInput || !subjectCounter) return;
        const len = subjectInput.value.length;
        subjectCounter.textContent = `${len} / 150`;
        if (subjectInput.value.trim() !== '') {
            subjectInput.classList.remove('ec-error');
            if (subjectError) subjectError.textContent = '';
        }
    }

    function updateMessageCounter() {
        if (!messageInput || !messageCounter) return;
        const len = messageInput.value.length;
        messageCounter.textContent = `${len} characters`;
        if (messageInput.value.trim() !== '') {
            messageInput.classList.remove('ec-error');
            if (messageError) messageError.textContent = '';
        }
    }

    // Template selection handling
    if (templateSelect) {
        templateSelect.addEventListener('change', () => {
            const selectedKey = templateSelect.value;
            const tpl = templates[selectedKey];
            if (tpl) {
                if (subjectInput) {
                    subjectInput.value = tpl.subject;
                    updateSubjectCounter();
                }
                if (messageInput) {
                    messageInput.value = tpl.message;
                    updateMessageCounter();
                }
            }
        });
    }

    if (subjectInput) {
        subjectInput.addEventListener('input', updateSubjectCounter);
    }

    if (messageInput) {
        messageInput.addEventListener('input', updateMessageCounter);
    }

    // Attachments handling
    function addFiles(files) {
        Array.from(files).forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                showToast(`File "${file.name}" exceeds the 10 MB size limit.`, 'error');
                return;
            }
            attachments.push(file);
        });
        renderAttachments();
    }

    function removeAttachment(index) {
        attachments.splice(index, 1);
        renderAttachments();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function renderAttachments() {
        if (!attachmentList || !attachmentEmpty) return;
        attachmentList.innerHTML = '';

        if (attachments.length === 0) {
            attachmentEmpty.hidden = false;
            attachmentList.hidden = true;
            return;
        }

        attachmentEmpty.hidden = true;
        attachmentList.hidden = false;

        attachments.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'ec-attachment-item';
            li.innerHTML = `
                <div class="ec-attachment-info-wrap">
                    <svg class="ec-file-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span class="ec-attachment-name">${file.name}</span>
                    <span class="ec-attachment-size">(${formatFileSize(file.size)})</span>
                </div>
                <button type="button" class="ec-attachment-remove" data-index="${index}" aria-label="Remove attachment">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;

            const removeBtn = li.querySelector('.ec-attachment-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => removeAttachment(index));
            }
            attachmentList.appendChild(li);
        });
    }

    // Upload Zone interactions
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files) {
                addFiles(e.target.files);
                fileInput.value = '';
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadZone.classList.add('ec-dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadZone.classList.remove('ec-dragover');
            }, false);
        });

        uploadZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                addFiles(files);
            }
        });
    }

    // Validation check before preview or send
    function validateForm() {
        let isValid = true;
        const subjectVal = subjectInput ? subjectInput.value.trim() : '';
        const messageVal = messageInput ? messageInput.value.trim() : '';
        if (!subjectVal) {
            isValid = false;
            if (subjectInput) subjectInput.classList.add('ec-error');
            if (subjectError) subjectError.textContent = 'Subject is required.';
        } else {
            if (subjectInput) subjectInput.classList.remove('ec-error');
            if (subjectError) subjectError.textContent = '';
        }

        if (!messageVal) {
            isValid = false;
            if (messageInput) messageInput.classList.add('ec-error');
            if (messageError) messageError.textContent = 'Message is required.';
        } else {
            if (messageInput) messageInput.classList.remove('ec-error');
            if (messageError) messageError.textContent = '';
        }

        return isValid;
    }

    // Preview Modal Functionality
    function openPreviewModal() {
        if (!validateForm()) return;

        if (previewTo && recipientEmail) {
            previewTo.textContent = recipientEmail.textContent;
        }

        if (previewSubject && subjectInput) {
            previewSubject.textContent = subjectInput.value;
        }

        if (previewMessage && messageInput) {
            previewMessage.innerHTML = messageInput.value.replace(/\n/g, "<br>");
        }

        if (previewAttachmentsSection && previewAttachmentList) {
            if (attachments.length > 0) {
                previewAttachmentsSection.hidden = false;
                previewAttachmentList.innerHTML = "";

                attachments.forEach(file => {
                    const li = document.createElement("li");
                    li.textContent = `${file.name} (${formatFileSize(file.size)})`;
                    previewAttachmentList.appendChild(li);
                });

            } else {
                previewAttachmentsSection.hidden = true;
            }
        }

        // Hide composer
        // modalRoot.hidden = true;
        // modalRoot.classList.remove("is-active");

        // Show preview
        previewModal.hidden = false;

        requestAnimationFrame(() => {
            previewModal.classList.add("is-active");
        });

        previewModal.focus();
    }

    if (previewBtn) {
        previewBtn.addEventListener('click', openPreviewModal);
    }

    if (previewCloseBtn) {
        previewCloseBtn.addEventListener('click', closeModal);
    }

    if (previewBackBtn) {
        previewBackBtn.addEventListener('click', closePreviewModal);
    }
    async function handleSend() {
        if (!validateForm()) {
            return;
        }
        [sendBtn, previewSendBtn].forEach(btn => {

            if (!btn) return;

            btn.disabled = true;

            const label = btn.querySelector(".ec-btn-label");

            if (label) {
                label.style.opacity = "0.7";

                if (!btn.querySelector(".ec-spinner")) {

                    const spinner = document.createElement("span");

                    spinner.className = "ec-spinner";

                    spinner.style.cssText = `
                    display:inline-block;
                    width:14px;
                    height:14px;
                    border:2px solid rgba(255,255,255,.3);
                    border-radius:50%;
                    border-top-color:#fff;
                    animation:ec-spin .6s linear infinite;
                    margin-right:6px;
                    vertical-align:middle;
                `;

                    label.prepend(spinner);
                }
            }

        });

        try {

            const formData = new FormData();

            formData.append(
                "subject",
                subjectInput.value.trim()
            );

            formData.append(
                "message",
                messageInput.value.trim()
            );

            // if (buttonTextInput) {
            //     formData.append(
            //         "buttonText",
            //         buttonTextInput.value.trim()
            //     );
            // }

            // if (buttonUrlInput) {
            //     formData.append(
            //         "buttonUrl",
            //         buttonUrlInput.value.trim()
            //     );
            // }

            attachments.forEach(file => {
                formData.append("attachments", file);
            });

            const response = await fetch(`/admin-db/user/${currentUserId}/send-email/`, {
                method: "POST",

                headers: {
                    "X-CSRFToken": getCSRFToken(),
                },

                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to send email."
                );
            }

            showToast(
                data.message,
                "success"
            );

            resetForm();

            closeModal();

        }

        catch (error) {

            console.error(error);

            showToast(
                error.message,
                "error"
            );

        }

        finally {

            [sendBtn, previewSendBtn].forEach(btn => {

                if (!btn) return;

                btn.disabled = false;

                const label = btn.querySelector(".ec-btn-label");

                if (label) {

                    label.style.opacity = "";

                    const spinner =
                        btn.querySelector(".ec-spinner");

                    if (spinner) {
                        spinner.remove();
                    }

                }

            });

        }

    }
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSend);
    }

    if (previewSendBtn) {
        previewSendBtn.addEventListener('click', handleSend);
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) closeBtn.addEventListener('click', closeModal);

    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (previewModal && !previewModal.hidden) {
                closePreviewModal();
            } else if (modalRoot && !modalRoot.hidden) {
                closeModal();
            }
        }
    });
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-ec-open]');
        if (trigger) {
            e.preventDefault();
            openModal(trigger);
        }
    });

    if (!document.getElementById('ecSpinnerKeyframes')) {
        const style = document.createElement('style');
        style.id = 'ecSpinnerKeyframes';
        style.textContent = '@keyframes ec-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmailComposer);
} else {
    initEmailComposer();
}