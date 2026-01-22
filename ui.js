// Update UI
function updateUI() {
    if (!gameState.player) return;

    const player = gameState.player;

    document.getElementById('health-value').textContent = Math.floor(player.health);
    document.getElementById('health-bar').style.width = (player.health / player.maxHealth * 100) + '%';

    document.getElementById('armor-value').textContent = Math.floor(player.armor);
    document.getElementById('armor-bar').style.width = (player.armor / player.maxArmor * 100) + '%';

    document.getElementById('stamina-value').textContent = Math.floor(player.stamina);
    document.getElementById('stamina-bar').style.width = (player.stamina / player.maxStamina * 100) + '%';

    document.getElementById('stance-value').textContent = player.stance.toUpperCase();
    document.getElementById('enemy-count').textContent = gameState.enemies.length;
    document.getElementById('hostage-count').textContent =
        gameState.civilians.filter(c => !c.rescued).length + '/' + gameState.civilians.length;

    // Update weapon displays
    const primaryWeapon = player.weapons.primary;
    document.getElementById('primary-weapon').innerHTML = `
        <div>PRIMARY: ${primaryWeapon.name.toUpperCase()}</div>
        <div>AMMO: ${primaryWeapon.currentAmmo}/${primaryWeapon.reserveAmmo}</div>
    `;

    const secondaryWeapon = player.weapons.secondary;
    document.getElementById('secondary-weapon').innerHTML = `
        <div>SECONDARY: ${secondaryWeapon.name.toUpperCase()}</div>
        <div>AMMO: ${secondaryWeapon.currentAmmo}/${secondaryWeapon.reserveAmmo}</div>
    `;

    document.getElementById('equipment-slot').innerHTML = `
        <div>EQUIPMENT: ${player.equipment.name.toUpperCase()}</div>
        <div>QTY: ${player.equipment.quantity}</div>
    `;

    // Highlight active weapon
    document.getElementById('primary-weapon').classList.toggle('active', player.currentWeapon === 'primary');
    document.getElementById('secondary-weapon').classList.toggle('active', player.currentWeapon === 'secondary');
}

// Input event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (!gameState.playing || !gameState.player) return;

    if (e.key === 'r' || e.key === 'R') {
        gameState.player.reload();
    }
    if (e.key === '1') {
        gameState.player.currentWeapon = 'primary';
        updateUI();
    }
    if (e.key === '2') {
        gameState.player.currentWeapon = 'secondary';
        updateUI();
    }
    if (e.key === ' ') {
        e.preventDefault();
        gameState.player.useEquipment();
    }
    if (e.key === 'e' || e.key === 'E') {
        gameState.player.interact();
    }
    if (e.key === 'Control') {
        gameState.player.stance = gameState.player.stance === 'crouched' ? 'standing' : 'crouched';
        updateUI();
    }
    if (e.key === 'q' || e.key === 'Q') {
        gameState.player.lean = gameState.player.lean === 'left' ? 'none' : 'left';
    }
    if (e.key === 'f' || e.key === 'F') {
        gameState.player.lean = gameState.player.lean === 'right' ? 'none' : 'right';
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Canvas mouse events
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    if (gameState.player) {
        gameState.player.angle = Math.atan2(mouse.y - gameState.player.y, mouse.x - gameState.player.x);
    }
});

canvas.addEventListener('mousedown', (e) => {
    mouse.down = true;

    if (gameState.editorMode) {
        placeInEditor(mouse.x, mouse.y);
    } else if (gameState.playing && gameState.player) {
        gameState.player.shoot();
    }
});

canvas.addEventListener('mouseup', () => {
    mouse.down = false;
});

// UI Event Listeners
document.getElementById('start-game').addEventListener('click', () => {
    AudioSystem.playClick();
    if (!gameState.player) {
        createDefaultLevel();
    }
    gameState.playing = true;
    gameState.editorMode = false;
    document.getElementById('level-editor').classList.remove('active');
    AudioSystem.playMusic("gameplay");
});

document.getElementById('open-loadout').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('loadout-modal').classList.add('active');
});

