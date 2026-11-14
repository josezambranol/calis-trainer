class SoundCoach {
  private audioCtx: AudioContext | null = null;
  private voiceEnabled = true;
  private soundEnabled = true;

  constructor() {
    // Lazy init de AudioContext tras interacción del usuario
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setPreferences(sound: boolean, voice: boolean) {
    this.soundEnabled = sound;
    this.voiceEnabled = voice;
  }

  /**
   * Emite un tono sintético con Web Audio API
   */
  public playTone(frequency = 440, type: OscillatorType = 'sine', durationMs = 150) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  public playCountdownTick() {
    this.playTone(600, 'sine', 80);
  }

  public playStartSignal() {
    this.playTone(880, 'triangle', 250);
  }

  public playRestSignal() {
    this.playTone(520, 'sine', 350);
  }

  public playVictorySignal() {
    if (!this.soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // Do, Mi, Sol, Do agudo
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 200);
      }, idx * 140);
    });
  }

  /**
   * Habla al usuario en español usando Web Speech API
   */
  public speak(message: string) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Detener pronunciaciones anteriores
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05; // ritmo dinámico y motivador
      utterance.pitch = 1.0;

      // Buscar voz en español si está disponible
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }
}

export const coach = new SoundCoach();
