const TILE_SIZE = 20;
const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;

const editorState = {
    currentTool: "wall",
    grid: [],
    enemies: [],
    civilians: [],
    doors: [],
    undoStack: [],
    maxUndo: 50,
    isDrawing: false,
    roomCorner1: null, //for room painter
    roomMode: null //"fill" or "outline"
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
}

function saveState() {
    const state = {
        grid: JSON.parse(JSON.stringify(editorState.grid)),
        enemies: JSON.parse(JSON.stringify(editorState.enemies)),
        civilians: JSON.parse(JSON.stringify(editorState.civilians)),
        doors: JSON.parse(JSON.stringify(editorState.doors))
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
                editorState.enemies.push({ x: gridX, y: gridY, type: 'normal' });
            }
            break;
        case 'heavyenemy':
            if (!editorState.enemies.find(e => e.x === gridX && e.y === gridY)) {
                editorState.enemies.push({ x: gridX, y: gridY, type: 'heavy' });
            }
            break;
        case 'hostage':
            if (!editorState.civilians.find(c => c.x === gridX && c.y === gridY)) {
                editorState.civilians.push({ x: gridX, y: gridY });
            }
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
    editorState.enemies = editorState.enemies.filter(e => e.x !== gridX || e.y !== gridY);
    editorState.civilians = editorState.civilians.filter(c => c.x !== gridX || c.y !== gridY);
    editorState.doors = editorState.doors.filter(d => d.x !== gridX || d.y !== gridY);
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
        if(d.locked){
            ctx.fillStyle = "#ff0";
            ctx.font = "12px monospace";
            ctx.fillText("🔒", d.x * TILE_SIZE + 2, d.y * TILE_SIZE + 14);
        }
    });

    editorState.enemies.forEach(e => {
        ctx.fillStyle = e.type === "heavy" ? "#a00" : "#f00";
        ctx.fillRect(e.x * TILE_SIZE + 2, e.y * TILE_SIZE +2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = "#fff"
    })
}

