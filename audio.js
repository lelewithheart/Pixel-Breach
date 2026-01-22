// 8 Bit Audio

const AudioSystem = {
    context: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    currentMusic: null,
    musicEnabled: true,
    sfxEnabled: true,
    masterVolume: 0.5,
    musicVolume: 1.0,
    sfxVolume: 0.5,
    initialized: false,

    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.context.destination);

            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API not supported: ", e);
        }
    },

    resume() {
        if (this.context && this.context.state === "suspended") {
            this.context.resume();
        }
    },

    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    },

    setMusicVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    },

    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    },

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        }
        if (!this.musicEnabled && this.currentMusic) {
            this.stopMusic();
        }
        return this.musicEnabled;
    },

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        }
        return this.sfxEnabled;
    },

    createOscillator(type = "square", frequency = 440, duration = 0.1, gainNode = null) {
        if (!this.context || !this.initialized) return null;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        osc.connect(gain);
        gain.connect(gainNode || this.sfxGain);

        return { osc, gain, duration };
    },

    playBeep(frequency = 440, duration = 0.1, type = "square") {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        const { osc, gain } = this.createOscillator(type, frequency, duration);
        if (!osc) return;

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    },

    // sound effects

    playGunshot(weaponType = "default") {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        const now = this.context.currentTime;

        switch (weaponType) {
            case "mp5":
            case "m4a1":
                this.playNoise(0.05, 800, 200);
                this.playBeep(150, 0.03, "square");
                break;
            case "shotgun":
                this.playNoise(0.15, 400, 100);
                this.playBeep(80, 0.1, "square");
                this.playBeep(60, 0.15, "triangle");
                break;
            case "sniper":
                this.playNoise(0.1, 1000, 200);
                this.playBeep(200, 0.05, "square");
                this.playBeep(100, 0.1, "sawtooth");
                break;
            case "m1911":
            case "glock":
                this.playNoise(0.08, 600, 150);
                this.playBeep(120, 0.05, "square");
                break;
            default:
                this.playNoise(0.08, 500, 150);
                this.playBeep(100, 0.05, "square");
        }
    },

    playNoise(duration = 0.1, highFreq = 1000, lowFreq = 100) {
        if (!this.context || !this.initialized) return;

        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = (highFreq + lowFreq) / 2;
        filter.Q.value = 1;

        const gain = this.context.createGain();
        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + duration);
    },

    playReload() {
        this.resume();

        const now = this.context.currentTime;
        //mag release
        setTimeout(() => this.playBeep(300, 0.05, "square"), 0);
        //slide
        setTimeout(() => this.playBeep(200, 0.08, "sawtooth"), 200);
        //insert
        setTimeout(() => this.playBeep(400, 0.05, "square"), 400);
        //chamber
        setTimeout(() => this.playBeep(250, 0.06, "square"), 600);
    },

    playExplosion() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(60, 0.03, "triangle");
        this.playBeep(40, 0.4, "square");
        this.playNoise(0.2, 800, 200);
        setTimeout(() => this.playBeep(50, 0.2, "triangle"), 100);
        setTimeout(() => this.playNoise(0.1, 400, 100), 150);
    },

    playFlashbang() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(2000, 0.5, "sine");
        this.playBeep(1500, 0.4, "sine");
        this.playNoise(0.1, 2000, 500);
    },

    playDoor(isOpening = true) {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        if (isOpening) {
            this.playBeep(200, 0.1, "sawtooth");
            setTimeout(() => this.playBeep(180, 0.08, "sawtooth"), 50);
            setTimeout(() => this.playBeep(160, 0.06, "sawtooth"), 100);
        } else {
            this.playBeep(150, 0.08, "square");
            setTimeout(() => this.playBeep(200, 0.05, "square"), 80);
        }
    },

    playBreach() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playNoise(0.15, 600, 100);
        this.playBeep(100, 0.1, "square");
        this.playBeep(80, 0.15, "triangle");
    },

    playFootstep(isSprinting = false) {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        const freq = isSprinting ? 180 : 150;
        const duration = isSprinting ? 0.03 : 0.04;
        this.playBeep(freq, duration, "triangle");
    },

    playPickup() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(523, 0.08, "square");
        setTimeout(() => this.playBeep(659, 0.08, "square"), 80);
        setTimeout(() => this.playBeep(784, 0.1, "square"), 160);
    },

    playRescue() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(523, 0.1, "square");
        setTimeout(() => this.playBeep(659, 0.1, "square"), 100);
        setTimeout(() => this.playBeep(784, 0.1, "square"), 200);
        setTimeout(() => this.playBeep(1047, 0.15, "square"), 300);
    },

    playAlert() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(400, 0.1, "square");
        setTimeout(() => this.playBeep(500, 0.1, "square"), 100);
    },

    playHit(isPlayer = false) {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        if (isPlayer) {
            this.playBeep(200, 0.1, "square");
            this.playBeep(150, 0.15, "sawtooth");
        } else {
            this.playBeep(300, 0.05, "square");
        }
    },

    playEnemyDeath() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(400, 0.1, "square");
        setTimeout(() => this.playBeep(300, 0.1, "square"), 50);
        setTimeout(() => this.playBeep(200, 0.15, "square"), 100);
    },

    playClick() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(800, 0.03, "square");
    },

    playSelect() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(600, 0.05, "square");
        setTimeout(() => this.playBeep(800, 0.05, "square"), 50);
    },

    playVictory() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        const notes = [523, 523, 523, 659, 784, 659, 523, 784, 1047];
        const durations = [0.15, 0.15, 0.15, 0.15, 0.3, 0.15, 0.15, 0.15, 0.4];
        const delays = [0, 150, 300, 450, 600, 900, 1050, 1200, 1350];

        notes.forEach((note, i) => {
            setTimeout(() => this.playBeep(note, durations[i], "square"), delays[i]);
        });
    },

    playGameOver() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        const notes = [392, 370, 349, 330, 311, 294, 277, 262];
        notes.forEach((note, i) => {
            setTimeout(() => this.playBeep(note, 0.2, "square"), i * 150);
        });
    },

    playLockpickTick() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(1200, 0.02, "square");
    },

    playLockpickSuccess() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(800, 0.1, "square");
        setTimeout(() => this.playBeep(1000, 0.1, "square"), 100);
        setTimeout(() => this.playBeep(1200, 0.15, "square"), 200);
    },

    playLockpickFail() {
        if (!this.sfxEnabled || !this.initialized) return;
        this.resume();

        this.playBeep(300, 0.15, "square");
        setTimeout(() => this.playBeep(200, 0.2, "square"), 150);
    },

    // === MUSIC SYSTEM ===

    // Music sequence data - simple 8-bit melodies
    musicTracks: {
        menu: {
            tempo: 120,
            melody: [
                // Main theme - mysterious and tactical
                { note: 'E4', duration: 0.5 },
                { note: 'G4', duration: 0.25 },
                { note: 'A4', duration: 0.25 },
                { note: 'B4', duration: 0.5 },
                { note: 'A4', duration: 0.25 },
                { note: 'G4', duration: 0.25 },
                { note: 'E4', duration: 0.5 },
                { note: 'D4', duration: 0.5 },
                { note: 'E4', duration: 0.5 },
                { note: 'G4', duration: 0.25 },
                { note: 'A4', duration: 0.25 },
                { note: 'B4', duration: 0.5 },
                { note: 'D5', duration: 0.5 },
                { note: 'B4', duration: 0.5 },
                { note: 'A4', duration: 0.5 },
                { note: 'rest', duration: 0.5 }
            ],
            bassline: [
                { note: 'E2', duration: 1 },
                { note: 'E2', duration: 1 },
                { note: 'G2', duration: 1 },
                { note: 'A2', duration: 1 },
                { note: 'E2', duration: 1 },
                { note: 'E2', duration: 1 },
                { note: 'G2', duration: 1 },
                { note: 'B2', duration: 1 }
            ]
        },
        gameplay: {
            tempo: 140,
            melody: [
                // Action theme - tense and driving
                { note: 'A3', duration: 0.25 },
                { note: 'A3', duration: 0.25 },
                { note: 'C4', duration: 0.25 },
                { note: 'A3', duration: 0.25 },
                { note: 'D4', duration: 0.5 },
                { note: 'C4', duration: 0.25 },
                { note: 'A3', duration: 0.25 },
                { note: 'G3', duration: 0.5 },
                { note: 'A3', duration: 0.25 },
                { note: 'A3', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'D4', duration: 0.25 },
                { note: 'C4', duration: 0.5 },
                { note: 'D4', duration: 0.25 },
                { note: 'E4', duration: 0.25 },
                { note: 'A3', duration: 0.5 }
            ],
            bassline: [
                { note: 'A2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'G2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'A2', duration: 0.5 },
                { note: 'C3', duration: 0.5 },
                { note: 'A2', duration: 0.5 }
            ]
        }
    },

    // Note to frequency mapping
    noteFrequencies: {
        'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
        'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
        'C6': 1046.50
    },

    playMusic(trackName) {
        if (!this.musicEnabled || !this.initialized) return;
        this.resume();

        this.stopMusic();

        const track = this.musicTracks[trackName];
        if (!track) return;

        this.currentMusic = {
            trackName,
            playing: true,
            melodySources: [],
            bassSources: []
        };

        this.playMusicLoop(track);
    },

    playMusicLoop(track) {
        if (!this.currentMusic || !this.currentMusic.playing) return;

        const beatDuration = 60 / track.tempo;
        let melodyTime = this.context.currentTime;
        let bassTime = this.context.currentTime;

        let totalMelodyDuration = 0;
        let totalBassDuration = 0;

        track.melody.forEach(noteData => {
            if (noteData.note !== "rest") {
                const freq = this.noteFrequencies[noteData.note];
                if (freq) {
                    this.scheduleMusicNote(freq, melodyTime, noteData.duration * beatDuration, "square", 0.5);
                }
            }
            melodyTime += noteData.duration * beatDuration;
            totalMelodyDuration += noteData.duration * beatDuration;
        });

        track.bassline.forEach(noteData => {
            if (noteData.note !== "rest") {
                const freq = this.noteFrequencies[noteData.note];
                if (freq) {
                    this.scheduleMusicNote(freq, bassTime, noteData.duration * beatDuration * 0.9, "triangle", 0.4);
                }
            }
            bassTime += noteData.duration * beatDuration;
            totalBassDuration += noteData.duration * beatDuration;
        });

        const loopDuration = Math.max(totalMelodyDuration, totalBassDuration);
        this.currentMusic.loopTimeout = setTimeout(() => {
            if (this.currentMusic && this.currentMusic.playing) {
                this.playMusicLoop(track);
            }
        }, loopDuration * 1000);
    },

    scheduleMusicNote(frequency, startTime, duration, type, volume) {
        if (!this.context || !this.initialized) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gain.gain.setValueAtTime(volume, startTime + duration - 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
    },

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.playing = false;
            if (this.currentMusic.loopTimeout) {
                clearTimeout(this.currentMusic.loopTimeout);
            }
            this.currentMusic = null;
        }
    },

    pauseMusic() {
        if (this.currentMusic) {
            this.currentMusic.playing = false;
            if (this.currentMusic.loopTimeout) {
                clearTimeout(this.currentMusic.loopTimeout);
            }
        }
    },

    resumeMusic() {
        if (this.currentMusic && !this.currentMusic.playing) {
            this.currentMusic.playing = true;
            const track = this.musicTracks[this.currentMusic.trackName];
            if (track) {
                this.playMusicLoop(track);
            }
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = AudioSystem;
}