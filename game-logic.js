function readJSON(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch (e) {
        return fallback;
    }
}
function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
}

function loadSavedLoadout() {
    const saved = readJSON('pb_loadout', {});
    const unlocks = readJSON('pb_unlocks', {});
    const loadout = { primary: 'mp5', secondary: 'm1911', equipment: 'flashbang' };
    if (WEAPONS[saved.primary] && (saved.primary === 'mp5' || unlocks[saved.primary])) loadout.primary = saved.primary;
    if (WEAPONS[saved.secondary]) loadout.secondary = saved.secondary;
    if (EQUIPMENT[saved.equipment]) loadout.equipment = saved.equipment;
    return loadout;
}

let gameState = {
    screen: 'home', // home, briefing, playing, lockpick
    playing: false,
    paused: false,
    multiplayerMode: false,
    editorMode: false,
    currentMission: null,
    lastMapData: null,
    player: null,
    enemies: [],
    civilians: [],
    bullets: [],
    particles: [],
    items: [],
    doors: [],
    grenades: [],
    smokes: [],
    spawnMarkers: [],
    grid: [],
    loadout: loadSavedLoadout(),
    objectives: {
        eliminateEnemies: false,
        rescueHostages: false,
        reachExtraction: false
    },
    lockpickTarget: null,
    enemyTotal: 0,
    hostilesDownShown: false,
    endlessMode: false,
    endlessScore: 0,
    endlessWave: 0,
    endlessHighscore: parseInt(localStorage.getItem('pb_endless_best') || '0'),
    currency: parseInt(localStorage.getItem('pb_currency') || '0'),
    unlocks: readJSON('pb_unlocks', {}),
    progress: readJSON('pb_progress', {}),
    endlessModifiers: [],
    blastScale: 1,
    // Game clock in ms. Only advances while playing, so pause and lockpick freeze everything.
    now: 0,
    dt: 16,
    missionStart: 0,
    waveClearAt: 0,
};

const keys = {};
// x/y are world coordinates, sx/sy are screen (canvas logical) coordinates.
const mouse = { x: 0, y: 0, sx: 400, sy: 300, down: false };
const cam = { x: 0, y: 0 };

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let RENDER_SCALE = 1;

/** Matches the backing store to the CSS size, so the game stays sharp at any zoom. */
function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = rect.width || VIEW_W;
    RENDER_SCALE = Math.max(1, Math.min(2.5, cssW * dpr / VIEW_W));
    const w = Math.round(VIEW_W * RENDER_SCALE), h = Math.round(VIEW_H * RENDER_SCALE);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
}
if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(canvas);
window.addEventListener('resize', fitCanvas);

// === ENDLESS MODE ===
const ENDLESS_MODIFIERS = [
    { name: 'Double Enemies', desc: 'Twice as many enemies spawn each wave.' },
    { name: 'Fast Enemies', desc: 'Enemies move 50% faster.' },
    { name: 'Hardcore', desc: 'Your max health is halved.', apply: () => { gameState.player.maxHealth = Math.floor(gameState.player.maxHealth / 2); gameState.player.health = gameState.player.maxHealth; } },
    { name: 'Rich', desc: 'Earn double credits.' },
    { name: 'Armored Enemies', desc: 'Enemies have 50% more health.' },
    { name: 'Big Explosions', desc: 'Grenades have double blast radius.', apply: () => { gameState.blastScale = 2; } },
    { name: 'Glass Cannon', desc: 'You deal double damage but take double damage.', apply: () => { gameState.player.damageMultiplier = 2; gameState.player.damageTakenMultiplier = 2; } },
    { name: 'No Cover', desc: 'The arena has no cover.', apply: () => {
        for (let y = 0; y < GRID_HEIGHT; y++) for (let x = 0; x < GRID_WIDTH; x++) if (gameState.grid[y][x] === 3) gameState.grid[y][x] = 0;
    } },
    { name: 'Elite Enemies', desc: 'Every 3rd enemy is a heavy.' }
];

