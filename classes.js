// Game entities. All timing uses gameState.now, the game clock that only runs while playing.

// ── Shared world helpers ──

function tileAt(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GRID_WIDTH || gy >= GRID_HEIGHT) return 1;
    return gameState.grid[gy][gx];
}

function isSolidTile(gx, gy) {
    const t = tileAt(gx, gy);
    return t === 1 || t === 3;
}

function doorAtTile(gx, gy) {
    for (const d of gameState.doors) {
        if (d.gx === gx && d.gy === gy) return d;
    }
    return null;
}

/** True when a body of the given size centred on (x, y) overlaps a wall, cover or closed door. */
function blockedForBody(x, y, size) {
    const half = size / 2;
    const gx0 = Math.floor((x - half) / TILE_SIZE), gx1 = Math.floor((x + half - 0.01) / TILE_SIZE);
    const gy0 = Math.floor((y - half) / TILE_SIZE), gy1 = Math.floor((y + half - 0.01) / TILE_SIZE);
    for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
            if (isSolidTile(gx, gy)) return true;
            const door = doorAtTile(gx, gy);
            if (door && !door.open) return true;
        }
    }
    return false;
}

/** Walls, closed doors and smoke block sight. */
function lineOfSight(x1, y1, x2, y2, opts = {}) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / 6));
    const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
    let lastGx = -1, lastGy = -1;
    for (let i = 1; i < steps; i++) {
        const gx = Math.floor((x1 + dx * i) / TILE_SIZE), gy = Math.floor((y1 + dy * i) / TILE_SIZE);
        if (gx === lastGx && gy === lastGy) continue;
        lastGx = gx; lastGy = gy;
        if (tileAt(gx, gy) === 1) return false;
        if (opts.doors !== false) {
            const door = doorAtTile(gx, gy);
            if (door && !door.open) return false;
        }
    }
    if (opts.smoke !== false) {
        for (const s of gameState.smokes) {
            if (s.blocks(x1, y1, x2, y2)) return false;
        }
    }
    return true;
}

