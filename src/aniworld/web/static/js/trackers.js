/**
 * trackers.js - Series tracker management for lankabeltv Web Interface
 */

import API from './api.js';
import { escapeHtml, showNotification } from './ui.js';

export const Trackers = {
    elements: {
        trackersSection: document.getElementById('trackers-section'),
        trackersList: document.getElementById('trackers-list'),
        scanBtn: document.getElementById('scan-trackers-btn')
    },

    async scan() {
        if (!this.elements.scanBtn) return;
        this.elements.scanBtn.disabled = true;
        const originalText = this.elements.scanBtn.innerHTML;
        this.elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        
        try {
            const data = await API.scanTrackers();
            if (data.success) {
                showNotification('Tracker scan started', 'success');
            } else {
                showNotification(data.error || 'Failed to start scan', 'error');
            }
        } catch (err) {
            console.error('Scan error:', err);
            showNotification('Failed to start scan', 'error');
        } finally {
            setTimeout(() => {
                this.elements.scanBtn.disabled = false;
                this.elements.scanBtn.innerHTML = originalText;
            }, 2000);
        }
    },

    async updateDisplay() {
        if (!this.elements.trackersSection) return;
        try {
            const data = await API.getTrackers();
            if (data.success && data.trackers && data.trackers.length > 0) {
                this.elements.trackersSection.style.display = 'block';
                this.render(data.trackers);
            } else {
                this.elements.trackersSection.style.display = 'block';
                if (this.elements.trackersList) {
                    this.elements.trackersList.innerHTML = '<div class="empty-state-small" style="grid-column: 1/-1; text-align: center; padding: 20px; opacity: 0.6;"><p>No active trackers</p></div>';
                }
            }
        } catch (error) {
            console.error('Error loading trackers:', error);
            this.elements.trackersSection.style.display = 'none';
        }
    },

    render(trackers) {
        if (!this.elements.trackersList) return;
        this.elements.trackersList.innerHTML = '';
        trackers.forEach(t => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.innerHTML = `
                <div class="queue-item-header">
                    <div class="queue-item-title">${escapeHtml(t.anime_title)}</div>
                    <button class="delete-tracker-btn" data-id="${t.id}" title="Remove Tracker" style="background: none; border: none; color: #f56565; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="queue-item-details">
                    Tracking: ${escapeHtml(t.language)} via ${escapeHtml(t.provider)}<br>
                    Last seen: S${t.last_season} E${t.last_episode}
                </div>
            `;
            item.querySelector('.delete-tracker-btn').addEventListener('click', async () => {
                if (confirm('Remove tracker?')) {
                    try {
                        const data = await API.deleteTracker(t.id);
                        if (data.success) this.updateDisplay();
                    } catch (err) { console.error('Delete tracker error:', err); }
                }
            });
            this.elements.trackersList.appendChild(item);
        });
    },

    async addTrackerForSeries(currentDownloadData, availableEpisodes, language, provider) {
        if (!currentDownloadData) return false;
        
        let maxS = 0, maxE = 0;
        const seasonNums = Object.keys(availableEpisodes).map(Number).sort((a, b) => b - a);
        if (seasonNums.length > 0) {
            maxS = seasonNums[0];
            const episodes = availableEpisodes[maxS];
            if (episodes && episodes.length > 0) {
                maxE = Math.max(...episodes.map(ep => ep.episode));
            }
        }

        try {
            const data = await API.addTracker({
                anime_title: currentDownloadData.anime,
                series_url: currentDownloadData.url,
                language: language,
                provider: provider,
                last_season: maxS,
                last_episode: maxE
            });
            if (data.success) {
                showNotification('Tracker added successfully', 'success');
                this.updateDisplay();
                return true;
            } else {
                showNotification(data.error || 'Failed to add tracker', 'error');
                return false;
            }
        } catch (err) {
            console.error('Tracker error:', err);
            showNotification('Failed to add tracker', 'error');
            return false;
        }
    }
};
