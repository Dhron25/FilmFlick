import { fetchData, fetchGenreList } from './api.js';
import { switchView, elements, showErrorView } from './ui.js';
import { getFromStorage } from './storage.js';

const quizData = [
    { question: "Are you looking for a Movie or a TV Show?", type: 'media_type', options: [{ text: "Movie", value: 'movie' }, { text: "TV Show", value: 'tv' }] },
    { question: "How are you feeling tonight?", options: [
        { text: "I want to laugh out loud", scores: { with_genres: ['Comedy'] } },
        { text: "I'm in the mood for suspense", scores: { with_genres: ['Thriller', 'Mystery'] } },
        { text: "Something to make me think", scores: { with_genres: ['Science Fiction', 'Drama'] } },
        { text: "Take me on an adventure!", scores: { with_genres: ['Action', 'Adventure', 'Action & Adventure'] } },
        { text: "A heartwarming story", scores: { with_genres: ['Family', 'Romance'] } }
    ]},
    { question: "Pick one or more specific genres (optional)", type: 'dynamic_genre', options: [] },
    {
        question: "Pick a language.",
        options: [
            { text: "Any Language", scores: {} },
            { text: "English", scores: { with_original_language: 'en' } },
            { text: "Spanish", scores: { with_original_language: 'es' } },
            { text: "French", scores: { with_original_language: 'fr' } },
            { text: "German", scores: { with_original_language: 'de' } },
            { text: "Japanese", scores: { with_original_language: 'ja' } },
            { text: "Korean", scores: { with_original_language: 'ko' } },
            { text: "Chinese", scores: { with_original_language: 'zh' } },
            { text: "Hindi", scores: { with_original_language: 'hi' } },
            { text: "Italian", scores: { with_original_language: 'it' } },
            { text: "Russian", scores: { with_original_language: 'ru' } },
            { text: "Portuguese", scores: { with_original_language: 'pt' } },
            { text: "Dutch", scores: { with_original_language: 'nl' } },
            { text: "Swedish", scores: { with_original_language: 'sv' } },
            { text: "Danish", scores: { with_original_language: 'da' } },
            { text: "Norwegian", scores: { with_original_language: 'no' } },
        ]
    },
    { question: "Pick a decade.", options: [
        { text: "Something recent (2010s+)", scores: { 'date.gte': '2010-01-01' } },
        { text: "The 90s/2000s Vibe", scores: { 'date.gte': '1990-01-01', 'date.lte': '2009-12-31' } },
        { text: "A Classic (pre-1990)", scores: { 'date.lte': '1989-12-31' } }
    ]}
];

let quizState = {};

export function startQuiz(mainState, onCompleteCallback) {
    quizState = mainState.quiz = {
        currentQuestionIndex: 0,
        answers: [],
        mediaType: 'movie',
        onComplete: onCompleteCallback,
        genreLists: {}
    };
    displayQuestion();
    switchView('quiz-view');
}

export async function displayQuestion() {
    if (quizState.currentQuestionIndex >= quizData.length) {
        finishQuiz();
        return;
    }
    const questionData = quizData[quizState.currentQuestionIndex];
    elements.quizQuestion.textContent = questionData.question;
    elements.quizOptionsContainer.innerHTML = '';
    elements.quizNextBtn.style.display = 'none';

    if (questionData.type === 'dynamic_genre') {
        quizState.answers[quizState.currentQuestionIndex] = new Set();
        elements.quizOptionsContainer.innerHTML = '<p>Loading genres...</p>';
        try {
            if (!quizState.genreLists[quizState.mediaType]) {
                const genreData = await fetchGenreList(quizState.mediaType);
                quizState.genreLists[quizState.mediaType] = genreData.genres;
            }
            const genres = quizState.genreLists[quizState.mediaType];
            elements.quizOptionsContainer.innerHTML = '';

            const anyBtn = document.createElement('button');
            anyBtn.className = 'btn';
            anyBtn.textContent = 'Any Genre';
            anyBtn.dataset.index = -1;
            elements.quizOptionsContainer.appendChild(anyBtn);

            genres.forEach((genre, index) => {
                const button = document.createElement('button');
                button.className = 'btn';
                button.textContent = genre.name;
                button.dataset.index = index;
                button.dataset.genreId = genre.id;
                elements.quizOptionsContainer.appendChild(button);
            });
            elements.quizNextBtn.style.display = 'inline-block';

        } catch (error) {
            showErrorView("Could not load genres. Please try again.");
        }
    } else {
        questionData.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.textContent = option.text;
            button.dataset.index = index;
            elements.quizOptionsContainer.appendChild(button);
        });
    }
}