function hasModifier(name) {
    return gameState.endlessModifiers.some(m => m.name === name);
}

function pickRandomModifiers() {
    const shuffled = ENDLESS_MODIFIERS.slice().sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
}

/** A fixed arena with pillars and cover, so endless waves have something to fight around. */
function buildEndlessArena() {
    initGrid();
    const g = gameState.grid;
    const block = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = 1; };
    block(9, 7, 2, 2); block(29, 7, 2, 2); block(9, 21, 2, 2); block(29, 21, 2, 2);
    block(19, 4, 2, 3); block(19, 23, 2, 3);
    block(5, 14, 3, 2); block(32, 14, 3, 2);
    [[14, 11], [25, 11], [14, 18], [25, 18], [19, 14], [20, 15], [4, 4], [35, 4], [4, 25], [35, 25], [12, 15], [27, 15]].forEach(([x, y]) => { g[y][x] = 3; });
}

function startEndlessMode() {
    Art.reset();
    HUD.reset();
    gameState.endlessMode = true;
    gameState.endlessScore = 0;
    gameState.endlessWave = 1;
    gameState.currentMission = { id: 'endless', name: 'Endless', description: 'Survive as many waves as you can. Enemies arrive from the edges.', difficulty: 'endless', tutorialSteps: ['Red markers show where the next enemies arrive', 'Credits are paid out when you fall'] };
    gameState.lastMapData = null;
    gameState.blastScale = 1;
    clearEntities();
    buildEndlessArena();
    gameState.player = new Player(GRID_WIDTH * TILE_SIZE / 2, GRID_HEIGHT * TILE_SIZE / 2);
    gameState.endlessModifiers = pickRandomModifiers();
    gameState.endlessModifiers.forEach(mod => { if (mod.apply) mod.apply(); });
    gameState.now = 0;
    enterMission({ briefing: true });
}

function scheduleEndlessWave() {
    let numEnemies = 3 + Math.floor(gameState.endlessWave * 1.5);
    if (hasModifier('Double Enemies')) numEnemies *= 2;
    const p = gameState.player;
    for (let i = 0; i < numEnemies; i++) {
        let type = Math.random() < 0.2 + 0.05 * gameState.endlessWave ? 'heavy' : 'normal';
        if (hasModifier('Elite Enemies') && i % 3 === 2) type = 'heavy';
        let x = 0, y = 0;
        for (let tries = 0; tries < 60; tries++) {
            const edge = Math.floor(Math.random() * 4);
            const gx = edge === 0 ? 1 + Math.floor(Math.random() * 3) : edge === 1 ? GRID_WIDTH - 4 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * (GRID_WIDTH - 2));
            const gy = edge === 2 ? 1 + Math.floor(Math.random() * 3) : edge === 3 ? GRID_HEIGHT - 4 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * (GRID_HEIGHT - 2));
            if (gameState.grid[gy][gx] !== 0) continue;
            x = gx * TILE_SIZE + TILE_SIZE / 2;
            y = gy * TILE_SIZE + TILE_SIZE / 2;
            if (Math.hypot(x - p.x, y - p.y) >= 220) break;
        }
        gameState.spawnMarkers.push({ x, y, type, until: gameState.now + 1000 + i * 150 });
    }
}

function spawnFromMarker(m) {
    const enemy = new Enemy(m.x, m.y, m.type);
    if (hasModifier('Armored Enemies')) { enemy.maxHealth = Math.floor(enemy.maxHealth * 1.5); enemy.health = enemy.maxHealth; }
    if (hasModifier('Fast Enemies')) enemy.speed *= 1.5;
    enemy.hear(gameState.player.x, gameState.player.y);
    gameState.enemies.push(enemy);
}

