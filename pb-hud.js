// Pixel Breach in-game HUD. Drawn on the canvas in screen space (800x600 logical units) after the world.
// Reads gameState, cam and mouse; other code only pushes events in (damage, hit, banner, shake...).

const HUD = (() => {
    const FONT = "'Courier New', monospace";
    const ACCENT = '#55e6ff';
    const AMBER = '#ffc857';
    const RED = '#ff5a4a';
    const GREEN = '#5dff9f';

    const state = {
        damageAt: -1e9,
        damageFrom: null,
        hitmarkAt: -1e9,
        hitmarkKill: false,
        floaters: [],
        banners: [],
        notice: null,
        shake: { mag: 0, until: 0 },
        whiteUntil: 0,
        whiteMs: 1,
        heartbeatAt: 0,
        weaponShownAt: -1e9,
    };

    const now = () => gameState.now;

    function worldToScreen(x, y) {
        return { x: (x - cam.x) * ZOOM, y: (y - cam.y) * ZOOM };
    }

    // ── Events ──
    function damage(from) {
        state.damageAt = now();
        state.damageFrom = from ? { x: from.x, y: from.y } : null;
    }
    function hit(x, y, dmg, kill) {
        state.hitmarkAt = now();
        state.hitmarkKill = !!kill;
        state.floaters.push({ x, y, text: String(dmg), start: now(), color: kill ? RED : '#fff' });
        if (state.floaters.length > 20) state.floaters.shift();
    }
    function banner(title, sub = '', ms = 1500) {
        state.banners.push({ title, sub, ms, start: null });
    }
    function notice(text, ms = 1500) {
        state.notice = { text, start: now(), ms };
    }
    function shake(mag, ms) {
        if (mag >= state.shake.mag || now() > state.shake.until) {
            state.shake.mag = mag;
            state.shake.until = now() + ms;
        }
    }
    function whiteFlash(ms) {
        state.whiteUntil = now() + ms;
        state.whiteMs = ms;
    }
    function weaponChanged() {
        state.weaponShownAt = now();
    }
    function shakeOffset() {
        if (now() > state.shake.until) return { x: 0, y: 0 };
        const k = (state.shake.until - now()) / 300;
        const m = state.shake.mag * Math.min(1, k);
        return { x: (Math.random() - 0.5) * 2 * m, y: (Math.random() - 0.5) * 2 * m };
    }
    function reset() {
        state.damageAt = -1e9;
        state.hitmarkAt = -1e9;
        state.floaters.length = 0;
        state.banners.length = 0;
        state.notice = null;
        state.shake.until = 0;
        state.whiteUntil = 0;
        state.heartbeatAt = 0;
    }

    // ── Drawing helpers ──
    function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
        ctx.font = `${weight} ${size}px ${FONT}`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(str, x, y);
    }
    function panel(ctx, x, y, w, h, alpha = 0.55) {
        ctx.fillStyle = `rgba(8,12,18,${alpha})`;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(85,230,255,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    function barLine(ctx, x, y, w, h, pct, color) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, pct)), h - 2);
    }
    function keycap(ctx, key, x, y) {
        const w = 10 + key.length * 8;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillRect(x, y - 11, w, 15);
        text(ctx, key, x + w / 2, y + 1, 11, '#0c1016', 'center');
        return w;
    }
    function fmtTime(ms) {
        const s = Math.floor(ms / 1000);
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }

    // ── Sections ──
    function drawCrosshair(ctx, p) {
        const sx = mouse.sx, sy = mouse.sy;
        let overEnemy = false;
        for (const e of gameState.enemies) {
            if (Math.hypot(e.x - mouse.x, e.y - mouse.y) < 12 && Art.isLit(e.x, e.y)) { overEnemy = true; break; }
        }
        const gap = 5 + p.spread() * 150 + (p.reloading ? 6 : 0);
        const len = 7;
        ctx.strokeStyle = overEnemy ? RED : 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - gap - len, sy); ctx.lineTo(sx - gap, sy);
        ctx.moveTo(sx + gap, sy); ctx.lineTo(sx + gap + len, sy);
        ctx.moveTo(sx, sy - gap - len); ctx.lineTo(sx, sy - gap);
        ctx.moveTo(sx, sy + gap); ctx.lineTo(sx, sy + gap + len);
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(sx - 1, sy - 1, 2, 2);

        const age = now() - state.hitmarkAt;
        const life = state.hitmarkKill ? 350 : 160;
        if (age < life) {
            const k = 1 - age / life;
            const r = (state.hitmarkKill ? 14 : 9) + (1 - k) * 4;
            ctx.strokeStyle = state.hitmarkKill ? `rgba(255,80,70,${k})` : `rgba(255,255,255,${k})`;
            ctx.lineWidth = state.hitmarkKill ? 3 : 2;
            ctx.beginPath();
            for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                ctx.moveTo(sx + dx * 4, sy + dy * 4);
                ctx.lineTo(sx + dx * r, sy + dy * r);
            }
            ctx.stroke();
        }
    }

    function drawVitals(ctx, p) {
        const x = 16, w = 190;
        let y = VIEW_H - 16;
        const showStamina = p.stamina < p.maxStamina - 0.5;
        const h = showStamina ? 64 : 50;
        panel(ctx, x - 6, y - h, w + 12, h + 6);
        if (showStamina) {
            barLine(ctx, x, y - 10, w, 6, p.stamina / p.maxStamina, AMBER);
            y -= 14;
        }
        barLine(ctx, x, y - 14, w, 10, p.armor / p.maxArmor, '#55a8ff');
        text(ctx, 'ARMOR', x, y - 17, 9, 'rgba(255,255,255,0.7)');
        text(ctx, Math.ceil(p.armor), x + w, y - 17, 10, '#fff', 'right');
        y -= 30;
        const hp = p.health / p.maxHealth;
        barLine(ctx, x, y - 14, w, 12, hp, hp < 0.35 ? RED : '#ff6b5e');
        text(ctx, 'HEALTH', x, y - 17, 9, 'rgba(255,255,255,0.7)');
        text(ctx, Math.ceil(p.health), x + w, y - 17, 12, hp < 0.35 ? RED : '#fff', 'right');
    }

    function drawAmmo(ctx, p) {
        const w = 210, h = 92;
        const x = VIEW_W - 16 - w, y = VIEW_H - 16 - h;
        panel(ctx, x, y, w, h);
        const weapon = p.swapping ? p.weapons[p.pendingWeapon] : p.weapon;
        const slotKey = (p.swapping ? p.pendingWeapon : p.currentWeapon) === 'primary' ? '1' : '2';
        const other = p.currentWeapon === 'primary' ? p.weapons.secondary : p.weapons.primary;

        // Name and slot
        keycap(ctx, slotKey, x + 10, y + 20);
        text(ctx, weapon.name.toUpperCase(), x + 34, y + 21, 11, AMBER);

        // Big ammo
        const low = weapon.currentAmmo <= Math.max(1, Math.floor(weapon.magSize * 0.25));
        const empty = weapon.currentAmmo === 0;
        const blink = Math.floor(Date.now() / 300) % 2 === 0;
        let ammoColor = '#fff';
        if (empty) ammoColor = blink ? RED : '#8a2b24';
        else if (low) ammoColor = AMBER;
        text(ctx, String(weapon.currentAmmo), x + 10, y + 58, 32, ammoColor);
        text(ctx, '/ ' + weapon.reserveAmmo, x + 10 + ctx.measureText(String(weapon.currentAmmo)).width + 6, y + 58, 14, 'rgba(255,255,255,0.7)');

        // Magazine pips
        const pipW = Math.max(2, Math.min(6, Math.floor(120 / weapon.magSize) - 1));
        for (let i = 0; i < weapon.magSize; i++) {
            ctx.fillStyle = i < weapon.currentAmmo ? (low ? AMBER : ACCENT) : 'rgba(255,255,255,0.15)';
            ctx.fillRect(x + 10 + i * (pipW + 1), y + 64, pipW, 5);
        }

        // Status line: reload / swap / hint
        if (p.reloading) {
            const pct = (now() - p.reloadStart) / Math.max(1, p.reloadEnd - p.reloadStart);
            barLine(ctx, x + 10, y + 74, w - 20, 8, pct, AMBER);
            text(ctx, 'RELOADING', x + w / 2, y + 81, 8, '#0c1016', 'center');
        } else if (p.swapping) {
            const pct = 1 - (p.swapEnd - now()) / Math.max(1, weapon.swapTime || 400);
            barLine(ctx, x + 10, y + 74, w - 20, 8, pct, ACCENT);
            text(ctx, 'SWITCHING', x + w / 2, y + 81, 8, '#0c1016', 'center');
        } else if (empty) {
            if (weapon.reserveAmmo > 0) text(ctx, blink ? 'RELOAD  [R]' : '', x + 10, y + 82, 11, RED);
            else text(ctx, 'OUT OF AMMO  ·  SWITCH [' + (slotKey === '1' ? '2' : '1') + ']', x + 10, y + 82, 10, RED);
        } else if (low && weapon.reserveAmmo > 0) {
            text(ctx, 'LOW  ·  RELOAD [R]', x + 10, y + 82, 10, AMBER);
        } else {
            text(ctx, `${slotKey === '1' ? '2' : '1'}  ${other.name.toUpperCase()}  ${other.currentAmmo}/${other.reserveAmmo}`, x + 10, y + 82, 9, 'rgba(255,255,255,0.55)');
        }

        // Equipment, right column
        const eq = p.equipment;
        const ex = x + w - 10;
        text(ctx, eq.name.toUpperCase(), ex, y + 40, 9, eq.quantity > 0 ? '#fff' : 'rgba(255,255,255,0.4)', 'right');
        text(ctx, 'x' + eq.quantity, ex, y + 58, 16, eq.quantity > 0 ? GREEN : 'rgba(255,255,255,0.35)', 'right');
        ctx.font = `bold 11px ${FONT}`;
        const capW = 10 + 'SPACE'.length * 8;
        keycap(ctx, 'SPACE', ex - capW, y + 20);

        // Notice above the panel
        if (state.notice && now() - state.notice.start < state.notice.ms) {
            const k = 1 - (now() - state.notice.start) / state.notice.ms;
            text(ctx, state.notice.text, x + w, y - 8, 11, `rgba(255,200,87,${Math.min(1, k * 3)})`, 'right');
        }
    }

    function drawObjectives(ctx) {
        const items = getObjectiveState();
        const x = 16, y = 16;
        const w = 230, h = 18 + items.length * 16 + 8;
        panel(ctx, x, y, w, h);
        const title = gameState.endlessMode ? `WAVE ${gameState.endlessWave}` : (gameState.currentMission?.name || 'MISSION').toUpperCase();
        text(ctx, title, x + 10, y + 14, 10, ACCENT);
        text(ctx, fmtTime(missionTimeMs()), x + w - 10, y + 14, 10, 'rgba(255,255,255,0.7)', 'right');
        items.forEach((it, i) => {
            const yy = y + 30 + i * 16;
            const color = it.done ? GREEN : '#fff';
            text(ctx, it.done ? '✓' : '•', x + 12, yy, 11, color, 'center');
            text(ctx, it.label, x + 24, yy, 10, color, 'left', it.done ? 'normal' : 'bold');
            if (it.progress) text(ctx, it.progress, x + w - 10, yy, 10, color, 'right');
        });
    }

    function drawPrompt(ctx, p) {
        const target = p.interactTarget();
        if (!target) return;
        const s = worldToScreen(target.obj.x, target.obj.y);
        const label = target.label;
        const w = 30 + label.length * 8;
        const x = s.x - w / 2, y = s.y - 34;
        panel(ctx, x, y - 14, w, 22, 0.75);
        const kw = keycap(ctx, 'E', x + 6, y + 1);
        text(ctx, label, x + 6 + kw + 6, y + 2, 11, '#fff');
    }

    function drawDamage(ctx, p) {
        const age = now() - state.damageAt;
        if (age < 300) {
            const k = 1 - age / 300;
            const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 200, VIEW_W / 2, VIEW_H / 2, 520);
            g.addColorStop(0, 'rgba(200,0,0,0)');
            g.addColorStop(1, `rgba(200,0,0,${0.6 * k})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
        if (age < 900 && state.damageFrom) {
            const k = 1 - age / 900;
            const ps = worldToScreen(p.x, p.y);
            const a = Math.atan2(state.damageFrom.y - p.y, state.damageFrom.x - p.x);
            ctx.strokeStyle = `rgba(255,70,60,${k})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(ps.x, ps.y, 46, a - 0.45, a + 0.45);
            ctx.stroke();
        }
        const hp = p.health / p.maxHealth;
        if (hp < 0.35 && p.health > 0) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
            const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 180, VIEW_W / 2, VIEW_H / 2, 520);
            g.addColorStop(0, 'rgba(150,0,0,0)');
            g.addColorStop(1, `rgba(150,0,0,${(0.35 - hp) * (0.9 + 0.5 * pulse)})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
            if (gameState.playing && Date.now() - state.heartbeatAt > 950) {
                state.heartbeatAt = Date.now();
                AudioSystem.playHeartbeat();
            }
        }
    }

    function drawVignette(ctx) {
        const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 260, VIEW_W / 2, VIEW_H / 2, 540);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    function drawFloaters(ctx) {
        for (let i = state.floaters.length - 1; i >= 0; i--) {
            const f = state.floaters[i];
            const age = now() - f.start;
            if (age > 700) { state.floaters.splice(i, 1); continue; }
            const k = age / 700;
            const s = worldToScreen(f.x, f.y);
            ctx.globalAlpha = 1 - k * k;
            text(ctx, f.text, s.x + 1, s.y - k * 26 + 1, 12, 'rgba(0,0,0,0.8)', 'center');
            text(ctx, f.text, s.x, s.y - k * 26, 12, f.color, 'center');
            ctx.globalAlpha = 1;
        }
    }

    function drawBanners(ctx) {
        const b = state.banners[0];
        if (!b) return;
        if (b.start === null) b.start = now();
        const age = now() - b.start;
        if (age > b.ms) { state.banners.shift(); return; }
        const fadeIn = Math.min(1, age / 150), fadeOut = Math.min(1, (b.ms - age) / 300);
        const k = Math.min(fadeIn, fadeOut);
        ctx.globalAlpha = k;
        const y = VIEW_H * 0.3;
        ctx.fillStyle = 'rgba(8,12,18,0.7)';
        ctx.fillRect(VIEW_W / 2 - 220, y - 30, 440, b.sub ? 58 : 44);
        ctx.fillStyle = ACCENT;
        ctx.fillRect(VIEW_W / 2 - 220, y - 30, 440, 2);
        text(ctx, b.title, VIEW_W / 2, y, 22, '#fff', 'center');
        if (b.sub) text(ctx, b.sub, VIEW_W / 2, y + 19, 11, AMBER, 'center');
        ctx.globalAlpha = 1;
    }

    function drawExitGuide(ctx, p) {
        const o = gameState.objectives;
        if (!(o.eliminateEnemies && o.rescueHostages && !o.reachExtraction)) return;
        let best = null, bestD = Infinity;
        for (let gy = 0; gy < GRID_HEIGHT; gy++) {
            for (let gx = 0; gx < GRID_WIDTH; gx++) {
                if (gameState.grid[gy][gx] !== 4) continue;
                const wx = gx * TILE_SIZE + TILE_SIZE / 2, wy = gy * TILE_SIZE + TILE_SIZE / 2;
                const d = Math.hypot(wx - p.x, wy - p.y);
                if (d < bestD) { bestD = d; best = { x: wx, y: wy }; }
            }
        }
        if (!best) return;
        const s = worldToScreen(best.x, best.y);
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
        const inside = s.x > 20 && s.x < VIEW_W - 20 && s.y > 20 && s.y < VIEW_H - 20;
        if (inside) {
            ctx.strokeStyle = `rgba(90,255,160,${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 22 + pulse * 6, 0, Math.PI * 2);
            ctx.stroke();
            return;
        }
        const ps = worldToScreen(p.x, p.y);
        const a = Math.atan2(s.y - ps.y, s.x - ps.x);
        const ax = Math.max(30, Math.min(VIEW_W - 30, ps.x + Math.cos(a) * 2000));
        const ay = Math.max(30, Math.min(VIEW_H - 30, ps.y + Math.sin(a) * 2000));
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a);
        ctx.fillStyle = `rgba(90,255,160,${pulse})`;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-8, -9);
        ctx.lineTo(-8, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        text(ctx, 'EXIT', ax, ay - 16, 10, `rgba(182,255,210,${pulse})`, 'center');
    }

    function drawSpawnMarkers(ctx) {
        for (const m of gameState.spawnMarkers) {
            const s = worldToScreen(m.x, m.y);
            const k = (m.until - now()) / 1000;
            ctx.strokeStyle = `rgba(255,90,74,${0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.02))})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 10 + k * 14, 0, Math.PI * 2);
            ctx.stroke();
            text(ctx, '!', s.x, s.y + 4, 13, RED, 'center');
        }
    }

    function drawWhite(ctx) {
        const left = state.whiteUntil - now();
        if (left <= 0) return;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, left / state.whiteMs * 1.3)})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    function drawEndless(ctx) {
        if (!gameState.endlessMode) return;
        text(ctx, `SCORE ${gameState.endlessScore}`, VIEW_W / 2, 26, 12, '#fff', 'center');
        text(ctx, `HOSTILES ${gameState.enemies.length + gameState.spawnMarkers.length}`, VIEW_W / 2, 42, 10, 'rgba(255,255,255,0.7)', 'center');
    }

    /** Called once per frame with the screen-space transform active. */
    function draw(ctx) {
        const p = gameState.player;
        if (!p) return;
        drawVignette(ctx);
        drawDamage(ctx, p);
        drawSpawnMarkers(ctx);
        drawFloaters(ctx);
        drawExitGuide(ctx, p);
        drawPrompt(ctx, p);
        drawObjectives(ctx);
        drawEndless(ctx);
        drawVitals(ctx, p);
        drawAmmo(ctx, p);
        drawBanners(ctx);
        drawWhite(ctx);
        if (gameState.playing) drawCrosshair(ctx, p);
    }

    return { draw, damage, hit, banner, notice, shake, whiteFlash, weaponChanged, shakeOffset, reset, worldToScreen, fmtTime };
})();
