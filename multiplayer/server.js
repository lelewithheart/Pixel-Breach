const http = require('http');
const fs = require('fs');
const path = require('path');

const { CVC_CONSTANTS, TEAM_COLORS } = require('./constants.js');
const { CVC_LOADOUTS, DEFAULT_LOADOUTS, validateLoadout, getLoadoutItem, getAvailableItems } = require('./loadout.js');
const { CVCScoring } = require('./scoring.js');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const WEBSOCKET_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const SERVER_GRID_WIDTH = 40;
const SERVER_GRID_HEIGHT = 30;
const SERVER_TILE_SIZE = 20;

const matches = new Map();

const clients = new Map();

class ServerCVCGameMode {
    constructor() {
        this.matchId = null;
        this.state = CVC_CONSTANTS.STATE.WAITING;
        this.currentRound = 0;
        this.roundStartTime = 0;
        this.roundTimeRemaining = 0;

        this.players = new Map();
        this.deadPlayers = new Set();

        this.teams = {
            cops: new Set(),
            criminals: new Set()
        };

        this.civilians = [];
        this.scoring = new CVCScoring();

        this.spawnPoints = {
            cops: [],
            criminals: [],
            civilians: []
        };

        this.gameLoopInterval = null;
        this.roundTimer = null;

        this.onBroadcast = null;
    }

    generateMatchId() {
        return 'cvc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }

    initMatch() {
        this.matchId = this.generateMatchId();
        this.state = CVC_CONSTANTS.STATE.LOBBY;
        this.currentRound = 0;

        this.generateDefaultSpawnPoints();

        // --- Map grid loading (default map) ---
        // For now, load a static map from maps/mission-01-training.json
        try {
            const mapPath = path.join(__dirname, '../maps/mission-01-training.json');
            const mapJson = fs.readFileSync(mapPath, 'utf8');
            const mapData = JSON.parse(mapJson);
            this.mapGrid = mapData.grid;
        } catch (e) {
            // Fallback: empty grid (all floor)
            this.mapGrid = Array.from({ length: SERVER_GRID_HEIGHT }, () => Array(SERVER_GRID_WIDTH).fill(0));
            console.error('[Server] Failed to load map grid:', e);
        }

        this.scoring.reset();
        this.players.clear();
        this.deadPlayers.clear();
        this.teams.cops.clear();
        this.teams.criminals.clear();
        this.civilians = [];

        return this.matchId;
    }

    generateDefaultSpawnPoints() {
        const width = SERVER_GRID_WIDTH;
        const height = SERVER_GRID_HEIGHT;

        for (let i = 0; i < 5; i++) {
            this.spawnPoints.cops.push({
                x: 3 + (i % 3),
                y: height - 5 + Math.floor(i / 3)
            });
        }

        for (let i = 0; i < 5; i++) {
            this.spawnPoints.criminals.push({
                x: width - 6 + (i % 3),
                y: 3 + Math.floor(i / 3)
            });
        }

        for (let i = 0; i < 10; i++) {
            this.spawnPoints.civilians.push({
                x: 10 + Math.floor(Math.random() * (width - 20)),
                y: 10 + Math.floor(Math.random() * (height - 20))
            });
        }
    }

    addPlayer(playerId, playerName, socket) {
        if (this.players.size >= CVC_CONSTANTS.TOTAL_PLAYERS) {
            return { success: false, error: 'Match is full' };
        }

        if (this.players.has(playerId)) {
            return { success: false, error: 'Player already in match' };
        }

        let team;
        if (this.teams.cops.size <= this.teams.criminals.size) {
            team = CVC_CONSTANTS.TEAM_COPS;
            this.teams.cops.add(playerId);
        } else {
            team = CVC_CONSTANTS.TEAM_CRIMINALS;
            this.teams.criminals.add(playerId);
        }

        const player = {
            id: playerId,
            name: playerName,
            team: team,
            socket: socket,
            x: 0,
            y: 0,
            angle: 0,
            health: 100,
            maxHealth: 100,
            armor: 100,
            stamina: 100,
            stance: 'standing',
            alive: true,
            loadout: null,
            loadoutConfirmed: false,
            currentWeapon: 'primary',
            weapons: {},
            equipment: null,
            canFire: true,
            reloading: false,
            lastInput: null,
            lastUpdateTime: Date.now()
        };

        this.players.set(playerId, player);
        this.scoring.initPlayer(playerId, team);

        return {
            success: true,
            team,
            playerCount: this.players.size,
            playersNeeded: CVC_CONSTANTS.TOTAL_PLAYERS - this.players.size
        };
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        this.teams[player.team].delete(playerId);
        this.players.delete(playerId);
        this.deadPlayers.delete(playerId);
    }

    canStartMatch() {
        return this.players.size >= 2;
    }

    startMatch() {
        if (!this.canStartMatch()) {
            return { success: false, error: 'Not enough players' };
        }

        this.state = CVC_CONSTANTS.STATE.LOADOUT_SELECTION;
        this.currentRound = 1;

        this.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.MATCH_STATE,
            state: this.state,
            round: this.currentRound
        });

