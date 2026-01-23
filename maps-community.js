// Community Maps Storage and Management
// Loads from server API when running with server.js
// Falls back to localStorage for standalone use

// Check if running with server
let serverAvailable = false;

async function checkServer() {
    try {
        const res = await fetch('/api/community');
        serverAvailable = res.ok;
    } catch {
        serverAvailable = false;
    }
    return serverAvailable;
}

// Load all community maps
async function loadCommunityMaps() {
    // Try server first
    try {
        const res = await fetch('/api/community');
        if (res.ok) {
            const data = await res.json();
            serverAvailable = true;
            return data.maps.map(map => ({
                id: map.filename,
                name: map.name,
                author: map.author,
                description: map.description,
                difficulty: map.difficulty,
                enemyCount: map.enemyCount,
                hostageCount: map.hostageCount,
                isServerMap: true
            }));
        }
    } catch {
        // Server not available, fall back to localStorage
    }

    // Fallback: Load from localStorage
    serverAvailable = false;
    const savedLevel = localStorage.getItem('customLevel');
    const communityMaps = [];

    if (savedLevel) {
        try {
            const data = JSON.parse(savedLevel);
            communityMaps.push({
                id: 'local-custom',
                name: data.name || 'Custom Level',
                description: data.description || 'Player-created level',
                author: data.author || 'Local Player',
                data: data,
                isServerMap: false
            });
        } catch (e) {
            console.error('Failed to parse saved level:', e);
        }
    }

    return communityMaps;
}

// Load a specific community map by ID
async function loadCommunityMapData(mapId) {
    // Server map
    if (serverAvailable && mapId !== 'local-custom') {
        try {
            const res = await fetch(`/api/map/community/${encodeURIComponent(mapId)}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error('Failed to load server map:', e);
        }
    }

    // Local map fallback
    const json = localStorage.getItem('customLevel');
    if (!json) return null;

    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

// Submit a map for review (requires server)
async function submitMapForReview(mapData) {
    if (!serverAvailable) {
        await checkServer();
    }

    if (!serverAvailable) {
        return {
            success: false,
            error: 'Server not available. Run "node server.js" to enable map submissions.'
        };
    }

    try {
        const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapData })
        });

        return await res.json();
    } catch (e) {
        return {
            success: false,
            error: 'Failed to submit: ' + e.message
        };
    }
}

// Save a community map to localStorage (fallback/local only)
function saveCommunityMap(mapData, mapName = 'Custom Level') {
    const levelData = {
        name: mapName,
        grid: mapData.grid,
        enemies: mapData.enemies || mapData.entities?.enemies || [],
        civilians: mapData.civilians || mapData.entities?.civilians || [],
        doors: mapData.doors || mapData.entities?.doors || []
    };

    localStorage.setItem('customLevel', JSON.stringify(levelData));
    return true;
}

// Delete a community map from localStorage
function deleteCommunityMap(mapId) {
    if (mapId === 'local-custom') {
        localStorage.removeItem('customLevel');
        return true;
    }
    return false;
}

// Check if community maps exist
async function hasCommunityMaps() {
    const maps = await loadCommunityMaps();
    return maps.length > 0;
}

// Check server on load
checkServer();
