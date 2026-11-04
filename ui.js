// DOM side of the game: panels, overlays, menus and input.

const CONTROLS = [
    ['W A S D', 'Move'], ['SHIFT', 'Sprint'], ['C', 'Crouch (less spread, slower)'], ['Q / F', 'Lean left / right'],
    ['MOUSE', 'Aim'], ['LEFT CLICK', 'Fire'], ['R', 'Reload'], ['1 / 2 / WHEEL', 'Switch weapon'],
    ['E', 'Rescue hostage, open door, lockpick'], ['SPACE', 'Use equipment'], ['ESC', 'Pause'],
];

function renderControls(el) {
    el.innerHTML = CONTROLS.map(([k, v]) => `<div class="key-row"><kbd>${k}</kbd><span>${v}</span></div>`).join('');
}

const DIFFICULTY_COLORS = { easy: '#5dff9f', medium: '#ffd25a', hard: '#ff5a4a', endless: '#55e6ff' };

function renderObjectivesPanel() {
    const list = document.getElementById('objectives-list');
    if (!list) return;
    list.innerHTML = getObjectiveState().map(it => `
        <div class="objective-item ${it.done ? 'objective-complete' : 'objective-incomplete'}">
            <span>${it.done ? '✓' : '•'} ${it.label}</span><span>${it.progress}</span>
        </div>`).join('');
}

function updateUI() {
    const m = gameState.currentMission;
    if (m) {
        document.getElementById('mission-name').textContent = m.name;
        const diff = document.getElementById('mission-diff');
        diff.textContent = (m.difficulty || 'custom').toUpperCase();
        diff.style.color = DIFFICULTY_COLORS[m.difficulty] || '#9aa3ad';
        document.getElementById('mission-desc').textContent = m.description || '';
    }
    renderObjectivesPanel();

    const player = gameState.player;
    if (!player) return;
    const slot = (id, key, weapon, active) => {
        const el = document.getElementById(id);
        el.classList.toggle('active', active);
        el.innerHTML = `<div><kbd>${key}</kbd> ${PB.esc(weapon.name.toUpperCase())}</div><div class="slot-sub">${weapon.currentAmmo} / ${weapon.reserveAmmo}</div>`;
    };
    slot('primary-weapon', '1', player.weapons.primary, player.currentWeapon === 'primary');
    slot('secondary-weapon', '2', player.weapons.secondary, player.currentWeapon === 'secondary');
    const eq = document.getElementById('equipment-slot');
    eq.innerHTML = `<div><kbd>SPACE</kbd> ${PB.esc(player.equipment.name.toUpperCase())}</div><div class="slot-sub">x${player.equipment.quantity}</div>`;
}

// ── Input ──

document.addEventListener('keydown', (e) => {
    const inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (inField) return;

    if (e.key === 'Escape') {
        if (gameState.screen === 'playing' && (gameState.playing || gameState.paused)) { e.preventDefault(); togglePause(); }
        return;
    }
    if (gameState.screen === 'briefing' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startPlay();
        return;
    }
    if (gameState.screen === 'lockpick') {
        if (e.key === ' ') { e.preventDefault(); attemptLockpick(); }
        return;
    }

    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Shift') keys['Shift'] = true;

    if (!gameState.playing || !gameState.player) return;
    const p = gameState.player;
    if (e.key === ' ') { e.preventDefault(); if (!e.repeat) p.useEquipment(); }
    if (e.repeat) return;
    switch (e.key.toLowerCase()) {
        case 'r': p.reload(); break;
        case '1': p.switchWeapon('primary'); break;
        case '2': p.switchWeapon('secondary'); break;
        case 'e': p.interact(); break;
        case 'c':
            p.stance = p.stance === 'crouched' ? 'standing' : 'crouched';
            HUD.notice(p.stance === 'crouched' ? 'Crouched: steadier aim, slower' : 'Standing');
            break;
        case 'q': p.lean = p.lean === 'left' ? 'none' : 'left'; break;
        case 'f': p.lean = p.lean === 'right' ? 'none' : 'right'; break;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === 'Shift') keys['Shift'] = false;
});

window.addEventListener('blur', () => {
    for (const key in keys) keys[key] = false;
    mouse.down = false;
    if (gameState.playing && gameState.screen === 'playing') pauseGame();
});

function updateMouseScreen(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.sx = (e.clientX - rect.left) * VIEW_W / rect.width;
    mouse.sy = (e.clientY - rect.top) * VIEW_H / rect.height;
}

