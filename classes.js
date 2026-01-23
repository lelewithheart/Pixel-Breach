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
        this.stance = "standing"; //standing, crouched, prone
        this.lean = "none"; //none, left, right
        this.currentWeapon = "primary"; //primary, secondary, (melee: TODO)
        this.weapons = {
            primary: this.createWeapon(gameState.loadout.primary),
            secondary: this.createWeapon(gameState.loadout.secondary)
        };
        this.equipment = { ...EQUIPMENT[gameState.loadout.equipment] };
        this.canFire = true;
        this.reloading = false;
        this.hostagesRescued = 0;
    }

    createWeapon(type) {
        const weapon = { ...WEAPONS[type] };
        weapon.currentAmmo = weapon.magSize;
        weapon.reserveAmmo = weapon.totalAmmo;
        return weapon;
    }

    move(dx, dy) {
        let speed = this.speed;
        const isMoving = dx !== 0 || dy !== 0;
        const isSprinting = keys['Shift'] && this.stamina > 0 && this.stance === "standing" && isMoving;
        
        if (isSprinting) {
            speed = this.sprintSpeed;
            this.stamina = Math.max(0, this.stamina - 0.8);
        } else if (this.stance === "crouched") {
            speed = this.crouchSpeed;
        }

        // Regenerate stamina when not sprinting
        if (!isSprinting && this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + 0.2);
        }

        const newX = this.x + dx * speed;
        const newY = this.y + dy * speed;

        if (!this.checkCollision(newX, this.y)) {
            this.x = newX;
        }
        if (!this.checkCollision(this.x, newY)) {
            this.y = newY;
        }

        this.x = Math.max(this.size, Math.min(GRID_WIDTH * TILE_SIZE - this.size, this.x));
        this.y = Math.max(this.size, Math.min(GRID_HEIGHT * TILE_SIZE - this.size, this.y));
    }

    checkCollision(x, y) {
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const checkX = gridX + dx;
                const checkY = gridY + dy;
                if (checkX >= 0 && checkX < GRID_WIDTH && checkY >= 0 && checkY < GRID_HEIGHT) {
                    const tile = gameState.grid[checkY][checkX];
                    if (tile === 1 || tile === 3) { //1: Wall, 3: Cover
                        const tileLeft = checkX * TILE_SIZE;
                        const tileTop = checkY * TILE_SIZE;
                        const tileRight = tileLeft + TILE_SIZE;
                        const tileBottom = tileTop + TILE_SIZE;

                        if (x - this.size / 2 < tileRight && x + this.size / 2 > tileLeft && y - this.size / 2 < tileBottom && y + this.size / 2 > tileTop) {
                            return true;
                        }

                    }
                }
            }
        }

        // Check collision with closed doors
        for (let door of gameState.doors) {
            if (!door.open) {
                const doorGridX = Math.floor(door.x / TILE_SIZE);
                const doorGridY = Math.floor(door.y / TILE_SIZE);
                const tileLeft = doorGridX * TILE_SIZE;
                const tileTop = doorGridY * TILE_SIZE;
                const tileRight = tileLeft + TILE_SIZE;
                const tileBottom = tileTop + TILE_SIZE;

                if (x - this.size / 2 < tileRight && x + this.size / 2 > tileLeft && y - this.size / 2 < tileBottom && y + this.size / 2 > tileTop) {
                    return true;
                }
            }
        }

        return false;

    }

    shoot() {
        if (!this.canFire || this.reloading) return;

        const weapon = this.weapons[this.currentWeapon];
        if (weapon.currentAmmo <= 0) {
            return;
        }

        weapon.currentAmmo--;
        this.canFire = false;
        setTimeout(() => this.canFire = true, weapon.fireRate);

        AudioSystem.playGunshot(gameState.loadout[this.currentWeapon]);

        const pellets = weapon.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * weapon.spread;
            const bulletAngle = this.angle + spread;

            gameState.bullets.push(new Bullet(
                this.x, this.y, bulletAngle, weapon.damage, "player"
            ));
        }

        // Muzzle flash
        for (let i = 0; i < 3; i++) {
            gameState.particles.push(new Particle(
                this.x + Math.cos(this.angle) * 20,
                this.y + Math.sin(this.angle) * 20,
                "rgba(255, 255, 0, 0.35)", 200
            ));
        }

        //Alert enemies (based on Noise Level)
        const noiseLevel = weapon.noiseLevel || DEFAULT_NOISE_LEVEL;
        gameState.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist <= noiseLevel) {
                enemy.state = "engage";
                enemy.lastSeenPlayerX = this.x;
                enemy.lastSeenPlayerY = this.y;
            }
        });

        updateUI();
    }

    reload() {
        if (this.reloading) return;

        const weapon = this.weapons[this.currentWeapon];
        if (weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo === 0) return;

        this.reloading = true;
        AudioSystem.playReload();
        setTimeout(() => {
            const ammoNeeded = weapon.magSize - weapon.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);
            weapon.currentAmmo += ammoToReload;
            weapon.reserveAmmo -= ammoToReload;
            this.reloading = false;
            updateUI();
        }, RELOAD_TIME_MS);
    }

    takeDamage(damage) {
        if (this.armor > 0) {
            const armorAbsorb = Math.min(this.armor, damage * ARMOR_ABSORPTION_RATE);
            this.armor -= armorAbsorb;
            damage -= armorAbsorb;
        }
        this.health -= damage;
        AudioSystem.playHit();

        if (this.health <= 0) {
            this.health = 0;
            gameOver();
        }
        updateUI();
    }

    useEquipment() {
        if (this.equipment.quantity <= 0) return;

        this.equipment.quantity--;

        switch (this.equipment.effect) {
            case "stun":
                //Flashbang, make near enemies run around
                AudioSystem.playFlashbang();
                gameState.enemies.forEach(enemy => {
                    const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                    if (dist < 150) {
                        enemy.stunned = true;
                        setTimeout(() => enemy.stunned = false, FLASHBANG_STUN_DURATION_MS);
                    }
                });
                //Particles
                for (let i = 0; i < 20; i++) {
                    gameState.particles.push(new Particle(
                        this.x + (Math.random() - 0.5) * 50,
                        this.y + (Math.random() - 0.5) * 50,
                        "#fff", 500
                    ));
                }
                break;
            case "grenade":
                AudioSystem.playBeep(300, 0.05, 'square');
                gameState.grenades.push(new Grenade(this.x, this.y, this.angle));
                break;
            case "doormine":
                //Place mine on nearest door
                let nearestDoor = null;
                let nearestDist = 60;
                gameState.doors.forEach(door => {
                    const dist = Math.hypot(door.x - this.x, door.y - this.y);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestDoor = door;
                    }
                });
                if (nearestDoor && nearestDoor.locked) {
                    nearestDoor.unlock();
                    AudioSystem.playBreach();
                    //SFX
                    for (let i = 0; i < 15; i++) {
                        gameState.particles.push(new Particle(
                            nearestDoor.x + (Math.random() - 0.5) * 30,
                            nearestDoor.y + (Math.random() - 0.5) * 30,
                            "#f80", 300
                        ));
                    }
                } else {
                    this.equipment.quantity++; //Refund if no door found
                }
                break;
            case "breach":
                //Breach wall/door in front of player
                AudioSystem.playBreach();
                const checkX = Math.floor((this.x + Math.cos(this.angle) * 40) / TILE_SIZE);
                const checkY = Math.floor((this.y + Math.sin(this.angle) * 40) / TILE_SIZE);
                if (checkX >= 0 && checkX < GRID_WIDTH && checkY >= 0 && checkY < GRID_HEIGHT) {
                    gameState.grid[checkY][checkX] = 0;
                }
                break;
            case "heal":
                AudioSystem.playPickup();
                this.health = Math.min(this.maxHealth, this.health + 50);
                break;
        }
        updateUI();
    }

    interact() {
        //Check for nearby hostage
        gameState.civilians.forEach(civilian => {
            const dist = Math.hypot(civilian.x - this.x, civilian.y - this.y);
            if (dist < 40 && !civilian.rescued) {
                civilian.rescued = true;
                this.hostagesRescued++;
                AudioSystem.playRescue();
                checkObjectives();
            }
        });

        //Check for nearby doors
        gameState.doors.forEach(door => {
            const dist = Math.hypot(door.x - this.x, door.y - this.y);
            if (dist < 40) {
                if (door.locked) {
                    gameState.screen = "lockpick";
                    gameState.lockpickTarget = door;
                    gameState.playing = false;
                    document.getElementById('lockpick-screen').classList.add('active');

                } else {
                    door.toggle();
                    AudioSystem.playDoor(door.open);
                }
            }
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        //Body
        ctx.fillStyle = "#00f";
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        //Direction Indicator
        ctx.fillStyle = "#0ff";
        ctx.fillRect(this.size / 2 - 2, -2, 8, 4);

        //Lean Indicator
        if (this.lean !== "none") {
            ctx.fillStyle = "#ff0";
            const leanOffset = this.lean === "left" ? -8 : 8;
            ctx.fillRect(leanOffset, -8, 4, 4);
        }

        ctx.restore();

        ctx.fillStyle = "#f00";
        ctx.fillRect(this.x - 15, this.y - 25, 30 * (this.health / this.maxHealth), 3);
    }
}

class Enemy {
    constructor(x, y, type = "normal") {
        this.x = x;
        this.y = y;
        this.size = 16;
        this.speed = type === "heavy" ? 1.2 : 1.0; // Increased speed to make them more challenging
        this.health = type === "heavy" ? 150 : 100; // Increased health to match player
        this.maxHealth = this.health;
        this.type = type;
        this.angle = 0;
        this.state = "patrol"; //patrol, alert, engage, stunned
        this.patrolPoints = []; //example: {x: x1, y: y1}
        this.currentPatrolPoint = 0;
        this.detectionRange = 180; // Increased detection range
        this.fireRange = 220; // Increased fire range
        this.canFire = true;
        this.stunned = false;
        this.lastSeenPlayerX = null;
        this.lastSeenPlayerY = null;
        this.optimalRange = type === "heavy" ? 100 : 150;
        this.reloading = false;
        
        // Random weapon loadout based on enemy type
        const primaryWeapons = type === "heavy" 
            ? ["m4a1", "shotgun"] 
            : ["mp5", "m4a1", "glock"];
        const secondaryWeapons = ["m1911", "glock"];
        
        const randomPrimary = primaryWeapons[Math.floor(Math.random() * primaryWeapons.length)];
        const randomSecondary = secondaryWeapons[Math.floor(Math.random() * secondaryWeapons.length)];
        
        this.weapons = {
            primary: this.createWeapon(randomPrimary),
            secondary: this.createWeapon(randomSecondary)
        };
        this.currentWeapon = "primary";
        
        // Enemies now deal full weapon damage (no multiplier reduction)
        this.damageMultiplier = 1.0; // Full damage like player
    }

    createWeapon(type) {
        const weapon = { ...WEAPONS[type] };
        weapon.type = type; // Store weapon type for audio
        weapon.currentAmmo = weapon.magSize;
        weapon.reserveAmmo = weapon.totalAmmo;
        return weapon;
    }

    update() {
        if (this.stunned) {
            //Run around like a maniac when stunned lol
            if (Math.random() < 0.1) {
                this.angle = Math.random() * Math.PI * 2;
            }
            const dx = Math.cos(this.angle) * this.speed * 1.5;
            const dy = Math.sin(this.angle) * this.speed * 1.5;
            if (!this.checkCollision(this.x + dx, this.y + dy)) {
                this.x += dx;
                this.y += dy;
            }
            return;
        }

        const player = gameState.player;
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

        //Check if enemy can see player (cone)
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        const angleDiff = Math.abs(((angleToPlayer - this.angle + Math.PI) % (Math.PI * 2)) - Math.PI);
        const inViewCone = angleDiff < ENEMY_VIEW_ANGLE / 2;
        const canSeePlayer = inViewCone && distToPlayer < ENEMY_VIEW_DISTANCE && this.hasLineOfSight(player.x, player.y);

        //Engaging & Disgaging logic
        if (canSeePlayer && distToPlayer < this.detectionRange) {
            this.state = "engage";
            this.lastSeenPlayerX = player.x;
            this.lastSeenPlayerY = player.y;
        } else if (this.state === "engage" && this.lastSeenPlayerX) {
            const distToLastPos = Math.hypot(this.lastSeenPlayerX - this.x, this.lastSeenPlayerY - this.y);
            if (distToLastPos < 20) {
                this.lastSeenPlayerX = null;
                this.lastSeenPlayerY = null;
                this.state = "patrol";
            }
        }

        switch (this.state) {
            case "engage":
                this.engage(player);
                break;
            case "patrol":
                this.patrol();
                break;
        }
    }

    engage(player) {
        //look to player
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);

        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

        //move to optimal distance
        if (distToPlayer > this.optimalRange + 30) {
            // Too far - move closer
            const dx = Math.cos(this.angle) * this.speed;
            const dy = Math.sin(this.angle) * this.speed;
            if (!this.checkCollision(this.x + dx, this.y + dy)) {
                this.x += dx;
                this.y += dy;
            }
        } else if (distToPlayer < this.optimalRange - 30) {
            // Too close - back away
            const dx = -Math.cos(this.angle) * this.speed;
            const dy = -Math.sin(this.angle) * this.speed;
            if (!this.checkCollision(this.x + dx, this.y + dy)) {
                this.x += dx;
                this.y += dy;
            }
        }

        if (this.canFire && distToPlayer < this.fireRange && this.hasLineOfSight(player.x, player.y)) {
            this.shoot();
        }
    }

    patrol() {
        if (this.patrolPoints.length === 0) {
            //Random Movement
            if (Math.random() < 0.02) {
                this.angle = Math.random() * Math.PI * 2;
            }
            const dx = Math.cos(this.angle) * this.speed * 0.5;
            const dy = Math.sin(this.angle) * this.speed * 0.5;
            if (!this.checkCollision(this.x + dx, this.y + dy)) {
                this.x += dx;
                this.y += dy;
            }
        } else {
            // Follow patrol points
            const currentPoint = this.patrolPoints[this.currentPatrolPoint];
            const targetX = currentPoint.x * TILE_SIZE + TILE_SIZE / 2;
            const targetY = currentPoint.y * TILE_SIZE + TILE_SIZE / 2;
            
            const distToPoint = Math.hypot(targetX - this.x, targetY - this.y);
            
            if (distToPoint < 10) {
                // Reached current patrol point, move to next
                this.currentPatrolPoint = (this.currentPatrolPoint + 1) % this.patrolPoints.length;
            } else {
                // Move towards current patrol point
                const path = this.findPath(targetX, targetY);
                if (path.length > 0) {
                    const nextWaypoint = path[0];
                    this.angle = Math.atan2(nextWaypoint.y - this.y, nextWaypoint.x - this.x);
                    
                    const dx = Math.cos(this.angle) * this.speed;
                    const dy = Math.sin(this.angle) * this.speed;
                    if (!this.checkCollision(this.x + dx, this.y + dy)) {
                        this.x += dx;
                        this.y += dy;
                    }
                }
            }
        }
    }

    findPath(targetX, targetY){
        const path = [];
        let currentX = this.x;
        let currentY = this.y;
        const stepDistance = 10; // Check every 10 pixels along path
        const minDistance = 5; // Stop when within 5 pixels of target

        while (Math.hypot(targetX - currentX, targetY - currentY) > minDistance) {
            const angle = Math.atan2(targetY - currentY, targetX - currentX);
            const distance = Math.hypot(targetX - currentX, targetY - currentY);
            
            // Try straight line
            let clearDistance = 0;
            for (let d = 0; d <= distance; d += stepDistance) {
                const checkX = currentX + Math.cos(angle) * d;
                const checkY = currentY + Math.sin(angle) * d;
                if (this.checkCollision(checkX, checkY)) {
                    break;
                }
                clearDistance = d;
            }
            
            if (clearDistance >= distance) {
                // Straight path is clear, go directly to target
                path.push({x: targetX, y: targetY});
                break;
            } else {
                // Hit obstacle, go to last clear point
                const clearX = currentX + Math.cos(angle) * clearDistance;
                const clearY = currentY + Math.sin(angle) * clearDistance;
                
                // From clear point, find next direction
                const nextPoint = this.nextPoint(clearX, clearY, targetX, targetY, angle);
                if (!nextPoint) {
                    // No path found
                    break;
                }
                
                path.push(nextPoint);
                currentX = nextPoint.x;
                currentY = nextPoint.y;
            }
        }
        
        return path;
    }

    nextPoint(startX, startY, endX, endY, idealAngle){
        const scanRange = Math.PI / 3; // Scan 60 degrees up and down
        const stepAngle = Math.PI / 180; // 1 degree steps
        const moveDistance = 40; // Try moving 40 pixels in new direction
        
        // First try the ideal angle
        const idealX = startX + Math.cos(idealAngle) * moveDistance;
        const idealY = startY + Math.sin(idealAngle) * moveDistance;
        if (!this.checkCollision(idealX, idealY)) {
            return {x: idealX, y: idealY};
        }
        
        // Scan angles from ideal - range to ideal + range
        for (let offset = stepAngle; offset <= scanRange; offset += stepAngle) {
            // Try clockwise (positive offset)
            const angle1 = idealAngle + offset;
            const x1 = startX + Math.cos(angle1) * moveDistance;
            const y1 = startY + Math.sin(angle1) * moveDistance;
            if (!this.checkCollision(x1, y1)) {
                return {x: x1, y: y1};
            }
            
            // Try counter-clockwise (negative offset)
            const angle2 = idealAngle - offset;
            const x2 = startX + Math.cos(angle2) * moveDistance;
            const y2 = startY + Math.sin(angle2) * moveDistance;
            if (!this.checkCollision(x2, y2)) {
                return {x: x2, y: y2};
            }
        }
        
        // No clear direction found
        return null;
    }

    shoot() {
        if (!this.canFire || this.reloading) return;

        const weapon = this.weapons[this.currentWeapon];
        
        // Check ammo and reload if needed
        if (weapon.currentAmmo <= 0) {
            if (weapon.reserveAmmo <= 0 && this.currentWeapon === "primary") {
                // Switch to secondary if primary is empty
                this.currentWeapon = "secondary";
                return;
            } else if (weapon.reserveAmmo <= 0) {
                // Both weapons empty, can't shoot
                return;
            }
            this.reload();
            return; // Don't shoot while starting reload
        }

        weapon.currentAmmo--;
        this.canFire = false;
        setTimeout(() => this.canFire = true, weapon.fireRate * 0.8); // Enemies shoot 20% faster

        // Calculate damage based on weapon and enemy multiplier
        const damage = Math.floor(weapon.damage * this.damageMultiplier);

        const pellets = weapon.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * weapon.spread * 1.5; // Slightly less accurate than player but still challenging
            const bulletAngle = this.angle + spread;

            gameState.bullets.push(new Bullet(
                this.x, this.y, bulletAngle, damage, "enemy"
            ));
        }
        
        // Play weapon-appropriate sound
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
        // Enemies reload slightly slower than players
        const reloadTime = RELOAD_TIME_MS * 1.3;
        setTimeout(() => {
            const ammoNeeded = weapon.magSize - weapon.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);
            weapon.currentAmmo += ammoToReload;
            weapon.reserveAmmo -= ammoToReload;
            this.reloading = false;
        }, reloadTime);
    }

    hasLineOfSight(targetX, targetY) {
        const steps = 20;
        const dx = (targetX - this.x) / steps;
        const dy = (targetY - this.y) / steps;

        for (let i = 0; i < steps; i++) {
            const checkX = Math.floor((this.x + dx * i) / TILE_SIZE);
            const checkY = Math.floor((this.y + dy * i) / TILE_SIZE);

            if (checkX >= 0 && checkX < GRID_WIDTH && checkY >= 0 && checkY < GRID_HEIGHT) {
                if (gameState.grid[checkY][checkX] === 1) {
                    return false;
                }
            }
        }
        return true;
    }

    checkCollision(x, y) {
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);

        if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
            return gameState.grid[gridY][gridX] === 1 || gameState.grid[gridY][gridX] === 3;
        }
        return true;
    }

    takeDamage(damage) {
        this.health -= damage;
        AudioSystem.playHit(false);
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
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Body
        ctx.fillStyle = this.type === 'heavy' ? '#a00' : '#f00';
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        // Direction indicator
        ctx.fillStyle = '#f80';
        ctx.fillRect(this.size / 2 - 2, -2, 8, 4);

        ctx.restore();

        // Health bar
        if (this.health < this.maxHealth) {
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x - 15, this.y - 25, 30 * (this.health / this.maxHealth), 3);
        }

        // State indicator
        if (this.state === 'engage') {
            ctx.fillStyle = '#ff0';
            ctx.fillRect(this.x - 3, this.y - 30, 6, 6);
        }

        // Stunned indicator
        if (this.stunned) {
            ctx.fillStyle = '#ff0';
            ctx.fillText('⚡', this.x - 5, this.y - 25);
        }
    }
}

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
        if (!this.rescued && !this.dead) {
            gameState.enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < 100) {
                    const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
                    this.x += Math.cos(angle);
                    this.y += Math.sin(angle);
                    this.scared = true;
                }
            });
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0 && !this.dead) {
            this.die();
        }
    }

    die() {
        this.dead = true;
        //Mission failure - Hostage killed
        gameState.playing = false;
        setTimeout(() => {
            alert("MISSION FAILED\n\nHostage killed! You must protect all civilians.");
        }, MISSION_FAILURE_ALERT_DELAY);
    }

    draw(ctx) {
        if (this.dead) {
            //grey X
            ctx.fillStyle = "#666";
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
            ctx.fillStyle = "#f00";
            ctx.font = "16px monospace";
            ctx.fillText("✕", this.x - 6, this.y + 5);
            return;
        }

        ctx.fillStyle = this.rescued ? "#0f0" : "#ff0";
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        //Indicator
        ctx.fillStyle = this.rescued ? "#0f0" : "#ff0";
        ctx.font = "12px monospace";
        ctx.fillText(this.rescued ? '✓' : '!', this.x - 4, this.y - 15);
    }
}

