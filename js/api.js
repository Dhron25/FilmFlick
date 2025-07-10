// js/api.js

const API_KEY = '58be003438126be75d16cfad1331d6c6';
const API_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Fetches data from a specific TMDB API endpoint.
 * @param {string} endpoint - The API endpoint to call (e.g., 'discover/movie').
 * @param {object} params - Query parameters for the request.
 * @returns {Promise<object|null>} - The JSON response from the API or null on error.
 */
export async function fetchData(endpoint, params = {}) {
    const urlParams = new URLSearchParams({ api_key: API_KEY, ...params });
    const url = `${API_BASE_URL}/${endpoint}?${urlParams}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API Fetch Error from endpoint ${endpoint}:`, error);
        throw error;
    }
}

/**
 * NEW: Fetches the official genre list for a given media type.
 * @param {string} mediaType - 'movie' or 'tv'.
 * @returns {Promise<object>} - The API response containing the genre list.
 */
export async function fetchGenreList(mediaType) {
    return await fetchData(`genre/${mediaType}/list`);
}