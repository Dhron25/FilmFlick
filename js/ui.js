import { isInStorage } from './storage.js';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const YOUTUBE_BASE_URL = 'https://www.youtube.com/watch?v=';
const NO_POSTER_URL = 'https://via.placeholder.com/500x750.png?text=No+Poster';

export const elements = {
    header: document.querySelector('header'),
    views: document.querySelectorAll('.view'),
    homeBtn: document.getElementById('home-btn'),
    watchlistBtn: document.getElementById('watchlist-btn'),
    startQuizBtn: document.getElementById('start-quiz-btn'),
    errorTryAgainBtn: document.getElementById('error-try-again-btn'),
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    landingView: document.getElementById('landing-view'),
    quizView: document.getElementById('quiz-view'),
    loadingView: document.getElementById('loading-view'),
    resultView: document.getElementById('result-view'),
    searchResultsView: document.getElementById('search-results-view'),
    errorView: document.getElementById('error-view'),
    watchlistView: document.getElementById('watchlist-view'),
    actorView: document.getElementById('actor-view'),
    quizQuestion: document.getElementById('quiz-question'),
    quizOptionsContainer: document.getElementById('quiz-options-container'),
    quizNextBtn: document.getElementById('quiz-next-btn'),
    mediaPoster: document.getElementById('media-poster'),
    mediaTitle: document.getElementById('media-title'),
    mediaDetails: document.getElementById('media-details'),
    mediaOverview: document.getElementById('media-overview'),
    mediaTrailerLink: document.getElementById('media-trailer-link'),
    markAsWatchedBtn: document.getElementById('mark-as-watched-btn'),
    addToWatchlistBtn: document.getElementById('add-to-watchlist-btn'),
    castGrid: document.getElementById('media-cast-grid'),
    recommendationsGrid: document.getElementById('recommendations-grid'),
    searchResultsGrid: document.getElementById('search-results-grid'),
    paginationControls: document.getElementById('pagination-controls'),
    watchlistGrid: document.getElementById('watchlist-grid'),
    errorMessage: document.getElementById('error-message'),
    watchlistFilters: document.getElementById('watchlist-filters'),
    genreFilters: document.getElementById('genre-filters'),
    ratingModal: document.getElementById('rating-modal'),
    modalStars: document.querySelector('.stars'),
    saveRatingBtn: document.getElementById('save-rating-btn'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    actorPhoto: document.getElementById('actor-photo'),
    actorName: document.getElementById('actor-name'),
    actorBio: document.getElementById('actor-bio'),
    actorFilmographyGrid: document.getElementById('actor-filmography-grid'),
};

export function switchView(viewId) {
    elements.views.forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    elements.header.style.display = viewId === 'landing-view' ? 'none' : 'flex';
    window.scrollTo(0, 0);
}

export function showErrorView(message = "Something went wrong.") {
    elements.errorMessage.textContent = message;
    switchView('error-view');
}

export function displayRatingModal(show) {
    elements.ratingModal.style.display = show ? 'flex' : 'none';
    if (show) {
        updateStars(0);
    }
}

export function updateStars(rating) {
    elements.modalStars.dataset.rating = rating;
    elements.modalStars.querySelectorAll('span').forEach(star => {
        star.textContent = star.dataset.value <= rating ? '★' : '☆';
        star.classList.toggle('active', star.dataset.value <= rating);
    });
}

export function createMediaCard(item) {
    const card = document.createElement('div');
    card.className = 'search-result-card grid-item';
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
    const title = item.title || item.name;
    const posterPath = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : NO_POSTER_URL;
    const inWatchlist = isInStorage('watchlist', item.id) || isInStorage('watchedList', item.id);
    
    let ratingDisplay = '';
    if (item.rating) {
        const filledStars = '★'.repeat(item.rating);
        const emptyStars = '☆'.repeat(5 - item.rating);
        ratingDisplay = `<div class="card-rating">${filledStars}${emptyStars}</div>`;
    }

    card.innerHTML = `
        <div class="card-poster-wrapper">
            <img src="${posterPath}" alt="${title}" data-id="${item.id}" data-type="${mediaType}">
        </div>
        ${ratingDisplay}
        <p data-id="${item.id}" data-type="${mediaType}">${title}</p>
        <button class="card-watchlist-btn ${inWatchlist ? 'active' : ''}" data-id="${item.id}" data-type="${mediaType}" data-title="${title}" data-poster_path="${item.poster_path || ''}" title="Add to Watchlist">${inWatchlist ? '✓' : '+'}</button>
    `;
    return card;
}

export function renderGrid(container, items) {
    container.innerHTML = '';
    if (items && items.length > 0) {
        items.forEach(item => {
            if (item.media_type === 'person' || (!item.poster_path && container !== elements.watchlistGrid)) return;
            container.appendChild(createMediaCard(item));
        });
    } else {
         container.innerHTML = container === elements.watchlistGrid ? '<p>No items match your filter.</p>' : '<p>No results found.</p>';
    }
}

export function generateGenreFilters(items, filterFn) {
    elements.genreFilters.innerHTML = '';
    if (!items || items.length === 0) return;

    const allGenres = new Set();
    items.forEach(item => {
        const genres = item.details?.genres || item.genres;
        if(genres) {
            genres.forEach(g => allGenres.add(g.name));
        }
    });

    [...allGenres].sort().forEach(genre => {
        const button = document.createElement('button');
        button.className = 'btn filter-btn';
        button.textContent = genre;
        button.dataset.filter = 'genre';
        button.dataset.genre = genre;
        button.addEventListener('click', () => filterFn('genre', genre));
        elements.genreFilters.appendChild(button);
    });
}

export function updateResultButtons(currentMedia) {
    if (!currentMedia) return;
    const { id } = currentMedia;
    const isWatched = isInStorage('watchedList', id);
    elements.markAsWatchedBtn.textContent = isWatched ? 'Watched' : 'Mark as Watched';
    elements.markAsWatchedBtn.classList.toggle('active', isWatched);
    const inWatchlist = isInStorage('watchlist', id);
    elements.addToWatchlistBtn.textContent = inWatchlist ? 'In Watchlist' : 'Add to Watchlist';
    elements.addToWatchlistBtn.classList.toggle('active', inWatchlist);
}

export function renderPagination(page, totalPages, handleSearchFn) {
    elements.paginationControls.innerHTML = '';
    if (totalPages <= 1) return;
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.className = 'btn btn-secondary';
    prevBtn.disabled = page === 1;
    prevBtn.addEventListener('click', () => handleSearchFn(page - 1));
    const pageInfo = document.createElement('span');
    pageInfo.id = 'page-info';
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'btn btn-secondary';
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener('click', () => handleSearchFn(page + 1));
    elements.paginationControls.append(prevBtn, pageInfo, nextBtn);
}