function angleDelta(a, b) {
    return Math.abs(((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
}

// ── Player ──

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
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
        this.angle = 0;
        this.stance = "standing"; //standing, crouched
        this.lean = "none"; //none, left, right
        this.currentWeapon = "primary"; //primary, secondary
        this.weapons = {
            primary: this.createWeapon(gameState.loadout.primary),
            secondary: this.createWeapon(gameState.loadout.secondary)
        };
        this.equipment = { ...EQUIPMENT[gameState.loadout.equipment] };
        // Permanent Field Shop upgrades.
        const bonusHealth = (gameState.unlocks.bonusHealth || 0) * 10;
        this.maxHealth += bonusHealth;
        this.health += bonusHealth;
        this.equipment.quantity += gameState.unlocks.bonusEquipment || 0;

        // Timing (game clock)
        this.nextShotAt = 0;
        this.reloading = false;
        this.reloadStart = 0;
        this.reloadEnd = 0;
        this.swapping = false;
        this.swapEnd = 0;
        this.pendingWeapon = null;
        this.bloom = 0;
        this.sprinting = false;
        this.sprintBlockedUntil = 0;
        this.dryAt = -1e9;

        // Feedback
        this.hitAt = -1e9;
        this.lastHitFrom = null;
        this.damageMultiplier = 1;
        this.damageTakenMultiplier = 1;
        this.stats = { shots: 0, hits: 0, kills: 0, rescued: 0 };
        this.hostagesRescued = 0;
    }

    createWeapon(type) {
        const weapon = { ...WEAPONS[type] };
        weapon.type = type;
        weapon.currentAmmo = weapon.magSize;
        weapon.reserveAmmo = weapon.totalAmmo;
        return weapon;
    }

    get weapon() {
        return this.weapons[this.currentWeapon];
    }

    /** Current spread in radians, including stance and bloom. */
    spread() {
        let s = this.weapon.spread;
        if (this.sprinting) s *= SPREAD_SPRINT;
        if (this.stance === "crouched") s *= SPREAD_CROUCH;
        if (this.lean !== "none") s *= SPREAD_LEAN;
        return s + this.bloom;
    }

    /** Runs every frame while playing. */
    update(dt) {
        const now = gameState.now;
        if (!this.sprinting && this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN_PER_S * dt / 1000);
        }
        if (this.bloom > 0) {
            this.bloom = Math.max(0, this.bloom - BLOOM_MAX * dt / BLOOM_RECOVER_MS);
        }
        if (this.reloading && now >= this.reloadEnd) {
            const weapon = this.weapon;
            const needed = weapon.magSize - weapon.currentAmmo;
            const take = Math.min(needed, weapon.reserveAmmo);
            weapon.currentAmmo += take;
            weapon.reserveAmmo -= take;
            this.reloading = false;
            updateUI();
        }
        if (this.swapping && now >= this.swapEnd) {
            this.swapping = false;
            this.currentWeapon = this.pendingWeapon;
            this.pendingWeapon = null;
            updateUI();
        }
        this.sprinting = false;
    }

    move(dx, dy) {
        const now = gameState.now;
        let speed = this.speed;
        const isMoving = dx !== 0 || dy !== 0;
        const wantsSprint = keys['Shift'] && this.stamina > 0 && this.stance === "standing" && isMoving && now >= this.sprintBlockedUntil;

        if (wantsSprint) {
            speed = this.sprintSpeed;
            this.sprinting = true;
            this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_PER_S * (gameState.dt || 16) / 1000);
        } else if (this.stance === "crouched") {
            speed = this.crouchSpeed;
        }

        const newX = this.x + dx * speed;
        const newY = this.y + dy * speed;

        if (!blockedForBody(newX, this.y, this.size)) this.x = newX;
        if (!blockedForBody(this.x, newY, this.size)) this.y = newY;

        this.x = Math.max(this.size, Math.min(GRID_WIDTH * TILE_SIZE - this.size, this.x));
        this.y = Math.max(this.size, Math.min(GRID_HEIGHT * TILE_SIZE - this.size, this.y));
    }

    /** Called on every trigger pull (click) and every frame while holding with an automatic weapon. */
    shoot(fromClick = false) {
        const now = gameState.now;
        if (this.reloading || this.swapping) return;
        if (now < this.nextShotAt) return;

        const weapon = this.weapon;
        if (weapon.currentAmmo <= 0) {
            if (fromClick && now - this.dryAt > 350) {
                this.dryAt = now;
                AudioSystem.playDryFire();
                this.reload();
            }
            return;
        }

        weapon.currentAmmo--;
        this.nextShotAt = now + weapon.fireRate;
        this.sprintBlockedUntil = now + SPRINT_BLOCK_AFTER_SHOT_MS;
        this.stats.shots++;

        AudioSystem.playGunshot(weapon.type);

        const spread = this.spread();
        const pellets = weapon.pellets || 1;
        const damage = Math.round(weapon.damage * this.damageMultiplier);
        for (let i = 0; i < pellets; i++) {
            const bulletAngle = this.angle + (Math.random() - 0.5) * spread;
            gameState.bullets.push(new Bullet(this.x, this.y, bulletAngle, damage, "player"));
        }
        this.bloom = Math.min(BLOOM_MAX, this.bloom + BLOOM_PER_SHOT * (weapon.kind === 'shotgun' ? 2 : 1));
        if (weapon.kind === 'shotgun' || weapon.kind === 'sniper') HUD.shake(2.5, 120);

        for (let i = 0; i < 3; i++) {
            gameState.particles.push(new Particle(
                this.x + Math.cos(this.angle) * 20,
                this.y + Math.sin(this.angle) * 20,
                "rgba(255, 255, 0, 0.35)", 200
            ));
        }

        // Noise: enemies in range start investigating.
        const noiseLevel = weapon.noiseLevel || DEFAULT_NOISE_LEVEL;
        gameState.enemies.forEach(enemy => {
            if (Math.hypot(enemy.x - this.x, enemy.y - this.y) <= noiseLevel) enemy.hear(this.x, this.y);
        });

        updateUI();
    }

    reload() {
        if (this.reloading || this.swapping) return;
        const weapon = this.weapon;
        if (weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo === 0) return;

        this.reloading = true;
        this.reloadStart = gameState.now;
        this.reloadEnd = gameState.now + (weapon.reloadTime || RELOAD_TIME_MS);
        AudioSystem.playReload();
        updateUI();
    }

    switchWeapon(slot) {
        if (slot === this.currentWeapon || this.swapping) return;
        if (!this.weapons[slot]) return;
        this.reloading = false;
        this.swapping = true;
        this.pendingWeapon = slot;
        this.swapEnd = gameState.now + (this.weapons[slot].swapTime || 400);
        AudioSystem.playSwap();
    }

    takeDamage(damage, from = null) {
        damage *= this.damageTakenMultiplier;
        if (this.armor > 0) {
            const armorAbsorb = Math.min(this.armor, damage * ARMOR_ABSORPTION_RATE);
            this.armor -= armorAbsorb;
            damage -= armorAbsorb;
        }
        this.health -= damage;
        this.hitAt = gameState.now;
        this.lastHitFrom = from;
        AudioSystem.playHit(true);
        HUD.damage(from);
        HUD.shake(3, 150);

        if (this.health <= 0) {
            this.health = 0;
            gameOver();
        }
        updateUI();
    }

    useEquipment() {
        if (this.equipment.quantity <= 0) {
            HUD.notice('No ' + this.equipment.name.toLowerCase() + ' left');
            return;
        }

        switch (this.equipment.effect) {
            case "stun":
            case "smoke":
            case "grenade":
                this.equipment.quantity--;
                AudioSystem.playBeep(300, 0.05, 'square');
                gameState.grenades.push(new Grenade(this.x, this.y, this.angle, "player", this.equipment.effect));
                break;
            case "doormine": {
                const door = this.nearestDoor(60);
                if (door && door.locked) {
                    this.equipment.quantity--;
                    door.unlock();
                    door.open = true;
                    AudioSystem.playBreach();
                    Art.explosion(door.x, door.y, 30);
                    HUD.shake(4, 200);
                    for (let i = 0; i < 15; i++) {
                        gameState.particles.push(new Particle(
                            door.x + (Math.random() - 0.5) * 30,
                            door.y + (Math.random() - 0.5) * 30,
                            "#f80", 300
                        ));
                    }
                } else {
                    HUD.notice('Stand next to a locked door');
                }
                break;
            }
            case "breach": {
                const checkX = Math.floor((this.x + Math.cos(this.angle) * 30) / TILE_SIZE);
                const checkY = Math.floor((this.y + Math.sin(this.angle) * 30) / TILE_SIZE);
                const t = tileAt(checkX, checkY);
                const onBorder = checkX <= 0 || checkY <= 0 || checkX >= GRID_WIDTH - 1 || checkY >= GRID_HEIGHT - 1;
                if ((t === 1 || t === 3) && !onBorder) {
                    this.equipment.quantity--;
                    gameState.grid[checkY][checkX] = 0;
                    AudioSystem.playBreach();
                    Art.explosion(checkX * TILE_SIZE + TILE_SIZE / 2, checkY * TILE_SIZE + TILE_SIZE / 2, 40);
                    HUD.shake(6, 250);
                    gameState.enemies.forEach(e => e.hear(this.x, this.y));
                } else {
                    HUD.notice('Face a wall to breach it');
                }
                break;
            }
            case "heal":
                if (this.health >= this.maxHealth) {
                    HUD.notice('Health is full');
                    break;
                }
                this.equipment.quantity--;
                AudioSystem.playPickup();
                this.health = Math.min(this.maxHealth, this.health + 50);
                HUD.notice('+50 health');
                break;
        }
        updateUI();
    }

    nearestDoor(range) {
        let best = null, bestDist = range;
        gameState.doors.forEach(door => {
            const dist = Math.hypot(door.x - this.x, door.y - this.y);
            if (dist < bestDist) { bestDist = dist; best = door; }
        });
        return best;
    }

    /** What E would do right now. Used by the HUD prompt and by interact(). */
    interactTarget() {
        let best = null, bestDist = 40;
        gameState.civilians.forEach(c => {
            if (c.rescued || c.dead) return;
            const dist = Math.hypot(c.x - this.x, c.y - this.y);
            if (dist < bestDist) { bestDist = dist; best = { kind: 'hostage', obj: c, label: 'RESCUE' }; }
        });
        const door = this.nearestDoor(bestDist);
        if (door) {
            best = { kind: door.locked ? 'lockpick' : 'door', obj: door, label: door.locked ? 'LOCKPICK' : (door.open ? 'CLOSE' : 'OPEN') };
        }
        return best;
    }

    interact() {
        const target = this.interactTarget();
        if (!target) return;
        if (target.kind === 'hostage') {
            target.obj.rescued = true;
            target.obj.scared = false;
            this.hostagesRescued++;
            this.stats.rescued++;
            AudioSystem.playRescue();
            const total = gameState.civilians.length;
            HUD.banner('HOSTAGE RESCUED', `${gameState.civilians.filter(c => c.rescued).length} / ${total}`);
            checkObjectives();
        } else if (target.kind === 'lockpick') {
            gameState.screen = "lockpick";
            gameState.lockpickTarget = target.obj;
            gameState.playing = false;
            document.getElementById('lockpick-screen').classList.add('active');
        } else {
            target.obj.toggle();
            AudioSystem.playDoor(target.obj.open);
        }
    }

    draw(ctx) {
        Art.soldier(ctx, this, 'player');
        if (this.reloading) {
            const p = (gameState.now - this.reloadStart) / Math.max(1, this.reloadEnd - this.reloadStart);
            Art.ring(ctx, this.x, this.y, 15, p, '#ffc857');
        } else if (this.swapping) {
            Art.ring(ctx, this.x, this.y, 15, 1 - (this.swapEnd - gameState.now) / Math.max(1, this.weapons[this.pendingWeapon].swapTime || 400), '#55e6ff');
        }
    }
}

