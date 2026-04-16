const authContainer = document.getElementById('authContainer');
const loginShell = document.getElementById('loginShell');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');
const THEME_STORAGE_KEY = 'ui-theme';

initTheme();

checkAuthStatus();

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);

    if (!themeToggle) {
        return;
    }

    const nextThemeLabel = theme === 'dark' ? 'Light mode' : 'Dark mode';
    themeToggle.textContent = nextThemeLabel;
    themeToggle.setAttribute('aria-label', `Switch to ${nextThemeLabel.toLowerCase()}`);
    themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
}

function resolveInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
    }
    return 'dark';
}

function initTheme() {
    applyTheme(resolveInitialTheme());

    if (!themeToggle) {
        return;
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    });
}

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/checkToken', {
            method: 'GET',
            credentials: 'include'
        });
        if (res.ok) {
            const result = await res.json();
            if (result.success) {
                await showUploadSection();
            }
        }
    } catch {
        // Error checking auth status
    }
}

async function showUploadSection() {
    if (loginShell) {
        loginShell.style.display = 'none';
    } else {
        authContainer.style.display = 'none';
    }
    document.body.classList.add('app-state-upload');
    document.getElementById('uploadContainer').style.display = 'block';
    if (typeof switchTab === 'function') {
        switchTab('test');
    }
    await loadUsersSubs()
    await loadUserImages();
}

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    showRegister.parentElement.style.display = 'none';
    registerForm.style.display = 'block';
    showLogin.parentElement.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    showLogin.parentElement.style.display = 'none';
    loginForm.style.display = 'block';
    showRegister.parentElement.style.display = 'block';
});

// Login handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userName = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userName, password })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            await showUploadSection();
        } else {
            authMessage.textContent = result.message || 'Login failed';
            authMessage.className = 'message error';
        }
    } catch {
        authMessage.textContent = 'Login error';
        authMessage.className = 'message error';
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userName = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('/api/reg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userName, password })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            authMessage.textContent = 'Registered! Please login.';
            authMessage.className = 'message success';
            setTimeout(() => showLogin.click(), 1500);
        } else {
            authMessage.textContent = result.message || 'Registration failed';
            authMessage.className = 'message error';
        }
    } catch {
        authMessage.textContent = 'Registration error';
        authMessage.className = 'message error';
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error',error);
    }
    if (loginShell) {
        loginShell.style.display = 'grid';
    } else {
        authContainer.style.display = 'block';
    }
    document.body.classList.remove('app-state-upload');
    document.getElementById('uploadContainer').style.display = 'none';
});

function validateForm() {
    const usernameInput = document.getElementById('regUsername');
    const passwordInput = document.getElementById('regPassword');
    const username = usernameInput.value;
    const password = passwordInput.value;
    const errors = [];

    if (username.length < 4 && username.length > 0) {
        errors.push("Username: At least 4 characters");
    }
    if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push("Username: Only letters, numbers, underscore, and hyphen allowed");
    }

    if (password.length < 8 && password.length > 0) {
        errors.push("Password: At least 8 characters");
    }
    if (password && !/[A-Z]/.test(password)) {
        errors.push("Password: At least 1 capital letter");
    }
    if (password && !/[!@#$%^&*()]/.test(password)) {
        errors.push("Password: At least 1 special character");
    }

    const button = document.getElementById('registerbutton');
    const errorEl = document.getElementById('error');

    if (errors.length > 0) {
        usernameInput.setCustomValidity(errors.join(", "));
        passwordInput.setCustomValidity(errors.join(", "));
        errorEl.textContent = errors.join(", ");
        button.disabled = true;
    } else if (username || password) {
        usernameInput.setCustomValidity("");
        passwordInput.setCustomValidity("");
        errorEl.textContent = "";
        button.disabled = false;
    } else {
        button.disabled = true;
        errorEl.textContent = "";
    }
}

function val(input) {
    validateForm();
}
