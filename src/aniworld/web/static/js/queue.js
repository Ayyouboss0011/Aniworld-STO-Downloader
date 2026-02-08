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
        this.state.progressInterval = setInterval(() => this.updateDisplay(), 1000);
    },

    async updateDisplay() {
        try {
            const data = await API.getQueueStatus();
            if (!data.success) return;
            const active = data.queue.active || [];
            const completed = data.queue.completed || [];
            
            if (active.length > 0) {
                console.groupCollapsed(`Download Status Update [${new Date().toLocaleTimeString()}]`);
                active.forEach(job => {
                    console.log(`Job: ${job.anime_title}, Status: ${job.status}, Overall: ${job.progress_percentage}%`);
                    console.log(`Current Ep: ${job.current_episode}, Ep Progress: ${job.current_episode_progress}%`);
                });
                console.groupEnd();
            }

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
                    
                    // Force a layout refresh for progress fills
                    active.forEach(item => {
                        const fill = document.querySelector(`.queue-item[data-id="${item.id}"] .queue-progress-fill`);
                        if (fill) fill.style.display = 'none';
                        if (fill) fill.offsetHeight; // trigger reflow
                        if (fill) fill.style.display = 'block';
                    });
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
        
        const currentIds = items.map(item => item.id.toString());
        Array.from(container.querySelectorAll('.queue-item')).forEach(el => {
            if (!currentIds.includes(el.dataset.id)) el.remove();
        });

        items.forEach(item => {
            let qItem = container.querySelector(`.queue-item[data-id="${item.id}"]`);
            const isNew = !qItem;
            
            if (isNew) {
                qItem = document.createElement('div');
                qItem.className = 'queue-item';
                qItem.dataset.id = item.id;
                container.appendChild(qItem);
            }

            const rawProg = item.progress_percentage;
            const prog = Math.max(0, Math.min(100, parseFloat(rawProg || 0)));
            const isCompleted = item.status === 'completed' || item.status === 'failed';
            const isMovie = item.is_movie === true;
            const statusChanged = qItem.querySelector('.queue-item-status')?.textContent !== item.status;
            
            if (isNew || statusChanged) {
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
                        <div class="queue-progress-bar" style="height: 14px; background: #2d3748; border-radius: 7px; border: 1px solid #4a5568; overflow: hidden; position: relative; display: block; flex: 1;">
                            <div class="queue-progress-fill" style="width: ${prog.toFixed(1)}% !important; height: 100%; background: #48bb78 !important; border-radius: 7px; display: block !important;"></div>
                        </div>
                        <div class="queue-progress-text">${prog.toFixed(1)}% | ${item.completed_episodes}/${item.total_episodes} eps</div>
                    </div>
                    <div class="queue-item-details">${escapeHtml(item.current_episode || '')}</div>
                    <div class="queue-item-episodes" id="episodes-${item.id}" style="display: none;">
                        <div class="loading-spinner-small"></div>
                    </div>
                `;

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
                        e.stopPropagation();
                        this.state.currentQueueIdToCancel = item.id;
                        if (this.elements.stopModal) this.elements.stopModal.style.display = 'flex';
                    });
                } else {
                    qItem.querySelector('.delete-download-btn')?.addEventListener('click', () => {
                        this.executeDelete(item.id);
                    });
                }
            } else {
                const fill = qItem.querySelector('.queue-progress-fill');
                if (fill) fill.style.setProperty('width', `${prog.toFixed(1)}%`, 'important');
                
                const text = qItem.querySelector('.queue-progress-text');
                if (text) text.textContent = `${prog.toFixed(1)}% | ${item.completed_episodes}/${item.total_episodes} eps`;
                
                const details = qItem.querySelector('.queue-item-details');
                if (details) details.textContent = item.current_episode || '';
                
                if (qItem.classList.contains('open')) {
                    this.loadJobEpisodes(item.id, qItem.querySelector('.queue-item-episodes'), item.status);
                }
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

            let epList = container.querySelector('.job-episodes-list');
            if (!epList) {
                container.innerHTML = '';
                epList = document.createElement('div');
                epList.className = 'job-episodes-list';
                container.appendChild(epList);
            }
            
            const currentUrls = data.episodes.map(ep => ep.url);
            const existingUrls = Array.from(epList.querySelectorAll('.job-episode-item')).map(el => el.dataset.url);
            
            if (JSON.stringify(currentUrls) !== JSON.stringify(existingUrls)) {
                epList.innerHTML = '';
                data.episodes.forEach((ep, index) => {
                    const epItem = this.createEpisodeItem(queueId, ep, index, data.episodes.length, container, jobStatus);
                    epList.appendChild(epItem);
                });
            } else {
                data.episodes.forEach(ep => {
                    const epItem = epList.querySelector(`.job-episode-item[data-url="${ep.url}"]`);
                    if (epItem) {
                        const isDownloading = ep.status === 'downloading';
                        const stats = epItem.querySelector('.ep-stats');
                        if (isDownloading) {
                            if (stats) stats.textContent = `${ep.speed || ''} | ${ep.eta || ''}`;
                            else {
                                const newStats = document.createElement('span');
                                newStats.className = 'ep-stats';
                                newStats.textContent = `${ep.speed || ''} | ${ep.eta || ''}`;
                                epItem.querySelector('.ep-info').appendChild(newStats);
                            }
                        } else if (stats) stats.remove();

                        const statusText = epItem.querySelector('.ep-status-text');
                        if (statusText) {
                            statusText.className = `ep-status-text ${ep.status}`;
                            statusText.textContent = ep.status;
                        }

                        const fill = epItem.querySelector('.ep-progress-fill');
                        const progVal = parseFloat(ep.progress || 0);
                        if (fill) {
                            if (isDownloading) {
                                console.debug(`  > Updating Ep UI: ${ep.name} -> ${progVal}%`);
                            }
                            fill.className = `ep-progress-fill ${ep.status}`;
                            fill.style.setProperty('width', `${progVal.toFixed(1)}%`, 'important');
                        }
                        const text = epItem.querySelector('.ep-progress-text');
                        if (text) text.textContent = `${progVal.toFixed(1)}%`;
                    }
                });
            }
        } catch (err) { console.error('Failed to load job episodes:', err); }
    },

    createEpisodeItem(queueId, ep, index, totalCount, container, jobStatus) {
        const epItem = document.createElement('div');
        epItem.className = 'job-episode-item';
        epItem.dataset.url = ep.url;
        const canReorderThis = ep.status === 'queued';
        const isDownloading = ep.status === 'downloading';
        const isFinished = ep.status === 'completed' || ep.status === 'failed' || ep.status === 'cancelled';
        const progVal = parseFloat(ep.progress || 0);
        
        epItem.innerHTML = `
            <div class="ep-info-row">
                <div class="ep-info">
                    <span class="ep-name">${escapeHtml(ep.name)}</span>
                    ${isDownloading ? `<span class="ep-stats">${escapeHtml(ep.speed || '')} | ${escapeHtml(ep.eta || '')}</span>` : ''}
                </div>
                <div class="ep-actions">
                    ${canReorderThis ? `
                        <button class="reorder-btn move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button class="reorder-btn move-down" title="Move Down" ${index === totalCount - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    ` : ''}
                    <span class="ep-status-text ${ep.status}">${ep.status}</span>
                    ${!isFinished ? `
                        <button class="ep-stop-btn" title="Stop Episode"><i class="fas fa-times"></i></button>
                    ` : ''}
                </div>
            </div>
            <div class="ep-progress-container">
                <div class="ep-progress-bar" style="height: 8px; background: #2d3748; border-radius: 4px; border: 1px solid #4a5568; overflow: hidden; position: relative; display: block; flex: 1;">
                    <div class="ep-progress-fill ${ep.status}" style="width: ${progVal.toFixed(1)}% !important; height: 100%; background: #4299e1 !important; display: block !important;"></div>
                </div>
                <span class="ep-progress-text">${progVal.toFixed(1)}%</span>
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

        return epItem;
    },

    async moveEpisode(queueId, index, direction, container, jobStatus) {
        try {
            const data = await API.getJobEpisodes(queueId);
            if (!data.success) return;
            const urls = data.episodes.map(ep => ep.url);
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= urls.length) return;
            [urls[index], urls[newIndex]] = [urls[newIndex], urls[index]];
            const res = await API.reorderEpisodes(queueId, urls);
            if (res.success) this.loadJobEpisodes(queueId, container, jobStatus);
            else showNotification(res.error || 'Failed to reorder episodes', 'error');
        } catch (err) { console.error('Move error:', err); }
    },

    async executeStopEpisode(queueId, epUrl, container, jobStatus) {
        try {
            const res = await API.stopEpisode(queueId, epUrl);
            if (res.success) {
                showNotification('Episode removed/stopped', 'success');
                this.loadJobEpisodes(queueId, container, jobStatus);
            } else showNotification(res.error || 'Failed to stop episode', 'error');
        } catch (err) { console.error('Stop episode error:', err); }
    },

    async executeDelete(queueId) {
        try {
            const data = await API.deleteDownload(queueId);
            if (data.success) this.updateDisplay();
            else showNotification(data.error || 'Failed to delete download', 'error');
        } catch (err) { console.error('Delete error:', err); }
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
                this.updateDisplay();
            } else showNotification(data.error || 'Failed to switch server', 'error');
        } catch (err) { console.error('Change server error:', err); }
    }
};
