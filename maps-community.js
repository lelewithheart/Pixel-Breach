// Community Maps Storage and Management
// This file handles community-created maps stored in localStorage

// Load all community maps from localStorage
function loadCommunityMaps() {
    const savedLevel = localStorage.getItem('customLevel');
    const communityMaps = [];

    if (savedLevel) {
        communityMaps.push({
            id: 'custom-1',
            name: 'Custom Level',
            description: 'Player-created level',
            data: JSON.parse(savedLevel)
        });
    }

    return communityMaps;
}

// Save a community map to localStorage
function saveCommunityMap(mapData, mapName = 'Custom Level') {
    const levelData = {
        name: mapName,
        grid: mapData.grid,
        enemies: mapData.enemies,
        civilians: mapData.civilians,
        doors: mapData.doors
    };

    const json = JSON.stringify(levelData);
    localStorage.setItem('customLevel', json);
    return true;
}

// Load a specific community map
function loadCommunityMapData(mapId) {
    const json = localStorage.getItem('customLevel');
    if (!json) {
        return null;
    }

    return JSON.parse(json);
}

// Delete a community map
function deleteCommunityMap(mapId) {
    localStorage.removeItem('customLevel');
    return true;
}

// Check if community maps exist
function hasCommunityMaps() {
    return localStorage.getItem('customLevel') !== null;
}