// ── Enemy ──

class Enemy {
    constructor(x, y, type = "normal") {
        this.x = x;
        this.y = y;
        this.size = 16;
        this.type = type;
        this.speed = type === "heavy" ? 1.2 : 1.0;
        this.health = type === "heavy" ? 150 : 100;
        this.maxHealth = this.health;
        this.angle = Math.random() * Math.PI * 2;
        this.state = "patrol"; //patrol, suspect, engage
        this.patrolPoints = [];
        this.currentPatrolPoint = 0;
        this.detectionRange = 180;
        this.fireRange = 220;
        this.optimalRange = type === "heavy" ? 100 : 150;

        // Timing
        this.spottedAt = 0;
        this.lastSeen = null;
        this.lastSeenAt = 0;
        this.suspectTarget = null;
        this.suspectUntil = 0;
        this.nextShotAt = 0;
        this.burstLeft = ENEMY_BURST_MIN;
        this.burstPauseUntil = 0;
        this.reloading = false;
        this.reloadEnd = 0;
        this.stunnedUntil = 0;
        this.stunStopUntil = 0;
        this.wanderUntil = 0;
        this.path = [];
        this.pathAt = -1e9;
        this.pathTarget = null;
        this.seenAt = -1e9; // last time the player had this enemy in view
        this.hitAt = -1e9;

        const primaryWeapons = type === "heavy" ? ["m4a1", "shotgun"] : ["mp5", "m4a1", "glock"];
        const secondaryWeapons = ["m1911", "glock"];
        this.weapons = {
            primary: this.createWeapon(primaryWeapons[Math.floor(Math.random() * primaryWeapons.length)]),
            secondary: this.createWeapon(secondaryWeapons[Math.floor(Math.random() * secondaryWeapons.length)])
        };
        this.currentWeapon = "primary";
        this.damageMultiplier = ENEMY_DAMAGE_SCALE[type] || 1;
    }

