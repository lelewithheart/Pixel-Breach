// Collection of multiplayer maps
// Tile types: 0 = floor, 1 = wall, 3 = cover
// Map grid dimensions (40x30 tiles = 800x600 pixels at 20px per tile)
const MP_MAP_WIDTH = 40;
const MP_MAP_HEIGHT = 30;

const MULTIPLAYER_MAPS = {
    // Map 1: Crossroads - Classic cross-shaped arena with central cover
    crossroads: {
        name: "Crossroads",
        generate: function() {
            const map = [];
            
            for (let y = 0; y < MP_MAP_HEIGHT; y++) {
                map[y] = [];
                for (let x = 0; x < MP_MAP_WIDTH; x++) {
                    // Border walls
                    if (x === 0 || x === MP_MAP_WIDTH - 1 || y === 0 || y === MP_MAP_HEIGHT - 1) {
                        map[y][x] = 1;
                    }
                    // Vertical walls with gaps
                    else if ((x === 10 || x === 30) && y > 5 && y < 25 && y !== 15) {
                        map[y][x] = 1;
                    }
                    // Horizontal walls with gaps
                    else if ((y === 10 || y === 20) && x > 5 && x < 35 && x !== 20) {
                        map[y][x] = 1;
                    }
                    // Cover spots
                    else if ((x === 15 && y === 15) || (x === 25 && y === 15) || 
                             (x === 20 && y === 7) || (x === 20 && y === 23)) {
                        map[y][x] = 3;
                    }
                    else {
                        map[y][x] = 0;
                    }
                }
            }
            return map;
        }
    },
    
    // Map 2: Warehouse - Large open area with scattered crates and pillars
    warehouse: {
        name: "Warehouse",
        generate: function() {
            const map = [];
            
            for (let y = 0; y < MP_MAP_HEIGHT; y++) {
                map[y] = [];
                for (let x = 0; x < MP_MAP_WIDTH; x++) {
                    // Border walls
                    if (x === 0 || x === MP_MAP_WIDTH - 1 || y === 0 || y === MP_MAP_HEIGHT - 1) {
                        map[y][x] = 1;
                    }
                    // Pillar clusters (2x2 walls) scattered around
                    else if ((x >= 8 && x <= 9 && y >= 8 && y <= 9) ||
                             (x >= 30 && x <= 31 && y >= 8 && y <= 9) ||
                             (x >= 8 && x <= 9 && y >= 20 && y <= 21) ||
                             (x >= 30 && x <= 31 && y >= 20 && y <= 21) ||
                             (x >= 19 && x <= 20 && y >= 14 && y <= 15)) {
                        map[y][x] = 1;
                    }
                    // Crate cover spots
                    else if ((x === 15 && y === 5) || (x === 25 && y === 5) ||
                             (x === 15 && y === 24) || (x === 25 && y === 24) ||
                             (x === 5 && y === 14) || (x === 34 && y === 14) ||
                             (x === 12 && y === 12) || (x === 27 && y === 17)) {
                        map[y][x] = 3;
                    }
                    else {
                        map[y][x] = 0;
                    }
                }
            }
            return map;
        }
    },
    
    // Map 3: Compound - Building with rooms and corridors
    compound: {
        name: "Compound",
        generate: function() {
            const map = [];
            
            for (let y = 0; y < MP_MAP_HEIGHT; y++) {
                map[y] = [];
                for (let x = 0; x < MP_MAP_WIDTH; x++) {
                    // Border walls
                    if (x === 0 || x === MP_MAP_WIDTH - 1 || y === 0 || y === MP_MAP_HEIGHT - 1) {
                        map[y][x] = 1;
                    }
                    // Left room
                    else if ((x === 12 && y >= 3 && y <= 12 && y !== 7) ||
                             (y === 12 && x >= 3 && x <= 12 && x !== 7)) {
                        map[y][x] = 1;
                    }
                    // Right room
                    else if ((x === 27 && y >= 3 && y <= 12 && y !== 7) ||
                             (y === 12 && x >= 27 && x <= 36 && x !== 32)) {
                        map[y][x] = 1;
                    }
                    // Bottom left room
                    else if ((x === 12 && y >= 17 && y <= 26 && y !== 22) ||
                             (y === 17 && x >= 3 && x <= 12 && x !== 7)) {
                        map[y][x] = 1;
                    }
                    // Bottom right room
                    else if ((x === 27 && y >= 17 && y <= 26 && y !== 22) ||
                             (y === 17 && x >= 27 && x <= 36 && x !== 32)) {
                        map[y][x] = 1;
                    }
                    // Central corridor walls
                    else if ((x === 18 || x === 21) && y >= 8 && y <= 21 && y !== 14 && y !== 15) {
                        map[y][x] = 1;
                    }
                    // Cover in corridors
                    else if ((x === 20 && y === 5) || (x === 20 && y === 24) ||
                             (x === 7 && y === 14) || (x === 32 && y === 14)) {
                        map[y][x] = 3;
                    }
                    else {
                        map[y][x] = 0;
                    }
                }
            }
            return map;
        }
    },
    
    // Map 4: Symmetry - Perfectly symmetrical competitive arena
    symmetry: {
        name: "Symmetry",
        generate: function() {
            const map = [];
            
            for (let y = 0; y < MP_MAP_HEIGHT; y++) {
                map[y] = [];
                for (let x = 0; x < MP_MAP_WIDTH; x++) {
                    // Border walls
                    if (x === 0 || x === MP_MAP_WIDTH - 1 || y === 0 || y === MP_MAP_HEIGHT - 1) {
                        map[y][x] = 1;
                    }
                    // Central divider with three gaps
                    else if (x === 20 && y !== 7 && y !== 15 && y !== 22) {
                        map[y][x] = 1;
                    }
                    // Left side walls
                    else if ((x === 7 && y >= 5 && y <= 10) ||
                             (x === 7 && y >= 19 && y <= 24) ||
                             (y === 15 && x >= 3 && x <= 10 && x !== 7)) {
                        map[y][x] = 1;
                    }
                    // Right side walls (mirrored)
                    else if ((x === 32 && y >= 5 && y <= 10) ||
                             (x === 32 && y >= 19 && y <= 24) ||
                             (y === 15 && x >= 29 && x <= 36 && x !== 32)) {
                        map[y][x] = 1;
                    }
                    // Cover spots (symmetrical)
                    else if ((x === 10 && y === 8) || (x === 29 && y === 8) ||
                             (x === 10 && y === 21) || (x === 29 && y === 21) ||
                             (x === 15 && y === 15) || (x === 24 && y === 15)) {
                        map[y][x] = 3;
                    }
                    else {
                        map[y][x] = 0;
                    }
                }
            }
            return map;
        }
    },
    
    // Map 5: Labyrinth - Maze-like corridors for close quarters combat
    labyrinth: {
        name: "Labyrinth",
        generate: function() {
            const map = [];
            
            for (let y = 0; y < MP_MAP_HEIGHT; y++) {
                map[y] = [];
                for (let x = 0; x < MP_MAP_WIDTH; x++) {
                    // Border walls
                    if (x === 0 || x === MP_MAP_WIDTH - 1 || y === 0 || y === MP_MAP_HEIGHT - 1) {
                        map[y][x] = 1;
                    }
                    // Maze walls - horizontal
                    else if ((y === 5 && x >= 3 && x <= 15) ||
                             (y === 5 && x >= 24 && x <= 36) ||
                             (y === 10 && x >= 8 && x <= 20) ||
                             (y === 10 && x >= 25 && x <= 32) ||
                             (y === 15 && x >= 3 && x <= 12) ||
                             (y === 15 && x >= 27 && x <= 36) ||
                             (y === 20 && x >= 7 && x <= 14) ||
                             (y === 20 && x >= 19 && x <= 31) ||
                             (y === 24 && x >= 3 && x <= 15) ||
                             (y === 24 && x >= 24 && x <= 36)) {
                        map[y][x] = 1;
                    }
                    // Maze walls - vertical
                    else if ((x === 8 && y >= 10 && y <= 15) ||
                             (x === 15 && y >= 5 && y <= 10) ||
                             (x === 20 && y >= 12 && y <= 18) ||
                             (x === 24 && y >= 5 && y <= 10) ||
                             (x === 31 && y >= 10 && y <= 15) ||
                             (x === 14 && y >= 20 && y <= 24) ||
                             (x === 25 && y >= 20 && y <= 24)) {
                        map[y][x] = 1;
                    }
                    // Cover spots at key intersections
                    else if ((x === 5 && y === 8) || (x === 34 && y === 8) ||
                             (x === 5 && y === 21) || (x === 34 && y === 21) ||
                             (x === 20 && y === 8) || (x === 20 && y === 21)) {
                        map[y][x] = 3;
                    }
                    else {
                        map[y][x] = 0;
                    }
                }
            }
            return map;
        }
    }
};

