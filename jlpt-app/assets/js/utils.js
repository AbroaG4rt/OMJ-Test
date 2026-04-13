// assets/js/utils.js
// Shared utilities for Omoshiroi Japan App

window.OmoshiroiUtils = {
    getUser: function() {
        const user = localStorage.getItem('omoshiroi_user');
        return user ? JSON.parse(user) : null;
    },
    
    saveResult: function(user, result) {
        if (!user || !user.name) return;
        const key = `test_history_${user.name}`;
        const history = JSON.parse(localStorage.getItem(key)) || [];
        history.push(result);
        localStorage.setItem(key, JSON.stringify(history));
    },

    getUserHistory: function(user) {
        if (!user || !user.name) return [];
        const key = `test_history_${user.name}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    },

    logout: function() {
        // Clear session only. Do not delete history.
        localStorage.removeItem('omoshiroi_user');
        window.location.href = 'login.html';
    },

    formatTime: function(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    requireAuth: function() {
        if (!this.getUser()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    checkAccess: function(level) {
        const user = this.getUser();
        
        // Guest (not logged in or explicitly has 'guest' role like the demo account)
        if (!user || user.role === "guest") {
            return level === "N5";
        }

        // Premium Role (Logged-in valid users)
        if (user.role === "premium") {
            return true;
        }

        return false;
    }
};

// Global Security Settings
document.addEventListener('contextmenu', event => event.preventDefault()); // Disable right click
