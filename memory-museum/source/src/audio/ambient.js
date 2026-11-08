import { PERSONAS } from '../personas/personas.js';

const ATRIUM = [48.999, 73.416, 98.0];
const GARDEN = [65.406, 98.0, 130.81];
const BASEMENT = [32.703, 48.999, 61.735];

export class AudioMuseum {
  constructor(settings) {
    this.settings = settings;
    this.last = '';
    this.currentTrack = null;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      const ctx = this.context = new Context();
      this.master = ctx.createGain();
      this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
      this.master.connect(ctx.destination);
      this.room = ctx.createGain();
      this.room.gain.value = 0.36;
      this.room.connect(this.master);
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const waveform = this.noise.getChannelData(0);
      let sample = 0;
      for (let i = 0; i < waveform.length; i++) {
        sample = sample * 0.83 + (Math.random() * 2 - 1) * 0.19;
        waveform[i] = sample;
      }
      this.pads = ATRIUM.map((frequency, index) => {
        const voice = ctx.createOscillator();
        const gain = ctx.createGain();
        voice.type = index === 1 ? 'triangle' : 'sine';
        voice.frequency.value = frequency;
        gain.gain.value = 0;
        voice.connect(gain).connect(this.room);
        voice.start();
        return { voice, gain };
      });
      this.reverb = ctx.createDelay(0.5);
      this.reverb.delayTime.value = 0.154;
      const echo = ctx.createGain();
      echo.gain.value = 0.22;
      this.reverb.connect(echo).connect(this.master);
      this.bed = ctx.createBufferSource();
      this.bed.buffer = this.noise;
      this.bed.loop = true;
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 600;
      this.texture = ctx.createGain();
      this.texture.gain.value = 0;
      this.bed.connect(this.filter).connect(this.texture).connect(this.room);
      this.bed.start();
      this.last = '';
      ctx.resume().catch(() => {});
    } catch {}
  }

  volume() {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.volume, this.context.currentTime, 0.06);
  }

  silence() {
    this.room?.gain.setTargetAtTime(0, this.context.currentTime, 0.12);
    this.last = '';
  }

  update(zone, persona, modal, archiveMood, emotion) {
    if (!this.master) return;
    const now = this.context.currentTime;
    const hour = new Date().getHours();
    const key = [zone, persona.id, modal, Math.round(archiveMood * 10), hour, emotion].join('/');
    if (key !== this.last) {
      this.last = key;
      const base = zone === 'garden' ? GARDEN : zone === 'basement' ? BASEMENT : PERSONAS[zone]?.tones || ATRIUM;
      const darker = ['sorrow', 'fear', 'anger'].includes(emotion);
      this.pads.forEach(({ voice, gain }, index) => {
        const daylight = hour > 6 && hour < 19 ? 1.003 : 0.997;
        voice.frequency.setTargetAtTime((base[index] * 0.77 + persona.tones[index] * 0.23) * daylight, now, 0.85);
        gain.gain.setTargetAtTime((0.065 - index * 0.011) * (0.63 + archiveMood * 0.48) * (darker ? 0.89 : 1), now, 0.81);
      });
      this.filter.frequency.setTargetAtTime(zone === 'ripple' || zone === 'garden' ? 940 : zone === 'echo' ? 1600 : zone === 'basement' ? 150 : 260, now, 0.48);
      this.texture.gain.setTargetAtTime(zone === 'ripple' || zone === 'echo' ? 0.07 : zone === 'garden' ? 0.039 : 0.024, now, 0.55);
      this.room.gain.setTargetAtTime(modal ? 0.2 : 0.49, now, 0.15);
    }
    if (this.nextMotif === undefined) this.nextMotif = now + 6;
    if (now > this.nextMotif) {
      this.nextMotif = now + (zone === 'basement' ? 13 : zone === 'garden' ? 19 : 10);
      if (zone === 'basement' || zone === 'demon') {
        this.tone(46.2, 0, 0.22, 0.087);
        this.tone(49, 0.24, 0.2, 0.057);
      } else {
        this.tone(persona.tones[2] * 4, 0, 1.6, 0.019, 'sine', -0.28);
        this.tone(persona.tones[1] * 8, 0.69, 2.1, 0.013, 'sine', 0.32);
      }
    }
    if (this.currentTrack && now >= this.currentTrack.end) this.currentTrack = null;
  }

  tone(frequency, delay, length, volume, wave = 'sine', pan = 0, destination = this.master, endFrequency) {
    if (!destination) return;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, start + length * 0.92);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.06, length * 0.19));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner).connect(destination);
    } else gain.connect(destination);
    if (destination === this.master) gain.connect(this.reverb);
    osc.start(start);
    osc.stop(start + length + 0.01);
  }

  grit(length, volume, frequency, destination = this.master, delay = 0) {
    if (!destination) return;
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noise;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.025, length * 0.26));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    noise.connect(filter).connect(gain).connect(destination);
    noise.start(start);
    noise.stop(start + length);
  }

  foot(speed, zone) {
    this.grit(0.19, 0.15 + speed * 0.013, zone === 'garden' ? 830 : zone === 'brix' ? 640 : 380);
    if (speed > 6.5) this.grit(0.49, 0.04, 1100);
  }

  cue(name) {
    const play = (notes, time, volume, length, wave = 'sine') =>
      notes.forEach((note, index) => this.tone(note, index * time, length, volume / (1 + index * 0.14), wave));
    if (name === 'arrive') play([98, 146.83, 196, 293.66, 392, 293.66, 220, 196], 0.23, 0.046, 2.4);
    if (name === 'shift') play([61.74, 123.47, 261.63], 0.08, 0.13, 4.0, 'triangle');
    if (name === 'secret') {
      this.grit(0.26, 0.15, 2400);
      this.tone(281, 0, 1.4, 0.09, 'sine', 0.2, this.master, 902);
    }
    if (name === 'integrate') {
      this.grit(0.76, 0.09, 1400);
      play([196, 293.66, 392, 587.33], 0.13, 0.079, 2.2);
    }
    if (name === 'cat') {
      this.tone(530, 0, 0.31, 0.086, 'triangle', 0.1, this.master, 330);
      this.tone(46.2, 0.25, 1.5, 0.064, 'triangle');
    }
    if (name === 'select') this.tone(440, 0, 0.24, 0.041, 'triangle');
  }

  track(memory, pan = 0) {
    if (!this.master) return false;
    if (this.currentTrack?.id === memory.id) {
      this.stopTrack();
      return false;
    }
    this.stopTrack();
    const channel = this.context.createGain();
    channel.connect(this.master);
    const record = memory.type === 'song';
    const notes = record ? [164.81, 196, 246.94, 293.66, 196, 146.83, 196, 220, 246.94, 164.81, 196, 146.83]
      : [65.4, 98, 130.8, 104.65, 73.42, 98, 110];
    const length = record ? 0.65 : 0.84;
    notes.forEach((frequency, index) => {
      this.tone(frequency, index * length, record ? 1.45 : 2.2, 0.115, index % 3 ? 'sine' : 'triangle', pan, channel);
      if (record && index % 2 === 0) this.tone(frequency / 2, index * length, 1.8, 0.12, 'sine', pan, channel);
      this.grit(record ? 0.15 : 0.32, 0.085, record ? 2800 : 1400, channel, index * length + 0.11);
    });
    this.currentTrack = { id: memory.id, channel, end: this.context.currentTime + notes.length * length + 1.2 };
    return true;
  }

  stopTrack() {
    if (!this.currentTrack) return;
    const { channel } = this.currentTrack;
    channel.gain.setTargetAtTime(0, this.context.currentTime, 0.045);
    setTimeout(() => channel.disconnect(), 250);
    this.currentTrack = null;
  }

  scratch(direction) {
    this.grit(0.2, 0.2, 2300);
    this.tone(direction < 0 ? 520 : 190, 0, 0.22, 0.085, 'triangle', 0, this.master, direction < 0 ? 170 : 530);
  }
}
