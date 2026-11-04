const WEAPONS = {
    mp5: { name: 'Viper SMG', damage: 20, fireRate: 100, magSize: 30, totalAmmo: 90, spread: 0.1, auto: true, noiseLevel: 200 },
    m4a1: { name: 'Falcon Rifle', damage: 30, fireRate: 120, magSize: 30, totalAmmo: 90, spread: 0.08, auto: true, noiseLevel: 250 },
    shotgun: { name: 'Breacher Shotgun', damage: 20, fireRate: 1000, magSize: 8, totalAmmo: 24, spread: 0.5, auto: false, pellets: 6, noiseLevel: 300 },
    sniper: { name: 'Longshot Rifle', damage: 100, fireRate: 1500, magSize: 5, totalAmmo: 15, spread: 0.02, auto: false, noiseLevel: 400 },
    m1911: { name: 'Warden .45', damage: 35, fireRate: 300, magSize: 7, totalAmmo: 21, spread: 0.12, auto: false, noiseLevel: 180 },
    glock: { name: 'Striker 9', damage: 25, fireRate: 200, magSize: 17, totalAmmo: 51, spread: 0.1, auto: false, noiseLevel: 170 }
};

const EQUIPMENT = {
    flashbang: { name: 'Flashbang', quantity: 2, effect: 'stun' },
    smoke: { name: 'Smoke Grenade', quantity: 2, effect: 'smoke' },
    grenade: { name: 'Frag Grenade', quantity: 3, effect: 'grenade' },
    doormine: { name: 'Door Mine', quantity: 2, effect: 'doormine' },
    breaching: { name: 'Breaching Charge', quantity: 1, effect: 'breach' },
    medkit: { name: 'Medkit', quantity: 1, effect: 'heal' }
};