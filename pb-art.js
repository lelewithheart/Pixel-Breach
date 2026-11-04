// Pixel Breach artwork. Everything is drawn in code, so there are no image files to license.
// Loaded before classes.js. Game objects are only touched inside functions.

const Art = (() => {
    const TAU = Math.PI * 2;
    const MAP_SCALE = 2;
    const FLOORS = [
        { base: [62, 66, 72], seam: 'rgba(0,0,0,0.22)', kind: 'concrete' },
        { base: [60, 76, 92], seam: 'rgba(160,190,220,0.08)', kind: 'tile' },
        { base: [104, 76, 52], seam: 'rgba(0,0,0,0.28)', kind: 'wood' },
        { base: [74, 60, 92], seam: 'rgba(255,255,255,0.03)', kind: 'carpet' },
    ];

    function rnd(x, y, salt = 0) {
        const s = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
        return s - Math.floor(s);
    }

    // ── Map layer: painted once, redrawn only when walls or doors change ──
    const layer = document.createElement('canvas');
    let layerKey = '';

    function gridKey() {
        let h = 7;
        const g = gameState.grid;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const row = g[y];
            if (!row) return '';
            for (let x = 0; x < GRID_WIDTH; x++) h = (h * 31 + row[x]) | 0;
        }
        return `${h}:${gameState.doors.length}`;
    }

    /** Splits the floor into rooms, so each room can get its own surface. */
    function findRooms() {
        const g = gameState.grid;
        const room = Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_WIDTH).fill(-1));
        const door = new Set(gameState.doors.map((d) => `${Math.floor(d.x / TILE_SIZE)},${Math.floor(d.y / TILE_SIZE)}`));
        let next = 0;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (room[y][x] !== -1 || g[y][x] === 1) continue;
                const stack = [[x, y]];
                room[y][x] = next;
                while (stack.length) {
                    const [cx, cy] = stack.pop();
                    if (door.has(`${cx},${cy}`)) continue;
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = cx + dx, ny = cy + dy;
                        if (nx < 0 || ny < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) continue;
                        if (room[ny][nx] !== -1 || g[ny][nx] === 1) continue;
                        room[ny][nx] = next;
                        stack.push([nx, ny]);
                    }
                }
                next++;
            }
        }
        return room;
    }

    function paintFloor(c, x, y, px, py, floor) {
        const t = TILE_SIZE;
        const v = (rnd(x, y) - 0.5) * 8;
        const [r, g, b] = floor.base;
        c.fillStyle = `rgb(${r + v | 0},${g + v | 0},${b + v | 0})`;
        c.fillRect(px, py, t, t);
        c.strokeStyle = floor.seam;
        c.lineWidth = 1;
        if (floor.kind === 'wood') {
            for (let i = 0; i < 4; i++) {
                c.fillStyle = `rgba(${rnd(x, y, i) > 0.5 ? '255,210,160' : '0,0,0'},0.05)`;
                c.fillRect(px, py + i * 5, t, 4);
                c.beginPath();
                c.moveTo(px, py + i * 5);
                c.lineTo(px + t, py + i * 5);
                c.stroke();
            }
            c.beginPath();
            const joint = px + rnd(x, y, 9) * t;
            c.moveTo(joint, py);
            c.lineTo(joint, py + 5);
            c.stroke();
        } else if (floor.kind === 'tile') {
            if ((x + y) % 2) {
                c.fillStyle = 'rgba(255,255,255,0.025)';
                c.fillRect(px, py, t, t);
            }
            c.strokeRect(px + 0.5, py + 0.5, t - 1, t - 1);
        } else if (floor.kind === 'carpet') {
            for (let i = 0; i < 14; i++) {
                c.fillStyle = `rgba(255,255,255,${0.012 + rnd(x, y, i) * 0.02})`;
                c.fillRect(px + rnd(x, y, i + 20) * t, py + rnd(x, y, i + 40) * t, 1, 1);
            }
        } else {
            if (x % 2 === 0) { c.beginPath(); c.moveTo(px + 0.5, py); c.lineTo(px + 0.5, py + t); c.stroke(); }
            if (y % 2 === 0) { c.beginPath(); c.moveTo(px, py + 0.5); c.lineTo(px + t, py + 0.5); c.stroke(); }
            for (let i = 0; i < 5; i++) {
                c.fillStyle = `rgba(0,0,0,${rnd(x, y, i + 3) * 0.14})`;
                c.fillRect(px + rnd(x, y, i + 50) * t, py + rnd(x, y, i + 60) * t, 2, 1);
            }
            if (rnd(x, y, 8) > 0.965) {
                c.strokeStyle = 'rgba(0,0,0,0.35)';
                c.beginPath();
                c.moveTo(px + 2, py + 4);
                c.lineTo(px + 9, py + 10);
                c.lineTo(px + 8, py + 17);
                c.stroke();
            }
        }
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function paintCover(c, x, y, px, py) {
        const t = TILE_SIZE;
        c.fillStyle = 'rgba(0,0,0,0.4)';
        c.fillRect(px + 4, py + 5, t - 4, t - 4);
        if ((x * 7 + y * 3) % 3 === 0) {
            // Sandbags
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 2; col++) {
                    const ox = px + 1 + col * 9 + (row % 2) * 2;
                    const oy = py + 1 + row * 6;
                    c.fillStyle = row === 1 ? '#8a7b57' : '#9a8a63';
                    roundRect(c, ox, oy, 9, 6, 3);
                    c.fill();
                    c.strokeStyle = 'rgba(40,30,15,0.55)';
                    c.lineWidth = 1;
                    c.stroke();
                }
            }
        } else {
            // Wooden crate
            c.fillStyle = '#8a6636';
            c.fillRect(px + 2, py + 2, t - 4, t - 4);
            c.strokeStyle = '#4e3919';
            c.lineWidth = 2;
            c.strokeRect(px + 3, py + 3, t - 6, t - 6);
            c.lineWidth = 1.5;
            c.beginPath();
            c.moveTo(px + 4, py + 4);
            c.lineTo(px + t - 4, py + t - 4);
            c.moveTo(px + t - 4, py + 4);
            c.lineTo(px + 4, py + t - 4);
            c.stroke();
            c.fillStyle = 'rgba(255,225,170,0.18)';
            c.fillRect(px + 2, py + 2, t - 4, 2);
        }
    }

    function paintMap() {
        const g = gameState.grid;
        const t = TILE_SIZE;
        layer.width = GRID_WIDTH * t * MAP_SCALE;
        layer.height = GRID_HEIGHT * t * MAP_SCALE;
        const c = layer.getContext('2d');
        c.setTransform(MAP_SCALE, 0, 0, MAP_SCALE, 0, 0);
        const rooms = findRooms();
        const solid = (x, y) => x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT || g[y][x] === 1;

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (g[y][x] === 1) continue;
                paintFloor(c, x, y, x * t, y * t, FLOORS[Math.max(0, rooms[y][x]) % FLOORS.length]);
            }
        }

        // Soft contact shadows where walls meet the floor.
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (solid(x, y)) continue;
                const px = x * t, py = y * t;
                if (solid(x, y - 1)) {
                    const s = c.createLinearGradient(0, py, 0, py + 10);
                    s.addColorStop(0, 'rgba(0,0,0,0.5)');
                    s.addColorStop(1, 'rgba(0,0,0,0)');
                    c.fillStyle = s;
                    c.fillRect(px, py, t, 10);
                }
                if (solid(x - 1, y)) {
                    const s = c.createLinearGradient(px, 0, px + 8, 0);
                    s.addColorStop(0, 'rgba(0,0,0,0.38)');
                    s.addColorStop(1, 'rgba(0,0,0,0)');
                    c.fillStyle = s;
                    c.fillRect(px, py, 8, t);
                }
            }
        }

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const px = x * t, py = y * t;
                if (g[y][x] === 3) paintCover(c, x, y, px, py);
                if (g[y][x] === 2) {
                    c.strokeStyle = 'rgba(120,255,170,0.5)';
                    c.lineWidth = 2;
                    c.beginPath();
                    c.arc(px + t / 2, py + t / 2, 7, 0, TAU);
                    c.stroke();
                }
                if (g[y][x] !== 1) continue;
                c.fillStyle = '#4a5468';
                c.fillRect(px, py, t, t);
                // Panel seams along the wall top.
                c.fillStyle = 'rgba(0,0,0,0.16)';
                if ((x + y) % 3 === 0) c.fillRect(px + 9, py, 1, t);
                c.fillStyle = 'rgba(255,255,255,0.03)';
                c.fillRect(px + 2, py + 2, t - 4, t - 4);
                // Edges read as height.
                c.fillStyle = '#8a97ad';
                if (!solid(x, y - 1)) c.fillRect(px, py, t, 2);
                if (!solid(x - 1, y)) c.fillRect(px, py, 2, t);
                c.fillStyle = '#1b1f28';
                if (!solid(x, y + 1)) c.fillRect(px, py + t - 4, t, 4);
                if (!solid(x + 1, y)) c.fillRect(px + t - 2, py, 2, t);
            }
        }
    }

    function drawExits(ctx) {
        const g = gameState.grid;
        const t = TILE_SIZE;
        const pulse = 0.55 + 0.35 * Math.sin(Date.now() * 0.004);
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (g[y][x] !== 4) continue;
                const px = x * t, py = y * t;
                ctx.fillStyle = `rgba(40,255,130,${0.12 + pulse * 0.16})`;
                ctx.fillRect(px, py, t, t);
                ctx.strokeStyle = `rgba(90,255,160,${pulse})`;
                ctx.lineWidth = 1.5;
                if (g[y - 1]?.[x] !== 4) line(ctx, px, py + 1, px + t, py + 1);
                if (g[y + 1]?.[x] !== 4) line(ctx, px, py + t - 1, px + t, py + t - 1);
                if (g[y][x - 1] !== 4) line(ctx, px + 1, py, px + 1, py + t);
                if (g[y][x + 1] !== 4) line(ctx, px + t - 1, py, px + t - 1, py + t);
                if (g[y - 1]?.[x] !== 4 && g[y][x - 1] !== 4) {
                    ctx.fillStyle = '#b6ffd2';
                    ctx.font = 'bold 11px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText('EXIT', px + 4, py + 15);
                }
            }
        }
    }

    function line(ctx, a, b, c, d) {
        ctx.beginPath();
        ctx.moveTo(a, b);
        ctx.lineTo(c, d);
        ctx.stroke();
    }

    function drawMap(ctx) {
        const key = gridKey();
        if (key !== layerKey) {
            layerKey = key;
            paintMap();
        }
        ctx.drawImage(layer, 0, 0, GRID_WIDTH * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
        drawDecals(ctx);
        drawExits(ctx);
    }

    // ── Decals on the floor ──
    const decals = [];
    function decal(x, y, kind) {
        if (decals.length > 90) decals.shift();
        decals.push({ x, y, kind, a: Math.random() * TAU, seed: Math.random() * 1000 });
    }
    function drawDecals(ctx) {
        for (const d of decals) {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.a);
            if (d.kind === 'scorch') {
                const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
                g.addColorStop(0, 'rgba(0,0,0,0.65)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, 34, 0, TAU);
                ctx.fill();
            } else if (d.kind === 'body') {
                const p = PALETTES[d.type === 'heavy' ? 'heavy' : 'normal'];
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(2, 3, 12, 7, 0, 0, TAU);
                ctx.fill();
                ctx.fillStyle = p.cloth;
                ctx.beginPath();
                ctx.ellipse(0, 0, 11, 6, 0, 0, TAU);
                ctx.fill();
                ctx.fillStyle = p.vest;
                roundRect(ctx, -7, -4, 11, 8, 2);
                ctx.fill();
                ctx.fillStyle = p.helmet;
                ctx.beginPath();
                ctx.arc(9, -1, 4.6, 0, TAU);
                ctx.fill();
                ctx.strokeStyle = p.cloth;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                line(ctx, -4, 5, -11, 10);
                line(ctx, 3, -5, 1, -12);
            } else {
                ctx.fillStyle = 'rgba(95,14,18,0.8)';
                ctx.beginPath();
                ctx.ellipse(0, 0, 11, 7, 0, 0, TAU);
                ctx.fill();
                for (let i = 0; i < 5; i++) {
                    const a = rnd(d.seed, i) * TAU, r = 8 + rnd(i, d.seed) * 9;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1 + rnd(d.seed, i + 7) * 2, 0, TAU);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    // ── People ──
    const PALETTES = {
        player: { vest: '#24384f', cloth: '#16222f', helmet: '#101820', visor: '#55e6ff', skin: '#c79a7a', accent: '#55e6ff' },
        normal: { vest: '#6d2a2a', cloth: '#2a2024', helmet: '#26252a', visor: '#e0a13c', skin: '#b98a6a', accent: '#d9534f' },
        heavy: { vest: '#3c3f46', cloth: '#1f2024', helmet: '#7a1f1f', visor: '#ff6b4a', skin: '#b98a6a', accent: '#ff6b4a' },
    };

    function steps(o) {
        const moved = Math.hypot(o.x - (o._ax ?? o.x), o.y - (o._ay ?? o.y));
        o._ax = o.x;
        o._ay = o.y;
        o._walk = (o._walk || 0) + moved * 0.32;
        o._moving = moved > 0.05;
        return o._moving ? Math.sin(o._walk) : 0;
    }

    function shadow(ctx, x, y, r) {
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + 3, r, r * 0.86, 0, 0, TAU);
        ctx.fill();
    }

    function weaponLength(o) {
        const w = o.weapons && o.weapons[o.currentWeapon];
        const n = (w && w.name) || '';
        if (/Longshot/.test(n)) return 19;
        if (/Falcon|Breacher/.test(n)) return 15;
        if (/Viper/.test(n)) return 12;
        return 7;
    }

    function soldier(ctx, o, kind, opts = {}) {
        const p = PALETTES[kind];
        const s = o.size / 16;
        const stride = steps(o);
        shadow(ctx, o.x, o.y, 10 * s);
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.angle || 0);
        ctx.scale(s, s);
        if (kind === 'player' && o.stance === 'crouched') ctx.scale(0.9, 0.9);
        if (o.lean === 'left') ctx.translate(0, -3);
        if (o.lean === 'right') ctx.translate(0, 3);

        // Boots
        ctx.fillStyle = '#0d0f12';
        ctx.beginPath();
        ctx.ellipse(stride * 4, -4, 4, 2.6, 0, 0, TAU);
        ctx.ellipse(-stride * 4, 4, 4, 2.6, 0, 0, TAU);
        ctx.fill();

        // Pack and shoulders
        ctx.fillStyle = p.cloth;
        roundRect(ctx, -9, -6, 6, 12, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.5, 10, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = p.vest;
        roundRect(ctx, -5.5, -7, 10, 14, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(-3.5, -5, 6, 2);
        ctx.fillRect(-3.5, 3, 6, 2);

        // Weapon and arms
        const reach = weaponLength(o);
        ctx.strokeStyle = p.cloth;
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        line(ctx, 1, -8, 8, -1.5);
        line(ctx, 1, 8, 6, 1.5);
        ctx.fillStyle = '#16181c';
        ctx.fillRect(4, -1.7, reach, 3.4);
        ctx.fillStyle = '#3a3e45';
        ctx.fillRect(4 + reach - 3, -1, 3, 2);
        ctx.fillStyle = p.skin;
        ctx.beginPath();
        ctx.arc(8, -1.4, 1.9, 0, TAU);
        ctx.arc(6, 1.4, 1.9, 0, TAU);
        ctx.fill();

        // Head
        ctx.fillStyle = p.helmet;
        ctx.beginPath();
        ctx.arc(0.5, 0, 5.4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0.5, 0, 3.4, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
        ctx.strokeStyle = p.visor;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.arc(0.5, 0, 4.4, -0.7, 0.7);
        ctx.stroke();
        ctx.restore();

        if (opts.flash) {
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.beginPath();
            ctx.arc(o.x, o.y, 10 * s, 0, TAU);
            ctx.fill();
        }
    }

    /** Progress ring around an entity (reload, weapon swap). */
    function ring(ctx, x, y, r, pct, color) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, Math.min(1, pct)));
        ctx.stroke();
    }

    function body(x, y, angle, type) {
        if (decals.length > 90) decals.shift();
        decals.push({ x, y, kind: 'body', a: angle + 1.2, type, seed: Math.random() * 1000 });
    }

    function smoke(ctx, s) {
        const r = s.radius();
        if (r <= 0) return;
        const t = s.age * 0.0004;
        const fade = Math.min(1, (SMOKE_DURATION_MS - s.age) / 1500);
        for (let i = 0; i < 7; i++) {
            const a = s.seed + i * 1.7 + t;
            const ox = Math.cos(a) * r * 0.35, oy = Math.sin(a * 1.3) * r * 0.35;
            const rr = r * (0.55 + 0.1 * Math.sin(a * 2));
            const g = ctx.createRadialGradient(s.x + ox, s.y + oy, 0, s.x + ox, s.y + oy, rr);
            g.addColorStop(0, `rgba(205,210,220,${0.42 * fade})`);
            g.addColorStop(1, 'rgba(205,210,220,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(s.x + ox, s.y + oy, rr, 0, TAU);
            ctx.fill();
        }
    }

    function bar(ctx, x, y, pct, color) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 13, y, 26, 4);
        ctx.fillStyle = color;
        ctx.fillRect(x - 12, y + 1, 24 * Math.max(0, pct), 2);
    }

    function hostage(ctx, c) {
        const x = c.x, y = c.y;
        const seed = Math.floor(rnd(Math.floor(x / 40), Math.floor(y / 40)) * 4);
        const shirt = ['#c9a227', '#3f8f6b', '#b35c8e', '#4f7fb3'][seed];
        const hair = ['#2b2118', '#5a3a1e', '#b58d4f', '#1c1c20'][seed];
        if (c.dead) {
            decalOnce(c);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(1.1);
            ctx.fillStyle = '#4a4a4a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 9, 6, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#6a5a4f';
            ctx.beginPath();
            ctx.arc(8, 0, 4, 0, TAU);
            ctx.fill();
            ctx.restore();
            return;
        }
        const t = Date.now() * 0.005;
        if (!c.rescued) {
            ctx.strokeStyle = `rgba(255,214,90,${0.45 + 0.3 * Math.sin(t)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, 14 + Math.sin(t) * 1.5, 0, TAU);
            ctx.stroke();
        }
        shadow(ctx, x, y, 8);
        const shake = c.scared && !c.rescued ? Math.sin(Date.now() * 0.04) * 0.6 : 0;
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.ellipse(x + shake, y + 1, 8, 6.5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#c79a7a';
        ctx.beginPath();
        ctx.arc(x + shake, y - 1, 4.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.arc(x + shake, y - 1.6, 4.2, Math.PI, 0);
        ctx.fill();
        // Hands behind the head
        ctx.fillStyle = '#c79a7a';
        ctx.beginPath();
        ctx.arc(x - 5 + shake, y - 4, 1.8, 0, TAU);
        ctx.arc(x + 5 + shake, y - 4, 1.8, 0, TAU);
        ctx.fill();
        if (c.rescued) {
            ctx.strokeStyle = '#5dff9f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, TAU);
            ctx.stroke();
        }
    }

    function decalOnce(o) {
        if (o._decal) return;
        o._decal = true;
        decal(o.x, o.y, 'blood');
    }

    function door(ctx, d) {
        const t = TILE_SIZE;
        const px = Math.floor(d.x / t) * t, py = Math.floor(d.y / t) * t;
        const gx = px / t, gy = py / t;
        const g = gameState.grid;
        // A door between walls left and right runs horizontally.
        const horizontal = g[gy]?.[gx - 1] === 1 || g[gy]?.[gx + 1] === 1;
        ctx.save();
        ctx.translate(px + t / 2, py + t / 2);
        if (!horizontal) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#14171c';
        ctx.fillRect(-t / 2, -t / 2, t, t);
        if (d.open) {
            ctx.fillStyle = '#2a2f37';
            ctx.fillRect(-t / 2, -2, t, 4);
            ctx.save();
            ctx.translate(-t / 2 + 1, -1);
            ctx.rotate(-1.35);
            ctx.fillStyle = d.locked ? '#58606c' : '#7a5230';
            ctx.fillRect(0, -2, t - 2, 4);
            ctx.restore();
        } else {
            const body = d.locked ? '#5a6271' : '#7a5230';
            ctx.fillStyle = body;
            ctx.fillRect(-t / 2 + 1, -5, t - 2, 10);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(-t / 2 + 1, -5, t - 2, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(-t / 2 + 1, 3, t - 2, 2);
            ctx.fillStyle = '#d7b35c';
            ctx.fillRect(5, -1, 3, 2);
            if (d.locked) {
                const blink = Math.floor(Date.now() / 500) % 2;
                ctx.fillStyle = blink ? '#ff4b4b' : '#8c1f1f';
                ctx.beginPath();
                ctx.arc(0, 0, 2.6, 0, TAU);
                ctx.fill();
            }
        }
        ctx.restore();
        if (d.locked && d.health < d.maxHealth) bar(ctx, px + t / 2, py - 5, d.health / d.maxHealth, '#ff5a4a');
    }

    function grenade(ctx, g) {
        const flash = g.timer < 1000 && Math.floor(g.timer / 100) % 2 === 0;
        shadow(ctx, g.x, g.y, 4);
        ctx.fillStyle = '#39402f';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 4.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = flash ? '#ff5147' : '#8d9583';
        ctx.fillRect(g.x - 1, g.y - 6, 2, 3);
        if (flash) glow(ctx, g.x, g.y, 18, 'rgba(255,70,50,0.55)');
    }

    function bullet(ctx, b) {
        const friendly = b.owner === 'player';
        const tail = 14;
        const tx = b.x - Math.cos(b.angle) * tail, ty = b.y - Math.sin(b.angle) * tail;
        const g = ctx.createLinearGradient(tx, ty, b.x, b.y);
        g.addColorStop(0, 'rgba(255,220,120,0)');
        g.addColorStop(1, friendly ? 'rgba(255,240,170,0.95)' : 'rgba(255,130,70,0.95)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        line(ctx, tx, ty, b.x, b.y);
    }

    function particle(ctx, p) {
        const a = Math.max(0, p.lifetime / p.maxLifetime);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + a * 1.8, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function glow(ctx, x, y, r, color) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    // ── Short effects ──
    const flashes = [];
    function muzzle(x, y, angle) {
        if (flashes.length < 12) flashes.push({ x: x + Math.cos(angle) * 18, y: y + Math.sin(angle) * 18, angle, life: 3, kind: 'muzzle' });
    }
    function explosion(x, y, r) {
        flashes.push({ x, y, r, life: 16, maxLife: 16, kind: 'blast' });
        decal(x, y, 'scorch');
    }
    function flashburst(x, y) {
        flashes.push({ x, y, r: FLASHBANG_RADIUS, life: 14, maxLife: 14, kind: 'flashburst' });
    }
    function drawFlashes(ctx) {
        for (let i = flashes.length - 1; i >= 0; i--) {
            const f = flashes[i];
            if (f.kind === 'flashburst') {
                const k = f.life / f.maxLife;
                glow(ctx, f.x, f.y, f.r * (1.2 - k * 0.4), `rgba(255,255,255,${0.95 * k})`);
            } else if (f.kind === 'muzzle') {
                glow(ctx, f.x, f.y, 26, 'rgba(255,190,90,0.75)');
                ctx.save();
                ctx.translate(f.x, f.y);
                ctx.rotate(f.angle);
                ctx.fillStyle = '#fff3c4';
                ctx.beginPath();
                ctx.moveTo(-2, -3);
                ctx.lineTo(9, 0);
                ctx.lineTo(-2, 3);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                const k = 1 - f.life / f.maxLife;
                glow(ctx, f.x, f.y, f.r * (0.7 + k), `rgba(255,150,50,${0.9 * (1 - k)})`);
                ctx.strokeStyle = `rgba(255,235,190,${1 - k})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r * k, 0, TAU);
                ctx.stroke();
            }
            if (--f.life <= 0) flashes.splice(i, 1);
        }
    }

    // ── Flashlight: walls cut the light, the rest of the room stays dim ──
    const dark = document.createElement('canvas');
    dark.width = GRID_WIDTH * TILE_SIZE;
    dark.height = GRID_HEIGHT * TILE_SIZE;
    const dctx = dark.getContext('2d');
    const RAYS = 90;
    const DARKNESS = 0.78; // How dark the room is outside the flashlight

    function castRay(x, y, a, max) {
        const dx = Math.cos(a), dy = Math.sin(a);
        const g = gameState.grid;
        for (let d = 8; d < max; d += 5) {
            const gx = Math.floor((x + dx * d) / TILE_SIZE), gy = Math.floor((y + dy * d) / TILE_SIZE);
            if (g[gy]?.[gx] === 1) return d;
            const door = doorAtTile(gx, gy);
            if (door && !door.open) return d;
        }
        return max;
    }

    function fan(x, y, from, to, max) {
        dctx.beginPath();
        dctx.moveTo(x, y);
        for (let i = 0; i <= RAYS; i++) {
            const a = from + (to - from) * (i / RAYS);
            const d = castRay(x, y, a, max);
            dctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
        }
        dctx.closePath();
    }

    /** Darkness layer in world space. Draw it with the camera transform active. */
    function drawLight(ctx) {
        const p = gameState.player;
        if (!p) return;
        const W = dark.width, H = dark.height;
        dctx.setTransform(1, 0, 0, 1, 0, 0);
        dctx.globalCompositeOperation = 'source-over';
        dctx.clearRect(0, 0, W, H);
        dctx.fillStyle = `rgba(5,8,16,${DARKNESS})`;
        dctx.fillRect(0, 0, W, H);
        dctx.globalCompositeOperation = 'destination-out';

        const near = dctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, PLAYER_NEAR_LIGHT);
        near.addColorStop(0, 'rgba(0,0,0,0.9)');
        near.addColorStop(1, 'rgba(0,0,0,0)');
        fan(p.x, p.y, 0, TAU, PLAYER_NEAR_LIGHT);
        dctx.fillStyle = near;
        dctx.fill();

        const half = PLAYER_VIEW_ANGLE / 2;
        const beam = dctx.createRadialGradient(p.x, p.y, 16, p.x, p.y, 340);
        beam.addColorStop(0, 'rgba(0,0,0,1)');
        beam.addColorStop(0.6, 'rgba(0,0,0,0.8)');
        beam.addColorStop(1, 'rgba(0,0,0,0)');
        fan(p.x, p.y, p.angle - half, p.angle + half, 340);
        dctx.fillStyle = beam;
        dctx.fill();

        // Smoke clouds glow a little, so they are visible in the dark.
        for (const s of gameState.smokes) {
            const r = s.radius();
            if (r <= 0) continue;
            const g = dctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
            g.addColorStop(0, 'rgba(0,0,0,0.5)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            dctx.fillStyle = g;
            dctx.beginPath();
            dctx.arc(s.x, s.y, r, 0, TAU);
            dctx.fill();
        }
        dctx.globalCompositeOperation = 'source-over';

        ctx.drawImage(dark, 0, 0, W, H);
    }

    /** Is a world point lit for the player (inside the beam or the near circle, with line of sight)? */
    function isLit(x, y) {
        const p = gameState.player;
        if (!p) return true;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d > 340) return false;
        if (d > PLAYER_NEAR_LIGHT) {
            const a = Math.atan2(y - p.y, x - p.x);
            if (angleDelta(a, p.angle) > PLAYER_VIEW_ANGLE / 2) return false;
        }
        return lineOfSight(p.x, p.y, x, y);
    }

    function reset() {
        decals.length = 0;
        flashes.length = 0;
        layerKey = '';
    }

    return { drawMap, soldier, ring, body, smoke, bar, hostage, door, grenade, bullet, particle, muzzle, explosion, flashburst, decal, drawFlashes, drawLight, isLit, reset };
})();
