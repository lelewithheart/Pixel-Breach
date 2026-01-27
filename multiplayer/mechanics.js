class HostageSystem {
    constructor() {
        this.activeHostageSituations = new Map();
    }

    takeHostage(criminalId, civilian, timestamp) {
        if (civilian.state === CVC_CONSTANTS.CIVILIAN_STATE.HOSTAGE) {
            return { success: false, error: "Civilian is already a hostage" };
        }
        if (civilian.state === CVC_CONSTANTS.CIVILIAN_STATE.RESCUED) {
            return { success: false, error: "Civilian has been rescued" };
        }
        if (civilian.state === CVC_CONSTANTS.CIVILIAN_STATE.DEAD) {
            return { success: false, error: "Civilian is dead" };
        }

        const hostageData = {
            civilianId: civilian.id,
            holderId: criminalId,
            startTime: timestamp,
            state: "held", //held, negotiating, released, executed
            negotiationAttempts: 0,
            fearLevel: 80
        };

        this.activeHostageSituations.set(civilian.id, hostageData);
        civilian.state = CVC_CONSTANTS.CIVILIAN_STATE.HOSTAGE;
        civilian.holderId = criminalId;

        return {
            success: true,
            hostageData,
            points: CVC_CONSTANTS.POINTS.CRIMINAL_TAKE_HOSTAGE
        };
    }

    releaseHostage(civilianId, reason) {
        const hostageData = this.activeHostageSituations.get(civilianId);
        if (!hostageData) {
            return { success: false, error: "No active hostage situation" };
        }

        hostageData.state = "released";
        hostageData.releaseReason = reason;
        this.activeHostageSituations.delete(civilianId);

        return {
            success: true,
            reason,
            wasNegotiated: reason === "negotiated"
        };
    }

    executeHostage(criminalId, civilianId) {
        const hostageData = this.activeHostageSituations.get(civilianId);
        if (!hostageData || hostageData.holderId !== criminalId) {
            return { success: false, error: "Not holding this hostage" };
        }

        hostageData.state = "executed";
        this.activeHostageSituations.delete(civilianId);

        return {
            success: true,
            penalty: CVC_CONSTANTS.POINTS.KILL_HOSTAGE
        };
    }

    isUsingHostageShield(criminalId) {
        for (const [civId, data] of this.activeHostageSituations) {
            if (data.holderId === criminalId && data.state === "held") {
                return true;
            }
        }
        return false;
    }

    getHostageShieldReduction(criminalId) {
        if (this.isUsingHostageShield(criminalId)) {
            return CVC_CONSTANTS.HOSTAGE.MOVEMENT_PENALTY;
        }
        return 1.0;
    }

    attemptNegotiation(copId, civilianId, hasNegotiatorPhone = false) {
        const hostageData = this.activeHostageSituations.get(civilianId);
        if (!hostageData) {
            return { success: false, error: "No hostage situation" };
        }

        hostageData.negotiationAttempts++;

        let successChance = 0.3;
        if (hasNegotiatorPhone) successChance *= 1.5;
        if (hostageData.negotiationAttempts > 1) successChance += 0.1;

        const roll = Math.random();
        if (roll < successChance) {
            return {
                success: true,
                released: true,
                points: CVC_CONSTANTS.POINTS.COP_NEGOTIATION_SUCCESS
            };
        }

        return {
            success: true,
            released: false,
            message: "Negotiation failed, try again"
        };
    }

    getActiveHostages() {
        return Array.from(this.activeHostageSituations.values());
    }

    serialize() {
        return Array.from(this.activeHostageSituations.entries());
    }

    deserialize(data) {
        this.activeHostageSituations = new Map(data);
    }
}

class EscapeSystem {
    constructor() {
        this.escapeRoutes = [];
        this.sabotagedRoutes = new Set();
        this.usedRoutes = new Set();
        this.escapeInProgress = new Map();
    }