export function selectOption(selectedIndex) {
    const questionData = quizData[quizState.currentQuestionIndex];
    const selectedButton = elements.quizOptionsContainer.querySelector(`button[data-index='${selectedIndex}']`);

    if (questionData.type === 'dynamic_genre') {
        const genreId = selectedButton.dataset.genreId;
        const answerSet = quizState.answers[quizState.currentQuestionIndex];

        if (selectedIndex < 0) {
            answerSet.clear();
            elements.quizOptionsContainer.querySelectorAll('.btn.selected').forEach(btn => btn.classList.remove('selected'));
        } else {
            if (answerSet.has(genreId)) {
                answerSet.delete(genreId);
                selectedButton.classList.remove('selected');
            } else {
                answerSet.add(genreId);
                selectedButton.classList.add('selected');
            }
        }
    } else {
        if (questionData.type === 'media_type') {
            quizState.mediaType = questionData.options[selectedIndex].value;
        }
        quizState.answers[quizState.currentQuestionIndex] = selectedIndex;

        elements.quizOptionsContainer.querySelectorAll('.btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        selectedButton.classList.add('selected');
        elements.quizNextBtn.style.display = 'inline-block';
    }
}

export function nextQuestion() {
    quizState.currentQuestionIndex++;
    displayQuestion();
}

async function finishQuiz() {
    switchView('loading-view');
    try {
        const primaryParams = { 'sort_by': 'popularity.desc', 'include_adult': 'false', 'vote_count.gte': 100 };
        const genreSet = new Set();

        if (!quizState.genreLists[quizState.mediaType]) {
            const genreData = await fetchGenreList(quizState.mediaType);
            quizState.genreLists[quizState.mediaType] = genreData.genres;
        }
        const officialGenreList = quizState.genreLists[quizState.mediaType];

        quizState.answers.forEach((answer, questionIndex) => {
            const question = quizData[questionIndex];

            if (question.type === 'dynamic_genre' && answer instanceof Set) {
                answer.forEach(genreId => genreSet.add(genreId));
                return;
            }

            if (typeof answer !== 'number') return;

            const scores = question.options[answer]?.scores;
            if (!scores) return;

            for (const key in scores) {
                if (key === 'with_genres') {
                    scores.with_genres.forEach(name => {
                        const foundGenre = officialGenreList.find(g => g.name === name);
                        if (foundGenre) genreSet.add(foundGenre.id);
                    });
                } else if (key === 'date.gte') {
                    const dateKey = quizState.mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
                    primaryParams[dateKey] = scores[key];
                } else if (key === 'date.lte') {
                    const dateKey = quizState.mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
                    primaryParams[dateKey] = scores[key];
                } else {
                    primaryParams[key] = scores[key];
                }
            }
        });

        if (genreSet.size > 0) {
            primaryParams.with_genres = [...genreSet].join('|');
        }

        let data = await fetchData(`discover/${quizState.mediaType}`, primaryParams);

        if (!data || data.results.length === 0) {
            const fallbackParams = { ...primaryParams };
            delete fallbackParams.with_keywords;
            delete fallbackParams['vote_average.gte'];
            delete fallbackParams['vote_average.lte'];
            data = await fetchData(`discover/${quizState.mediaType}`, fallbackParams);
        }

        if (data && data.results.length > 0) {
            const watchlistIds = getFromStorage('watchlist').map(item => item.id);
            const watchedListIds = getFromStorage('watchedList').map(item => item.id);
            const existingIds = new Set([...watchlistIds, ...watchedListIds]);
            const filteredResults = data.results.filter(item => !existingIds.has(item.id));
            const recommendationsToShow = filteredResults.length > 0 ? filteredResults : data.results;

            const topResults = recommendationsToShow.slice(0, 10);
            const recommendation = topResults[Math.floor(Math.random() * topResults.length)];
            quizState.onComplete(recommendation.id, quizState.mediaType);
        } else {
            showErrorView("We couldn't find a match. Please try the quiz again!");
        }
    } catch (error) {
        showErrorView(error.message);
    }
}