    get stunned() {
        return gameState.now < this.stunnedUntil;
    }

    createWeapon(type) {
        const weapon = { ...WEAPONS[type] };
        weapon.type = type;
        weapon.currentAmmo = weapon.magSize;
        weapon.reserveAmmo = weapon.totalAmmo;
        return weapon;
    }

    update() {
        const now = gameState.now;
        const player = gameState.player;

        if (this.reloading && now >= this.reloadEnd) {
            const weapon = this.weapons[this.currentWeapon];
            const take = Math.min(weapon.magSize - weapon.currentAmmo, weapon.reserveAmmo);
            weapon.currentAmmo += take;
            weapon.reserveAmmo -= take;
            this.reloading = false;
        }

        if (this.stunned) {
            if (now < this.stunStopUntil) return;
            // Run around blindly.
            if (now > this.wanderUntil) {
                this.angle = Math.random() * Math.PI * 2;
                this.wanderUntil = now + 200 + Math.random() * 400;
            }
            this.tryMove(Math.cos(this.angle) * this.speed * 1.5, Math.sin(this.angle) * this.speed * 1.5);
            return;
        }

        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        const inViewCone = angleDelta(angleToPlayer, this.angle) < ENEMY_VIEW_ANGLE / 2;
        const canSeePlayer = distToPlayer < ENEMY_VIEW_DISTANCE && (inViewCone || distToPlayer < 40)
            && lineOfSight(this.x, this.y, player.x, player.y);

        if (canSeePlayer) {
            if (this.state !== "engage") {
                this.state = "engage";
                this.spottedAt = now;
                AudioSystem.playAlert();
            }
            this.lastSeen = { x: player.x, y: player.y };
            this.lastSeenAt = now;
            this.engage(player, distToPlayer, true);
        } else if (this.state === "engage") {
            // Chase the last known position.
            if (this.lastSeen && now - this.lastSeenAt < ENEMY_MEMORY_MS) {
                const reached = this.moveTo(this.lastSeen, 1, true);
                if (reached) { this.lastSeen = null; this.state = "patrol"; }
            } else {
                this.lastSeen = null;
                this.state = "patrol";
            }
        } else if (this.state === "suspect") {
            if (now > this.suspectUntil || !this.suspectTarget) {
                this.state = "patrol";
            } else {
                const reached = this.moveTo(this.suspectTarget, 0.7, true);
                if (reached) {
                    // Look around for a moment, then go back to patrolling.
                    if (now > this.wanderUntil) { this.angle += 0.9; this.wanderUntil = now + 500; }
                    this.suspectUntil = Math.min(this.suspectUntil, now + 1200);
                }
            }
        } else {
            this.patrol();
        }
    }

    /** A gunshot or explosion nearby. */
    hear(x, y) {
        if (this.state === "engage" || this.stunned) return;
        this.state = "suspect";
        this.suspectTarget = { x, y };
        this.suspectUntil = gameState.now + ENEMY_SUSPECT_MS;
        this.angle = Math.atan2(y - this.y, x - this.x);
    }

