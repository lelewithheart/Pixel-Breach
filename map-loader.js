const MapLoader = {
    VERSION: "1.0",

    loadMap(mapData) {
        try {
            if (typeof mapData === "string") {
                mapData = JSON.parse(mapData);
            }

            if (!this.validateMap(mapData)) {
                console.error("Invalid map format");
                return false;
            }

            gameState.doors = [];
            gameState.enemies = [];
            gameState.civilians = [];
            gameState.grenades = [];
            gameState.bullets = [];
            gameState.particles = [];

            if (mapData.grid) {
                gameState.grid = mapData.grid;
            } else {
                initGrid();
            }

            const spawn = mapData.spawn || { x: 5, y: 5 };
            const spawnX = spawn.x * TILE_SIZE + TILE_SIZE / 2;
            const spawnY = spawn.y * TILE_SIZE + TILE_SIZE / 2;
            gameState.player = new Player(spawnX, spawnY);

            if (spawn.x >= 0 && spawn.x < GRID_WIDTH && spawn.y >= 0 && spawn.y < GRID_HEIGHT) {
                gameState.grid[spawn.y][spawn.x] = 2;
            }

            if (mapData.entities) {

                if (mapData.entities.enemies) {
                    mapData.entities.enemies.forEach(e => {
                        const enemyX = e.x * TILE_SIZE + TILE_SIZE / 2;
                        const enemyY = e.y * TILE_SIZE + TILE_SIZE / 2;
                        gameState.enemies.push(new Enemy(enemyX, enemyY, e.type || "normal"));
                    });
                }

                if (mapData.entities.civilians) {
                    mapData.entities.civilians.forEach(c => {
                        const civX = c.x * TILE_SIZE + TILE_SIZE / 2;
                        const civY = c.y * TILE_SIZE + TILE_SIZE / 2;
                        gameState.civilians.push(new Civilian(civX, civY));
                    });
                }

                if (mapData.entities.doors) {
                    mapData.entities.doors.forEach(d => {
                        const doorX = d.x * TILE_SIZE + TILE_SIZE / 2;
                        const doorY = d.y * TILE_SIZE + TILE_SIZE / 2;
                        gameState.doors.push(new Door(doorX, doorY, d.locked || false));
                    });
                }
            }

            if (mapData.metadata) {
                gameState.currentMission = {
                    id: "custom",
                    name: mapData.metadata.name || "Custom Map",
                    description: mapData.metadata.description || "",
                    author: mapData.metadata.author || "Unknown",
                    objectives: this.getObjectivesList(mapData.objectives)
                };
            }

            updateUI();
            return true;
        } catch (error) {
            console.error("Error loading map: ", error);
            return false;
        }
    },

    async loadMapFromFile(file) {
        try {
            const text = await file.text();
            return this.loadMap(text);
        } catch (error) {
            console.error("Error reading map file:", error);
            return false;
        }
    },

    validateMap(mapData) {
        if (!mapData || typeof mapData !== 'object') {
            return false;
        }

        // Grid is required
        if (!mapData.grid || !Array.isArray(mapData.grid)) {
            return false;
        }

        // Check grid dimensions
        if (mapData.grid.length === 0 || !Array.isArray(mapData.grid[0])) {
            return false;
        }

        return true;
    },

    getObjectivesList(objectives) {
        const list = [];
        if (!objectives) {
            list.push('Neutralize all hostiles');
            list.push('Rescue all hostages');
            list.push('Reach extraction point');
            return list;
        }

        if (objectives.eliminateEnemies !== false) {
            list.push('Neutralize all hostiles');
        }
        if (objectives.rescueHostages !== false) {
            list.push('Rescue all hostages');
        }
        if (objectives.reachExtraction !== false) {
            list.push('Reach extraction point');
        }
        if (objectives.custom && Array.isArray(objectives.custom)) {
            list.push(...objectives.custom);
        }
        return list;
    },

    createMapData(options = {}) {
        let spawnX = 5, spawnY = 5;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (gameState.grid[y][x] === 2) {
                    spawnX = x;
                    spawnY = y;
                    break;
                }
            }
        }

        const enemies = gameState.enemies.map(e => ({
            x: Math.floor(e.x / TILE_SIZE),
            y: Math.floor(e.y / TILE_SIZE),
            type: e.type || "normal"
        }));

        const civilians = gameState.civilians.map(c => ({
            x: Math.floor(c.x / TILE_SIZE),
            y: Math.floor(c.y / TILE_SIZE)
        }));

        const doors = gameState.doors.map(d => ({

            x: Math.floor(d.x / TILE_SIZE),
            y: Math.floor(d.y / TILE_SIZE),
            locked: d.locked || false
        }));

        return {
            version: this.VERSION,
            metadata: {
                name: options.name || "Untitled Map",
                description: options.description || "",
                author: options.author || "Unknown",
                difficulty: options.difficulty || "medium",
                createdAt: new Date().toISOString()
            },
            settings: {
                gridWidth: GRID_WIDTH,
                gridHeight: GRID_HEIGHT,
                timeLimit: options.timeLimit || null
            },
            grid: gameState.grid,
            spawn: { x: spawnX, y: spawnY },
            entities: {
                enemies,
                civilians,
                doors
            },
            rooms: options.rooms || []
        };
    },

    exportMap(options = {}) {
        const mapData = this.createMapData(options);
        const json = JSON.stringify(mapData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        const filename = (options.name || "pixel-breach-map").toLowerCase().replace(/\s+/g, '-') + '.json';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    saveToLocalStorage(options = {}) {
        const mapData = this.createMapData(options);
        localStorage.setItem("customLevel", JSON.stringify(mapData));
    },

    loadFromLocalStorage() {
        const json = localStorage.getItem("customLevel");
        if (!json) {
            return false;
        }
        return this.loadMap(json);
    }
}

function loadMap(mapData) {
    return MapLoader.loadMap(mapData);
}
