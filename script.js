document.addEventListener('DOMContentLoaded', () => {
    
   
    const API_KEY = '58be003438126be75d16cfad1331d6c6';
    const API_BASE_URL = 'https://api.themoviedb.org/3';
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w185';
    const PLACEHOLDER_PERSON = 'https://via.placeholder.com/185x185?text=No+Image';
    const PLACEHOLDER_POSTER = 'https://via.placeholder.com/500x750?text=No+Poster';

    // --- DOM Element Selectors ---
    const body = document.body;
    const views = document.querySelectorAll('.view');
    const header = document.querySelector('header');      
    
    
    const homeBtn = document.getElementById('home-btn');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    
    const tryAgainBtn = document.getElementById('try-again-btn'); 
    const errorTryAgainBtn = document.getElementById('error-try-again-btn');
    const quizNextBtn = document.getElementById('quiz-next-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const watchlistBtn = document.getElementById('watchlist-btn'); 
    const addToWatchlistBtn = document.getElementById('add-to-watchlist-btn');
    const markAsWatchedBtn = document.getElementById('mark-as-watched-btn');
    
    
    const searchResultsGrid = document.getElementById('search-results-grid');
    const searchResultsTitle = document.querySelector('#search-results-view .result-title');
    const quizQuestionEl = document.getElementById('quiz-question');
    const quizOptionsContainer = document.getElementById('quiz-options-container');
    const watchlistGrid = document.getElementById('watchlist-grid');
    const paginationControls = document.getElementById('pagination-controls');

    
    const mediaPosterEl = document.getElementById('media-poster');
    const mediaTitleEl = document.getElementById('media-title');
    const mediaDetailsEl = document.getElementById('media-details');
    const mediaOverviewEl = document.getElementById('media-overview');
    const mediaTrailerLink = document.getElementById('media-trailer-link');
    const mediaCastGrid = document.getElementById('media-cast-grid');
    const recommendationsSection = document.getElementById('recommendations-section');
    const recommendationsGrid = document.getElementById('recommendations-grid');
    
    
    const errorMessageEl = document.getElementById('error-message');

    
    let currentQuizStep = 0;
    let userChoices = {};
    let watchlist = [];
    let watched = [];
    let currentSearchQuery = '';
    let currentSearchPage = 1;
    let totalSearchPages = 1;

    // --- QUIZ DATA ---
    const quizData = [
        { question: "Movie or TV Show?", key: 'mediaType', type: 'single-select', options: [{ text: "Movie", value: "movie" }, { text: "TV Show", value: "tv" }] },
        { question: "Select languages", key: 'language', type: 'single-select-lang' },
        { question: "Select one or more genres", key: 'genres', type: 'multi-select', options: [
                { text: "Action", value: "28" }, { text: "Adventure", value: "12" }, { text: "Animation", value: "16" },
                { text: "Comedy", value: "35" }, { text: "Crime", value: "80" }, { text: "Drama", value: "18" },
                { text: "Family", value: "10751" }, { text: "Fantasy", value: "14" }, { text: "Horror", value: "27" },
                { text: "Mystery", value: "9648" }, { text: "Romance", value: "10749" }, { text: "Sci-Fi", value: "878" },
                { text: "Thriller", value: "53" }
            ]
        },
        { question: "Which decade?", key: 'releaseDates', type: 'single-select', options: [
                { text: "2020s", value: { gte: '2020-01-01', lte: new Date().toISOString().split('T')[0] }},
                { text: "2010s", value: { gte: '2010-01-01', lte: '2019-12-31' }},
                { text: "2000s", value: { gte: '2000-01-01', lte: '2009-12-31' }},
                { text: "Any", value: { gte: null, lte: null }}
            ]
        }
    ];

    // --- CORE FUNCTIONS ---
    const showView = (viewId) => {
        window.scrollTo(0, 0);
        header.style.display = (viewId === 'landing-view') ? 'none' : 'flex';
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(viewId)?.classList.add('active');
    };
    
    const fetchFromAPI = async (endpoint, params = {}) => {
        const url = new URL(`${API_BASE_URL}/${endpoint}`);
        url.searchParams.append('api_key', API_KEY);
        for (const key in params) if (params[key]) url.searchParams.append(key, params[key]);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error((await response.json()).status_message);
            return await response.json();
        } catch (error) {
            console.error('API Fetch Error:', error);
            displayError(error.message); // This call will now work correctly.
            return null;
        }
    };

    // MODIFICATION 2: Added the missing displayError function.
    // This function shows the error view instead of crashing the script.
    const displayError = (message) => {
        errorMessageEl.textContent = `An error occurred: ${message}. This might be due to a network issue. Please try again later.`;
        showView('error-view');
    };
    
    // --- WATCHLIST & WATCHED LOGIC ---
    const loadLists = () => {
        watchlist = JSON.parse(localStorage.getItem('filmFlickWatchlist')) || [];
        watched = JSON.parse(localStorage.getItem('filmFlickWatched')) || [];
    };

    const saveWatchlist = () => localStorage.setItem('filmFlickWatchlist', JSON.stringify(watchlist));
    const saveWatched = () => localStorage.setItem('filmFlickWatched', JSON.stringify(watched));

    const toggleWatchlist = (mediaId, mediaType) => {
        const index = watchlist.findIndex(item => item.id === mediaId);
        if (index > -1) watchlist.splice(index, 1);
        else watchlist.push({ id: mediaId, type: mediaType });
        saveWatchlist();
        updateResultPageButtons(mediaId, mediaType);
    };

    const toggleWatched = (mediaId) => {
        const index = watched.indexOf(mediaId);
        if (index > -1) watched.splice(index, 1);
        else watched.push(mediaId);
        saveWatched();
    };

    const updateResultPageButtons = (mediaId, mediaType) => {
        const isInWatchlist = watchlist.some(item => item.id === mediaId);
        addToWatchlistBtn.textContent = isInWatchlist ? 'In Watchlist' : 'Add to Watchlist';
        addToWatchlistBtn.classList.toggle('active', isInWatchlist);

        const isWatched = watched.includes(mediaId);
        markAsWatchedBtn.textContent = isWatched ? 'Watched' : 'Mark as Watched';
        markAsWatchedBtn.classList.toggle('active', isWatched);

        addToWatchlistBtn.onclick = () => toggleWatchlist(mediaId, mediaType);
        markAsWatchedBtn.onclick = () => {
            toggleWatched(mediaId);
            updateResultPageButtons(mediaId, mediaType);
        };
    };
    
    const displayWatchlist = async () => {
        showView('loading-view');
        watchlistGrid.innerHTML = '';
        if (watchlist.length === 0) {
            watchlistGrid.innerHTML = '<p>Your watchlist is empty. Add some movies or shows to see them here!</p>';
            showView('watchlist-view');
            return;
        }
        const promises = watchlist.map(item => fetchFromAPI(`${item.type}/${item.id}`));
        const results = await Promise.all(promises);
        
        results.forEach((media, index) => {
            if (media) {
                const watchlistItem = watchlist.find(item => item.id === media.id);
                if (watchlistItem) {
                    media.media_type = watchlistItem.type;
                    watchlistGrid.appendChild(createMediaCard(media, index));
                }
            }
        });
        showView('watchlist-view');
    };

    
    const createMediaCard = (media, index = 0) => {  
        const card = document.createElement('div');
        card.className = 'search-result-card grid-item';
        card.style.animationDelay = `${index * 50}ms`;
        
        const isWatched = watched.includes(media.id);

        card.innerHTML = `
            <img src="${media.poster_path ? IMAGE_BASE_URL + media.poster_path : PLACEHOLDER_POSTER}" alt="Poster">
            <p>${media.title || media.name}</p>
            <button class="watched-btn ${isWatched ? 'active' : ''}" data-id="${media.id}">👁️</button>
        `;

        card.querySelector('img').addEventListener('click', () => displayRecommendedMedia(media));
        card.querySelector('p').addEventListener('click', () => displayRecommendedMedia(media));

        const watchedBtn = card.querySelector('.watched-btn');
        watchedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWatched(media.id);
            watchedBtn.classList.toggle('active');
        });

        return card;
    };
    
    const displayRecommendedMedia = async (media) => {
        showView('loading-view');
        if (!media) { displayError("Could not find details."); return; }
        
        const mediaType = media.media_type || (media.title ? 'movie' : 'tv');
        const fullDetails = await fetchFromAPI(`${mediaType}/${media.id}`, { append_to_response: 'videos,credits,recommendations' });
        if (!fullDetails) return;

        mediaPosterEl.src = fullDetails.poster_path ? IMAGE_BASE_URL + fullDetails.poster_path : PLACEHOLDER_POSTER;
        mediaTitleEl.textContent = fullDetails.title || fullDetails.name;
        
        if (mediaType === 'tv') {
            const firstYear = fullDetails.first_air_date?.split('-')[0] || 'N/A';
            const lastYear = fullDetails.in_production ? 'Present' : (fullDetails.last_air_date?.split('-')[0] || firstYear);
            mediaDetailsEl.textContent = `${firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`} | ${fullDetails.number_of_seasons} Season(s)`;
        } else {
            mediaDetailsEl.textContent = `${fullDetails.release_date?.split('-')[0] || 'N/A'} | ⭐ ${fullDetails.vote_average.toFixed(1)}`;
        }
        
        mediaOverviewEl.textContent = fullDetails.overview || "No overview available.";
        
        const trailer = fullDetails.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        mediaTrailerLink.style.display = trailer ? 'inline-block' : 'none';
        if (trailer) mediaTrailerLink.href = `https://www.youtube.com/watch?v=${trailer.key}`;
        
        updateResultPageButtons(fullDetails.id, mediaType);

        renderCast(fullDetails.credits.cast);
        renderRecommendations(fullDetails.recommendations.results);
        showView('result-view');
    };

    const renderCast = (cast) => {
        mediaCastGrid.innerHTML = '';
        cast.slice(0, 6).forEach((member, index) => {
            const castCard = document.createElement('div');
            castCard.className = 'cast-card grid-item';
            castCard.style.animationDelay = `${index * 50}ms`;
            castCard.innerHTML = `
                <img src="${member.profile_path ? PROFILE_IMAGE_BASE_URL + member.profile_path : PLACEHOLDER_PERSON}" alt="${member.name}">
                <div class="cast-info">
                    <p class="cast-name">${member.name}</p>
                    <p class="cast-character">${member.character}</p>
                </div>`;
            castCard.addEventListener('click', () => getPersonCredits(member.id, member.name));
            mediaCastGrid.appendChild(castCard);
        });
    };

    const renderRecommendations = (recommendations) => {
        recommendationsGrid.innerHTML = '';
        if (recommendations && recommendations.length > 0) {
            recommendationsSection.style.display = 'block';
            recommendations.slice(0, 5).forEach((rec, index) => recommendationsGrid.appendChild(createMediaCard(rec, index)));
        } else {
            recommendationsSection.style.display = 'none';
        }
    };
    
    const getPersonCredits = async (personId, personName) => {
        showView('loading-view');
        const data = await fetchFromAPI(`person/${personId}/combined_credits`);
        if (data && data.cast) {
            const sortedCredits = data.cast.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            displaySearchResults(sortedCredits, `Featuring ${personName}`);
        }
    };

    // --- PAGINATION & SEARCH LOGIC ---
    const executeSearch = async (query, page) => {
        showView('loading-view');
        const data = await fetchFromAPI('search/multi', { query, page });
        if (data) {
            currentSearchQuery = query;
            currentSearchPage = data.page;
            totalSearchPages = data.total_pages;
            displaySearchResults(data.results);
        }
    };
    
    const displaySearchResults = (results, title = "Search Results") => {
        searchResultsTitle.textContent = title;
        searchResultsGrid.innerHTML = '';
        const validResults = results.filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path);
        if (validResults.length === 0) {
            searchResultsGrid.innerHTML = '<p>No results found for this query.</p>';
        } else {
            validResults.forEach((result, index) => searchResultsGrid.appendChild(createMediaCard(result, index)));
        }
        renderPaginationControls();
        showView('search-results-view');
    };

    const renderPaginationControls = () => {
        paginationControls.innerHTML = '';
        if (totalSearchPages <= 1) return;
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'btn btn-secondary';
        prevBtn.disabled = currentSearchPage === 1;
        prevBtn.addEventListener('click', () => executeSearch(currentSearchQuery, currentSearchPage - 1));
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'btn btn-secondary';
        nextBtn.disabled = currentSearchPage === totalSearchPages;
        nextBtn.addEventListener('click', () => executeSearch(currentSearchQuery, currentSearchPage + 1));
        const pageInfo = document.createElement('span');
        pageInfo.id = 'page-info';
        pageInfo.textContent = `Page ${currentSearchPage} of ${totalSearchPages}`;
        paginationControls.append(prevBtn, pageInfo, nextBtn);
    };
    
    // --- QUIZ LOGIC ---
    const startQuiz = () => {
        currentQuizStep = 0;
        userChoices = { genres: [], language: 'en' };
        renderQuizStep();
        showView('quiz-view');
    };

    const advanceQuiz = () => {
        if (currentQuizStep < quizData.length - 1) {
            currentQuizStep++;
            renderQuizStep();
        } else {
            finishQuiz();
        }
    };

    const renderQuizStep = () => {
        const stepData = quizData[currentQuizStep];
        quizQuestionEl.textContent = stepData.question;
        quizOptionsContainer.innerHTML = '';
        const createButton = (option, callback) => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.textContent = option.text;
            button.addEventListener('click', () => callback(option));
            return button;
        };
        if (stepData.type === 'single-select' || stepData.type === 'single-select-lang') {
            const options = (stepData.type === 'single-select-lang')
                ? [
                    { text: "Any", value: null }, { text: "English", value: "en" }, { text: "Spanish", value: "es" },
                    { text: "Hindi", value: "hi" }, { text: "French", value: "fr" }, { text: "German", value: "de" },
                    { text: "Japanese", value: "ja" }, { text: "Korean", value: "ko" }, { text: "Russian", value: "ru" },
                    { text: "Italian", value: "it" }, { text: "Chinese", value: "zh" }, { text: "Portuguese", value: "pt" }
                  ]
                : stepData.options;

            options.forEach(option => quizOptionsContainer.appendChild(createButton(option, (opt) => {
                userChoices[stepData.key] = opt.value;
                advanceQuiz();
            })));
        } else if (stepData.type === 'multi-select') {
            stepData.options.forEach(option => {
                const button = createButton(option, (opt) => {
                    button.classList.toggle('selected');
                    const { genres } = userChoices;
                    if (genres.includes(opt.value)) userChoices.genres = genres.filter(id => id !== opt.value);
                    else genres.push(opt.value);
                });
                if(userChoices.genres.includes(option.value)) button.classList.add('selected');
                quizOptionsContainer.appendChild(button);
            });
        }
        
        quizNextBtn.style.display = (stepData.type === 'multi-select') ? 'inline-block' : 'none';
        quizNextBtn.textContent = (currentQuizStep === quizData.length - 1) ? 'Find Match' : 'Next';
    };
    
    quizNextBtn.addEventListener('click', advanceQuiz);

    const finishQuiz = async () => {
        showView('loading-view');
        const { mediaType, genres, releaseDates, language } = userChoices;
        const params = {
            'sort_by': 'popularity.desc', 'include_adult': 'false', 'page': '1',
            'with_genres': genres.join('|'), 'with_original_language': language,
            'vote_count.gte': 100
        };
        const dateKey = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
        if (releaseDates?.gte) params[`${dateKey}.gte`] = releaseDates.gte;
        if (releaseDates?.lte) params[`${dateKey}.lte`] = releaseDates.lte;
        const data = await fetchFromAPI(`discover/${mediaType}`, params);
        if (data?.results.length > 0) {
            displayRecommendedMedia(data.results[Math.floor(Math.random() * data.results.length)]);
        } else { displayError("Couldn't find anything with those preferences."); }
    };

    // --- GLOBAL EVENT LISTENERS -
    homeBtn.addEventListener('click', () => showView('landing-view'));
    startQuizBtn.addEventListener('click', startQuiz);
    // This button does not exist in your HTML, so the listener might not attach to anything.
    if(tryAgainBtn) tryAgainBtn.addEventListener('click', () => showView('landing-view')); 
    errorTryAgainBtn.addEventListener('click', () => showView('landing-view'));
    watchlistBtn.addEventListener('click', displayWatchlist);

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            executeSearch(query, 1);
            searchInput.value = '';
        }
    });

    // --- INITIALIZATION ---
    loadLists();
    showView('landing-view');
});