    engage(player, distToPlayer, canSee) {
        const now = gameState.now;
        if (distToPlayer > this.optimalRange + 30) {
            this.moveTo({ x: player.x, y: player.y }, 1, false);
        } else if (distToPlayer < this.optimalRange - 30) {
            const a = Math.atan2(player.y - this.y, player.x - this.x);
            this.tryMove(-Math.cos(a) * this.speed, -Math.sin(a) * this.speed);
        }
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);

        if (canSee && now >= this.spottedAt + ENEMY_REACTION_MS && distToPlayer < this.fireRange) {
            this.shoot();
        }
    }

    patrol() {
        const now = gameState.now;
        if (this.patrolPoints.length === 0) {
            if (now > this.wanderUntil) {
                this.angle = Math.random() * Math.PI * 2;
                this.wanderUntil = now + 1500 + Math.random() * 2500;
            }
            const dx = Math.cos(this.angle) * this.speed * 0.5;
            const dy = Math.sin(this.angle) * this.speed * 0.5;
            if (blockedForBody(this.x + dx, this.y + dy, this.size)) {
                this.angle = Math.random() * Math.PI * 2;
            } else {
                this.x += dx;
                this.y += dy;
            }
        } else {
            const currentPoint = this.patrolPoints[this.currentPatrolPoint];
            const target = { x: currentPoint.x * TILE_SIZE + TILE_SIZE / 2, y: currentPoint.y * TILE_SIZE + TILE_SIZE / 2 };
            if (this.moveTo(target, 1, true)) {
                this.currentPatrolPoint = (this.currentPatrolPoint + 1) % this.patrolPoints.length;
            }
        }
    }

    /** Walks along a path toward target. Returns true once it is there. */
    moveTo(target, speedScale = 1, face = true) {
        const now = gameState.now;
        if (Math.hypot(target.x - this.x, target.y - this.y) < 12) return true;

        const stale = !this.pathTarget || Math.hypot(this.pathTarget.x - target.x, this.pathTarget.y - target.y) > 30;
        if (stale || now - this.pathAt > ENEMY_PATH_INTERVAL_MS || this.path.length === 0) {
            this.path = this.findPath(target.x, target.y);
            this.pathAt = now;
            this.pathTarget = { x: target.x, y: target.y };
        }
        while (this.path.length > 1 && Math.hypot(this.path[0].x - this.x, this.path[0].y - this.y) < 6) {
            this.path.shift();
        }
        const wp = this.path[0] || target;
        const a = Math.atan2(wp.y - this.y, wp.x - this.x);
        if (face) this.angle = a;
        this.tryMove(Math.cos(a) * this.speed * speedScale, Math.sin(a) * this.speed * speedScale);
        return false;
    }

    /** Moves axis by axis and opens unlocked doors in the way. */
    tryMove(dx, dy) {
        const nx = this.x + dx, ny = this.y + dy;
        const half = this.size / 2;
        for (const door of gameState.doors) {
            if (door.open || door.locked) continue;
            if (Math.abs(door.x - nx) < half + TILE_SIZE / 2 + 2 && Math.abs(door.y - ny) < half + TILE_SIZE / 2 + 2) {
                door.open = true;
                AudioSystem.playDoor(true);
            }
        }
        if (!blockedForBody(nx, this.y, this.size)) this.x = nx;
        if (!blockedForBody(this.x, ny, this.size)) this.y = ny;
    }

    findPath(targetX, targetY) {
        const startGridX = Math.floor(this.x / TILE_SIZE);
        const startGridY = Math.floor(this.y / TILE_SIZE);
        const targetGridX = Math.floor(targetX / TILE_SIZE);
        const targetGridY = Math.floor(targetY / TILE_SIZE);

        const passable = (x, y) => {
            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
            if (isSolidTile(x, y)) return false;
            const door = doorAtTile(x, y);
            return !(door && door.locked && !door.open);
        };

        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${startGridX},${startGridY}`;
        const targetKey = `${targetGridX},${targetGridY}`;

        openSet.push({ x: startGridX, y: startGridY, key: startKey });
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startGridX, startGridY, targetGridX, targetGridY));

        let expanded = 0;
        while (openSet.length > 0 && expanded < 1500) {
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(openSet[i].key) < fScore.get(current.key)) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            if (current.key === targetKey) {
                return this.reconstructPath(cameFrom, current, targetX, targetY);
            }

            openSet.splice(currentIndex, 1);
            closedSet.add(current.key);
            expanded++;

            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(neighborKey)) continue;
                if (!passable(neighbor.x, neighbor.y)) continue;

                const tentativeGScore = gScore.get(current.key) + 1;
                if (!openSet.find(n => n.key === neighborKey)) {
                    openSet.push({ x: neighbor.x, y: neighbor.y, key: neighborKey });
                } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }

                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor.x, neighbor.y, targetGridX, targetGridY));
            }
        }

        // No path found: walk straight and hope.
        return [{ x: targetX, y: targetY }];
    }

    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    reconstructPath(cameFrom, current, targetX, targetY) {
        const path = [];
        let currentKey = current.key;
        let node = current;
        while (cameFrom.has(currentKey)) {
            path.unshift({ x: node.x * TILE_SIZE + TILE_SIZE / 2, y: node.y * TILE_SIZE + TILE_SIZE / 2 });
            node = cameFrom.get(currentKey);
            currentKey = node.key;
        }
        path.push({ x: targetX, y: targetY });
        return path;
    }

    shoot() {
        const now = gameState.now;
        if (this.reloading || now < this.nextShotAt || now < this.burstPauseUntil) return;

        const weapon = this.weapons[this.currentWeapon];
        if (weapon.currentAmmo <= 0) {
            if (weapon.reserveAmmo <= 0 && this.currentWeapon === "primary") {
                this.currentWeapon = "secondary";
                return;
            } else if (weapon.reserveAmmo <= 0) {
                return;
            }
            this.reload();
            return;
        }

        weapon.currentAmmo--;
        this.nextShotAt = now + weapon.fireRate * ENEMY_FIRE_RATE_SCALE;
        if (--this.burstLeft <= 0) {
            this.burstLeft = ENEMY_BURST_MIN + Math.floor(Math.random() * (ENEMY_BURST_MAX - ENEMY_BURST_MIN + 1));
            this.burstPauseUntil = now + ENEMY_BURST_PAUSE_MS[0] + Math.random() * (ENEMY_BURST_PAUSE_MS[1] - ENEMY_BURST_PAUSE_MS[0]);
        }

        const damage = Math.max(1, Math.floor(weapon.damage * this.damageMultiplier));
        const pellets = weapon.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const bulletAngle = this.angle + (Math.random() - 0.5) * weapon.spread * ENEMY_SPREAD_SCALE;
            gameState.bullets.push(new Bullet(this.x, this.y, bulletAngle, damage, "enemy"));
        }

        AudioSystem.playGunshot(weapon.type);
        for (let i = 0; i < 3; i++) {
            gameState.particles.push(new Particle(
                this.x + Math.cos(this.angle) * 20,
                this.y + Math.sin(this.angle) * 20,
                'rgba(255, 255, 0, 0.35)', 200
            ));
        }
    }

    reload() {
        if (this.reloading) return;
        const weapon = this.weapons[this.currentWeapon];
        if (weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo === 0) return;
        this.reloading = true;
        this.reloadEnd = gameState.now + (weapon.reloadTime || RELOAD_TIME_MS) * ENEMY_RELOAD_SCALE;
    }

    stun() {
        const now = gameState.now;
        this.stunnedUntil = now + FLASHBANG_STUN_DURATION_MS;
        this.stunStopUntil = now + FLASHBANG_FREEZE_MS;
        this.lastSeen = null;
        this.state = "patrol";
    }

    hasLineOfSight(targetX, targetY) {
        return lineOfSight(this.x, this.y, targetX, targetY);
    }

    takeDamage(damage) {
        this.health -= damage;
        this.hitAt = gameState.now;
        AudioSystem.playHit(false);
        AudioSystem.playHitmarker();
        HUD.hit(this.x, this.y - 14, damage, this.health <= 0);
        if (this.health > 0 && this.state !== "engage" && !this.stunned) {
            // Getting shot tells you where the shooter is.
            const player = gameState.player;
            this.state = "engage";
            this.spottedAt = gameState.now;
            this.lastSeen = { x: player.x, y: player.y };
            this.lastSeenAt = gameState.now;
        }
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        const index = gameState.enemies.indexOf(this);
        if (index > -1) {
            gameState.enemies.splice(index, 1);
        }

        AudioSystem.playEnemyDeath();
        Art.decal(this.x, this.y, 'blood');
        Art.body(this.x, this.y, this.angle, this.type);
        if (gameState.player) gameState.player.stats.kills++;

        for (let i = 0; i < 10; i++) {
            gameState.particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 20,
                this.y + (Math.random() - 0.5) * 20,
                '#f00', 1000
            ));
        }

        checkObjectives();
    }

    draw(ctx) {
        const now = gameState.now;
        Art.soldier(ctx, this, this.type === 'heavy' ? 'heavy' : 'normal', { flash: now - this.hitAt < 90 });

        if (this.health < this.maxHealth) {
            Art.bar(ctx, this.x, this.y - 20, this.health / this.maxHealth, '#ff5a4a');
        }

        if (this.stunned) {
            const t = Date.now() * 0.008;
            ctx.fillStyle = '#ffe680';
            for (let i = 0; i < 3; i++) {
                const a = t + i * 2.09;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(a) * 11, this.y - 13 + Math.sin(a) * 3, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.state === 'engage') {
            const fresh = now - this.spottedAt < 900;
            ctx.fillStyle = '#ff5a4a';
            ctx.font = `bold ${fresh ? 15 : 12}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('!', this.x, this.y - 23);
            ctx.textAlign = 'left';
        } else if (this.state === 'suspect') {
            ctx.fillStyle = '#ffd25a';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('?', this.x, this.y - 23);
            ctx.textAlign = 'left';
        }
    }
}