function endEndlessMode() {
    gameState.endlessMode = false;
    gameState.playing = false;
    if (gameState.endlessScore > gameState.endlessHighscore) {
        gameState.endlessHighscore = gameState.endlessScore;
        localStorage.setItem('pb_endless_best', gameState.endlessHighscore);
    }
    let earned = Math.floor(gameState.endlessScore / 50) + gameState.endlessWave * 2;
    if (hasModifier('Rich')) earned *= 2;
    gameState.currency += earned;
    localStorage.setItem('pb_currency', gameState.currency);
    AudioSystem.playGameOver();
    PB.dialog({
        title: 'YOU FELL',
        html: `<p>Waves survived: <strong>${gameState.endlessWave}</strong> · Time <strong>${HUD.fmtTime(missionTimeMs())}</strong></p>
            <p>Score: <strong>${gameState.endlessScore}</strong> (best ${gameState.endlessHighscore})</p>
            <p>Kills: <strong>${gameState.player.stats.kills}</strong> · Accuracy ${accuracy()}%</p>
            <p>Credits earned: <strong>${earned}</strong> (total ${gameState.currency})</p>`,
        buttons: [
            { label: 'PLAY AGAIN', primary: true, action: () => { setTimeout(startEndlessMode, 0); } },
            { label: 'FIELD SHOP', action: () => { setTimeout(() => PB.openShop(backToMenu), 0); } },
            { label: 'BACK TO MENU', action: backToMenu },
        ],
    });
}

function checkEndlessWave() {
    if (!gameState.endlessMode || !gameState.playing) return;
    if (gameState.enemies.length > 0 || gameState.spawnMarkers.length > 0) {
        gameState.waveClearAt = 0;
        return;
    }
    if (!gameState.waveClearAt) {
        gameState.waveClearAt = gameState.now + 1500;
        gameState.endlessScore += 100 * gameState.endlessWave;
        HUD.banner('WAVE ' + gameState.endlessWave + ' CLEAR', '+' + (100 * gameState.endlessWave) + ' score', 1400);
        return;
    }
    if (gameState.now >= gameState.waveClearAt) {
        gameState.waveClearAt = 0;
        gameState.endlessWave++;
        HUD.banner('WAVE ' + gameState.endlessWave, 'Incoming', 1500);
        scheduleEndlessWave();
    }
}

// === FLOW ===

function clearEntities() {
    gameState.doors = [];
    gameState.enemies = [];
    gameState.civilians = [];
    gameState.grenades = [];
    gameState.smokes = [];
    gameState.spawnMarkers = [];
    gameState.bullets = [];
    gameState.particles = [];
    gameState.objectives = { eliminateEnemies: false, rescueHostages: false, reachExtraction: false };
    gameState.hostilesDownShown = false;
    gameState.waveClearAt = 0;
    gameState.lockpickTarget = null;
}

function hideOverlays() {
    ['home-screen', 'level-select-screen', 'community-screen', 'lockpick-screen', 'briefing-screen', 'pause-screen', 'loadout-modal']
        .forEach(id => document.getElementById(id).classList.remove('active'));
    PB.closeDialog();
}

function backToMenu() {
    gameState.playing = false;
    gameState.paused = false;
    gameState.endlessMode = false;
    gameState.screen = 'home';
    for (const key in keys) keys[key] = false;
    hideOverlays();
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('home-screen').classList.add('active');
    AudioSystem.playMusic("menu");
}

function initGrid() {
    gameState.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        gameState.grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            gameState.grid[y][x] = (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) ? 1 : 0;
        }
    }
}

