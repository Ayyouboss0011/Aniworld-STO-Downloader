/**
 * download.js - Download modal and episode management for lankabeltv Web Interface
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
        languagePreferences: { aniworld: [], sto: [] },
        availableProviders: []
    },

    elements: {
        downloadModal: document.getElementById('download-modal'),
        animeTitle: document.getElementById('download-anime-title'),
        languageSelect: document.getElementById('language-select'),
        providerSelect: document.getElementById('provider-select'),
        episodeTree: document.getElementById('episode-tree'),
        episodeTreeLoading: document.getElementById('episode-tree-loading'),
        selectedCount: document.getElementById('selected-episode-count'),
        confirmBtn: document.getElementById('confirm-download'),
        trackCheckbox: document.getElementById('track-series-checkbox'),
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
        let detectedSite = episodeUrl.includes('/serie/stream/') || episodeUrl.includes('186.2.175.5') ? 's.to' : 'aniworld.to';
        this.state.currentDownloadData = { anime: animeTitle, episode: episodeTitle, url: episodeUrl, site: detectedSite };
        this.state.selectedEpisodes.clear();
        this.state.availableEpisodes = {};
        this.state.episodeLanguageSelections = {};

        if (this.elements.animeTitle) this.elements.animeTitle.textContent = animeTitle;
        this.populateLanguageDropdown(detectedSite);
        this.populateProviderDropdown(detectedSite);

        if (this.elements.episodeTreeLoading) this.elements.episodeTreeLoading.style.display = 'flex';
        if (this.elements.episodeTree) this.elements.episodeTree.style.display = 'none';
        this.updateSelectedCount();

        try {
            const pathData = await API.getDownloadPath();
            if (this.elements.downloadPath) this.elements.downloadPath.textContent = pathData.path;
        } catch (err) { console.error('Failed to load download path:', err); }

        try {
            const data = await API.getEpisodes(episodeUrl);
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
        this.state.currentDownloadData = null;
        this.state.selectedEpisodes.clear();
        this.state.availableEpisodes = {};
        this.state.availableMovies = [];
        this.state.episodeLanguageSelections = {};
        if (this.elements.trackCheckbox) this.elements.trackCheckbox.checked = false;

        // Reset all download button loaders
        document.querySelectorAll('.download-btn.loading').forEach(btn => {
            btn.classList.remove('loading');
            const text = btn.querySelector('.btn-text');
            const loader = btn.querySelector('.btn-loader');
            if (text) text.style.display = 'inline-block';
            if (loader) loader.style.display = 'none';
        });
    },

    populateProviderDropdown(site, availableList = null) {
        if (!this.elements.providerSelect) return;

        let siteProviders = availableList || (site === 's.to' ? ['VOE'] : ['VOE', 'Filemoon', 'Vidmoly']);
        const currentValue = this.elements.providerSelect.value;
        this.elements.providerSelect.innerHTML = '';
        
        siteProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider;
            this.elements.providerSelect.appendChild(option);
        });

        if (availableList && availableList.includes(currentValue)) {
            this.elements.providerSelect.value = currentValue;
        } else if (siteProviders.length > 0) {
            this.elements.providerSelect.value = siteProviders[0];
        }
    },

    populateLanguageDropdown(site, availableList = null) {
        if (!this.elements.languageSelect) return;

        let availableLanguages = availableList || (site === 's.to' ? ['German Dub', 'English Dub'] : ['German Dub', 'English Sub', 'German Sub']);
        const currentValue = this.elements.languageSelect.value;
        this.elements.languageSelect.innerHTML = '';

        availableLanguages.forEach(language => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            this.elements.languageSelect.appendChild(option);
        });

        const sitePrefs = site === 's.to' ? this.state.languagePreferences.sto : this.state.languagePreferences.aniworld;
        let preferredLang = sitePrefs?.find(pref => availableLanguages.includes(pref));

        if (preferredLang) {
            this.elements.languageSelect.value = preferredLang;
        } else if (availableList) {
            if (availableList.includes(currentValue)) {
                this.elements.languageSelect.value = currentValue;
            } else if (availableList.includes('German Sub')) {
                this.elements.languageSelect.value = 'German Sub';
            } else if (availableList.includes('German Dub')) {
                this.elements.languageSelect.value = 'German Dub';
            } else if (availableLanguages.length > 0) {
                this.elements.languageSelect.value = availableLanguages[0];
            }
        } else {
            setTimeout(() => {
                this.elements.languageSelect.value = site === 's.to' ? 'German Dub' : 'German Sub';
            }, 0);
        }
    },

    async checkAvailability() {
        if (!this.state.currentDownloadData) return;

        let episodeUrl = null;
        if (this.state.selectedEpisodes.size > 0) {
            const firstKey = this.state.selectedEpisodes.values().next().value;
            const [s, e] = firstKey.split('-').map(Number);
            const epData = this.state.availableEpisodes[s]?.find(item => item.season === s && item.episode === e);
            if (epData) episodeUrl = epData.url;
        }
        
        if (!episodeUrl) {
            const seasons = Object.keys(this.state.availableEpisodes).sort((a, b) => Number(a) - Number(b));
            if (seasons.length > 0 && this.state.availableEpisodes[seasons[0]].length > 0) {
                episodeUrl = this.state.availableEpisodes[seasons[0]][0].url;
            }
        }

        if (!episodeUrl) {
            showNotification('No episodes available to check', 'error');
            return;
        }

        const btn = document.getElementById('check-availability-btn');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

        try {
            const data = await API.getEpisodeProviders(episodeUrl);
            if (data.success) {
                this.populateProviderDropdown(this.state.currentDownloadData.site, data.providers);
                this.populateLanguageDropdown(this.state.currentDownloadData.site, data.languages);
                
                const episodesToVerify = Object.values(this.state.availableEpisodes).flat();
                if (episodesToVerify.length > 0) {
                    this.autoVerifyEpisodeLanguages(episodesToVerify);
                }
                showNotification(`Found ${data.providers.length} providers and ${data.languages.length} languages`, 'success');
            } else {
                showNotification(data.error || 'Failed to check availability', 'error');
            }
        } catch (error) {
            console.error('Check availability error:', error);
            showNotification('Failed to check availability', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    },

    async autoVerifyEpisodeLanguages(episodes) {
        const batchSize = 3;
        for (let i = 0; i < episodes.length; i += batchSize) {
            const batch = episodes.slice(i, i + batchSize);
            await Promise.all(batch.map(async (ep) => {
                try {
                    const data = await API.getEpisodeProviders(ep.url);
                    if (data.success) {
                        const langWrapper = document.querySelector(`.episode-lang-wrapper[data-episode-url="${ep.url}"]`);
                        if (langWrapper) {
                            let badgesContainer = langWrapper.querySelector('.episode-lang-badges') || document.createElement('div');
                            badgesContainer.className = 'episode-lang-badges';
                            if (!langWrapper.querySelector('.episode-lang-badges')) langWrapper.appendChild(badgesContainer);
                            this.createLanguageBadges(badgesContainer, data.languages, ep.url);
                        }
                        const epInCache = this.state.availableEpisodes[ep.season]?.find(e => e.episode === ep.episode);
                        if (epInCache) epInCache.languages = data.languages;
                        this.updateSeasonLanguageBadges(ep.season);
                    }
                } catch (err) { console.error(`Auto-verify error for ${ep.season}x${ep.episode}:`, err); }
            }));
            if (i + batchSize < episodes.length) await new Promise(r => setTimeout(r, 500));
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
            selectedLang = sitePrefs?.find(pref => languages.includes(pref)) || this.elements.languageSelect.value;
            if (languages.length > 0 && !languages.includes(selectedLang)) selectedLang = languages[0];
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

    renderEpisodeTree() {
        if (this.elements.trackCheckbox && !this.elements.trackCheckbox.dataset.listenerAdded) {
            this.elements.trackCheckbox.addEventListener('change', () => this.updateSelectedCount());
            this.elements.trackCheckbox.dataset.listenerAdded = 'true';
        }
        this.elements.episodeTree.innerHTML = '';
        const episodesToVerify = [];

        Object.keys(this.state.availableEpisodes).sort((a, b) => Number(a) - Number(b)).forEach(seasonNum => {
            const season = this.state.availableEpisodes[seasonNum];
            const seasonContainer = document.createElement('div');
            seasonContainer.className = 'season-container';
            seasonContainer.innerHTML = `
                <div class="season-header" data-season="${seasonNum}">
                    <input type="checkbox" class="season-checkbox" id="season-${seasonNum}">
                    <label for="season-${seasonNum}" class="season-label">Season ${seasonNum} (${season.length} episodes)</label>
                </div>
                <div class="episodes-container"></div>
            `;
            const header = seasonContainer.querySelector('.season-header');
            const epContainer = seasonContainer.querySelector('.episodes-container');
            seasonContainer.querySelector('.season-checkbox').addEventListener('change', (e) => this.toggleSeason(seasonNum, e.target.checked));

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
                    </div>
                `;
                epItem.querySelector('.episode-checkbox').addEventListener('change', (e) => this.toggleEpisode(episode, e.target.checked));
                this.createLanguageBadges(epItem.querySelector('.episode-lang-badges'), episode.languages, episode.url);
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

        if (count === 0 && isTrackerEnabled) {
            const success = await Trackers.addTrackerForSeries(this.state.currentDownloadData, this.state.availableEpisodes, this.elements.languageSelect.value, this.elements.providerSelect.value);
            if (success) this.hideModal();
            this.elements.confirmBtn.disabled = false;
            this.updateSelectedCount();
            return;
        }

        const selectedUrls = [];
        const episodesConfig = {};
        const lang = this.elements.languageSelect.value;
        const prov = this.elements.providerSelect.value;

        this.state.selectedEpisodes.forEach(key => {
            const [s, e] = key.split('-').map(Number);
            const epData = this.state.availableEpisodes[s]?.find(item => item.season === s && item.episode === e);
            if (epData) {
                selectedUrls.push(epData.url);
                episodesConfig[epData.url] = { language: this.state.episodeLanguageSelections[epData.url] || lang, provider: prov };
            }
        });

        try {
            const data = await API.startDownload({
                episode_urls: selectedUrls,
                language: lang,
                provider: prov,
                anime_title: this.state.currentDownloadData.anime,
                episodes_config: episodesConfig
            });
            if (data.success) {
                showNotification(`Download started for ${selectedUrls.length} episodes`, 'success');
                if (isTrackerEnabled) await Trackers.addTrackerForSeries(this.state.currentDownloadData, this.state.availableEpisodes, lang, prov);
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
