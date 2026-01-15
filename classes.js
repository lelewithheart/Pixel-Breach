//Player Class
class Player {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.size = 16;
        this.speed = 2;
        this.sprintSpeed = 3.5;
        this.crouchSpeed = 1;
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 100;
        this.maxArmor = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.angle = 0;
        this.stance = "standing"; //standing, crouched, prone
        this.lean = "none"; //none, left, right
        this.currentWeapon = "primary"; //primary, secondary, (melee: not implemented yet)
        this.weapons = {
            primary: this.createWeapon(gameState.loadout.primary),
            secondary: this.createWeapon(gameState.loadout.secondary)
        };
        this.equipment = { ...EQUIPMENT[gameState.loadout.equipment] };
        this.canFire = true;
        this.reloading = false;
        this.hostagesRescued = 0;
    }

    createWeapon(type){
        const weapon = { ...WEAPONS[type]};
        weapon.currentAmmo = weapon.magSize;
        weapon.reserveAmmo = weapon.totalAmmo;
        return weapon;
    }

    move(dx, dy){
        let speed = this.speed;
        if(keys['Shift'] && this.stamina > 0 && this.stance === "standing"){
            speed = this.sprintSpeed;
            this.stamina = Math.max(0, this.stamina - 0.5);
        }else if(this.stance === "crouched"){
            speed = this.crouchSpeed;
        }

        if(this.stamina < this.maxStamina && (!keys["Shift"] || this.stance !== "standing")){
            this.stamina = Math.min(this.maxStamina, this.stamina + 0.3);
        }

        const newX = this.x + dx * speed;
        const newY = this.y + dy * speed;

        if(!this.checkCollision(newX, this.y)){
            this.x = newX;
        }
        if(!this.checkCollision(this.x, newY)){
            this.y = newY;
        }

        this.x = Math.max(this.size, Math.min(GRID_WIDTH * TILE_SIZE - this.size, this.x));
        this.y = Math.max(this.size, Math.min(GRID_HEIGHT * TILE_SIZE - this.size, this.y));
    }

    checkCollision(x, y){
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);

        for(let dx = -1; dx <= 1; dx++){
            for(let dy = -1; dy <= 1; dy++){
                const checkX = gridX + dx;
                const checkY = gridY + dy;
                if(checkX >= 0 && checkY < GRID_WIDTH && checkY >= 0 && checkY < GRID_HEIGHT){
                    const tile = gameState.grid[checkY][checkX];
                    if(tile === 1 || tile === 3){ //1: Wall, 3: Cover
                        const tileLeft = checkX * TILE_SIZE;
                        const tileTop = checkY * TILE_SIZE;
                        const tileRight = tileLeft + TILE_SIZE;
                        const tileBottom = tileTop + TILE_SIZE;

                        if(x - this.size / 2 < tileRight && x + this.size / 2 > tileLeft && y - this.size / 2 < tileBottom && y + this.size / 2 > tileTop){
                            return true;
                        }

                    }
                }
            }
        }

        // Check collision with closed doors
        for(let door of gameState.doors){
            if(!door.open){
                const doorGridX = Math.floor(door.x / TILE_SIZE);
                const doorGridY = Math.floor(door.y / TILE_SIZE);
                const tileLeft = doorGridX * TILE_SIZE;
                const tileTop = doorGridY * TILE_SIZE;
                const tileRight = tileLeft + TILE_SIZE;
                const tileBottom = tileTop + TILE_SIZE;

                if(x - this.size / 2 < tileRight && x + this.size / 2 > tileLeft && y - this.size / 2 < tileBottom && y + this.size / 2 > tileTop){
                    return true;
                }
            }
        }

        return false;
        
    }

    shoot(){
        if(!this.canFire || this.reloading) return;

        const weapon = this.weapons[this.currentWeapon];
        if(weapon.currentAmmo <= 0){
            return;
        }

        weapon.currentAmmo--;
        this.canFire = false;
        setTimeout(() => this.canFire = true, weapon.fireRate);

        const pellets = weapon.pellets || 1;
        for(let i = 0; i < pellets; i++){
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
                "#ff0", 200
            ));
        }

        //Alert enemies (based on Noise Level)
        const noiseLevel = weapon.noiseLevel || DEFAULT_NOISE_LEVEL;
        gameState.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if(dist <= noiseLevel){
                enemy.state = "engage";
                enemy.lastSeenPlayerX = this.x;
                enemy.lastSeenPlayerY = this.y;
            }
        });

        updateUI();
    }

    reload(){
        if(this.reloading) return;

        const weapon = this.weapons[this.currentWeapon];
        if(weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo === 0) return;

        this.reloading = true;
        setTimeout(() => {
            const ammoNeeded = weapon.magSize - weapon.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);
            weapon.currentAmmo += ammoToReload;
            weapon.reserveAmmo -= ammoToReload;
            this.reloading = false;
            updateUI();
        }, RELOAD_TIME_MS);
    }

    takeDamage(damage){
        if(this.armor > 0){
            const armorAbsorb = Math.min(this.armor, damage * ARMOR_ABSORPTION_RATE);
            this.armor -= armorAbsorb;
            damage -= armorAbsorb;
        }
        this.health -= damage;

        if(this.health <= 0) {
            this.health = 0;
            gameOver();
        }
        updateUI();
    }

    useEquipment(){
        if(this.equipment.quantity <= 0) return;

        this.equipment.quantity--;

        switch(this.equipment.effect){
            case "stun":
                //Flashbang, make near enemies run around
                gameState.enemies.forEach(enemy => {
                    const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                    if(dist < 150){
                        enemy.stunned = true;
                        setTimeout(() => enemy.stunned = false, FLASHBANG_STUN_DURATION_MS);
                    }
                });
                //Particles
                for(let i = 0; i < 20; i++){
                    gameState.particles.push(new Particle(
                        thhis.x + (Math.random() - 0.5) * 50,
                        this.y + (Math.random() - 0.5) * 50,
                        "#fff", 500
                    ));
                }
                break;
            case "grenade":
                gameState.grenades.push(new Grenade(this.x, this.y, this.angle));
                break;
            case "doormine":
                //Place mine on nearest door
                let nearestDoor = null;
                let nearestDist = 60;
                gameState.doors.forEach(door => {
                    const dist = Math.hypot(door.x - this.x, door.y - this.y);
                    if(dist < nearestDist){
                        nearestDist = dist;
                        nearestDoor = door;
                    }
                });
                if(nearestDoor && nearestDoor.locked){
                    nearestDoor.unlock();
                    //SFX
                    for(let i = 0; i < 15; i++){
                        gameState.particles.push(new Particle(
                            nearestDoor.x + (Math.random() - 0.5) * 30,
                            nearestDoor.y + (Math.random() - 0.5) * 30,
                            "#f80", 300
                        ));
                    }
                }else{
                    this.equipment.quantity++; //Refund if no door found
                }
                break;
            case "breach":
        }
            
    }
}
