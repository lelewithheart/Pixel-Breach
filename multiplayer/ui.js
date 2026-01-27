class CVCRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.client = null;
    }


    setClient(client) {
        this.client = client;
    }


    render() {
        if (!this.client) return;

        const state = this.client.getInterpolatedState();
        const localPlayer = this.client.getLocalPlayer();

        // Clear canvas
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw civilians
        state.civilians.forEach(civ => {
            this.drawCivilian(civ);
        });

        // Draw other players
        state.players.forEach(player => {
            if (player.id !== this.client.playerId) {
                this.drawPlayer(player, false);
            }
        });

        // Draw local player on top
        if (localPlayer) {
            this.drawPlayer(localPlayer, true);
        }

        // Draw HUD
        this.drawHUD(state, localPlayer);
    }


    drawGrid() {
        // Simple grid background
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        const tileSize = 20;
        for (let x = 0; x <= this.canvas.width; x += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.canvas.height; y += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }


    drawPlayer(player, isLocal) {
        if (!player.alive) {
            // Draw death marker
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(player.x - 8, player.y - 8, 16, 16);
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('✕', player.x - 5, player.y + 4);
            return;
        }

        this.ctx.save();
        this.ctx.translate(player.x, player.y);
        this.ctx.rotate(player.angle);

        // Team colors
        const colors = player.team === CVC_CONSTANTS.TEAM_COPS
            ? TEAM_COLORS.cops
            : TEAM_COLORS.criminals;

        // Body
        this.ctx.fillStyle = isLocal ? colors.highlight : colors.primary;
        this.ctx.fillRect(-8, -8, 16, 16);

        // Direction indicator
        this.ctx.fillStyle = isLocal ? '#fff' : colors.secondary;
        this.ctx.fillRect(6, -2, 8, 4);

        this.ctx.restore();

        // Health bar
        if (player.health < player.maxHealth) {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(player.x - 15, player.y - 25, 30, 4);
            this.ctx.fillStyle = player.health > 30 ? '#0f0' : '#f00';
            this.ctx.fillRect(player.x - 15, player.y - 25, 30 * (player.health / player.maxHealth), 4);
        }

        // Name tag
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name || player.id.substring(0, 8), player.x, player.y - 30);
        this.ctx.textAlign = 'left';

        // Team indicator
        this.ctx.fillStyle = player.team === CVC_CONSTANTS.TEAM_COPS ? '#00f' : '#f00';
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y - 35, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }


    drawCivilian(civilian) {
        if (civilian.dead) {
            this.ctx.fillStyle = '#666';
            this.ctx.fillRect(civilian.x - 7, civilian.y - 7, 14, 14);
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('✕', civilian.x - 4, civilian.y + 3);
            return;
        }

        // Body
        this.ctx.fillStyle = civilian.rescued ? '#0f0' : '#ff0';
        this.ctx.fillRect(civilian.x - 7, civilian.y - 7, 14, 14);

        // Status indicator
        this.ctx.fillStyle = civilian.rescued ? '#0f0' : '#ff0';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(civilian.rescued ? '✓' : '!', civilian.x - 4, civilian.y - 12);

        // Scared indicator
        if (civilian.scared) {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = '10px monospace';
            this.ctx.fillText('!', civilian.x - 2, civilian.y + 18);
        }
    }


    drawHUD(state, localPlayer) {
        const ctx = this.ctx;

        // Round info (top center)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width / 2 - 100, 10, 200, 40);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ROUND ${state.round} / ${CVC_CONSTANTS.TOTAL_ROUNDS}`, this.canvas.width / 2, 30);

        // Timer
        const minutes = Math.floor(state.roundTimeRemaining / 60000);
        const seconds = Math.floor((state.roundTimeRemaining % 60000) / 1000);
        ctx.fillStyle = state.roundTimeRemaining < 30000 ? '#f00' : '#0f0';
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, this.canvas.width / 2, 45);
        ctx.textAlign = 'left';

        // Team scores (top corners)
        // Cops score (left)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 150, 50);
        ctx.fillStyle = TEAM_COLORS.cops.primary;
        ctx.fillRect(10, 10, 5, 50);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('COPS', 20, 30);
        ctx.font = 'bold 20px monospace';
        ctx.fillText(state.scores.teamScores.cops.toString(), 20, 52);

        // Criminals score (right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width - 160, 10, 150, 50);
        ctx.fillStyle = TEAM_COLORS.criminals.primary;
        ctx.fillRect(this.canvas.width - 15, 10, 5, 50);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('CRIMINALS', this.canvas.width - 20, 30);
        ctx.font = 'bold 20px monospace';
        ctx.fillText(state.scores.teamScores.criminals.toString(), this.canvas.width - 20, 52);
        ctx.textAlign = 'left';

        // Local player info (bottom left)
        if (localPlayer) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, this.canvas.height - 80, 200, 70);

            // Team indicator
            const teamColor = localPlayer.team === CVC_CONSTANTS.TEAM_COPS
                ? TEAM_COLORS.cops.primary
                : TEAM_COLORS.criminals.primary;
            ctx.fillStyle = teamColor;
            ctx.fillRect(10, this.canvas.height - 80, 5, 70);

            // Role name
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(localPlayer.team === CVC_CONSTANTS.TEAM_COPS ? 'COP' : 'CRIMINAL', 20, this.canvas.height - 65);

            // Health bar
            ctx.fillStyle = '#333';
            ctx.fillRect(20, this.canvas.height - 55, 180, 12);
            ctx.fillStyle = localPlayer.health > 30 ? '#0f0' : '#f00';
            ctx.fillRect(20, this.canvas.height - 55, 180 * (localPlayer.health / localPlayer.maxHealth), 12);
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(`HP: ${Math.floor(localPlayer.health)}`, 25, this.canvas.height - 46);

            // Armor bar
            ctx.fillStyle = '#333';
            ctx.fillRect(20, this.canvas.height - 40, 180, 8);
            ctx.fillStyle = '#0af';
            ctx.fillRect(20, this.canvas.height - 40, 180 * (localPlayer.armor / 100), 8);
            ctx.fillText(`ARMOR: ${Math.floor(localPlayer.armor)}`, 25, this.canvas.height - 33);

            // Stamina bar
            ctx.fillStyle = '#333';
            ctx.fillRect(20, this.canvas.height - 28, 180, 8);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(20, this.canvas.height - 28, 180 * (localPlayer.stamina / 100), 8);
        }

        // Civilian count (bottom center)
        const unrescued = state.civilians.filter(c => !c.rescued && !c.dead).length;
        const rescued = state.civilians.filter(c => c.rescued).length;
        const dead = state.civilians.filter(c => c.dead).length;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width / 2 - 80, this.canvas.height - 35, 160, 25);

        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0';
        ctx.fillText(`CIVILIANS: ${unrescued}`, this.canvas.width / 2 - 40, this.canvas.height - 18);
        ctx.fillStyle = '#0f0';
        ctx.fillText(`✓${rescued}`, this.canvas.width / 2 + 20, this.canvas.height - 18);
        ctx.fillStyle = '#f00';
        ctx.fillText(`✕${dead}`, this.canvas.width / 2 + 55, this.canvas.height - 18);
        ctx.textAlign = 'left';

        // Game state indicator
        if (state.state !== CVC_CONSTANTS.STATE.PLAYING) {
            this.drawStateOverlay(state.state);
        }
    }


    drawStateOverlay(gameState) {
        const ctx = this.ctx;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';

        let message = '';
        switch (gameState) {
            case CVC_CONSTANTS.STATE.WAITING:
                message = 'WAITING FOR PLAYERS...';
                break;
            case CVC_CONSTANTS.STATE.LOBBY:
                message = 'LOBBY - WAITING TO START';
                break;
            case CVC_CONSTANTS.STATE.LOADOUT_SELECTION:
                message = 'SELECT YOUR LOADOUT';
                break;
            case CVC_CONSTANTS.STATE.COUNTDOWN:
                message = 'GET READY!';
                break;
            case CVC_CONSTANTS.STATE.ROUND_END:
                message = 'ROUND OVER';
                break;
            case CVC_CONSTANTS.STATE.ROLE_SWITCH:
                message = 'SWITCHING ROLES...';
                break;
            case CVC_CONSTANTS.STATE.MATCH_END:
                message = 'MATCH COMPLETE';
                break;
            default:
                message = gameState.toUpperCase();
        }

        ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
        ctx.textAlign = 'left';
    }
}

