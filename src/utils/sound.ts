// Cozy 8-bit Web Audio API synthesizer for farm actions and optional peaceful background music

class CozySoundEngine {
  private ctx: AudioContext | null = null;
  public sfxEnabled = true;
  public bgmEnabled = false;
  private bgmTimer: number | null = null;
  private noteIndex = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTone(
    freq: number,
    duration = 0.1,
    type: OscillatorType = 'triangle',
    volume = 0.12,
    slideTo?: number
  ) {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  public playHoe() {
    this.playTone(150, 0.09, 'square', 0.08, 95);
    setTimeout(() => this.playTone(210, 0.06, 'triangle', 0.07, 130), 45);
  }

  public playWater() {
    this.playTone(340, 0.08, 'sine', 0.09, 520);
    setTimeout(() => this.playTone(460, 0.1, 'sine', 0.08, 680), 55);
  }

  public playPlant() {
    this.playTone(280, 0.07, 'triangle', 0.1, 420);
    setTimeout(() => this.playTone(440, 0.08, 'triangle', 0.09, 580), 50);
  }

  public playHarvest() {
    this.playTone(523.25, 0.08, 'triangle', 0.12);
    setTimeout(() => this.playTone(659.25, 0.08, 'triangle', 0.12), 65);
    setTimeout(() => this.playTone(783.99, 0.14, 'triangle', 0.14), 130);
  }

  public playChop() {
    this.playTone(120, 0.08, 'sawtooth', 0.1, 70);
  }

  public playCoin() {
    this.playTone(987.77, 0.07, 'square', 0.07);
    setTimeout(() => this.playTone(1318.51, 0.18, 'square', 0.08), 65);
  }

  public playAnimalHappy(isCow = false) {
    if (isCow) {
      this.playTone(165, 0.28, 'sawtooth', 0.06, 210);
      setTimeout(() => this.playTone(196, 0.25, 'triangle', 0.07, 160), 160);
    } else {
      this.playTone(620, 0.07, 'triangle', 0.09, 790);
      setTimeout(() => this.playTone(790, 0.09, 'triangle', 0.09, 660), 80);
    }
  }

  public playCoffeeSip() {
    this.playTone(440, 0.08, 'sine', 0.1, 554.37);
    setTimeout(() => this.playTone(554.37, 0.09, 'sine', 0.1, 659.25), 80);
    setTimeout(() => this.playTone(880, 0.18, 'triangle', 0.11), 160);
  }

  public playDoor() {
    this.playTone(240, 0.09, 'triangle', 0.09, 320);
    setTimeout(() => this.playTone(360, 0.11, 'triangle', 0.09, 290), 80);
  }

  public playSleep() {
    const notes = [523.25, 493.88, 440, 392, 329.63, 261.63];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.16, 'sine', 0.09), idx * 90);
    });
  }

  public toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
    return this.bgmEnabled;
  }

  private startBgm() {
    this.stopBgm();
    // Cozy pentatonic pastoral melody in C major (C4, D4, E4, G4, A4, C5, D5, E5)
    const melody = [
      261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66,
      261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 0,
      349.23, 440.00, 523.25, 440.00, 392.00, 329.63, 293.66, 329.63,
      261.63, 329.63, 293.66, 246.94, 261.63, 0, 0, 0,
    ];
    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmEnabled) return;
      const ctx = this.getContext();
      if (!ctx) return;
      const freq = melody[this.noteIndex % melody.length];
      this.noteIndex++;
      if (freq > 0) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    }, 380);
  }

  public stopBgm() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sound = new CozySoundEngine();
