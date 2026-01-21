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

1. Open `index.html` in a web browser
2. Click "LOADOUT" to select your weapons and equipment
3. Click "START GAME" to begin the mission
4. Complete objectives to win

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
- `E` - Interact (rescue hostages)
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

1. Click "LEVEL EDITOR" to enter editor mode
2. Select tools (Wall, Floor, Enemy, Hostage, Cover, etc.)
3. Click on the grid to place elements
4. Use "SAVE LEVEL" to store your creation
5. Use "LOAD LEVEL" to retrieve saved levels
6. Use "CLEAR LEVEL" to start fresh

Levels are saved to browser localStorage and persist between sessions.

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
- **maps-community.js** - Community map storage and management functions
- **classes.js** - All game entity classes (Player, Enemy, Civilian, Door, Bullet, etc.)
- **game-logic.js** - Core game logic, game loop, and level management
- **ui.js** - UI updates and all event handlers

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