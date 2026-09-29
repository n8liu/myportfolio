// Rank locations by their newest stored photo, ignoring folder placeholders.
export function sortPhotoCategories(objects) {
    const latestByCategory = new Map();
    for (const { key, uploaded } of objects) {
        if (!key || !key.includes('/') || key.endsWith('/')) continue;
        const name = key.split('/')[0];
        if (!name) continue;
        const timestamp = new Date(uploaded).getTime();
        const latest = Number.isFinite(timestamp) ? timestamp : -Infinity;
        latestByCategory.set(name, Math.max(latestByCategory.get(name) ?? -Infinity, latest));
    }
    return [...latestByCategory.keys()].sort((a, b) => {
        const aDate = latestByCategory.get(a);
        const bDate = latestByCategory.get(b);
        return aDate === bDate ? a.localeCompare(b) : bDate - aDate;
    });
}
