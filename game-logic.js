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
    ,
    endlessMode: false,
    endlessScore: 0,
    endlessWave: 0,
    endlessHighscore: 0
    ,
    currency: parseInt(localStorage.getItem('pb_currency') || '0'),
    unlocks: JSON.parse(localStorage.getItem('pb_unlocks') || '{}'),
    endlessModifiers: []
};
// === RANDOM MODIFIERS ===
const ENDLESS_MODIFIERS = [
    { name: 'Double Enemies', desc: 'Twice as many enemies spawn each wave.', apply: () => {} },
    { name: 'Fast Enemies', desc: 'Enemies move 50% faster.', apply: () => {} },
    { name: 'Low Gravity', desc: 'Bullets and grenades arc more slowly.', apply: () => {} },
    { name: 'Hardcore', desc: 'Player max health halved.', apply: () => { gameState.player.maxHealth = Math.floor(gameState.player.maxHealth / 2); gameState.player.health = gameState.player.maxHealth; } },
    { name: 'Rich', desc: 'Earn double currency.', apply: () => {} },
    { name: 'Armored Enemies', desc: 'Enemies have 50% more health.', apply: () => {} },
    { name: 'Big Explosions', desc: 'Grenades and explosions have double radius.', apply: () => {} },
    { name: 'Glass Cannon', desc: 'Player deals double damage but takes double damage.', apply: () => { gameState.player.damageMultiplier = 2; gameState.player.damageTakenMultiplier = 2; } },
    { name: 'No Cover', desc: 'No cover tiles spawn.', apply: () => {} },
    { name: 'Elite Enemies', desc: 'Every 3rd enemy is a heavy.', apply: () => {} }
];

function pickRandomModifiers() {
    // Pick 1-2 random modifiers per run
    const shuffled = ENDLESS_MODIFIERS.slice().sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
}

function applyEndlessModifiers() {
    gameState.endlessModifiers.forEach(mod => {
        if (mod.apply) mod.apply();
    });
}

function startEndlessMode() {
    document.getElementById('game-container').style.display = 'flex';
    Art.reset();
    gameState.endlessMode = true;
    gameState.endlessScore = 0;
    gameState.endlessWave = 1;
    gameState.screen = 'endless';
    gameState.playing = true;
    gameState.player = new Player(100, 100);
    gameState.enemies = [];
    gameState.civilians = [];
    gameState.bullets = [];
    gameState.particles = [];
    gameState.items = [];
    gameState.doors = [];
    gameState.grenades = [];
    // Pick random modifiers for this run
    gameState.endlessModifiers = pickRandomModifiers();
    applyEndlessModifiers();
    initGrid();
    spawnEndlessWave();
    updateUI();
    showEndlessUI();
}

function showEndlessUI() {
    setTimeout(() => {
        let modText = '';
        if (gameState.endlessModifiers && gameState.endlessModifiers.length) {
            modText = '\nModifiers:\n' + gameState.endlessModifiers.map(m => m.name + ': ' + m.desc).join('\n');
        }
        PB.toast(`Wave ${gameState.endlessWave}  ·  Score ${gameState.endlessScore}`);
        if (modText && gameState.endlessWave === 1) PB.toast(gameState.endlessModifiers.map(m => m.name).join('  ·  '), 4000);
    }, 100);
}

function spawnEndlessWave() {
    let numEnemies = 3 + Math.floor(gameState.endlessWave * 1.5);
    if (gameState.endlessModifiers.some(m => m.name === 'Double Enemies')) numEnemies *= 2;
    for (let i = 0; i < numEnemies; i++) {
        const ex = 100 + Math.random() * 600;
        const ey = 100 + Math.random() * 400;
        let type = Math.random() < 0.2 + 0.05 * gameState.endlessWave ? 'heavy' : 'normal';
        if (gameState.endlessModifiers.some(m => m.name === 'Elite Enemies') && i % 3 === 2) type = 'heavy';
        const enemy = new Enemy(ex, ey, type);
        if (gameState.endlessModifiers.some(m => m.name === 'Armored Enemies')) enemy.maxHealth = Math.floor(enemy.maxHealth * 1.5);
        if (gameState.endlessModifiers.some(m => m.name === 'Fast Enemies')) enemy.speed = (enemy.speed || 1) * 1.5;
        gameState.enemies.push(enemy);
    }
    // Optional: spawn civilians, items, etc.
}

