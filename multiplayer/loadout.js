const CVC_LOADOUTS = {
    cops: {
        primary: {
            mp5: {
                name: "MP5",
                damage: 20,
                fireRate: 100,
                magSize: 30,
                totalAmmo: 90,
                spread: 0.1,
                auto: true,
                noiseLevel: 200,
                description: "Reliable submachine gun, balanced performance"
            },
            m4a1: {
                name: "M4A1",
                damage: 30,
                fireRate: 120,
                magSize: 30,
                totalAmmo: 90,
                spread: 0.08,
                auto: true,
                noiseLevel: 250,
                description: "Standard issue rifle, high accuracy"
            },
            taser_rifle: {
                name: "Taser Rifle",
                damage: 10,
                fireRate: 1500,
                magSize: 1,
                totalAmmo: 10,
                spread: 0.05,
                auto: false,
                noiseLevel: 50,
                stunDuration: 3000,
                nonLethal: true,
                forceSurrender: true,
                description: "Non-lethal, stuns and forces surrender"
            },
            beanbag_shotgun: {
                name: "Beanbag Shotgun",
                damage: 15,
                fireRate: 800,
                magSize: 6,
                totalAmmo: 18,
                spread: 0.3,
                auto: false,
                pellets: 3,
                noiseLevel: 150,
                knockback: 8,
                nonLethal: true,
                description: "Non-lethal, knocks back and stuns"
            },
            suppressed_mp5: {
                name: "MP5-SD",
                damage: 18,
                fireRate: 110,
                magSize: 30,
                totalAmmo: 90,
                spread: 0.1,
                auto: true,
                noiseLevel: 60,
                suppressed: true,
                description: "Suppressed SMG for stealth operations"
            }
        },
        secondary: {
            m1911: {
                name: "M1911",
                damage: 35,
                fireRate: 300,
                magSize: 7,
                totalAmmo: 21,
                spread: 0.12,
                auto: false,
                noiseLevel: 180,
                description: "High damage pistol, reliable sidearm"
            },
            glock: {
                name: "Glock 17",
                damage: 25,
                fireRate: 200,
                magSize: 17,
                totalAmmo: 51,
                spread: 0.1,
                auto: false,
                noiseLevel: 170,
                description: "High capacity pistol, fast fire rate"
            },
            taser_pistol: {
                name: "Taser Pistol",
                damage: 5,
                fireRate: 2000,
                magSize: 2,
                totalAmmo: 6,
                spread: 0.08,
                auto: false,
                noiseLevel: 30,
                stunDuration: 2000,
                nonLethal: true,
                forceSurrender: true,
                description: "Non-lethal sidearm, forces surrender"
            },
            suppressed_pistol: {
                name: "Suppressed P226",
                damage: 28,
                fireRate: 250,
                magSize: 15,
                totalAmmo: 45,
                spread: 0.1,
                auto: false,
                noiseLevel: 40,
                suppressed: true,
                description: "Silent sidearm for stealth"
            }
        },
        equipment: {
            flashbang: {
                name: "Flashbang",
                quantity: 2,
                effect: "stun",
                radius: 150,
                stunDuration: 5000,
                affectsAllies: true,
                description: "Blinds and stuns all in radius"
            },
            smoke: {
                name: "Smoke Grenade",
                quantity: 2,
                effect: "smoke",
                radius: 100,
                duration: 10000,
                blocksLineOfSight: true,
                description: "Creates concealment, blocks vision"
            },
            shield: {
                name: "Riot Shield",
                quantity: 1,
                effect: "shield",
                blockChance: 0.8,
                movementPenalty: 0.5,
                canBreach: false,
                description: "Blocks frontal attacks, slows movement"
            },
            medkit: {
                name: "Medkit",
                quantity: 1,
                effect: "heal",
                healAmount: 50,
                useTime: 3000,
                description: "Restores 50 HP to self or teammate"
            },
            handcuffs: {
                name: "Handcuffs",
                quantity: 3,
                effect: "restrain",
                restrainDuration: 0, // Until round end
                arrestBonus: true,
                description: "Arrests stunned/surrendered criminals"
            },
            breach_charge: {
                name: "Breach Charge",
                quantity: 2,
                effect: "breach",
                breachTime: 500,
                stunRadius: 50,
                stunDuration: 2000,
                noiseLevel: 400,
                description: "Explosive door breach, stuns enemies"
            },
            fiber_camera: {
                name: "Fiber Optic Camera",
                quantity: 1,
                effect: "recon",
                range: 60,
                seesThroughDoors: true,
                description: "See through doors and walls"
            },
            drone: {
                name: "Recon Drone",
                quantity: 1,
                effect: "drone",
                range: 300,
                duration: 30000,
                noiseLevel: 20,
                description: "Remote camera drone for scouting"
            },
            negotiator_phone: {
                name: "Negotiator Phone",
                quantity: 1,
                effect: "negotiate",
                negotiationBonus: 1.5,
                description: "Improved hostage negotiation success"
            }
        }
    },
    criminals: {
        primary: {
            uzi: {
                name: "Uzi",
                damage: 18,
                fireRate: 80,
                magSize: 32,
                totalAmmo: 96,
                spread: 0.15,
                auto: true,
                noiseLevel: 180,
                description: "High rate of fire SMG, less accurate"
            },
            sawed_off: {
                name: "Sawed-Off Shotgun",
                damage: 25,
                fireRate: 600,
                magSize: 2,
                totalAmmo: 20,
                spread: 0.6,
                auto: false,
                pellets: 8,
                noiseLevel: 350,
                intimidation: 25,
                description: "Devastating close range, intimidating"
            },
            ak47: {
                name: "AK-47",
                damage: 35,
                fireRate: 150,
                magSize: 30,
                totalAmmo: 90,
                spread: 0.12,
                auto: true,
                noiseLevel: 300,
                intimidation: 20,
                description: "High damage assault rifle, more recoil"
            },
            mac10: {
                name: "MAC-10",
                damage: 15,
                fireRate: 60,
                magSize: 30,
                totalAmmo: 120,
                spread: 0.2,
                auto: true,
                noiseLevel: 200,
                description: "Extremely fast fire rate, low accuracy"
            },
            suppressed_smg: {
                name: "Suppressed MP7",
                damage: 16,
                fireRate: 90,
                magSize: 40,
                totalAmmo: 120,
                spread: 0.12,
                auto: true,
                noiseLevel: 50,
                suppressed: true,
                description: "Silent SMG for stealth approaches"
            }
        },
        secondary: {
            desert_eagle: {
                name: "Desert Eagle",
                damage: 50,
                fireRate: 500,
                magSize: 7,
                totalAmmo: 21,
                spread: 0.15,
                auto: false,
                noiseLevel: 250,
                intimidation: 15,
                description: "Heavy pistol, intimidating presence"
            },
            knife: {
                name: "Combat Knife",
                damage: 60,
                fireRate: 400,
                magSize: 1,
                totalAmmo: Infinity,
                spread: 0,
                auto: false,
                range: 30,
                melee: true,
                noiseLevel: 20,
                silentKill: true,
                backstabMultiplier: 3,
                description: "Silent kills, instant kill from behind"
            },
            revolver: {
                name: "Revolver",
                damage: 45,
                fireRate: 600,
                magSize: 6,
                totalAmmo: 24,
                spread: 0.1,
                auto: false,
                noiseLevel: 220,
                description: "Powerful, accurate handgun"
            },
            suppressed_pistol: {
                name: "Suppressed Glock",
                damage: 22,
                fireRate: 200,
                magSize: 17,
                totalAmmo: 51,
                spread: 0.1,
                auto: false,
                noiseLevel: 35,
                suppressed: true,
                description: "Silent pistol for stealth"
            }
        },
        equipment: {
            molotov: {
                name: "Molotov Cocktail",
                quantity: 2,
                effect: "fire",
                radius: 60,
                damage: 10,
                duration: 5000,
                tickRate: 500,
                blocksPath: true,
                description: "Area denial, damages over time"
            },
            pipe_bomb: {
                name: "Pipe Bomb",
                quantity: 2,
                effect: "explosive",
                radius: 80,
                damage: 60,
                fuseTime: 3000,
                noiseLevel: 500,
                description: "High damage explosive"
            },
            lockpick: {
                name: "Lockpick Set",
                quantity: 5,
                effect: "unlock",
                unlockTime: 2000,
                silent: true,
                description: "Opens locked doors silently"
            },
            throwing_knife: {
                name: "Throwing Knives",
                quantity: 4,
                effect: "thrown",
                damage: 40,
                range: 200,
                noiseLevel: 10,
                retrievable: true,
                description: "Silent ranged attack, retrievable"
            },
            smoke_bomb: {
                name: "Smoke Bomb",
                quantity: 2,
                effect: "smoke",
                radius: 80,
                duration: 8000,
                quickDeploy: true,
                description: "Quick deploy smoke for escape"
            },
            trip_wire: {
                name: "Trip Wire Trap",
                quantity: 3,
                effect: "trap",
                damage: 30,
                stunDuration: 2000,
                noiseOnTrigger: 300,
                description: "Explosive trap for ambushes"
            },
            disguise_kit: {
                name: "Disguise Kit",
                quantity: 1,
                effect: "disguise",
                duration: 20000,
                detectRadius: 40,
                description: "Appear as civilian briefly"
            },
            hostage_restraints: {
                name: "Zip Ties",
                quantity: 3,
                effect: "hostage",
                takeTime: 2000,
                description: "Take civilians hostage"
            },
            jammer: {
                name: "Signal Jammer",
                quantity: 1,
                effect: "jam",
                radius: 150,
                duration: 15000,
                blocksComms: true,
                blocksDrones: true,
                description: "Disables cop electronics"
            }
        }
    }
};

