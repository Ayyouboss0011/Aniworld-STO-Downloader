/**
 * queue.js - Download queue management for lankabeltv Web Interface
 */

import API from './api.js';
import { UI, escapeHtml, showNotification } from './ui.js';
import { Trackers } from './trackers.js';

export const Queue = {
    state: {
        progressInterval: null,
        currentQueueIdToCancel: null
    },

    elements: {
        downloadBadge: document.getElementById('download-badge'),
        downloadsView: document.getElementById('downloads-view'),
        downloadsEmptyState: document.getElementById('downloads-empty-state'),
        activeDownloads: document.getElementById('active-downloads'),
        completedDownloads: document.getElementById('completed-downloads'),
        activeQueueList: document.getElementById('active-queue-list'),
        completedQueueList: document.getElementById('completed-queue-list'),
        stopModal: document.getElementById('stop-modal')
    },

    async checkStatus() {
        try {
            const data = await API.getQueueStatus();
            if (data.success && data.queue && (data.queue.active.length > 0 || data.queue.completed.length > 0)) {
                this.startTracking();
            }
        } catch (err) { console.error('Failed to check queue status:', err); }
    },

    startTracking() {
        if (this.state.progressInterval) return;
        this.updateDisplay();
        this.state.progressInterval = setInterval(() => this.updateDisplay(), 3000);
    },

    async updateDisplay() {
        try {
            const data = await API.getQueueStatus();
            if (!data.success) return;
            const active = data.queue.active || [];
            const completed = data.queue.completed || [];
            
            Trackers.updateDisplay();
            
            if (this.elements.downloadBadge) {
                if (active.length > 0) {
                    this.elements.downloadBadge.textContent = active.length;
                    this.elements.downloadBadge.style.display = 'inline-block';
                } else {
                    this.elements.downloadBadge.style.display = 'none';
                }
            }
            
            const isDownloadsVisible = this.elements.downloadsView?.style.display === 'block';
            
            if (active.length === 0 && completed.length === 0) {
                if (this.elements.downloadsEmptyState) this.elements.downloadsEmptyState.style.display = 'block';
                if (this.elements.activeDownloads) this.elements.activeDownloads.style.display = 'none';
                if (this.elements.completedDownloads) this.elements.completedDownloads.style.display = 'none';
                
                if (!isDownloadsVisible && this.state.progressInterval) {
                    clearInterval(this.state.progressInterval);
                    this.state.progressInterval = null;
                }
            } else {
                if (this.elements.downloadsEmptyState) this.elements.downloadsEmptyState.style.display = 'none';
                
                if (active.length > 0) {
                    if (this.elements.activeDownloads) this.elements.activeDownloads.style.display = 'block';
                    this.updateQueueList(this.elements.activeQueueList, active, 'active');
                } else if (this.elements.activeDownloads) {
                    this.elements.activeDownloads.style.display = 'none';
                }
                
                if (completed.length > 0) {
                    if (this.elements.completedDownloads) this.elements.completedDownloads.style.display = 'block';
                    this.updateQueueList(this.elements.completedQueueList, completed, 'completed');
                } else if (this.elements.completedDownloads) {
                    this.elements.completedDownloads.style.display = 'none';
                }
            }
        } catch (err) { console.error('Failed to update queue display:', err); }
    },

    updateQueueList(container, items, type) {
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const qItem = document.createElement('div');
            qItem.className = 'queue-item';
            const prog = Math.min(100, item.progress_percentage || 0);
            const isCompleted = item.status === 'completed' || item.status === 'failed';
            
            qItem.innerHTML = `
                <div class="queue-item-header">
                    <div class="queue-item-title">${escapeHtml(item.anime_title)}</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="queue-item-status ${item.status}">${item.status}</div>
                        ${!isCompleted ? `<button class="stop-download-btn" data-id="${item.id}" title="Stop Download"><i class="fas fa-stop"></i></button>` : ''}
                        ${isCompleted ? `<button class="delete-download-btn" data-id="${item.id}" title="Remove from history"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
                <div class="queue-item-progress">
                    <div class="queue-progress-bar"><div class="queue-progress-fill" style="width: ${prog}%"></div></div>
                    <div class="queue-progress-text">${prog.toFixed(1)}% | ${item.completed_episodes}/${item.total_episodes} eps</div>
                </div>
                <div class="queue-item-details">${escapeHtml(item.current_episode || '')}</div>
            `;

            if (!isCompleted) {
                qItem.querySelector('.stop-download-btn')?.addEventListener('click', () => {
                    this.state.currentQueueIdToCancel = item.id;
                    if (this.elements.stopModal) this.elements.stopModal.style.display = 'flex';
                });
            } else {
                qItem.querySelector('.delete-download-btn')?.addEventListener('click', () => {
                    this.executeDelete(item.id);
                });
            }
            container.appendChild(qItem);
        });
    },

    async executeDelete(queueId) {
        try {
            const data = await API.deleteDownload(queueId);
            if (data.success) {
                this.updateDisplay();
            } else {
                showNotification(data.error || 'Failed to delete download', 'error');
            }
        } catch (err) {
            console.error('Delete error:', err);
            showNotification('Failed to delete download', 'error');
        }
    },

    async executeCancel() {
        if (!this.state.currentQueueIdToCancel) return;
        try {
            const data = await API.cancelDownload(this.state.currentQueueIdToCancel);
            if (data.success) {
                showNotification('Download cancelled', 'success');
                if (this.elements.stopModal) this.elements.stopModal.style.display = 'none';
                this.updateDisplay();
            }
        } catch (err) { console.error('Cancel error:', err); }
    }
};
