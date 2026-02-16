/**
 * ui.js - UI helpers and theme management for LankabelTV Web Interface
 */

export function showNotification(msg, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    n.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; color: white; z-index: 1000; background: ${type === 'success' ? '#48bb78' : (type === 'error' ? '#f56565' : '#4299e1')};`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

export const UI = {
    elements: {
        homeContent: document.getElementById('home-content'),
        emptyState: document.getElementById('empty-state'),
        resultsSection: document.getElementById('results-section'),
        loadingSection: document.getElementById('loading-section'),
        themeIcon: document.getElementById('theme-icon'),
        navTitle: document.getElementById('nav-title')
    },

    showLoadingState() {
        if (this.elements.homeContent) this.elements.homeContent.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';
        if (this.elements.resultsSection) this.elements.resultsSection.style.display = 'none';
        if (this.elements.loadingSection) this.elements.loadingSection.style.display = 'block';
    },

    hideLoadingState() {
        if (this.elements.loadingSection) this.elements.loadingSection.style.display = 'none';
    },

    showResultsSection() {
        if (this.elements.homeContent) this.elements.homeContent.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';
        if (this.elements.loadingSection) this.elements.loadingSection.style.display = 'none';
        if (this.elements.resultsSection) this.elements.resultsSection.style.display = 'block';
    },

    showEmptyState() {
        if (this.elements.homeContent) this.elements.homeContent.style.display = 'none';
        if (this.elements.resultsSection) this.elements.resultsSection.style.display = 'none';
        if (this.elements.loadingSection) this.elements.loadingSection.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'block';
    },

    showHomeContent() {
        if (this.elements.resultsSection) this.elements.resultsSection.style.display = 'none';
        if (this.elements.loadingSection) this.elements.loadingSection.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';
        if (this.elements.homeContent) this.elements.homeContent.style.display = 'block';
    },

    initializeTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        this.setTheme(saved);
    },

    toggleTheme() {
        const curr = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        this.setTheme(curr);
    },

    setTheme(theme) {
        if (theme === 'light') {
            document.body.removeAttribute('data-theme');
            if (this.elements.themeIcon) this.elements.themeIcon.className = 'fas fa-moon';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            if (this.elements.themeIcon) this.elements.themeIcon.className = 'fas fa-sun';
        }
        localStorage.setItem('theme', theme);
    }
};