function loadMission(missionId, opts = {}) {
    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) return;

    gameState.currentMission = mission;
    gameState.lastMapData = null;
    gameState.endlessMode = false;
    gameState.blastScale = 1;
    Art.reset();
    HUD.reset();
    clearEntities();

    if (!mission.mapData.grid) {
        mission.mapData.grid = generateMissionGrid(mission);
    }
    gameState.grid = JSON.parse(JSON.stringify(mission.mapData.grid));

    const spawn = mission.mapData.spawn || { x: 2, y: 2 };
    gameState.player = new Player(spawn.x * TILE_SIZE + TILE_SIZE / 2, spawn.y * TILE_SIZE + TILE_SIZE / 2);

    const ents = mission.mapData.entities || {};
    (ents.enemies || []).forEach(e => {
        const enemy = new Enemy(e.x * TILE_SIZE + TILE_SIZE / 2, e.y * TILE_SIZE + TILE_SIZE / 2, e.type || "normal");
        if (e.patrolPoints) enemy.patrolPoints = e.patrolPoints;
        gameState.enemies.push(enemy);
    });
    (ents.civilians || []).forEach(c => {
        gameState.civilians.push(new Civilian(c.x * TILE_SIZE + TILE_SIZE / 2, c.y * TILE_SIZE + TILE_SIZE / 2));
    });
    (ents.doors || []).forEach(d => {
        gameState.doors.push(new Door(d.x * TILE_SIZE, d.y * TILE_SIZE, d.locked || false));
    });

    if (spawn.x >= 0 && spawn.x < GRID_WIDTH && spawn.y >= 0 && spawn.y < GRID_HEIGHT) {
        gameState.grid[spawn.y][spawn.x] = 2;
    }

    let hasExit = false;
    for (let y = 0; y < GRID_HEIGHT && !hasExit; y++) {
        for (let x = 0; x < GRID_WIDTH && !hasExit; x++) {
            if (gameState.grid[y][x] === 4) hasExit = true;
        }
    }
    if (!hasExit) gameState.grid[GRID_HEIGHT - 4][GRID_WIDTH - 3] = 4;

    enterMission(opts);
}

function loadLevelFromFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            loadLevelFromData(JSON.parse(e.target.result));
        } catch (error) {
            console.error("Error loading map file:", error);
            PB.toast('This map file is not valid.');
        }
    };
    reader.readAsText(file);
}

function loadLevelFromData(mapData, opts = {}) {
    gameState.endlessMode = false;
    gameState.blastScale = 1;
    HUD.reset();
    clearEntities();
    if (MapLoader.loadMap(mapData)) {
        gameState.lastMapData = mapData;
        enterMission(opts);
    } else {
        PB.toast('Failed to load map.');
    }
}

/** Common entry after a level is built: show the board and the briefing. */
function enterMission(opts = {}) {
    gameState.enemyTotal = gameState.enemies.length;
    gameState.now = 0;
    gameState.dt = 16;
    gameState.missionStart = 0;
    gameState.playing = false;
    gameState.paused = false;
    for (const key in keys) keys[key] = false;
    mouse.down = false;
    hideOverlays();
    document.getElementById('game-container').style.display = 'flex';
    fitCanvas();
    updateCamera(true);
    updateUI();
    checkObjectives();
    if (opts.briefing === false) {
        startPlay();
    } else {
        gameState.screen = 'briefing';
        showBriefing();
    }
}

function startPlay() {
    document.getElementById('briefing-screen').classList.remove('active');
    gameState.screen = 'playing';
    gameState.playing = true;
    gameState.paused = false;
    gameState.missionStart = gameState.now;
    AudioSystem.init();
    AudioSystem.playMusic("gameplay");
    const m = gameState.currentMission;
    if (gameState.endlessMode) {
        HUD.banner('WAVE 1', gameState.endlessModifiers.map(x => x.name).join('  ·  '), 2200);
        scheduleEndlessWave();
    } else {
        HUD.banner((m ? m.name : 'Mission').toUpperCase(), 'Go', 1400);
    }
}

function restartCurrent() {
    if (gameState.endlessMode || (gameState.currentMission && gameState.currentMission.id === 'endless')) {
        startEndlessMode();
    } else if (gameState.lastMapData) {
        loadLevelFromData(gameState.lastMapData, { briefing: false });
    } else if (gameState.currentMission && gameState.currentMission.id !== 'custom') {
        loadMission(gameState.currentMission.id, { briefing: false });
    } else {
        backToMenu();
    }
}

