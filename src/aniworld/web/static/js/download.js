/**
 * download.js - Download modal and episode management for LankabelTV Web Interface
 */

import API from './api.js';
import { showNotification } from './ui.js';
import { Queue } from './queue.js';
import { Trackers } from './trackers.js';

export const Download = {
    state: {
        currentDownloadData: null,
        availableEpisodes: {},
        availableMovies: [],
        selectedEpisodes: new Set(),
        episodeLanguageSelections: {},
        episodeProviderSelections: {},
        languagePreferences: { aniworld: [], sto: [] },
        availableProviders: [],
        currentSessionId: 0
    },

    elements: {
        downloadModal: document.getElementById('download-modal'),
        animeTitle: document.getElementById('download-anime-title'),
        episodeTree: document.getElementById('episode-tree'),
        episodeTreeLoading: document.getElementById('episode-tree-loading'),
        selectedCount: document.getElementById('selected-episode-count'),
        confirmBtn: document.getElementById('confirm-download'),
        trackCheckbox: document.getElementById('track-series-checkbox'),
        trackerLanguageSelection: document.getElementById('tracker-language-selection'),
        trackerLanguage: document.getElementById('tracker-language'),
        trackerLastSeenPreview: document.getElementById('tracker-last-seen-preview'),
        lastSeenStatus: document.getElementById('last-seen-status'),
        downloadPath: document.getElementById('download-path')
    },

    async init() {
        await this.loadLanguagePreferences();
    },

    async loadLanguagePreferences() {
        try {
            const data = await API.getLanguagePreferences();
            if (data.success) {
                this.state.languagePreferences = {
                    aniworld: data.aniworld || [],
                    sto: data.sto || []
                };
            }
        } catch (err) {
            console.error('Failed to load language preferences:', err);
        }
    },

    async showModal(animeTitle, episodeTitle, episodeUrl) {
        // Increment session ID to invalidate pending background requests from previous sessions
        this.state.currentSessionId++;
        
        // Clear episode tree content immediately to prevent stale data
        if (this.elements.episodeTree) this.elements.episodeTree.innerHTML = '';

        let detectedSite = 'aniworld.to';
        if (episodeUrl.includes('/serie/stream/') || episodeUrl.includes('186.2.175.5')) {
            detectedSite = 's.to';
        } else if (episodeUrl.includes('vidking.net') || episodeUrl.includes('movie4k')) {
            detectedSite = 'movie4k';
        } else if (episodeUrl.includes('hdfilme.press')) {
            // HDFilme handling removed/redirected to Movie4k if needed, but for now just label as movie4k if it matches logic
            // User requested removal of HDFilme.
            detectedSite = 'movie4k'; 
        }
        
        this.state.currentDownloadData = { anime: animeTitle, episode: episodeTitle, url: episodeUrl, site: detectedSite };
        this.state.selectedEpisodes.clear();
        this.state.availableEpisodes = {};
        this.state.episodeLanguageSelections = {};
        this.state.episodeProviderSelections = {};

        if (this.elements.animeTitle) this.elements.animeTitle.textContent = animeTitle;

        if (this.elements.episodeTreeLoading) this.elements.episodeTreeLoading.style.display = 'flex';
        if (this.elements.episodeTree) this.elements.episodeTree.style.display = 'none';
        this.updateSelectedCount();

        try {
            const pathData = await API.getDownloadPath();
            if (this.elements.downloadPath) this.elements.downloadPath.textContent = pathData.path;
        } catch (err) { console.error('Failed to load download path:', err); }

        try {
            const data = await API.getEpisodes(episodeUrl, animeTitle);
            if (data.success) {
                this.state.availableEpisodes = data.episodes;
                this.state.availableMovies = data.movies || [];
                this.renderEpisodeTree();
            } else {
                showNotification(data.error || 'Failed to load episodes', 'error');
            }
        } catch (error) {
            console.error('Failed to fetch episodes:', error);
            showNotification('Failed to load episodes', 'error');
        } finally {
            if (this.elements.episodeTreeLoading) this.elements.episodeTreeLoading.style.display = 'none';
            if (this.elements.episodeTree) this.elements.episodeTree.style.display = 'block';
        }

        if (this.elements.downloadModal) this.elements.downloadModal.style.display = 'flex';
    },

    hideModal() {
        if (this.elements.downloadModal) this.elements.downloadModal.style.display = 'none';
        
        // Clear episode tree content immediately to prevent stale data on re-open
        if (this.elements.episodeTree) this.elements.episodeTree.innerHTML = '';
        
        this.state.currentDownloadData = null;
        this.state.selectedEpisodes.clear();
        this.state.availableEpisodes = {};
        this.state.availableMovies = [];
        this.state.episodeLanguageSelections = {};
        this.state.episodeProviderSelections = {};
        if (this.elements.trackCheckbox) this.elements.trackCheckbox.checked = false;
        if (this.elements.trackerLanguageSelection) this.elements.trackerLanguageSelection.style.display = 'none';
        if (this.elements.trackerLastSeenPreview) this.elements.trackerLastSeenPreview.style.display = 'none';

        // Reset all download button loaders
        document.querySelectorAll('.download-btn.loading').forEach(btn => {
            btn.classList.remove('loading');
            const text = btn.querySelector('.btn-text');
            const loader = btn.querySelector('.btn-loader');
            if (text) text.style.display = 'inline-block';
            if (loader) loader.style.display = 'none';
        });
    },

    async autoVerifyEpisodeLanguages(episodes) {
        const sessionId = this.state.currentSessionId;
        const batchSize = 3;
        for (let i = 0; i < episodes.length; i += batchSize) {
            if (this.state.currentSessionId !== sessionId) return;

            const batch = episodes.slice(i, i + batchSize);
            await Promise.all(batch.map(async (ep) => {
                try {
                    const data = await API.getEpisodeProviders(ep.url);
                    if (this.state.currentSessionId !== sessionId) return;
                    
                    if (data.success) {
                        const langWrapper = document.querySelector(`.episode-lang-wrapper[data-episode-url="${ep.url}"]`);
                        if (langWrapper) {
                            let langBadgesContainer = langWrapper.querySelector('.episode-lang-badges') || document.createElement('div');
                            langBadgesContainer.className = 'episode-lang-badges';
                            if (!langWrapper.querySelector('.episode-lang-badges')) langWrapper.appendChild(langBadgesContainer);
                            this.createLanguageBadges(langBadgesContainer, data.languages, ep.url);

                            let providerWrapper = langWrapper.querySelector('.episode-provider-wrapper') || document.createElement('div');
                            providerWrapper.className = 'episode-provider-wrapper';
                            providerWrapper.dataset.episodeUrl = ep.url;
                            if (!langWrapper.querySelector('.episode-provider-wrapper')) langWrapper.appendChild(providerWrapper);

                            let provBadgesContainer = providerWrapper.querySelector('.episode-provider-badges') || document.createElement('div');
                            provBadgesContainer.className = 'episode-provider-badges';
                            if (!providerWrapper.querySelector('.episode-provider-badges')) providerWrapper.appendChild(provBadgesContainer);
                            this.createProviderBadges(provBadgesContainer, data.providers, ep.url);
                        }
                        const epInCache = this.state.availableEpisodes[ep.season]?.find(e => e.episode === ep.episode);
                        if (epInCache) {
                            epInCache.languages = data.languages;
                            epInCache.providers = data.providers;
                        }
                        this.updateSeasonLanguageBadges(ep.season);
                        this.updateTrackerPreview();
                    }
                } catch (err) { console.error(`Auto-verify error for ${ep.season}x${ep.episode}:`, err); }
            }));
            if (i + batchSize < episodes.length) await new Promise(r => setTimeout(r, 500));
        }
    },

    updateTrackerPreview() {
        if (!this.elements.trackCheckbox || !this.elements.trackCheckbox.checked) return;
        if (!this.elements.lastSeenStatus) return;

        const targetLanguage = this.elements.trackerLanguage?.value || 'German Dub';
        
        // Map language string to ID (same as in backend)
        const langMap = {
            "German Dub": 1,
            "German Sub": 3,
            "English Dub": 2,
            "English Sub": 2,
            "Language ID 1": 1,
            "Language ID 2": 2,
            "Language ID 3": 3,
        };
        const targetLangId = langMap[targetLanguage];

        let maxS = 0, maxE = 0;
        const seasons = Object.keys(this.state.availableEpisodes).map(Number).sort((a, b) => b - a);
        let found = false;
        
        for (const sNum of seasons) {
            const episodes = this.state.availableEpisodes[sNum];
            if (episodes && episodes.length > 0) {
                // We want the HIGHEST episode number in this season that matches the language
                const sortedEpisodes = [...episodes].sort((a, b) => b.episode - a.episode);
                for (const ep of sortedEpisodes) {
                    // Normalize languages: could be [1, 2] or ["German Dub", "English Sub"]
                    let hasLang = false;
                    if (ep.languages && Array.isArray(ep.languages)) {
                        hasLang = ep.languages.some(l => {
                            if (typeof l === 'number') return l === targetLangId;
                            if (typeof l === 'string') return l === targetLanguage;
                            return false;
                        });
                    }
                    
                    if (hasLang) {
                        maxS = sNum;
                        maxE = Number(ep.episode) || 0;
                        found = true;
                        break;
                    }
                }
            }
            if (found) break;
        }

        if (found) {
            this.elements.lastSeenStatus.innerHTML = `<strong>Season ${maxS} Episode ${maxE}</strong>`;
            this.elements.lastSeenStatus.style.color = 'var(--accent-color)';
        } else {
            // Check if we are still loading
            const hasUnverified = Object.values(this.state.availableEpisodes).flat().some(ep => !ep.languages || ep.languages.length === 0);
            if (hasUnverified) {
                this.elements.lastSeenStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking availability...';
            } else {
                this.elements.lastSeenStatus.textContent = 'None found in this language';
                this.elements.lastSeenStatus.style.color = '#f56565';
            }
        }
    },

    createLanguageBadges(container, languages, episodeUrl) {
        container.innerHTML = '';
        if (!languages || languages.length === 0) {
            container.innerHTML = '<span style="font-size: 0.7rem; opacity: 0.5;">Loading...</span>';
            return;
        }

        let selectedLang = this.state.episodeLanguageSelections[episodeUrl];
        if (!selectedLang) {
            const sitePrefs = this.state.currentDownloadData.site === 's.to' ? this.state.languagePreferences.sto : this.state.languagePreferences.aniworld;
            selectedLang = sitePrefs?.find(pref => languages.includes(pref));
            if (!selectedLang) {
                // Default fallback if no preference matches
                if (languages.includes('German Dub')) selectedLang = 'German Dub';
                else if (languages.includes('German Sub')) selectedLang = 'German Sub';
                else if (languages.length > 0) selectedLang = languages[0];
            }
            this.state.episodeLanguageSelections[episodeUrl] = selectedLang;
        }

        languages.forEach(lang => {
            const badge = document.createElement('span');
            badge.className = 'lang-badge' + (lang === selectedLang ? ' active' : '');
            badge.textContent = lang.replace('German', 'DE').replace('English', 'EN').replace('Dub', 'Dub').replace('Sub', 'Sub');
            badge.title = lang;
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.episodeLanguageSelections[episodeUrl] = lang;
                container.querySelectorAll('.lang-badge').forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
            });
            container.appendChild(badge);
        });
    },

    createProviderBadges(container, providers, episodeUrl) {
        container.innerHTML = '';
        if (!providers || providers.length === 0) {
            return;
        }

        let selectedProv = this.state.episodeProviderSelections[episodeUrl];
        if (!selectedProv && providers.length > 0) {
            selectedProv = providers[0];
        }
        if (selectedProv) this.state.episodeProviderSelections[episodeUrl] = selectedProv;

        providers.forEach(prov => {
            const badge = document.createElement('span');
            badge.className = 'provider-badge' + (prov === selectedProv ? ' active' : '');
            badge.textContent = prov.replace('streamtape', 'ST').replace('filemoon', 'FM').replace('vidmoly', 'VM').replace('vidoza', 'VZ');
            badge.title = prov;
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.episodeProviderSelections[episodeUrl] = prov;
                container.querySelectorAll('.provider-badge').forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
            });
            container.appendChild(badge);
        });
    },

    renderEpisodeTree() {
        if (this.elements.trackCheckbox && !this.elements.trackCheckbox.dataset.listenerAdded) {
            this.elements.trackCheckbox.addEventListener('change', () => {
                if (this.elements.trackerLanguageSelection) {
                    this.elements.trackerLanguageSelection.style.display = this.elements.trackCheckbox.checked ? 'block' : 'none';
                    if (this.elements.trackerLastSeenPreview) this.elements.trackerLastSeenPreview.style.display = this.elements.trackCheckbox.checked ? 'block' : 'none';
                    
                    // Set default tracking language based on preferences
                    if (this.elements.trackCheckbox.checked && this.elements.trackerLanguage) {
                        const sitePrefs = this.state.currentDownloadData.site === 's.to' ? this.state.languagePreferences.sto : this.state.languagePreferences.aniworld;
                        if (sitePrefs && sitePrefs.length > 0) {
                            this.elements.trackerLanguage.value = sitePrefs[0];
                        }
                    }
                }
                this.updateTrackerPreview();
                this.updateSelectedCount();
            });

            if (this.elements.trackerLanguage) {
                this.elements.trackerLanguage.addEventListener('change', () => {
                    this.updateTrackerPreview();
                });
            }

            this.elements.trackCheckbox.dataset.listenerAdded = 'true';
        }
        this.elements.episodeTree.innerHTML = '';

        // Special handling for Movie4k movies (replacing VidKing/HDFilme)
        if (this.state.currentDownloadData.site === 'movie4k') {
            const movieItem = document.createElement('div');
            movieItem.className = 'episode-item-tree selected';
            movieItem.style.padding = '15px';
            movieItem.style.background = 'var(--active-bg)';
            
            if (this.state.availableEpisodes && Object.keys(this.state.availableEpisodes).length > 0) {
                 // Proceed to standard rendering
            } else {
                 // Fallback or error
                 this.elements.episodeTree.innerHTML = '<div style="padding: 20px; text-align: center;">Movie not found in Movie4k database.</div>';
                 return;
            }
        }

        const episodesToVerify = [];
        const seasons = Object.keys(this.state.availableEpisodes).sort((a, b) => Number(a) - Number(b));

        // Add Season Navigation if more than 3 seasons
        if (seasons.length > 2) {
            const seasonNav = document.createElement('div');
            seasonNav.className = 'season-nav';
            seasonNav.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px; padding: 10px; background: var(--tree-header-bg); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 10;';
            
            seasons.forEach(sNum => {
                const navBtn = document.createElement('button');
                navBtn.className = 'control-btn';
                navBtn.textContent = `S${sNum}`;
                navBtn.title = `Jump to Season ${sNum}`;
                navBtn.onclick = () => {
                    const el = this.elements.episodeTree.querySelector(`.season-container[data-season-container="${sNum}"]`);
                    if (el) {
                        el.classList.remove('collapsed');
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                };
                seasonNav.appendChild(navBtn);
            });
            this.elements.episodeTree.appendChild(seasonNav);
        }

        seasons.forEach((seasonNum, index) => {
            const season = this.state.availableEpisodes[seasonNum];
            const seasonContainer = document.createElement('div');
            
            // On AniWorld, "filme" might be season 0 or similar. Let's ensure we collapse anything but index 0
            seasonContainer.className = 'season-container' + (index > 0 ? ' collapsed' : '');
            seasonContainer.dataset.seasonContainer = seasonNum;
            seasonContainer.innerHTML = `
                <div class="season-header" data-season="${seasonNum}">
                    <input type="checkbox" class="season-checkbox" id="season-${seasonNum}">
                    <label for="season-${seasonNum}" class="season-label">Season ${seasonNum} (${season.length} episodes)</label>
                </div>
                <div class="episodes-container"></div>
            `;
            const header = seasonContainer.querySelector('.season-header');
            const epContainer = seasonContainer.querySelector('.episodes-container');

            // Toggle collapse logic
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking checkbox, label or language badges
                if (e.target.closest('.season-checkbox') || e.target.closest('.season-label') || e.target.closest('.season-lang-badge')) {
                    return;
                }
                seasonContainer.classList.toggle('collapsed');
            });

            seasonContainer.querySelector('.season-checkbox').addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSeason(seasonNum, e.target.checked);
            });

            seasonContainer.querySelector('.season-label').addEventListener('click', (e) => {
                e.stopPropagation();
            });

            season.forEach(episode => {
                const epItem = document.createElement('div');
                epItem.className = 'episode-item-tree';
                const epId = `${episode.season}-${episode.episode}`;
                epItem.innerHTML = `
                    <div class="episode-checkbox-wrapper">
                        <input type="checkbox" class="episode-checkbox" id="episode-${epId}">
                        <label for="episode-${epId}" class="episode-label">${episode.title}</label>
                    </div>
                    <div class="episode-lang-wrapper" data-episode-url="${episode.url}">
                        <div class="episode-lang-badges"></div>
                        <div class="episode-provider-wrapper" data-episode-url="${episode.url}">
                            <div class="episode-provider-badges"></div>
                        </div>
                    </div>
                `;
                epItem.querySelector('.episode-checkbox').addEventListener('change', (e) => this.toggleEpisode(episode, e.target.checked));
                this.createLanguageBadges(epItem.querySelector('.episode-lang-badges'), episode.languages, episode.url);
                this.createProviderBadges(epItem.querySelector('.episode-provider-badges'), episode.providers, episode.url);
                epContainer.appendChild(epItem);
                if (!episode.languages || episode.languages.length === 0) episodesToVerify.push(episode);
            });
            this.elements.episodeTree.appendChild(seasonContainer);
            this.updateSeasonLanguageBadges(seasonNum);
        });
        this.updateSelectedCount();
        if (episodesToVerify.length > 0) this.autoVerifyEpisodeLanguages(episodesToVerify);
    },

    updateSeasonLanguageBadges(seasonNum) {
        const season = this.state.availableEpisodes[seasonNum];
        const header = this.elements.episodeTree.querySelector(`.season-header[data-season="${seasonNum}"]`);
        if (!season || !header) return;

        let badgesContainer = header.querySelector('.season-lang-badges') || document.createElement('div');
        badgesContainer.className = 'season-lang-badges';
        if (!header.querySelector('.season-lang-badges')) header.appendChild(badgesContainer);

        const allLangs = new Set();
        season.forEach(ep => ep.languages?.forEach(l => allLangs.add(l)));
        if (allLangs.size === 0) { badgesContainer.innerHTML = ''; return; }

        badgesContainer.innerHTML = '';
        Array.from(allLangs).sort().forEach(lang => {
            const badge = document.createElement('span');
            badge.className = 'season-lang-badge';
            badge.textContent = lang.replace('German', 'DE').replace('English', 'EN').replace('Dub', 'Dub').replace('Sub', 'Sub');
            badge.title = `Select ${lang} for all episodes in Season ${seasonNum}`;
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                season.forEach(ep => {
                    if (ep.languages?.includes(lang)) {
                        this.state.episodeLanguageSelections[ep.url] = lang;
                        const epLangWrapper = document.querySelector(`.episode-lang-wrapper[data-episode-url="${ep.url}"]`);
                        epLangWrapper?.querySelectorAll('.lang-badge').forEach(b => b.classList.toggle('active', b.title === lang));
                    }
                });
                badgesContainer.querySelectorAll('.season-lang-badge').forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
            });
            badgesContainer.appendChild(badge);
        });
    },

    toggleSeason(seasonNum, isChecked) {
        this.state.availableEpisodes[seasonNum].forEach(episode => {
            const cb = document.getElementById(`episode-${episode.season}-${episode.episode}`);
            if (cb) { cb.checked = isChecked; this.toggleEpisode(episode, isChecked); }
        });
    },

    toggleEpisode(episode, isSelected) {
        const key = `${episode.season}-${episode.episode}`;
        if (isSelected) this.state.selectedEpisodes.add(key); else this.state.selectedEpisodes.delete(key);
        this.updateSeasonCheckboxState(episode.season);
        this.updateSelectedCount();
    },

    updateSeasonCheckboxState(seasonNum) {
        const season = this.state.availableEpisodes[seasonNum];
        const cb = document.getElementById(`season-${seasonNum}`);
        if (!cb || !season) return;
        const selectedInSeason = season.filter(ep => this.state.selectedEpisodes.has(`${ep.season}-${ep.episode}`));
        cb.checked = selectedInSeason.length === season.length;
        cb.indeterminate = selectedInSeason.length > 0 && selectedInSeason.length < season.length;
    },

    selectAll() {
        Object.values(this.state.availableEpisodes).flat().forEach(ep => {
            const key = `${ep.season}-${ep.episode}`;
            const cb = document.getElementById(`episode-${key}`);
            if (cb) { cb.checked = true; this.state.selectedEpisodes.add(key); }
        });
        Object.keys(this.state.availableEpisodes).forEach(s => this.updateSeasonCheckboxState(s));
        this.updateSelectedCount();
    },

    deselectAll() {
        this.state.selectedEpisodes.clear();
        this.elements.episodeTree.querySelectorAll('.episode-checkbox, .season-checkbox').forEach(cb => { cb.checked = false; cb.indeterminate = false; });
        this.updateSelectedCount();
    },

    updateSelectedCount() {
        const count = this.state.selectedEpisodes.size;
        const isTrackerEnabled = this.elements.trackCheckbox?.checked;
        if (this.elements.selectedCount) this.elements.selectedCount.textContent = `${count} items selected`;
        if (this.elements.confirmBtn) {
            this.elements.confirmBtn.disabled = (count === 0 && !isTrackerEnabled);
            this.elements.confirmBtn.textContent = count > 0 ? 'Start Download' : (isTrackerEnabled ? 'Add Tracker' : 'Start Download');
        }
    },

    async startDownload() {
        const isTrackerEnabled = this.elements.trackCheckbox?.checked;
        const count = this.state.selectedEpisodes.size;

        if (!this.state.currentDownloadData || (count === 0 && !isTrackerEnabled)) {
            showNotification('Please select at least one episode to download or enable tracking', 'error');
            return;
        }

        this.elements.confirmBtn.disabled = true;
        this.elements.confirmBtn.textContent = count > 0 ? 'Starting...' : 'Adding...';

        const trackingLang = this.elements.trackerLanguage?.value || 'German Dub';

        if (count === 0 && isTrackerEnabled) {
            const defaultProv = this.state.currentDownloadData.site === 's.to' ? 'VOE' : 'VOE'; // Fallback
            
            const success = await Trackers.addTrackerForSeries(this.state.currentDownloadData, this.state.availableEpisodes, trackingLang, defaultProv);
            if (success) this.hideModal();
            this.elements.confirmBtn.disabled = false;
            this.updateSelectedCount();
            return;
        }

        const selectedUrls = [];
        const episodesConfig = {};
        
        // Use first selected episode's language or preferred language for overall request (though episodesConfig overrides)
        const sitePrefs = this.state.currentDownloadData.site === 's.to' ? this.state.languagePreferences.sto : this.state.languagePreferences.aniworld;
        let overallLang = sitePrefs && sitePrefs.length > 0 ? sitePrefs[0] : (this.state.currentDownloadData.site === 's.to' ? 'German Dub' : 'German Sub');
        let overallProv = 'VOE';

        this.state.selectedEpisodes.forEach(key => {
            const [s, e] = key.split('-').map(Number);
            const epData = this.state.availableEpisodes[s]?.find(item => item.season === s && item.episode === e);
            if (epData) {
                selectedUrls.push(epData.url);
                const epLang = this.state.episodeLanguageSelections[epData.url] || overallLang;
                const epProv = this.state.episodeProviderSelections[epData.url] || (epData.providers && epData.providers.length > 0 ? epData.providers[0] : overallProv);
                episodesConfig[epData.url] = { language: epLang, provider: epProv };
                overallLang = epLang; // Use the last one as representative
                overallProv = epProv;
            }
        });

        try {
            const data = await API.startDownload({
                episode_urls: selectedUrls,
                language: overallLang,
                provider: overallProv,
                anime_title: this.state.currentDownloadData.anime,
                episodes_config: episodesConfig
            });
            if (data.success) {
                showNotification(`Download started for ${selectedUrls.length} episodes`, 'success');
                if (isTrackerEnabled) await Trackers.addTrackerForSeries(this.state.currentDownloadData, this.state.availableEpisodes, trackingLang, overallProv);
                this.hideModal();
                Queue.startTracking();
            } else { showNotification(data.error || 'Download failed', 'error'); }
        } catch (err) { showNotification('Failed to start download', 'error'); }
        finally {
            this.elements.confirmBtn.disabled = false;
            this.elements.confirmBtn.textContent = 'Start Download';
        }
    }
};