// Get all available map names
function getMultiplayerMapNames() {
    return Object.keys(MULTIPLAYER_MAPS);
}

// Get a random multiplayer map
function getRandomMultiplayerMap() {
    const mapNames = getMultiplayerMapNames();
    const randomIndex = Math.floor(Math.random() * mapNames.length);
    const selectedMapName = mapNames[randomIndex];
    const selectedMap = MULTIPLAYER_MAPS[selectedMapName];
    console.log(`[Multiplayer] Selected map: ${selectedMap.name}`);
    return {
        name: selectedMap.name,
        grid: selectedMap.generate()
    };
}

// Get a specific map by name
function getMultiplayerMap(mapName) {
    const mapData = MULTIPLAYER_MAPS[mapName];
    if (!mapData) {
        console.warn(`[Multiplayer] Map "${mapName}" not found, using random map`);
        return getRandomMultiplayerMap();
    }
    return {
        name: mapData.name,
        grid: mapData.generate()
    };
}

class CVCRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.client = null;
        this.mapGrid = null;
        this.mapName = null;
        this.tileSize = 20;
    }
    setClient(client) {
        this.client = client;
    }

    // Set map grid directly (use setMap or setRandomMap for named maps)
    setMapGrid(grid, mapName = 'Custom') {
        this.mapGrid = grid;
        this.mapName = mapName;
    }

    // Set a random map from the available multiplayer maps
    setRandomMap() {
        const mapData = getRandomMultiplayerMap();
        this.mapGrid = mapData.grid;
        this.mapName = mapData.name;
        return mapData.name;
    }
    
    // Set a specific map by name
    setMap(mapName) {
        const mapData = getMultiplayerMap(mapName);
        this.mapGrid = mapData.grid;
        this.mapName = mapData.name;
        return mapData.name;
    }

    // Legacy method - now uses random map selection
    generateDefaultMap() {
        return this.setRandomMap();
    }
    render() {
        if (!this.client) return;

        const state = this.client.getInterpolatedState();
        const localPlayer = this.client.getLocalPlayer();

        // Clear canvas
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw map grid (walls, floors, cover)
        this.drawMapGrid();

        // Draw civilians
        if (state.civilians) {
            state.civilians.forEach(civ => {
                this.drawCivilian(civ);
            });
        }

        // Draw other players
        if (state.players) {
            state.players.forEach(player => {
                if (player.id !== this.client.playerId) {
                    this.drawPlayer(player, false);
                }
            });
        }

        // Draw local player on top
        if (localPlayer) {
            this.drawPlayer(localPlayer, true);
        }

        // Draw HUD
        this.drawHUD(state, localPlayer);
    }
    drawMapGrid() {
        // Generate default map if none exists
        if (!this.mapGrid) {
            this.generateDefaultMap();
        }

        const MP_MAP_HEIGHT = this.mapGrid.length;
        const MP_MAP_WIDTH = this.mapGrid[0] ? this.mapGrid[0].length : 40;

        for (let y = 0; y < MP_MAP_HEIGHT; y++) {
            for (let x = 0; x < MP_MAP_WIDTH; x++) {
                const tile = this.mapGrid[y][x];
                let color;
                
                switch (tile) {
                    case 1: color = '#444'; break; // Wall
                    case 2: color = '#0f0'; break; // Spawn (cops)
                    case 3: color = '#666'; break; // Cover
                    case 4: color = '#f00'; break; // Spawn (criminals)
                    default: color = '#222'; break; // Floor
                }
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

                // Grid lines for visibility
                this.ctx.strokeStyle = '#333';
                this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            }
        }
    }
    drawPlayer(player, isLocal) {
        if (!player.alive) {
            // Draw death marker
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(player.x - 8, player.y - 8, 16, 16);
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('✕', player.x - 5, player.y + 4);
            return;
        }

        this.ctx.save();
        this.ctx.translate(player.x, player.y);
        this.ctx.rotate(player.angle);

        // Team colors
        const colors = player.team === CVC_CONSTANTS.TEAM_COPS
            ? TEAM_COLORS.cops
            : TEAM_COLORS.criminals;

        // Body
        this.ctx.fillStyle = isLocal ? colors.highlight : colors.primary;
        this.ctx.fillRect(-8, -8, 16, 16);

        // Direction indicator
        this.ctx.fillStyle = isLocal ? '#fff' : colors.secondary;
        this.ctx.fillRect(6, -2, 8, 4);

        this.ctx.restore();

        // Health bar
        if (player.health < player.maxHealth) {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(player.x - 15, player.y - 25, 30, 4);
            this.ctx.fillStyle = player.health > 30 ? '#0f0' : '#f00';
            this.ctx.fillRect(player.x - 15, player.y - 25, 30 * (player.health / player.maxHealth), 4);
        }

        // Name tag
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name || player.id.substring(0, 8), player.x, player.y - 30);
        this.ctx.textAlign = 'left';

        // Team indicator
        this.ctx.fillStyle = player.team === CVC_CONSTANTS.TEAM_COPS ? '#00f' : '#f00';
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y - 35, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    drawCivilian(civilian) {
        if (civilian.dead) {
            this.ctx.fillStyle = '#666';
            this.ctx.fillRect(civilian.x - 7, civilian.y - 7, 14, 14);
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('✕', civilian.x - 4, civilian.y + 3);
            return;
        }

        // Body
        this.ctx.fillStyle = civilian.rescued ? '#0f0' : '#ff0';
        this.ctx.fillRect(civilian.x - 7, civilian.y - 7, 14, 14);

        // Status indicator
        this.ctx.fillStyle = civilian.rescued ? '#0f0' : '#ff0';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(civilian.rescued ? '✓' : '!', civilian.x - 4, civilian.y - 12);

        // Scared indicator
        if (civilian.scared) {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '10px monospace';
            this.ctx.fillText('!', civilian.x - 2, civilian.y + 18);
        }
    }
    drawHUD(state, localPlayer) {
        const ctx = this.ctx;

        // Round info (top center)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width / 2 - 100, 10, 200, 40);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ROUND ${state.round} / ${CVC_CONSTANTS.TOTAL_ROUNDS}`, this.canvas.width / 2, 30);

        // Timer
        const minutes = Math.floor(state.roundTimeRemaining / 60000);
        const seconds = Math.floor((state.roundTimeRemaining % 60000) / 1000);
        ctx.fillStyle = state.roundTimeRemaining < 30000 ? '#f00' : '#0f0';
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, this.canvas.width / 2, 45);
        ctx.textAlign = 'left';

        // Team scores (top corners)
        // Cops score (left)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 150, 50);
        ctx.fillStyle = TEAM_COLORS.cops.primary;
        ctx.fillRect(10, 10, 5, 50);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('COPS', 20, 30);
        ctx.font = 'bold 20px monospace';
        ctx.fillText(state.scores.teamScores.cops.toString(), 20, 52);

        // Criminals score (right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width - 160, 10, 150, 50);
        ctx.fillStyle = TEAM_COLORS.criminals.primary;
        ctx.fillRect(this.canvas.width - 15, 10, 5, 50);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('CRIMINALS', this.canvas.width - 20, 30);
        ctx.font = 'bold 20px monospace';
        ctx.fillText(state.scores.teamScores.criminals.toString(), this.canvas.width - 20, 52);
        ctx.textAlign = 'left';

        // Local player info (bottom left)
        if (localPlayer) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, this.canvas.height - 80, 200, 70);

            // Team indicator
            const teamColor = localPlayer.team === CVC_CONSTANTS.TEAM_COPS
                ? TEAM_COLORS.cops.primary
                : TEAM_COLORS.criminals.primary;
            ctx.fillStyle = teamColor;
            ctx.fillRect(10, this.canvas.height - 80, 5, 70);

            // Role name
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(localPlayer.team === CVC_CONSTANTS.TEAM_COPS ? 'COP' : 'CRIMINAL', 20, this.canvas.height - 65);

            // Health bar
            ctx.fillStyle = '#333';
            ctx.fillRect(20, this.canvas.height - 55, 180, 12);
            ctx.fillStyle = localPlayer.health > 30 ? '#0f0' : '#f00';
            ctx.fillRect(20, this.canvas.height - 55, 180 * (localPlayer.health / localPlayer.maxHealth), 12);
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(`HP: ${Math.floor(localPlayer.health)}`, 25, this.canvas.height - 46);

            // Armor bar
            ctx.fillStyle = '#333';
            ctx.fillRect(20, this.canvas.height - 40, 180, 8);
            ctx.fillStyle = '#0af';
            ctx.fillRect(20, this.canvas.height - 40, 180 * (localPlayer.armor / 100), 8);
            ctx.fillText(`ARMOR: ${Math.floor(localPlayer.armor)}`, 25, this.canvas.height - 33);

            // Stamina bar
            ctx.fillStyle = '#333';
            ctx.fillRect(20, this.canvas.height - 28, 180, 8);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(20, this.canvas.height - 28, 180 * (localPlayer.stamina / 100), 8);
        }

        // Civilian count (bottom center)
        const unrescued = state.civilians.filter(c => !c.rescued && !c.dead).length;
        const rescued = state.civilians.filter(c => c.rescued).length;
        const dead = state.civilians.filter(c => c.dead).length;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width / 2 - 80, this.canvas.height - 35, 160, 25);

        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0';
        ctx.fillText(`CIVILIANS: ${unrescued}`, this.canvas.width / 2 - 40, this.canvas.height - 18);
        ctx.fillStyle = '#0f0';
        ctx.fillText(`✓${rescued}`, this.canvas.width / 2 + 20, this.canvas.height - 18);
        ctx.fillStyle = '#f00';
        ctx.fillText(`✕${dead}`, this.canvas.width / 2 + 55, this.canvas.height - 18);
        ctx.textAlign = 'left';

        // Game state indicator
        if (state.state !== CVC_CONSTANTS.STATE.PLAYING) {
            this.drawStateOverlay(state.state);
        }
    }
    drawStateOverlay(gameState) {
        const ctx = this.ctx;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';

        let message = '';
        switch (gameState) {
            case CVC_CONSTANTS.STATE.WAITING:
                message = 'WAITING FOR PLAYERS...';
                break;
            case CVC_CONSTANTS.STATE.LOBBY:
                message = 'LOBBY - WAITING TO START';
                break;
            case CVC_CONSTANTS.STATE.LOADOUT_SELECTION:
                message = 'SELECT YOUR LOADOUT';
                break;
            case CVC_CONSTANTS.STATE.COUNTDOWN:
                message = 'GET READY!';
                break;
            case CVC_CONSTANTS.STATE.ROUND_END:
                message = 'ROUND OVER';
                break;
            case CVC_CONSTANTS.STATE.ROLE_SWITCH:
                message = 'SWITCHING ROLES...';
                break;
            case CVC_CONSTANTS.STATE.MATCH_END:
                message = 'MATCH COMPLETE';
                break;
            default:
                message = gameState.toUpperCase();
        }

        ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
        ctx.textAlign = 'left';
    }
}