// ── Civilian ──

class Civilian {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 14;
        this.health = 50;
        this.rescued = false;
        this.scared = false;
        this.dead = false;
    }

    update() {
        if (this.rescued || this.dead) return;
        this.scared = false;
        gameState.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < 100) {
                this.scared = true;
                const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
                const nx = this.x + Math.cos(angle) * 0.8, ny = this.y + Math.sin(angle) * 0.8;
                if (!blockedForBody(nx, this.y, this.size)) this.x = nx;
                if (!blockedForBody(this.x, ny, this.size)) this.y = ny;
            }
        });
    }

    takeDamage(damage) {
        if (this.rescued || this.dead) return;
        this.health -= damage;
        if (this.health <= 0 && !this.dead) {
            this.die();
        }
    }

    die() {
        this.dead = true;
        gameOver("A hostage was killed. Check your fire near civilians.");
    }

    draw(ctx) {
        Art.hostage(ctx, this);
    }
}

// ── Door ──

class Door {
    constructor(x, y, locked = false) {
        // Stored at the tile centre whatever the loader passes in.
        this.gx = Math.floor(x / TILE_SIZE);
        this.gy = Math.floor(y / TILE_SIZE);
        this.x = this.gx * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.gy * TILE_SIZE + TILE_SIZE / 2;
        this.size = TILE_SIZE;
        this.locked = locked;
        this.open = false;
        this.health = locked ? 100 : 50;
        this.maxHealth = this.health;
    }

