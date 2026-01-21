// Weapon Definitions
// fireRate: milliseconds between shots
// spread: radians of bullet deviation for accuracy
// auto: whether weapon can fire automatically when holding mouse button
// noiseLevel: how far the gunshot sound travels (in pixels) to alert enemies
const WEAPONS = {
    mp5: { name: 'MP5', damage: 20, fireRate: 100, magSize: 30, totalAmmo: 90, spread: 0.1, auto: true, noiseLevel: 200 },
    m4a1: { name: 'M4A1', damage: 30, fireRate: 120, magSize: 30, totalAmmo: 90, spread: 0.08, auto: true, noiseLevel: 250 },
    shotgun: { name: 'M870', damage: 80, fireRate: 1000, magSize: 8, totalAmmo: 24, spread: 0.3, auto: false, pellets: 6, noiseLevel: 300 },
    sniper: { name: 'M24', damage: 100, fireRate: 1500, magSize: 5, totalAmmo: 15, spread: 0.02, auto: false, noiseLevel: 400 },
    m1911: { name: 'M1911', damage: 35, fireRate: 300, magSize: 7, totalAmmo: 21, spread: 0.12, auto: false, noiseLevel: 180 },
    glock: { name: 'Glock 17', damage: 25, fireRate: 200, magSize: 17, totalAmmo: 51, spread: 0.1, auto: false, noiseLevel: 170 }
};

const EQUIPMENT = {
    flashbang: { name: 'Flashbang', quantity: 2, effect: 'stun' },
    smoke: { name: 'Smoke Grenade', quantity: 2, effect: 'smoke' },
    grenade: { name: 'Frag Grenade', quantity: 3, effect: 'grenade' },
    doormine: { name: 'Door Mine', quantity: 2, effect: 'doormine' },
    breaching: { name: 'Breaching Charge', quantity: 1, effect: 'breach' },
    medkit: { name: 'Medkit', quantity: 1, effect: 'heal' }
};
