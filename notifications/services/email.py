from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_marketplace_email(
    *,
    subject,
    recipient,
    template,
    context=None,
    text_template=None,
    sender=None,
    reply_to=None,
):
    if not recipient:
        return False

    context = context or {}
    sender = sender or settings.DEFAULT_FROM_EMAIL

    html_content = render_to_string(
        template,
        context,
    )

    if text_template:
        text_content = render_to_string(
            text_template,
            context,
        )
    else:
        text_content = ""

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=sender,
        to=[recipient],
        reply_to=[reply_to] if reply_to else None,
    )

    email.attach_alternative(
        html_content,
        "text/html",
    )

    return email.send() > 0