    generateEscapeRoutes(mapData) {
        this.escapeRoutes = [];
        this.sabotagedRoutes.clear();
        this.usedRoutes.clear();
        this.escapeInProgress.clear();

        const routeCount = CVC_CONSTANTS.ESCAPE.MIN_ROUTES_PER_MAP +
            Math.floor(Math.random() * (CVC_CONSTANTS.ESCAPE.MAX_ROUTES_PER_MAP - CVC_CONSTANTS.ESCAPE.MIN_ROUTES_PER_MAP + 1));
        const width = mapData?.settings?.gridWidth || 40;
        const height = mapData?.settings?.gridHeight || 30;
        const routeTypes = [...CVC_CONSTANTS.ESCAPE.ROUTE_TYPES];

        for (let i = 0; i < routeCount; i++) {
            const typeIndex = Math.floor(Math.random() * routeTypes.length);
            const routeType = routeTypes.splice(typeIndex, 1)[0] || "tunnel";

            let x, y;
            switch (routeType) {
                case 'sewer':
                    x = 5 + Math.floor(Math.random() * (width - 10));
                    y = height - 3;
                    break;
                case 'rooftop':
                    x = Math.random() > 0.5 ? 2 : width - 3;
                    y = 2 + Math.floor(Math.random() * 5);
                    break;
                case 'tunnel':
                    x = Math.random() > 0.5 ? 1 : width - 2;
                    y = Math.floor(height / 2) + Math.floor(Math.random() * 6) - 3;
                    break;
                case 'vehicle':
                    x = width - 4;
                    y = height - 5 + Math.floor(Math.random() * 3);
                    break;
                case 'disguise':
                    x = Math.floor(width / 2) + Math.floor(Math.random() * 8) - 4;
                    y = Math.floor(height / 2) + Math.floor(Math.random() * 6) - 3;
                    break;
                default:
                    x = Math.floor(Math.random() * width);
                    y = Math.floor(Math.random() * height);
            }

            this.escapeRoutes.push({
                id: `escape_${i}_${routeType}`,
                type: routeType,
                x: x * 20 + 10,
                y: y * 20 + 10,
                active: true,
                sabotaged: false,
                used: false,
                icon: this.getRouteIcon(routeType)
            });
        }

        return this.escapeRoutes;
    }

    getRouteIcon(type) {
        const icons = {
            sewer: '🕳️',
            rooftop: '🏢',
            tunnel: '🚇',
            vehicle: '🚗',
            disguise: '🎭'
        };
        return icons[type] || '🚪';
    }

    startEscape(playerId, routeId, playerX, playerY) {
        const route = this.escapeRoutes.find(r => r.id === routeId);
        if (!route) {
            return { success: false, error: 'Invalid escape route' };
        }
        if (route.sabotaged) {
            return { success: false, error: 'Escape route has been sabotaged' };
        }
        if (route.used) {
            return { success: false, error: 'Escape route already used' };
        }

        // Check if player is close enough
        const dist = Math.hypot(route.x - playerX, route.y - playerY);
        if (dist > 50) {
            return { success: false, error: 'Too far from escape route' };
        }

        // Start escape attempt
        this.escapeInProgress.set(playerId, {
            routeId,
            startTime: Date.now(),
            duration: CVC_CONSTANTS.ESCAPE.ACTIVATION_TIME_MS
        });

        return { success: true, inProgress: true, duration: CVC_CONSTANTS.ESCAPE.ACTIVATION_TIME_MS };
    }

    checkEscapeComplete(playerId) {
        const attempt = this.escapeInProgress.get(playerId);
        if (!attempt) {
            return { complete: false };
        }

        const elapsed = Date.now() - attempt.startTime;
        if (elapsed >= attempt.duration) {
            const route = this.escapeRoutes.find(r => r.id === attempt.routeId);
            if (route) {
                route.used = true;
                this.usedRoutes.add(route.id);
            }
            this.escapeInProgress.delete(playerId);
            return {
                complete: true,
                success: true,
                points: CVC_CONSTANTS.POINTS.CRIMINAL_ESCAPE
            };
        }

        return { complete: false, progress: elapsed / attempt.duration };
    }

    cancelEscape(playerId) {
        this.escapeInProgress.delete(playerId);
    }

    sabotageRoute(copId, routeId, copX, copY) {
        const route = this.escapeRoutes.find(r => r.id === routeId);
        if (!route) {
            return { success: false, error: "Invalid route" };
        }
        if (route.sabotaged) {
            return { success: false, error: "Already Sabotaged" };
        }

        const dist = Math.hypot(route.x - copX, route.y - copY);
        if (dist > 60) {
            return { success: false, error: "Too far from route" };
        }

        route.sabotaged = true;
        this.sabotagedRoutes.add(routeId);

        return { success: true, routeId };
    }

