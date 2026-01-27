const MISSIONS = [
    {
        id: 1,
        name: 'Training Facility',
        description: 'Learn the basics of movement and combat in this beginner-friendly facility.',
        difficulty: 'easy',
        objectives: ['Neutralize all targets', 'Reach extraction point'],
        tutorialSteps: ['Use WASD to move', 'Hold SHIFT to sprint', 'Press CTRL to crouch', 'Left click to shoot'],
        mapFile: 'maps/mission-01-training.json',
        // Inline map data for immediate use
        mapData: {
            version: "1.0",
            metadata: {
                name: "Training Facility",
                description: "Learn the basics of movement and combat",
                author: "Official",
                difficulty: "easy"
            },
            grid: null, // Will be generated
            spawn: { x: 2, y: 2 },
            entities: {
                enemies: [
                    { x: 8, y: 5, type: 'normal' },
                    { x: 20, y: 12, type: 'normal' },
                    { x: 34, y: 5, type: 'normal' }
                ],
                civilians: [],
                doors: []
            }
        }
    },
    {
        id: 2,
        name: 'Warehouse Assault',
        description: 'A terrorist cell has taken over a warehouse. Breach and neutralize all hostiles.',
        difficulty: 'medium',
        objectives: ['Neutralize all hostiles', 'Rescue 3 hostages', 'Reach extraction'],
        tutorialSteps: ['Breach doors with E or shoot them', 'Use lockpick on locked doors', 'Rescue hostages with E'],
        mapFile: 'maps/mission-02-warehouse.json',
        mapData: {
            version: "1.0",
            metadata: {
                name: "Warehouse Assault",
                description: "Clear the warehouse of hostiles",
                author: "Official",
                difficulty: "medium"
            },
            grid: null,
            spawn: { x: 2, y: 5 },
            entities: {
                enemies: [
                    { x: 8, y: 5, type: 'normal' },
                    { x: 22, y: 5, type: 'normal' },
                    { x: 8, y: 15, type: 'normal' },
                    { x: 22, y: 15, type: 'heavy' },
                    { x: 35, y: 15, type: 'normal' },
                    { x: 22, y: 25, type: 'normal' }
                ],
                civilians: [
                    { x: 6, y: 15 },
                    { x: 30, y: 15 },
                    { x: 18, y: 25 }
                ],
                doors: [
                    { x: 6, y: 10, locked: false },
                    { x: 19, y: 10, locked: true },
                    { x: 32, y: 10, locked: false },
                    { x: 6, y: 20, locked: true },
                    { x: 19, y: 20, locked: false },
                    { x: 32, y: 20, locked: true }
                ]
            }
        }
    },
    {
        id: 3,
        name: 'Bank Heist Response',
        description: 'Armed robbers have taken over the downtown bank. Multiple hostages are held in different areas.',
        difficulty: 'hard',
        objectives: ['Neutralize all hostiles', 'Rescue all 5 hostages', 'Secure the vault area', 'Reach extraction'],
        tutorialSteps: ['Use flashbangs to stun groups', 'Heavy enemies require more damage', 'Check all rooms'],
        mapFile: 'maps/mission-03-bank.json',
        mapData: {
            version: "1.0",
            metadata: {
                name: "Bank Heist Response",
                description: "Rescue hostages from the bank",
                author: "Official",
                difficulty: "hard"
            },
            grid: null,
            spawn: { x: 2, y: 2 },
            entities: {
                enemies: [
                    { x: 6, y: 4, type: 'normal' },
                    { x: 16, y: 4, type: 'normal' },
                    { x: 26, y: 4, type: 'normal' },
                    { x: 36, y: 4, type: 'normal' },
                    { x: 6, y: 12, type: 'normal' },
                    { x: 16, y: 12, type: 'heavy' },
                    { x: 26, y: 12, type: 'normal' },
                    { x: 16, y: 20, type: 'heavy' },
                    { x: 26, y: 20, type: 'normal' }
                ],
                civilians: [
                    { x: 8, y: 4 },
                    { x: 28, y: 4 },
                    { x: 6, y: 13 },
                    { x: 36, y: 13 },
                    { x: 20, y: 21 }
                ],
                doors: [
                    { x: 5, y: 8, locked: false },
                    { x: 15, y: 8, locked: true },
                    { x: 25, y: 8, locked: false },
                    { x: 35, y: 8, locked: true },
                    { x: 5, y: 16, locked: true },
                    { x: 15, y: 16, locked: true },
                    { x: 25, y: 16, locked: false },
                    { x: 35, y: 16, locked: true },
                    { x: 5, y: 24, locked: false },
                    { x: 15, y: 24, locked: true },
                    { x: 25, y: 24, locked: false },
                    { x: 35, y: 24, locked: false }
                ]
            }
        }
    },
    {
        id: 4,
        name: 'Office Complex',
        description: 'Terrorists have seized a corporate office building. Multiple floors with interconnected rooms.',
        difficulty: 'medium',
        objectives: ['Neutralize all hostiles', 'Rescue 4 hostages', 'Clear all rooms', 'Reach extraction'],
        tutorialSteps: ['Watch for enemies behind cover', 'Grenades can breach walls', 'Use medkit if wounded'],
        mapData: {
            version: "1.0",
            metadata: {
                name: "Office Complex",
                description: "Clear the office building",
                author: "Official",
                difficulty: "medium"
            },
            grid: null,
            spawn: { x: 2, y: 5 },
            entities: {
                enemies: [
                    { x: 8, y: 5, type: 'normal' },
                    { x: 22, y: 5, type: 'normal' },
                    { x: 35, y: 5, type: 'normal' },
                    { x: 8, y: 15, type: 'normal' },
                    { x: 22, y: 15, type: 'heavy' },
                    { x: 35, y: 15, type: 'normal' },
                    { x: 8, y: 25, type: 'normal' },
                    { x: 22, y: 25, type: 'normal' }
                ],
                civilians: [
                    { x: 10, y: 5 },
                    { x: 30, y: 5 },
                    { x: 10, y: 25 },
                    { x: 30, y: 25 }
                ],
                doors: [
                    { x: 6, y: 10, locked: false },
                    { x: 19, y: 10, locked: true },
                    { x: 32, y: 10, locked: false },
                    { x: 6, y: 20, locked: true },
                    { x: 19, y: 20, locked: false },
                    { x: 32, y: 20, locked: true }
                ]
            }
        }
    },
    {
        id: 5,
        name: 'Embassy Siege',
        description: 'A foreign embassy is under attack. VIP diplomats need immediate rescue. Time is critical.',
        difficulty: 'hard',
        objectives: ['Rescue VIP diplomat', 'Neutralize all hostiles', 'Protect all hostages', 'Extract within 5 minutes'],
        tutorialSteps: ['VIP hostage is marked differently', 'Some doors require breach charges', 'Time pressure requires efficiency'],
        mapData: {
            version: "1.0",
            metadata: {
                name: "Embassy Siege",
                description: "Rescue the VIP diplomat",
                author: "Official",
                difficulty: "hard"
            },
            grid: null,
            spawn: { x: 2, y: 2 },
            entities: {
                enemies: [
                    { x: 6, y: 4, type: 'normal' },
                    { x: 16, y: 4, type: 'heavy' },
                    { x: 26, y: 4, type: 'normal' },
                    { x: 36, y: 4, type: 'normal' },
                    { x: 6, y: 12, type: 'normal' },
                    { x: 16, y: 12, type: 'normal' },
                    { x: 26, y: 12, type: 'normal' },
                    { x: 36, y: 12, type: 'normal' },
                    { x: 6, y: 20, type: 'heavy' },
                    { x: 16, y: 20, type: 'heavy' },
                    { x: 26, y: 20, type: 'heavy' }
                ],
                civilians: [
                    { x: 8, y: 5 },
                    { x: 28, y: 5 },
                    { x: 8, y: 13 },
                    { x: 28, y: 13 },
                    { x: 18, y: 21 }, // VIP
                    { x: 22, y: 21 }
                ],
                doors: [
                    { x: 5, y: 8, locked: false },
                    { x: 15, y: 8, locked: true },
                    { x: 25, y: 8, locked: true },
                    { x: 35, y: 8, locked: false },
                    { x: 5, y: 16, locked: true },
                    { x: 15, y: 16, locked: true },
                    { x: 25, y: 16, locked: true },
                    { x: 35, y: 16, locked: true }
                ]
            }
        }
    },
    {
        id: 6,
        name: 'Underground Bunker',
        description: 'An underground bunker complex with narrow corridors. Expect heavy resistance.',
        difficulty: 'hard',
        objectives: ['Clear all bunker sections', 'Rescue any hostages found', 'Disable the communications hub', 'Reach extraction'],
        tutorialSteps: ['Narrow corridors limit movement', 'Use smoke for concealment', 'Heavy enemies guard key areas'],
        mapData: {
            version: "1.0",
            metadata: {
                name: "Underground Bunker",
                description: "Clear the bunker complex",
                author: "Official",
                difficulty: "hard"
            },
            grid: null,
            spawn: { x: 2, y: 10 },
            entities: {
                enemies: [
                    { x: 6, y: 4, type: 'normal' },
                    { x: 16, y: 4, type: 'normal' },
                    { x: 26, y: 4, type: 'heavy' },
                    { x: 6, y: 12, type: 'normal' },
                    { x: 16, y: 12, type: 'heavy' },
                    { x: 26, y: 12, type: 'heavy' },
                    { x: 36, y: 12, type: 'normal' },
                    { x: 6, y: 20, type: 'normal' },
                    { x: 16, y: 20, type: 'heavy' },
                    { x: 26, y: 20, type: 'normal' }
                ],
                civilians: [
                    { x: 8, y: 5 },
                    { x: 28, y: 5 },
                    { x: 18, y: 18 }
                ],
                doors: [
                    { x: 5, y: 8, locked: true },
                    { x: 15, y: 8, locked: true },
                    { x: 25, y: 8, locked: true },
                    { x: 35, y: 8, locked: false },
                    { x: 5, y: 16, locked: true },
                    { x: 15, y: 16, locked: true },
                    { x: 25, y: 16, locked: true },
                    { x: 35, y: 16, locked: true }
                ]
            }
        }
    }
];

