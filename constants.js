// Game Constants
const TILE_SIZE = 20;
const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;

// Gameplay Constants
const ARMOR_ABSORPTION_RATE = 0.7; // Armor absorbs 70% of damage
const RELOAD_TIME_MS = 2000; // Standard reload time in milliseconds
const FLASHBANG_STUN_DURATION_MS = 5000; // Flashbang stun duration (enemies run around)
const VICTORY_DELAY_MS = 500; // Delay before showing victory message
const PLAYER_VIEW_DISTANCE = 300; // Player line of sight distance in pixels
const PLAYER_VIEW_ANGLE = Math.PI * 0.75; // Player field of view (135 degrees)
const ENEMY_VIEW_DISTANCE = 250; // Enemy line of sight distance
const ENEMY_VIEW_ANGLE = Math.PI * 0.6; // Enemy field of view (108 degrees)
const DEFAULT_NOISE_LEVEL = 200; // Default gunshot noise radius in pixels
const MISSION_FAILURE_ALERT_DELAY = 100; // Delay before showing mission failure alert in milliseconds

// Extraction point visual effect constants
const EXTRACTION_PULSE_FREQUENCY = 3; // Frequency of extraction point pulse animation
const EXTRACTION_PULSE_AMPLITUDE = 0.3; // Amplitude of pulse effect
const EXTRACTION_PULSE_BASE = 0.7; // Base opacity for pulse effect
