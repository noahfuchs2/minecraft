import { SoundType } from './blocks';

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.5;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play footstep sound based on surface
  public playFootstep(sound: SoundType) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    gain.connect(this.ctx.destination);

    // Filtered noise buffer
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();

    switch (sound) {
      case 'grass':
      case 'wool':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        break;
      case 'wood':
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, t);
        filter.Q.setValueAtTime(2, t);
        break;
      case 'stone':
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, t);
        break;
      case 'sand':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, t);
        break;
      default:
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, t);
    }

    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
  }

  // Play block breaking sound
  public playBlockBreak(sound: SoundType) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    gain.connect(this.ctx.destination);

    const bufferSize = this.ctx.sampleRate * 0.22;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    if (sound === 'stone') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + 0.2);
    } else if (sound === 'wood') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(150, t + 0.2);
    } else if (sound === 'glass') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2500, t);
      filter.frequency.exponentialRampToValueAtTime(1000, t + 0.18);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    }

    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
  }

  // Play block place sound (satisfying Minecraft "pop")
  public playBlockPlace(sound: SoundType) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Click tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = sound === 'stone' ? 'triangle' : 'sine';
    const startFreq = sound === 'stone' ? 520 : sound === 'wood' ? 240 : 380;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.6, t + 0.08);

    oscGain.gain.setValueAtTime(0.15 * this.volume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);

    // Subtle impact noise
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(sound === 'stone' ? 1400 : 700, t);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
  }

  // Play UI Click
  public playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1200, t + 0.02);

    gain.gain.setValueAtTime(0.12 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Play Jump
  public playJump() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.1);

    gain.gain.setValueAtTime(0.09 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }
}

export const soundManager = new SoundManager();