function createMultiplayerUI() {
    // Create multiplayer screen
    const mpScreen = document.createElement('div');
    mpScreen.id = 'multiplayer-screen';
    mpScreen.className = 'modal';
    mpScreen.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 600px;">
            <h2 style="color: #0f0; margin-bottom: 20px;">COPS VS CRIMINALS</h2>
            <p style="margin-bottom: 20px; color: #aaa;">10-Player Multiplayer Mode</p>

            <div id="mp-connection-status" style="margin-bottom: 20px; padding: 10px; background: #333;">
                <span style="color: #ff0;">⚪ Not Connected</span>
            </div>

            <div id="mp-lobby" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="color: #aaa;">Player Name:</label><br>
                    <input type="text" id="mp-player-name" value="Player"
                           style="padding: 8px; width: 200px; margin-top: 5px;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #aaa;">Match ID (leave empty for new match):</label><br>
                    <input type="text" id="mp-match-id" placeholder="Auto-generated"
                           style="padding: 8px; width: 200px; margin-top: 5px;">
                </div>

                <button id="btn-join-match" style="padding: 15px 30px; font-size: 16px; margin: 10px;">
                    JOIN MATCH
                </button>
            </div>

            <div id="mp-match-info" style="display: none; margin-top: 20px;">
                <div style="background: #333; padding: 15px; margin-bottom: 15px;">
                    <div>Match: <span id="mp-current-match-id" style="color: #0f0;"></span></div>
                    <div>Your Team: <span id="mp-your-team" style="font-weight: bold;"></span></div>
                    <div>Players: <span id="mp-player-count">0</span> / ${CVC_CONSTANTS.TOTAL_PLAYERS}</div>
                </div>

                <div id="mp-team-lists" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div style="width: 48%; background: #234; padding: 10px;">
                        <h4 style="color: ${TEAM_COLORS.cops.primary};">COPS</h4>
                        <div id="mp-cops-list"></div>
                    </div>
                    <div style="width: 48%; background: #432; padding: 10px;">
                        <h4 style="color: ${TEAM_COLORS.criminals.primary};">CRIMINALS</h4>
                        <div id="mp-criminals-list"></div>
                    </div>
                </div>

                <button id="btn-start-match" style="padding: 15px 30px; font-size: 16px; margin: 10px;">
                    START MATCH
                </button>
                <button id="btn-leave-match" style="padding: 10px 20px; margin: 10px;">
                    LEAVE
                </button>
            </div>

            <button id="btn-connect-mp" style="padding: 15px 30px; font-size: 16px; margin: 20px;">
                CONNECT TO SERVER
            </button>

            <button id="back-to-home-mp" style="padding: 10px 20px; margin-top: 20px;">
                BACK TO MENU
            </button>
        </div>
    `;
    document.body.appendChild(mpScreen);

    // Create dedicated multiplayer game container (separate from singleplayer)
    const mpGameContainer = document.createElement('div');
    mpGameContainer.id = 'mp-game-container';
    mpGameContainer.style.cssText = 'display: none; flex-direction: column; align-items: center; padding: 20px; background: #000; min-height: 100vh;';
    mpGameContainer.innerHTML = `
        <div id="mp-game-header" style="display: flex; justify-content: space-between; width: 800px; margin-bottom: 10px;">
            <div id="mp-cops-score-panel" style="background: rgba(0, 102, 204, 0.3); border: 2px solid ${TEAM_COLORS.cops.primary}; padding: 10px 20px; min-width: 150px;">
                <div style="color: ${TEAM_COLORS.cops.primary}; font-weight: bold;">COPS</div>
                <div id="mp-cops-score-display" style="font-size: 24px; color: #fff;">0</div>
            </div>
            
            <div id="mp-round-info" style="text-align: center; background: #222; padding: 10px 30px; border: 2px solid #555;">
                <div id="mp-map-name" style="color: #0f0; font-size: 14px; font-weight: bold; margin-bottom: 5px;">MAP</div>
                <div style="color: #888; font-size: 12px;">ROUND</div>
                <div id="mp-round-display" style="font-size: 20px; color: #fff;">1 / ${CVC_CONSTANTS.TOTAL_ROUNDS}</div>
                <div id="mp-timer-display" style="font-size: 28px; color: #0f0; font-weight: bold;">3:00</div>
            </div>
            
            <div id="mp-criminals-score-panel" style="background: rgba(204, 51, 0, 0.3); border: 2px solid ${TEAM_COLORS.criminals.primary}; padding: 10px 20px; min-width: 150px; text-align: right;">
                <div style="color: ${TEAM_COLORS.criminals.primary}; font-weight: bold;">CRIMINALS</div>
                <div id="mp-criminals-score-display" style="font-size: 24px; color: #fff;">0</div>
            </div>
        </div>
        
        <canvas id="mpGameCanvas" width="800" height="600" style="border: 2px solid #444;"></canvas>
        
        <div id="mp-game-footer" style="display: flex; justify-content: space-between; width: 800px; margin-top: 10px;">
            <div id="mp-player-status" style="background: #222; padding: 10px; min-width: 200px; border: 1px solid #444;">
                <div style="color: #888; font-size: 12px;">YOUR STATUS</div>
                <div id="mp-your-role" style="color: #0f0; font-weight: bold;"></div>
                <div style="margin-top: 5px;">
                    <span style="color: #888;">HP:</span>
                    <span id="mp-health-display" style="color: #0f0;">100</span>
                    <span style="color: #888; margin-left: 10px;">ARMOR:</span>
                    <span id="mp-armor-display" style="color: #0af;">100</span>
                </div>
            </div>
            
            <div id="mp-civilians-status" style="background: #222; padding: 10px; text-align: center; border: 1px solid #444;">
                <div style="color: #888; font-size: 12px;">CIVILIANS</div>
                <div>
                    <span id="mp-civilians-alive" style="color: #ff0;">0</span>
                    <span style="color: #888;"> alive |</span>
                    <span id="mp-civilians-rescued" style="color: #0f0;">0</span>
                    <span style="color: #888;"> rescued |</span>
                    <span id="mp-civilians-dead" style="color: #f00;">0</span>
                    <span style="color: #888;"> dead</span>
                </div>
            </div>
            
            <div style="background: #222; padding: 10px; min-width: 150px; text-align: right; border: 1px solid #444;">
                <button id="btn-leave-mp-game" style="padding: 8px 16px;">LEAVE GAME</button>
            </div>
        </div>
        
        <div id="mp-leaderboard" style="position: fixed; right: 20px; top: 100px; background: rgba(0,0,0,0.9); border: 2px solid #555; padding: 15px; min-width: 200px; display: none;">
            <div style="color: #0f0; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">LEADERBOARD</div>
            <div id="mp-leaderboard-list"></div>
        </div>
    `;
    document.body.appendChild(mpGameContainer);

    // Create loadout selection modal for multiplayer
    const mpLoadout = document.createElement('div');
    mpLoadout.id = 'mp-loadout-modal';
    mpLoadout.className = 'modal';
    mpLoadout.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2 id="mp-loadout-title">SELECT LOADOUT</h2>
            <p id="mp-loadout-role" style="color: #0f0; margin-bottom: 15px;"></p>

            <h3 style="font-size: 14px; margin-top: 15px;">Primary Weapon:</h3>
            <div id="mp-primary-weapons" class="loadout-grid"></div>

            <h3 style="font-size: 14px; margin-top: 15px;">Secondary Weapon:</h3>
            <div id="mp-secondary-weapons" class="loadout-grid"></div>

            <h3 style="font-size: 14px; margin-top: 15px;">Equipment:</h3>
            <div id="mp-equipment" class="loadout-grid"></div>

            <div style="margin-top: 20px;">
                <button id="btn-confirm-mp-loadout" style="padding: 15px 30px;">CONFIRM LOADOUT</button>
            </div>

            <div id="mp-loadout-timer" style="margin-top: 10px; color: #ff0;"></div>
        </div>
    `;
    document.body.appendChild(mpLoadout);

    // Create match results modal
    const mpResults = document.createElement('div');
    mpResults.id = 'mp-results-modal';
    mpResults.className = 'modal';
    mpResults.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 500px;">
            <h2 id="mp-results-title" style="font-size: 28px; margin-bottom: 20px;"></h2>

            <div id="mp-final-scores" style="display: flex; justify-content: space-around; margin-bottom: 30px;">
                <div style="background: #234; padding: 20px; min-width: 150px;">
                    <h3 style="color: ${TEAM_COLORS.cops.primary};">COPS</h3>
                    <div id="mp-cops-final-score" style="font-size: 36px; color: #fff;"></div>
                </div>
                <div style="background: #432; padding: 20px; min-width: 150px;">
                    <h3 style="color: ${TEAM_COLORS.criminals.primary};">CRIMINALS</h3>
                    <div id="mp-criminals-final-score" style="font-size: 36px; color: #fff;"></div>
                </div>
            </div>

            <div id="mp-player-rankings" style="text-align: left; max-height: 200px; overflow-y: auto;">
                <h4 style="margin-bottom: 10px;">Player Rankings:</h4>
                <div id="mp-rankings-list"></div>
            </div>

            <button id="btn-return-menu" style="padding: 15px 30px; margin-top: 20px;">
                RETURN TO MENU
            </button>
        </div>
    `;
    document.body.appendChild(mpResults);
}

function initMultiplayerUI() {
    createMultiplayerUI();

    const client = window.cvcClient;

    // Connection status update
    function updateConnectionStatus(connected) {
        const status = document.getElementById('mp-connection-status');
        const lobby = document.getElementById('mp-lobby');
        const connectBtn = document.getElementById('btn-connect-mp');

        if (connected) {
            status.innerHTML = '<span style="color: #0f0;">🟢 Connected</span>';
            lobby.style.display = 'block';
            connectBtn.style.display = 'none';
        } else {
            status.innerHTML = '<span style="color: #ff0;">⚪ Not Connected</span>';
            lobby.style.display = 'none';
            connectBtn.style.display = 'inline-block';
        }
    }

    // Connect button
    document.getElementById('btn-connect-mp').addEventListener('click', async () => {
        try {
            await client.connect();
            updateConnectionStatus(true);
        } catch (error) {
            alert('Failed to connect to server. Make sure the multiplayer server is running.');
        }
    });

    // Join match button
    document.getElementById('btn-join-match').addEventListener('click', () => {
        const playerName = document.getElementById('mp-player-name').value || 'Player';
        const matchId = document.getElementById('mp-match-id').value || null;
        client.joinMatch(matchId, playerName);
    });

    // Start match button
    document.getElementById('btn-start-match').addEventListener('click', () => {
        client.startMatch();
    });

    // Leave match button
    document.getElementById('btn-leave-match').addEventListener('click', () => {
        client.leaveMatch();
        document.getElementById('mp-match-info').style.display = 'none';
        document.getElementById('mp-lobby').style.display = 'block';
        if (typeof gameState !== 'undefined') {
            gameState.multiplayerMode = false;
        }
    });

    // Back button
    document.getElementById('back-to-home-mp').addEventListener('click', () => {
        client.disconnect();
        document.getElementById('multiplayer-screen').classList.remove('active');
        document.getElementById('home-screen').classList.add('active');
        if (typeof gameState !== 'undefined') {
            gameState.multiplayerMode = false;
        }
    });

    // Confirm loadout
    document.getElementById('btn-confirm-mp-loadout').addEventListener('click', () => {
        const primary = document.querySelector('#mp-primary-weapons .loadout-option.selected')?.dataset.weapon;
        const secondary = document.querySelector('#mp-secondary-weapons .loadout-option.selected')?.dataset.weapon;
        const equipment = document.querySelector('#mp-equipment .loadout-option.selected')?.dataset.weapon;

        if (primary && secondary && equipment) {
            client.selectLoadout({ primary, secondary, equipment });
            document.getElementById('mp-loadout-modal').classList.remove('active');
        } else {
            alert('Please select all loadout items');
        }
    });

    // Return to menu from results
    document.getElementById('btn-return-menu').addEventListener('click', () => {
        document.getElementById('mp-results-modal').classList.remove('active');
        document.getElementById('multiplayer-screen').classList.add('active');
    });

    // Leave multiplayer game button
    document.getElementById('btn-leave-mp-game').addEventListener('click', () => {
        leaveMultiplayerGame();
    });

    // Toggle leaderboard with Tab key (only when in multiplayer game)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && mpGameActive) {
            e.preventDefault();
            const leaderboard = document.getElementById('mp-leaderboard');
            if (leaderboard) {
                leaderboard.style.display = 'block';
                // Update leaderboard when shown
                const client = window.cvcClient;
                if (client && client.serverState && client.serverState.players) {
                    updateLeaderboard(client.serverState.players);
                }
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Tab' && mpGameActive) {
            const leaderboard = document.getElementById('mp-leaderboard');
            if (leaderboard) {
                leaderboard.style.display = 'none';
            }
        }
    });

    // Client event handlers
    client.onConnect = () => updateConnectionStatus(true);
    client.onDisconnect = () => updateConnectionStatus(false);

    client.onMatchJoined = (msg) => {
        if (msg.playerId === client.playerId) {
            document.getElementById('mp-lobby').style.display = 'none';
            document.getElementById('mp-match-info').style.display = 'block';
            document.getElementById('mp-current-match-id').textContent = client.matchId;
            document.getElementById('mp-your-team').textContent = client.team.toUpperCase();
            document.getElementById('mp-your-team').style.color =
                client.team === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
        }
        updateMatchInfo(msg.matchInfo);
    };

    client.onMatchStateUpdate = (msg) => {
        if (msg.state === CVC_CONSTANTS.STATE.LOADOUT_SELECTION) {
            showLoadoutSelection(client.team);
        }
    };

    client.onRoundStart = () => {
        document.getElementById('mp-loadout-modal').classList.remove('active');
        document.getElementById('multiplayer-screen').classList.remove('active');
        startMultiplayerGame();
    };

    client.onRoleSwitch = () => {
        document.getElementById('mp-your-team').textContent = client.team.toUpperCase();
        document.getElementById('mp-your-team').style.color =
            client.team === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
    };

    client.onMatchEnd = (msg) => {
        showMatchResults(msg.results);
    };

    client.onError = (msg) => {
        alert('Error: ' + msg.error);
    };
}

function updateMatchInfo(info) {
    if (!info) return;
    document.getElementById('mp-player-count').textContent = info.playerCount;
}

function showLoadoutSelection(role) {
    const loadouts = CVC_LOADOUTS[role];
    if (!loadouts) return;

    document.getElementById('mp-loadout-role').textContent =
        `You are a ${role === 'cops' ? 'COP' : 'CRIMINAL'}`;

    // Populate primary weapons
    const primaryContainer = document.getElementById('mp-primary-weapons');
    primaryContainer.innerHTML = '';
    for (const [id, weapon] of Object.entries(loadouts.primary)) {
        const div = document.createElement('div');
        div.className = 'loadout-option';
        div.dataset.weapon = id;
        div.innerHTML = `
            <strong>${weapon.name}</strong><br>
            DMG: ${weapon.damage}<br>
            ${weapon.description || ''}
        `;
        div.addEventListener('click', () => {
            primaryContainer.querySelectorAll('.loadout-option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
        });
        primaryContainer.appendChild(div);
    }

    // Populate secondary weapons
    const secondaryContainer = document.getElementById('mp-secondary-weapons');
    secondaryContainer.innerHTML = '';
    for (const [id, weapon] of Object.entries(loadouts.secondary)) {
        const div = document.createElement('div');
        div.className = 'loadout-option';
        div.dataset.weapon = id;
        div.innerHTML = `
            <strong>${weapon.name}</strong><br>
            DMG: ${weapon.damage}<br>
            ${weapon.description || ''}
        `;
        div.addEventListener('click', () => {
            secondaryContainer.querySelectorAll('.loadout-option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
        });
        secondaryContainer.appendChild(div);
    }

    // Populate equipment
    const equipContainer = document.getElementById('mp-equipment');
    equipContainer.innerHTML = '';
    for (const [id, equip] of Object.entries(loadouts.equipment)) {
        const div = document.createElement('div');
        div.className = 'loadout-option';
        div.dataset.weapon = id;
        div.innerHTML = `
            <strong>${equip.name}</strong><br>
            QTY: ${equip.quantity}<br>
            ${equip.description || ''}
        `;
        div.addEventListener('click', () => {
            equipContainer.querySelectorAll('.loadout-option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
        });
        equipContainer.appendChild(div);
    }

    document.getElementById('mp-loadout-modal').classList.add('active');
}

function showMatchResults(results) {
    // Stop the multiplayer game loop
    mpGameActive = false;
    
    const title = document.getElementById('mp-results-title');
    if (results.winner === 'tie') {
        title.textContent = 'MATCH TIED!';
        title.style.color = '#ff0';
    } else {
        title.textContent = `${results.winner.toUpperCase()} WIN!`;
        title.style.color = results.winner === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
    }

    document.getElementById('mp-cops-final-score').textContent = results.finalScores.cops;
    document.getElementById('mp-criminals-final-score').textContent = results.finalScores.criminals;

    const rankingsList = document.getElementById('mp-rankings-list');
    rankingsList.innerHTML = '';
    results.playerRankings.forEach((player, index) => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 5px; background: #333; margin: 3px 0;';
        const net = player.totalPointsEarned - player.totalPointsLost;
        
        // Create elements safely to avoid XSS
        const rankSpan = document.createElement('span');
        rankSpan.style.color = '#888';
        rankSpan.textContent = `#${index + 1}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.style.color = player.originalTeam === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
        nameSpan.textContent = ' ' + (player.id || '').substring(0, 10);
        
        const scoreSpan = document.createElement('span');
        scoreSpan.style.cssText = `float: right; color: ${net >= 0 ? '#0f0' : '#f00'};`;
        scoreSpan.textContent = `${net} pts`;
        
        div.appendChild(rankSpan);
        div.appendChild(nameSpan);
        div.appendChild(scoreSpan);
        rankingsList.appendChild(div);
    });

    document.getElementById('mp-results-modal').classList.add('active');
    document.getElementById('mp-game-container').style.display = 'none';
    
    // Reset multiplayer mode when showing results
    if (typeof gameState !== 'undefined') {
        gameState.multiplayerMode = false;
    }
}

