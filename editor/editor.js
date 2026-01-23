const TILE_SIZE = 20;
const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;

const editorState = {
    currentTool: "wall",
    grid: [],
    enemies: [],
    civilians: [],
    doors: [],
    patrolPoints: [], // Array of {x, y, enemyIndex}
    undoStack: [],
    maxUndo: 50,
    isDrawing: false,
    roomCorner1: null, //for room painter
    roomMode: null, //"fill" or "outline"
    selectedEnemy: null // Index of selected enemy for pathfinding
};

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const minimapCtx = minimap.getContext("2d");

function initGrid() {
    editorState.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        editorState.grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
                editorState.grid[y][x] = 1;
            } else {
                editorState.grid[y][x] = 0;
            }
        }
    }

    editorState.enemies = [];
    editorState.civilians = [];
    editorState.doors = [];
    editorState.patrolPoints = [];
    editorState.selectedEnemy = null;
}

function saveState() {
    const state = {
        grid: JSON.parse(JSON.stringify(editorState.grid)),
        enemies: JSON.parse(JSON.stringify(editorState.enemies)),
        civilians: JSON.parse(JSON.stringify(editorState.civilians)),
        doors: JSON.parse(JSON.stringify(editorState.doors)),
        patrolPoints: JSON.parse(JSON.stringify(editorState.patrolPoints)),
        selectedEnemy: editorState.selectedEnemy
    };
    editorState.undoStack.push(state);
    if (editorState.undoStack.length > editorState.maxUndo) {
        editorState.undoStack.shift();
    }
}

function undo() {
    if (editorState.undoStack.length > 0) {
        const state = editorState.undoStack.pop();
        editorState.grid = state.grid;
        editorState.enemies = state.enemies;
        editorState.civilians = state.civilians;
        editorState.doors = state.doors;
        editorState.patrolPoints = state.patrolPoints;
        editorState.selectedEnemy = state.selectedEnemy;
        render();
        updateStats();
    }
}

function placeElement(gridX, gridY) {
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return;

    const tool = editorState.currentTool;

    if (tool === "roomtool") {
        handleRoomTool(gridX, gridY);
        return;
    }

    switch (tool) {
        case "wall":
            editorState.grid[gridY][gridX] = 1;
            break;
        case "floor":
            editorState.grid[gridY][gridX] = 0;
            removeEntitiesAt(gridX, gridY);
            break;
        case "cover":
            editorState.grid[gridY][gridX] = 3;
            break;
        case "spawn":
            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    if (editorState.grid[y][x] === 2) {
                        editorState.grid[y][x] = 0;
                    }
                }
            }
            editorState.grid[gridY][gridX] = 2;
            break;
        case "exit":
            editorState.grid[gridY][gridX] = 4;
            break;
        case 'door':
            // Check if door already exists
            if (!editorState.doors.find(d => d.x === gridX && d.y === gridY)) {
                editorState.doors.push({ x: gridX, y: gridY, locked: false });
                editorState.grid[gridY][gridX] = 0; // Floor under door
            }
            break;
        case 'lockeddoor':
            if (!editorState.doors.find(d => d.x === gridX && d.y === gridY)) {
                editorState.doors.push({ x: gridX, y: gridY, locked: true });
                editorState.grid[gridY][gridX] = 0;
            }
            break;
        case 'enemy':
            if (!editorState.enemies.find(e => e.x === gridX && e.y === gridY)) {
                editorState.enemies.push({ x: gridX, y: gridY, type: 'normal', patrolPoints: [] });
            }
            break;
        case 'heavyenemy':
            if (!editorState.enemies.find(e => e.x === gridX && e.y === gridY)) {
                editorState.enemies.push({ x: gridX, y: gridY, type: 'heavy', patrolPoints: [] });
            }
            break;
        case 'hostage':
            if (!editorState.civilians.find(c => c.x === gridX && c.y === gridY)) {
                editorState.civilians.push({ x: gridX, y: gridY });
            }
            break;
        case 'patrolpoint':
            if (editorState.selectedEnemy !== null && editorState.selectedEnemy < editorState.enemies.length) {
                editorState.enemies[editorState.selectedEnemy].patrolPoints.push({ x: gridX, y: gridY });
            } else {
                // Fallback to old behavior if no enemy selected
                let nearestEnemy = null;
                let minDistance = Infinity;
                editorState.enemies.forEach((enemy, index) => {
                    const dist = Math.hypot(enemy.x - gridX, enemy.y - gridY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestEnemy = { enemy, index };
                    }
                });
                if (nearestEnemy && minDistance < 10) { // Within 10 tiles
                    nearestEnemy.enemy.patrolPoints.push({ x: gridX, y: gridY });
                }
            }
            break;
        case 'select':
            // Select enemy at this position
            const enemyAtPos = editorState.enemies.findIndex(e => e.x === gridX && e.y === gridY);
            if (enemyAtPos !== -1) {
                editorState.selectedEnemy = enemyAtPos;
            } else {
                editorState.selectedEnemy = null;
            }
            updateToolDisplay();
            break;
        case 'erase':
            eraseAt(gridX, gridY);
            break;
    }

    render();
    updateStats();
}