canvas.addEventListener('mousemove', updateMouseScreen);
canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    updateMouseScreen(e);
    mouse.down = true;
    if (gameState.playing && gameState.player) {
        updateMouseWorld();
        gameState.player.shoot(true);
    }
});
canvas.addEventListener('mouseup', () => { mouse.down = false; });
canvas.addEventListener('mouseleave', () => { mouse.down = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
    if (!gameState.playing || !gameState.player) return;
    e.preventDefault();
    gameState.player.switchWeapon(gameState.player.currentWeapon === 'primary' ? 'secondary' : 'primary');
}, { passive: false });

// ── Briefing and pause ──

function showBriefing() {
    const m = gameState.currentMission || {};
    document.getElementById('brief-title').textContent = m.name || 'Custom map';
    const meta = document.getElementById('brief-meta');
    meta.textContent = `${(m.difficulty || 'custom').toUpperCase()} · ${gameState.enemyTotal} hostiles · ${gameState.civilians.length} hostages`;
    meta.style.color = DIFFICULTY_COLORS[m.difficulty] || '#9aa3ad';
    document.getElementById('brief-desc').textContent = m.description || '';
    document.getElementById('brief-objectives').innerHTML = getObjectiveState().map(it => `<li>${PB.esc(it.label)}</li>`).join('');
    const tips = (m.tutorialSteps || []).slice();
    if (gameState.endlessMode) gameState.endlessModifiers.forEach(mod => tips.unshift(`${mod.name}: ${mod.desc}`));
    const tipsBox = document.getElementById('brief-tips-box');
    tipsBox.style.display = tips.length ? '' : 'none';
    document.getElementById('brief-tips').innerHTML = tips.map(t => `<li>${PB.esc(t)}</li>`).join('');
    renderControls(document.getElementById('brief-controls'));
    document.getElementById('briefing-screen').classList.add('active');
}

document.getElementById('btn-start-mission').addEventListener('click', () => { AudioSystem.playClick(); startPlay(); });
document.getElementById('btn-brief-menu').addEventListener('click', () => { AudioSystem.playClick(); backToMenu(); });
document.getElementById('btn-resume').addEventListener('click', () => { AudioSystem.playClick(); resumeGame(); });
document.getElementById('btn-restart').addEventListener('click', () => { AudioSystem.playClick(); restartCurrent(); });
document.getElementById('btn-controls').addEventListener('click', () => {
    AudioSystem.playClick();
    const box = document.getElementById('pause-controls');
    renderControls(box);
    box.classList.toggle('active');
});
document.getElementById('btn-quit').addEventListener('click', () => { AudioSystem.playClick(); backToMenu(); });

// ── Loadout ──

const SHOP_PRICES = { m4a1: 100, shotgun: 150, sniper: 200 };

function statBar(label, pct, value) {
    return `<div class="stat-row"><span>${label}</span><div class="stat-track"><div class="stat-fill" style="width:${Math.round(pct * 100)}%"></div></div><em>${value}</em></div>`;
}

function buildLoadoutGrid() {
    const maxDmg = 100, maxRpm = 600, maxMag = 30, maxReload = 2800;
    const weaponCard = (id, w, type) => {
        const rpm = Math.round(60000 / w.fireRate);
        const dmg = w.damage * (w.pellets || 1);
        return `<div class="loadout-option" data-type="${type}" data-weapon="${id}">
            <strong>${PB.esc(w.name)}</strong>
            ${statBar('DMG', Math.min(1, dmg / maxDmg), dmg + (w.pellets ? ' (' + w.pellets + ' pellets)' : ''))}
            ${statBar('RATE', Math.min(1, rpm / maxRpm), rpm + ' rpm' + (w.auto ? ' auto' : ''))}
            ${statBar('MAG', Math.min(1, w.magSize / maxMag), w.magSize + ' / ' + w.totalAmmo)}
            ${statBar('RELOAD', 1 - w.reloadTime / maxReload, (w.reloadTime / 1000).toFixed(1) + ' s')}
            <span class="lock-tag">FIELD SHOP · ${SHOP_PRICES[id] || 0} CR</span>
        </div>`;
    };
    document.getElementById('loadout-primary').innerHTML = ['mp5', 'm4a1', 'shotgun', 'sniper'].map(id => weaponCard(id, WEAPONS[id], 'primary')).join('');
    document.getElementById('loadout-secondary').innerHTML = ['m1911', 'glock'].map(id => weaponCard(id, WEAPONS[id], 'secondary')).join('');
    document.getElementById('loadout-equipment').innerHTML = Object.entries(EQUIPMENT).map(([id, e]) => `
        <div class="loadout-option" data-type="equipment" data-weapon="${id}">
            <strong>${PB.esc(e.name)}</strong><span class="pb-dim">x${e.quantity + (gameState.unlocks.bonusEquipment || 0)}</span><br>
            <span class="eq-desc">${PB.esc(e.desc)}</span>
        </div>`).join('');

    document.querySelectorAll('.loadout-option').forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('locked')) {
                PB.toast('Unlock this weapon in the Field Shop with credits from missions.');
                return;
            }
            AudioSystem.playClick();
            gameState.loadout[option.dataset.type] = option.dataset.weapon;
            writeJSON('pb_loadout', gameState.loadout);
            PB.refreshLoadout();
        });
    });
    PB.refreshLoadout();
}
buildLoadoutGrid();

