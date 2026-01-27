let gameState = {
    screen: 'home', // home, levelSelect, playing, editor, lockpick
    playing: false,
    multiplayerMode: false, // Flag to prevent singleplayer logic during multiplayer
    editorMode: false,
    currentTool: 'wall',
    currentMission: null,
    player: null,
    enemies: [],
    civilians: [],
    bullets: [],
    particles: [],
    items: [],
    doors: [],
    grenades: [],
    grid: [],
    loadout: {
        primary: 'mp5',
        secondary: 'm1911',
        equipment: 'flashbang'
    },
    objectives: {
        eliminateEnemies: false,
        rescueHostages: false,
        reachExtraction: false
    },
    lockpickTarget: null
};

const keys = {};
const mouse = { x: 0, y: 0, down: false };

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function initGrid() {
    gameState.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        gameState.grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            // 0 = floor, 1 = wall, 2 = spawn, 3 = cover, 4 = exit
            if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
                gameState.grid[y][x] = 1; // Border walls
            } else {
                gameState.grid[y][x] = 0; // Floor
            }
        }
    }
}

function createDefaultLevel() {
    initGrid();

    // Create some rooms
    for (let x = 10; x < 30; x++) {
        gameState.grid[10][x] = 1;
        gameState.grid[20][x] = 1;
    }
    for (let y = 10; y < 20; y++) {
        gameState.grid[y][10] = 1;
        gameState.grid[y][20] = 1;
        gameState.grid[y][30] = 1;
    }

    // Doors
    gameState.grid[15][10] = 0;
    gameState.grid[15][20] = 0;
    gameState.grid[15][30] = 0;

    // Cover
    gameState.grid[15][13] = 3;
    gameState.grid[15][27] = 3;

    // Add extraction point
    gameState.grid[5][35] = 4;
    gameState.grid[5][36] = 4;
    gameState.grid[6][35] = 4;
    gameState.grid[6][36] = 4;

    gameState.player = new Player(100, 100);

    gameState.enemies = [];
    gameState.enemies.push(new Enemy(400, 300));
    gameState.enemies.push(new Enemy(600, 300));
    gameState.enemies.push(new Enemy(500, 400, 'heavy'));

    gameState.civilians = [];
    gameState.civilians.push(new Civilian(550, 250));
    gameState.civilians.push(new Civilian(450, 350));

    updateUI();
}

let lockpickState = {
    position: 0,
    direction: 1,
    speed: 3,
    zoneStart: 170,
    zoneEnd: 230
};

function updateLockpick() {
    if (gameState.screen !== "lockpick") return;

    lockpickState.position += lockpickState.direction * lockpickState.speed;

    if (lockpickState.position >= 380) {
        lockpickState.direction = -1;
    } else if (lockpickState.position <= 0) {
        lockpickState.direction = 1;
    }

    const bar = document.getElementById("lockpick-bar");
    if (bar) {
        bar.style.left = lockpickState.position + "px";
    }
}

function attemptLockpick() {
    const inZone = lockpickState.position >= lockpickState.zoneStart && lockpickState.position <= lockpickState.zoneEnd;
    const message = document.getElementById("lockpick-message");
    if (inZone) {
        message.textContent = "SUCCESS!";
        message.style.color = "0f0";
        AudioSystem.playLockpickSuccess();

        setTimeout(() => {
            if (gameState.lockpickTarget) {
                gameState.lockpickTarget.unlock();
                gameState.lockpickTarget = null;
            }
            gameState.screen = "playing";
            gameState.playing = true;
            document.getElementById('lockpick-screen').classList.remove('active');
            document.getElementById('game-container').style.display = 'flex';
        }, 500);
    } else {
        message.textContent = "FAILED! Try again...";
        message.style.color = "#f00";
        AudioSystem.playLockpickFail();
        lockpickState.speed += 0.5; //increased diff.
        setTimeout(() => {
            message.textContent = "";
        }, 1000);
    }
}