function handleRoomTool(gridX, gridY) {
    if (!editorState.roomCorner1) {
        editorState.roomCorner1 = { x: gridX, y: gridY };
        render();
    } else {
        const x1 = Math.min(editorState.roomCorner1.x, gridX);
        const y1 = Math.min(editorState.roomCorner1.y, gridY);
        const x2 = Math.max(editorState.roomCorner1.x, gridX);
        const y2 = Math.max(editorState.roomCorner1.y, gridY);

        saveState();

        if (editorState.roomMode === "fill") {
            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    editorState.grid[y][x] = 1;
                }
            }
        } else {
            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    if (x === x1 || x === x2 || y === y1 || y === y2) {
                        editorState.grid[y][x] = 1;
                    } else {
                        editorState.grid[y][x] = 0;
                    }
                }
            }
        }

        editorState.roomCorner1 = null;
        render();
        updateStats();
    }
}

function eraseAt(gridX, gridY) {
    editorState.grid[gridY][gridX] = 0;
    removeEntitiesAt(gridX, gridY);
}

function removeEntitiesAt(gridX, gridY) {
    // Store the position of the selected enemy before removal
    let selectedEnemyPos = null;
    if (editorState.selectedEnemy !== null && editorState.selectedEnemy < editorState.enemies.length) {
        const selectedEnemy = editorState.enemies[editorState.selectedEnemy];
        selectedEnemyPos = { x: selectedEnemy.x, y: selectedEnemy.y };
    }
    
    editorState.enemies = editorState.enemies.filter(e => e.x !== gridX || e.y !== gridY);
    editorState.civilians = editorState.civilians.filter(c => c.x !== gridX || c.y !== gridY);
    editorState.doors = editorState.doors.filter(d => d.x !== gridX || d.y !== gridY);
    
    // Update selectedEnemy index
    if (selectedEnemyPos !== null) {
        const newIndex = editorState.enemies.findIndex(e => e.x === selectedEnemyPos.x && e.y === selectedEnemyPos.y);
        editorState.selectedEnemy = newIndex;
    }
    
    // Remove patrol points at this location
    editorState.enemies.forEach(enemy => {
        enemy.patrolPoints = enemy.patrolPoints.filter(p => p.x !== gridX || p.y !== gridY);
    });
}

