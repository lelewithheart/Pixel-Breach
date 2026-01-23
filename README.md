# Pixel Breach - Tactical SWAT Shooter

A detailed, tactical top-down SWAT shooter game playable in your web browser. Features realistic tactical gameplay, multiple weapon loadouts, enemy AI, hostage rescue mechanics, and a built-in level editor.

## Features

### Tactical Gameplay
- **Detailed Combat System**: Line of sight detection, cover mechanics, weapon spread, and damage models
- **Stamina System**: Sprint management affects tactical positioning
- **Stance System**: Switch between standing and crouched positions for different speed/visibility tradeoffs
- **Lean Mechanics**: Lean left or right for tactical corner peeking
- **Reload Management**: Manual reloading with limited ammunition
- **Equipment Usage**: Tactical equipment including flashbangs, smoke grenades, breaching charges, and medkits

### Loadout System
**Primary Weapons:**
- MP5 Submachine Gun (High ROF, moderate damage)
- M4A1 Assault Rifle (Balanced stats)
- M870 Shotgun (High damage, close range, spread pattern)
- M24 Sniper Rifle (Extreme damage, slow ROF, high accuracy)

**Secondary Weapons:**
- M1911 Pistol (High damage, low capacity)
- Glock 17 (Moderate damage, high capacity)

**Equipment:**
- Flashbang: Stun enemies in radius
- Smoke Grenade: Create concealment
- Breaching Charge: Destroy walls
- Medkit: Restore health

### Enemy AI
- **Patrol Mode**: Enemies patrol and maintain awareness
- **Detection System**: Enemies detect player based on line of sight and distance
- **Engagement AI**: Tactical positioning and optimal engagement distances
- **Different Types**: Standard enemies and heavy armor units

### Objectives
- Neutralize all hostile enemies
- Rescue all hostages
- Reach extraction point
- Dynamic objective tracking

### Level Editor
- Place walls, floors, and cover
- Position enemy spawn points
- Place hostages/civilians
- Set player spawn and extraction points
- Save and load custom levels
- Clear and rebuild levels from scratch

### Tactical UI
- Real-time health, armor, and stamina bars
- Ammunition counter for current weapon
- Minimap with entity tracking
- Objective tracker
- Enemy and hostage counters
- Weapon switching indicators

## How to Play

### Quick Start (Standalone)
1. Open `index.html` in a web browser
2. Click "LOADOUT" to select your weapons and equipment
3. Click "CAMPAIGN" or "COMMUNITY LEVELS" to play
4. Complete objectives to win

### With Map Server (Full Features)
1. Run `node server.js` in the project folder
2. Open `http://localhost:3000` in your browser
3. Access admin panel at `http://localhost:3000/admin`

### Controls

**Movement:**
- `W/A/S/D` - Move in four directions
- `Shift` - Sprint (consumes stamina)
- `Ctrl` - Toggle crouch

**Combat:**
- `Mouse Aim` - Aim weapon
- `Left Click` - Fire weapon
- `R` - Reload
- `1` - Switch to primary weapon
- `2` - Switch to secondary weapon

**Tactical:**
- `E` - Interact (rescue hostages, open doors)
- `Q` - Lean left
- `F` - Lean right
- `Space` - Use equipment

**Editor:**
- Click "LEVEL EDITOR" to enter edit mode
- Select tools from the right panel
- Click on canvas to place objects
- Save/Load levels for later use

## Game Mechanics

### Combat System
- Weapons have realistic spread patterns and damage falloff
- Line of sight required for enemy detection
- Cover provides collision protection
- Different weapon types for different tactical situations

### Enemy Behavior
- Enemies use state machines (Patrol → Alert → Engage)
- Maintain optimal engagement distances
- Take cover and use tactical positioning
- Can be stunned with equipment

### Hostage System
- Hostages panic and flee from danger
- Must be rescued by player interaction
- Contribute to mission objectives
- Protected civilians affect mission success

### Health System
- Armor absorbs 70% of damage when available
- Health regeneration not available (tactical medkit use required)
- Stamina regenerates when not sprinting

## Level Editor

The integrated level editor allows you to create custom tactical scenarios:

1. Click "LEVEL EDITOR" from the main menu
2. Select tools (Wall, Floor, Enemy, Hostage, Cover, Door, etc.)
3. Click on the grid to place elements
4. Use the Room Painter for quick room creation
5. Fill in map details (name, author, description)
6. Export your map or submit for community review

### Editor Tools
- **Wall/Floor** - Basic building blocks
- **Cover** - Destructible cover objects
- **Door/Locked Door** - Openable/breachable doors
- **Spawn/Exit** - Player start and extraction points
- **Enemy/Heavy** - Standard and armored enemies
- **Hostage** - Civilians to rescue
- **Room Tool** - Quick room creation (fill or outline)

### Keyboard Shortcuts
- `1-9` - Quick tool selection
- `Ctrl+Z` - Undo
- `Delete` - Clear all

## Map Submission System

Players can submit their custom maps for community review:

### For Players:
1. Create your map in the Level Editor
2. Fill in map name, description, and author
3. Click "📤 Submit for Review"
4. Wait for admin approval

### For Admins:
1. Start the server: `node server.js`
2. Open admin panel: `http://localhost:3000/admin`
3. Review pending maps in the sidebar
4. **Test Play** - Opens map in game for testing
5. **Accept** - Approves map to community levels
6. **Deny** - Rejects and deletes the submission

### Map Storage
- `/maps/unverified/` - Submitted maps awaiting review
- `/maps/community/` - Approved community maps

Approved maps automatically appear in "Community Levels" with a ✓ VERIFIED badge.

## Technical Details

- Pure JavaScript with HTML5 Canvas
- No external dependencies
- 800x600 game canvas
- 40x30 tile grid (20px tiles)
- 60 FPS game loop
- Collision detection system
- Particle effects for visual feedback
- State machine AI for enemies

## File Structure

The codebase is organized into separate, focused files for better maintainability:

- **index.html** - Main HTML structure with game UI elements
- **styles.css** - All styling and CSS for the game interface
- **constants.js** - Game constants and configuration values
- **weapons.js** - Weapon and equipment definitions
- **maps-official.js** - Official campaign mission definitions
- **maps-community.js** - Community map storage and server API integration
- **map-loader.js** - Map loading, validation, and export utilities
- **classes.js** - All game entity classes (Player, Enemy, Civilian, Door, Bullet, etc.)
- **audio.js** - Sound effects and music system
- **game-logic.js** - Core game logic, game loop, and level management
- **ui.js** - UI updates and all event handlers
- **server.js** - Node.js server for map review system
- **admin.html** - Admin panel for reviewing submitted maps
- **editor/** - Level editor (separate page)
  - **editor.html** - Editor interface
  - **editor.js** - Editor logic
  - **editor.css** - Editor styling
- **maps/** - Map storage
  - **unverified/** - Submitted maps pending review
  - **community/** - Approved community maps

## Future Enhancements

As mentioned in the requirements, assets will be added later. Current implementation uses colored pixels as placeholders for:
- Player (Blue square)
- Enemies (Red square)
- Hostages (Yellow square)
- Walls (Dark gray)
- Cover (Medium gray)
- Floor (Dark)

## License

Open source project for tactical shooter enthusiasts.