        setTimeout(() => {
            if (this.state === CVC_CONSTANTS.STATE.LOADOUT_SELECTION) {
                this.startRound();
            }
        }, CVC_CONSTANTS.LOADOUT_SELECTION_TIME_MS);

        return { success: true, state: this.state, round: this.currentRound };
    }

    confirmLoadout(playerId, loadout) {
        const player = this.players.get(playerId);
        if (!player) return { success: false, error: 'Player not found' };

        const role = player.team;
        const validation = validateLoadout(role, loadout);

        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        player.loadout = loadout;
        player.loadoutConfirmed = true;

        const primaryStats = getLoadoutItem(role, 'primary', loadout.primary);
        const secondaryStats = getLoadoutItem(role, 'secondary', loadout.secondary);
        const equipmentStats = getLoadoutItem(role, 'equipment', loadout.equipment);

        player.weapons = {
            primary: { ...primaryStats, currentAmmo: primaryStats.magSize, reserveAmmo: primaryStats.totalAmmo },
            secondary: { ...secondaryStats, currentAmmo: secondaryStats.magSize, reserveAmmo: secondaryStats.totalAmmo }
        };
        player.equipment = { ...equipmentStats };

        let allConfirmed = true;
        this.players.forEach(p => {
            if (!p.loadoutConfirmed) allConfirmed = false;
        });

        if (allConfirmed) {
            this.startRound();
        }

        return { success: true, loadout };
    }

    startRound() {
        this.state = CVC_CONSTANTS.STATE.COUNTDOWN;
        this.spawnAllPlayers();
        this.spawnCivilians();
        this.deadPlayers.clear();

        this.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.ROUND_START,
            round: this.currentRound
        });

        setTimeout(() => {
            this.state = CVC_CONSTANTS.STATE.PLAYING;
            this.roundStartTime = Date.now();
            this.roundTimeRemaining = CVC_CONSTANTS.ROUND_TIME_LIMIT_MS;

            this.startGameLoop();

            this.roundTimer = setTimeout(() => {
                this.endRoundByTimer();
            }, CVC_CONSTANTS.ROUND_TIME_LIMIT_MS);
        }, 3000);
    }

    spawnAllPlayers() {
        let copIndex = 0;
        let criminalIndex = 0;

        this.players.forEach((player) => {
            let spawnPoint;
            if (player.team === CVC_CONSTANTS.TEAM_COPS) {
                spawnPoint = this.spawnPoints.cops[copIndex % this.spawnPoints.cops.length];
                copIndex++;
            } else {
                spawnPoint = this.spawnPoints.criminals[criminalIndex % this.spawnPoints.criminals.length];
                criminalIndex++;
            }

            player.x = spawnPoint.x * 20 + 10;
            player.y = spawnPoint.y * 20 + 10;
            player.health = player.maxHealth;
            player.armor = 100;
            player.stamina = 100;
            player.alive = true;
            player.canFire = true;
            player.reloading = false;
        });
    }

    spawnCivilians() {
        this.civilians = [];

        const civCount = CVC_CONSTANTS.MIN_CIVILIANS_PER_ROUND +
                        Math.floor(Math.random() * (CVC_CONSTANTS.MAX_CIVILIANS_PER_ROUND - CVC_CONSTANTS.MIN_CIVILIANS_PER_ROUND + 1));

        for (let i = 0; i < civCount; i++) {
            const spawnPoint = this.spawnPoints.civilians[i % this.spawnPoints.civilians.length];
            this.civilians.push({
                id: `civ_${this.currentRound}_${i}`,
                x: spawnPoint.x * 20 + 10,
                y: spawnPoint.y * 20 + 10,
                health: 50,
                rescued: false,
                dead: false,
                scared: false,
                wanderAngle: Math.random() * Math.PI * 2,
                wanderChangeTime: Date.now()
            });
        }
    }

    startGameLoop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }

        this.gameLoopInterval = setInterval(() => {
            this.serverTick();
        }, CVC_CONSTANTS.SERVER_TICK_RATE_MS);
    }

    stopGameLoop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
    }

    serverTick() {
        if (this.state !== CVC_CONSTANTS.STATE.PLAYING) return;

        this.updateCivilians();

        this.checkRoundEndConditions();

        this.roundTimeRemaining = Math.max(0,
            CVC_CONSTANTS.ROUND_TIME_LIMIT_MS - (Date.now() - this.roundStartTime));

        this.broadcastGameState();
    }

    updateCivilians() {
        this.civilians.forEach(civ => {
            if (civ.dead || civ.rescued) return;

            let nearestDanger = null;
            let nearestDist = CVC_CONSTANTS.CIVILIAN_DANGER_RADIUS;

            this.players.forEach(player => {
                if (!player.alive) return;
                const dist = Math.hypot(player.x - civ.x, player.y - civ.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestDanger = player;
                }
            });

            if (nearestDanger) {
                civ.scared = true;
                const fleeAngle = Math.atan2(civ.y - nearestDanger.y, civ.x - nearestDanger.x);
                civ.x += Math.cos(fleeAngle) * CVC_CONSTANTS.CIVILIAN_FLEE_SPEED;
                civ.y += Math.sin(fleeAngle) * CVC_CONSTANTS.CIVILIAN_FLEE_SPEED;
            } else {
                civ.scared = false;
                if (Date.now() - civ.wanderChangeTime > CVC_CONSTANTS.CIVILIAN_WANDER_CHANGE_INTERVAL) {
                    civ.wanderAngle = Math.random() * Math.PI * 2;
                    civ.wanderChangeTime = Date.now();
                }
                civ.x += Math.cos(civ.wanderAngle) * CVC_CONSTANTS.CIVILIAN_WANDER_SPEED;
                civ.y += Math.sin(civ.wanderAngle) * CVC_CONSTANTS.CIVILIAN_WANDER_SPEED;
            }

            civ.x = Math.max(60, Math.min(740, civ.x));
            civ.y = Math.max(60, Math.min(540, civ.y));
        });
    }

    checkRoundEndConditions() {
        let copsAlive = 0;
        let criminalsAlive = 0;

        this.players.forEach(player => {
            if (!this.deadPlayers.has(player.id) && player.alive) {
                if (player.team === CVC_CONSTANTS.TEAM_COPS) copsAlive++;
                else criminalsAlive++;
            }
        });

        if (copsAlive === 0 && this.players.size > 0) {
            this.endRound('criminals_eliminated_cops');
        } else if (criminalsAlive === 0 && this.players.size > 0) {
            this.endRound('cops_eliminated_criminals');
        }
    }

    endRoundByTimer() {
        let copsAlive = 0;
        let criminalsAlive = 0;

        this.players.forEach(player => {
            if (!this.deadPlayers.has(player.id) && player.alive) {
                if (player.team === CVC_CONSTANTS.TEAM_COPS) copsAlive++;
                else criminalsAlive++;
            }
        });

        if (copsAlive >= criminalsAlive) {
            this.endRound('timer_cops_win');
        } else {
            this.endRound('timer_criminals_win');
        }
    }

    endRound(reason) {
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }
        this.stopGameLoop();

        this.state = CVC_CONSTANTS.STATE.ROUND_END;

        const roundSummary = this.scoring.endRound(this.currentRound);
        roundSummary.reason = reason;

        this.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.ROUND_END,
            round: this.currentRound,
            reason: reason,
            scores: this.scoring.getScores(),
            summary: roundSummary
        });

        if (this.currentRound === CVC_CONSTANTS.ROLE_SWITCH_ROUND) {
            this.switchTeamRoles();
        }

        if (this.currentRound >= CVC_CONSTANTS.TOTAL_ROUNDS) {
            this.endMatch();
            return;
        }

        this.currentRound++;

        setTimeout(() => {
            this.startLoadoutSelection();
        }, CVC_CONSTANTS.ROUND_TRANSITION_DELAY_MS);
    }

    startLoadoutSelection() {
        this.state = CVC_CONSTANTS.STATE.LOADOUT_SELECTION;

        this.players.forEach(player => {
            player.loadoutConfirmed = false;
        });

        this.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.MATCH_STATE,
            state: this.state,
            round: this.currentRound
        });

        setTimeout(() => {
            if (this.state === CVC_CONSTANTS.STATE.LOADOUT_SELECTION) {
                this.startRound();
            }
        }, CVC_CONSTANTS.LOADOUT_SELECTION_TIME_MS);
    }

    switchTeamRoles() {
        const tempCops = new Set(this.teams.cops);
        this.teams.cops = new Set(this.teams.criminals);
        this.teams.criminals = tempCops;

        this.players.forEach(player => {
            player.team = player.team === CVC_CONSTANTS.TEAM_COPS ?
                         CVC_CONSTANTS.TEAM_CRIMINALS : CVC_CONSTANTS.TEAM_COPS;
        });

        this.scoring.switchAllTeams();

        this.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.ROLE_SWITCH,
            teams: {
                cops: Array.from(this.teams.cops),
                criminals: Array.from(this.teams.criminals)
            }
        });
    }

    endMatch() {
        this.state = CVC_CONSTANTS.STATE.MATCH_END;
        this.stopGameLoop();

        const results = this.scoring.getMatchResults();

        this.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.MATCH_END,
            results: results
        });
    }

    processInput(playerId, input) {
        const player = this.players.get(playerId);
        if (!player || this.deadPlayers.has(playerId) || !player.alive) return;

        const now = Date.now();
        const dt = Math.min((now - player.lastUpdateTime) / 16, 3);
        player.lastUpdateTime = now;

        let speed = 1.5;

        if (input.sprinting && player.stamina > 0 && player.stance === 'standing') {
            speed = 2.5;
            player.stamina = Math.max(0, player.stamina - 0.8 * dt);
        } else {
            if (player.stamina < 100) {
                player.stamina = Math.min(100, player.stamina + 0.2 * dt);
            }
        }

        if (input.crouching) {
            speed = 0.8;
            player.stance = 'crouched';
        } else {
            player.stance = 'standing';
        }

        if (input.dx !== 0 || input.dy !== 0) {
            const magnitude = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
            player.x += (input.dx / magnitude) * speed * dt;
            player.y += (input.dy / magnitude) * speed * dt;

            player.x = Math.max(16, Math.min(784, player.x));
            player.y = Math.max(16, Math.min(584, player.y));
        }

        if (input.angle !== undefined) {
            player.angle = input.angle;
        }
    }

    processShoot(playerId, angle) {
        const player = this.players.get(playerId);
        if (!player || this.deadPlayers.has(playerId) || !player.alive) {
            return { success: false };
        }

        if (!player.canFire || player.reloading) {
            return { success: false };
        }

        const weapon = player.weapons[player.currentWeapon];
        if (!weapon || weapon.currentAmmo <= 0) {
            return { success: false, reason: 'no_ammo' };
        }

        weapon.currentAmmo--;
        player.canFire = false;

        setTimeout(() => {
            player.canFire = true;
        }, weapon.fireRate);

        const pellets = weapon.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * (weapon.spread || 0.1);
            const bulletAngle = angle + spread;

            this.checkBulletHit(player, bulletAngle, weapon.damage);
        }

        return { success: true };
    }

    checkBulletHit(shooter, angle, damage) {
        const maxDist = 400;
        const steps = 40;
        const tileSize = typeof SERVER_TILE_SIZE !== 'undefined' ? SERVER_TILE_SIZE : 20;
        // Assume map grid is available as this.mapGrid (2D array of tile types)
        // If not, add a property to ServerCVCGameMode and set it when loading the map
        for (let i = 1; i <= steps; i++) {
            const dist = (maxDist / steps) * i;
            const checkX = shooter.x + Math.cos(angle) * dist;
            const checkY = shooter.y + Math.sin(angle) * dist;

            // Wall collision check
            if (this.mapGrid && Array.isArray(this.mapGrid)) {
                const gridX = Math.floor(checkX / tileSize);
                const gridY = Math.floor(checkY / tileSize);
                if (
                    gridY >= 0 && gridY < this.mapGrid.length &&
                    gridX >= 0 && gridX < this.mapGrid[0].length &&
                    this.mapGrid[gridY][gridX] === 1 // 1 = wall
                ) {
                    // Bullet hits wall, stop
                    return;
                }
            }

            let hit = false;
            this.players.forEach((target, targetId) => {
                if (hit || targetId === shooter.id || this.deadPlayers.has(targetId) || !target.alive) return;

                const d = Math.hypot(target.x - checkX, target.y - checkY);
                if (d < 16) {
                    this.handlePlayerHit(shooter.id, targetId, damage);
                    hit = true;
                }
            });

            if (hit) return;

            this.civilians.forEach(civ => {
                if (hit || civ.dead) return;

                const d = Math.hypot(civ.x - checkX, civ.y - checkY);
                if (d < 14) {
                    this.handleCivilianHit(shooter.id, civ, damage);
                    hit = true;
                }
            });

            if (hit) return;
        }
    }

    handlePlayerHit(attackerId, victimId, damage) {
        const victim = this.players.get(victimId);
        const attacker = this.players.get(attackerId);

        if (!victim || !attacker) return;

        if (victim.armor > 0) {
            const absorb = Math.min(victim.armor, damage * 0.7);
            victim.armor -= absorb;
            damage -= absorb;
        }

        victim.health -= damage;

        if (victim.health <= 0) {
            victim.health = 0;
            victim.alive = false;
            this.deadPlayers.add(victimId);

            const scoreResult = this.scoring.recordPlayerKill(
                attackerId,
                victimId,
                attacker.team,
                victim.team
            );

            this.broadcast({
                type: CVC_CONSTANTS.MSG_TYPE.PLAYER_KILLED,
                killer: attackerId,
                victim: victimId,
                scoreChange: scoreResult
            });
        }
    }

    handleCivilianHit(attackerId, civilian, damage) {
        const attacker = this.players.get(attackerId);
        if (!attacker) return;

        civilian.health -= damage;

        if (civilian.health <= 0 && !civilian.dead) {
            civilian.dead = true;

            const scoreResult = this.scoring.recordCivilianKilled(
                attackerId,
                civilian.id,
                civilian.rescued,
                attacker.team
            );

            this.broadcast({
                type: CVC_CONSTANTS.MSG_TYPE.CIVILIAN_KILLED,
                killer: attackerId,
                civilianId: civilian.id,
                wasRescued: civilian.rescued,
                scoreChange: scoreResult
            });
        }
    }

    processRescue(playerId) {
        const player = this.players.get(playerId);
        if (!player || player.team !== CVC_CONSTANTS.TEAM_COPS) {
            return { success: false, error: 'Only cops can rescue' };
        }

        for (const civ of this.civilians) {
            if (!civ.rescued && !civ.dead) {
                const dist = Math.hypot(civ.x - player.x, civ.y - player.y);
                if (dist < 40) {
                    civ.rescued = true;

                    const scoreResult = this.scoring.recordCivilianRescue(playerId, civ.id);

                    this.broadcast({
                        type: CVC_CONSTANTS.MSG_TYPE.CIVILIAN_RESCUED,
                        player: playerId,
                        civilianId: civ.id,
                        scoreChange: scoreResult
                    });

                    return { success: true, civilianId: civ.id };
                }
            }
        }

        return { success: false, error: 'No civilian nearby' };
    }

    processReload(playerId) {
        const player = this.players.get(playerId);
        if (!player || player.reloading) return false;

        const weapon = player.weapons[player.currentWeapon];
        if (!weapon || weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo === 0) {
            return false;
        }

        player.reloading = true;

        setTimeout(() => {
            const ammoNeeded = weapon.magSize - weapon.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);
            weapon.currentAmmo += ammoToReload;
            weapon.reserveAmmo -= ammoToReload;
            player.reloading = false;
        }, 2000);

        return true;
    }

    processSwitchWeapon(playerId, weapon) {
        const player = this.players.get(playerId);
        if (!player) return;

        if (weapon === 'primary' || weapon === 'secondary') {
            player.currentWeapon = weapon;
        }
    }

    broadcastGameState() {
        const players = [];
        this.players.forEach(player => {
            players.push({
                id: player.id,
                name: player.name,
                team: player.team,
                x: player.x,
                y: player.y,
                angle: player.angle,
                health: player.health,
                armor: player.armor,
                stamina: player.stamina,
                stance: player.stance,
                alive: player.alive,
                currentWeapon: player.currentWeapon
            });
        });

        const civilians = this.civilians.map(civ => ({
            id: civ.id,
            x: civ.x,
            y: civ.y,
            health: civ.health,
            rescued: civ.rescued,
            dead: civ.dead,
            scared: civ.scared
        }));

        this.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.GAME_STATE_UPDATE,
            state: this.state,
            round: this.currentRound,
            roundTimeRemaining: this.roundTimeRemaining,
            players: players,
            civilians: civilians,
            scores: this.scoring.getScores()
        });
    }

    broadcast(message) {
        if (this.onBroadcast) {
            this.onBroadcast(message);
        }
    }

    getMatchInfo() {
        return {
            matchId: this.matchId,
            state: this.state,
            playerCount: this.players.size,
            maxPlayers: CVC_CONSTANTS.TOTAL_PLAYERS,
            teams: {
                cops: this.teams.cops.size,
                criminals: this.teams.criminals.size
            }
        };
    }
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (url.pathname === '/api/matches') {
        res.setHeader('Content-Type', 'application/json');
        const matchList = [];
        matches.forEach((match, id) => {
            matchList.push(match.getMatchInfo());
        });
        res.end(JSON.stringify({ matches: matchList }));
        return;
    }

    if (url.pathname === '/api/create-match' && req.method === 'POST') {
        const match = new ServerCVCGameMode();
        const matchId = match.initMatch();
        matches.set(matchId, match);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, matchId }));
        return;
    }

    if (url.pathname === '/health') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', matches: matches.size, clients: clients.size }));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.on('upgrade', (req, socket, head) => {
    const crypto = require('crypto');

    const key = req.headers['sec-websocket-key'];
    const accept = crypto
        .createHash('sha1')
        .update(key + WEBSOCKET_MAGIC)
        .digest('base64');

    const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        '',
        ''
    ].join('\r\n');

    socket.write(headers);

    const clientId = 'client_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);

    const client = {
        id: clientId,
        socket: socket,
        playerId: null,
        matchId: null,
        playerName: null
    };

    clients.set(clientId, client);

    console.log(`[WS] Client connected: ${clientId}`);

    socket.on('data', (buffer) => {
        try {
            const frame = parseWebSocketFrame(buffer);
            if (frame.opcode === 8) {
                socket.end();
                return;
            }
            if (frame.opcode === 1) {
                const message = JSON.parse(frame.payload);
                handleClientMessage(client, message);
            }
        } catch (err) {
            console.error('[WS] Error parsing message:', err);
        }
    });

    socket.on('close', () => {
        console.log(`[WS] Client disconnected: ${clientId}`);

        if (client.matchId && client.playerId) {
            const match = matches.get(client.matchId);
            if (match) {
                match.removePlayer(client.playerId);
                match.broadcast({
                    type: CVC_CONSTANTS.MSG_TYPE.PLAYER_LEFT,
                    playerId: client.playerId
                });
            }
        }

        clients.delete(clientId);
    });

    socket.on('error', (err) => {
        console.error(`[WS] Socket error for ${clientId}:`, err);
    });
});

