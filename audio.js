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
    musicVolume: 0.3,
    sfxVolume: 0.5,
    initialized: false,

    init(){
        if(this.initialized) return;

        try{
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.context.destinations);

            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch(e){
            console.warn("Web Audio API not supported: ", e);
        }
    },

    resume(){
        if(this.context && this.context.state === "suspended"){
            this.context.resume();
        }
    },

    setMasterVolume(value){
        this.masterVolume = Math.max(0, Math.min(1, value));
        if(this.masterGain){
            this.masterGain.gain.value = this.masterVolume;
        }
    },

    setMusicVolume(value){
        this.masterVolume = Math.max(0, Math.min(1, value));
        if(this.musicGain){
            this.musicGain.gain.value = this.musicVolume;
        }
    },

    setSfxVolume(value){
        this.sfxVolume = Math.max(0, Math.min(1, value));
        if(this.sfxGain){
            this.sfxGain.gain.value = this.sfxVolume;
        }
    },

    toggleMusic(){
        this.musicEnabled = !this.musicEnabled;
        if(this.musicGain){
            this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        }
        if(!this.musicEnabled && this.currentMusic){
            this.stopMusic();
        }
        return this.musicEnabled;
    },

    toggleSfx(){
        this.sfxEnabled = !this.sfxEnabled;
        if(this.sfxGain){
            this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        }
        return this.sfxEnabled;
    },

    createOscillator(type = "square", frequency = 440, duration = 0.1, gainNode = null){
        if(!this.context || !this.initialized) return null;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = thype;
        osc.frequency.value = frequency;

        osc.connect(gain);
        gain.connect(gainNode || this.sfxGain);

        return {osc, gain, duration};
    },

    playBeep(frequency = 440, duration = 0.1, type = "square"){
        if(!this.sfxEnabled || !this.initialized) return;
        this.resume();

        
    }
}