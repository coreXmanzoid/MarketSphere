from allauth.account.signals import email_confirmed
from django.dispatch import receiver


@receiver(email_confirmed)
def mark_user_verified(sender, request, email_address, **kwargs):
    user = email_address.user

    if user.account_status != user.AccountStatus.UNVERIFIED:
        return

    user.account_status = user.AccountStatus.VERIFIED
    user.save(update_fields=["account_status"])
