# Pixel Breach

> **Tactical Top-Down SWAT Shooter**
>
> Fast-paced, tactical action with a campaign, endless mode and a level editor. Share your maps as files.

---

## 🚀 Quick Start

### Singleplayer Campaign
1. Open `index.html` in your browseror go to https://lelewithheart.github.io/Pixel-Breach.
2. Select a mission and customize your loadout.
3. Complete objectives: neutralize enemies, rescue hostages, reach extraction.

### Endless Mode
1. Select "Endless" from the main menu.
2. Survive as long as possible against endless waves of enemies.
3. Random gameplay modifiers and score tracking.


### Your Levels
Levels are saved in your browser. To share one, export it as a file in the editor and load it with "LOAD MAP FILE".

### Multiplayer (Cops vs Criminals)
**Temporarily disabled while bugs are fixed.**
<!--
1. Run `node multiplayer/server.js` to start the multiplayer server.
2. Connect via the "Multiplayer" button in the game.
3. 5v5 tactical rounds: Cops vs Criminals.
-->

---

## 🎮 Game Modes

- **Campaign:**
  - Hand-crafted official missions with unique objectives and layouts.
- **Endless:**
  - Survive infinite enemy waves with random modifiers. Compete for high scores.
- **My Levels:**
  - Play levels from the editor or from a map file.
- **Level Editor:**
  - Full-featured in-browser editor. Design, test, and export your own missions.
- **Multiplayer:**
  - (Coming soon) 5v5 Cops vs Criminals. Team-based tactical action.

---

## 🕹️ Controls

**Movement**
- `WASD` — Move
- `Shift` — Sprint
- `Ctrl` — Crouch

**Combat**
- `Mouse` — Aim
- `Left Click` — Fire
- `R` — Reload
- `1/2/3` — Switch weapons

**Tactical**
- `E` — Interact (doors, hostages)
- `Q` — Lean left
- `F` — Lean right
- `Space` — Use equipment

**Editor**
- `Mouse` — Place/erase tiles
- `Ctrl+Z` — Undo
- `1-9` — Quick tool select
- `Delete` — Clear all

---

## 🏆 Features

- **Tactical Combat:** Cover, destructible environments, advanced AI, and realistic weapon mechanics.
- **Loadout System:** Choose from a variety of weapons and tactical equipment.
- **Endless Mode:** Random modifiers, score tracking, and increasing difficulty.
- **Level Editor:** Drag-and-drop tools, room painter, validation, and map statistics.
- **Map Files:** Export your levels and share them as files.
- **Multiplayer:** (Temporarily disabled) 5v5 Cops vs Criminals, team objectives, and scoring.
- **Web-based:** No installation required. Pure JavaScript + HTML5 Canvas.

---

## 🗺️ Level Editor

1. Access the editor via the "LEVEL EDITOR" button.
2. Use tools to place walls, floors, enemies, hostages, doors, and more.
3. Fill or outline rooms, set map info, and validate your design.
4. Export maps as JSON to share them.

**Editor Tools:**
- Wall, Floor, Cover, Door, Locked Door, Spawn, Exit, Enemy, Heavy Enemy, Hostage, Patrol Point, Erase, Room Painter, Select

**Tips:**
- Every map needs at least one spawn and exit point.
- Use validation to check for common mistakes.
- Test balance with different enemy types and objectives.

---

## 🧩 File Structure

```
Pixel-Breach/
├── index.html           # Main game
├── styles.css           # Styling
├── constants.js         # Game config
├── weapons.js           # Weapon definitions
├── classes.js           # Entity classes
├── game-logic.js        # Core game loop
├── ui.js                # UI handling
├── audio.js             # Sound system
├── maps-official.js     # Official missions
├── maps-community.js    # Community map loader
├── editor/
│   ├── editor.html      # Level editor UI
│   ├── editor.js        # Editor logic
│   └── editor.css       # Editor styling
├── multiplayer/         # Multiplayer (disabled)
│   ├── server.js        # MP server
│   ├── client.js        # MP client
│   ├── scoring.js       # MP scoring
│   ├── loadout.js       # MP loadouts
│   ├── constants.js     # MP constants
│   ├── game-mode.js     # MP game logic
│   └── ui.js            # MP UI
├── maps/
│   ├── mission-01-training.json
│   ├── mission-02-warehouse.json
│   ├── mission-03-bank.json
│   └── community/
│       └── unverified/
└── README.md
```

---

## 📝 Documentation

### Game Logic
- All core gameplay is in `game-logic.js` and `ui.js`.
- Weapons, classes, and constants are modular for easy extension.

### Adding Maps
- Add new JSON files to `maps/` for official or custom missions.
- Use the editor to generate valid map files.

### Multiplayer
- Temporarily disabled. When enabled, run `node multiplayer/server.js` and connect via the game UI.

### Contributing
- Fork the repo, create a branch, and submit pull requests.
- See code comments for extension points and documentation.

---

## 💬 Support & Community

- [GitHub Issues](https://github.com/your-repo/issues) for bug reports and feature requests.
- Join the community to share maps and feedback!

---

## 📄 License

All rights reserved. See LICENSE.

---

## ⚡ Deployment

The game is a static site. Pushing to `main` updates GitHub Pages and, once configured, itch.io.
