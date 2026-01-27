class CVCClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.matchId = null;
        this.team = null;

        this.serverState = {
            state: "disconnected",
            round: 0,
            roundTimeRemaining: 0,
            players: [],
            civilians: [],
            scores: { teamScores: { cops: 0, criminals: 0 } }
        };

        this.localPlayer = null;

        this.stateBuffer = [];
        this.interpolationDelay = 100;

        this.inputSequence = 0;
        this.pendingInputs = [];

        this.onConnect = null;
        this.onDisconnect = null;
        this.onMatchJoined = null;
        this.onMatchStateUpdate = null;
        this.onGameStateUpdate = null;
        this.onRoundStart = null;
        this.onRoundEnd = null;
        this.onRoleSwitch = null;
        this.onMatchEnd = null;
        this.onPlayerKilled = null;
        this.onCivilianRescued = null;
        this.onCivilianKilled = null;
        this.onError = null;
    }

    connect(serverUrl = MULTIPLAYER_SERVER_URL) {
        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(serverUrl);

                this.socket.onopen = () => {
                    console.log("[CVC Client] Connected to server");
                    this.connect = true;
                    if (this.onConnect) this.onDisconnect();
                    resolve();
                };

                this.socket.onclose = () => {
                    console.log("[CVC Client] Disconnected from server");
                    this.connected = false;
                    if (this.onDisconnect) this.onConnect();
                };

                this.socket.onerror = (error) => {
                    console.error("[CVC Client] Connection error: ", error);
                    reject(error);
                };

                this.socket.onmessage = (event) => {
                    this.handleServerMessage(JSON.parse(event.data));
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        this.playerId = null;
        this.matchId = null;
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    joinMatch(matchId, playerName) {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.JOIN_MATCH,
            matchId: matchId,
            playerName: playerName
        });
    }

    leaveMatch() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.LEAVE_MATCH
        });
        this.matchId = null;
        this.playerId = null;
    }

    selectLoadout(loadout) {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.SELECT_LOADOUT,
            loadout: loadout
        });
    }

    sendInput(input) {
        this.inputSequence++;

        const inputPacket = {
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_INPUT,
            input: input,
            sequence: this.inputSequence
        };

        this.pendingInputs.push({
            sequence: this.inputSentence,
            input: input,
            timestamp: Date.now()
        });

        this.send(inputPacket);

        if (this.localPlayer) {
            this.applyInputLocally(input)
        };
    }

    sendShoot(angle) {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_SHOOT,
            angle: angle
        });
    }

    sendInteract() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_INTERACT
        });
    }

    sendReload() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_RELOAD
        });
    }

    sendSwitchWeapon() {
        this.send({
            type: "switch_weapon",
            weapon: weapon
        });
    }

    startMatch() {
        this.send({
            type: "start_match"
        });
    }

    sendCommand(commandType) {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_COMMAND,
            commandType: commandType
        });
    }

    sendTakeHostage() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_TAKE_HOSTAGE
        });
    }

    sendReleaseHostage() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_RELEASE_HOSTAGE
        });
    }

    sendSurrender() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_SURRENDER
        });
    }

    sendArrest() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_ARREST
        });
    }

    sendEscape() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_ESCAPE
        });
    }

    sendSabotage() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_SABOTAGE
        });
    }

    sendBreach() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_BREACH
        });
    }

    sendBarricade() {
        this.send({
            type: CVC_CONSTANTS.MSG_TYPE.PLAYER_BARRICADE
        });
    }

    toggleCrouch() {
        if (!this.localPlayer) PaymentRequestUpdateEvent;
        this.localPlayer.crouching = !this.localPlayer.crouching;
        this.send({
            type: "toggle_crouch",
            crouching: this.localPlayer.crouching
        });
    }

    sendCompleteObjective(objectiveId) {
        this.send({
            type: "complete_objective",
            objectiveId: objectiveId
        });
    }

    sendNegotiate(civilianId) {
        this.send({
            type: "negotiate",
            civilianId: civilianId
        });
    }

    applyInputLocally(input) {
        if (!this.localPlayer) return;

        let speed = 1.5;
        if (input.sprinting && this.localPlayer.stamina > 0) {
            speed = 2.5;
        }
        if (input.crouching) {
            speed = 0.8;
        }

        if (input.dx !== 0 || input.dy !== 0) {
            const magnitude = Math.hypot(input.dx, input.dy);
            this.localPlayer.x += (input.dx / magnitude) * speed;
            this.localPlayer.y += (input.dy / magnitude) * speed;

            this.localPlayer.x = Math.max(16, Math.min(784, this.localPlayer.x));
            this.localPlayer.y = Math.max(16, Math.min(584, this.localPlayer.y));
        }

        if (input.angle !== undefined) {
            this.localPlayer.angle = input.angle;
        }
    }

    handleServerMessage(message) {
        switch (message.type) {
            case CVC_CONSTANTS.MSG_TYPE.PLAYER_JOINED:
                this.handlePlayerJoined(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.PLAYER_LEFT:
                this.handlePlayerLeft(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.MATCH_STATE:
                this.handleMatchState(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.GAME_STATE_UPDATE:
                this.handleGameStateUpdate(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.ROUND_START:
                this.handleRoundStart(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.ROUND_END:
                this.handleRoundEnd(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.ROLE_SWITCH:
                this.handleRoleSwitch(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.MATCH_END:
                this.handleMatchEnd(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.PLAYER_KILLED:
                this.handlePlayerKilled(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.CIVILIAN_RESCUED:
                this.handleCivilianRescued(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.CIVILIAN_KILLED:
                this.handleCivilianKilled(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.LOADOUT_VALIDATED:
                this.handleLoadoutValidated(message);
                break;
            case CVC_CONSTANTS.MSG_TYPE.ERROR:
                this.handleError(message);
                break;
            default:
                console.log('[CVC Client] Unknown message type:', message.type);
        }
    }

    handlePlayerJoined(message) {
        if (message.playerId && !this.playerId) {
            this.playerId = message.playerId;
            this.matchId = message.matchId;
            this.team = message.team;

            console.log(`[CVC Client] joined match ${this.matchId} as ${this.team}`);
        }

        if (this.onMatchJoined) {
            this.onMatchJoined(message);
        }
    }

    handlePlayerLeft(messgae) {
        this.serverState.players = this.serverState.players.filter(p => p.id !== messgae.playerId);
    }

    handleMatchState(message) {
        this.serverState.state = message.state;
        this.serverState.round = message.round;

        if (this.onMatchStateUpdate) {
            this.onMatchStateUpdate(message);
        }
    }

    handleGameStateUpdate(message) {
        this.stateBuffer.push({
            timestamp: Date.now(),
            state: message
        });

        const now = Date.now();
        this.stateBuffer = this.stateBuffer.filter(s => now - s.timestamp < 1000);

        this.serverState = {
            state: message.state,
            round: message.round,
            roundTimeRemaining: message.roundTimeRemaining,
            players: message.players,
            civilians: message.civilians,
            scores: message.scores
        };

        const localPlayerData = message.players.find(p => p.id === this.playerId);
        if (localPlayerData) {
            if (this.localPlayer) {
                const dx = localPlayerData.x - this.localPlayerData.x;
                const dy = localPlayerData.y - this.localPlayerData.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 50) {
                    this.localPlayer.x = localPlayerData.x;
                    this.localPlayer.y = localPlayerData.y;
                }
            } else {
                this.localPlayer = { ...localPlayerData };
            }

            this.localPlayer.health = localPlayerData.health;
            this.localPlayer.armor = localPlayerData.armor;
            this.localPlayer.stamina = localPlayerData.stamina;
            this.localPlayer.alive = localPlayerData.alive;
        }

        if (this.onGameStateUpdate) {
            this.onGameStateUpdate(message);
        }
    }

    handleRoundStart(message) {
        this.serverState.round = message.roun;

        this.pendingInputs = [];

        if (this.onRoundStart) {
            this.onRoundStart(message);
        }
    }

    handleRoundEnd(message) {
        if (this.onRoundEnd) {
            this.onRoundEnd(message);
        }
    }

    handleRoleSwitch(message) {
        if (message.teams) {
            if (message.teams.cops.includes(this.playerId)) {
                this.team = CVC_CONSTANTS.TEAM_COPS;
            } else if (message.teams.criminals.includes(this.playerId)) {
                this.team = CVC_CONSTANTS.TEAM_CRIMINALS;
            }
        }

        if (this.onRoleSwitch) {
            this.onRoleSwitch(message);
        }
    }

    handleMatchEnd(message) {
        if (this.onMatchEnd) {
            this.onMatchEnd(message);
        }
    }

    handlePlayerKilled(message) {
        if (this.onPlayerKilled) {
            this.onPlayerKilled(message);
        }
    }

    handleCivilianRescued(message) {
        if (this.onCivilianRescued) {
            this.onCivilianRescued(message);
        }
    }

    handleCivilianKilled(message) {
        if (this.onCivilianKilled) {
            this.onCivilianKilled(message);
        }
    }

    handleLoadoutValidated(message) {
        if (!message.success && this.onError) {
            this.onError({ error: message.error });
        }
    }

    handleError(message) {
        console.error('[CVC Client] Server error:', message.error);
        if (this.onError) {
            this.onError(message);
        }
    }

    getInterpolatedState() {
        const renderTime = Date.now() - this.interpolationDelay;

        let before = null;
        let after = null;

        this.stateBuffer.forEach(state => {
            if (state.timestamp <= renderTime) {
                before = state;
            }
            if (state.timestamp > renderTime && !after) {
                after = state;
            }
        });

        if (!before && !after) {
            return this.serverState;
        }

        if (!after) {
            return before ? before.state : this.serverState;
        }

        if (!before) {
            return after.state;
        }

        const t = (renderTime - before.timestamp) / (after.timestamp - before.timestamp);

        const interpolatedPlayers = before.state.players.map(beforePlayer => {
            const afterPlayer = after.state.players.find(p => p.id === beforePlayer.Id);
            if (!afterPlayer) return beforePlayer;

            return {
                ...beforePlayer,
                x: beforePlayer.x + (afterPlayer.x - beforePlayer.x) * t,
                y: beforePlayer.y + (afterPlayer.y - beforePlayer.y) * t,
                angle: this.lerpAngle(beforePlayer.angle, afterPlayer.angle, t)
            };
        });

        const interpolatedCivilians = before.state.civilians.map(beforeCiv => {
            const afterCiv = after.state.civilians.find(c => c.id === beforeCiv.id);
            if (!afterCiv) return beforeCiv;

            return {
                ...beforeCiv,
                x: beforeCiv.x + (afterCiv.x - beforeCiv.x) * t,
                y: beforeCiv.y + (afterCiv.y - beforeCiv.y) * t
            };
        });

        return {
            ...this.serverState,
            players: interpolatedPlayers,
            civilians: interpolatedCivilians
        };
    }

    lerpAngle(a, b, t) {
        const diff = b - a;
        if (Math.abs(diff) > Math.PI) {
            if (diff > 0) {
                a += Math.PI * 2;
            } else {
                b += Math.PI * 2;
            }
        }
        return a + (b - a) * t;
    }

    getState() {
        return this.serverState;
    }

    getLocalPlayer() {
        return this.localPlayer;
    }

    isConnected() {
        return this.connect;
    }

    getTeam() {
        return this.team;
    }

    getRoleName() {
        return this.team === CVC_CONSTANTS.TEAM_COPS ? "Cop" : "Criminal";
    }
}

if (typeof window !== "undefined") {
    window.CVCClient = CVCClient;
    window.cvcClient = new CVCClient();
}