class Door {
    constructor(x, y, locked = false) {
        this.x = x;
        this.y = y;
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
        if (this.health <= 0) {
            this.unlock();
        }
    }

    draw(ctx) {
        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        const px = gridX * TILE_SIZE;
        const py = gridY * TILE_SIZE;

        if (this.open) {
            ctx.fillStyle = '#555';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.fillStyle = this.locked ? '#820' : '#640';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

            // Lock indicator
            if (this.locked) {
                ctx.fillStyle = '#ff0';
                ctx.font = '14px monospace';
                ctx.fillText('🔒', px + 3, py + 15);
            }

            // Health bar for locked doors
            if (this.locked && this.health < this.maxHealth) {
                ctx.fillStyle = '#f00';
                ctx.fillRect(px, py - 3, TILE_SIZE * (this.health / this.maxHealth), 2);
            }
        }
    }
}

class Grenade {
    constructor(x, y, angle, owner = "player") {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 5;
        this.vy = Math.sin(angle) * 5;
        this.owner = owner;
        this.timer = 3000; // in ms
        this.exploded = false;
        this.blastRadius = 80;
        this.damage = 60;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        //more sophisticated friction system (Throw in the air, then sliding -> changing Friction) TODO
        this.vx *= 0.95;
        this.vy *= 0.95;

        this.timer -= 16;

        if (this.timer <= 0 && !this.exploded) {
            this.exploded();
            return false;
        }

        return !this.exploded;
    }