function parseWebSocketFrame(buffer) {
    const firstByte = buffer[0];
    const opcode = firstByte & 0x0f;

    const secondByte = buffer[1];
    const isMasked = (secondByte & 0x80) !== 0;
    let payloadLength = secondByte & 0x7f;

    let offset = 2;

    if (payloadLength === 126) {
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
    } else if (payloadLength === 127) {
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
    }

    let mask = null;
    if (isMasked) {
        mask = buffer.slice(offset, offset + 4);
        offset += 4;
    }

    let payload = buffer.slice(offset, offset + payloadLength);

    if (isMasked) {
        for (let i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4];
        }
    }

    return {
        opcode,
        payload: payload.toString('utf8')
    };
}

function sendWebSocketMessage(socket, data) {
    const payload = JSON.stringify(data);
    const payloadBuffer = Buffer.from(payload);

    let frame;
    if (payloadBuffer.length < 126) {
        frame = Buffer.alloc(2 + payloadBuffer.length);
        frame[0] = 0x81;
        frame[1] = payloadBuffer.length;
        payloadBuffer.copy(frame, 2);
    } else if (payloadBuffer.length < 65536) {
        frame = Buffer.alloc(4 + payloadBuffer.length);
        frame[0] = 0x81;
        frame[1] = 126;
        frame.writeUInt16BE(payloadBuffer.length, 2);
        payloadBuffer.copy(frame, 4);
    } else {
        frame = Buffer.alloc(10 + payloadBuffer.length);
        frame[0] = 0x81;
        frame[1] = 127;
        frame.writeBigUInt64BE(BigInt(payloadBuffer.length), 2);
        payloadBuffer.copy(frame, 10);
    }

    try {
        socket.write(frame);
    } catch (err) {
        console.error('[WS] Error sending message:', err);
    }
}