// Global reference to multiplayer game state
let mpGameActive = false;
let mpRenderer = null;

function startMultiplayerGame() {
    // Set multiplayer mode flag to stop singleplayer game loop from rendering
    if (typeof gameState !== 'undefined') {
        gameState.multiplayerMode = true;
        gameState.playing = false;
    }

    // Hide all other screens, show dedicated multiplayer game container
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('multiplayer-screen').classList.remove('active');
    document.getElementById('mp-loadout-modal').classList.remove('active');
    document.getElementById('mp-game-container').style.display = 'flex';

    // Use the dedicated multiplayer canvas
    const canvas = document.getElementById('mpGameCanvas');
    const ctx = canvas.getContext('2d');
    mpRenderer = new CVCRenderer(canvas, ctx);
    mpRenderer.setClient(window.cvcClient);
    
    // Select a random map for the renderer
    const selectedMapName = mpRenderer.setRandomMap();
    
    // Display the map name in the UI
    const mapNameDisplay = document.getElementById('mp-map-name');
    if (mapNameDisplay) {
        mapNameDisplay.textContent = selectedMapName;
    }

    // Update the player role display
    const client = window.cvcClient;
    const roleDisplay = document.getElementById('mp-your-role');
    if (roleDisplay) {
        const team = client.team || 'Unknown';
        roleDisplay.textContent = team.toUpperCase();
        roleDisplay.style.color = team === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
    }

    mpGameActive = true;
    
    // Remove any existing mouse event listeners before adding new ones
    canvas.removeEventListener('mousemove', handleMpMouseMove);
    canvas.removeEventListener('mousedown', handleMpMouseDown);
    canvas.removeEventListener('mouseup', handleMpMouseUp);
    
    // Add mouse tracking for the multiplayer canvas
    canvas.addEventListener('mousemove', handleMpMouseMove);
    canvas.addEventListener('mousedown', handleMpMouseDown);
    canvas.addEventListener('mouseup', handleMpMouseUp);

    // Start the multiplayer game loop
    mpGameLoop();
}