    toggle() {
        if (!this.locked) {
            this.open = !this.open;
        }
    }

    unlock() {
        this.locked = false;
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0 && this.locked) {
            this.unlock();
            this.open = true;
            HUD.notice('Door broken open');
        }
    }

    draw(ctx) {
        Art.door(ctx, this);
    }
}

// ── Throwables ──

class Grenade {
    constructor(x, y, angle, owner = "player", kind = "grenade") {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 5;
        this.vy = Math.sin(angle) * 5;
        this.owner = owner;
        this.kind = kind; // grenade, smoke, stun
        this.explodeAt = gameState.now + (GRENADE_FUSE_MS[kind] || 2000);
        this.exploded = false;
        this.blastRadius = 80 * (gameState.blastScale || 1);
        this.damage = 60;
    }

    get timer() {
        return this.explodeAt - gameState.now;
    }

    update() {
        const nx = this.x + this.vx, ny = this.y + this.vy;
        if (blockedForBody(nx, this.y, 6)) this.vx = -this.vx * 0.5; else this.x = nx;
        if (blockedForBody(this.x, ny, 6)) this.vy = -this.vy * 0.5; else this.y = ny;
        this.vx *= 0.95;
        this.vy *= 0.95;

        if (gameState.now >= this.explodeAt && !this.exploded) {
            this.explode();
            return false;
        }
        return !this.exploded;
    }

    explode() {
        this.exploded = true;
        if (this.kind === 'smoke') {
            gameState.smokes.push(new SmokeCloud(this.x, this.y));
            AudioSystem.playSmoke();
            return;
        }
        if (this.kind === 'stun') {
            AudioSystem.playFlashbang();
            Art.flashburst(this.x, this.y);
            gameState.enemies.forEach(enemy => {
                if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < FLASHBANG_RADIUS && lineOfSight(this.x, this.y, enemy.x, enemy.y, { smoke: false })) {
                    enemy.stun();
                }
            });
            const p = gameState.player;
            if (p && Math.hypot(p.x - this.x, p.y - this.y) < FLASHBANG_RADIUS * 0.8 && lineOfSight(this.x, this.y, p.x, p.y, { smoke: false })) {
                HUD.whiteFlash(900);
            }
            gameState.enemies.forEach(e => e.hear(this.x, this.y));
            return;
        }

        AudioSystem.playExplosion();
        Art.explosion(this.x, this.y, this.blastRadius);
        HUD.shake(7, 300);

