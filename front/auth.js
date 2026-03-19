// Authentication logic
/* global loadUserImages */

const authContainer = document.getElementById('authContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize auth on page load
checkAuthStatus();

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
    authContainer.style.display = 'none';
    document.getElementById('uploadContainer').style.display = 'block';
    await loadUserImages();
}

// Toggle between login and register forms
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

// Register handler
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

// Logout handler
logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error',error);
    }
    authContainer.style.display = 'block';
    document.getElementById('uploadContainer').style.display = 'none';
});

// Password validation (called from HTML oninput)
// eslint-disable-next-line no-unused-vars
function val(input) {
    const value = input.value;
    const errors = [];
    if (value.length < 8) {
        errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(value)) {
        errors.push("At least 1 capital letter");
    }
    if (!/[!@#$%^&*()]/.test(value)) {
        errors.push("At least 1 special character");
    }
    const button = document.getElementById('registerbutton');
    const errorEl = document.getElementById("error");
    if (errors.length > 0) {
        input.setCustomValidity(errors.join(", "));
        errorEl.textContent = errors.join(", ");
        button.disabled = true;
    } else {
        input.setCustomValidity("");
        errorEl.textContent = "";
        button.disabled = false;
    }
}
