import { defineTable } from "../../shared/records.ts";
type Tone = [number, number, number, OscillatorType, number];
type AirSound = [BiquadFilterType, number, number, number, number];
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
export class AudioEngine {
  declare enabled: boolean;
  declare ctx: AudioContext | null;
  declare last: Record<string, number>;
  declare noise: AudioBuffer | undefined;
  constructor(enabled = false) {
    this.enabled = enabled;
    this.ctx = null;
    this.last = {};
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch {
      this.enabled = false;
    }
  }
  play(name: string, hero?: string, tier = 1) {
    if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    if (
      now - (this.last[name] ?? -1) <
      ({ attack: 0.13, xp: 0.1, hurt: 0.25 }[name] || 0.08)
    )
      return;
    this.last[name] = now;
    const tones = defineTable<Tone>({
      beacon: [180, 360, 0.55, "sine", 0.055],
      treasure: [440, 1320, 0.6, "sine", 0.07],
      attack: [190, 90, 0.045, "triangle", 0.025],
      charge: [160, 360, 0.15, "sine", 0.02],
      impact: [120, 55, 0.045, "triangle", 0.014],
      xp: [720, 1050, 0.055, "sine", 0.026],
      hurt: [115, 40, 0.18, "sawtooth", 0.055],
      dash: [420, 70, 0.14, "triangle", 0.045],
      skill: [150, 620, 0.35, "triangle", 0.065],
      ultimate: [75, 140, 0.65, "sine", 0.05],
      arc: [650, 130, 0.09, "sawtooth", 0.023],
      heal: [450, 950, 0.2, "sine", 0.06],
      levelup: [520, 1040, 0.35, "sine", 0.08],
      boss: [100, 45, 0.65, "sawtooth", 0.07],
      bosskill: [220, 880, 0.55, "triangle", 0.065],
      cache: [380, 1140, 0.3, "sine", 0.07],
      dead: [250, 40, 0.8, "triangle", 0.07],
      pick: [550, 830, 0.1, "sine", 0.045],
    });
    const weapons = defineTable<Tone>({
      vesper: [210, 70, 0.14, "sine", 0.026],
      fen: [510, 150, 0.08, "triangle", 0.026],
      solace: [740, 460, 0.13, "sine", 0.023],
      orin: [330, 110, 0.12, "triangle", 0.026],
      kestrel: [200, 80, 0.07, "triangle", 0.025],
      morrow: [110, 35, 0.15, "sawtooth", 0.026],
      cinder: [270, 80, 0.1, "triangle", 0.028],
      briar: [420, 190, 0.08, "sine", 0.02],
      nyx: [820, 240, 0.055, "triangle", 0.019],
      volta: [620, 140, 0.08, "sawtooth", 0.019],
      rook: [105, 38, 0.14, "triangle", 0.04],
      lumen: [480, 130, 0.075, "triangle", 0.026],
    });
    const spec = name === "attack" && hero ? weapons[hero] : tones[name];
    if (!spec) return;
    if (name === "attack" && hero) this.weaponAir(hero, now);
    if (["skill", "ultimate"].includes(name) && hero)
      this.spellChime(hero, now, name === "ultimate" ? 3 : tier);
    const [from, to, duration, type, volume] = spec;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  spellChime(hero: string, now: number, tier: number) {
    const pitch = {
      cinder: 165,
      briar: 220,
      nyx: 196,
      volta: 247,
      rook: 110,
      lumen: 330,
      vesper: 147,
      fen: 185,
      solace: 349,
      orin: 262,
      kestrel: 294,
      morrow: 131,
    }[hero];
    if (!pitch) return;
    this.weaponAir(hero, now);
    for (let i = 0; i < tier + 1; i++) {
      const osc = this.ctx!.createOscillator(),
        gain = this.ctx!.createGain(),
        start = now + i * 0.055,
        duration = 0.25 + tier * 0.12;
      osc.type = ["solace", "lumen", "orin"].includes(hero)
        ? "sine"
        : "triangle";
      osc.frequency.setValueAtTime(pitch * [1, 1.5, 2, 3][i], start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        tier > 1 ? 0.015 : 0.009,
        start + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(start);
      osc.stop(start + duration + 0.01);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  }
  weaponAir(hero: string, now: number) {
    // One reusable noise buffer gives shots a breath, bowstring or weighty thud.
    // Filtering and envelopes create texture without loading external audio.
    const specs = defineTable<AirSound>({
      vesper: ["bandpass", 1100, 450, 0.13, 0.017],
      fen: ["highpass", 2800, 800, 0.075, 0.016],
      solace: ["bandpass", 2500, 1600, 0.12, 0.012],
      orin: ["bandpass", 1500, 400, 0.12, 0.018],
      kestrel: ["lowpass", 1500, 450, 0.07, 0.023],
      morrow: ["lowpass", 850, 90, 0.17, 0.035],
      cinder: ["bandpass", 1700, 500, 0.12, 0.023],
      briar: ["highpass", 2500, 700, 0.08, 0.01],
      nyx: ["highpass", 5000, 1200, 0.065, 0.014],
      volta: ["bandpass", 3400, 600, 0.08, 0.012],
      rook: ["lowpass", 900, 100, 0.16, 0.045],
      lumen: ["highpass", 3000, 900, 0.075, 0.016],
    });
    const s = specs[hero];
    if (!s) return;
    if (!this.noise) {
      this.noise = this.ctx!.createBuffer(
        1,
        Math.ceil(this.ctx!.sampleRate * 0.2),
        this.ctx!.sampleRate,
      );
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const [type, from, to, duration, volume] = s,
      source = this.ctx!.createBufferSource(),
      filter = this.ctx!.createBiquadFilter(),
      gain = this.ctx!.createGain();
    source.buffer = this.noise;
    filter.type = type;
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx!.destination);
    source.start(now);
    source.stop(now + duration + 0.01);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
}
