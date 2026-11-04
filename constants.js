const TILE_SIZE = 20;
const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;

// Logical view size. The canvas always reasons in these units; CSS scales it up.
const VIEW_W = 800;
const VIEW_H = 600;
// Camera zoom. 1.75 shows roughly 457x343 world pixels.
const ZOOM = 1.75;
const CAMERA_LOOKAHEAD = 0.25; // fraction of the player-to-mouse distance the camera leans toward the cursor
const CAMERA_LOOKAHEAD_MAX = 70;
const CAMERA_LERP = 0.12;

// Gameplay Constants
const ARMOR_ABSORPTION_RATE = 0.7; // Armor absorbs 70% of damage
const RELOAD_TIME_MS = 2000; // Fallback reload time when a weapon has none
const FLASHBANG_STUN_DURATION_MS = 5000; // Flashbang stun duration (enemies run around)
const FLASHBANG_FREEZE_MS = 1000; // Stunned enemies stand still this long before running around
const FLASHBANG_RADIUS = 150;
const VICTORY_DELAY_MS = 500; // Delay before showing victory message
const PLAYER_VIEW_DISTANCE = 300; // Player line of sight distance in pixels
const PLAYER_VIEW_ANGLE = Math.PI * 0.75; // Player field of view (135 degrees)
const PLAYER_NEAR_LIGHT = 96; // Radius the player always sees around themselves
const ENEMY_VIEW_DISTANCE = 220; // Enemy line of sight distance (the player's flashlight reaches 340)
const ENEMY_VIEW_ANGLE = Math.PI * 0.6; // Enemy field of view (108 degrees)
const DEFAULT_NOISE_LEVEL = 200; // Default gunshot noise radius in pixels
const MISSION_FAILURE_ALERT_DELAY = 100; // Delay before showing mission failure alert in milliseconds

// Enemy AI. Tweak these to change difficulty.
const ENEMY_REACTION_MS = 350; // Time between spotting the player and the first shot
const ENEMY_SUSPECT_MS = 4000; // How long an enemy investigates a noise
const ENEMY_MEMORY_MS = 6000; // How long an enemy chases the last known position
const ENEMY_PATH_INTERVAL_MS = 500; // How often a moving enemy recomputes its path
const ENEMY_SEEN_MEMORY_MS = 2000; // How long a spotted enemy stays on the minimap
const ENEMY_DAMAGE_SCALE = { normal: 0.4, heavy: 0.55 }; // Enemy weapon damage multiplier
const ENEMY_FIRE_RATE_SCALE = 1.4; // 1.0 = same fire rate as the player, higher = slower
const ENEMY_SPREAD_SCALE = 3.0; // Enemies are less accurate than the player, so range is your friend
const ENEMY_RELOAD_SCALE = 1.3; // Enemies reload slower than the player
const ENEMY_BURST_MIN = 3; // Enemies fire in bursts with a pause between them
const ENEMY_BURST_MAX = 5;
const ENEMY_BURST_PAUSE_MS = [450, 900]; // Random pause between bursts

// Player weapon handling
const BLOOM_PER_SHOT = 0.03; // Extra spread added per shot
const BLOOM_MAX = 0.12;
const BLOOM_RECOVER_MS = 400; // Time for bloom to fully recover
const SPREAD_SPRINT = 1.6;
const SPREAD_CROUCH = 0.6;
const SPREAD_LEAN = 0.85;
const SPRINT_BLOCK_AFTER_SHOT_MS = 300;
const STAMINA_DRAIN_PER_S = 48;
const STAMINA_REGEN_PER_S = 12;

// Throwables
const GRENADE_FUSE_MS = { grenade: 2200, smoke: 1200, stun: 900 };
const SMOKE_RADIUS = 70;
const SMOKE_DURATION_MS = 8000;
const SMOKE_GROW_MS = 1000;

// Rewards
const CAMPAIGN_CREDITS_BASE = 20;
const CAMPAIGN_CREDITS_PER_KILL = 5;

// Extraction point visual effect constants
const EXTRACTION_PULSE_FREQUENCY = 3; // Frequency of extraction point pulse animation
const EXTRACTION_PULSE_AMPLITUDE = 0.3; // Amplitude of pulse effect
const EXTRACTION_PULSE_BASE = 0.7; // Base opacity for pulse effect