function handleClientMessage(client, message) {
    switch (message.type) {
        case CVC_CONSTANTS.MSG_TYPE.JOIN_MATCH:
            handleJoinMatch(client, message);
            break;
        case CVC_CONSTANTS.MSG_TYPE.LEAVE_MATCH:
            handleLeaveMatch(client);
            break;
        case CVC_CONSTANTS.MSG_TYPE.SELECT_LOADOUT:
            handleSelectLoadout(client, message);
            break;
        case CVC_CONSTANTS.MSG_TYPE.PLAYER_INPUT:
            handlePlayerInput(client, message);
            break;
        case CVC_CONSTANTS.MSG_TYPE.PLAYER_SHOOT:
            handlePlayerShoot(client, message);
            break;
        case CVC_CONSTANTS.MSG_TYPE.PLAYER_INTERACT:
            handlePlayerInteract(client);
            break;
        case CVC_CONSTANTS.MSG_TYPE.PLAYER_RELOAD:
            handlePlayerReload(client);
            break;
        case 'switch_weapon':
            handleSwitchWeapon(client, message);
            break;
        case 'start_match':
            handleStartMatch(client);
            break;
        default:
            console.log('[WS] Unknown message type:', message.type);
    }
}

function handleJoinMatch(client, message) {
    const { matchId, playerName } = message;

    let match = matches.get(matchId);
    if (!match) {
        // Create new match if doesn't exist
        match = new ServerCVCGameMode();
        match.initMatch();
        matches.set(match.matchId, match);
    }

    const playerId = 'player_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    const result = match.addPlayer(playerId, playerName || 'Player', client.socket);

    if (result.success) {
        client.playerId = playerId;
        client.matchId = match.matchId;
        client.playerName = playerName;

        match.onBroadcast = (msg) => {
            match.players.forEach(player => {
                if (player.socket) {
                    sendWebSocketMessage(player.socket, msg);
                }
            });
        };

        sendWebSocketMessage(client.socket, {
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_JOINED,
            playerId: playerId,
            team: result.team,
            matchId: match.matchId,
            matchInfo: match.getMatchInfo(),
            availableLoadouts: getAvailableItems(result.team, 'primary')
        });

        match.broadcast({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_JOINED,
            playerId: playerId,
            playerName: playerName,
            team: result.team,
            matchInfo: match.getMatchInfo()
        });
    } else {
        sendWebSocketMessage(client.socket, {
            type: CVC_CONSTANTS.MSG_TYPE.ERROR,
            error: result.error
        });
    }
}