    getActiveRoutes() {
        return this.escapeRoutes.filter(r => !r.sabotaged && !r.used);
    }

    serialize() {
        return {
            routes: this.escapeRoutes,
            sabotaged: Array.from(this.sabotagedRoutes),
            used: Array.from(this.usedRoutes),
            inProgress: Array.from(this.escapeInProgress.entries())
        };
    }
}

class ArrestSystem {
    constructor() {
        this.surrenderingPlayers = new Map();
        this.arrestedPlayers = new Map();
        this.commandsIssued = new Map();
    }

    issueCommand(copId, targetId, copX, copY, targetX, targetY) {
        const dist = Math.hypot(targetX - copX, targetY, copY);
        if (dist > CVC_CONSTANTS.ARREST.SURRENDER_PROMPT_RANGE) {
            return { success: false, error: "Target too far for command" };
        }

        this.commandsIssued.set(targetId, {
            issuedBy: copId,
            timestamp: Date.now(),
            type: "surrender"
        });

        return { success: true, commandsIssued: true };
    }

    initiateSurrender(criminalId) {
        if (this.arrestedPlayers.has(criminalId)) {
            return { success: false, error: "Already arrested" };
        }

        this.surrenderingPlayers.set(criminalId, {
            startTime: Date.now(),
            duration: CVC_CONSTANTS.ARREST.SURRENDER_TIME_MS
        });

        return { success: true, surrendering: true };
    }

    checkSurrenderComplete(criminalId) {
        const surrender = this.surrenderingPlayers.get(criminalId);
        if (!surrender) {
            return { complete: false };
        }

        const elapsed = Date.now() - surrender.startTime;
        if (elapsed >= surrender.duration) {
            return { complete: true, readyForArrest: true };
        }

        return { complete: false, progress: elapsed / surrender.duration };
    }

    cancelSurrender(criminalId) {
        const surrender = this.surrenderingPlayers.get(criminalId);
        if (!surrender) {
            return { success: false };
        }

        const elapsed = Date.now() - surrender.startTime;
        if (elapsed < CVC_CONSTANTS.ARREST.ESCAPE_WINDOW_MS) {
            this.surrenderingPlayers.delete(criminalId);
            return { success: false, cancelled: true };
        }

        return { success: false, error: "Too late to cancel" };
    }

    performArrest(copId, criminalId, isStunned, isSurrendered) {
        if (!isStunned && !isSurrendered) {
            return { success: false, error: "Target must be stunned or surrendered" };
        }

        this.surrenderingPlayers.delete(criminalId);
        this.arrestedPlayers.set(criminalId, {
            arrestedBy: copId,
            timestamp: Date.now(),
            method: isSurrendered ? "surrender" : "stunned"
        });

        return {
            success: true,
            arrested: true,
            points: CVC_CONSTANTS.POINTS.COP_ARREST_CRIMINAL
        };
    }

    isArrested(playerId) {
        return this.arrestedPlayers.has(playerId);
    }

    isSurrendering(playerId) {
        return this.surrenderingPlayers.has(playerId);
    }

    getArrestedPlayers() {
        return Array.from(this.arrestedPlayers.keys());
    }

    serialize() {
        return {
            surrendering: Array.from(this.surrenderingPlayers.entries()),
            arrested: Array.from(this.arrestedPlayers.entries()),
            commands: Array.from(this.commandsIssued.entries())
        };
    }
}

class ThreatSystem {
    constructor() {
        this.fearLevels = new Map();
        this.tensionLevel = 0;
        this.recentEvents = [];
    }

    initFear(entityId, initialFear = 0) {
        this.fearLevels.set(entityId, initialFear);
    }

    getFear(entityId) {
        return this.fearLevels.get(entityId) || 0;
    }

    addFearEvent(entityId, eventType, distance) {
        const currentFear = this.getFear(entityId);
        let fearIncrease = 0;
        const distanceMultiplier = Math.max(0.2, 1 - (distance / 300));

        switch (eventType) {
            case "gunfire":
                fearIncrease = CVC_CONSTANTS.THREAT.FEAR_GUNFIRE_INCREASE * distanceMultiplier;
                break;
            case "explosion":
                fearIncrease = CVC_CONSTANTS.THREAT.FEAR_EXPLOSION_INCREASE * distanceMultiplier;
                break;
            case "threat":
                fearIncrease = CVC_CONSTANTS.THREAT.FEAR_THREAT_INCREASE * distanceMultiplier;
                break;
            case "violence":
                fearIncrease = 40 * distanceMultiplier;
                break;
        }

        this.fearLevels.set(entityId, Math.min(100, currentFear + fearIncrease));

        this.addTension(fearIncrease * 0.3);
    }

