const MP_TILE_SIZE = typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 20;
const MP_GRID_WIDTH = typeof GRID_WIDTH !== 'undefined' ? GRID_WIDTH : 40;
const MP_GRID_HEIGHT = typeof GRID_HEIGHT !== 'undefined' ? GRID_HEIGHT : 30;
const MP_RELOAD_TIME_MS = typeof RELOAD_TIME_MS !== 'undefined' ? RELOAD_TIME_MS : 2000;
const MP_ARMOR_ABSORPTION_RATE = typeof ARMOR_ABSORPTION_RATE !== 'undefined' ? ARMOR_ABSORPTION_RATE : 0.7;

class CVCGameMode {
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

        this.mapData = null;
        this.spawnPoints = {
            cops: [],
            criminals: [],
            civilians: []
        };

        this.gameLoopInterval = null;
        this.roundTimer = null;
    }

    initMatch(mapData) {
        this.matchId = this.generateMatchId();
        this.mapData = mapData;
        this.state = CVC_CONSTANTS.STATE.LOBBY;
        this.currentRound = 0;

        this.parseSpawnPoint(mapData);

        this.scoring.reset();

        this.players.clear();
        this.deadPlayers.clear();
        this.teams.cops.clear();
        this.teams.criminals.clear();
        this.civilians = [];

        return this.matchId;
    }

    generateMatchId() {
        return "cvc_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
    }

    parseSpawnPoint(mapData) {
        if (!mapData.spawnPoints) {
            const width = mapData.settings?.gridWidth || MP_GRID_WIDTH;
            const height = mapData.settings?.gridHeight || MP_GRID_HEIGHT;

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
        } else {
            this.spawnPoints = mapData.spawnPoints;
        }
    }

    addPlayer(playerId, playerName) {
        if (this.players.size >= CVC_CONSTANTS.TOTAL_PLAYERS) {
            return { success: false, error: "Match is full" };
        }

        if (this.players.has(playerId)) {
            return { success: false, error: "Player already in match" };
        }

        let team;
        if (this.teams.cops.size <= this.teams.criminals.size) {
            team = CVC_CONSTANTS.TEAM_COPS;
            this.teams.cops.add(playerdId);
        } else {
            team = CVC_CONSTANTS.TEAM_CRIMINALS;
            this.teams.criminals.add(playerId);
        }

        const player = new NetworkedPlayer(playerId, playerdName, team);
        this.players.set(playerId, team);

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
        return this.players.size === CVC_CONSTANTS.TOTAL_PLAYERS &&
            this.teams.cops.size === CVC_CONSTANTS.TEAM_SIZE &&
            this.teams.criminals.size === CVC_CONSTANTS.TEAM_SIZE;
    }

    startMatch() {
        if (!this.canStartMatch()) {
            return { success: false, error: "Not enough players" };
        }

        this.state = CVC_CONSTANTS.STATE.LOADOUT_SELECTION;
        this.currentRound = 1;

        return {
            success: true,
            state: this.state,
            round: this.currentRound
        };
    }

    startLoadoutSelection() {
        this.state = CVC_CONSTANTS.STATE.LOADOUT_SELECTION;

        this.players.forEach(player => {
            player.loadoutConfirmed = false;
        });

        setTimeout(() => {
            if (this.state === CVC_CONSTANTS.STATE.LOADOUT_SELECTION) {
                this.startRound();
            }
        }, CVC_CONSTANTS.LOADOUT_SELECTION_TIME_MS);
    }

    confirmLoadout(playerId, loadout) {
        const player = this.players.get(playerId);
        if (!player) return { success: false, error: "Player not found" };

        const role = player.team;
        const validation = validateLoadout(role, loadout);

        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        player.setLoadout(loadout, role);
        player.loadoutConfirmed = true;

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

        this.players.forEach((player, playerId) => {
            let spawnPoint;
            if (player.team === CVC_CONSTANTS.TEAM_COPS) {
                spawnPoint = this.spawnPoints.cops[copIndex % this.spawnPoints.cops.length];
                copIndex++;
            } else {
                spawnPoint = this.spawnPoints.criminals[criminalIndex % this.spawnPoints.cops.length];
                criminalIndex++;
            }

            player.spawn(spawnPoint.x * MP_TILE_SIZE + MP_TILE_SIZE / 2,
                spawnPoint.y * MP_TILE_SIZE + MP_TILE_SIZE / 2);
        });
    }

    spawnCivilians() {
        this.civilians = [];

        const civCount = CVC_CONSTANTS.MIN_CIVILIANS_PER_ROUND +
            Math.floor(Math.random() * (CVC_CONSTANTS.MAX_CIVILIANS_PER_ROUND - CVC_CONSTANTS.MIN_CIVILIANS_PER_ROUND + 1));

        for (let i = 0; i < civCount; i++) {
            const spawnPoint = this.spawnPoints.civilians[i % this.spawnPoints.civilians.length];
            const civilian = new NetworkedCivilian(
                `civ_${this.currentRound}_${i}`,
                spawnPoint.x * MP_TILE_SIZE + MP_TILE_SIZE / 2,
                spawnPoint.y * MP_TILE_SIZE + MP_TILE_SIZE / 2
            );
            this.civilians.push(civilian);
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

        this.civilians.forEach(civ => {
            if (!civ.dead) {
                civ.update(this.players, this.mapData?.grid);
            }
        });

        this.checkRoundEndConditions();

        this.roundTimeRemaining = Math.max(0,
            CVC_CONSTANTS.ROUND_TIME_LIMIT_MS - (Date.now() - this.roundStartTime));
    }

    checkRoundEndConditions() {
        let copsAlive = this.playersAlivePerTeam().copsAlive;
        let criminalsAlive = this.playersAlivePerTeam().criminalsAlive;

        if (copsAlive === 0) {
            this.endRound("criminals_eliminated_cops");
        } else if (criminalsAlive === 0) {
            this.endRound("cops_eliminated_criminals");
        }
    }

    endRoundByTimer() {
        let copsAlive = this.playersAlivePerTeam().copsAlive;
        let criminalsAlive = this.playersAlivePerTeam().criminalsAlive;

        if (copsAlive >= criminalsAlive) {
            this.endRound("timer_cops_win");
        } else {
            this.endRound("timer_criminals_win");
        }
    }

    playersAlivePerTeam() {
        let copsAlive = 0;
        let criminalsAlive = 0;

        this.players.forEach(player => {
            if (!this.deadPlayers.has(player.id)) {
                if (player.team === CVC_CONSTANTS.TEAM_COPS) {
                    copsAlive++;
                } else {
                    criminalsAlive++;
                }
            }
        });

        return { copsAlive: copsAlive, criminalsAlive: criminalsAlive }
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

        if (this.currentRound == CVC_CONSTANTS.ROLE_SWITCH_ROUND) {
            this.state = CVC_CONSTANTS.STATE.ROLE_SWITCH;
            this.switchTeamRoles();
        }

        if (this.currentRound >= CVC_CONSTANTS.TOTAL_ROUNDS) {
            this.endMatch();
            return { roundSummary, matchEnded: true };
        }

        this.currentRound++;

        setTimeout(() => {
            this.startLoadoutSelection();
        }, CVC_CONSTANTS.ROUND_TRANSITION_DELAY_MS);

        return { roundSummary, matchEnded: false };
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
    }

    endMatch() {
        this.state = CVC_CONSTANTS.STATE.MATCH_END;
        this.stopGameLoop();

        return this.scoring.getMatchResults();
    }

    processInput(playerId, input) {
        const player = this.players.get(playerId);
        if (!player || this.deadPlayers.has(playerId)) return;

        player.processInput(input);
    }

    processShoot(playerId, angle) {
        const player = this.players.get(playerId);
        if (!player || this.deadPlayers.has(playerId)) return { success: false };

        const result = player.shoot(angle);
        if (!result.success) return result;

        this.checkBulletHits(result.bullets, playerId, player.team);

        return result;
    }

    checkBulletHits(bullets, shooterId, shooterTeam) {
        bullets.forEach(bullet => {
            this.players.forEach((target, targetId) => {
                if (targetId === shooterId) return;
                if (this.deadPlayers.has(targetId)) return;

                const dist = Math.hypot(target.x - bullet.x, target.y - bullet.y);
                if (dist < target.size / 2) {
                    this.handlePlayerHit(shooterId, targetId, bullet.damage);
                    bullet.hit = true;
                }
            });

            this.civilians.forEach(civilian => {
                if (civilian.dead) return;

                const dist = Math.hypot(civilian.x - bullet.x, civilian.y - bullet.y);
                if (dist < civilian.size / 2) {
                    this.handleCivilianHit(shooterId, civilian, bullet.damage);
                    bullet.hit = true;
                }
            });
        });
    }

    handlePlayerHit(attackerId, victimId, damage) {
        const victim = this.players.get(victimId);
        const attacker = this.players.get(attackerId);

        if (!victim || !attacker) return;

        victim.takeDamage(damage);

        if (victim.health <= 0) {
            this.deadPlayers.add(victimId);

            const scoreResult = this.scoring.recordPlayerKill(
                attackerId,
                victimId,
                attacker.team,
                victim.team
            );

            return {
                killed: true,
                scoreResult
            };
        }

        return { killed: false }
    }

    handleCivilianHit(attackerId, civilian, damage) {
        const attacker = this.players.get(attackerId);
        if (!attacker) return;

        civilian.takeDamage(damage);

        if (civilian.health <= 0 && !civilian.dead) {
            civilian.dead = true;

            const scoreResult = this.scoring.recordCivilianKilled(
                attackerId,
                civilian.id,
                civilian.rescued,
                attacker.team
            );

            return { killed: true, scoreResult };
        }

        return { killed: false };
    }

    processRescue(playerId) {
        const player = this.players.get(playerId);
        if (!player || player.team !== CVC_CONSTANTS.TEAM_COPS) {
            return { success: false, error: "Only cops can rescue civilians" };
        }

        let rescued = null;
        for (const civilian of this.civilians) {
            if (!civilian.rescued && !civilian.dead) {
                const dist = Math.hypot(civilian.x - player - x, civilian.y - player.y);
                if (dist < 40) {
                    civilian.rescued = true;
                    rescued = civilian;
                    break;
                }
            }
        }

        if (!rescued) {
            return { success: false, error: "no civilian nearby" };
        }

        const scoreResult = this.scoring.recordCivilianRescued(playerId, rescued.id);

        return { success: true, civilianId: rescued.id, scoreResult };
    }

    getGameState() {
        const players = [];
        this.players.forEach(player => {
            players.push(player.serialize());
        });

        const civilians = this.civilians.map(civ => civ.serialize());

        return {
            matchId: this.matchId,
            state: this.state,
            currentRound: this.currentRound,
            roundTimeRemaining: this.roundTimeRemaining,
            teams: {
                cops: Array.from(this.teams.cops),
                criminals: Array.from(this.teams.criminals)
            },
            players,
            civilians,
            scores: this.scoring.getScores(),
            deadPlayers: Array.from(this.deadPlayers)
        };
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

class NetworkedPlayer {
    constructor(id, name, team) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.size = 16;
        this.speed = 1.5;
        this.sprintSpeed = 2.5;
        this.crouchSpeed = 0.8;
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 100;
        this.maxArmor = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.stance = "standing";
        this.isSprinting = false;
        this.alive = true;
        this.loadout = null;
        this.loadoutConfirmed = false;
        this.currentWeapon = "primary";
        this.weapons = {};
        this.equipment = null;
        this.canFire = true;
        this.reloading = false;
        this.lastInput = null;
        this.lastUpdateTime = Date.now();
    }

    spawn(x, y) {
        this.x = x;
        this.y = y;
        this.health = this.maxHealth;
        this.armor = this.maxHealth;
        this.stamina = this.maxStamina;
        this.alive = true;
        this.canFire = true;
        this.reloading = false;
    }

    setLoadout(loadout, role) {
        this.loadout = loadout;

        const primaryStats = getLoadoutItem(role, "primary", loadout.primary);
        const secondaryStats = getLoadoutItem(role, "secondary", loadout.secondary);
        const equipmentStats = getLoadoutItem(role, "equipment", loadout.equipment);

        this.weapons = {
            primary: {
                ...primaryStats,
                currentAmmo: primaryStats.magSize,
                reserveAmmo: primaryStats.totalAmmo
            },
            secondary: {
                ...secondaryStats,
                currentAmmo: secondaryStats.magSize,
                reserveAmmo: secondaryStats.totalAmmo
            }
        };

        this.equipment = { ...equipmentStats };
    }

    processInput(input) {
        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 16;
        this.lastUpdateTime = now;

        if (!this.alive) return;

        let speed = this.speed;

        if (input.sprinting && this.stamina > 0 && this.stance === 'standing') {
            speed = this.sprintSpeed;
            this.stamina = Math.max(0, this.stamina - 0.8 * dt);
            this.isSprinting = true;
        } else {
            this.isSprinting = false;
            if (this.stamina < this.maxStamina) {
                this.stamina = Math.min(this.maxStamina, this.stamina + 0.2 * dt);
            }
        }

        if (input.crouching) {
            speed = this.crouchSpeed;
            this.stance = "crouched";
        } else {
            this.stance = "standing";
        }

        if (input.dx !== 0 || input.dy !== 0) {
            const magnitude = Math.hypot(input.dy, input.dy);
            this.x += (input.dx / magnitude) * speed * dt;
            this.y += (input.dy / magnitude) * speed * dt;
        }

        if (input.angle !== undefined) {
            this.angle = input.angle;
        }

        this.lastInput = input;
    }

    shoot(angle) {
        if (!this.canFire || this.reloading || !this.alive) {
            return { success: false };
        }

        const weapon = this.weapons[this.currentWeapon];
        if (!weapon || weapon.currentAmmo <= 0) {
            return { success: false, reason: "no_ammo" };
        }

        weapon.currentAmmo--;
        this.canFire = false;

        setTimeout(() => {
            this.canFire = true;
        }, weapon.fireRate);

        const bullets = [];
        const pellets = weapon.pellets || 1;

        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * weapon.spread;
            bullets.push({
                x: this.x,
                y: this.y,
                angle: angle + spread,
                damage: weapon.damage,
                owner: this.id
            });
        }

        return {
            success: true,
            bullets,
            weaponType: this.currentWeapon
        };
    }

    reload() {
        if (this.reloading) return false;

        const weapon = this.weapons[this.currentWeapon];
        if (!weapon || weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo === 0) {
            return false;
        }

        this.reloading = true;

        setTimeout(() => {
            const ammoNeeded = weapon.magSize - weapon.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);
            weapon.currentAmmo += ammoToReload;
            weapon.reserveAmmo -= ammoToReload;
            this.reloading = false;
        }, MP_RELOAD_TIME_MS); //implement reload time per Weapon TODO

        return true;
    }

    takeDamage(damage) {
        if (!this.alive) return;

        if (this.armor > 0) {
            const armorAbsorb = Math.min(this.armor, damage * MP_ARMOR_ABSORPTION_RATE);
            this.armor -= armorAbsorb;
            damage -= armorAbsorb;
        }

        this.health -= damage;

        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            x: this.x,
            y: this.y,
            angle: this.angle,
            health: this.health,
            maxHealth: this.maxHealth,
            armor: this.armor,
            stamina: this.stamina,
            stance: this.stance,
            alive: this.alive,
            currentWeapon: this.currentWeapon,
            weapons: {
                primary: this.weapons.primary ? {
                    name: this.weapons.primary.name,
                    currentAmmo: this.weapons.primary.currentAmmo,
                    reserveAmmo: this.weapons.primary.reserveAmmo
                } : null,
                secondary: this.weapons.secondary ? {
                    name: this.weapons.secondary.name,
                    currentAmmo: this.weapons.secondary.currentAmmo,
                    reserveAmmo: this.weapons.secondary.reserveAmmo
                } : null
            },
            equipment: this.equipment ? {
                name: this.equipment.name,
                quantity: this.equipment.quantity
            } : null
        };
    }
}