const DEFAULT_LOADOUTS = {
    cops: {
        primary: "mp5",
        secondary: "m1911",
        equipment: "flashbang"
    },
    criminals: {
        primary: "ak47",
        secondary: "desert_eagle",
        equipment: "pipe_bomb"
    }
};

function validateLoadout(role, loadout) {
    if (!CVC_LOADOUTS[role]) {
        return { valid: false, error: `Invalid role: ${role}` };
    }

    const rolePool = CVC_LOADOUTS[role];

    if (!loadout.primary || !rolePool.primary[loadout.primary]) {
        return { valid: false, error: `Invalid primary weapon: ${loadout.primary}` };
    }

    if (!loadout.secondary || !rolePool.secondary[loadout.secondary]) {
        return { valid: false, error: `Invalid secondary weapon: ${loadout.secondary}` };
    }

    if (!loadout.equipment || !rolePool.equipment[loadout.equipment]) {
        return { valid: false, error: `Invalid equipment: ${loadout.equipment}` };
    }

    return { valid: true };
}

function getLoadoutItem(role, category, itemId) {
    if (!CVC_LOADOUTS[role] || !CVC_LOADOUTS[role][category]) {
        return null;
    }
    return CVC_LOADOUTS[role][category][itemId] || null;
}

function getAvailableItems(role, category) {
    if (!CVC_LOADOUTS[role] || !CVC_LOADOUTS[role][category]) {
        return {};
    }
    return CVC_LOADOUTS[role][category];
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        CVC_LOADOUTS,
        DEFAULT_LOADOUTS,
        validateLoadout,
        getLoadoutItem,
        getAvailableItems
    };
}