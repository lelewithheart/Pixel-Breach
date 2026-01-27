const MULTIPLAYER_SERVER_URL = "wss://pixel-breach.onrender.com";

const CVC_CONSTANTS = {
    TOTAL_PLAYERS: 10,
    TEAM_SIZE: 5,
    TOTAL_ROUNDS: 10,
    ROLE_SWITCH_ROUND: 5, // switch AFTER said Round (Rnd 5 in this example)

    TEAM_COPS: "cops",
    TEAM_CRIMINALS: "criminals",

    ROLE_COP: "cop",
    ROLE_CRIMINAL: "criminal",

    POINTS: {
        COP_KILL_KRIMINAL: 100,
        COP_RESCUE_CIVILIAN: 50,
        COP_ARREST_CRIMINAL: 150,
        COP_PREVENT_ESCAPE: 50,
        COP_SECURE_INTEL: 40,
        COP_BREACH_SUCCESS: 25,
        COP_NEGOTIATION_SUCCESS: 100,

        CRIMINAL_KILL_COP: 100,
        CRIMINAL_KILL_RESCUED_CIVILIAN: 75,
        CRIMINAL_ESCAPE: 125,
        CRIMINAL_TAKE_HOSTAGE: 50,
        CRIMINAL_DESTROY_EVIDENCE: 40,
        CRIMINAL_HACK_TERMINAL: 25,
        CRIMINAL_STEAL_VALUABLE: 100,

        KILL_UNRESCUED_CIVILIAN: -100,
        KILL_HOSTAGE: -150,
        FRIENDLY_FIRE_KILL: -50,
        CIVILIAN_PANIC_DEATH: -75
    },

    ROUND_TIME_LIMIT_MS: 180000, //3 mins
    LOADOUT_SELECTION_TIME_MS: 30000,
    ROUND_TRANSITION_DELAY: 5000,
    NEGOTIATION_TIME: 15000,

    MIN_CIVILIANS_PER_ROUND: 3,
    MAX_CIVILIANS_PER_ROUND: 8,
    CIVILIAN_SPAWN_PADDING: 60,

    CIVILIAN_STATE: {
        IDLE: "idle",
        WANDERING: "wandering",
        FLEEING: "fleeing",
        PANICKING: "panicking",
        COMPLYING: "complying",
        HOSTAGE: "hostage",
        RESCUED: "rescued",
        DEAD: "dead"
    },

    SYNC_RATE_MS: 50,
    POSITION_INTERPOLATION_DELAY: 100,
    SERVER_TICK_RATE_MS: 16,

    CIVILIAN_WANDER_SPPED: 0.5,
    CIVILIAN_FLEE_SPEED: 1.5,
    CIVILIAN_PANIC_SPEED: 2.0,
    CIVILIAN_DANGER_RADIUS: 150,
    CIVILIAN_WANDER_CHANGE_INTERVAL: 2000,
    CIVILIAN_PANIC_DURATION: 5000,
    CIVILIAN_COMPLY_RANGE: 80,

    HOSTAGE: {
        TAKE_TIME_MS: 2000,
        RELEASE_TIME_MS: 1000,
        EXECUTION_TIME_MS: 3000,
        SHIELD_DAMAGE_REDUCTION: 0.5,
        MOVEMENT_PENALTY: 0.6
    },

    ARREST: {
        SURRENDER_PROMPT_RANGE: 100,     // Range to issue commands
        SURRENDER_TIME_MS: 3000,         // Time for criminal to surrender
        ARREST_TIME_MS: 2000,            // Time to complete arrest
        DETAINED_DURATION_MS: 0,         // 0 = until round end
        ESCAPE_WINDOW_MS: 5000           // Time window to escape arrest
    },

    // Escape System
    ESCAPE: {
        ROUTE_TYPES: ['sewer', 'rooftop', 'tunnel', 'vehicle', 'disguise'],
        ACTIVATION_TIME_MS: 3000,        // Time to use escape route
        SABOTAGE_TIME_MS: 5000,          // Time for cops to sabotage
        MIN_ROUTES_PER_MAP: 2,
        MAX_ROUTES_PER_MAP: 4
    },

    // Intimidation/Threat System
    THREAT: {
        COMMAND_RANGE: 120,              // Range for commands
        FEAR_DECAY_RATE: 2,              // Fear decreases per second
        FEAR_GUNFIRE_INCREASE: 30,       // Fear increase from nearby gunfire
        FEAR_EXPLOSION_INCREASE: 50,     // Fear increase from explosions
        FEAR_THREAT_INCREASE: 15,        // Fear from verbal threats
        FEAR_THRESHOLD_FLEE: 60,         // Fear level to trigger flee
        FEAR_THRESHOLD_PANIC: 80,        // Fear level to trigger panic
        FEAR_THRESHOLD_COMPLY: 40        // Fear level to comply with commands
    },

    // Environment Interaction
    ENVIRONMENT: {
        DOOR_BREACH_TIME_MS: 1500,
        DOOR_BARRICADE_TIME_MS: 3000,
        DOOR_TRAP_ARM_TIME_MS: 2000,
        LIGHT_CUT_TIME_MS: 2000,
        CAMERA_HACK_TIME_MS: 4000,
        ALARM_DISABLE_TIME_MS: 3000
    },

    // Stealth & Detection
    STEALTH: {
        FOOTSTEP_NOISE_WALK: 30,
        FOOTSTEP_NOISE_RUN: 80,
        FOOTSTEP_NOISE_CROUCH: 10,
        RELOAD_NOISE: 50,
        GUNFIRE_NOISE_BASE: 200,         // Modified by weapon noise level
        DETECTION_CONE_ANGLE: 90,        // Degrees
        DETECTION_RANGE_NORMAL: 200,
        DETECTION_RANGE_ALERT: 300,
        SOUND_PROPAGATION_WALLS: 0.3     // Sound through walls multiplier
    },

    // Dynamic Objectives
    OBJECTIVES: {
        EVIDENCE_LOCATIONS_MIN: 1,
        EVIDENCE_LOCATIONS_MAX: 3,
        TERMINAL_LOCATIONS_MIN: 1,
        TERMINAL_LOCATIONS_MAX: 2,
        VALUABLE_LOCATIONS_MIN: 2,
        VALUABLE_LOCATIONS_MAX: 5,
        INTEL_LOCATIONS_MIN: 1,
        INTEL_LOCATIONS_MAX: 2
    },

    // Match States
    STATE: {
        WAITING: 'waiting',
        LOBBY: 'lobby',
        LOADOUT_SELECTION: 'loadout_selection',
        COUNTDOWN: 'countdown',
        PLAYING: 'playing',
        NEGOTIATION: 'negotiation',       // Hostage negotiation phase
        ROUND_END: 'round_end',
        ROLE_SWITCH: 'role_switch',
        MATCH_END: 'match_end'
    },

    // Player States
    PLAYER_STATE: {
        ALIVE: 'alive',
        DEAD: 'dead',
        SURRENDERING: 'surrendering',
        ARRESTED: 'arrested',
        ESCAPED: 'escaped',
        HOLDING_HOSTAGE: 'holding_hostage'
    },

    // Message Types (for networking)
    MSG_TYPE: {
        // Client -> Server
        JOIN_MATCH: 'join_match',
        LEAVE_MATCH: 'leave_match',
        SELECT_LOADOUT: 'select_loadout',
        PLAYER_INPUT: 'player_input',
        PLAYER_SHOOT: 'player_shoot',
        PLAYER_INTERACT: 'player_interact',
        PLAYER_USE_EQUIPMENT: 'player_use_equipment',
        PLAYER_RELOAD: 'player_reload',
        PLAYER_COMMAND: 'player_command',         // Issue verbal command
        PLAYER_TAKE_HOSTAGE: 'player_take_hostage',
        PLAYER_RELEASE_HOSTAGE: 'player_release_hostage',
        PLAYER_SURRENDER: 'player_surrender',
        PLAYER_ARREST: 'player_arrest',
        PLAYER_ESCAPE: 'player_escape',
        PLAYER_SABOTAGE: 'player_sabotage',
        PLAYER_BREACH: 'player_breach',
        PLAYER_BARRICADE: 'player_barricade',

        // Server -> Client
        MATCH_STATE: 'match_state',
        PLAYER_JOINED: 'player_joined',
        PLAYER_LEFT: 'player_left',
        GAME_STATE_UPDATE: 'game_state_update',
        ROUND_START: 'round_start',
        ROUND_END: 'round_end',
        ROLE_SWITCH: 'role_switch',
        MATCH_END: 'match_end',
        SCORE_UPDATE: 'score_update',
        CIVILIAN_RESCUED: 'civilian_rescued',
        CIVILIAN_KILLED: 'civilian_killed',
        CIVILIAN_HOSTAGE: 'civilian_hostage',
        CIVILIAN_RELEASED: 'civilian_released',
        CIVILIAN_STATE_CHANGE: 'civilian_state_change',
        PLAYER_KILLED: 'player_killed',
        PLAYER_ARRESTED: 'player_arrested',
        PLAYER_ESCAPED: 'player_escaped',
        PLAYER_SURRENDERED: 'player_surrendered',
        PLAYER_RESPAWNED: 'player_respawned',
        LOADOUT_VALIDATED: 'loadout_validated',
        ESCAPE_ROUTE_STATUS: 'escape_route_status',
        OBJECTIVE_UPDATE: 'objective_update',
        ENVIRONMENT_CHANGE: 'environment_change',
        TENSION_UPDATE: 'tension_update',
        SOUND_EVENT: 'sound_event',
        ERROR: 'error'
    }
};

// Team colors for visual distinction
const TEAM_COLORS = {
    cops: {
        primary: '#0066cc',
        secondary: '#004499',
        highlight: '#3399ff'
    },
    criminals: {
        primary: '#cc3300',
        secondary: '#992200',
        highlight: '#ff6633'
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CVC_CONSTANTS, TEAM_COLORS };
}