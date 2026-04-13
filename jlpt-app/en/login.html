// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Determine language-aware redirect target
    // login_id.html / login_en.html set window.__loginSuccessTarget before this script loads
    const successTarget = window.__loginSuccessTarget || 'dashboard.html';

    // If user is already logged in, send to the correct dashboard
    const localUserStr = localStorage.getItem('omoshiroi_user');
    const sessionUserStr = sessionStorage.getItem('omoshiroi_user');
    
    let hasValidSession = false;
    if (localUserStr) {
        const parsed = JSON.parse(localUserStr);
        if (parsed.remember) hasValidSession = true;
    } else if (sessionUserStr) {
        hasValidSession = true;
    }

    if (hasValidSession) {
        window.location.href = successTarget;
        return;
    }

    // Toggle Password Visibility
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('password');
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Toggle icon content
            togglePasswordBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value.trim();

            if (!usernameInput) return;

            try {
                // Try parent-relative path first (works from en/ and id/ subfolders)
                let response;
                try {
                    response = await fetch('../data/users.json');
                    if (!response.ok) throw new Error('not found');
                } catch(_) {
                    response = await fetch('data/users.json');
                }
                const users = await response.json();
                const matchedUser = users.find(u =>
                    u.name.toLowerCase() === usernameInput.toLowerCase() &&
                    u.password === passwordInput
                );

                if (matchedUser) {
                    createSession(matchedUser.name, matchedUser.role || 'guest');
                } else {
                    loginError.classList.remove('hidden');
                    const lang = localStorage.getItem('lang') || 'id';
                    loginError.textContent = lang === 'id'
                        ? 'Akun tidak ditemukan. Silakan periksa kredensial Anda.'
                        : 'Account not found. Please review your credentials.';
                }
            } catch (error) {
                console.error('Error fetching users.json:', error);
                loginError.classList.remove('hidden');
                loginError.textContent = 'System Error: Cannot validate login.';
            }
        });
    }

    function createSession(name, role) {
        const rememberMeCb = document.getElementById('rememberMe');
        const rememberMe = rememberMeCb ? rememberMeCb.checked : false;

        const sessionData = {
            name: name,
            role: role,
            loginTime: new Date().getTime(),
            password: (document.getElementById('password').value || '').trim()
        };

        const storagePayload = JSON.stringify({ user: sessionData, remember: rememberMe });

        if (rememberMe) {
            localStorage.setItem('omoshiroi_user', storagePayload);
        } else {
            sessionStorage.setItem('omoshiroi_user', storagePayload);
        }

        window.location.href = successTarget;
    }
});
