# Pixel Breach - Tactical SWAT Shooter

A tactical top-down SWAT shooter game for the browser. Features tactical gameplay, weapon loadouts, enemy AI, hostage rescue, and a level editor.

## Quick Start

### Singleplayer
1. Open `index.html` in your browser
2. Select mission and loadout
3. Complete objectives: eliminate enemies, rescue civilians, reach extraction

### Multiplayer (Cops vs Criminals)
```bash
# Start multiplayer server
node multiplayer/server.js

# Server runs on ws://localhost:3001
```

### Community Server
```bash
node server.js
# Open http://localhost:3000
# Admin panel: http://localhost:3000/admin.html
```

## Features

- **Tactical Combat**: Cover system, weapon mechanics, AI
- **Multiplayer**: 5v5 Cops vs Criminals mode (10 rounds)
- **Loadout System**: Multiple weapons and equipment
- **Level Editor**: Create and share custom missions
- **Community Maps**: User-created content with review system

## Controls

**Movement:**
- `WASD` - Move
- `Shift` - Sprint
- `Ctrl` - Crouch

**Combat:**
- `Mouse` - Aim
- `Left Click` - Fire
- `R` - Reload
- `1/2` - Switch weapons

**Other:**
- `E` - Interact (rescue hostages, open doors)
- `Space` - Use equipment

## Multiplayer Mode

### Cops vs Criminals
- 5v5 team-based gameplay
- 10 rounds total (teams switch at round 5)
- Cops: Rescue civilians, arrest criminals
- Criminals: Take hostages, escape

### Scoring
- Kill enemy: +10/+15 points
- Arrest criminal: +25 points
- Rescue civilian: +20 points
- Escape: +30 points
- Friendly fire: -5 points

## Level Editor

1. Click "LEVEL EDITOR" from main menu
2. Select tools (Wall, Floor, Enemy, Hostage, etc.)
3. Click grid to place elements
4. Export or submit for community review

## File Structure

```
├── index.html          # Main game
├── styles.css          # Styling
├── constants.js        # Game config
├── weapons.js          # Weapon definitions
├── classes.js          # Entity classes
├── game-logic.js       # Core game loop
├── ui.js               # UI handling
├── audio.js            # Sound system
├── server.js           # Community map server
├── multiplayer/
│   ├── server.js       # Multiplayer server
│   ├── client.js       # Network client
│   ├── scoring.js      # Score system
│   ├── loadouts.js     # MP loadouts
│   ├── constants.js    # MP constants
│   └── ui.js           # MP UI
├── editor/
│   ├── editor.html
│   ├── editor.js
│   └── editor.css
└── maps/
    ├── community/      # Approved maps
    └── unverified/     # Pending review
```

## Tech

- Pure JavaScript + HTML5 Canvas
- No dependencies
- 800x600 canvas, 40x30 grid
- 60 FPS game loop
- WebSocket multiplayer

## License

Open source.