function render() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.height);

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tile = editorState.grid[y][x];
            let color;
            switch (tile) {
                case 1: color = "#444"; break; //Wall
                case 2: color = "#0f0"; break; //Spawn
                case 3: color = "#666"; break; //Cover
                case 4: color = "#00f"; break; //Exit
                default: color = "#222"; break; //Floor
            }
            ctx.fillStyle = color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            ctx.strokeStyle = "#333";
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)

            if (tile === 2) {
                ctx.fillStyle = "#fff";
                ctx.font = "10px monospace";
                ctx.fillText("SP", x * TILE_SIZE + 2, y * TILE_SIZE + 13);
            }
            if (tile === 4) {
                ctx.fillStyle = "#0f0";
                ctx.font = "10px monospace";
                ctx.fillText("EX", x * TILE_SIZE + 2, y * TILE_SIZE + 13);
            }
        }
    }

    editorState.doors.forEach(d => {
        ctx.fillStyle = d.locked ? "#820" : "#640";
        ctx.fillRect(d.x * TILE_SIZE, d.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        if (d.locked) {
            ctx.fillStyle = "#ff0";
            ctx.font = "12px monospace";
            ctx.fillText("🔒", d.x * TILE_SIZE + 2, d.y * TILE_SIZE + 14);
        }
    });

    editorState.enemies.forEach((e, index) => {
        ctx.fillStyle = e.type === "heavy" ? "#a00" : "#f00";
        ctx.fillRect(e.x * TILE_SIZE + 2, e.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        
        // Highlight selected enemy
        if (editorState.selectedEnemy === index) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(e.x * TILE_SIZE + 1, e.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            ctx.lineWidth = 1;
        }
        
        ctx.fillStyle = "#fff"
        ctx.font = "10px monospace";
        ctx.fillText(e.type === "heavy" ? "H" : "E", e.x * TILE_SIZE + 6, e.y * TILE_SIZE + 13);
        
        // Draw patrol points for this enemy
        e.patrolPoints.forEach((point, index) => {
            ctx.fillStyle = "#0ff";
            ctx.beginPath();
            ctx.arc(point.x * TILE_SIZE + TILE_SIZE / 2, point.y * TILE_SIZE + TILE_SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = "#000";
            ctx.font = "10px monospace";
            ctx.fillText((index + 1).toString(), point.x * TILE_SIZE + TILE_SIZE / 2 - 3, point.y * TILE_SIZE + TILE_SIZE / 2 + 3);
        });
    });

    editorState.civilians.forEach(c => {
        ctx.fillStyle = '#ff0';
        ctx.fillRect(c.x * TILE_SIZE + 2, c.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.fillText('C', c.x * TILE_SIZE + 6, c.y * TILE_SIZE + 13);
    });

    if (editorState.roomCorner1) {
        ctx.strokeStyle = "#0ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            editorState.roomCorner1.x * TILE_SIZE,
            editorState.roomCorner1.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    }

    renderMinimap();
}

function renderMinimap() {
    const scale = 180 / (GRID_WIDTH * TILE_SIZE);
    const scaleY = 135 / (GRID_HEIGHT * TILE_SIZE);
    const actualScale = Math.min(scale, scaleY);

    minimapCtx.fillStyle = "#000";
    minimapCtx.fillRect(0, 0, 180, 135);

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tile = editorState.grid[y][x];
            if (tile === 1) {
                minimapCtx.fillStyle = "#666";
            } else if (tile === 2) {
                minimapCtx.fillStyle = "#0f0";
            } else if (tile === 4) {
                minimapCtx.fillStyle = "#00f";
            } else {
                continue;
            }
            minimapCtx.fillRect(
                y * TILE_SIZE * actualScale,
                y * TILE_SIZE * actualScale,
                TILE_SIZE * actualScale,
                TILE_SIZE * actualScale
            );
        }
    }

    editorState.enemies.forEach(e => {
        minimapCtx.fillStyle = e.type === "heavy" ? "#a00" : "#f00";
        minimapCtx.fillRect(e.x * TILE_SIZE * actualScale - 1, e.y * TILE_SIZE * actualScale - 1, 3, 3);
        
        // Draw patrol points
        e.patrolPoints.forEach(point => {
            minimapCtx.fillStyle = "#0ff";
            minimapCtx.fillRect(point.x * TILE_SIZE * actualScale - 1, point.y * TILE_SIZE * actualScale - 1, 3, 3);
        });
    });

    editorState.civilians.forEach(c => {
        minimapCtx.fillStyle = '#ff0';
        minimapCtx.fillRect(c.x * TILE_SIZE * actualScale - 1, c.y * TILE_SIZE * actualScale - 1, 3, 3);
    });
}

function updateToolDisplay() {
    const btn = document.querySelector(`[data-tool="${editorState.currentTool}"]`);
    if (btn) {
        let toolText = btn.textContent.trim();
        if (editorState.selectedEnemy !== null && editorState.currentTool === "patrolpoint") {
            toolText += ` (Enemy ${editorState.selectedEnemy + 1})`;
        }
        document.getElementById('current-tool').textContent = `Tool: ${toolText}`;
    }
}

function updateStats() {
    const heavyEnemies = editorState.enemies.filter(e => e.type === "heavy").length;
    const lockedDoors = editorState.doors.filter(d => d.locked).length;
    const unlockedDoors = editorState.doors.filter(d => !d.locked).length;

    let exitCount = 0;
    let spawnCount = 0;

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (editorState.grid[y][x] === 4) exitCount++;
            if (editorState.grid[y][x] === 2) spawnCount++;
        }
    }

    document.getElementById("stat-enemies").textContent = normalEnemies;
    document.getElementById("stat-heavy").textContent = heavyEnemies;
    document.getElementById("stat-hostages").textContent = editorState.civilians.length;
    document.getElementById("stat-doors").textContent = unlockedDoors;
    document.getElementById("stat-locked").textContent = lockedDoors;
    document.getElementById("stat-exits").textContent = exitCount;
    document.getElementById("stat-spawns").textContent = spawnCount;
}