document.getElementById('close-loadout').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('loadout-modal').classList.remove('active');
});

document.getElementById('confirm-loadout').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('loadout-modal').classList.remove('active');
    if (gameState.player) {
        gameState.player.weapons.primary = gameState.player.createWeapon(gameState.loadout.primary);
        gameState.player.weapons.secondary = gameState.player.createWeapon(gameState.loadout.secondary);
        gameState.player.equipment = { ...EQUIPMENT[gameState.loadout.equipment] };
        updateUI();
    }
});

document.getElementById('toggle-editor').addEventListener('click', () => {
    AudioSystem.playClick();
    gameState.editorMode = !gameState.editorMode;
    gameState.playing = !gameState.editorMode;

    if (gameState.editorMode) {
        if (!gameState.player) {
            initGrid();
            gameState.player = new Player(100, 100);
        }
        document.getElementById('level-editor').classList.add('active');
        AudioSystem.playMusic("menu");
    } else {
        document.getElementById('level-editor').classList.remove('active');
        AudioSystem.playMusic("gameplay");
    }
});

document.getElementById('reset-game').addEventListener('click', () => {
    AudioSystem.playClick();
    gameState.playing = false;
    createDefaultLevel();
});

// Loadout selection
document.querySelectorAll('.loadout-option').forEach(option => {
    option.addEventListener('click', () => {
        AudioSystem.playClick();
        const type = option.dataset.type;
        const weapon = option.dataset.weapon;

        // Deselect others of same type
        document.querySelectorAll(`.loadout-option[data-type="${type}"]`).forEach(opt => {
            opt.classList.remove('selected');
        });

        option.classList.add('selected');
        gameState.loadout[type] = weapon;
    });
});

// Editor tools
document.querySelectorAll('.editor-tool').forEach(btn => {
    btn.addEventListener('click', () => {
        AudioSystem.playClick();
        document.querySelectorAll('.editor-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const toolName = btn.id.replace('tool-', '');
        gameState.currentTool = toolName;
    });
});

document.getElementById('save-level').addEventListener('click', () => {
    AudioSystem.playSelect();
    saveLevel();
});
document.getElementById('load-level').addEventListener('click', () => {
    AudioSystem.playClick();
    loadLevel();
});
document.getElementById('clear-level').addEventListener('click', () => {
    AudioSystem.playClick();
    clearLevel();
});

// Home screen navigation
document.getElementById('btn-campaign').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('level-select-screen').classList.add('active');

    // Populate mission list
    const missionList = document.getElementById('mission-list');
    missionList.innerHTML = '';
    MISSIONS.forEach(mission => {
        const missionDiv = document.createElement('div');
        missionDiv.style.cssText = 'padding: 15px; margin: 10px 0; background: #333; border: 1px solid #555; cursor: pointer;';
        missionDiv.innerHTML = `
            <strong style="color: #0f0;">Mission ${mission.id}: ${mission.name}</strong><br>
            <span style="font-size: 12px;">${mission.description}</span>
        `;
        missionDiv.addEventListener('click', () => {
            AudioSystem.playSelect();
            loadMission(mission.id);
            AudioSystem.playMusic('gameplay');
        });
        missionDiv.addEventListener('mouseenter', () => missionDiv.style.background = '#444');
        missionDiv.addEventListener('mouseleave', () => missionDiv.style.background = '#333');
        missionList.appendChild(missionDiv);
    });
});

document.getElementById('btn-community').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('community-screen').classList.add('active');

    // Load community levels from localStorage
    const communityList = document.getElementById('community-list');
    communityList.innerHTML = '';

    const savedLevel = localStorage.getItem('customLevel');
    if (savedLevel) {
        const levelDiv = document.createElement('div');
        levelDiv.style.cssText = 'padding: 15px; margin: 10px 0; background: #333; border: 1px solid #555; cursor: pointer;';
        levelDiv.innerHTML = `
            <strong style="color: #0f0;">Custom Level</strong><br>
            <span style="font-size: 12px;">Player-created level</span>
        `;
        levelDiv.addEventListener('click', () => {
            AudioSystem.playSelect();
            loadLevel();
            gameState.screen = 'playing';
            gameState.playing = true;
            document.getElementById('community-screen').classList.remove('active');
            document.getElementById('game-container').style.display = 'flex';
            AudioSystem.playMusic("gameplay");
        });
        levelDiv.addEventListener('mouseenter', () => levelDiv.style.background = '#444');
        levelDiv.addEventListener('mouseleave', () => levelDiv.style.background = '#333');
        communityList.appendChild(levelDiv);
    } else {
        communityList.innerHTML = '<p style="color: #888;">No community levels found. Create one in the Level Editor!</p>';
    }
});