function handleMpMouseMove(e) {
    const canvas = document.getElementById('mpGameCanvas');
    const rect = canvas.getBoundingClientRect();
    const client = window.cvcClient;
    const localPlayer = client.getLocalPlayer();
    
    if (localPlayer) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        localPlayer.angle = Math.atan2(mouseY - localPlayer.y, mouseX - localPlayer.x);
    }
}

let mpMouseDown = false;
function handleMpMouseDown(e) {
    mpMouseDown = true;
    const client = window.cvcClient;
    const localPlayer = client.getLocalPlayer();
    if (localPlayer) {
        client.sendShoot(localPlayer.angle);
    }
}

function handleMpMouseUp(e) {
    mpMouseDown = false;
}

function mpGameLoop() {
    if (!mpGameActive) return;
    
    const client = window.cvcClient;
    
    // Update HUD
    updateMultiplayerHUD();
    
    // Render the game
    if (mpRenderer) {
        mpRenderer.render();
    }

    // Handle input
    handleMultiplayerInput();

    // Continue game loop based on state
    const state = client.serverState.state;
    if (client.isConnected() && mpGameActive) {
        // Continue loop for any active game state
        if (state === CVC_CONSTANTS.STATE.PLAYING || 
            state === CVC_CONSTANTS.STATE.COUNTDOWN ||
            state === CVC_CONSTANTS.STATE.ROUND_END ||
            state === CVC_CONSTANTS.STATE.ROLE_SWITCH) {
            requestAnimationFrame(mpGameLoop);
        } else if (state === CVC_CONSTANTS.STATE.MATCH_END) {
            // Match ended - will be handled by event
            mpGameActive = false;
        } else {
            // Keep rendering for other states
            requestAnimationFrame(mpGameLoop);
        }
    }
}

