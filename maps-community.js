// Player levels live in this browser. Sharing works by exporting a map file.
// The editor saves under "editorLevel", older builds of the game under "customLevel"; both show up.

async function loadCommunityMaps() {
    const maps = [];
    const sources = [['editorLevel', 'Level Editor'], ['customLevel', 'Saved level']];
    for (const [key, source] of sources) {
        let saved = null;
        try { saved = localStorage.getItem(key); } catch (e) { /* private mode */ }
        if (!saved) continue;
        try {
            const data = JSON.parse(saved);
            if (!data || !Array.isArray(data.grid)) continue;
            maps.push({
                id: 'local-' + key,
                name: data.metadata?.name || data.name || 'Custom Level',
                description: data.metadata?.description || 'Your saved level',
                author: data.metadata?.author || 'You',
                source,
                data,
            });
        } catch (e) {
            console.error('Failed to parse saved level:', e);
        }
    }
    return maps;
}

async function loadCommunityMapData() {
    const maps = await loadCommunityMaps();
    return maps.length ? maps[0].data : null;
}
