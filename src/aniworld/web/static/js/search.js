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
        homeLoading: document.getElementById('home-loading')
    },

    async performSearch() {
        const query = this.elements.searchInput.value.trim();
        if (!query) {
            UI.showHomeContent();
            return;
        }

        const siteRadios = document.querySelectorAll('input[name="site"]');
        let selectedSite = "both";
        siteRadios.forEach(r => { if(r.checked) selectedSite = r.value; });

        UI.showLoadingState();
        this.elements.searchBtn.disabled = true;
        this.elements.searchBtn.textContent = 'Searching...';

        try {
            const data = await API.search(query, selectedSite);
            if (!data) return;
            if (data.success) {
                this.displaySearchResults(data.results);
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
            return;
        }
        this.elements.resultsContainer.innerHTML = '';
        results.forEach(anime => {
            const animeCard = this.createAnimeCard(anime);
            this.elements.resultsContainer.appendChild(animeCard);
        });
        UI.showResultsSection();
    },

    createAnimeCard(anime) {
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
                    <button class="download-btn">
                        <span class="btn-text">Download</span>
                        <i class="fas fa-spinner fa-spin btn-loader" style="display: none;"></i>
                    </button>
                </div>
            </div>
        `;

        card.querySelector('.download-btn').addEventListener('click', (e) => {
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