function loadMission(missionId) {
    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) return;

    gameState.currentMission = mission;
    gameState.doors = [];
    gameState.enemies = [];
    gameState.civilians = [];
    gameState.grenades = [];
    gameState.bullets = [];
    gameState.particles = [];
    gameState.objectives.reachExtraction = false;

    if (mission.mapData) {
        if (!mission.mapData.grid) {
            mission.mapData.grid = generateMissionGrid(mission);
        }

        gameState.grid = JSON.parse(JSON.stringify(mission.mapData.grid));

        const spawn = mission.mapData.spawn || { x: 2, y: 2 };
        const spawnX = spawn.x * TILE_SIZE + TILE_SIZE / 2;
        const spawnY = spawn.y * TILE_SIZE + TILE_SIZE / 2;
        gameState.player = new Player(spawnX, spawnY);

        if (mission.mapData.entities) {
            if (mission.mapData.entities.enemies) {
                mission.mapData.entities.enemies.forEach(e => {
                    const enemyX = e.x * TILE_SIZE + TILE_SIZE / 2;
                    const enemyY = e.y * TILE_SIZE + TILE_SIZE / 2;
                    const enemy = new Enemy(enemyX, enemyY, e.type || "normal");
                    if (e.patrolPoints) {
                        enemy.patrolPoints = e.patrolPoints;
                    }
                    gameState.enemies.push(enemy);
                });
            }

            if (mission.mapData.entities.civilians) {
                mission.mapData.entities.civilians.forEach(c => {
                    const civX = c.x * TILE_SIZE + TILE_SIZE / 2;
                    const civY = c.y * TILE_SIZE + TILE_SIZE / 2;
                    gameState.civilians.push(new Civilian(civX, civY));
                });
            }

            if (mission.mapData.entities.doors) {
                mission.mapData.entities.doors.forEach(d => {
                    const doorX = d.x * TILE_SIZE;
                    const doorY = d.y * TILE_SIZE;
                    gameState.doors.push(new Door(doorX, doorY, d.locked || false));
                });
            }
        }

        if (spawn.x >= 0 && spawn.x < GRID_WIDTH && spawn.y >= 0 && spawn.y < GRID_HEIGHT) {
            gameState.grid[spawn.y][spawn.x] = 2;
        }

        let hasExit = false;
        for (let y = 0; y < GRID_HEIGHT && !hasExit; y++) {
            for (let x = 0; x < GRID_WIDTH && !hasExit; x++) {
                if (gameState.grid[y][x] === 4) hasExit = true;
            }
        }
        if (!hasExit) {
            gameState.grid[GRID_HEIGHT - 4][GRID_WIDTH - 3] = 4;
        }
    } else {
        createDefaultLevel();
    }

    updateUI();
    gameState.screen = 'playing';
    // Don't set playing = true here - wait for START GAME button
    // gameState.playing = true;
    document.getElementById('level-select-screen').classList.remove('active');
    document.getElementById('community-screen').classList.remove('active');
    document.getElementById('game-container').style.display = 'flex';
}

function gameLoop() {
    // Skip singleplayer rendering if in multiplayer mode
    if (gameState.multiplayerMode) {
        requestAnimationFrame(gameLoop);
        return;
    }

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    gameState.doors.forEach(door => door.draw(ctx));

    if (gameState.playing) {
        gameState.particles = gameState.particles.filter(p => {
            p.update();
            p.draw(ctx);
            return p.lifetime > 0;
        });

        gameState.grenades = gameState.grenades.filter(g => {
            const alive = g.update();
            if (alive) g.draw(ctx);
            return alive;
        });

        gameState.bullets = gameState.bullets.filter(b => {
            const alive = b.update();
            if (alive) b.draw(ctx);
            return alive;
        })

        gameState.civilians.forEach(c => {
            if (gameState.playing) {
                c.update();
            }
            c.draw(ctx);
        });

        gameState.enemies.forEach(e => {
            if (gameState.playing) {
                e.update();
            }
            e.draw(ctx);
        });

        if (gameState.player) {
            let dx = 0, dy = 0;
            if (keys['w'] || keys['W']) dy -= 1;
            if (keys['s'] || keys['S']) dy += 1;
            if (keys['a'] || keys['A']) dx -= 1;
            if (keys['d'] || keys['D']) dx += 1;

            if (dx !== 0 || dy !== 0) {
                const magnitude = Math.sqrt(dx * dx + dy * dy);
                gameState.player.move(dx / magnitude, dy / magnitude);
            }

            // Check if player reached extraction point
            const playerGridX = Math.floor(gameState.player.x / TILE_SIZE);
            const playerGridY = Math.floor(gameState.player.y / TILE_SIZE);
            if (playerGridX >= 0 && playerGridX < GRID_WIDTH && playerGridY >= 0 && playerGridY < GRID_HEIGHT) {
                if (gameState.grid[playerGridY][playerGridX] === 4 && !gameState.objectives.reachExtraction) {
                    gameState.objectives.reachExtraction = true;
                    checkObjectives();
                }
            }

            if (mouse.down && gameState.player.canFire) {
                const weapon = gameState.player.weapons[gameState.player.currentWeapon];
                if (weapon.auto) {
                    gameState.player.shoot();
                }
            }

            gameState.player.draw(ctx);
        }
    } else {
        //Draw everything in Editor mode, but don't update
        gameState.civilians.forEach(c => c.draw(ctx));
        gameState.enemies.forEach(e => e.draw(ctx));
        if (gameState.player) {
            gameState.player.draw(ctx);
        }
    }

    drawMinimap();
    requestAnimationFrame(gameLoop);
}

