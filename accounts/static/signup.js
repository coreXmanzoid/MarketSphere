document.addEventListener('DOMContentLoaded', function () {
    const passwordInput = document.getElementById('password');
    const passwordStrength = document.getElementById('password-strength');
    const checkboxbutton = document.getElementById('agreement');

    checkboxbutton.addEventListener('change', function () {
        updateSubmitButton(passwordStrength.value);
    });
    passwordInput.addEventListener('input', function () {
        const password = passwordInput.value;
        let strength = 0;

        // Check for lowercase letters
        if (password.match(/[a-z]/)) {
            strength += 25;
        }

        // Check for minimum 8 characters
        if (password.length >= 8) {
            strength += 25;
        }

        // Check for numbers
        if (password.match(/\d/)) {
            strength += 25;
        }

        // Check for special characters
        if (password.match(/[^A-Za-z0-9]/)) {
            strength += 25;
        }

        // Update the progress bar
        passwordStrength.value = strength;

        updateSubmitButton(strength);
    });

});

function updateSubmitButton(strength) {
    const button = document.getElementsByClassName('signup')[0];

    button.disabled = !(strength === 100 && checkButtonState());
}

function checkButtonState() {
    return document.getElementById("agreement").checked;
}

updateSubmitButton(0);