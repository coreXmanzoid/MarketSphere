from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

User = get_user_model()


def validate_identifier(identifier):
    """
    Returns True if the identifier is a valid email,
    otherwise returns False (treated as a username).
    """
    try:
        validate_email(identifier)
        return True
    except ValidationError:
        return False

def validate_user_email(user_email):
    user = User.objects.filter(email = user_email).exists()
    if user:
        return False
    return True

def validate_username(user_username):
    user = User.objects.filter(username = user_username).exists()
    if user:
        return False
    return True

import re

def validate_password(user_password):
    if len(user_password) < 8:
        return False

    if not re.search(r"[a-z]", user_password):
        return False

    if not re.search(r"\d", user_password):
        return False

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=/\\[\];'`~]", user_password):
        return False

    return True

def validate_account_status(user):
    """
    Returns:
        (True, "") if the user is allowed to log in.
        (False, message) otherwise.
    """

    if user.account_status == user.AccountStatus.VERIFIED:
        return True, ""

    if user.account_status == user.AccountStatus.UNVERIFIED:
        return True, "Please Verify Your Account."

    if user.account_status == user.AccountStatus.SUSPENDED:
        return False, "Your account has been suspended. Please contact support."

    if user.account_status == user.AccountStatus.DEACTIVATED:
        return False, "Your account has been deactivated."

    if user.account_status == user.AccountStatus.BLOCKED:
        return False, "Your account has been blocked. Please contact support."

    return False, "Invalid account status."