function updateMultiplayerHUD() {
    const client = window.cvcClient;
    if (!client) return;
    
    const state = client.serverState;
    const localPlayer = client.getLocalPlayer();
    
    // Update round info
    const roundDisplay = document.getElementById('mp-round-display');
    if (roundDisplay) {
        roundDisplay.textContent = `${state.round || 1} / ${CVC_CONSTANTS.TOTAL_ROUNDS}`;
    }
    
    // Update timer
    const timerDisplay = document.getElementById('mp-timer-display');
    if (timerDisplay) {
        const timeRemaining = state.roundTimeRemaining || 0;
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerDisplay.style.color = timeRemaining < 30000 ? '#f00' : '#0f0';
    }
    
    // Update team scores
    const scores = state.scores || { teamScores: { cops: 0, criminals: 0 } };
    const copsScore = document.getElementById('mp-cops-score-display');
    const criminalsScore = document.getElementById('mp-criminals-score-display');
    if (copsScore) copsScore.textContent = scores.teamScores.cops || 0;
    if (criminalsScore) criminalsScore.textContent = scores.teamScores.criminals || 0;
    
    // Update player status
    if (localPlayer) {
        const healthDisplay = document.getElementById('mp-health-display');
        const armorDisplay = document.getElementById('mp-armor-display');
        if (healthDisplay) healthDisplay.textContent = Math.floor(localPlayer.health || 100);
        if (armorDisplay) armorDisplay.textContent = Math.floor(localPlayer.armor || 100);
    }
    
    // Update civilians status
    const civilians = state.civilians || [];
    const civAlive = document.getElementById('mp-civilians-alive');
    const civRescued = document.getElementById('mp-civilians-rescued');
    const civDead = document.getElementById('mp-civilians-dead');
    
    const alive = civilians.filter(c => !c.rescued && !c.dead).length;
    const rescued = civilians.filter(c => c.rescued).length;
    const dead = civilians.filter(c => c.dead).length;
    
    if (civAlive) civAlive.textContent = alive;
    if (civRescued) civRescued.textContent = rescued;
    if (civDead) civDead.textContent = dead;
    
    // Update leaderboard only when visible (toggle with Tab key)
    // Leaderboard updates are rate-limited to avoid excessive DOM manipulation
}