function pauseGame() {
    if (!gameState.playing || gameState.screen !== 'playing') return;
    gameState.playing = false;
    gameState.paused = true;
    mouse.down = false;
    for (const key in keys) keys[key] = false;
    document.getElementById('pause-controls').classList.remove('active');
    document.getElementById('pause-screen').classList.add('active');
    AudioSystem.pauseMusic();
}

function resumeGame() {
    if (!gameState.paused) return;
    document.getElementById('pause-screen').classList.remove('active');
    gameState.paused = false;
    gameState.playing = true;
    AudioSystem.resumeMusic();
}

function togglePause() {
    if (gameState.paused) resumeGame();
    else pauseGame();
}

// === LOCKPICK ===

let lockpickState = { position: 0, direction: 1, speed: 3, zoneStart: 170, zoneEnd: 230 };

function updateLockpick() {
    if (gameState.screen !== "lockpick") return;
    lockpickState.position += lockpickState.direction * lockpickState.speed;
    if (lockpickState.position >= 380) lockpickState.direction = -1;
    else if (lockpickState.position <= 0) lockpickState.direction = 1;
    const bar = document.getElementById("lockpick-bar");
    if (bar) bar.style.left = lockpickState.position + "px";
}

function closeLockpick() {
    gameState.screen = "playing";
    gameState.playing = true;
    gameState.lockpickTarget = null;
    document.getElementById('lockpick-screen').classList.remove('active');
    document.getElementById("lockpick-message").textContent = "";
    lockpickState.speed = 3;
}

function attemptLockpick() {
    const inZone = lockpickState.position >= lockpickState.zoneStart && lockpickState.position <= lockpickState.zoneEnd;
    const message = document.getElementById("lockpick-message");
    if (inZone) {
        message.textContent = "UNLOCKED";
        message.style.color = "#5dff9f";
        AudioSystem.playLockpickSuccess();
        const door = gameState.lockpickTarget;
        setTimeout(() => {
            if (door) { door.unlock(); door.open = true; }
            closeLockpick();
            HUD.notice('Door unlocked');
        }, 400);
    } else {
        message.textContent = "MISSED. The pick moves faster now.";
        message.style.color = "#ff5a4a";
        AudioSystem.playLockpickFail();
        lockpickState.speed += 0.5;
        setTimeout(() => { if (message.textContent.startsWith('MISSED')) message.textContent = ""; }, 1000);
    }
}

// === CAMERA ===

function updateCamera(snap = false) {
    const p = gameState.player;
    if (!p) return;
    const vw = VIEW_W / ZOOM, vh = VIEW_H / ZOOM;
    let lx = (mouse.x - p.x) * CAMERA_LOOKAHEAD, ly = (mouse.y - p.y) * CAMERA_LOOKAHEAD;
    const ll = Math.hypot(lx, ly);
    if (ll > CAMERA_LOOKAHEAD_MAX) { lx *= CAMERA_LOOKAHEAD_MAX / ll; ly *= CAMERA_LOOKAHEAD_MAX / ll; }
    const tx = Math.max(0, Math.min(GRID_WIDTH * TILE_SIZE - vw, p.x + lx - vw / 2));
    const ty = Math.max(0, Math.min(GRID_HEIGHT * TILE_SIZE - vh, p.y + ly - vh / 2));
    if (snap) { cam.x = tx; cam.y = ty; }
    else { cam.x += (tx - cam.x) * CAMERA_LERP; cam.y += (ty - cam.y) * CAMERA_LERP; }
}

function updateMouseWorld() {
    mouse.x = mouse.sx / ZOOM + cam.x;
    mouse.y = mouse.sy / ZOOM + cam.y;
    if (gameState.player) {
        gameState.player.angle = Math.atan2(mouse.y - gameState.player.y, mouse.x - gameState.player.x);
    }
}