function openLoadout() {
    buildLoadoutGrid();
    document.getElementById('loadout-credits').textContent = gameState.currency + ' CR';
    document.getElementById('loadout-modal').classList.add('active');
}

function beginMission(mission) {
    gameState.selectedMission = mission;
    gameState.selectedMapData = null;
    document.getElementById('level-select-screen').classList.remove('active');
    document.getElementById('home-screen').classList.remove('active');
    openLoadout();
}

document.getElementById('close-loadout').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('loadout-modal').classList.remove('active');
    gameState.selectedMission = null;
    gameState.selectedMapData = null;
    if (gameState.screen === 'home') document.getElementById('home-screen').classList.add('active');
});

document.getElementById('confirm-loadout').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('loadout-modal').classList.remove('active');
    if (gameState.selectedMission) {
        const m = gameState.selectedMission;
        gameState.selectedMission = null;
        loadMission(m.id);
    } else if (gameState.selectedMapData) {
        const data = gameState.selectedMapData;
        gameState.selectedMapData = null;
        loadLevelFromData(data);
    }
});

// ── Menus ──

document.getElementById('btn-campaign').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('level-select-screen').classList.add('active');

    const missionList = document.getElementById('mission-list');
    missionList.innerHTML = '';
    MISSIONS.forEach(mission => {
        const locked = mission.pack && !PB.packOwned();
        const prog = gameState.progress[mission.id];
        const ents = mission.mapData.entities || {};
        const row = document.createElement('div');
        row.className = 'mission-row' + (locked ? ' locked' : '') + (prog && prog.done ? ' done' : '');
        row.innerHTML = `
            <div class="mission-head">
                <strong>${prog && prog.done ? '✓ ' : ''}Mission ${mission.id}: ${PB.esc(mission.name)}${mission.pack ? ' · PACK' : ''}${locked ? ' 🔒' : ''}</strong>
                <span style="color: ${DIFFICULTY_COLORS[mission.difficulty] || '#888'};">${(mission.difficulty || 'medium').toUpperCase()}</span>
            </div>
            <span class="mission-desc">${PB.esc(mission.description)}</span>
            <div class="mission-meta">${(ents.enemies || []).length} hostiles · ${(ents.civilians || []).length} hostages${prog && prog.done ? ' · best ' + HUD.fmtTime(prog.best) : ''}</div>`;
        row.addEventListener('click', () => {
            AudioSystem.playSelect();
            if (locked) {
                PB.openPack(() => document.getElementById('btn-campaign').click());
                return;
            }
            beginMission(mission);
        });
        missionList.appendChild(row);
    });
});

document.getElementById('btn-community').addEventListener('click', async () => {
    AudioSystem.playClick();
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('community-screen').classList.add('active');

    const communityList = document.getElementById('community-list');
    const maps = await loadCommunityMaps();
    communityList.innerHTML = '';

    if (maps.length > 0) {
        maps.forEach(map => {
            const row = document.createElement('div');
            row.className = 'mission-row';
            row.innerHTML = `
                <div class="mission-head"><strong>${PB.esc(map.name)}</strong><span class="pb-dim">${PB.esc(map.source || '')}</span></div>
                <span class="mission-desc">${PB.esc(map.description)}</span>
                <div class="mission-meta">By ${PB.esc(map.author)}</div>`;
            row.addEventListener('click', () => {
                AudioSystem.playSelect();
                gameState.selectedMission = null;
                gameState.selectedMapData = map.data;
                document.getElementById('community-screen').classList.remove('active');
                openLoadout();
            });
            communityList.appendChild(row);
        });
    } else {
        communityList.innerHTML = '<p class="pb-dim">No saved level yet. Build one in the Level Editor and press Save, then it shows up here.</p>';
    }

    const loadFileDiv = document.createElement('div');
    loadFileDiv.style.cssText = 'padding: 15px 0 0; text-align: center;';
    loadFileDiv.innerHTML = `<p class="pb-dim" style="margin-bottom: 8px;">Or load a map file somebody shared with you:</p>
        <button id="community-load-file">📂 LOAD MAP FILE</button>`;
    communityList.appendChild(loadFileDiv);
    document.getElementById('community-load-file').addEventListener('click', () => {
        AudioSystem.playClick();
        document.getElementById('map-file-input').click();
    });
});