class NetworkedCivilian {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.size = 14;
        this.health = 50;
        this.maxHealth = 50;
        this.rescued = false;
        this.dead = false;
        this.scared = false;
        this.aiState = "wander";
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderChangeTime = Date.now();
        this.fleeTarget = null;
    }

    update(players, grid) {
        if (this.dead || this.rescued) return;

        let nearestDanger = null;
        let nearestDangerDist = CVC_CONSTANTS.CIVILIAN_DANGER_RADIUS;

        players.forEach(player => {
            if (!player.alive) return;

            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < nearestDangerDist) {
                nearestDangerDist = dist;
                nearestDanger = player;
            }
        });

        if (nearestDanger) {
            this.aiState = "flee";
            this.scared = true;
            this.fleeTarget = nearestDanger;

            const fleeAngle = Math.atan2(this.y - nearestDanger.y, this.x - nearestDanger.x);
            this.x += Math.cos(fleeAngle) * CVC_CONSTANTS.CIVILIAN_FLEE_SPEED;
            this.y += Math.sin(fleeAngle) * CVC_CONSTANTS.CIVILIAN_FLEE_SPEED;
        } else {
            this.aiState = "wander";
            this.scared = false;

            if (Date.now() - this.wanderChangeTime > CVC_CONSTANTS.CIVILIAN_WANDER_CHANGE_INTERVAL) {
                this.wanderAngle = Math.random() * Math.PI * 2;
                this.wanderChangeTime = Date.now();
            }

            this.x += Math.cos(this.wanderAngle) * CVC_CONSTANTS.CIVILIAN_WANDER_SPEED;
            this.y += Math.sin(this.wanderAngle) * CVC_CONSTANTS.CIVILIAN_WANDER_SPEED;
        }

        const padding = CVC_CONSTANTS.CIVILIAN_SPAWN_PADDING;
        const maxX = (grid?.[0]?.length || MP_GRID_WIDTH) * MP_TILE_SIZE - padding;
        const maxY = (grid?.length || MP_GRID_HEIGHT) * MP_TILE_SIZE - padding;

        this.x = Math.max(padding, Math.min(maxX, this.x));
        this.y = Math.max(padding, Math.min(maxY, this.y));
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            health: this.health,
            rescued: this.rescued,
            dead: this.dead,
            scared: this.scared,
            aiState: this.aiState
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { CVCGameMode, NetworkedPlayer, NetworkedCivilian };
}