// === MAIN LOOP ===

let lastFrame = performance.now();

function gameLoop() {
    if (gameState.multiplayerMode) {
        requestAnimationFrame(gameLoop);
        return;
    }
    const t = performance.now();
    const dt = Math.min(50, t - lastFrame);
    lastFrame = t;
    if (gameState.playing) {
        gameState.now += dt;
        gameState.dt = dt;
    }

    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.fillStyle = "#0c1016";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (document.getElementById('game-container').style.display === 'none' || !gameState.grid.length) {
        requestAnimationFrame(gameLoop);
        return;
    }

    updateMouseWorld();
    if (gameState.playing) updateCamera();
    const sh = HUD.shakeOffset();
    const k = RENDER_SCALE * ZOOM;
    ctx.setTransform(k, 0, 0, k, (-cam.x + sh.x) * k, (-cam.y + sh.y) * k);

    Art.drawMap(ctx);
    gameState.doors.forEach(door => door.draw(ctx));

    const player = gameState.player;
    if (gameState.playing && player) {
        player.update(dt);

        let dx = 0, dy = 0;
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;
        if (dx !== 0 || dy !== 0) {
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            player.move(dx / magnitude, dy / magnitude);
        }

        const playerGridX = Math.floor(player.x / TILE_SIZE);
        const playerGridY = Math.floor(player.y / TILE_SIZE);
        if (tileAt(playerGridX, playerGridY) === 4 && !gameState.objectives.reachExtraction && !gameState.endlessMode) {
            gameState.objectives.reachExtraction = true;
            checkObjectives();
        }

        if (mouse.down && player.weapon.auto) player.shoot(false);

        gameState.particles = gameState.particles.filter(p => { p.update(); p.draw(ctx); return p.lifetime > 0; });
        gameState.grenades = gameState.grenades.filter(g => { const alive = g.update(); if (alive) g.draw(ctx); return alive; });
        gameState.smokes = gameState.smokes.filter(s => s.alive);
        gameState.civilians.forEach(c => { c.update(); c.draw(ctx); });
        gameState.enemies.slice().forEach(e => { e.update(); });
        gameState.enemies.forEach(e => {
            if (Art.isLit(e.x, e.y)) e.seenAt = gameState.now;
            e.draw(ctx);
        });
        player.draw(ctx);
        gameState.smokes.forEach(s => s.draw(ctx));

        for (let i = gameState.spawnMarkers.length - 1; i >= 0; i--) {
            if (gameState.now >= gameState.spawnMarkers[i].until) {
                spawnFromMarker(gameState.spawnMarkers[i]);
                gameState.spawnMarkers.splice(i, 1);
            }
        }
        checkEndlessWave();
    } else {
        gameState.particles.forEach(p => p.draw(ctx));
        gameState.grenades.forEach(g => g.draw(ctx));
        gameState.civilians.forEach(c => c.draw(ctx));
        gameState.enemies.forEach(e => e.draw(ctx));
        if (player) player.draw(ctx);
        gameState.smokes.forEach(s => s.draw(ctx));
    }

    Art.drawLight(ctx);
    // Tracers and flashes glow through the dark.
    if (gameState.playing) {
        gameState.bullets = gameState.bullets.filter(b => { const alive = b.update(); if (alive) b.draw(ctx); return alive; });
    } else {
        gameState.bullets.forEach(b => b.draw(ctx));
    }
    Art.drawFlashes(ctx);

    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    HUD.draw(ctx);

    drawMinimap();
    requestAnimationFrame(gameLoop);
}

