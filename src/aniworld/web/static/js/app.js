/**
 * app.js - Main entry point for lankabeltv Web Interface
 */

import API from './api.js';
import { UI, showNotification } from './ui.js';
import { Search } from './search.js';
import { Download } from './download.js';
import { Queue } from './queue.js';
import { Trackers } from './trackers.js';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('lankabeltv Web Interface loaded');

    // Get remaining UI elements not moved to modules
    const versionDisplay = document.getElementById('version-display');
    const tabHome = document.getElementById('tab-home');
    const tabDownloads = document.getElementById('tab-downloads');
    const mainView = document.getElementById('main-view');
    const downloadsView = document.getElementById('downloads-view');
    const themeToggle = document.getElementById('theme-toggle');
    const navTitle = document.getElementById('nav-title');

    // Initialize modules
    UI.initializeTheme();
    await Download.init();
    loadVersionInfo();
    Queue.checkStatus();
    Search.loadPopularAndNewAnime();

    // Event Listeners
    if (tabHome) tabHome.addEventListener('click', () => switchTab('home'));
    if (tabDownloads) tabDownloads.addEventListener('click', () => switchTab('downloads'));
    
    if (Trackers.elements.scanBtn) {
        Trackers.elements.scanBtn.addEventListener('click', () => Trackers.scan());
    }

    if (Search.elements.searchBtn) {
        Search.elements.searchBtn.addEventListener('click', () => Search.performSearch());
    }
    if (Search.elements.searchInput) {
        Search.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') Search.performSearch();
        });
    }

    // Download modal listeners
    document.getElementById('close-download-modal')?.addEventListener('click', () => Download.hideModal());
    document.getElementById('cancel-download')?.addEventListener('click', () => Download.hideModal());
    document.getElementById('confirm-download')?.addEventListener('click', () => Download.startDownload());
    document.getElementById('check-availability-btn')?.addEventListener('click', () => Download.checkAvailability());
    document.getElementById('select-all')?.addEventListener('click', () => Download.selectAll());
    document.getElementById('deselect-all')?.addEventListener('click', () => Download.deselectAll());

    // Stop modal listeners
    document.getElementById('close-stop-modal')?.addEventListener('click', () => { Queue.elements.stopModal.style.display = 'none'; });
    document.getElementById('cancel-stop')?.addEventListener('click', () => { Queue.elements.stopModal.style.display = 'none'; });
    document.getElementById('confirm-stop')?.addEventListener('click', () => Queue.executeCancel());

    if (themeToggle) themeToggle.addEventListener('click', () => UI.toggleTheme());

    if (navTitle) {
        navTitle.addEventListener('click', function() {
            switchTab('home');
            if (Search.elements.searchInput) Search.elements.searchInput.value = '';
            UI.showHomeContent();
            Search.loadPopularAndNewAnime();
        });
    }

    async function loadVersionInfo() {
        try {
            const data = await API.getInfo();
            if (versionDisplay) versionDisplay.textContent = `v${data.version}`;
        } catch (error) {
            console.error('Failed to load version info:', error);
            if (versionDisplay) versionDisplay.textContent = 'v?.?.?';
        }
    }

    function switchTab(tabName) {
        if (tabName === 'home') {
            tabHome?.classList.add('active');
            tabDownloads?.classList.remove('active');
            if (mainView) mainView.style.display = 'block';
            if (downloadsView) downloadsView.style.display = 'none';
        } else {
            tabHome?.classList.remove('active');
            tabDownloads?.classList.add('active');
            if (mainView) mainView.style.display = 'none';
            if (downloadsView) downloadsView.style.display = 'block';
            Queue.startTracking();
            Trackers.updateDisplay();
        }
    }

    // Export showDownloadModal to window so anime cards can call it
    window.showDownloadModal = (title, epTitle, url) => Download.showModal(title, epTitle, url);
});

// Re-export showNotification for legacy use if any (though modules should import it)
window.showNotification = showNotification;
