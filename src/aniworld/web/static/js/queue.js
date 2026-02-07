/**
 * queue.js - Download queue management for Aniworld-STO-Downloader Web Interface
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
        
        // Preserve open states
        const openJobs = Array.from(container.querySelectorAll('.queue-item.open')).map(el => el.dataset.id);

        container.innerHTML = '';
        items.forEach(item => {
            const qItem = document.createElement('div');
            qItem.className = 'queue-item' + (openJobs.includes(item.id.toString()) ? ' open' : '');
            qItem.dataset.id = item.id;
            const prog = Math.min(100, item.progress_percentage || 0);
            const isCompleted = item.status === 'completed' || item.status === 'failed';
            const isMovie = item.is_movie === true;
            
            qItem.innerHTML = `
                <div class="queue-item-header">
                    <div class="queue-item-title-wrapper" style="flex: 1; cursor: pointer;">
                        <i class="fas fa-chevron-right toggle-icon"></i>
                        <span class="queue-item-title">${escapeHtml(item.anime_title)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="queue-item-status ${item.status}">${item.status}</div>
                        ${!isCompleted && isMovie ? `<button class="change-server-btn" data-id="${item.id}" title="Switch to next download server"><i class="fas fa-exchange-alt"></i> Switch Server</button>` : ''}
                        ${!isCompleted ? `<button class="stop-download-btn" data-id="${item.id}" title="Stop Download"><i class="fas fa-stop"></i></button>` : ''}
                        ${isCompleted ? `<button class="delete-download-btn" data-id="${item.id}" title="Remove from history"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
                <div class="queue-item-progress">
                    <div class="queue-progress-bar"><div class="queue-progress-fill" style="width: ${prog}%"></div></div>
                    <div class="queue-progress-text">${prog.toFixed(1)}% | ${item.completed_episodes}/${item.total_episodes} eps</div>
                </div>
                <div class="queue-item-details">${escapeHtml(item.current_episode || '')}</div>
                <div class="queue-item-episodes" id="episodes-${item.id}" style="${openJobs.includes(item.id.toString()) ? 'display: block;' : 'display: none;'}">
                    <div class="loading-spinner-small"></div>
                </div>
            `;

            // Toggle logic
            qItem.querySelector('.queue-item-title-wrapper').addEventListener('click', () => {
                const epDiv = qItem.querySelector('.queue-item-episodes');
                const isNowOpen = qItem.classList.toggle('open');
                epDiv.style.display = isNowOpen ? 'block' : 'none';
                if (isNowOpen) {
                    this.loadJobEpisodes(item.id, epDiv, item.status);
                }
            });

            if (!isCompleted) {
                qItem.querySelector('.change-server-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.executeChangeServer(item.id);
                });
                qItem.querySelector('.stop-download-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation(); // Stop expansion
                    this.state.currentQueueIdToCancel = item.id;
                    if (this.elements.stopModal) this.elements.stopModal.style.display = 'flex';
                });
            } else {
                qItem.querySelector('.delete-download-btn')?.addEventListener('click', () => {
                    this.executeDelete(item.id);
                });
            }
            container.appendChild(qItem);
            
            // Re-load episodes if it was open
            if (openJobs.includes(item.id.toString())) {
                this.loadJobEpisodes(item.id, qItem.querySelector('.queue-item-episodes'), item.status);
            }
        });
    },

    async loadJobEpisodes(queueId, container, jobStatus) {
        try {
            const data = await API.getJobEpisodes(queueId);
            if (!data.success) {
                container.innerHTML = '<div class="error-text">Failed to load episodes</div>';
                return;
            }

            container.innerHTML = '';
            const epList = document.createElement('div');
            epList.className = 'job-episodes-list';
            
            data.episodes.forEach((ep, index) => {
                const epItem = document.createElement('div');
                epItem.className = 'job-episode-item';
                epItem.dataset.url = ep.url;
                const canReorderThis = ep.status === 'queued';
                const isDownloading = ep.status === 'downloading';
                const isFinished = ep.status === 'completed' || ep.status === 'failed' || ep.status === 'cancelled';
                
                epItem.innerHTML = `
                    <div class="ep-info-row">
                        <div class="ep-info">
                            <span class="ep-name">${escapeHtml(ep.name)}</span>
                            ${isDownloading ? `<span class="ep-stats">${escapeHtml(ep.speed || '')} | ${escapeHtml(ep.eta || '')}</span>` : ''}
                        </div>
                        <div class="ep-actions">
                            ${canReorderThis ? `
                                <button class="reorder-btn move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                                <button class="reorder-btn move-down" title="Move Down" ${index === data.episodes.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                            ` : ''}
                            <span class="ep-status-text ${ep.status}">${ep.status}</span>
                            ${!isFinished ? `
                                <button class="ep-stop-btn" title="Stop Episode"><i class="fas fa-times"></i></button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="ep-progress-container">
                        <div class="ep-progress-bar">
                            <div class="ep-progress-fill ${ep.status}" style="width: ${ep.progress}%"></div>
                        </div>
                        <span class="ep-progress-text">${ep.progress.toFixed(1)}%</span>
                    </div>
                `;

                if (canReorderThis) {
                    epItem.querySelector('.move-up')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.moveEpisode(queueId, index, -1, container, jobStatus);
                    });
                    epItem.querySelector('.move-down')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.moveEpisode(queueId, index, 1, container, jobStatus);
                    });
                }
                
                epItem.querySelector('.ep-stop-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.executeStopEpisode(queueId, ep.url, container, jobStatus);
                });

                epList.appendChild(epItem);
            });

            container.appendChild(epList);
        } catch (err) {
            console.error('Failed to load job episodes:', err);
            container.innerHTML = '<div class="error-text">Error loading episodes</div>';
        }
    },

    async moveEpisode(queueId, index, direction, container, jobStatus) {
        try {
            const data = await API.getJobEpisodes(queueId);
            if (!data.success) return;

            const urls = data.episodes.map(ep => ep.url);
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= urls.length) return;

            // Swap
            [urls[index], urls[newIndex]] = [urls[newIndex], urls[index]];

            const res = await API.reorderEpisodes(queueId, urls);
            if (res.success) {
                this.loadJobEpisodes(queueId, container, jobStatus);
            } else {
                showNotification(res.error || 'Failed to reorder episodes', 'error');
            }
        } catch (err) {
            console.error('Move error:', err);
        }
    },

    async executeStopEpisode(queueId, epUrl, container, jobStatus) {
        try {
            const res = await API.stopEpisode(queueId, epUrl);
            if (res.success) {
                showNotification('Episode removed/stopped', 'success');
                this.loadJobEpisodes(queueId, container, jobStatus);
            } else {
                showNotification(res.error || 'Failed to stop episode', 'error');
            }
        } catch (err) {
            console.error('Stop episode error:', err);
        }
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
    },

    async executeChangeServer(queueId) {
        try {
            const data = await API.skipDownloadCandidate(queueId);
            if (data.success) {
                showNotification('Switching to next server...', 'info');
                // Force update immediately
                this.updateDisplay();
            } else {
                showNotification(data.error || 'Failed to switch server', 'error');
            }
        } catch (err) {
            console.error('Change server error:', err);
            showNotification('Failed to switch server', 'error');
        }
    }
};