// Function to generate a basic room layout grid for missions without mapFile
function generateMissionGrid(mission) {
    const grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            // Border walls
            if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
                grid[y][x] = 1;
            } else {
                grid[y][x] = 0;
            }
        }
    }

    // Add room structures based on mission difficulty
    if (mission.difficulty === 'easy') {
        // Simple open layout with some cover - player can easily navigate
        // Horizontal divider wall with large opening
        addHorizontalWall(grid, 1, 14, 15);
        addHorizontalWall(grid, 22, 14, 17);
        // Vertical partial walls for rooms
        addVerticalWall(grid, 12, 1, 8);
        addVerticalWall(grid, 26, 1, 8);
        addVerticalWall(grid, 12, 18, 11);
        addVerticalWall(grid, 26, 18, 11);
        // Door openings in vertical walls
        grid[4][12] = 0;
        grid[4][26] = 0;
        grid[22][12] = 0;
        grid[22][26] = 0;
        // Exit area in top right
        grid[3][37] = 4;
        grid[3][38] = 4;
        grid[4][37] = 4;
        grid[4][38] = 4;
    } else if (mission.difficulty === 'medium') {
        // Multiple connected rooms with clear doorways
        // Top horizontal divider
        addHorizontalWall(grid, 1, 10, 38);
        // Bottom horizontal divider
        addHorizontalWall(grid, 1, 20, 38);
        // Vertical dividers
        addVerticalWall(grid, 13, 1, 9);
        addVerticalWall(grid, 26, 1, 9);
        addVerticalWall(grid, 13, 11, 9);
        addVerticalWall(grid, 26, 11, 9);
        addVerticalWall(grid, 13, 21, 8);
        addVerticalWall(grid, 26, 21, 8);
        // Door openings - horizontal walls
        grid[10][6] = 0;
        grid[10][7] = 0;
        grid[10][19] = 0;
        grid[10][20] = 0;
        grid[10][32] = 0;
        grid[10][33] = 0;
        grid[20][6] = 0;
        grid[20][7] = 0;
        grid[20][19] = 0;
        grid[20][20] = 0;
        grid[20][32] = 0;
        grid[20][33] = 0;
        // Door openings - vertical walls
        grid[5][13] = 0;
        grid[5][26] = 0;
        grid[15][13] = 0;
        grid[15][26] = 0;
        grid[24][13] = 0;
        grid[24][26] = 0;
        // Exit area in bottom right
        grid[26][37] = 4;
        grid[26][38] = 4;
        grid[27][37] = 4;
        grid[27][38] = 4;
    } else {
        // Complex layout with many rooms - but all connected
        // Horizontal corridors
        addHorizontalWall(grid, 1, 8, 38);
        addHorizontalWall(grid, 1, 16, 38);
        addHorizontalWall(grid, 1, 24, 38);
        // Vertical room dividers
        addVerticalWall(grid, 10, 1, 7);
        addVerticalWall(grid, 20, 1, 7);
        addVerticalWall(grid, 30, 1, 7);
        addVerticalWall(grid, 10, 9, 7);
        addVerticalWall(grid, 20, 9, 7);
        addVerticalWall(grid, 30, 9, 7);
        addVerticalWall(grid, 10, 17, 7);
        addVerticalWall(grid, 20, 17, 7);
        addVerticalWall(grid, 30, 17, 7);
        // Door openings in horizontal walls
        grid[8][5] = 0;
        grid[8][15] = 0;
        grid[8][25] = 0;
        grid[8][35] = 0;
        grid[16][5] = 0;
        grid[16][15] = 0;
        grid[16][25] = 0;
        grid[16][35] = 0;
        grid[24][5] = 0;
        grid[24][15] = 0;
        grid[24][25] = 0;
        grid[24][35] = 0;
        // Door openings in vertical walls
        grid[4][10] = 0;
        grid[4][20] = 0;
        grid[4][30] = 0;
        grid[12][10] = 0;
        grid[12][20] = 0;
        grid[12][30] = 0;
        grid[20][10] = 0;
        grid[20][20] = 0;
        grid[20][30] = 0;
        // Exit area in bottom left
        grid[26][1] = 4;
        grid[26][2] = 4;
        grid[27][1] = 4;
        grid[27][2] = 4;
    }

    // Add spawn point
    grid[mission.mapData.spawn.y][mission.mapData.spawn.x] = 2;

    // Add some cover positions based on grid layout
    addCoverPositions(grid, mission.difficulty);

    return grid;
}

