

const API_KEY = '58be003438126be75d16cfad1331d6c6';
const API_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Fetches data from a specific TMDB API endpoint.
 * @param {string} endpoint 
 * @param {object} params 
 * @returns {Promise<object|null>} 
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
 * NEW: Fetches the official genre list for a given media type.  d
 * @returns {Promise<object>} - The API response containing the genre list.
 */
export async function fetchGenreList(mediaType) {
    return await fetchData(`genre/${mediaType}/list`);
}