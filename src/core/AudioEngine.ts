function loadStoredVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredVolume(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* localStorage unavailable — volume just won't persist */
  }
}

type MusicTrack = "menu" | "stage" | "boss";

interface MusicStep {
  m: number | null;
  b: number | null;
}

const STEP_DURATION = 0.155;

// Semitone offsets from a 220Hz (A3) root, natural-minor flavored riffs.
const STAGE_PATTERN: MusicStep[] = [
  { m: 0, b: -12 }, { m: null, b: null }, { m: 7, b: null }, { m: null, b: null },
  { m: 10, b: -5 }, { m: null, b: null }, { m: 7, b: null }, { m: 3, b: null },
  { m: 0, b: -12 }, { m: null, b: null }, { m: 12, b: null }, { m: null, b: null },
  { m: 10, b: -5 }, { m: 7, b: null }, { m: 3, b: null }, { m: 0, b: null },
];

const BOSS_PATTERN: MusicStep[] = [
  { m: 0, b: -12 }, { m: 3, b: -12 }, { m: 7, b: null }, { m: 3, b: null },
  { m: 12, b: -5 }, { m: 10, b: -5 }, { m: 7, b: null }, { m: 3, b: null },
  { m: 0, b: -12 }, { m: 3, b: -12 }, { m: 15, b: null }, { m: 12, b: null },
  { m: 10, b: -7 }, { m: 8, b: -7 }, { m: 7, b: null }, { m: 5, b: null },
];

const MENU_PATTERN: MusicStep[] = [
  { m: 0, b: -12 }, { m: null, b: null }, { m: null, b: null }, { m: 5, b: null },
  { m: null, b: null }, { m: 7, b: null }, { m: null, b: null }, { m: null, b: null },
  { m: 12, b: -12 }, { m: null, b: null }, { m: 10, b: null }, { m: null, b: null },
  { m: 7, b: null }, { m: null, b: null }, { m: 5, b: null }, { m: null, b: null },
];

const TRACKS: Record<MusicTrack, { pattern: MusicStep[]; stepDur: number; wave: OscillatorType }> = {
  menu: { pattern: MENU_PATTERN, stepDur: STEP_DURATION * 1.3, wave: "triangle" },
  stage: { pattern: STAGE_PATTERN, stepDur: STEP_DURATION, wave: "square" },
  boss: { pattern: BOSS_PATTERN, stepDur: STEP_DURATION * 0.82, wave: "sawtooth" },
};

/** Web Audio synthesizer: procedural SFX + a tiny step-sequenced BGM. Everything generated at runtime, no audio files. */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private musicOn = false;
  private musicTrack: MusicTrack = "menu";
  private musicStepIndex = 0;
  private musicNextTime = 0;
  private musicTimeoutId: number | null = null;

  private sfxVolume = loadStoredVolume("ironskies_sfx_vol", 0.9);
  private musicVolume = loadStoredVolume("ironskies_music_vol", 0.3);

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);
    return this.ctx;
  }

  /** Must be called from within a user-gesture handler (browser autoplay policy). */
  unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    saveStoredVolume("ironskies_sfx_vol", this.sfxVolume);
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    saveStoredVolume("ironskies_music_vol", this.musicVolume);
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.floor(ctx.sampleRate * 0.8);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }

  // ---------------------------------------------------------------- SFX ---

  playShoot(type: "vulcan" | "laser" | "missile" = "vulcan"): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);

    if (type === "vulcan") {
      osc.type = "square";
      osc.frequency.setValueAtTime(720, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.07);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.09);
    } else if (type === "laser") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(340, t + 0.14);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.16);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(90, t + 0.2);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.23);
    }
  }

  playEnemyShoot(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.09);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  playExplosion(big = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const dur = big ? 0.6 : 0.28;

    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(big ? 1600 : 2600, t);
    filter.frequency.exponentialRampToValueAtTime(big ? 110 : 200, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(big ? 0.55 : 0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur);

    if (big) {
      const osc = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.4);
      oGain.gain.setValueAtTime(0.4, t);
      oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(oGain);
      oGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.46);
    }
  }

  playHit(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.045);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playPowerup(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const startT = t + i * 0.045;
      gain.gain.setValueAtTime(0.0001, startT);
      gain.gain.linearRampToValueAtTime(0.15, startT + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.13);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(startT);
      osc.stop(startT + 0.14);
    });
  }

  playUiClick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playBossAlarm(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const st = t + i * 0.35;
      osc.frequency.setValueAtTime(440, st);
      osc.frequency.exponentialRampToValueAtTime(880, st + 0.15);
      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(0.2, st + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.32);
    }
  }

  playVictory(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const startT = t + i * 0.09;
      gain.gain.setValueAtTime(0.0001, startT);
      gain.gain.linearRampToValueAtTime(0.2, startT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(startT);
      osc.stop(startT + 0.32);
    });
  }

  // -------------------------------------------------------------- Music ---

  setTrack(track: MusicTrack): void {
    if (this.musicTrack === track) return;
    this.musicTrack = track;
    this.musicStepIndex = 0;
  }

  startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.musicOn) return;
    this.musicOn = true;
    this.musicNextTime = ctx.currentTime + 0.1;
    this.musicStepIndex = 0;
    this.scheduleMusic();
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.musicTimeoutId !== null) {
      window.clearTimeout(this.musicTimeoutId);
      this.musicTimeoutId = null;
    }
  }

  private scheduleMusic = (): void => {
    if (!this.musicOn || !this.ctx) return;
    const lookahead = 0.2;
    const track = TRACKS[this.musicTrack];
    while (this.musicNextTime < this.ctx.currentTime + lookahead) {
      const step = track.pattern[this.musicStepIndex % track.pattern.length];
      this.playMusicStep(step, this.musicNextTime, track.wave);
      this.musicNextTime += track.stepDur;
      this.musicStepIndex++;
    }
    this.musicTimeoutId = window.setTimeout(this.scheduleMusic, 60);
  };

  private playMusicStep(step: MusicStep, time: number, wave: OscillatorType): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    if (step.m !== null) {
      const freq = 220 * Math.pow(2, step.m / 12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.13, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + STEP_DURATION * 0.85);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + STEP_DURATION);
    }
    if (step.b !== null) {
      const freq = 220 * Math.pow(2, step.b / 12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.16, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + STEP_DURATION * 3.4);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + STEP_DURATION * 3.6);
    }
  }
}

export const audio = new AudioEngine();