function drawMinimap() {
    const minimapCanvas = document.getElementById('minimap');
    const mctx = minimapCanvas.getContext('2d');
    const W = minimapCanvas.width, H = minimapCanvas.height;
    const scale = W / (GRID_WIDTH * TILE_SIZE);
    const oy = (H - GRID_HEIGHT * TILE_SIZE * scale) / 2;

    mctx.fillStyle = '#0b0f14';
    mctx.fillRect(0, 0, W, H);
    mctx.save();
    mctx.translate(0, oy);

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const t = gameState.grid[y][x];
            if (t === 1) mctx.fillStyle = '#4b5668';
            else if (t === 3) mctx.fillStyle = '#2f3745';
            else if (t === 4) mctx.fillStyle = '#2f8f5a';
            else continue;
            mctx.fillRect(x * TILE_SIZE * scale, y * TILE_SIZE * scale, TILE_SIZE * scale, TILE_SIZE * scale);
        }
    }
    gameState.doors.forEach(d => {
        mctx.fillStyle = d.locked ? '#ff6b4a' : '#d7b35c';
        mctx.fillRect(d.gx * TILE_SIZE * scale, d.gy * TILE_SIZE * scale, TILE_SIZE * scale, TILE_SIZE * scale);
    });

    gameState.enemies.forEach(e => {
        if (e.state !== 'engage' && gameState.now - e.seenAt > ENEMY_SEEN_MEMORY_MS) return;
        mctx.fillStyle = '#f33';
        mctx.fillRect(e.x * scale - 2, e.y * scale - 2, 4, 4);
    });
    gameState.spawnMarkers.forEach(m => {
        mctx.fillStyle = 'rgba(255,90,74,0.7)';
        mctx.fillRect(m.x * scale - 2, m.y * scale - 2, 4, 4);
    });
    gameState.civilians.forEach(c => {
        if (c.dead) return;
        mctx.fillStyle = c.rescued ? '#5dff9f' : '#ffd25a';
        mctx.fillRect(c.x * scale - 2, c.y * scale - 2, 4, 4);
    });
    if (gameState.player) {
        mctx.fillStyle = '#55e6ff';
        mctx.fillRect(gameState.player.x * scale - 3, gameState.player.y * scale - 3, 6, 6);
        mctx.strokeStyle = 'rgba(85,230,255,0.45)';
        mctx.lineWidth = 1;
        mctx.strokeRect(cam.x * scale + 0.5, cam.y * scale + 0.5, VIEW_W / ZOOM * scale, VIEW_H / ZOOM * scale);
    }
    mctx.restore();
}

// === OBJECTIVES ===

function missionTimeMs() {
    return Math.max(0, gameState.now - gameState.missionStart);
}

function accuracy() {
    const s = gameState.player ? gameState.player.stats : { shots: 0, hits: 0 };
    return s.shots ? Math.round(100 * s.hits / s.shots) : 0;
}

/** The objective list shown in the HUD, the side panel and the briefing. Derived from what is in the level. */
function getObjectiveState() {
    if (gameState.endlessMode) {
        const left = gameState.enemies.length + gameState.spawnMarkers.length;
        return [{ label: 'Survive the wave', done: false, progress: left + ' left' }];
    }
    const items = [];
    const total = gameState.enemyTotal;
    items.push({ label: 'Neutralize all hostiles', done: gameState.enemies.length === 0, progress: `${total - gameState.enemies.length}/${total}` });
    if (gameState.civilians.length) {
        const rescued = gameState.civilians.filter(c => c.rescued).length;
        items.push({ label: 'Rescue all hostages', done: rescued === gameState.civilians.length, progress: `${rescued}/${gameState.civilians.length}` });
    }
    items.push({ label: 'Reach the extraction point', done: gameState.objectives.reachExtraction, progress: '' });
    return items;
}

function checkObjectives() {
    if (gameState.endlessMode) { renderObjectivesPanel(); return; }
    const allEnemiesDefeated = gameState.enemies.length === 0;
    const allHostagesRescued = gameState.civilians.every(c => c.rescued);
    const reachedExtraction = gameState.objectives.reachExtraction;

    gameState.objectives.eliminateEnemies = allEnemiesDefeated;
    gameState.objectives.rescueHostages = allHostagesRescued;
    renderObjectivesPanel();

    if (gameState.playing && allEnemiesDefeated && allHostagesRescued && !reachedExtraction && !gameState.hostilesDownShown) {
        gameState.hostilesDownShown = true;
        HUD.banner('AREA SECURED', 'Get to the extraction point', 2200);
    }

    if (allEnemiesDefeated && allHostagesRescued && reachedExtraction && gameState.playing) {
        missionComplete();
    }
}

