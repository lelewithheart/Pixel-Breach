class CVCScoring {
    constructor() {
        this.teamScores = {
            cops: 0,
            criminals: 0
        };
        this.playerStats = new Map();
        this.roundScores = {
            cops: 0,
            criminals: 0
        };
        this.eventLog = [];
    }
    initPlayer(playerId, initialTeam) {
        this.playerStats.set(playerId, {
            id: playerId,
            originalTeam: initialTeam,
            currentTeam: initialTeam,
            kills: 0,
            deaths: 0,
            arrests: 0,
            arrested: 0,
            escapes: 0,
            civiliansRescued: 0,
            hostagesTaken: 0,
            hostagesReleased: 0,
            rescuedCiviliansKilled: 0,
            unrescuedCiviliansKilled: 0,
            objectivesCompleted: 0,
            negotiationsSuccessful: 0,
            totalPointsEarned: 0,
            totalPointsLost: 0,
            roundsPlayed: 0
        });
    }
    getPlayerStats(playerId) {
        return this.playerStats.get(playerId) || null;
    }
    switchPlayerTeam(playerId, newTeam) {
        const stats = this.playerStats.get(playerId);
        if (stats) {
            stats.currentTeam = newTeam;
        }
    }
    recordPlayerKill(killerId, victimId, killerTeam, victimTeam) {
        const killerStats = this.playerStats.get(killerId);
        const victimStats = this.playerStats.get(victimId);
        let pointsAwarded = 0;
        let eventType = '';
        if (killerTeam === CVC_CONSTANTS.TEAM_COPS && victimTeam === CVC_CONSTANTS.TEAM_CRIMINALS) {
            pointsAwarded = CVC_CONSTANTS.POINTS.COP_KILL_CRIMINAL;
            eventType = 'cop_kill_criminal';
        } else if (killerTeam === CVC_CONSTANTS.TEAM_CRIMINALS && victimTeam === CVC_CONSTANTS.TEAM_COPS) {
            pointsAwarded = CVC_CONSTANTS.POINTS.CRIMINAL_KILL_COP;
            eventType = 'criminal_kill_cop';
        } else {
            eventType = 'friendly_fire';
            pointsAwarded = CVC_CONSTANTS.POINTS.FRIENDLY_FIRE_KILL || 0;
        }
        if (killerStats) {
            killerStats.kills++;
            if (pointsAwarded > 0) {
                killerStats.totalPointsEarned += pointsAwarded;
            } else {
                killerStats.totalPointsLost += Math.abs(pointsAwarded);
            }
        }
        if (victimStats) {
            victimStats.deaths++;
        }
        this.teamScores[killerTeam] += pointsAwarded;
        this.roundScores[killerTeam] += pointsAwarded;
        const event = {
            type: eventType,
            timestamp: Date.now(),
            killerId,
            victimId,
            killerTeam,
            victimTeam,
            pointsAwarded
        };
        this.eventLog.push(event);
        return {
            pointsAwarded,
            eventType,
            killerTeam,
            newTeamScore: this.teamScores[killerTeam]
        };
    }
    recordArrest(copId, criminalId) {
        const copStats = this.playerStats.get(copId);
        const criminalStats = this.playerStats.get(criminalId);
        const pointsAwarded = CVC_CONSTANTS.POINTS.COP_ARREST_CRIMINAL;
        if (copStats) {
            copStats.arrests++;
            copStats.totalPointsEarned += pointsAwarded;
        }
        if (criminalStats) {
            criminalStats.arrested++;
        }
        this.teamScores[CVC_CONSTANTS.TEAM_COPS] += pointsAwarded;
        this.roundScores[CVC_CONSTANTS.TEAM_COPS] += pointsAwarded;
        const event = {
            type: 'arrest',
            timestamp: Date.now(),
            copId,
            criminalId,
            pointsAwarded
        };
        this.eventLog.push(event);
        return {
            pointsAwarded,
            eventType: 'arrest',
            newTeamScore: this.teamScores[CVC_CONSTANTS.TEAM_COPS]
        };
    }
    recordEscape(criminalId, escapeMethod) {
        const stats = this.playerStats.get(criminalId);
        const pointsAwarded = CVC_CONSTANTS.POINTS.CRIMINAL_ESCAPE;
        if (stats) {
            stats.escapes++;
            stats.totalPointsEarned += pointsAwarded;
        }
        this.teamScores[CVC_CONSTANTS.TEAM_CRIMINALS] += pointsAwarded;
        this.roundScores[CVC_CONSTANTS.TEAM_CRIMINALS] += pointsAwarded;
        const event = {
            type: 'escape',
            timestamp: Date.now(),
            criminalId,
            escapeMethod,
            pointsAwarded
        };
        this.eventLog.push(event);
        return {
            pointsAwarded,
            eventType: 'escape',
            newTeamScore: this.teamScores[CVC_CONSTANTS.TEAM_CRIMINALS]
        };
    }
    recordHostageTaken(criminalId, civilianId) {
        const stats = this.playerStats.get(criminalId);
        const pointsAwarded = CVC_CONSTANTS.POINTS.CRIMINAL_TAKE_HOSTAGE;
        if (stats) {
            stats.hostagesTaken++;
            stats.totalPointsEarned += pointsAwarded;
        }
        this.teamScores[CVC_CONSTANTS.TEAM_CRIMINALS] += pointsAwarded;
        this.roundScores[CVC_CONSTANTS.TEAM_CRIMINALS] += pointsAwarded;
        const event = {
            type: 'hostage_taken',
            timestamp: Date.now(),
            criminalId,
            civilianId,
            pointsAwarded
        };
        this.eventLog.push(event);
        return {
            pointsAwarded,
            eventType: 'hostage_taken',
            newTeamScore: this.teamScores[CVC_CONSTANTS.TEAM_CRIMINALS]
        };
    }
    recordNegotiationSuccess(copId, civilianId) {
        const stats = this.playerStats.get(copId);
        const pointsAwarded = CVC_CONSTANTS.POINTS.COP_NEGOTIATION_SUCCESS;
        if (stats) {
            stats.negotiationsSuccessful++;
            stats.totalPointsEarned += pointsAwarded;
        }
        this.teamScores[CVC_CONSTANTS.TEAM_COPS] += pointsAwarded;
        this.roundScores[CVC_CONSTANTS.TEAM_COPS] += pointsAwarded;
        const event = {
            type: 'negotiation_success',
            timestamp: Date.now(),
            copId,
            civilianId,
            pointsAwarded
        };
        this.eventLog.push(event);
        return {
            pointsAwarded,
            eventType: 'negotiation_success',
            newTeamScore: this.teamScores[CVC_CONSTANTS.TEAM_COPS]
        };
    }
    recordObjectiveComplete(playerId, objectiveType, team, points) {
        const stats = this.playerStats.get(playerId);
        if (stats) {
            stats.objectivesCompleted++;
            stats.totalPointsEarned += points;
        }
        this.teamScores[team] += points;
        this.roundScores[team] += points;
        const event = {
            type: 'objective_complete',
            timestamp: Date.now(),
            playerId,
            objectiveType,
            team,
            pointsAwarded: points
        };
        this.eventLog.push(event);
        return {
            pointsAwarded: points,
            eventType: 'objective_complete',
            objectiveType,
            newTeamScore: this.teamScores[team]
        };
    }
    recordCivilianRescue(playerId, civilianId) {
        const stats = this.playerStats.get(playerId);
        if (!stats || stats.currentTeam !== CVC_CONSTANTS.TEAM_COPS) {
            return { pointsAwarded: 0, error: 'Only cops can rescue civilians' };
        }
        const pointsAwarded = CVC_CONSTANTS.POINTS.COP_RESCUE_CIVILIAN;
        stats.civiliansRescued++;
        stats.totalPointsEarned += pointsAwarded;
        this.teamScores[CVC_CONSTANTS.TEAM_COPS] += pointsAwarded;
        this.roundScores[CVC_CONSTANTS.TEAM_COPS] += pointsAwarded;
        const event = {
            type: 'civilian_rescued',
            timestamp: Date.now(),
            playerId,
            civilianId,
            pointsAwarded
        };
        this.eventLog.push(event);
        return {
            pointsAwarded,
            eventType: 'civilian_rescued',
            newTeamScore: this.teamScores[CVC_CONSTANTS.TEAM_COPS]
        };
    }
    recordCivilianKilled(killerId, civilianId, wasRescued, wasHostage, killerTeam) {
        const stats = this.playerStats.get(killerId);
        let pointsAwarded = 0;
        let eventType = '';
        if (wasHostage) {
            pointsAwarded = CVC_CONSTANTS.POINTS.KILL_HOSTAGE;
            eventType = 'hostage_killed';
        } else if (wasRescued && killerTeam === CVC_CONSTANTS.TEAM_CRIMINALS) {
            pointsAwarded = CVC_CONSTANTS.POINTS.CRIMINAL_KILL_RESCUED_CIVILIAN;
            eventType = 'criminal_kill_rescued_civilian';
            if (stats) {
                stats.rescuedCiviliansKilled++;
                stats.totalPointsEarned += pointsAwarded;
            }
            this.teamScores[CVC_CONSTANTS.TEAM_CRIMINALS] += pointsAwarded;
            this.roundScores[CVC_CONSTANTS.TEAM_CRIMINALS] += pointsAwarded;
        } else if (!wasRescued) {
            pointsAwarded = CVC_CONSTANTS.POINTS.KILL_UNRESCUED_CIVILIAN;
            eventType = 'kill_unrescued_civilian';
            if (stats) {
                stats.unrescuedCiviliansKilled++;
                stats.totalPointsLost += Math.abs(pointsAwarded);
            }
            this.teamScores[killerTeam] += pointsAwarded;
            this.roundScores[killerTeam] += pointsAwarded;
        }
        if (wasHostage) {
            if (stats) {
                stats.totalPointsLost += Math.abs(pointsAwarded);
            }
            this.teamScores[killerTeam] += pointsAwarded;
            this.roundScores[killerTeam] += pointsAwarded;
        }
        const event = {
            type: eventType,
            timestamp: Date.now(),
            killerId,
            civilianId,
            wasRescued,
            wasHostage,
            killerTeam,
            pointsAwarded
        };
        this.eventLog.push(event);
        return {
            pointsAwarded,
            eventType,
            killerTeam,
            newTeamScore: this.teamScores[killerTeam]
        };
    }
    endRound(roundNumber) {
        const roundSummary = {
            roundNumber,
            roundScores: { ...this.roundScores },
            totalScores: { ...this.teamScores },
            events: this.eventLog.filter(e => e.roundNumber === roundNumber)
        };
        this.roundScores = { cops: 0, criminals: 0 };
        this.playerStats.forEach(stats => {
            stats.roundsPlayed++;
        });
        return roundSummary;
    }
    switchAllTeams() {
        this.playerStats.forEach(stats => {
            stats.currentTeam = stats.currentTeam === CVC_CONSTANTS.TEAM_COPS ?
                CVC_CONSTANTS.TEAM_CRIMINALS : CVC_CONSTANTS.TEAM_COPS;
        });
    }
    getMatchResults() {
        let winner = null;
        if (this.teamScores[CVC_CONSTANTS.TEAM_COPS] > this.teamScores[CVC_CONSTANTS.TEAM_CRIMINALS]) {
            winner = CVC_CONSTANTS.TEAM_COPS;
        } else if (this.teamScores[CVC_CONSTANTS.TEAM_CRIMINALS] > this.teamScores[CVC_CONSTANTS.TEAM_COPS]) {
            winner = CVC_CONSTANTS.TEAM_CRIMINALS;
        } else {
            winner = 'tie';
        }
        const playerRankings = Array.from(this.playerStats.values())
            .sort((a, b) => {
                const aNet = a.totalPointsEarned - a.totalPointsLost;
                const bNet = b.totalPointsEarned - b.totalPointsLost;
                return bNet - aNet;
            });
        return {
            winner,
            finalScores: { ...this.teamScores },
            playerRankings,
            totalEvents: this.eventLog.length
        };
    }
    reset() {
        this.teamScores = { cops: 0, criminals: 0 };
        this.roundScores = { cops: 0, criminals: 0 };
        this.playerStats.clear();
        this.eventLog = [];
    }
    getScores() {
        return {
            teamScores: { ...this.teamScores },
            roundScores: { ...this.roundScores }
        };
    }
    serialize() {
        return {
            teamScores: this.teamScores,
            roundScores: this.roundScores,
            playerStats: Array.from(this.playerStats.entries())
        };
    }
    deserialize(data) {
        this.teamScores = data.teamScores;
        this.roundScores = data.roundScores;
        this.playerStats = new Map(data.playerStats);
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CVCScoring };
}