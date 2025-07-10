import { fetchData } from './api.js';
import { switchView, elements, showErrorView } from './ui.js';
import { getFromStorage } from './storage.js';

const quizData = [
    { question: "Are you looking for a Movie or a TV Show?", type: 'media_type', options: [{ text: "Movie", value: 'movie' }, { text: "TV Show", value: 'tv' }] },
    { question: "How are you feeling tonight?", options: [ { text: "I want to laugh out loud", scores: { with_genres: [35] } }, { text: "I'm in the mood for suspense", scores: { with_genres: [53, 9648] } }, { text: "Something to make me think", scores: { with_genres: [878, 18], with_keywords: [9663] } }, { text: "Take me on an adventure!", scores: { with_genres: [12, 28] } }, { text: "A heartwarming story", scores: { with_genres: [10751, 10749], with_keywords: [9715] } } ] },
    { question: "Pick a language.", options: [ { text: "English", scores: { with_original_language: 'en' } }, { text: "Spanish", scores: { with_original_language: 'es' } }, { text: "French", scores: { with_original_language: 'fr' } }, { text: "German", scores: { with_original_language: 'de' } }, { text: "Japanese", scores: { with_original_language: 'ja' } }, { text: "Korean", scores: { with_original_language: 'ko' } }, { text: "Hindi", scores: { with_original_language: 'hi' } }, { text: "Italian", scores: { with_original_language: 'it' } }, { text: "Russian", scores: { with_original_language: 'ru' } }, { text: "Chinese", scores: { with_original_language: 'zh' } }, { text: "Any Language", scores: {} } ] },
    { question: "How much brainpower do you want to use?", options: [ { text: "Turn my brain off, please", scores: { 'vote_average.lte': 7 } }, { text: "I enjoy a good twist", scores: { with_keywords: [210024] } }, { text: "Challenge me!", scores: { 'vote_average.gte': 7.5 } } ] }
];

let quizState = {};

export function startQuiz(mainState, onCompleteCallback) {
    quizState = mainState.quiz = { 
        currentQuestionIndex: 0, 
        answers: [], 
        mediaType: 'movie',
        onComplete: onCompleteCallback
    };
    displayQuestion();
    switchView('quiz-view');
}

export function displayQuestion() {
    if (quizState.currentQuestionIndex >= quizData.length) {
        finishQuiz();
        return;
    }
    const questionData = quizData[quizState.currentQuestionIndex];
    elements.quizQuestion.textContent = questionData.question;
    elements.quizOptionsContainer.innerHTML = '';
    questionData.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = option.text;
        button.dataset.index = index;
        elements.quizOptionsContainer.appendChild(button);
    });
    elements.quizNextBtn.style.display = 'none';
}

export function selectOption(selectedIndex) {
    const questionData = quizData[quizState.currentQuestionIndex];
    if (questionData.type === 'media_type') {
        quizState.mediaType = questionData.options[selectedIndex].value;
    }
    quizState.answers[quizState.currentQuestionIndex] = selectedIndex;
    const optionButtons = elements.quizOptionsContainer.querySelectorAll('.btn');
    optionButtons.forEach((btn, index) => {
        btn.classList.toggle('selected', index === selectedIndex);
    });
    elements.quizNextBtn.style.display = 'inline-block';
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
        const keywordSet = new Set();

        quizState.answers.forEach((answerIndex, questionIndex) => {
            const scores = quizData[questionIndex].options[answerIndex].scores;
            if (!scores) return;
            for (const key in scores) {
                if (key === 'with_genres' && scores.with_genres) scores.with_genres.forEach(id => genreSet.add(id));
                else if (key === 'with_keywords' && scores.with_keywords) scores.with_keywords.forEach(id => keywordSet.add(id));
                else primaryParams[key] = scores[key];
            }
        });

        if (genreSet.size > 0) primaryParams.with_genres = [...genreSet].join(',');
        if (keywordSet.size > 0) primaryParams.with_keywords = [...keywordSet].join(',');
        
        let data = await fetchData(`discover/${quizState.mediaType}`, primaryParams);

        if (!data || data.results.length === 0) {
            const fallbackParams = { 'sort_by': 'popularity.desc', 'vote_count.gte': 100, 'with_genres': primaryParams.with_genres, 'with_original_language': primaryParams.with_original_language };
            data = await fetchData(`discover/${quizState.mediaType}`, fallbackParams);
        }
        
        if (data && data.results.length > 0) {
            const watchlistIds = getFromStorage('watchlist').map(item => item.id);
            const watchedListIds = getFromStorage('watchedList').map(item => item.id);
            const existingIds = new Set([...watchlistIds, ...watchedListIds]);
            const filteredResults = data.results.filter(movie => !existingIds.has(movie.id));
            const recommendationsToShow = filteredResults.length > 0 ? filteredResults : data.results;
            
            const topResults = recommendationsToShow.slice(0, 10);
            const recommendation = topResults[Math.floor(Math.random() * topResults.length)];
            quizState.onComplete(recommendation.id, quizState.mediaType);
        } else {
            showErrorView("We couldn't find a good match. Please try the quiz again!");
        }
    } catch (error) {
        showErrorView(error.message);
    }
}