        for (let i = 0; i < 30; i++) {
            gameState.particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 40,
                this.y + (Math.random() - 0.5) * 40,
                Math.random() > 0.5 ? '#f80' : '#f00',
                800
            ));
        }

        const applyBlast = (objX, objY, maxDamage) => {
            const dist = Math.hypot(objX - this.x, objY - this.y);
            if (dist > this.blastRadius) return null;
            const dmg = Math.max(0, Math.round(maxDamage * (1 - dist / this.blastRadius)));
            const nx = (objX - this.x) / (dist || 1);
            const ny = (objY - this.y) / (dist || 1);
            const force = (this.blastRadius - dist) / this.blastRadius * 6;
            return { dmg, nx, ny, force, dist };
        };

        gameState.doors.forEach(door => {
            const res = applyBlast(door.x, door.y, this.damage * 0.8);
            if (res && res.dmg > 0) door.takeDamage(res.dmg);
        });

        gameState.enemies.slice().forEach(enemy => {
            const res = applyBlast(enemy.x, enemy.y, this.damage);
            if (res && res.dmg > 0) {
                enemy.takeDamage(res.dmg);
                if (enemy.health > 0 && !blockedForBody(enemy.x + res.nx * res.force, enemy.y + res.ny * res.force, enemy.size)) {
                    enemy.x += res.nx * res.force;
                    enemy.y += res.ny * res.force;
                }
            }
        });
        gameState.enemies.forEach(e => e.hear(this.x, this.y));

        gameState.civilians.forEach(civ => {
            const res = applyBlast(civ.x, civ.y, this.damage * 0.9);
            if (res && res.dmg > 0 && !civ.dead && !civ.rescued) civ.takeDamage(res.dmg);
        });

        const player = gameState.player;
        if (player) {
            const res = applyBlast(player.x, player.y, this.damage);
            if (res && res.dmg > 0) {
                player.takeDamage(res.dmg, { x: this.x, y: this.y });
                if (!blockedForBody(player.x + res.nx * res.force, player.y + res.ny * res.force, player.size)) {
                    player.x += res.nx * res.force;
                    player.y += res.ny * res.force;
                }
            }
        }

        checkObjectives();
    }

    draw(ctx) {
        Art.grenade(ctx, this);
    }
}

class SmokeCloud {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.start = gameState.now;
        this.seed = Math.random() * 1000;
    }

    get age() {
        return gameState.now - this.start;
    }

    get alive() {
        return this.age < SMOKE_DURATION_MS;
    }

    radius() {
        const grow = Math.min(1, this.age / SMOKE_GROW_MS);
        const fade = Math.max(0, Math.min(1, (SMOKE_DURATION_MS - this.age) / 1500));
        return SMOKE_RADIUS * grow * (0.6 + 0.4 * fade);
    }

    /** Does the segment (x1,y1)-(x2,y2) cross the dense part of the cloud? */
    blocks(x1, y1, x2, y2) {
        const r = this.radius() * 0.85;
        if (r < 10) return false;
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((this.x - x1) * dx + (this.y - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = x1 + dx * t, py = y1 + dy * t;
        return Math.hypot(px - this.x, py - this.y) < r;
    }

    draw(ctx) {
        Art.smoke(ctx, this);
    }
}

// ── Bullet ──

class Bullet {
    constructor(x, y, angle, damage, owner) {
        this.x = x;
        this.y = y;
        this.fromX = x;
        this.fromY = y;
        this.angle = angle;
        this.damage = damage;
        this.owner = owner;
        Art.muzzle(x, y, angle);
        this.speed = 15;
        this.lifetime = 70;
    }

    impact(color = '#ff0') {
        this.lifetime = 0;
        for (let i = 0; i < 3; i++) {
            gameState.particles.push(new Particle(this.x, this.y, color, 200));
        }
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifetime--;

        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        if (isSolidTile(gridX, gridY)) {
            this.impact();
            return false;
        }

        const door = doorAtTile(gridX, gridY);
        if (door && !door.open) {
            door.takeDamage(this.damage);
            this.impact('#d7b35c');
            return false;
        }

        if (this.owner === "player") {
            for (const enemy of gameState.enemies) {
                if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < enemy.size / 2 + 3) {
                    gameState.player.stats.hits++;
                    enemy.takeDamage(this.damage);
                    this.lifetime = 0;
                    return false;
                }
            }
        } else {
            const player = gameState.player;
            if (player && Math.hypot(player.x - this.x, player.y - this.y) < player.size / 2 + 1) {
                player.takeDamage(this.damage, { x: this.fromX, y: this.fromY });
                this.lifetime = 0;
                return false;
            }
        }

        for (const civilian of gameState.civilians) {
            if (civilian.rescued || civilian.dead) continue;
            if (Math.hypot(civilian.x - this.x, civilian.y - this.y) < civilian.size / 2) {
                civilian.takeDamage(this.damage);
                this.lifetime = 0;
                for (let i = 0; i < 5; i++) {
                    gameState.particles.push(new Particle(
                        civilian.x + (Math.random() - 0.5) * 10,
                        civilian.y + (Math.random() - 0.5) * 10,
                        "#f00", 800
                    ));
                }
                return false;
            }
        }

        return this.lifetime > 0;
    }

    draw(ctx) {
        Art.bullet(ctx, this);
    }
}

class Particle {
    constructor(x, y, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.lifetime -= gameState.dt || 16;
        return this.lifetime > 0;
    }

    draw(ctx) {
        Art.particle(ctx, this);
    }
}
