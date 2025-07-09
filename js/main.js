import { fetchData } from './api.js';
import { elements, switchView, renderGrid, updateResultButtons, IMAGE_BASE_URL, YOUTUBE_BASE_URL, showErrorView, renderPagination, displayRatingModal, updateStars, generateGenreFilters } from './ui.js';
import { startQuiz, nextQuestion, selectOption } from './quiz.js';
import { getFromStorage, addToStorage, removeFromStorage, isInStorage } from './storage.js';

const state = {
    currentView: 'landing-view',
    currentMedia: null,
    currentSearch: { query: '', page: 1, totalPages: 1 },
    mediaToRate: null,
};

export async function displayResult(mediaId, mediaType) {
    switchView('loading-view');
    try {
        const [details, credits, recommendations, videos] = await Promise.all([
            fetchData(`${mediaType}/${mediaId}`),
            fetchData(`${mediaType}/${mediaId}/credits`),
            fetchData(`${mediaType}/${mediaId}/recommendations`),
            fetchData(`${mediaType}/${mediaId}/videos`)
        ]);

        state.currentMedia = { id: mediaId, type: mediaType, details: details };
        
        const title = details.title || details.name;
        const releaseDate = details.release_date || details.first_air_date || '';
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
        
        elements.mediaPoster.src = details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : 'https://via.placeholder.com/500x750.png?text=No+Poster';
        elements.mediaTitle.textContent = title;
        elements.mediaDetails.textContent = `${year} - ⭐ ${rating}`;
        elements.mediaOverview.textContent = details.overview || "No overview available.";
        
        const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        elements.mediaTrailerLink.href = trailer ? `${YOUTUBE_BASE_URL}${trailer.key}` : '#';
        elements.mediaTrailerLink.style.display = trailer ? 'inline-flex' : 'none';
        
        updateResultButtons(state.currentMedia);
        
        elements.castGrid.innerHTML = '';
        if (credits && credits.cast) {
            credits.cast.slice(0, 10).forEach(member => {
                const castCard = document.createElement('div');
                castCard.className = 'cast-card';
                castCard.innerHTML = `<img src="${member.profile_path ? IMAGE_BASE_URL + member.profile_path : 'https://via.placeholder.com/150'}" alt="${member.name}"><div class="cast-info"><p class="cast-name">${member.name}</p><p class="cast-character">${member.character}</p></div>`;
                elements.castGrid.appendChild(castCard);
            });
        }
        
        renderGrid(elements.recommendationsGrid, recommendations.results);
        switchView('result-view');
    } catch (error) {
        showErrorView("Could not load media details. Please try again.");
    }
}

async function handleSearch(page = 1) {
    const query = elements.searchInput.value.trim();
    if (!query) return;
    switchView('loading-view');
    state.currentSearch.query = query;
    try {
        const data = await fetchData('search/multi', { query, page });
        state.currentSearch.page = page;
        state.currentSearch.totalPages = data.total_pages;
        renderGrid(elements.searchResultsGrid, data.results);
        renderPagination(page, state.currentSearch.totalPages, handleSearch);
        switchView('search-results-view');
    } catch (error) {
        showErrorView("Search failed. Please try again.");
    }
}

function showWatchlist() {
    switchView('watchlist-view');
    const toWatch = getFromStorage('watchlist');
    const watched = getFromStorage('watchedList');
    generateGenreFilters([...toWatch, ...watched], applyWatchlistFilter);
    applyWatchlistFilter('all');
}

function applyWatchlistFilter(filterType, genreName = null) {
    const filterButtons = document.querySelectorAll('#watchlist-filters .filter-btn, #genre-filters .filter-btn');
    filterButtons.forEach(btn => {
        const isGenreBtn = btn.dataset.filter === 'genre';
        const isActive = isGenreBtn
            ? (filterType === 'genre' && btn.dataset.genre === genreName)
            : (btn.dataset.filter === filterType && !isGenreBtn);
        btn.classList.toggle('active', isActive);
    });

    const toWatchList = getFromStorage('watchlist');
    const watchedList = getFromStorage('watchedList');
    let filteredList = [];

    switch(filterType) {
        case 'towatch':
            filteredList = toWatchList;
            break;
        case 'watched':
            filteredList = watchedList;
            break;
        case 'genre':
            const allItems = [...toWatchList, ...watchedList];
            filteredList = allItems.filter(item => {
                const genres = item.details?.genres || item.genres;
                return genres?.some(g => g.name === genreName);
            });
            break;
        case 'all':
        default:
            filteredList = [...toWatchList, ...watchedList];
            break;
    }
    renderGrid(elements.watchlistGrid, filteredList, 'watchlist');
}