function handleLeaveMatch(client) {
    if (client.matchId && client.playerId) {
        const match = matches.get(client.matchId);
        if (match) {
            match.removePlayer(client.playerId);
            match.broadcast({
                type: CVC_CONSTANTS.MSG_TYPE.PLAYER_LEFT,
                playerId: client.playerId
            });

            if (match.players.size === 0) {
                match.stopGameLoop();
                matches.delete(client.matchId);
            }
        }
    }

    client.matchId = null;
    client.playerId = null;
}

function handleSelectLoadout(client, message) {
    if (!client.matchId || !client.playerId) return;

    const match = matches.get(client.matchId);
    if (!match) return;

    const result = match.confirmLoadout(client.playerId, message.loadout);

    sendWebSocketMessage(client.socket, {
        type: CVC_CONSTANTS.MSG_TYPE.LOADOUT_VALIDATED,
        success: result.success,
        error: result.error,
        loadout: result.loadout
    });
}

function handlePlayerInput(client, message) {
    if (!client.matchId || !client.playerId) return;

    const match = matches.get(client.matchId);
    if (!match) return;

    match.processInput(client.playerId, message.input);
}

function handlePlayerShoot(client, message) {
    if (!client.matchId || !client.playerId) return;

    const match = matches.get(client.matchId);
    if (!match) return;

    match.processShoot(client.playerId, message.angle);
}

