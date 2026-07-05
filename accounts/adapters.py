import uuid

from django.contrib.auth import get_user_model
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

User = get_user_model()


class MySocialAccountAdapter(DefaultSocialAccountAdapter):

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)

        extra_data = sociallogin.account.extra_data

        user.first_name = extra_data.get("given_name", "")
        user.last_name = extra_data.get("family_name", "")
        user.email = extra_data.get("email", "")
        user.profile_image_url = extra_data.get("picture", None)


        if extra_data.get("email_verified", False):
            user.account_status = User.AccountStatus.VERIFIED

        if not user.username:
            base_username = user.email.split("@")[0]

            username = base_username

            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{uuid.uuid4().hex[:4]}"

            user.username = username.lower()

        return user

    def pre_social_login(self, request, sociallogin):
        print("Google login detected")

        extra_data = sociallogin.account.extra_data

        user = sociallogin.user

        if user.pk:  # Existing user
            user.first_name = extra_data.get("given_name", user.first_name)
            user.last_name = extra_data.get("family_name", user.last_name)

            picture = extra_data.get("picture")
            if picture:
                user.profile_image_url = picture

            user.save(update_fields=[
                "first_name",
                "last_name",
                "profile_image_url",
            ])