// Track last leaderboard update to rate-limit updates
let lastLeaderboardUpdate = 0;
const LEADERBOARD_UPDATE_INTERVAL = 500; // Update every 500ms max

function updateLeaderboard(players) {
    const leaderboard = document.getElementById('mp-leaderboard');
    const list = document.getElementById('mp-leaderboard-list');
    if (!list || !players) return;
    
    // Rate-limit leaderboard updates
    const now = Date.now();
    if (now - lastLeaderboardUpdate < LEADERBOARD_UPDATE_INTERVAL) return;
    lastLeaderboardUpdate = now;
    
    list.innerHTML = '';
    players.forEach(player => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 3px 5px; margin: 2px 0; font-size: 12px;';
        const teamColor = player.team === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
        const aliveIndicator = player.alive ? '●' : '✕';
        const aliveColor = player.alive ? '#0f0' : '#f00';
        
        // Create elements safely to avoid XSS
        const statusSpan = document.createElement('span');
        statusSpan.style.color = aliveColor;
        statusSpan.textContent = aliveIndicator;
        
        const nameSpan = document.createElement('span');
        nameSpan.style.color = teamColor;
        // Sanitize player name - use only alphanumeric and limited characters
        const safeName = (player.name || player.id || '').substring(0, 8).replace(/[<>&"']/g, '');
        nameSpan.textContent = ' ' + safeName;
        
        div.appendChild(statusSpan);
        div.appendChild(nameSpan);
        list.appendChild(div);
    });
}

function leaveMultiplayerGame() {
    mpGameActive = false;
    
    // Remove event listeners
    const canvas = document.getElementById('mpGameCanvas');
    if (canvas) {
        canvas.removeEventListener('mousemove', handleMpMouseMove);
        canvas.removeEventListener('mousedown', handleMpMouseDown);
        canvas.removeEventListener('mouseup', handleMpMouseUp);
    }
    
    // Leave the match
    const client = window.cvcClient;
    if (client) {
        client.leaveMatch();
    }
    
    // Hide multiplayer game container, show menu
    document.getElementById('mp-game-container').style.display = 'none';
    document.getElementById('multiplayer-screen').classList.add('active');
    
    // Reset singleplayer state
    if (typeof gameState !== 'undefined') {
        gameState.multiplayerMode = false;
    }
}

function handleMultiplayerInput() {
    const client = window.cvcClient;
    if (!client.isConnected()) return;

    // Check if the global keys and mouse objects exist (from main game ui.js)
    const gameKeys = typeof keys !== 'undefined' ? keys : {};
    const gameMouse = typeof mouse !== 'undefined' ? mouse : { x: 0, y: 0 };

    let dx = 0, dy = 0;
    if (gameKeys['w'] || gameKeys['W']) dy -= 1;
    if (gameKeys['s'] || gameKeys['S']) dy += 1;
    if (gameKeys['a'] || gameKeys['A']) dx -= 1;
    if (gameKeys['d'] || gameKeys['D']) dx += 1;

    const localPlayer = client.getLocalPlayer();
    let angle = localPlayer ? localPlayer.angle : 0;

    // Update angle from mouse
    if (localPlayer && gameMouse) {
        angle = Math.atan2(gameMouse.y - localPlayer.y, gameMouse.x - localPlayer.x);
    }

    const input = {
        dx,
        dy,
        angle,
        sprinting: gameKeys['Shift'],
        crouching: gameKeys['Control']
    };

    client.sendInput(input);
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initMultiplayerUI);
}