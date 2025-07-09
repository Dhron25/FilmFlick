const API_KEY = '58be003438126be75d16cfad1331d6c6';
const API_BASE_URL = 'https://api.themoviedb.org/3';

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