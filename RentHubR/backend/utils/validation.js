// Password validation helper (server-side enforcement)
const weakPasswords = new Set([
    '123456', 'password', 'admin', '12345678', 'qwerty', 'letmein', 'welcome', 'password1', '12345', 'passw0rd'
]);

function validatePassword(password) {
    const errors = [];
    if (typeof password !== 'string') {
        errors.push('Password must be a string');
        return { valid: false, errors };
    }

    if (password.includes(' ')) {
        errors.push('Password cannot contain spaces');
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter (A-Z)');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter (a-z)');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one digit (0-9)');
    }

    // allowed special characters: ! @ # $ % ^ & * _ - ?
    if (!/[!@#\$%\^&\*_\-\?]/.test(password)) {
        errors.push('Password must include at least one special character (! @ # $ % ^ & * _ - ?)');
    }

    if (weakPasswords.has(password.toLowerCase())) {
        errors.push('This password is too common or weak — please choose a stronger password');
    }

    return { valid: errors.length === 0, errors };
}

module.exports = {
    validatePassword
};