function handlePlayerInteract(client) {
    if (!client.matchId || !client.playerId) return;

    const match = matches.get(client.matchId);
    if (!match) return;

    match.processRescue(client.playerId);
}

function handlePlayerReload(client) {
    if (!client.matchId || !client.playerId) return;

    const match = matches.get(client.matchId);
    if (!match) return;

    match.processReload(client.playerId);
}

function handleSwitchWeapon(client, message) {
    if (!client.matchId || !client.playerId) return;

    const match = matches.get(client.matchId);
    if (!match) return;

    match.processSwitchWeapon(client.playerId, message.weapon);
}

function handleStartMatch(client) {
    if (!client.matchId) return;

    const match = matches.get(client.matchId);
    if (!match) return;

    const result = match.startMatch();

    if (!result.success) {
        sendWebSocketMessage(client.socket, {
            type: CVC_CONSTANTS.MSG_TYPE.ERROR,
            error: result.error
        });
    }
}

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     COPS VS CRIMINALS - Multiplayer Server             ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  🎮 WebSocket port: ${PORT} (use wss://your-domain if behind TLS)   ║`);
    console.log(`║  📡 HTTP API port:  ${PORT}                                      ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Endpoints:                                            ║');
    console.log('║    GET  /health       - Server health check            ║');
    console.log('║    GET  /api/matches  - List active matches            ║');
    console.log('║    POST /api/create-match - Create new match           ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Press Ctrl+C to stop the server                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
});