function addRoom(grid, startX, startY, width, height) {
    // Top and bottom walls
    for (let x = startX; x < startX + width && x < GRID_WIDTH; x++) {
        if (startY >= 0 && startY < GRID_HEIGHT) grid[startY][x] = 1;
        if (startY + height - 1 >= 0 && startY + height - 1 < GRID_HEIGHT) {
            grid[startY + height - 1][x] = 1;
        }
    }
    // Left and right walls
    for (let y = startY; y < startY + height && y < GRID_HEIGHT; y++) {
        if (startX >= 0 && startX < GRID_WIDTH) grid[y][startX] = 1;
        if (startX + width - 1 >= 0 && startX + width - 1 < GRID_WIDTH) {
            grid[y][startX + width - 1] = 1;
        }
    }
}

function addHorizontalWall(grid, startX, y, length) {
    for (let x = startX; x < startX + length && x < GRID_WIDTH; x++) {
        if (y >= 0 && y < GRID_HEIGHT) grid[y][x] = 1;
    }
}

function addVerticalWall(grid, x, startY, length) {
    for (let y = startY; y < startY + length && y < GRID_HEIGHT; y++) {
        if (x >= 0 && x < GRID_WIDTH) grid[y][x] = 1;
    }
}

function addCoverPositions(grid, difficulty) {
    // Add cover objects at strategic positions based on difficulty
    let coverPositions = [];

    if (difficulty === 'easy') {
        coverPositions = [
            [5, 5], [5, 20], [18, 5], [18, 20], [32, 5], [32, 20],
            [8, 12], [18, 12], [28, 12]
        ];
    } else if (difficulty === 'medium') {
        coverPositions = [
            [5, 5], [5, 15], [5, 25],
            [18, 5], [18, 15], [18, 25],
            [32, 5], [32, 15], [32, 25]
        ];
    } else {
        coverPositions = [
            [5, 4], [15, 4], [25, 4], [35, 4],
            [5, 12], [15, 12], [25, 12], [35, 12],
            [5, 20], [15, 20], [25, 20], [35, 20]
        ];
    }

    coverPositions.forEach(([x, y]) => {
        if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
            if (grid[y][x] === 0) {
                grid[y][x] = 3;
            }
        }
    });
}