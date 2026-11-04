// Player levels live in this browser. Sharing works by exporting a map file.

async function loadCommunityMaps() {
    const saved = localStorage.getItem('customLevel');
    if (!saved) return [];
    try {
        const data = JSON.parse(saved);
        return [{
            id: 'local-custom',
            name: data.metadata?.name || data.name || 'Custom Level',
            description: data.metadata?.description || 'Your saved level',
            author: data.metadata?.author || 'You',
            data,
        }];
    } catch (e) {
        console.error('Failed to parse saved level:', e);
        return [];
    }
}

async function loadCommunityMapData() {
    const saved = localStorage.getItem('customLevel');
    if (!saved) return null;
    try {
        return JSON.parse(saved);
    } catch {
        return null;
    }
}