function drawGrid() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tile = gameState.grid[y][x];
            let color;
            switch (tile) {
                case 1: color = '#444'; break; // Wall
                case 2: color = '#0f0'; break; // Spawn
                case 3: color = '#666'; break; // Cover
                case 4: color = '#00f'; break; // Exit
                default: color = '#222'; break; // Floor
            }
            ctx.fillStyle = color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Grid lines
            ctx.strokeStyle = '#333';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Add special marking for exit tiles
            if (tile === 4) {
                // Draw animated extraction point marker
                const time = Date.now() / 1000;
                const pulse = Math.sin(time * EXTRACTION_PULSE_FREQUENCY) * EXTRACTION_PULSE_AMPLITUDE + EXTRACTION_PULSE_BASE;
                ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
                ctx.fillRect(x * TILE_SIZE + 3, y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);

                // Draw "EXIT" text
                ctx.fillStyle = '#0f0';
                ctx.font = 'bold 10px monospace';
                ctx.fillText('EXIT', x * TILE_SIZE + 2, y * TILE_SIZE + 13);

                // Draw arrow pointing down
                ctx.fillStyle = '#0f0';
                ctx.beginPath();
                ctx.moveTo(x * TILE_SIZE + 10, y * TILE_SIZE + 5);
                ctx.lineTo(x * TILE_SIZE + 7, y * TILE_SIZE + 2);
                ctx.lineTo(x * TILE_SIZE + 13, y * TILE_SIZE + 2);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

// Draw minimap
function drawMinimap() {
    const minimapCanvas = document.getElementById('minimap');
    const mctx = minimapCanvas.getContext('2d');
    const scale = 180 / (GRID_WIDTH * TILE_SIZE);

    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, 180, 180);

    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (gameState.grid[y][x] === 1) {
                mctx.fillStyle = '#666';
                mctx.fillRect(x * TILE_SIZE * scale, y * TILE_SIZE * scale,
                    TILE_SIZE * scale, TILE_SIZE * scale);
            }
        }
    }

    // Draw enemies
    gameState.enemies.forEach(e => {
        mctx.fillStyle = '#f00';
        mctx.fillRect(e.x * scale - 2, e.y * scale - 2, 4, 4);
    });

    // Draw civilians
    gameState.civilians.forEach(c => {
        mctx.fillStyle = c.rescued ? '#0f0' : '#ff0';
        mctx.fillRect(c.x * scale - 2, c.y * scale - 2, 4, 4);
    });

    // Draw player
    if (gameState.player) {
        mctx.fillStyle = '#0ff';
        mctx.fillRect(gameState.player.x * scale - 3, gameState.player.y * scale - 3, 6, 6);
    }
}

// Check objectives
function checkObjectives() {
    const allEnemiesDefeated = gameState.enemies.length === 0;
    const allHostagesRescued = gameState.civilians.every(c => c.rescued);
    const reachedExtraction = gameState.objectives.reachExtraction;

    gameState.objectives.eliminateEnemies = allEnemiesDefeated;
    gameState.objectives.rescueHostages = allHostagesRescued;

    const objectivesList = document.getElementById('objectives-list');
    objectivesList.innerHTML = `
        <div class="objective-item ${allEnemiesDefeated ? 'objective-complete' : 'objective-incomplete'}">
            ${allEnemiesDefeated ? '✓' : '•'} Neutralize all hostiles
        </div>
        <div class="objective-item ${allHostagesRescued ? 'objective-complete' : 'objective-incomplete'}">
            ${allHostagesRescued ? '✓' : '•'} Rescue all hostages
        </div>
        <div class="objective-item ${reachedExtraction ? 'objective-complete' : 'objective-incomplete'}">
            ${reachedExtraction ? '✓' : '•'} Reach extraction point
        </div>
    `;

    if (allEnemiesDefeated && allHostagesRescued && reachedExtraction) {
        gameState.playing = false;
        AudioSystem.playVictory();
        // Reset all keys to prevent stuck movement
        for (let key in keys) {
            keys[key] = false;
        }
        setTimeout(() => {
            alert('MISSION SUCCESS!\n\nAll objectives completed!');
            // Return to menu instead of reloading the level
            gameState.playing = false;
            gameState.editorMode = false;
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('home-screen').classList.add('active');
            AudioSystem.playMusic("menu");
        }, VICTORY_DELAY_MS);
    }
}