    explode() {
        this.exploded = true;

        AudioSystem.playExplosion();

        //particles
        for (let i = 0; i < 30; i++) {
            gameState.particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 40,
                this.y + (Math.random() - 0.5) * 40,
                Math.random() > 0.5 ? '#f80' : '#f00',
                800
            ));
        }

        // Damage system (Doors & Enemies & Hostages)
        // Apply area damage with linear falloff and light knockback.
        const applyBlast = (objX, objY, maxDamage) => {
            const dist = Math.hypot(objX - this.x, objY - this.y);
            if (dist > this.blastRadius) return 0;
            const dmg = Math.max(0, Math.round(maxDamage * (1 - dist / this.blastRadius)));
            // knockback vector (small)
            const nx = (objX - this.x) / (dist || 1);
            const ny = (objY - this.y) / (dist || 1);
            const force = (this.blastRadius - dist) / this.blastRadius * 6;
            return { dmg, nx, ny, force, dist };
        };

        // Doors
        gameState.doors.forEach(door => {
            const res = applyBlast(door.x, door.y, this.damage * 0.8); // doors take slightly reduced blast
            if (res && res.dmg > 0) {
                door.takeDamage(res.dmg);
            }
        });

        // Enemies
        gameState.enemies.forEach(enemy => {
            const res = applyBlast(enemy.x, enemy.y, this.damage);
            if (res && res.dmg > 0) {
                enemy.takeDamage(res.dmg);
                // small knockback if not colliding
                enemy.x += res.nx * res.force;
                enemy.y += res.ny * res.force;
            }
        });

        // Civilians / Hostages
        gameState.civilians.forEach(civ => {
            const res = applyBlast(civ.x, civ.y, this.damage * 0.9);
            if (res && res.dmg > 0 && !civ.dead && !civ.rescued) {
                civ.takeDamage(res.dmg);
            }
        });

        // Player

        const player = gameState.player;
        const res = applyBlast(player.x, player.y, this.damage);
        if (res && res.dmg > 0) {
            player.takeDamage(res.dmg);
            // knockback
            player.x += res.nx * res.force;
            player.y += res.ny * res.force;
        }

        checkObjectives();
    }

    draw(ctx) {
        const flash = this.timer < 1000 && Math.floor(this.timer / 100) % 2 === 0;
        ctx.fillStyle = flash ? '#f00' : '#444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Bullet {
    constructor(x, y, angle, damage, owner) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.damage = damage;
        this.owner = owner;
        this.speed = 15;
        this.lifetime = 100;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifetime--;

        //check collisions

        //wall
        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
            if (gameState.grid[gridY][gridX] === 1 || gameState.grid[gridY][gridX] === 3) {
                this.lifetime = 0;
                // Impact particles
                for (let i = 0; i < 3; i++) {
                    gameState.particles.push(new Particle(this.x, this.y, '#ff0', 200));
                }
            }
        }

        //door
        gameState.doors.forEach(door => {
            const doorGridX = Math.floor(door.x / TILE_SIZE);
            const doorGridY = Math.floor(door.y / TILE_SIZE);
            if (gridX === doorGridX && gridY === doorGridY && !door.open) {
                door.takeDamage(this.damage);
                this.lifetime = 0;
                //particles
                for (let i = 0; i < 3; i++) {
                    gameState.particles.push(new Particle(this.x, this.y, '#ff0', 200));
                }
            }
        });

        if (this.owner === "player") {
            gameState.enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < enemy.size / 2) {
                    enemy.takeDamage(this.damage);
                    this.lifetime = 0;
                }
            });

            gameState.civilians.forEach(civilian => {
                const dist = Math.hypot(civilian.x - this.x, civilian.y - this.y);
                if (dist < civilian.size / 2) {
                    civilian.takeDamage(this.damage);
                    this.lifetime = 0;
                    //Particles
                    for (let i = 0; i < 5; i++) {
                        gameState.particles.push(new Particle(
                            civilian.x + (Math.random() - 0.5) * 10,
                            civilian.y + (Math.random() - 0.5) * 10,
                            "#f00", 800
                        ));
                    }
                }
            });
        } else if (this.owner === "enemy") {
            const player = gameState.player;
            if (player) {
                const dist = Math.hypot(player.x - this.x, player.y - this.y);
                if (dist < player.size / 2) {
                    player.takeDamage(this.damage);
                    this.lifetime = 0;
                }
            }

            //Enemys killing Civilians reducing the overall score, but not ending the mission instantly - TODO
        }

        return this.lifetime > 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.owner === "player" ? "#ff0" : "#f80";
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
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
        this.lifetime--;
        return this.lifetime > 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.lifetime / this.maxLifetime;
        ctx.fillRect(this.x - 2, this.y - 2, 2, 2)
        ctx.globalAlpha = 1;
    }
}