    decayFear(deltaSeconds) {
        const decayAmount = CVC_CONSTANTS.THREAT.FEAR_DECAY_RATE * deltaSeconds;

        this.fearLevels.forEach((fear, entityId) => {
            const newFear = Math.max(0, fear - decayAmount);
            this.fearLevels.set(entityId, newFear);
        });

        this.tensionLevel = Math.max(0, this.tensionLevel - (decayAmount * 0.5));
    }

    shouldFlee(entityId) {
        return this.getFear(entityId) >= CVC_CONSTANTS.THREAT.FEAR_THRESHOLD_FLEE;
    }

    shouldPanic(entityId) {
        return this.getFear(entityId) >= CVC_CONSTANTS.THREAT.FEAR_THRESHOLD_PANIC;
    }

    shouldComply(entityId) {
        return this.getFear(entityId) >= CVC_CONSTANTS.THREAT.FEAR_THRESHOLD_COMPLY;
    }

    issueCommand(issuerId, targetId, commandType) {
        this.addFearEvent(targetId, "threat", 0);

        const willComply = this.shouldComply(targetId);

        return {
            issued: true,
            commandType,
            willComply,
            targetFear: this.getFear(targetId)
        };
    }

    addTension(amount) {
        this.tensionLevel = Math.min(100, this.tensionLevel + amount);
    }

    getTension() {
        return this.tensionLevel;
    }

    getTensionState() {
        if (this.tensionLevel < 20) return "calm";
        if (this.tensionLevel < 40) return "uneasy";
        if (this.tensionLevel < 60) return "tense";
        if (this.tensionLevel < 80) return "high_alert";
        return "critical";
    }

    serialize() {
        return {
            fearLevels: Array.from(this.fearLevels.entries()),
            tensionLevel: this.tensionLevel
        };
    }

    deserialize(data) {
        this.fearLevels = new Map(data.fearLevels);
        this.tensionLevel = data.tensionLevel;
    }
}

class EnvironmentSystem {
    constructor() {
        this.doors = new Map();
        this.lights = new Map();
        this.cameras = new Map();
        this.alarms = new Map();
        this.traps = new Map();
        this.fireZones = [];
        this.smokeZones = [];
    }

    initFromMap(mapData) {
        this.doors.clear();
        this.lights.clear();
        this.cameras.clear();
        this.alarms.clear();
        this.traps.clear();
        this.fireZones = [];
        this.smokeZones = [];

        const width = mapData?.settings?.gridWidth || 40;
        const height = mapData?.settings?.gridHeight || 30;

        for (let i = 0; i < 6; i++) {
            const doorId = `door_${i}`;
            this.doors.set(doorId, {
                id: doorId,
                x: (5 + i * 6) * 20,
                y: Math.floor(height / 2) * 20,
                state: "closed", //closed, open, locked, barricaded, breached
                health: 100,
                locked: i % 2 === 0
            });
        }

        for (let i = 0; i < 3; i++) {
            const lightId = `light_${i}`;
            this.lights.set(lightId, {
                id: lightId,
                x: (10 + i * 8) * 20,
                y: 10 * 20,
                radius: 120,
                on: true
            });
        }

        for (let i = 0; i < 3; i++) {
            const camId = `camera_${i}`;
            this.cameras.set(camId, {
                id: camId,
                x: (8 + i * 12) * 20,
                y: 5 * 20,
                active: true,
                hacked: false,
                viewAngle: 90,
                viewDirection: Math.PI / 2
            });
        }

        this.alarms.set("main_alarm", {
            id: "main_alarm",
            triggered: false,
            disabled: false
        });
    }

    breachDoor(doorId, method) {
        const door = this.doors.get(doorId);
        if (!door) return { success: false, error: "Door not found" };
        if (door.state === "breached" || door.state === "open") {
            return { success: false, error: "Door already open" };
        }

        let noiseLevel = 100;
        let stunRadius = 0;
        let damage = 50;

        switch (method) {
            case 'explosive':
                noiseLevel = 400;
                stunRadius = 50;
                damage = 100;
                break;
            case 'kick':
                noiseLevel = 150;
                damage = 30;
                break;
            case 'ram':
                noiseLevel = 200;
                damage = 50;
                break;
        }

        door.health -= damage;
        if (door.health <= 0) {
            door.state = "breached";
            return {
                success: true,
                breached: true,
                noiseLevel,
                stunRadius,
                stunDuration: stunRadius > 0 ? 2000 : 0
            };
        }

        return {
            success: true,
            breached: false,
            remainingHealth: door.health
        };
    }

