export const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || [];
export const saveToStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));
export const isInStorage = (key, itemId) => getFromStorage(key).some(item => item.id === itemId);

export function addToStorage(key, item) {
    if (!isInStorage(key, item.id)) {
        const items = getFromStorage(key);
        saveToStorage(key, [...items, item]);
    }
}

export function removeFromStorage(key, itemId) {
    const items = getFromStorage(key);
    saveToStorage(key, items.filter(item => item.id !== itemId));
}