function validateMap() {
    const issues = [];
    const warnings = [];

    let hasSpawn = false;
    let hasExit = false;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (editorState.grid[y][x] === 2) hasSpawn = true;
            if (editorState.grid[y][x] === 4) hasExit = true;
        }
    }

    if (!hasSpawn) issues.push("No spawn point! Add a spawn point for the Player");
    if (!hasExit) issues.push("No exit! Add an extraction point.");

    if (editorState.enemies.length === 0) {
        warnings.push("No enemies placed. Consider adding some enemies.");
    }
    if (editorState.civilians.length === 0) {
        warnings.push("No hostages placed. Consider adding hostages.");
    }
    if (editorState.enemies.length > 25) {
        warnings.push("Many enemies placed. This might make the map very difficult.");
    }

    const resultsDiv = document.getElementById("validation-results");
    if (issues.length === 0 && warnings.length === 0) {
        resultsDiv.innerHTML = '<div class="info-box">Map is valid and ready to export!</div>';
    } else {
        let html = '';
        if (issues.length > 0) {
            html += '<div class="warning-box">' + issues.join('<br>') + '</div>';
        }
        if (warnings.length > 0) {
            html += '<div class="info-box">' + warnings.join('<br>') + '</div>';
        }
        resultsDiv.innerHTML = html;
    }
}

function createMapData() {
    let spawnX = 5, spawnY = 5
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (editorState.grid[y][x] === 2) {
                spawnX = x;
                spawnY = y;
                break;
            }
        }
    }

    return {
        version: "1.0",
        metadata: {
            name: document.getElementById("map-name").value || "Untitled Map",
            description: document.getElementById("map-description").value || "",
            author: document.getElementById("map-author").value || "Unknown",
            difficulty: document.getElementById("map-difficulty").value,
            createdAt: new Date().toISOString()
        },
        settings: {
            gridWidth: GRID_WIDTH,
            gridHeight: GRID_HEIGHT,
            timeLimit: null
        },
        objectives: {
            eliminateEnemies: true,
            rescueHostages: true,
            reachExtraction: true,
            custom: []
        },
        grid: editorState.grid,
        spawn: { x: spawnX, y: spawnY },
        entities: {
            enemies: editorState.enemies,
            civilians: editorState.civilians,
            doors: editorState.doors
        },
        rooms: []
    };
}

function exportMap() {
    const mapData = createMapData();
    const json = JSON.stringify(mapData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const filename = (mapData.metadata.name || "pixel-breach-map").toLowerCase().replace(/\s+/g, '-') + '.json';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importMap(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const mapData = JSON.parse(e.target.result);
            loadMapData(mapData);
        } catch (err) {
            alert("Error loading map file: " + err.message);
        }
    };
    reader.readAsText(file);
}

function loadMapData(mapData) {
    if (!mapData.grid) {
        alert("Invalid map file: no grid data found.");
        return;
    }

    saveState();

    editorState.grid = mapData.grid;
    editorState.enemies = (mapData.entities?.enemies || []).map(enemy => ({
        ...enemy,
        patrolPoints: enemy.patrolPoints || []
    }));
    editorState.civilians = mapData.entities?.civilians || [];
    editorState.doors = mapData.entities?.doors || [];
    editorState.selectedEnemy = null;

    if (mapData.metadata) {
        document.getElementById("map-name").value = mapData.metadata.name || "";
        document.getElementById("map-description").value = mapData.metadata.description || "";
        document.getElementById("map-author").value = mapData.metadata.author || "";
        document.getElementById("map-difficulty").value = mapData.metadata.difficulty || "";
    }

    render();
    updateStats();
}

function saveToLocal() {
    const mapData = createMapData();
    localStorage.setItem("editorLevel", JSON.stringify(mapData));
    alert("Map saved to browser storage!");
}

function loadFromLocal() {
    const json = localStorage.getItem("editorLevel");
    if (!json) {
        alert("No saved map found in browser storage");
        return;
    }
    try {
        const mapData = JSON.parse(json);
        loadMapData(mapData);
        alert("Map loaded from browser storage");
    } catch (err) {
        alert("Error loading saved map: " + err.message);
    }
}

function clearAll() {
    if (confirm("Clear the entire map? You can use Ctrl+Z to undo.")) {
        saveState();
        initGrid();
        render();
        updateStats();
    }
}