    barricadeDoor(doorId) {
        const door = this.doors.get(doorId);
        if (!door) return { success: false, error: "Door not found" };
        if (door.state === "breached") {
            return { success: false, error: "Cannot barricade breached door" };
        }

        door.state = "barricaded";
        door.health = 210;

        return { success: true, barricaded: true };
    }

    cutLights(lightId) {
        if (lightId === "all") {
            this.lights.forEach(light => { light.on = false; });
            return { success: true, allLightsCut: true };
        }

        const light = this.lights.get(lightId);
        if (!light) return { success: false, error: "Light not found" };

        light.on = false;
        return { success: true, lightId };
    }

    hackCamera(cameraId) {
        const camera = this.cameras.get(cameraId);
        if (!camera) return { success: false, error: "Camera not found" };
        if (camera.hacked) return { success: false, error: "Already hacked" };

        camera.hacked = true;
        camera.active = false;

        return { success: true, cameraId };
    }

    triggerAlarm(reason) {
        const alarm = this.alarms.get("main_alarm");
        if (!alarm) return { success: false };
        if (alarm.disabled) return { success: false, error: "Alarm disabled" };

        alarm.triggered = true;
        alarm.triggerReason = reason;
        alarm.triggerTime = Date.now();

        return { success: true, triggered: true, reason };
    }

    disableAlarm() {
        const alarm = this.alarms.get("main_alarm");
        if (!alarm) return { success: false };

        alarm.disabled = true;
        alarm.triggered = false;

        return { success: true, disabled: true };
    }