function handleCardButtonClick(event) {
    const button = event.target.closest('.card-watchlist-btn');
    if (!button) return;
    const { id, type, title, poster_path } = button.dataset;
    const item = { id: parseInt(id), type, title, poster_path: poster_path === 'null' ? null : poster_path };
    if (isInStorage('watchlist', item.id) || isInStorage('watchedList', item.id)) {
        removeFromStorage('watchlist', item.id);
        removeFromStorage('watchedList', item.id);
        button.classList.remove('active');
        button.textContent = '+';
    } else {
        addToStorage('watchlist', item);
        button.classList.add('active');
        button.textContent = '✓';
    }
    if (elements.watchlistView.classList.contains('active')) showWatchlist();
}

function handleSaveRating() {
    const rating = parseInt(elements.modalStars.dataset.rating);
    if (rating === 0) {
        alert("Please select a rating before saving.");
        return;
    }
    if (state.mediaToRate) {
        state.mediaToRate.rating = rating;
        addToStorage('watchedList', state.mediaToRate);
        removeFromStorage('watchlist', state.mediaToRate.id);
        displayRatingModal(false);
        updateResultButtons(state.currentMedia);
        state.mediaToRate = null;
    }
}

function setupEventListeners() {
    elements.homeBtn.addEventListener('click', () => switchView('landing-view'));
    elements.errorTryAgainBtn.addEventListener('click', () => switchView('landing-view'));
    elements.startQuizBtn.addEventListener('click', () => startQuiz(state, displayResult));
    elements.searchForm.addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
    elements.quizNextBtn.addEventListener('click', nextQuestion);
    elements.quizOptionsContainer.addEventListener('click', (e) => { if (e.target.matches('.btn')) selectOption(parseInt(e.target.dataset.index)); });

    [elements.searchResultsGrid, elements.recommendationsGrid, elements.watchlistGrid].forEach(grid => {
        grid.addEventListener('click', (e) => {
            if (e.target.closest('.card-watchlist-btn')) handleCardButtonClick(e);
            else if (e.target.closest('[data-id]')) {
                const { id, type } = e.target.closest('[data-id]').dataset;
                if (id && type) displayResult(parseInt(id), type);
            }
        });
    });

    elements.markAsWatchedBtn.addEventListener('click', () => {
        const { id, details } = state.currentMedia;
        if (isInStorage('watchedList', id)) {
            removeFromStorage('watchedList', id);
            updateResultButtons(state.currentMedia);
        } else {
            state.mediaToRate = { id, type: state.currentMedia.type, title: details.title || details.name, poster_path: details.poster_path, genres: details.genres };
            displayRatingModal(true);
        }
    });
    
    elements.addToWatchlistBtn.addEventListener('click', () => {
        const { id, details } = state.currentMedia;
        const itemToStore = { id, type: state.currentMedia.type, title: details.title || details.name, poster_path: details.poster_path, genres: details.genres };
        if (isInStorage('watchlist', id)) {
            removeFromStorage('watchlist', id);
        } else {
            addToStorage('watchlist', itemToStore);
            removeFromStorage('watchedList', id);
        }
        updateResultButtons(state.currentMedia);
    });

    elements.closeModalBtn.addEventListener('click', () => displayRatingModal(false));
    elements.saveRatingBtn.addEventListener('click', handleSaveRating);
    elements.modalStars.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN') {
            const rating = e.target.dataset.value;
            updateStars(rating);
        }
    });

    elements.watchlistFilters.addEventListener('click', (e) => {
        if(e.target.matches('.filter-btn')) {
            applyWatchlistFilter(e.target.dataset.filter, e.target.dataset.genre);
        }
    });
    
    elements.watchlistBtn.addEventListener('click', showWatchlist);
}

function init() {
    setupEventListeners();
    switchView('landing-view');
}

init();