function addBorder() {
    saveState();
    for (let x = 0; x < GRID_WIDTH; x++) {
        editorState.grid[0][x] = 1;
        editorState.grid[GRID_HEIGHT - 1][x] = 1;
    }
    for (let y = 0; y < GRID_HEIGHT; y++) {
        editorState.grid[y][0] = 1;
        editorState.grid[y][GRID_WIDTH - 1] = 1;
    }
    render();
    updateStats();
}

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);

    if (e.button === 2) { //erase on right click
        saveState();
        eraseAt(gridX, gridY);
        render();
        updateStats();
    } else if (e.button === 0) { //place on left
        saveState();
        placeElement(gridX, gridY);
        editorState.isDrawing = true;
    }
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);

    document.getElementById("cursor-pos").textContent = `Position: (${gridX}, ${gridY})`;

    if (editorState.isDrawing && editorState.currentTool !== "roomtool") {
        placeElement(gridX, gridY);
    }
});

canvas.addEventListener("mouseup", () => {
    editorState.isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
    editorState.isDrawing = false;
});

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        editorState.currentTool = btn.dataset.tool;
        updateToolDisplay();
        editorState.roomCorner1 = null;
    });
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

document.getElementById("clear-all").addEventListener("click", clearAll);
document.getElementById("add-border").addEventListener("click", addBorder);
document.getElementById("undo").addEventListener("click", undo);
document.getElementById("export-map").addEventListener("click", exportMap);
document.getElementById("import-map").addEventListener("click", () => {
    document.getElementById("file-input").click();
});
document.getElementById("file-input").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        importMap(e.target.files[0]);
        e.target.value = "";
    }
});
document.getElementById("save-local").addEventListener("click", saveToLocal);
document.getElementById("load-local").addEventListener("click", loadFromLocal);
document.getElementById("validate-map").addEventListener("click", validateMap);
document.getElementById("back-to-game").addEventListener("click", () => {
    window.location.href = "../index.html";
});

document.getElementById("fill-room").addEventListener("click", () => {
    editorState.roomMode = "fill";
    editorState.currentTool = "roomtool";
    editorState.roomCorner1 = null;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tool="roomtool"]').classList.add('active');
    updateToolDisplay();
});

document.getElementById("outline-room").addEventListener("click", () => {
    editorState.roomMode = "outline";
    editorState.roomCorner1 = null;
    editorState.currentTool = "roomtool";
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tool="roomtool"]').classList.add('active');
    updateToolDisplay();
});

// Submit map for review
document.getElementById("submit-review").addEventListener("click", async () => {
    const statusDiv = document.getElementById("submit-status");
    
    // Validate map first
    let hasSpawn = false;
    let hasExit = false;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (editorState.grid[y][x] === 2) hasSpawn = true;
            if (editorState.grid[y][x] === 4) hasExit = true;
        }
    }
    
    if (!hasSpawn || !hasExit) {
        statusDiv.innerHTML = '<span style="color: #f00;">❌ Map needs a spawn point AND an exit point!</span>';
        return;
    }
    
    const mapName = document.getElementById("map-name").value.trim();
    if (!mapName || mapName === "Untitled Mission") {
        statusDiv.innerHTML = '<span style="color: #f00;">❌ Please enter a map name!</span>';
        return;
    }
    
    statusDiv.innerHTML = '<span style="color: #ff0;">⏳ Submitting...</span>';
    
    const mapData = createMapData();
    
    try {
        const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapData })
        });
        
        const data = await res.json();
        
        if (data.success) {
            statusDiv.innerHTML = '<span style="color: #0f0;">✅ Map submitted for review! An admin will review it soon.</span>';
        } else {
            statusDiv.innerHTML = `<span style="color: #f00;">❌ ${data.error}</span>`;
        }
    } catch (e) {
        statusDiv.innerHTML = '<span style="color: #f00;">❌ Server not available. Run "node server.js" to enable submissions.</span>';
    }
});

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
    }
    if (e.key === "Delete") {
        clearAll();
    }
    if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveState();
    }

    const toolMap = {
        "1": "wall",
        "2": "floor",
        "3": "cover",
        "4": "door",
        "5": "lockeddoor",
        "6": "spawn",
        "7": "exit",
        "8": "enemy",
        "9": "select",
        "0": "patrolpoint",
        "h": "hostage"
    };
    if (toolMap[e.key]) {
        editorState.currentTool = toolMap[e.key];
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === toolMap[e.key]);
        });
        updateToolDisplay();
    }
});

initGrid();
render();
updateStats();