    placeTrap(playerId, trapType, x, y) {
        const trapId = `trap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        this.traps.set(trapId, {
            id: trapId,
            type: trapType,
            x,
            y,
            playedBy: playerId,
            armed: true,
            triggered: false
        });

        return { success: true, trapId };
    }

    checkTrapTrigger(entityX, entityY, entityId) {
        for (const [trapId, trap] of this.traps) {
            if (!trap.armed || trap.triggered) continue;
            if (trap.placedBy === entityId) continue;

            const dist = Math.hypot(trap.x - entityX, trap.y - entityY);
            if (dist < 30) {
                trap.triggered = true;
                trap.armed = false;
                return {
                    triggered: true,
                    trapId,
                    trapType: trap.type,
                    x: trap.x,
                    y: trap.y
                };
            }
        }
        return null;
    }

    createFireZone(x, y, radius, duration, damage) {
        this.fireZones.push({
            x,
            y,
            radius,
            damage,
            startTime: Date.now(),
            duration
        });
    }

    createSmokeZone(x, y, radius, duration) {
        this.smokeZones.push({
            x,
            y,
            radius,
            startTime: Date.now(),
            duration
        });
    }

    updateZones() {
        const now = Date.now();
        this.fireZones = this.fireZones.filter(z => now - z.startTime < z.duration);
        this.smokeZones = this.smokeZones.filter(z => now - z.startTime < z.duration);
    }

    isInSmoke(x, y) {
        return this.smokeZones.some(zone => {
            return Math.hypot(zone.x - x, zone.y - y) < zone.radius;
        });
    }

    getFireDamage(x, y) {
        let totalDamage = 0;
        for (const zone of this.fireZones) {
            const dist = Math.hypot(zone.x - x, zone.y - y);
            if (dist < zone.radius) {
                totalDamage += zone.damage * (1 - dist / zone.radius);
            }
        }
        return totalDamage;
    }

    hasLight(x, y) {
        for (const [id, light] of this.lights) {
            if (!light.on) continue;
            return Math.hypot(light.x - x, light.y - y) < light.radius;
        }
        return false;
    }

    serialize() {
        return {
            doors: Array.from(this.doors.entries()),
            lights: Array.from(this.lights.entries()),
            cameras: Array.from(this.cameras.entries()),
            alarms: Array.from(this.alarms.entries()),
            traps: Array.from(this.traps.entries()),
            fireZones: this.fireZones,
            smokeZones: this.smokeZones
        };
    }
}

class StealthSystem {
    constructor() {
        this.noiseEvents = [];
        this.detectedPlayers = new Map();
        this.alertLevel = "normal" //normal, suspicius, alert combat
    }

    registerNoise(x, y, noiseLevel, sourceId, sourceType) {
        this.noiseEvents.push({
            x,
            y,
            level: noiseLevel,
            sourceId,
            sourceType,
            timestamp: Date.now()
        });

        const now = Date.now();
        this.noiseEvents = this.noiseEvents.filter(e => now - e.timestamp < 3000);

        if (noiseLevel > CVC_CONSTANTS.STEALTH.GUNFIRE_NOISE_BASE) {
            this.alertLevel = "combat";
        } else if (noiseLevel < 100 && this.alertLevel !== "combat") {
            this.alertLevel = "alert";
        } else if (noiseLevel < 50 && this.alertLevel === "normal") {
            this.alertLevel = "suspicius";
        }
    }

    getMovementNoise(movementType) {
        switch (movementType) {
            case 'run': return CVC_CONSTANTS.STEALTH.FOOTSTEP_NOISE_RUN;
            case 'walk': return CVC_CONSTANTS.STEALTH.FOOTSTEP_NOISE_WALK;
            case 'crouch': return CVC_CONSTANTS.STEALTH.FOOTSTEP_NOISE_CROUCH;
            default: return 0;
        }
    }

    canHearNoise(listenerX, listenerY, noiseX, noiseY, noiseLevel, throughWall = false) {
        const dist = Math.hypot(noiseX - listenerX, noiseY - listenerY);
        let effectiveNoise = noiseLevel;

        if (throughWall) {
            effectiveNoise *= CVC_CONSTANTS.STEALTH.SOUND_PROPAGATION_WALLS;
        }

        // Noise travels up to ~5 pixels per noise level
        return dist < effectiveNoise * 5;
    }

    canSeeTarget(watcherX, watcherY, watcherAngle, targetX, targetY, targetInShadow = false, targetCrouched = false) {
        const dist = Math.hypot(targetX - watcherX, targetY - watcherY);
        const maxRange = this.alertLevel === 'alert' ?
            CVC_CONSTANTS.STEALTH.DETECTION_RANGE_ALERT :
            CVC_CONSTANTS.STEALTH.DETECTION_RANGE_NORMAL;

        // Range check
        let effectiveRange = maxRange;
        if (targetInShadow) effectiveRange *= 0.5;
        if (targetCrouched) effectiveRange *= 0.7;

        if (dist > effectiveRange) return false;

        // Angle check
        const angleToTarget = Math.atan2(targetY - watcherY, targetX - watcherX);
        let angleDiff = Math.abs(angleToTarget - watcherAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        const halfCone = (CVC_CONSTANTS.STEALTH.DETECTION_CONE_ANGLE / 2) * (Math.PI / 180);
        return angleDiff <= halfCone;
    }

    markDetected(playerId, detectedBy) {
        this.detectedPlayers.set(playerId, {
            detectedBy,
            timestamp: Date.now(),
            lastKnownX: null,
            lastKnownY: null
        });
    }

    updateLastKnownPosition(playerId, x, y) {
        const detection = this.detectedPlayers.get(playerId);
        if (detection) {
            detection.lastKnownX = x;
            detection.lastKnownY = y;
        }
    }

    decayAlert(deltaSeconds) {
        const decayTime = 10;
        if (deltaSeconds >= decayTime) {
            if (this.alertLevel === 'combat') this.alertLevel = 'alert';
            else if (this.alertLevel === 'alert') this.alertLevel = 'suspicious';
            else if (this.alertLevel === 'suspicious') this.alertLevel = 'normal';
        }
    }

    getAlertLevel() {
        return this.alertLevel;
    }

    serialize() {
        return {
            noiseEvents: this.noiseEvents,
            detectedPlayers: Array.from(this.detectedPlayers.entries()),
            alertLevel: this.alertLevel
        };
    }
}

class ObjectiveSystem {
    constructor() {
        this.objectives = {
            cops: [],
            criminals: []
        };
        this.completedObjectives = new Set();
        this.objectiveLocations = new Map();
    }

    generateObjectives(mapData) {
        this.objectives = { cops: [], criminals: [] };
        this.completedObjectives.clear();
        this.objectiveLocations.clear();

        const width = mapData?.settings?.gridWidth || 40;
        const height = mapData?.settings?.gridHeight || 30;

        const evidenceCount = CVC_CONSTANTS.OBJECTIVES.EVIDENCE_LOCATIONS_MIN +
            Math.floor(Math.random() * (CVC_CONSTANTS.OBJECTIVES.EVIDENCE_LOCATIONS_MAX - CVC_CONSTANTS.OBJECTIVES.EVIDENCE_LOCATIONS_MIN + 1));

        for (let i = 0; i < evidenceCount; i++) {
            const objId = `evidence_${i}`;
            const x = (10 + Math.floor(Math.random() * (width - 20))) * 20;
            const y = (10 + Math.floor(Math.random() * (height - 20))) * 20;

            this.objectives.criminals.push({
                id: objId,
                type: 'destroy_evidence',
                name: 'Destroy Evidence',
                description: 'Destroy incriminating evidence',
                points: CVC_CONSTANTS.POINTS.CRIMINAL_DESTROY_EVIDENCE,
                completed: false,
                x,
                y
            });
            this.objectiveLocations.set(objId, { x, y });
        }

        const terminalCount = CVC_CONSTANTS.OBJECTIVES.TERMINAL_LOCATIONS_MIN +
            Math.floor(Math.random() * (CVC_CONSTANTS.OBJECTIVES.TERMINAL_LOCATIONS_MAX - CVC_CONSTANTS.OBJECTIVES.TERMINAL_LOCATIONS_MIN + 1));

        for (let i = 0; i < terminalCount; i++) {
            const objId = `terminal_${i}`;
            const x = (8 + Math.floor(Math.random() * (width - 16))) * 20;
            const y = (8 + Math.floor(Math.random() * (height - 16))) * 20;

            this.objectives.criminals.push({
                id: objId,
                type: "hack_terminal",
                name: "Hack Terminal",
                description: "Access secure data",
                points: CVC_CONSTANTS.POINTS.CRIMINAL_HACK_TERMINAL,
                completed: false,
                x,
                y
            });
            this.objectiveLocations.set(objId, { x, y });
        }

        const valuableCount = CVC_CONSTANTS.OBJECTIVES.VALUABLE_LOCATIONS_MIN +
            Math.floor(Math.random() * (CVC_CONSTANTS.OBJECTIVES.VALUABLE_LOCATIONS_MAX - CVC_CONSTANTS.OBJECTIVES.VALUABLE_LOCATIONS_MIN + 1));

        for (let i = 0; i < valuableCount; i++) {
            const objId = `valuable_${i}`;
            const x = (5 + Math.floor(Math.random() * (width - 10))) * 20;
            const y = (5 + Math.floor(Math.random() * (height - 10))) * 20;

            this.objectives.criminals.push({
                id: objId,
                type: "steal_valuable",
                name: "Steal Valuables",
                description: "Grab high-value items",
                points: CVC_CONSTANTS.POINTS.CRIMINAL_STEAL_VALUABLE,
                completed: false,
                x,
                y
            });
            this.objectiveLocations.set(objId, { x, y });
        }

        const intelCount = CVC_CONSTANTS.OBJECTIVES.INTEL_LOCATIONS_MIN +
            Math.floor(Math.random() * (CVC_CONSTANTS.OBJECTIVES.INTEL_LOCATIONS_MAX - CVC_CONSTANTS.OBJECTIVES.INTEL_LOCATIONS_MIN + 1));

        for(let i = 0; i < intelCount; i++){
            const objId = `intel_${i}`;
            const x = (12 + Math.floor(Math.random() * (width - 24))) * 20;
            const y = (12 + Math.floor(Math.random() * (height - 24))) * 20;

            this.objectives.push({
                id: objId,
                type: "secure_intel",
                name: "Secure intel",
                description: "Recover critical information",
                points: CVC_CONSTANTS.POINTS.COP_SECURE_INTEL,
                completed: false,
                x,
                y
            });
            this.objectiveLocations.set(objId, {x, y});
        }
        return this.objectives;
    }

    completeObjective(playerId, objectiveId, team, playerX, playerY){
        const objectives = this.objectives[team];
        const objective = objectives?.find(o => o.id === objectiveId);

        if(!objective){
            return { success: false, error: "Objective not found for team"}
        }
    }
}