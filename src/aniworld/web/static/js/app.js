// lankabeltv Web Interface JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('lankabeltv Web Interface loaded');

    // Get UI elements
    const versionDisplay = document.getElementById('version-display');
    const navTitle = document.getElementById('nav-title');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const resultsSection = document.getElementById('results-section');
    const resultsContainer = document.getElementById('results-container');
    const loadingSection = document.getElementById('loading-section');
    const emptyState = document.getElementById('empty-state');
    const homeContent = document.getElementById('home-content');
    const homeLoading = document.getElementById('home-loading');
    const popularNewSections = document.getElementById('popular-new-sections');
    const popularAnimeGrid = document.getElementById('popular-anime-grid');
    const newAnimeGrid = document.getElementById('new-anime-grid');

    // Tab elements
    const tabHome = document.getElementById('tab-home');
    const tabDownloads = document.getElementById('tab-downloads');
    const mainView = document.getElementById('main-view');
    const downloadsView = document.getElementById('downloads-view');
    const downloadBadge = document.getElementById('download-badge');
    const downloadsEmptyState = document.getElementById('downloads-empty-state');

    // Theme toggle elements
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Download modal elements
    const downloadModal = document.getElementById('download-modal');
    const closeDownloadModal = document.getElementById('close-download-modal');
    const cancelDownload = document.getElementById('cancel-download');
    const confirmDownload = document.getElementById('confirm-download');

    // Stop modal elements
    const stopModal = document.getElementById('stop-modal');
    const closeStopModal = document.getElementById('close-stop-modal');
    const cancelStop = document.getElementById('cancel-stop');
    const confirmStop = document.getElementById('confirm-stop');
    const selectAllBtn = document.getElementById('select-all');
    const deselectAllBtn = document.getElementById('deselect-all');
    const episodeTreeLoading = document.getElementById('episode-tree-loading');
    const episodeTree = document.getElementById('episode-tree');
    const selectedEpisodeCount = document.getElementById('selected-episode-count');
    const providerSelect = document.getElementById('provider-select');
    const languageSelect = document.getElementById('language-select');

    // Tracker UI elements
    const trackSeriesCheckbox = document.getElementById('track-series-checkbox');
    const trackersSection = document.getElementById('trackers-section');
    const trackersList = document.getElementById('trackers-list');
    const scanTrackersBtn = document.getElementById('scan-trackers-btn');

    // Queue elements
    const queueSection = document.getElementById('queue-section');
    const activeDownloads = document.getElementById('active-downloads');
    const completedDownloads = document.getElementById('completed-downloads');
    const activeQueueList = document.getElementById('active-queue-list');
    const completedQueueList = document.getElementById('completed-queue-list');

    // Current download data
    let currentDownloadData = null;
    let currentQueueIdToCancel = null;
    let availableEpisodes = {};
    let availableMovies = [];
    let selectedEpisodes = new Set();
    let progressInterval = null;
    let availableProviders = [];

    // Load version info and providers on page load
    loadVersionInfo();

    // Check for active downloads on page load
    checkQueueStatus();
    loadAvailableProviders();

    // Load popular and new anime on page load
    loadPopularAndNewAnime();

    // Initialize theme (default is dark mode)
    initializeTheme();

    // Tab switching functionality
    if (tabHome) {
        tabHome.addEventListener('click', () => switchTab('home'));
    }
    if (tabDownloads) {
        tabDownloads.addEventListener('click', () => switchTab('downloads'));
    }

    if (scanTrackersBtn) {
        scanTrackersBtn.addEventListener('click', () => {
            scanTrackersBtn.disabled = true;
            const originalText = scanTrackersBtn.innerHTML;
            scanTrackersBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
            
            fetch('/api/trackers/scan', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showNotification('Tracker scan started', 'success');
                    } else {
                        showNotification(data.error || 'Failed to start scan', 'error');
                    }
                })
                .catch(err => {
                    console.error('Scan error:', err);
                    showNotification('Failed to start scan', 'error');
                })
                .finally(() => {
                    setTimeout(() => {
                        scanTrackersBtn.disabled = false;
                        scanTrackersBtn.innerHTML = originalText;
                    }, 2000);
                });
        });
    }

    // Search functionality
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Download modal functionality
    if (closeDownloadModal) {
        closeDownloadModal.addEventListener('click', hideDownloadModal);
    }
    if (cancelDownload) {
        cancelDownload.addEventListener('click', hideDownloadModal);
    }
    if (confirmDownload) {
        confirmDownload.addEventListener('click', startDownload);
    }

    // Stop modal functionality
    if (closeStopModal) {
        closeStopModal.addEventListener('click', hideStopModal);
    }
    if (cancelStop) {
        cancelStop.addEventListener('click', hideStopModal);
    }
    if (confirmStop) {
        confirmStop.addEventListener('click', executeCancelDownload);
    }
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllEpisodes);
    }
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllEpisodes);
    }

    // Theme toggle functionality (only if element exists)
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Navbar title click functionality
    if (navTitle) {
        navTitle.addEventListener('click', function() {
            // Switch to home tab
            switchTab('home');
            
            // Clear search input
            if (searchInput) {
                searchInput.value = '';
            }
            // Show home content (original state)
            showHomeContent();
            // Reload popular and new anime
            loadPopularAndNewAnime();
        });
    }

    // Close modal when clicking outside
    if (downloadModal) {
        downloadModal.addEventListener('click', function(e) {
            if (e.target === downloadModal) {
                hideDownloadModal();
            }
        });
    }

    if (stopModal) {
        stopModal.addEventListener('click', function(e) {
            if (e.target === stopModal) {
                hideStopModal();
            }
        });
    }

    function loadVersionInfo() {
        fetch('/api/info')
            .then(response => response.json())
            .then(data => {
                if (versionDisplay) versionDisplay.textContent = `v${data.version}`;
            })
            .catch(error => {
                console.error('Failed to load version info:', error);
                if (versionDisplay) versionDisplay.textContent = 'v?.?.?';
            });
    }

    function loadAvailableProviders() {
        populateProviderDropdown('aniworld.to');
    }

    function populateProviderDropdown(site) {
        if (!providerSelect) return;

        let siteProviders = [];
        if (site === 's.to') {
            siteProviders = ['VOE'];
        } else {
            siteProviders = ['VOE', 'Filemoon', 'Vidmoly'];
        }

        providerSelect.innerHTML = '';
        siteProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider;
            providerSelect.appendChild(option);
        });
        providerSelect.value = 'VOE';
    }

    function populateLanguageDropdown(site) {
        if (!languageSelect) return;

        languageSelect.innerHTML = '';
        let availableLanguages = [];
        if (site === 's.to') {
            availableLanguages = ['German Dub', 'English Dub'];
        } else {
            availableLanguages = ['German Dub', 'English Sub', 'German Sub'];
        }

        availableLanguages.forEach(language => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            languageSelect.appendChild(option);
        });

        setTimeout(() => {
            if (site === 's.to') {
                languageSelect.value = 'German Dub';
            } else {
                languageSelect.value = 'German Sub';
            }
        }, 0);
    }

    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            showHomeContent();
            return;
        }

        const siteRadios = document.querySelectorAll('input[name="site"]');
        let selectedSite = "both";
        siteRadios.forEach(r => { if(r.checked) selectedSite = r.value; });

        showLoadingState();
        searchBtn.disabled = true;
        searchBtn.textContent = 'Searching...';

        fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, site: selectedSite })
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            if (data.success) {
                displaySearchResults(data.results);
            } else {
                showNotification(data.error || 'Search failed', 'error');
                showEmptyState();
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            showNotification('Search failed. Please try again.', 'error');
            showEmptyState();
        })
        .finally(() => {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search';
            hideLoadingState();
        });
    }

    function displaySearchResults(results) {
        if (!results || results.length === 0) {
            showEmptyState();
            return;
        }
        resultsContainer.innerHTML = '';
        results.forEach(anime => {
            const animeCard = createAnimeCard(anime);
            resultsContainer.appendChild(animeCard);
        });
        showResultsSection();
    }

    function createAnimeCard(anime) {
        const card = document.createElement('div');
        card.className = 'anime-card';
        let coverStyle = '';
        if (anime.cover) {
            let coverUrl = anime.cover;
            if (!coverUrl.startsWith('http')) {
                const baseUrl = anime.site === 's.to' ? 'https://s.to' : 'https://aniworld.to';
                if (coverUrl.startsWith('//')) coverUrl = 'https:' + coverUrl;
                else if (coverUrl.startsWith('/')) coverUrl = baseUrl + coverUrl;
                else coverUrl = baseUrl + '/' + coverUrl;
            }
            coverUrl = coverUrl.replace("150x225", "220x330");
            coverStyle = `style="background-image: url('${coverUrl}')"`;
        }

        card.innerHTML = `
            <div class="anime-card-background" ${coverStyle}></div>
            <div class="anime-card-content">
                <div class="anime-title">${escapeHtml(anime.title)}</div>
                <div class="anime-info">
                    <strong>Site:</strong> ${escapeHtml(anime.site || 'aniworld.to')}<br>
                    <strong>Slug:</strong> ${escapeHtml(anime.slug || 'Unknown')}<br>
                </div>
                <div class="anime-actions">
                    <button class="download-btn">Download</button>
                </div>
            </div>
        `;

        card.querySelector('.download-btn').addEventListener('click', () => {
            showDownloadModal(anime.title, 'Series', anime.url);
        });
        return card;
    }

    function showDownloadModal(animeTitle, episodeTitle, episodeUrl) {
        let detectedSite = episodeUrl.includes('/serie/stream/') || episodeUrl.includes('186.2.175.5') ? 's.to' : 'aniworld.to';
        currentDownloadData = { anime: animeTitle, episode: episodeTitle, url: episodeUrl, site: detectedSite };
        selectedEpisodes.clear();
        availableEpisodes = {};

        document.getElementById('download-anime-title').textContent = animeTitle;
        populateLanguageDropdown(detectedSite);
        populateProviderDropdown(detectedSite);

        episodeTreeLoading.style.display = 'flex';
        episodeTree.style.display = 'none';
        updateSelectedCount();

        fetch('/api/download-path')
            .then(response => response.json())
            .then(data => {
                const pathEl = document.getElementById('download-path');
                if (pathEl) pathEl.textContent = data.path;
            });

        fetch('/api/episodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ series_url: episodeUrl })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                availableEpisodes = data.episodes;
                availableMovies = data.movies || [];
                renderEpisodeTree();
            } else {
                showNotification(data.error || 'Failed to load episodes', 'error');
            }
        })
        .catch(error => {
            console.error('Failed to fetch episodes:', error);
            showNotification('Failed to load episodes', 'error');
        })
        .finally(() => {
            episodeTreeLoading.style.display = 'none';
            episodeTree.style.display = 'block';
        });

        downloadModal.style.display = 'flex';
    }

    function hideDownloadModal() {
        downloadModal.style.display = 'none';
        currentDownloadData = null;
        selectedEpisodes.clear();
        availableEpisodes = {};
        availableMovies = [];
        if (trackSeriesCheckbox) trackSeriesCheckbox.checked = false;
    }

    function renderEpisodeTree() {
        if (trackSeriesCheckbox && !trackSeriesCheckbox.dataset.listenerAdded) {
            trackSeriesCheckbox.addEventListener('change', updateSelectedCount);
            trackSeriesCheckbox.dataset.listenerAdded = 'true';
        }

        episodeTree.innerHTML = '';
        Object.keys(availableEpisodes).sort((a, b) => Number(a) - Number(b)).forEach(seasonNum => {
            const season = availableEpisodes[seasonNum];
            const seasonContainer = document.createElement('div');
            seasonContainer.className = 'season-container';
            const seasonHeader = document.createElement('div');
            seasonHeader.className = 'season-header';
            const seasonCheckbox = document.createElement('input');
            seasonCheckbox.type = 'checkbox';
            seasonCheckbox.className = 'season-checkbox';
            seasonCheckbox.id = `season-${seasonNum}`;
            seasonCheckbox.addEventListener('change', () => toggleSeason(seasonNum));
            const seasonLabel = document.createElement('label');
            seasonLabel.htmlFor = `season-${seasonNum}`;
            seasonLabel.textContent = `Season ${seasonNum} (${season.length} episodes)`;
            seasonLabel.className = 'season-label';
            seasonHeader.appendChild(seasonCheckbox);
            seasonHeader.appendChild(seasonLabel);
            const episodesContainer = document.createElement('div');
            episodesContainer.className = 'episodes-container';
            season.forEach(episode => {
                const episodeItem = document.createElement('div');
                episodeItem.className = 'episode-item-tree';
                const episodeCheckbox = document.createElement('input');
                episodeCheckbox.type = 'checkbox';
                episodeCheckbox.className = 'episode-checkbox';
                const episodeId = `${episode.season}-${episode.episode}`;
                episodeCheckbox.id = `episode-${episodeId}`;
                episodeCheckbox.addEventListener('change', () => toggleEpisode(episode, episodeCheckbox.checked));
                const episodeLabel = document.createElement('label');
                episodeLabel.htmlFor = `episode-${episodeId}`;
                episodeLabel.textContent = episode.title;
                episodeLabel.className = 'episode-label';
                episodeItem.appendChild(episodeCheckbox);
                episodeItem.appendChild(episodeLabel);
                episodesContainer.appendChild(episodeItem);
            });
            seasonContainer.appendChild(seasonHeader);
            seasonContainer.appendChild(episodesContainer);
            episodeTree.appendChild(seasonContainer);
        });
        updateSelectedCount();
    }

    function toggleSeason(seasonNum) {
        const season = availableEpisodes[seasonNum];
        const seasonCB = document.getElementById(`season-${seasonNum}`);
        if (!seasonCB) return;
        const isChecked = seasonCB.checked;
        season.forEach(episode => {
            const episodeCheckbox = document.getElementById(`episode-${episode.season}-${episode.episode}`);
            if (episodeCheckbox) {
                episodeCheckbox.checked = isChecked;
                toggleEpisode(episode, isChecked);
            }
        });
    }

    function toggleEpisode(episode, isSelected) {
        const key = `${episode.season}-${episode.episode}`;
        if (isSelected) selectedEpisodes.add(key);
        else selectedEpisodes.delete(key);
        updateSeasonCheckboxState(episode.season);
        updateSelectedCount();
    }

    function updateSeasonCheckboxState(seasonNum) {
        const season = availableEpisodes[seasonNum];
        const seasonCheckbox = document.getElementById(`season-${seasonNum}`);
        if (!seasonCheckbox || !season) return;
        const seasonEpisodes = season.map(ep => `${ep.season}-${ep.episode}`);
        const selectedInSeason = seasonEpisodes.filter(key => selectedEpisodes.has(key));
        if (selectedInSeason.length === seasonEpisodes.length) {
            seasonCheckbox.checked = true;
            seasonCheckbox.indeterminate = false;
        } else if (selectedInSeason.length > 0) {
            seasonCheckbox.checked = false;
            seasonCheckbox.indeterminate = true;
        } else {
            seasonCheckbox.checked = false;
            seasonCheckbox.indeterminate = false;
        }
    }

    function selectAllEpisodes() {
        Object.values(availableEpisodes).flat().forEach(episode => {
            const key = `${episode.season}-${episode.episode}`;
            const cb = document.getElementById(`episode-${key}`);
            if (cb) {
                cb.checked = true;
                selectedEpisodes.add(key);
            }
        });
        Object.keys(availableEpisodes).forEach(updateSeasonCheckboxState);
        updateSelectedCount();
    }

    function deselectAllEpisodes() {
        selectedEpisodes.clear();
        document.querySelectorAll('.episode-checkbox, .season-checkbox').forEach(cb => {
            cb.checked = false;
            cb.indeterminate = false;
        });
        updateSelectedCount();
    }

    function updateSelectedCount() {
        const count = selectedEpisodes.size;
        const isTrackerEnabled = trackSeriesCheckbox && trackSeriesCheckbox.checked;
        
        if (selectedEpisodeCount) selectedEpisodeCount.textContent = `${count} items selected`;
        
        if (confirmDownload) {
            confirmDownload.disabled = (count === 0 && !isTrackerEnabled);
            
            // Update button text based on what will happen
            if (count > 0) {
                confirmDownload.textContent = 'Start Download';
            } else if (isTrackerEnabled) {
                confirmDownload.textContent = 'Add Tracker';
            } else {
                confirmDownload.textContent = 'Start Download';
            }
        }
    }

    function startDownload() {
        const isTrackerEnabled = trackSeriesCheckbox && trackSeriesCheckbox.checked;
        const count = selectedEpisodes.size;
        console.log(`Download/Tracker process started. Tracker enabled: ${isTrackerEnabled}, Selected episodes: ${count}`);

        if (!currentDownloadData || (count === 0 && !isTrackerEnabled)) {
            showNotification('Please select at least one episode to download or enable tracking', 'error');
            return;
        }

        confirmDownload.disabled = true;
        confirmDownload.textContent = count > 0 ? 'Starting...' : 'Adding...';

        if (count === 0 && isTrackerEnabled) {
            console.log('Only tracker mode active. No episodes selected.');
            // Only add tracker, no download
            addTrackerForCurrentSeries().then(success => {
                console.log(`Tracker-only creation result: ${success ? 'Success' : 'Failed'}`);
                if (success) hideDownloadModal();
                confirmDownload.disabled = false;
                updateSelectedCount(); // Reset button text/state
            });
            return;
        }

        const selectedUrls = [];
        selectedEpisodes.forEach(key => {
            const [s, e] = key.split('-').map(Number);
            const epData = availableEpisodes[s]?.find(item => item.season === s && item.episode === e);
            if (epData) selectedUrls.push(epData.url);
        });

        const lang = languageSelect.value;
        const prov = providerSelect.value;

        fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                episode_urls: selectedUrls,
                language: lang,
                provider: prov,
                anime_title: currentDownloadData.anime
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`Download started for ${selectedEpisodes.size} episodes`, 'success');
                if (isTrackerEnabled) {
                    addTrackerForCurrentSeries();
                }
                hideDownloadModal();
                startQueueTracking();
            } else {
                showNotification(data.error || 'Download failed', 'error');
            }
        })
        .catch(err => showNotification('Failed to start download', 'error'))
        .finally(() => {
            confirmDownload.disabled = false;
            confirmDownload.textContent = 'Start Download';
        });
    }

    async function addTrackerForCurrentSeries() {
        if (!currentDownloadData) return false;
        
        // Find max season and episode from availableEpisodes
        let maxS = 0, maxE = 0;
        const seasonNums = Object.keys(availableEpisodes).map(Number).sort((a, b) => b - a);
        if (seasonNums.length > 0) {
            maxS = seasonNums[0];
            const episodes = availableEpisodes[maxS];
            if (episodes && episodes.length > 0) {
                // Find max episode number in that season
                maxE = Math.max(...episodes.map(ep => ep.episode));
            }
        }

        try {
            const response = await fetch('/api/trackers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anime_title: currentDownloadData.anime,
                    series_url: currentDownloadData.url,
                    language: languageSelect.value,
                    provider: providerSelect.value,
                    last_season: maxS,
                    last_episode: maxE
                })
            });
            const data = await response.json();
            if (data.success) {
                showNotification('Tracker added successfully', 'success');
                updateTrackersDisplay();
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

    function updateTrackersDisplay() {
        if (!trackersSection) return;
        fetch('/api/trackers')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.trackers && data.trackers.length > 0) {
                    trackersSection.style.display = 'block';
                    renderTrackers(data.trackers);
                } else {
                    trackersSection.style.display = 'block';
                    trackersList.innerHTML = '<div class="empty-state-small" style="grid-column: 1/-1; text-align: center; padding: 20px; opacity: 0.6;"><p>No active trackers</p></div>';
                }
            })
            .catch(error => {
                console.error('Error loading trackers:', error);
                trackersSection.style.display = 'none';
            });
    }

    function renderTrackers(trackers) {
        if (!trackersList) return;
        trackersList.innerHTML = '';
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
            item.querySelector('.delete-tracker-btn').addEventListener('click', () => {
                if (confirm('Remove tracker?')) {
                    fetch(`/api/trackers/${t.id}`, { method: 'DELETE' })
                        .then(res => res.json())
                        .then(data => { if (data.success) updateTrackersDisplay(); });
                }
            });
            trackersList.appendChild(item);
        });
    }

    function switchTab(tabName) {
        if (tabName === 'home') {
            tabHome.classList.add('active');
            tabDownloads.classList.remove('active');
            mainView.style.display = 'block';
            downloadsView.style.display = 'none';
        } else {
            tabHome.classList.remove('active');
            tabDownloads.classList.add('active');
            mainView.style.display = 'none';
            downloadsView.style.display = 'block';
            startQueueTracking();
            updateTrackersDisplay();
        }
    }

    function checkQueueStatus() {
        fetch('/api/queue-status')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.queue && (data.queue.active.length > 0 || data.queue.completed.length > 0)) {
                    startQueueTracking();
                }
            });
    }

    function updateQueueDisplay() {
        fetch('/api/queue-status')
            .then(res => res.json())
            .then(data => {
                if (!data.success) return;
                const active = data.queue.active || [];
                const completed = data.queue.completed || [];
                
                // Trackers update should also happen when queue updates
                updateTrackersDisplay();
                
                if (downloadBadge) {
                    if (active.length > 0) {
                        downloadBadge.textContent = active.length;
                        downloadBadge.style.display = 'inline-block';
                    } else {
                        downloadBadge.style.display = 'none';
                    }
                }
                
                const isDownloadsVisible = downloadsView && downloadsView.style.display === 'block';
                
                if (active.length === 0 && completed.length === 0) {
                    if (downloadsEmptyState) downloadsEmptyState.style.display = 'block';
                    activeDownloads.style.display = 'none';
                    completedDownloads.style.display = 'none';
                    
                    // Only stop interval if not on downloads page
                    if (!isDownloadsVisible && progressInterval) {
                        clearInterval(progressInterval);
                        progressInterval = null;
                    }
                } else {
                    if (downloadsEmptyState) downloadsEmptyState.style.display = 'none';
                    
                    if (active.length > 0) {
                        activeDownloads.style.display = 'block';
                        updateQueueList(activeQueueList, active, 'active');
                    } else {
                        activeDownloads.style.display = 'none';
                    }
                    
                    if (completed.length > 0) {
                        completedDownloads.style.display = 'block';
                        updateQueueList(completedQueueList, completed, 'completed');
                    } else {
                        completedDownloads.style.display = 'none';
                    }
                }
            });
    }

    function updateQueueList(container, items, type) {
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
                const stopBtn = qItem.querySelector('.stop-download-btn');
                if (stopBtn) {
                    stopBtn.addEventListener('click', () => {
                        currentQueueIdToCancel = item.id;
                        stopModal.style.display = 'flex';
                    });
                }
            } else {
                const deleteBtn = qItem.querySelector('.delete-download-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        executeDeleteDownload(item.id);
                    });
                }
            }
            container.appendChild(qItem);
        });
    }

    function executeDeleteDownload(queueId) {
        fetch(`/api/download/${queueId}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                updateQueueDisplay();
            } else {
                showNotification(data.error || 'Failed to delete download', 'error');
            }
        })
        .catch(err => {
            console.error('Delete error:', err);
            showNotification('Failed to delete download', 'error');
        });
    }

    function executeCancelDownload() {
        if (!currentQueueIdToCancel) return;
        fetch('/api/download/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queue_id: currentQueueIdToCancel })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification('Download cancelled', 'success');
                stopModal.style.display = 'none';
                updateQueueDisplay();
            }
        });
    }

    function hideStopModal() {
        stopModal.style.display = 'none';
    }

    function loadPopularAndNewAnime() {
        if (homeLoading) homeLoading.style.display = 'block';
        fetch('/api/popular-new')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    popularAnimeGrid.innerHTML = '';
                    newAnimeGrid.innerHTML = '';
                    data.popular.slice(0, 8).forEach(a => popularAnimeGrid.appendChild(createHomeAnimeCard(a)));
                    data.new.slice(0, 8).forEach(a => newAnimeGrid.appendChild(createHomeAnimeCard(a)));
                    popularNewSections.style.display = 'block';
                    showHomeContent();
                }
            })
            .finally(() => { if (homeLoading) homeLoading.style.display = 'none'; });
    }

    function createHomeAnimeCard(anime) {
        const card = document.createElement('div');
        card.className = 'home-anime-card';
        let coverUrl = anime.cover || '';
        coverUrl = coverUrl.replace('_150x225.png', '_220x330.png');
        card.innerHTML = `
            <div class="home-anime-cover"><img src="${coverUrl}" loading="lazy"></div>
            <div class="home-anime-title">${escapeHtml(anime.name)}</div>
        `;
        card.addEventListener('click', () => {
            searchInput.value = anime.name;
            performSearch();
        });
        return card;
    }

    function initializeTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        setTheme(saved);
    }

    function toggleTheme() {
        const curr = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        setTheme(curr);
    }

    function setTheme(theme) {
        if (theme === 'light') {
            document.body.removeAttribute('data-theme');
            if (themeIcon) themeIcon.className = 'fas fa-moon';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.className = 'fas fa-sun';
        }
        localStorage.setItem('theme', theme);
    }

    function showLoadingState() {
        if (homeContent) homeContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (loadingSection) loadingSection.style.display = 'block';
    }

    function hideLoadingState() {
        if (loadingSection) loadingSection.style.display = 'none';
    }

    function showResultsSection() {
        if (homeContent) homeContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (loadingSection) loadingSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';
    }

    function showEmptyState() {
        if (homeContent) homeContent.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (loadingSection) loadingSection.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }

    function showHomeContent() {
        if (resultsSection) resultsSection.style.display = 'none';
        if (loadingSection) loadingSection.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (homeContent) homeContent.style.display = 'block';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function startQueueTracking() {
        if (progressInterval) {
            console.log('Queue tracking already running');
            return;
        }
        console.log('Starting queue tracking interval');
        updateQueueDisplay();
        progressInterval = setInterval(updateQueueDisplay, 3000);
    }

    window.showDownloadModal = showDownloadModal;
});

function showNotification(msg, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    n.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; color: white; z-index: 1000; background: ${type === 'success' ? '#48bb78' : (type === 'error' ? '#f56565' : '#4299e1')};`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}
