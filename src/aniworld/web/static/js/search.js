/**
 * search.js - Search functionality for Aniworld-STO-Downloader Web Interface
 */

import API from './api.js';
import { UI, escapeHtml, showNotification } from './ui.js';

export const Search = {
    elements: {
        searchInput: document.getElementById('search-input'),
        searchBtn: document.getElementById('search-btn'),
        resultsContainer: document.getElementById('results-container'),
        popularAnimeGrid: document.getElementById('popular-anime-grid'),
        newAnimeGrid: document.getElementById('new-anime-grid'),
        popularNewSections: document.getElementById('popular-new-sections'),
        homeLoading: document.getElementById('home-loading'),
        filterSection: document.getElementById('filter-section'),
        resultsCount: document.getElementById('results-count')
    },

    currentResults: [],
    currentFilter: 'all',

    init() {
        // Filter button listeners
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.applyFilter();
            });
        });
    },

    async performSearch() {
        const query = this.elements.searchInput.value.trim();
        if (!query) {
            UI.showHomeContent();
            if (this.elements.filterSection) this.elements.filterSection.style.display = 'none';
            return;
        }

        const siteRadios = document.querySelectorAll('input[name="site"]');
        let selectedSite = "both";
        siteRadios.forEach(r => { if(r.checked) selectedSite = r.value; });

        UI.showLoadingState();
        if (this.elements.filterSection) this.elements.filterSection.style.display = 'none';
        this.elements.searchBtn.disabled = true;
        this.elements.searchBtn.textContent = 'Searching...';

        try {
            const data = await API.search(query, selectedSite);
            if (!data) return;
            if (data.success) {
                this.currentResults = data.results;
                this.applyFilter(); // This calls displaySearchResults
                if (this.elements.filterSection) this.elements.filterSection.style.display = 'flex';
            } else {
                showNotification(data.error || 'Search failed', 'error');
                UI.showEmptyState();
            }
        } catch (error) {
            console.error('Search error:', error);
            showNotification('Search failed. Please try again.', 'error');
            UI.showEmptyState();
        } finally {
            this.elements.searchBtn.disabled = false;
            this.elements.searchBtn.textContent = 'Search';
            UI.hideLoadingState();
        }
    },

    displaySearchResults(results) {
        if (!results || results.length === 0) {
            UI.showEmptyState();
            if (this.elements.resultsCount) this.elements.resultsCount.textContent = 'No results found';
            return;
        }
        this.elements.resultsContainer.innerHTML = '';
        results.forEach(anime => {
            const animeCard = this.createAnimeCard(anime);
            this.elements.resultsContainer.appendChild(animeCard);
        });
        if (this.elements.resultsCount) {
            this.elements.resultsCount.textContent = `Found ${results.length} result(s)`;
        }
        UI.showResultsSection();
    },

    applyFilter() {
        let filtered = this.currentResults;
        if (this.currentFilter === 'series') {
            filtered = this.currentResults.filter(r => r.site !== 'tmdb');
        } else if (this.currentFilter === 'movies') {
            filtered = this.currentResults.filter(r => r.site === 'tmdb');
        }
        this.displaySearchResults(filtered);
    },

    createAnimeCard(anime) {
        const card = document.createElement('div');
        card.className = 'anime-card';
        
        let coverUrl = '';
        if (anime.site === 'tmdb') {
            // TMDB Poster URL format
            if (anime.cover) {
                coverUrl = `https://image.tmdb.org/t/p/w1280${anime.cover}`;
            }
        } else if (anime.cover) {
            coverUrl = anime.cover;
            if (!coverUrl.startsWith('http')) {
                const baseUrl = anime.site === 's.to' ? 'https://s.to' : 'https://aniworld.to';
                if (coverUrl.startsWith('//')) coverUrl = 'https:' + coverUrl;
                else if (coverUrl.startsWith('/')) coverUrl = baseUrl + coverUrl;
                else coverUrl = baseUrl + '/' + coverUrl;
            }
            coverUrl = coverUrl.replace("150x225", "220x330");
        }

        const isMovie = anime.site === 'tmdb';

        card.innerHTML = `
            <div class="anime-card-poster">
                ${coverUrl ? `<img src="${coverUrl}" alt="${escapeHtml(anime.title)}">` : `<div class="no-poster"><i class="fas fa-film"></i></div>`}
                ${anime.rating ? `<div class="card-rating"><i class="fas fa-star"></i> ${anime.rating.toFixed(1)}</div>` : ''}
            </div>
            <div class="anime-card-content">
                <div class="anime-title">${escapeHtml(anime.title)}</div>
                <div class="anime-info">
                    <span class="site-badge ${escapeHtml(anime.site || 'aniworld.to').replace('.', '-')}">${escapeHtml(anime.site || 'aniworld.to')}</span>
                    ${anime.release_date ? `<span class="release-date"><i class="far fa-calendar-alt"></i> ${escapeHtml(anime.release_date)}</span>` : ''}
                    <br>
                    ${isMovie ? `<strong>Type:</strong> Movie<br>` : `<strong>Slug:</strong> ${escapeHtml(anime.slug || 'Unknown')}<br>`}
                </div>
                <div class="anime-description">
                    ${escapeHtml(anime.description || 'No description available.')}
                </div>
                <div class="anime-actions">
                    <button class="download-btn">
                        <span class="btn-text">Download</span>
                        <i class="fas fa-spinner fa-spin btn-loader" style="display: none;"></i>
                    </button>
                </div>
            </div>
        `;

        const downloadBtn = card.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                if (btn.classList.contains('loading')) return;

                if (window.showDownloadModal) {
                    btn.classList.add('loading');
                    const text = btn.querySelector('.btn-text');
                    const loader = btn.querySelector('.btn-loader');
                    if (text) text.style.display = 'none';
                    if (loader) loader.style.display = 'inline-block';

                    window.showDownloadModal(anime.title, 'Series', anime.url);
                }
            });
        }
        return card;
    },

    async loadPopularAndNewAnime() {
        if (this.elements.homeLoading) this.elements.homeLoading.style.display = 'block';
        try {
            const data = await API.getPopularNew();
            if (data.success) {
                this.elements.popularAnimeGrid.innerHTML = '';
                this.elements.newAnimeGrid.innerHTML = '';
                data.popular.slice(0, 8).forEach(a => this.elements.popularAnimeGrid.appendChild(this.createHomeAnimeCard(a)));
                data.new.slice(0, 8).forEach(a => this.elements.newAnimeGrid.appendChild(this.createHomeAnimeCard(a)));
                this.elements.popularNewSections.style.display = 'block';
                UI.showHomeContent();
            }
        } catch (error) {
            console.error('Failed to load popular/new anime:', error);
        } finally {
            if (this.elements.homeLoading) this.elements.homeLoading.style.display = 'none';
        }
    },

    createHomeAnimeCard(anime) {
        const card = document.createElement('div');
        card.className = 'home-anime-card';
        let coverUrl = anime.cover || '';
        coverUrl = coverUrl.replace('_150x225.png', '_220x330.png');
        card.innerHTML = `
            <div class="home-anime-cover"><img src="${coverUrl}" loading="lazy"></div>
            <div class="home-anime-title">${escapeHtml(anime.name)}</div>
        `;
        card.addEventListener('click', () => {
            this.elements.searchInput.value = anime.name;
            this.performSearch();
        });
        return card;
    }
};

// Initialize search listeners
Search.init();