function endEndlessMode() {
    gameState.endlessMode = false;
    gameState.playing = false;
    if (gameState.endlessScore > gameState.endlessHighscore) {
        gameState.endlessHighscore = gameState.endlessScore;
    }
    // Award currency for meta-progression
    let earned = Math.floor(gameState.endlessScore / 50) + gameState.endlessWave * 2;
    if (gameState.endlessModifiers.some(m => m.name === 'Rich')) earned *= 2;
    gameState.currency += earned;
    localStorage.setItem('pb_currency', gameState.currency);
    PB.dialog({
        title: 'GAME OVER',
        html: `<p>Waves survived: <strong>${gameState.endlessWave}</strong></p>
            <p>Score: <strong>${gameState.endlessScore}</strong> (best ${gameState.endlessHighscore})</p>
            <p>Credits earned: <strong>${earned}</strong> (total ${gameState.currency})</p>`,
        buttons: [
            { label: 'FIELD SHOP', primary: true, action: () => { setTimeout(() => PB.openShop(backToMenu), 0); } },
            { label: 'BACK TO MENU', action: backToMenu },
        ],
    });
}

function backToMenu() {
    gameState.playing = false;
    gameState.editorMode = false;
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('home-screen').classList.add('active');
    AudioSystem.playMusic("menu");
}
// Call this when all enemies are dead in endless mode
function checkEndlessWaveClear() {
    if (gameState.endlessMode && gameState.enemies.length === 0) {
        gameState.endlessWave++;
        gameState.endlessScore += 100 * gameState.endlessWave;
        spawnEndlessWave();
        showEndlessUI();
    }
}

// Patch enemy death logic to call checkEndlessWaveClear
const _Enemy_takeDamage = Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage = function(damage) {
    _Enemy_takeDamage.call(this, damage);
    if (this.health <= 0 && gameState.endlessMode) {
        setTimeout(checkEndlessWaveClear, 100);
    }
};

// Patch player death logic to end endless mode
const _Player_takeDamage = Player.prototype.takeDamage;
Player.prototype.takeDamage = function(damage) {
    _Player_takeDamage.call(this, damage);
    if (this.health <= 0 && gameState.endlessMode) {
        setTimeout(endEndlessMode, 200);
    }
};

const keys = {};
const mouse = { x: 0, y: 0, down: false };

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Sharp on high-resolution screens. Game logic stays in 800x600 units.
const RENDER_SCALE = Math.min(window.devicePixelRatio || 1, 2);
canvas.style.width = canvas.width + 'px';
canvas.style.height = canvas.height + 'px';
canvas.width = canvas.width * RENDER_SCALE;
canvas.height = canvas.height * RENDER_SCALE;

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
    Art.reset();
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

    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 800, 600);

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

    Art.drawFlashes(ctx);
    Art.drawLight(ctx);

    drawMinimap();
    requestAnimationFrame(gameLoop);
}

function drawGrid() {
    Art.drawMap(ctx);
}

// Draw minimap
function drawMinimap() {
    const minimapCanvas = document.getElementById('minimap');
    const mctx = minimapCanvas.getContext('2d');
    const scale = 180 / (GRID_WIDTH * TILE_SIZE);

    mctx.fillStyle = '#0b0f14';
    mctx.fillRect(0, 0, 180, 180);

    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (gameState.grid[y][x] === 1) {
                mctx.fillStyle = '#4b5668';
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
            PB.dialog({
                title: 'MISSION SUCCESS',
                html: '<p>All objectives completed.</p>',
                buttons: [{ label: 'BACK TO MENU', primary: true, action: backToMenu }],
            });
        }, VICTORY_DELAY_MS);
    }
}

// Game over
function gameOver(reason = 'You have been eliminated.') {
    // Endless runs end with their own score screen.
    if (gameState.endlessMode) return;
    gameState.playing = false;
    AudioSystem.playGameOver();
    // Reset all keys to prevent stuck movement
    for (let key in keys) {
        keys[key] = false;
    }
    PB.dialog({
        title: 'MISSION FAILED',
        html: `<p>${PB.esc(reason)}</p>`,
        buttons: [
            { label: 'RETRY', primary: true, action: () => {
                if (gameState.currentMission && gameState.currentMission.id !== 'custom') loadMission(gameState.currentMission.id);
                else backToMenu();
            } },
            { label: 'BACK TO MENU', action: backToMenu },
        ],
    });
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
    PB.toast('Level saved.');
}

function loadLevel() {
    const json = localStorage.getItem('customLevel');
    if (!json) {
        PB.toast('No saved level found.');
        return;
    }

    try {
        const levelData = JSON.parse(json);

        gameState.doors = [];
        gameState.enemies = [];
        gameState.civilians = [];

        MapLoader.loadMap(levelData);

        updateUI();
        PB.toast('Level loaded.');
    } catch (error) {
        console.error("Error loading level: ", error);
        PB.toast('Error loading level.');
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
            PB.toast('This map file is not valid.');
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
        PB.toast('Failed to load map.');
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