function missionComplete() {
    gameState.playing = false;
    for (const key in keys) keys[key] = false;
    AudioSystem.playVictory();
    const m = gameState.currentMission;
    const time = missionTimeMs();
    const stats = gameState.player.stats;
    const earned = CAMPAIGN_CREDITS_BASE + stats.kills * CAMPAIGN_CREDITS_PER_KILL;
    gameState.currency += earned;
    localStorage.setItem('pb_currency', gameState.currency);

    let best = null;
    if (m && typeof m.id === 'number') {
        const prev = gameState.progress[m.id] || {};
        best = prev.best && prev.best < time ? prev.best : time;
        gameState.progress[m.id] = { done: true, best };
        writeJSON('pb_progress', gameState.progress);
    }
    const next = m && typeof m.id === 'number' ? MISSIONS.find(x => x.id === m.id + 1) : null;
    const nextLocked = next && next.pack && !PB.packOwned();

    HUD.banner('MISSION COMPLETE', '', 2000);
    setTimeout(() => {
        PB.dialog({
            title: 'MISSION COMPLETE',
            html: `<p><strong>${PB.esc(m ? m.name : 'Custom map')}</strong></p>
                <div class="pb-stats">
                    <div><span>Time</span><strong>${HUD.fmtTime(time)}</strong>${best !== null && best < time ? `<em>best ${HUD.fmtTime(best)}</em>` : best !== null ? '<em>new best</em>' : ''}</div>
                    <div><span>Hostiles</span><strong>${stats.kills}</strong></div>
                    <div><span>Hostages</span><strong>${gameState.civilians.filter(c => c.rescued).length}/${gameState.civilians.length}</strong></div>
                    <div><span>Accuracy</span><strong>${accuracy()}%</strong><em>${stats.hits}/${stats.shots} shots</em></div>
                    <div><span>Credits</span><strong>+${earned}</strong><em>total ${gameState.currency}</em></div>
                </div>`,
            buttons: [
                ...(next && !nextLocked ? [{ label: 'NEXT MISSION', primary: true, action: () => { setTimeout(() => beginMission(next), 0); } }] : []),
                ...(next && nextLocked ? [{ label: 'MISSION PACK', primary: true, action: () => { setTimeout(() => PB.openPack(backToMenu), 0); } }] : []),
                { label: 'PLAY AGAIN', primary: !next, action: () => { setTimeout(restartCurrent, 0); } },
                { label: 'BACK TO MENU', action: backToMenu },
            ],
        });
    }, VICTORY_DELAY_MS);
}

function gameOver(reason = 'You have been eliminated.') {
    if (!gameState.playing && !gameState.endlessMode) return;
    if (gameState.endlessMode) {
        setTimeout(endEndlessMode, 200);
        gameState.playing = false;
        return;
    }
    gameState.playing = false;
    AudioSystem.playGameOver();
    for (const key in keys) keys[key] = false;
    HUD.banner('MISSION FAILED', reason, 2500);
    setTimeout(() => {
        PB.dialog({
            title: 'MISSION FAILED',
            html: `<p>${PB.esc(reason)}</p><p class="pb-dim">Time ${HUD.fmtTime(missionTimeMs())} · Hostiles down ${gameState.player.stats.kills}/${gameState.enemyTotal}</p>`,
            buttons: [
                { label: 'RETRY', primary: true, action: () => { setTimeout(restartCurrent, 0); } },
                { label: 'BACK TO MENU', action: backToMenu },
            ],
        });
    }, 700);
}