function createMultiplayerUI() {
    // Create multiplayer screen
    const mpScreen = document.createElement('div');
    mpScreen.id = 'multiplayer-screen';
    mpScreen.className = 'modal';
    mpScreen.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 600px;">
            <h2 style="color: #0f0; margin-bottom: 20px;">COPS VS CRIMINALS</h2>
            <p style="margin-bottom: 20px; color: #aaa;">10-Player Multiplayer Mode</p>

            <div id="mp-connection-status" style="margin-bottom: 20px; padding: 10px; background: #333;">
                <span style="color: #ff0;">⚪ Not Connected</span>
            </div>

            <div id="mp-lobby" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="color: #aaa;">Player Name:</label><br>
                    <input type="text" id="mp-player-name" value="Player"
                           style="padding: 8px; width: 200px; margin-top: 5px;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #aaa;">Match ID (leave empty for new match):</label><br>
                    <input type="text" id="mp-match-id" placeholder="Auto-generated"
                           style="padding: 8px; width: 200px; margin-top: 5px;">
                </div>

                <button id="btn-join-match" style="padding: 15px 30px; font-size: 16px; margin: 10px;">
                    JOIN MATCH
                </button>
            </div>

            <div id="mp-match-info" style="display: none; margin-top: 20px;">
                <div style="background: #333; padding: 15px; margin-bottom: 15px;">
                    <div>Match: <span id="mp-current-match-id" style="color: #0f0;"></span></div>
                    <div>Your Team: <span id="mp-your-team" style="font-weight: bold;"></span></div>
                    <div>Players: <span id="mp-player-count">0</span> / ${CVC_CONSTANTS.TOTAL_PLAYERS}</div>
                </div>

                <div id="mp-team-lists" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div style="width: 48%; background: #234; padding: 10px;">
                        <h4 style="color: ${TEAM_COLORS.cops.primary};">COPS</h4>
                        <div id="mp-cops-list"></div>
                    </div>
                    <div style="width: 48%; background: #432; padding: 10px;">
                        <h4 style="color: ${TEAM_COLORS.criminals.primary};">CRIMINALS</h4>
                        <div id="mp-criminals-list"></div>
                    </div>
                </div>

                <button id="btn-start-match" style="padding: 15px 30px; font-size: 16px; margin: 10px;">
                    START MATCH
                </button>
                <button id="btn-leave-match" style="padding: 10px 20px; margin: 10px;">
                    LEAVE
                </button>
            </div>

            <button id="btn-connect-mp" style="padding: 15px 30px; font-size: 16px; margin: 20px;">
                CONNECT TO SERVER
            </button>

            <button id="back-to-home-mp" style="padding: 10px 20px; margin-top: 20px;">
                BACK TO MENU
            </button>
        </div>
    `;
    document.body.appendChild(mpScreen);

    // Create loadout selection modal for multiplayer
    const mpLoadout = document.createElement('div');
    mpLoadout.id = 'mp-loadout-modal';
    mpLoadout.className = 'modal';
    mpLoadout.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2 id="mp-loadout-title">SELECT LOADOUT</h2>
            <p id="mp-loadout-role" style="color: #0f0; margin-bottom: 15px;"></p>

            <h3 style="font-size: 14px; margin-top: 15px;">Primary Weapon:</h3>
            <div id="mp-primary-weapons" class="loadout-grid"></div>

            <h3 style="font-size: 14px; margin-top: 15px;">Secondary Weapon:</h3>
            <div id="mp-secondary-weapons" class="loadout-grid"></div>

            <h3 style="font-size: 14px; margin-top: 15px;">Equipment:</h3>
            <div id="mp-equipment" class="loadout-grid"></div>

            <div style="margin-top: 20px;">
                <button id="btn-confirm-mp-loadout" style="padding: 15px 30px;">CONFIRM LOADOUT</button>
            </div>

            <div id="mp-loadout-timer" style="margin-top: 10px; color: #ff0;"></div>
        </div>
    `;
    document.body.appendChild(mpLoadout);

    // Create match results modal
    const mpResults = document.createElement('div');
    mpResults.id = 'mp-results-modal';
    mpResults.className = 'modal';
    mpResults.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 500px;">
            <h2 id="mp-results-title" style="font-size: 28px; margin-bottom: 20px;"></h2>

            <div id="mp-final-scores" style="display: flex; justify-content: space-around; margin-bottom: 30px;">
                <div style="background: #234; padding: 20px; min-width: 150px;">
                    <h3 style="color: ${TEAM_COLORS.cops.primary};">COPS</h3>
                    <div id="mp-cops-final-score" style="font-size: 36px; color: #fff;"></div>
                </div>
                <div style="background: #432; padding: 20px; min-width: 150px;">
                    <h3 style="color: ${TEAM_COLORS.criminals.primary};">CRIMINALS</h3>
                    <div id="mp-criminals-final-score" style="font-size: 36px; color: #fff;"></div>
                </div>
            </div>

            <div id="mp-player-rankings" style="text-align: left; max-height: 200px; overflow-y: auto;">
                <h4 style="margin-bottom: 10px;">Player Rankings:</h4>
                <div id="mp-rankings-list"></div>
            </div>

            <button id="btn-return-menu" style="padding: 15px 30px; margin-top: 20px;">
                RETURN TO MENU
            </button>
        </div>
    `;
    document.body.appendChild(mpResults);
}

function initMultiplayerUI() {
    createMultiplayerUI();

    const client = window.cvcClient;

    // Connection status update
    function updateConnectionStatus(connected) {
        const status = document.getElementById('mp-connection-status');
        const lobby = document.getElementById('mp-lobby');
        const connectBtn = document.getElementById('btn-connect-mp');

        if (connected) {
            status.innerHTML = '<span style="color: #0f0;">🟢 Connected</span>';
            lobby.style.display = 'block';
            connectBtn.style.display = 'none';
        } else {
            status.innerHTML = '<span style="color: #ff0;">⚪ Not Connected</span>';
            lobby.style.display = 'none';
            connectBtn.style.display = 'inline-block';
        }
    }

    // Connect button
    document.getElementById('btn-connect-mp').addEventListener('click', async () => {
        try {
            await client.connect('ws://localhost:3001');
            updateConnectionStatus(true);
        } catch (error) {
            alert('Failed to connect to server. Make sure the multiplayer server is running.');
        }
    });

    // Join match button
    document.getElementById('btn-join-match').addEventListener('click', () => {
        const playerName = document.getElementById('mp-player-name').value || 'Player';
        const matchId = document.getElementById('mp-match-id').value || null;
        client.joinMatch(matchId, playerName);
    });

    // Start match button
    document.getElementById('btn-start-match').addEventListener('click', () => {
        client.startMatch();
    });

    // Leave match button
    document.getElementById('btn-leave-match').addEventListener('click', () => {
        client.leaveMatch();
        document.getElementById('mp-match-info').style.display = 'none';
        document.getElementById('mp-lobby').style.display = 'block';
    });

    // Back button
    document.getElementById('back-to-home-mp').addEventListener('click', () => {
        client.disconnect();
        document.getElementById('multiplayer-screen').classList.remove('active');
        document.getElementById('home-screen').classList.add('active');
    });

    // Confirm loadout
    document.getElementById('btn-confirm-mp-loadout').addEventListener('click', () => {
        const primary = document.querySelector('#mp-primary-weapons .loadout-option.selected')?.dataset.weapon;
        const secondary = document.querySelector('#mp-secondary-weapons .loadout-option.selected')?.dataset.weapon;
        const equipment = document.querySelector('#mp-equipment .loadout-option.selected')?.dataset.weapon;

        if (primary && secondary && equipment) {
            client.selectLoadout({ primary, secondary, equipment });
            document.getElementById('mp-loadout-modal').classList.remove('active');
        } else {
            alert('Please select all loadout items');
        }
    });

    // Return to menu from results
    document.getElementById('btn-return-menu').addEventListener('click', () => {
        document.getElementById('mp-results-modal').classList.remove('active');
        document.getElementById('multiplayer-screen').classList.add('active');
    });

    // Client event handlers
    client.onConnect = () => updateConnectionStatus(true);
    client.onDisconnect = () => updateConnectionStatus(false);

    client.onMatchJoined = (msg) => {
        if (msg.playerId === client.playerId) {
            document.getElementById('mp-lobby').style.display = 'none';
            document.getElementById('mp-match-info').style.display = 'block';
            document.getElementById('mp-current-match-id').textContent = client.matchId;
            document.getElementById('mp-your-team').textContent = client.team.toUpperCase();
            document.getElementById('mp-your-team').style.color =
                client.team === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
        }
        updateMatchInfo(msg.matchInfo);
    };

    client.onMatchStateUpdate = (msg) => {
        if (msg.state === CVC_CONSTANTS.STATE.LOADOUT_SELECTION) {
            showLoadoutSelection(client.team);
        }
    };

    client.onRoundStart = () => {
        document.getElementById('mp-loadout-modal').classList.remove('active');
        document.getElementById('multiplayer-screen').classList.remove('active');
        startMultiplayerGame();
    };

    client.onRoleSwitch = () => {
        document.getElementById('mp-your-team').textContent = client.team.toUpperCase();
        document.getElementById('mp-your-team').style.color =
            client.team === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
    };

    client.onMatchEnd = (msg) => {
        showMatchResults(msg.results);
    };

    client.onError = (msg) => {
        alert('Error: ' + msg.error);
    };
}

function updateMatchInfo(info) {
    if (!info) return;
    document.getElementById('mp-player-count').textContent = info.playerCount;
}

function showLoadoutSelection(role) {
    const loadouts = CVC_LOADOUTS[role];
    if (!loadouts) return;

    document.getElementById('mp-loadout-role').textContent =
        `You are a ${role === 'cops' ? 'COP' : 'CRIMINAL'}`;

    // Populate primary weapons
    const primaryContainer = document.getElementById('mp-primary-weapons');
    primaryContainer.innerHTML = '';
    for (const [id, weapon] of Object.entries(loadouts.primary)) {
        const div = document.createElement('div');
        div.className = 'loadout-option';
        div.dataset.weapon = id;
        div.innerHTML = `
            <strong>${weapon.name}</strong><br>
            DMG: ${weapon.damage}<br>
            ${weapon.description || ''}
        `;
        div.addEventListener('click', () => {
            primaryContainer.querySelectorAll('.loadout-option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
        });
        primaryContainer.appendChild(div);
    }

    // Populate secondary weapons
    const secondaryContainer = document.getElementById('mp-secondary-weapons');
    secondaryContainer.innerHTML = '';
    for (const [id, weapon] of Object.entries(loadouts.secondary)) {
        const div = document.createElement('div');
        div.className = 'loadout-option';
        div.dataset.weapon = id;
        div.innerHTML = `
            <strong>${weapon.name}</strong><br>
            DMG: ${weapon.damage}<br>
            ${weapon.description || ''}
        `;
        div.addEventListener('click', () => {
            secondaryContainer.querySelectorAll('.loadout-option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
        });
        secondaryContainer.appendChild(div);
    }

    // Populate equipment
    const equipContainer = document.getElementById('mp-equipment');
    equipContainer.innerHTML = '';
    for (const [id, equip] of Object.entries(loadouts.equipment)) {
        const div = document.createElement('div');
        div.className = 'loadout-option';
        div.dataset.weapon = id;
        div.innerHTML = `
            <strong>${equip.name}</strong><br>
            QTY: ${equip.quantity}<br>
            ${equip.description || ''}
        `;
        div.addEventListener('click', () => {
            equipContainer.querySelectorAll('.loadout-option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
        });
        equipContainer.appendChild(div);
    }

    document.getElementById('mp-loadout-modal').classList.add('active');
}

function showMatchResults(results) {
    const title = document.getElementById('mp-results-title');
    if (results.winner === 'tie') {
        title.textContent = 'MATCH TIED!';
        title.style.color = '#ff0';
    } else {
        title.textContent = `${results.winner.toUpperCase()} WIN!`;
        title.style.color = results.winner === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary;
    }

    document.getElementById('mp-cops-final-score').textContent = results.finalScores.cops;
    document.getElementById('mp-criminals-final-score').textContent = results.finalScores.criminals;

    const rankingsList = document.getElementById('mp-rankings-list');
    rankingsList.innerHTML = '';
    results.playerRankings.forEach((player, index) => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 5px; background: #333; margin: 3px 0;';
        const net = player.totalPointsEarned - player.totalPointsLost;
        div.innerHTML = `
            <span style="color: #888;">#${index + 1}</span>
            <span style="color: ${player.originalTeam === 'cops' ? TEAM_COLORS.cops.primary : TEAM_COLORS.criminals.primary};">
                ${player.id.substring(0, 10)}
            </span>
            <span style="float: right; color: ${net >= 0 ? '#0f0' : '#f00'};">${net} pts</span>
        `;
        rankingsList.appendChild(div);
    });

    document.getElementById('mp-results-modal').classList.add('active');
    document.getElementById('game-container').style.display = 'none';
}

function startMultiplayerGame() {
    document.getElementById('game-container').style.display = 'flex';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const renderer = new CVCRenderer(canvas, ctx);
    renderer.setClient(window.cvcClient);

    // Game loop
    function mpGameLoop() {
        renderer.render();

        // Handle input
        handleMultiplayerInput();

        if (window.cvcClient.isConnected() &&
            window.cvcClient.serverState.state === CVC_CONSTANTS.STATE.PLAYING) {
            requestAnimationFrame(mpGameLoop);
        }
    }

    mpGameLoop();
}

function handleMultiplayerInput() {
    const client = window.cvcClient;
    if (!client.isConnected()) return;

    // Check if the global keys and mouse objects exist (from main game ui.js)
    const gameKeys = typeof keys !== 'undefined' ? keys : {};
    const gameMouse = typeof mouse !== 'undefined' ? mouse : { x: 0, y: 0 };

    let dx = 0, dy = 0;
    if (gameKeys['w'] || gameKeys['W']) dy -= 1;
    if (gameKeys['s'] || gameKeys['S']) dy += 1;
    if (gameKeys['a'] || gameKeys['A']) dx -= 1;
    if (gameKeys['d'] || gameKeys['D']) dx += 1;

    const localPlayer = client.getLocalPlayer();
    let angle = localPlayer ? localPlayer.angle : 0;

    // Update angle from mouse
    if (localPlayer && gameMouse) {
        angle = Math.atan2(gameMouse.y - localPlayer.y, gameMouse.x - localPlayer.x);
    }

    const input = {
        dx,
        dy,
        angle,
        sprinting: gameKeys['Shift'],
        crouching: gameKeys['Control']
    };

    client.sendInput(input);
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initMultiplayerUI);
}