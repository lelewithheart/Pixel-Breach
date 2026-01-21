// Official Mission Definitions
const MISSIONS = [
    {
        id: 1,
        name: 'Basic Training',
        description: 'Learn movement and basic controls',
        objectives: ['Move to the marked area', 'Practice crouching and sprinting'],
        tutorialSteps: ['Use WASD to move', 'Hold SHIFT to sprint', 'Press CTRL to crouch']
    },
    {
        id: 2,
        name: 'Weapons Training',
        description: 'Learn to use your weapons',
        objectives: ['Eliminate 3 training targets', 'Reload your weapon', 'Switch weapons'],
        tutorialSteps: ['Left click to shoot', 'Press R to reload', 'Press 1 or 2 to switch weapons']
    },
    {
        id: 3,
        name: 'Tactical Equipment',
        description: 'Master tactical gadgets',
        objectives: ['Use a flashbang on enemies', 'Throw a grenade', 'Use equipment effectively'],
        tutorialSteps: ['Press SPACE to use equipment', 'Flashbangs stun enemies', 'Grenades deal area damage']
    },
    {
        id: 4,
        name: 'Breach and Clear',
        description: 'Learn door breaching',
        objectives: ['Breach a locked door', 'Clear the room', 'Secure the area'],
        tutorialSteps: ['Approach locked doors', 'Shoot locks or use breaching charge', 'Use lockpick minigame']
    },
    {
        id: 5,
        name: 'Hostage Rescue',
        description: 'Rescue civilians safely',
        objectives: ['Locate 2 hostages', 'Rescue them without casualties', 'Reach extraction'],
        tutorialSteps: ['Press E near hostages', 'Avoid hitting civilians', 'Guide them to safety']
    },
    {
        id: 6,
        name: 'Stealth Operations',
        description: 'Use stealth and tactics',
        objectives: ['Use cover effectively', 'Avoid detection', 'Eliminate targets silently'],
        tutorialSteps: ['Stay behind cover', 'Crouch for stealth', 'Use line of sight']
    },
    {
        id: 7,
        name: 'Urban Warfare',
        description: 'Complex urban environment',
        objectives: ['Clear 3 buildings', 'Rescue all hostages', 'Neutralize all threats'],
        tutorialSteps: ['Check corners', 'Use gadgets wisely', 'Maintain situational awareness']
    },
    {
        id: 8,
        name: 'Final Exam',
        description: 'Prove your skills',
        objectives: ['Complete all objectives', 'Minimal casualties', 'Time limit: 5 minutes'],
        tutorialSteps: ['Use all skills learned', 'Work efficiently', 'Stay alert']
    }
];
