// fireRate and reloadTime in milliseconds, spread in radians.
const WEAPONS = {
    mp5: { name: 'Viper SMG', damage: 20, fireRate: 100, magSize: 30, totalAmmo: 90, spread: 0.1, auto: true, noiseLevel: 200, reloadTime: 1700, swapTime: 400, kind: 'smg' },
    m4a1: { name: 'Falcon Rifle', damage: 30, fireRate: 120, magSize: 30, totalAmmo: 90, spread: 0.08, auto: true, noiseLevel: 250, reloadTime: 2000, swapTime: 450, kind: 'rifle' },
    shotgun: { name: 'Breacher Shotgun', damage: 20, fireRate: 1000, magSize: 8, totalAmmo: 24, spread: 0.5, auto: false, pellets: 6, noiseLevel: 300, reloadTime: 2600, swapTime: 500, kind: 'shotgun' },
    sniper: { name: 'Longshot Rifle', damage: 100, fireRate: 1500, magSize: 5, totalAmmo: 15, spread: 0.02, auto: false, noiseLevel: 400, reloadTime: 2800, swapTime: 550, kind: 'sniper' },
    m1911: { name: 'Warden .45', damage: 35, fireRate: 300, magSize: 7, totalAmmo: 21, spread: 0.12, auto: false, noiseLevel: 180, reloadTime: 1100, swapTime: 300, kind: 'pistol' },
    glock: { name: 'Striker 9', damage: 25, fireRate: 200, magSize: 17, totalAmmo: 51, spread: 0.1, auto: false, noiseLevel: 170, reloadTime: 1100, swapTime: 300, kind: 'pistol' }
};

const EQUIPMENT = {
    flashbang: { name: 'Flashbang', quantity: 2, effect: 'stun', desc: 'Throw. Blinds and stuns enemies in the blast.' },
    smoke: { name: 'Smoke Grenade', quantity: 2, effect: 'smoke', desc: 'Throw. Blocks line of sight for 8 seconds.' },
    grenade: { name: 'Frag Grenade', quantity: 3, effect: 'grenade', desc: 'Throw. Area damage, hurts you too.' },
    doormine: { name: 'Door Mine', quantity: 2, effect: 'doormine', desc: 'Blows a locked door next to you.' },
    breaching: { name: 'Breaching Charge', quantity: 1, effect: 'breach', desc: 'Destroys the wall in front of you.' },
    medkit: { name: 'Medkit', quantity: 1, effect: 'heal', desc: 'Restores 50 health.' }
};
