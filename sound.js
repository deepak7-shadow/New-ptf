// Web Audio API Synthesizer for Cybernetic UI Sound Effects
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.18 : 0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  // Futuristic blip on hover
  playHover() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1320, t + 0.05);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // Tactile click on button
  playClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.08);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  // Quantum section shift chime
  playSectionTransition() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const freqs = [330, 440, 660];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + idx * 0.04 + 0.15);

        gain.gain.setValueAtTime(0.03, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.16);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.16);
      });
    } catch (e) {}
  }

  // Success chime when copying email or submitting
  playSuccess() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.07);

        gain.gain.setValueAtTime(0.06, t + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.3);
      });
    } catch (e) {}
  }
}

export const sound = new SoundEngine();
