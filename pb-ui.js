// Pixel Breach: dialogs, Field Shop and Mission Pack.
// Replaces browser alert/prompt boxes, which portals often block.

const PB = (() => {
    const PACK_ID = 'pb-pack1';
    const PACK_PRICE = '€4.00';
    const PACK_URL = 'https://kelvik.at/pixelbreach';
    const PUBLIC_KEY = '2R9jCQ_bhDBqmtc5CyvxacyhUgYDVrHaHnABQpxxl8I';
    const OWNED_KEY = 'pb_pack1';

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    }

    function toast(text, ms = 2400) {
        let box = document.getElementById('pb-toasts');
        if (!box) {
            box = document.createElement('div');
            box.id = 'pb-toasts';
            document.body.appendChild(box);
        }
        const el = document.createElement('div');
        el.className = 'pb-toast';
        el.textContent = text;
        box.appendChild(el);
        setTimeout(() => el.remove(), ms);
    }

    /** buttons: [{ label, primary, action }]. An action returning false keeps the dialog open. */
    function dialog({ title, html, buttons }) {
        closeDialog();
        const wrap = document.createElement('div');
        wrap.id = 'pb-dialog';
        wrap.className = 'modal active';
        wrap.innerHTML = `<div class="modal-content pb-box"><h2>${esc(title)}</h2><div class="pb-body">${html}</div><div class="pb-actions"></div></div>`;
        const row = wrap.querySelector('.pb-actions');
        (buttons || [{ label: 'OK', primary: true }]).forEach((b) => {
            const btn = document.createElement('button');
            btn.textContent = b.label;
            if (b.primary) btn.className = 'active';
            btn.addEventListener('click', () => {
                if (b.action && b.action() === false) return;
                closeDialog();
            });
            row.appendChild(btn);
        });
        document.body.appendChild(wrap);
        return wrap;
    }
    function closeDialog() {
        const el = document.getElementById('pb-dialog');
        if (el) el.remove();
    }

    // ── Field Shop ──
    const SHOP_ITEMS = [
        { id: 'm4a1', name: () => WEAPONS.m4a1.name, cost: 100, once: true },
        { id: 'shotgun', name: () => WEAPONS.shotgun.name, cost: 150, once: true },
        { id: 'sniper', name: () => WEAPONS.sniper.name, cost: 200, once: true },
        { id: 'bonusHealth', name: () => '+10 Max Health', cost: 50, max: 5 },
        { id: 'bonusEquipment', name: () => '+1 Equipment Charge', cost: 75, max: 3 },
    ];

    function saveProgress() {
        write('pb_currency', String(gameState.currency));
        write('pb_unlocks', JSON.stringify(gameState.unlocks));
    }

    function buy(item) {
        const u = gameState.unlocks;
        if (gameState.currency < item.cost) return;
        if (item.once) {
            if (u[item.id]) return;
            u[item.id] = true;
        } else {
            if ((u[item.id] || 0) >= item.max) return;
            u[item.id] = (u[item.id] || 0) + 1;
        }
        gameState.currency -= item.cost;
        saveProgress();
        refreshLoadout();
        AudioSystem.playSelect();
        openShop();
    }

    function openShop(onClose) {
        if (onClose) openShop.after = onClose;
        const u = gameState.unlocks;
        const rows = SHOP_ITEMS.map((item, i) => {
            const count = u[item.id] || 0;
            const done = item.once ? !!u[item.id] : count >= item.max;
            const label = done ? 'OWNED' : `${item.cost} CR`;
            const extra = item.once ? '' : ` <span class="pb-dim">${count}/${item.max}</span>`;
            const off = done || gameState.currency < item.cost ? 'disabled' : '';
            return `<div class="pb-row"><span>${esc(item.name())}${extra}</span><button data-buy="${i}" ${off}>${label}</button></div>`;
        }).join('');
        const box = dialog({
            title: 'FIELD SHOP',
            html: `<p class="pb-dim">Credits: <strong>${gameState.currency}</strong>. Earn more in Endless Mode.</p>${rows}`,
            buttons: [{ label: 'CLOSE', primary: true, action: () => {
                const after = openShop.after;
                openShop.after = null;
                if (after) setTimeout(after, 0);
            } }],
        });
        box.querySelectorAll('[data-buy]').forEach((b) => {
            b.addEventListener('click', () => buy(SHOP_ITEMS[Number(b.dataset.buy)]));
        });
    }

    function refreshLoadout() {
        const u = gameState.unlocks || {};
        document.querySelectorAll('.loadout-option').forEach((o) => {
            const w = o.dataset.weapon;
            const locked = o.dataset.type === 'primary' && ['m4a1', 'shotgun', 'sniper'].includes(w) && !u[w];
            o.classList.toggle('locked', locked);
            o.title = locked ? 'Unlock in the Field Shop' : '';
            o.classList.toggle('selected', gameState.loadout[o.dataset.type] === w);
        });
    }

    // ── Mission Pack ──
    const packOwned = () => read(OWNED_KEY) === '1';

    function b64uBytes(text) {
        const b = atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '='));
        return Uint8Array.from(b, (c) => c.charCodeAt(0));
    }

    async function verifyCode(code) {
        const m = /^RW1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(code || '').replace(/\s+/g, ''));
        if (!m) return 'That does not look like a mission pack code.';
        if (!window.crypto || !crypto.subtle) return 'This page cannot check codes. Please update your browser.';
        try {
            const key = await crypto.subtle.importKey('raw', b64uBytes(PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify']);
            const good = await crypto.subtle.verify({ name: 'Ed25519' }, key, b64uBytes(m[2]), new TextEncoder().encode(m[1]));
            if (!good) return 'This code is not valid.';
            const payload = JSON.parse(new TextDecoder().decode(b64uBytes(m[1])));
            return payload.p === PACK_ID ? null : 'This code is for a different item.';
        } catch (e) {
            return 'Your browser cannot check this code. Please update it.';
        }
    }

    function openPack(onClose) {
        const names = MISSIONS.filter((m) => m.pack).map((m) => `<li><strong>${esc(m.name)}</strong> <span class="pb-dim">${esc(m.difficulty)}</span><br><span class="pb-dim">${esc(m.description)}</span></li>`).join('');
        if (packOwned()) {
            dialog({ title: 'MISSION PACK', html: `<p>Thanks for supporting Pixel Breach. All pack missions are in your campaign.</p><ul class="pb-list">${names}</ul>`, buttons: [{ label: 'CLOSE', primary: true, action: onClose }] });
            return;
        }
        const box = dialog({
            title: 'MISSION PACK',
            html: `<p>Three extra missions for the campaign. One purchase, no subscription.</p>
                <ul class="pb-list">${names}</ul>
                <p class="pb-price">${PACK_PRICE}</p>
                <p class="pb-dim">You buy on kelvik.at and get a code by email.</p>
                <label class="pb-dim" for="pb-code">Already have a code?</label>
                <input id="pb-code" type="text" autocomplete="off" spellcheck="false" placeholder="RW1-...">
                <p id="pb-code-msg" role="status"></p>`,
            buttons: [
                { label: 'REDEEM CODE', primary: true, action: () => { redeem(onClose); return false; } },
                { label: 'GET THE PACK', action: () => { const w = window.open(PACK_URL, '_blank', 'noopener'); if (!w) document.getElementById('pb-code-msg').textContent = 'Open kelvik.at/pixelbreach in your browser.'; return false; } },
                { label: 'CLOSE', action: onClose },
            ],
        });
        box.querySelector('#pb-code').addEventListener('keydown', (e) => e.stopPropagation());
    }

    async function redeem(onClose) {
        const msg = document.getElementById('pb-code-msg');
        msg.textContent = 'Checking...';
        const error = await verifyCode(document.getElementById('pb-code').value);
        if (error) { msg.textContent = error; return; }
        write(OWNED_KEY, '1');
        closeDialog();
        toast('Mission Pack unlocked. Thank you!', 3500);
        AudioSystem.playVictory();
        if (onClose) onClose();
    }

    return { esc, toast, dialog, closeDialog, openShop, refreshLoadout, openPack, packOwned, verifyCode };
})();