document.getElementById('btn-editor-home').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('game-container').style.display = 'flex';
    gameState.editorMode = true;
    gameState.playing = false;
    gameState.screen = 'editor';
    if (!gameState.player) {
        initGrid();
        gameState.player = new Player(100, 100);
    }
    document.getElementById('level-editor').classList.add('active');
});

document.getElementById('btn-loadout-home').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('loadout-modal').classList.add('active');
});

document.getElementById('back-to-home').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('level-select-screen').classList.remove('active');
    document.getElementById('home-screen').classList.add('active');
});

document.getElementById('back-to-home-community').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('community-screen').classList.remove('active');
    document.getElementById('home-screen').classList.add('active');
});

// Back to menu buttons
document.getElementById('back-to-menu-game').addEventListener('click', () => {
    AudioSystem.playClick();
    gameState.playing = false;
    gameState.editorMode = false;
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('home-screen').classList.add('active');
    AudioSystem.playMusic("menu");
});

document.getElementById('back-to-menu-editor').addEventListener('click', () => {
    AudioSystem.playClick();
    gameState.playing = false;
    gameState.editorMode = false;
    document.getElementById('level-editor').classList.remove('active');
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('home-screen').classList.add('active');
    AudioSystem.playMusic("menu");
});

// Lockpick minigame
document.getElementById('cancel-lockpick').addEventListener('click', () => {
    AudioSystem.playClick();
    gameState.screen = 'playing';
    gameState.playing = true;
    gameState.lockpickTarget = null;
    document.getElementById('lockpick-screen').classList.remove('active');
    document.getElementById('game-container').style.display = 'flex';
});

// Lockpick animation loop
setInterval(() => {
    if (gameState.screen === 'lockpick') {
        updateLockpick();
    }
}, 16);

// Space bar for lockpick
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && gameState.screen === 'lockpick') {
        e.preventDefault();
        attemptLockpick();
    }
});

// Initialize game
initGrid();
document.getElementById('game-container').style.display = 'none';

function initAudioOnInteraction(){
    if(!AudioSystem.initialized){
        AudioSystem.init();
        AudioSystem.playMusic("menu");
    }
    document.removeEventListener("click", initAudioOnInteraction);
    document.removeEventListener("keydown", initAudioOnInteraction);
}
document.addEventListener("click", initAudioOnInteraction);
document.addEventListener("keydown", initAudioOnInteraction);

document.getElementById("toggle-music").addEventListener("click", () =>{
    AudioSystem.init();
    const enabled = AudioSystem.toggleMusic();
    const btn = document.getElementById("toggle-music");
    btn.textContent = enabled ? "ON" : "OFF";
    btn.classList.toggle("active", enabled);
    if (enabled) {
        if (gameState.playing) {
            AudioSystem.playMusic('gameplay');
        } else {
            AudioSystem.playMusic('menu');
        }
    }
    AudioSystem.playClick();
});

document.getElementById("master-volume").addEventListener("input", (e) =>{
    AudioSystem.init();
    AudioSystem.setMasterVolume(e.target.value / 100);
});

document.getElementById('toggle-sfx').addEventListener('click', () => {
    AudioSystem.init();
    const enabled = AudioSystem.toggleSfx();
    const btn = document.getElementById('toggle-sfx');
    btn.textContent = enabled ? 'ON' : 'OFF';
    btn.classList.toggle('active', enabled);
    if (enabled) {
        AudioSystem.playClick();
    }
});

gameLoop();