document.getElementById('btn-editor-home').addEventListener('click', () => {
    AudioSystem.playClick();
    window.location.href = 'editor/editor.html';
});

document.getElementById('btn-load-map').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('map-file-input').click();
});

document.getElementById('map-file-input').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!MapLoader.validateMap(data)) throw new Error('invalid');
                gameState.selectedMission = null;
                gameState.selectedMapData = data;
                document.getElementById('community-screen').classList.remove('active');
                document.getElementById('home-screen').classList.remove('active');
                openLoadout();
            } catch (err) {
                PB.toast('This map file is not valid.');
            }
        };
        reader.readAsText(file);
    }
});

document.getElementById('btn-how').addEventListener('click', () => {
    AudioSystem.playClick();
    const box = document.createElement('div');
    renderControls(box);
    PB.dialog({
        title: 'HOW TO PLAY',
        html: `<p>Clear every hostile, rescue the hostages with <kbd>E</kbd>, then reach the green EXIT. Hostages die to stray bullets, so check your fire.</p>
            <p class="pb-dim">Enemies hear gunshots and investigate. Closed doors and smoke block their view. Crouching tightens your aim, sprinting widens it.</p>
            <div class="key-grid">${box.innerHTML}</div>`,
        buttons: [{ label: 'CLOSE', primary: true }],
    });
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

document.getElementById('cancel-lockpick').addEventListener('click', () => {
    AudioSystem.playClick();
    closeLockpick();
});

setInterval(() => {
    if (gameState.screen === 'lockpick') updateLockpick();
}, 16);

// ── Audio ──

function initAudioOnInteraction() {
    if (!AudioSystem.initialized) {
        AudioSystem.init();
        AudioSystem.playMusic("menu");
    }
    document.removeEventListener("click", initAudioOnInteraction);
    document.removeEventListener("keydown", initAudioOnInteraction);
}
document.addEventListener("click", initAudioOnInteraction);
document.addEventListener("keydown", initAudioOnInteraction);

document.getElementById("toggle-music").addEventListener("click", () => {
    AudioSystem.init();
    const enabled = AudioSystem.toggleMusic();
    const btn = document.getElementById("toggle-music");
    btn.textContent = enabled ? "ON" : "OFF";
    btn.classList.toggle("active", enabled);
    if (enabled) AudioSystem.playMusic(gameState.playing ? 'gameplay' : 'menu');
    AudioSystem.playClick();
});

document.getElementById("master-volume").addEventListener("input", (e) => {
    AudioSystem.init();
    AudioSystem.setMasterVolume(e.target.value / 100);
});

document.getElementById('toggle-sfx').addEventListener('click', () => {
    AudioSystem.init();
    const enabled = AudioSystem.toggleSfx();
    const btn = document.getElementById('toggle-sfx');
    btn.textContent = enabled ? 'ON' : 'OFF';
    btn.classList.toggle('active', enabled);
    if (enabled) AudioSystem.playClick();
});

document.getElementById('btn-endless').addEventListener('click', () => {
    AudioSystem.playClick();
    document.getElementById('home-screen').classList.remove('active');
    startEndlessMode();
});
document.getElementById('btn-shop').addEventListener('click', () => {
    AudioSystem.playClick();
    PB.openShop();
});
document.getElementById('btn-pack').addEventListener('click', () => {
    AudioSystem.playClick();
    PB.openPack();
});
document.getElementById('btn-pause-hint').addEventListener('click', () => { if (gameState.screen === 'playing') togglePause(); });

// ── Boot ──
initGrid();
document.getElementById('game-container').style.display = 'none';
gameLoop();