// Game over
function gameOver() {
    gameState.playing = false;
    AudioSystem.playGameOver();
    // Reset all keys to prevent stuck movement
    for (let key in keys) {
        keys[key] = false;
    }
    alert('MISSION FAILED\n\nYou have been eliminated.');
    // Return to menu instead of reloading the level
    gameState.playing = false;
    gameState.editorMode = false;
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('home-screen').classList.add('active');
    AudioSystem.playMusic("menu");
}

// Level Editor
function placeInEditor(x, y) {
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);

    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return;

    const tool = gameState.currentTool;

    switch (tool) {
        case 'wall':
            gameState.grid[gridY][gridX] = 1;
            break;
        case 'floor':
            gameState.grid[gridY][gridX] = 0;
            break;
        case 'cover':
            gameState.grid[gridY][gridX] = 3;
            break;
        case 'door':
            gameState.doors.push(new Door(gridX * TILE_SIZE, gridY * TILE_SIZE, false));
            break;
        case 'lockeddoor':
            gameState.doors.push(new Door(gridX * TILE_SIZE, gridY * TILE_SIZE, true));
            break;
        case 'spawn':
            gameState.grid[gridY][gridX] = 2;
            if (gameState.player) {
                gameState.player.x = gridX * TILE_SIZE + TILE_SIZE / 2;
                gameState.player.y = gridY * TILE_SIZE + TILE_SIZE / 2;
            }
            break;
        case 'exit':
            gameState.grid[gridY][gridX] = 4;
            break;
        case 'enemy':
            gameState.enemies.push(new Enemy(
                gridX * TILE_SIZE + TILE_SIZE / 2,
                gridY * TILE_SIZE + TILE_SIZE / 2
            ));
            break;
        case 'hostage':
            gameState.civilians.push(new Civilian(
                gridX * TILE_SIZE + TILE_SIZE / 2,
                gridY * TILE_SIZE + TILE_SIZE / 2
            ));
            break;
    }
}

function saveLevel() {
    const levelData = MapLoader.createMapData({
        name: "Custom Level",
        author: "Player",
        difficulty: "medium"
    });

    const json = JSON.stringify(levelData);
    localStorage.setItem('customLevel', json);
    alert('Level saved!');
}

function loadLevel() {
    const json = localStorage.getItem('customLevel');
    if (!json) {
        alert('No saved level found!');
        return;
    }

    try {
        const levelData = JSON.parse(json);

        gameState.doors = [];
        gameState.enemies = [];
        gameState.civilians = [];

        MapLoader.loadMap(levelData);

        updateUI();
        alert('Level loaded!');
    } catch (error) {
        console.error("Error loading level: ", error);
        alert("Error loading level!")
    }
}

function loadLevelFromFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const mapData = JSON.parse(e.target.result);
            loadLevelFromData(mapData);
        } catch (error) {
            console.error("Error loading map file:", error);
            alert("Error loading map file: invalid format.");
        }
    };
    reader.readAsText(file);
}

function loadLevelFromData(mapData) {
    if (MapLoader.loadMap(mapData)) {
        gameState.screen = "playing";
        // Don't set playing = true here - wait for START GAME button
        // gameState.playing = true;
        gameState.editorMode = false;
        document.getElementById('home-screen').classList.remove('active');
        document.getElementById('community-screen').classList.remove('active');
        document.getElementById('game-container').style.display = 'flex';
        document.getElementById('level-editor').classList.remove('active');
        // Don't play music here - wait for START GAME
        // AudioSystem.playMusic("gameplay");
    } else {
        alert("Failed to load map.");
    }
}

// Check for admin test mode on page load
function checkAdminTestMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('adminTest') === 'true') {
        const mapData = sessionStorage.getItem('adminTestMap');
        if (mapData) {
            try {
                const parsed = JSON.parse(mapData);
                // Small delay to ensure everything is loaded
                setTimeout(() => {
                    loadLevelFromData(parsed);
                }, 100);
            } catch (e) {
                console.error('Failed to load admin test map:', e);
            }
        }
    }
}

function clearLevel() {
    if (confirm('Clear the entire level?')) {
        initGrid();
        gameState.enemies = [];
        gameState.civilians = [];
        gameState.doors = [];
    }
}