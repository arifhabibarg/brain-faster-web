/**
 * Rich Natural Soundscapes & Distinct Multi-Genre Music Engine for Brain Faster™
 * Every track runs its own dedicated Web Audio DSP architecture (noise/surf swells,
 * FM birdsong, rain + thunder, crackling fire + crickets, felt piano, lo-fi drums + Rhodes,
 * plucked nylon guitar, Tibetan singing bowls + bansuri flute, and bowed strings + harp)
 * spanning 36s–44s evolving journeys rather than short repeating loops.
 */

export type MusicTrackId =
  | 'forest_birdsong'
  | 'ocean_waves'
  | 'monsoon_rain'
  | 'mountain_stream'
  | 'campfire_night'
  | 'rainy_piano'
  | 'midnight_chill'
  | 'acoustic_meadow'
  | 'temple_meditation'
  | 'starry_strings';

export interface MusicTrackInfo {
  id: MusicTrackId;
  name: string;
  bnName: string;
  description: string;
  durationSeconds: number;
  accent: string;
}

export const BACKGROUND_MUSIC_TRACKS: MusicTrackInfo[] = [
  {
    id: 'forest_birdsong',
    name: 'Forest Birdsong',
    bnName: 'বনের পাখি ও বাতাস',
    description: 'প্রাকৃতিক বাতাসে পাখিদের মিষ্টি কলকাকলি ও ভোরের সুর',
    durationSeconds: 38,
    accent: '#16a34a',
  },
  {
    id: 'ocean_waves',
    name: 'Ocean Waves',
    bnName: 'সমুদ্রের ঢেউ',
    description: 'একটানা সমুদ্রের ঢেউয়ের গর্জন, ফেনা ও তীরের বাতাস',
    durationSeconds: 42,
    accent: '#0284c7',
  },
  {
    id: 'monsoon_rain',
    name: 'Monsoon Rain',
    bnName: 'ঝুম বৃষ্টি ও মেঘ',
    description: 'টানা বৃষ্টির রিমঝিম ফোঁটা ও দূর মেঘের মৃদু গর্জন',
    durationSeconds: 40,
    accent: '#475569',
  },
  {
    id: 'mountain_stream',
    name: 'Mountain Stream',
    bnName: 'পাহাড়ি ঝরনা',
    description: 'পাথুরে পাহাড়ি ঝরনার কলতান ও স্বচ্ছ পানির বুদবুদ',
    durationSeconds: 36,
    accent: '#0d9488',
  },
  {
    id: 'campfire_night',
    name: 'Campfire Night',
    bnName: 'রাতের ক্যাম্পফায়ার',
    description: 'আগুনের চিড়বিড় শব্দ, রাতের ঝিঁঝিঁ পোকা ও কোমল গিটার',
    durationSeconds: 38,
    accent: '#ea580c',
  },
  {
    id: 'rainy_piano',
    name: 'Rainy Felt Piano',
    bnName: 'বৃষ্টিস্নাত পিয়ানো',
    description: 'মৃদু বৃষ্টির সাথে ধীর ও আবেগময় স্লো পিয়ানো সুর',
    durationSeconds: 40,
    accent: '#4f46e5',
  },
  {
    id: 'midnight_chill',
    name: 'Midnight Lo-Fi Beat',
    bnName: 'মিডনাইট লো-ফাই বিট',
    description: 'সফট ড্রামস, ওয়ার্ম বেস, ভিনাইল ও জ্যাজ রোডস কর্ড',
    durationSeconds: 36,
    accent: '#7c3aed',
  },
  {
    id: 'acoustic_meadow',
    name: 'Acoustic Guitar',
    bnName: 'অ্যাকুস্টিক গিটার',
    description: 'নাইলন গিটার ফিঙ্গারপিকিং ও সবুজ মাঠের শান্ত বাতাস',
    durationSeconds: 36,
    accent: '#b45309',
  },
  {
    id: 'temple_meditation',
    name: 'Tibetan Meditation',
    bnName: 'তিব্বতি মেডিটেশন',
    description: 'গভীর সিংহিং বোল, পাহাড়ি বাতাস ও বাঁশির ধ্যানের সুর',
    durationSeconds: 44,
    accent: '#991b1b',
  },
  {
    id: 'starry_strings',
    name: 'Starry Strings & Harp',
    bnName: 'রাতের ভায়োলিন ও হার্প',
    description: 'গভীর ভায়োলিন সিম্ফনি ও স্বপ্নের মতো হার্প আরপিজিও',
    durationSeconds: 40,
    accent: '#be185d',
  },
];

const TRACK_DURATION_MS: Record<MusicTrackId, number> = {
  forest_birdsong: 38_000,
  ocean_waves: 42_000,
  monsoon_rain: 40_000,
  mountain_stream: 36_000,
  campfire_night: 38_000,
  rainy_piano: 40_000,
  midnight_chill: 36_000,
  acoustic_meadow: 36_000,
  temple_meditation: 44_000,
  starry_strings: 40_000,
};

export function getMusicTrackCycleDurationMs(trackId: MusicTrackId): number {
  return TRACK_DURATION_MS[trackId] ?? 36_000;
}

interface SharedDspAssets {
  pinkNoise: AudioBuffer;
  brownNoise: AudioBuffer;
  reverb: ConvolverNode;
  reverbWet: GainNode;
}

const dspAssetsMap = new WeakMap<AudioContext, SharedDspAssets>();

function getOrCreateDspAssets(ctx: AudioContext, masterOut: AudioNode): SharedDspAssets {
  const cached = dspAssetsMap.get(ctx);
  if (cached) return cached;

  const sampleRate = ctx.sampleRate;
  const noiseSec = 6;
  const noiseLen = sampleRate * noiseSec;

  // Seamless crossfaded stereo Pink Noise buffer
  const pinkNoise = ctx.createBuffer(2, noiseLen, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const out = pinkNoise.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    const raw = new Float32Array(noiseLen);
    for (let i = 0; i < noiseLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
      b6 = white * 0.115926;
    }
    // Crossfade tail into head for completely seamless looping
    const fadeSamples = Math.floor(sampleRate * 0.25);
    for (let i = 0; i < noiseLen; i++) {
      if (i < fadeSamples) {
        const w = i / fadeSamples;
        out[i] = raw[i] * w + raw[noiseLen - fadeSamples + i] * (1 - w);
      } else {
        out[i] = raw[i];
      }
    }
  }

  // Seamless crossfaded stereo Brown Noise buffer (deep warm ocean/wind/thunder)
  const brownNoise = ctx.createBuffer(2, noiseLen, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const out = brownNoise.getChannelData(ch);
    const raw = new Float32Array(noiseLen);
    let lastOut = 0;
    for (let i = 0; i < noiseLen; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.022 * white) / 1.022;
      raw[i] = lastOut * 2.8;
    }
    const fadeSamples = Math.floor(sampleRate * 0.3);
    for (let i = 0; i < noiseLen; i++) {
      if (i < fadeSamples) {
        const w = i / fadeSamples;
        out[i] = raw[i] * w + raw[noiseLen - fadeSamples + i] * (1 - w);
      } else {
        out[i] = raw[i];
      }
    }
  }

  // Lush 2.4-second warm stereo room/hall impulse response
  const revLen = Math.floor(sampleRate * 2.4);
  const impulse = ctx.createBuffer(2, revLen, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < revLen; i++) {
      const env = Math.pow(1 - i / revLen, 2.35);
      const white = (Math.random() * 2 - 1) * env;
      lp = lp * 0.55 + white * 0.45;
      data[i] = lp * 0.65;
    }
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse;
  const reverbWet = ctx.createGain();
  reverbWet.gain.setValueAtTime(0.32, ctx.currentTime);
  reverb.connect(reverbWet);
  reverbWet.connect(masterOut);

  const assets = { pinkNoise, brownNoise, reverb, reverbWet };
  dspAssetsMap.set(ctx, assets);
  return assets;
}

export interface AmbientTrackSession {
  stop: () => void;
}

class SessionTracker {
  public alive = true;
  private stopFns: Array<() => void> = [];
  private timeouts: Array<ReturnType<typeof setTimeout>> = [];
  private intervals: Array<ReturnType<typeof setInterval>> = [];

  constructor(
    private readonly ctx: AudioContext,
    public readonly dryBus: GainNode,
    public readonly wetBus: GainNode,
    private readonly sessionGain: GainNode
  ) {}

  public trackStop(fn: () => void) {
    this.stopFns.push(fn);
  }

  public after(ms: number, fn: () => void) {
    const id = setTimeout(() => {
      if (this.alive) fn();
    }, ms);
    this.timeouts.push(id);
    return id;
  }

  public every(ms: number, fn: () => void) {
    const id = setInterval(() => {
      if (this.alive) fn();
    }, ms);
    this.intervals.push(id);
    return id;
  }

  public startLoopBuffer(
    buffer: AudioBuffer,
    configureChain: (src: AudioBufferSourceNode) => AudioNode,
    playbackRate: number = 1
  ) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
    const tail = configureChain(src);
    tail.connect(this.dryBus);
    src.start(this.ctx.currentTime);
    this.trackStop(() => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped
      }
    });
    return src;
  }

  public stop() {
    if (!this.alive) return;
    this.alive = false;
    for (const id of this.timeouts) clearTimeout(id);
    for (const id of this.intervals) clearInterval(id);
    this.timeouts = [];
    this.intervals = [];

    const now = this.ctx.currentTime;
    try {
      this.sessionGain.gain.cancelScheduledValues(now);
      this.sessionGain.gain.setValueAtTime(this.sessionGain.gain.value, now);
      this.sessionGain.gain.linearRampToValueAtTime(0.0001, now + 0.16);
    } catch {
      // Ignore
    }

    setTimeout(() => {
      for (const fn of this.stopFns) {
        try {
          fn();
        } catch {
          // Ignore
        }
      }
      this.stopFns = [];
      try {
        this.dryBus.disconnect();
        this.wetBus.disconnect();
        this.sessionGain.disconnect();
      } catch {
        // Ignore
      }
    }, 180);
  }
}

/* -------------------------------------------------------------------------- */
/* 1. Forest Birdsong & Morning Breeze                                        */
/* -------------------------------------------------------------------------- */
function startForestBirdsong(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Continuous swaying morning leaf-breeze (pink noise -> warm bandpass + slow LFO)
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(460, ctx.currentTime);
    bp.Q.setValueAtTime(0.65, ctx.currentTime);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.075, ctx.currentTime);
    lfoGain.gain.setValueAtTime(190, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    lfo.start();
    s.trackStop(() => { try { lfo.stop(); lfo.disconnect(); } catch {} });

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.065, ctx.currentTime);
    src.connect(bp);
    bp.connect(g);
    g.connect(s.wetBus);
    return g;
  });

  // Distant sunlight warm drone (ultra-subtle harmonic warmth)
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(146.83, ctx.currentTime);
  droneGain.gain.setValueAtTime(0.007, ctx.currentTime);
  droneOsc.connect(droneGain);
  droneGain.connect(s.dryBus);
  droneOsc.start();
  s.trackStop(() => { try { droneOsc.stop(); droneOsc.disconnect(); } catch {} });

  // Realistic multi-species bird vocalizations
  const chirpNote = (
    startAt: number,
    fStart: number,
    fMid: number,
    fEnd: number,
    durSec: number,
    vol: number,
    vibratoHz: number = 0,
    vibratoDepth: number = 0
  ) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fStart, startAt);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, fMid), startAt + durSec * 0.45);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, fEnd), startAt + durSec);

    if (vibratoHz > 0 && vibratoDepth > 0) {
      const vib = ctx.createOscillator();
      const vibG = ctx.createGain();
      vib.frequency.setValueAtTime(vibratoHz, startAt);
      vibG.gain.setValueAtTime(vibratoDepth, startAt);
      vib.connect(vibG);
      vibG.connect(osc.frequency);
      vib.start(startAt);
      vib.stop(startAt + durSec + 0.02);
    }

    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.linearRampToValueAtTime(vol, startAt + Math.min(0.025, durSec * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0005, startAt + durSec);
    osc.connect(g);
    g.connect(s.dryBus);
    g.connect(s.wetBus);
    osc.start(startAt);
    osc.stop(startAt + durSec + 0.02);
  };

  let phraseCursor = 0;
  const triggerBirdPhrase = () => {
    if (!s.alive) return;
    if (typeof document === 'undefined' || !document.hidden) {
      const now = ctx.currentTime + 0.04;
      const species = phraseCursor % 5;
      phraseCursor++;

      if (species === 0) {
        // Robin melodic whistle + trill
        chirpNote(now, 2150, 2950, 2550, 0.14, 0.028, 18, 85);
        chirpNote(now + 0.21, 2400, 3300, 2850, 0.16, 0.032, 22, 110);
        chirpNote(now + 0.44, 2850, 3600, 3200, 0.11, 0.024);
      } else if (species === 1) {
        // Gentle Cuckoo two-note call
        chirpNote(now, 698.46, 715, 690, 0.18, 0.032);
        chirpNote(now + 0.34, 554.37, 560, 535, 0.24, 0.028);
      } else if (species === 2) {
        // Sparrow cheerful quick chirps
        const count = 3 + (phraseCursor % 2);
        for (let i = 0; i < count; i++) {
          const base = 2600 + i * 190;
          chirpNote(now + i * 0.105, base, base * 1.28, base * 0.96, 0.065, 0.022);
        }
      } else if (species === 3) {
        // Nightingale expressive warble phrase
        const notes = [1850, 2350, 2100, 2800, 2450, 3050];
        notes.forEach((f, idx) => {
          chirpNote(now + idx * 0.115, f * 0.92, f, f * 0.97, 0.095, 0.024, 28, 70);
        });
      } else {
        // Morning Dove soft woody coo
        chirpNote(now, 430, 485, 420, 0.26, 0.028);
        chirpNote(now + 0.36, 440, 470, 415, 0.18, 0.024);
        chirpNote(now + 0.62, 420, 455, 405, 0.28, 0.025);
      }
    }
    const nextDelay = 1150 + Math.random() * 1450;
    s.after(nextDelay, triggerBirdPhrase);
  };

  triggerBirdPhrase();
  // Second distant bird layer offset gently
  s.after(850, () => {
    const loopSecondBird = () => {
      if (!s.alive) return;
      if (typeof document === 'undefined' || !document.hidden) {
        const t = ctx.currentTime + 0.03;
        chirpNote(t, 3100, 3750, 3300, 0.08, 0.015);
        chirpNote(t + 0.13, 3350, 3950, 3450, 0.09, 0.014);
      }
      s.after(2600 + Math.random() * 2400, loopSecondBird);
    };
    loopSecondBird();
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Endless Ocean Waves                                                     */
/* -------------------------------------------------------------------------- */
function startOceanWaves(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Deep under-tide horizon murmur (continuous)
  s.startLoopBuffer(assets.brownNoise, (src) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(165, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.11, ctx.currentTime);
    src.connect(lp);
    lp.connect(g);
    return g;
  });

  // Active rolling surf layer shaped by organic irregular wave envelopes
  const surfFilter = ctx.createBiquadFilter();
  surfFilter.type = 'lowpass';
  surfFilter.frequency.setValueAtTime(220, ctx.currentTime);
  surfFilter.Q.setValueAtTime(0.7, ctx.currentTime);

  const surfGain = ctx.createGain();
  surfGain.gain.setValueAtTime(0.02, ctx.currentTime);
  surfFilter.connect(surfGain);
  surfGain.connect(s.dryBus);
  surfGain.connect(s.wetBus);

  const foamFilter = ctx.createBiquadFilter();
  foamFilter.type = 'bandpass';
  foamFilter.frequency.setValueAtTime(1250, ctx.currentTime);
  foamFilter.Q.setValueAtTime(0.55, ctx.currentTime);
  const foamGain = ctx.createGain();
  foamGain.gain.setValueAtTime(0.008, ctx.currentTime);
  foamFilter.connect(foamGain);
  foamGain.connect(s.dryBus);
  foamGain.connect(s.wetBus);

  const surfSrc = ctx.createBufferSource();
  surfSrc.buffer = assets.pinkNoise;
  surfSrc.loop = true;
  surfSrc.connect(surfFilter);
  surfSrc.connect(foamFilter);
  surfSrc.start(ctx.currentTime);
  s.trackStop(() => {
    try {
      surfSrc.stop();
      surfSrc.disconnect();
      surfFilter.disconnect();
      surfGain.disconnect();
      foamFilter.disconnect();
      foamGain.disconnect();
    } catch {}
  });

  let waveIdx = 0;
  const scheduleWave = () => {
    if (!s.alive) return;
    const swellSec = 2.4 + Math.random() * 1.4;
    const recedeSec = 3.2 + Math.random() * 1.8;
    const totalMs = (swellSec + recedeSec + 0.6) * 1000;

    if (typeof document === 'undefined' || !document.hidden) {
      const t = ctx.currentTime + 0.05;
      const crestPeak = 0.085 + Math.random() * 0.045;
      const freqPeak = 950 + Math.random() * 750;

      surfFilter.frequency.cancelScheduledValues(t);
      surfFilter.frequency.setValueAtTime(210, t);
      surfFilter.frequency.exponentialRampToValueAtTime(freqPeak, t + swellSec);
      surfFilter.frequency.exponentialRampToValueAtTime(195, t + swellSec + recedeSec);

      surfGain.gain.cancelScheduledValues(t);
      surfGain.gain.setValueAtTime(0.018, t);
      surfGain.gain.linearRampToValueAtTime(crestPeak, t + swellSec);
      surfGain.gain.exponentialRampToValueAtTime(0.018, t + swellSec + recedeSec);

      // Foamy crest hiss right as wave breaks
      foamGain.gain.cancelScheduledValues(t);
      foamGain.gain.setValueAtTime(0.004, t);
      foamGain.gain.linearRampToValueAtTime(0.036, t + swellSec * 0.95);
      foamGain.gain.exponentialRampToValueAtTime(0.004, t + swellSec + recedeSec * 0.75);

      // Distant gentle seagull cry every 3rd wave
      if (waveIdx % 3 === 1) {
        const gAt = t + swellSec + 0.5;
        const osc = ctx.createOscillator();
        const gg = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1180, gAt);
        osc.frequency.exponentialRampToValueAtTime(1520, gAt + 0.16);
        osc.frequency.exponentialRampToValueAtTime(1060, gAt + 0.42);
        gg.gain.setValueAtTime(0.0001, gAt);
        gg.gain.linearRampToValueAtTime(0.011, gAt + 0.07);
        gg.gain.exponentialRampToValueAtTime(0.0004, gAt + 0.46);
        osc.connect(gg);
        gg.connect(s.wetBus);
        osc.start(gAt);
        osc.stop(gAt + 0.48);
      }
    }
    waveIdx++;
    s.after(totalMs, scheduleWave);
  };

  scheduleWave();
}

/* -------------------------------------------------------------------------- */
/* 3. Monsoon Rain & Distant Thunder                                          */
/* -------------------------------------------------------------------------- */
function startMonsoonRain(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Continuous lush rainfall curtain
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, ctx.currentTime);
    bp.Q.setValueAtTime(0.42, ctx.currentTime);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3400, ctx.currentTime);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.068, ctx.currentTime);
    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(s.wetBus);
    return g;
  });

  // Soft earth rain rumble bed
  s.startLoopBuffer(assets.brownNoise, (src) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.055, ctx.currentTime);
    src.connect(lp);
    lp.connect(g);
    return g;
  });

  // Randomized leaf/puddle raindrops
  const dropLoop = () => {
    if (!s.alive) return;
    if (typeof document === 'undefined' || !document.hidden) {
      const t = ctx.currentTime + 0.02;
      const f = 520 + Math.random() * 880;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.65, t + 0.032);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.011 + Math.random() * 0.012, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 0.055);
      osc.connect(g);
      g.connect(s.wetBus);
      osc.start(t);
      osc.stop(t + 0.065);
    }
    s.after(140 + Math.random() * 280, dropLoop);
  };
  dropLoop();

  // Occasional deep distant rolling thunder (every 12–17s)
  const thunderLoop = () => {
    if (!s.alive) return;
    if (typeof document === 'undefined' || !document.hidden) {
      const t = ctx.currentTime + 0.05;
      const src = ctx.createBufferSource();
      src.buffer = assets.brownNoise;
      src.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(115, t);
      lp.frequency.exponentialRampToValueAtTime(48, t + 4.4);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.75);
      g.gain.linearRampToValueAtTime(0.09, t + 1.9);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 4.8);

      src.connect(lp);
      lp.connect(g);
      g.connect(s.dryBus);
      g.connect(s.wetBus);
      src.start(t);
      src.stop(t + 4.9);
    }
    s.after(11500 + Math.random() * 6500, thunderLoop);
  };
  s.after(2400, thunderLoop);
}

/* -------------------------------------------------------------------------- */
/* 4. Mountain Stream & Waterfall                                             */
/* -------------------------------------------------------------------------- */
function startMountainStream(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Lower cascading water bed
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(540, ctx.currentTime);
    bp.Q.setValueAtTime(1.1, ctx.currentTime);

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.setValueAtTime(0.19, ctx.currentTime);
    lfoG.gain.setValueAtTime(140, ctx.currentTime);
    lfo.connect(lfoG);
    lfoG.connect(bp.frequency);
    lfo.start();
    s.trackStop(() => { try { lfo.stop(); lfo.disconnect(); } catch {} });

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.068, ctx.currentTime);
    src.connect(bp);
    bp.connect(g);
    g.connect(s.wetBus);
    return g;
  });

  // Upper sparkling brook shimmer
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1250, ctx.currentTime);
    bp.Q.setValueAtTime(1.4, ctx.currentTime);

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.setValueAtTime(0.31, ctx.currentTime);
    lfoG.gain.setValueAtTime(320, ctx.currentTime);
    lfo.connect(lfoG);
    lfoG.connect(bp.frequency);
    lfo.start();
    s.trackStop(() => { try { lfo.stop(); lfo.disconnect(); } catch {} });

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.038, ctx.currentTime);
    src.connect(bp);
    bp.connect(g);
    return g;
  }, 1.15);

  // Bubbling stream pops
  const bubbleLoop = () => {
    if (!s.alive) return;
    if (typeof document === 'undefined' || !document.hidden) {
      const t = ctx.currentTime + 0.02;
      const f = 310 + Math.random() * 540;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.95, t + 0.048);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.014, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 0.065);
      osc.connect(g);
      g.connect(s.wetBus);
      osc.start(t);
      osc.stop(t + 0.075);
    }
    s.after(160 + Math.random() * 260, bubbleLoop);
  };
  bubbleLoop();

  // Gentle breeze bamboo chime over the brook
  const chimeNotes = [523.25, 587.33, 659.25, 783.99, 880.0];
  let chimeStep = 0;
  const chimeLoop = () => {
    if (!s.alive) return;
    if (typeof document === 'undefined' || !document.hidden) {
      const t = ctx.currentTime + 0.04;
      const f = chimeNotes[(chimeStep * 2) % chimeNotes.length];
      chimeStep++;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.015, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 1.4);
      osc.connect(g);
      g.connect(s.wetBus);
      osc.start(t);
      osc.stop(t + 1.45);
    }
    s.after(2800 + Math.random() * 2400, chimeLoop);
  };
  s.after(1400, chimeLoop);
}

/* -------------------------------------------------------------------------- */
/* 5. Campfire Night & Crickets                                               */
/* -------------------------------------------------------------------------- */
function startCampfireNight(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Warm flickering ember glow
  s.startLoopBuffer(assets.brownNoise, (src) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(195, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.075, ctx.currentTime);

    const flicker = ctx.createOscillator();
    const flG = ctx.createGain();
    flicker.frequency.setValueAtTime(0.35, ctx.currentTime);
    flG.gain.setValueAtTime(0.02, ctx.currentTime);
    flicker.connect(flG);
    flG.connect(g.gain);
    flicker.start();
    s.trackStop(() => { try { flicker.stop(); flicker.disconnect(); } catch {} });

    src.connect(lp);
    lp.connect(g);
    return g;
  });

  // Realistic wood fire pops & crackles
  const crackleLoop = () => {
    if (!s.alive) return;
    if (typeof document === 'undefined' || !document.hidden) {
      const t = ctx.currentTime + 0.02;
      const src = ctx.createBufferSource();
      src.buffer = assets.pinkNoise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1800 + Math.random() * 2600, t);
      bp.Q.setValueAtTime(2.4, t);

      const g = ctx.createGain();
      const peak = 0.03 + Math.random() * 0.055;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 0.018 + Math.random() * 0.02);

      src.connect(bp);
      bp.connect(g);
      g.connect(s.dryBus);
      g.connect(s.wetBus);
      src.start(t, Math.random() * 4.5, 0.05);
    }
    s.after(110 + Math.random() * 390, crackleLoop);
  };
  crackleLoop();

  // Authentic summer night cricket chirps
  const cricketLoop = () => {
    if (!s.alive) return;
    if (typeof document === 'undefined' || !document.hidden) {
      const now = ctx.currentTime + 0.04;
      const bursts = 3 + Math.floor(Math.random() * 2);
      const baseFreq = 3950 + Math.random() * 260;

      for (let b = 0; b < bursts; b++) {
        const startAt = now + b * 0.42;
        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const env = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, startAt);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(26, startAt);
        modGain.gain.setValueAtTime(0.008, startAt);

        env.gain.setValueAtTime(0.008, startAt);
        mod.connect(modGain);
        modGain.connect(env.gain);

        const masterPulse = ctx.createGain();
        masterPulse.gain.setValueAtTime(0.0001, startAt);
        masterPulse.gain.linearRampToValueAtTime(1.0, startAt + 0.025);
        masterPulse.gain.setValueAtTime(1.0, startAt + 0.22);
        masterPulse.gain.linearRampToValueAtTime(0.0001, startAt + 0.26);

        osc.connect(env);
        env.connect(masterPulse);
        masterPulse.connect(s.wetBus);

        mod.start(startAt);
        osc.start(startAt);
        mod.stop(startAt + 0.27);
        osc.stop(startAt + 0.27);
      }
    }
    s.after(2600 + Math.random() * 2400, cricketLoop);
  };
  s.after(600, cricketLoop);

  // Subtle warm fireside chord harmonics
  const fireChords = [
    [196.0, 293.66, 392.0],
    [164.81, 246.94, 329.63],
    [174.61, 261.63, 349.23],
    [146.83, 220.0, 293.66],
  ];
  let fc = 0;
  s.every(4800, () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const t = ctx.currentTime + 0.04;
    const chord = fireChords[fc % fireChords.length];
    fc++;
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.14);
      g.gain.setValueAtTime(0.0001, t + idx * 0.14);
      g.gain.linearRampToValueAtTime(0.012, t + idx * 0.14 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0004, t + idx * 0.14 + 2.2);
      osc.connect(g);
      g.connect(s.wetBus);
      osc.start(t + idx * 0.14);
      osc.stop(t + idx * 0.14 + 2.25);
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 6. Rainy Felt Piano (40s Lyrical Composition + Gentle Drizzle)             */
/* -------------------------------------------------------------------------- */
function playFeltPianoNote(
  ctx: AudioContext,
  s: SessionTracker,
  freq: number,
  startAt: number,
  durSec: number,
  velocity: number
) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const g = ctx.createGain();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, startAt);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startAt);

  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.22, startAt);

  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(2600, freq * 4.2), startAt);
  lp.frequency.exponentialRampToValueAtTime(Math.max(240, freq * 1.4), startAt + durSec);

  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.linearRampToValueAtTime(velocity, startAt + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0005, startAt + durSec);

  osc1.connect(lp);
  osc2.connect(g2);
  g2.connect(lp);
  lp.connect(g);
  g.connect(s.dryBus);
  g.connect(s.wetBus);

  osc1.start(startAt);
  osc2.start(startAt);
  osc1.stop(startAt + durSec + 0.04);
  osc2.stop(startAt + durSec + 0.04);
}

function startRainyPiano(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Soft distant window drizzle
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1350, ctx.currentTime);
    bp.Q.setValueAtTime(0.55, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.022, ctx.currentTime);
    src.connect(bp);
    bp.connect(g);
    return g;
  });

  // 16-bar x 2.5s = 40s lyrical piano piece (each bar has distinct left-hand + expressive melody)
  const bars: Array<{
    lh: [number, number, number];
    rh: Array<{ offset: number; f: number; dur: number }>;
  }> = [
    { lh: [130.81, 196.0, 261.63], rh: [{ offset: 0.1, f: 523.25, dur: 1.4 }, { offset: 1.35, f: 493.88, dur: 1.1 }] },
    { lh: [110.0, 164.81, 220.0], rh: [{ offset: 0.15, f: 440.0, dur: 1.2 }, { offset: 1.15, f: 523.25, dur: 0.7 }, { offset: 1.85, f: 587.33, dur: 0.8 }] },
    { lh: [87.31, 130.81, 174.61], rh: [{ offset: 0.1, f: 659.25, dur: 1.6 }, { offset: 1.65, f: 587.33, dur: 0.9 }] },
    { lh: [98.0, 146.83, 196.0], rh: [{ offset: 0.15, f: 523.25, dur: 1.1 }, { offset: 1.2, f: 493.88, dur: 1.3 }] },

    { lh: [130.81, 196.0, 329.63], rh: [{ offset: 0.05, f: 783.99, dur: 1.3 }, { offset: 1.3, f: 659.25, dur: 1.2 }] },
    { lh: [110.0, 164.81, 261.63], rh: [{ offset: 0.1, f: 587.33, dur: 0.9 }, { offset: 0.95, f: 659.25, dur: 0.8 }, { offset: 1.75, f: 783.99, dur: 0.9 }] },
    { lh: [87.31, 174.61, 220.0], rh: [{ offset: 0.1, f: 880.0, dur: 1.7 }, { offset: 1.8, f: 783.99, dur: 0.8 }] },
    { lh: [98.0, 146.83, 246.94], rh: [{ offset: 0.2, f: 698.46, dur: 1.1 }, { offset: 1.35, f: 659.25, dur: 1.2 }] },

    { lh: [146.83, 220.0, 293.66], rh: [{ offset: 0.1, f: 659.25, dur: 1.3 }, { offset: 1.35, f: 587.33, dur: 1.1 }] },
    { lh: [123.47, 196.0, 293.66], rh: [{ offset: 0.1, f: 523.25, dur: 1.1 }, { offset: 1.2, f: 587.33, dur: 1.3 }] },
    { lh: [110.0, 164.81, 261.63], rh: [{ offset: 0.1, f: 523.25, dur: 0.9 }, { offset: 1.0, f: 440.0, dur: 1.4 }] },
    { lh: [87.31, 130.81, 220.0], rh: [{ offset: 0.15, f: 493.88, dur: 1.2 }, { offset: 1.4, f: 523.25, dur: 1.1 }] },

    { lh: [130.81, 196.0, 261.63], rh: [{ offset: 0.1, f: 659.25, dur: 1.5 }, { offset: 1.6, f: 587.33, dur: 0.9 }] },
    { lh: [87.31, 130.81, 174.61], rh: [{ offset: 0.1, f: 523.25, dur: 1.3 }, { offset: 1.45, f: 440.0, dur: 1.1 }] },
    { lh: [98.0, 146.83, 196.0], rh: [{ offset: 0.15, f: 392.0, dur: 1.2 }, { offset: 1.35, f: 493.88, dur: 1.1 }] },
    { lh: [130.81, 196.0, 261.63], rh: [{ offset: 0.1, f: 523.25, dur: 2.3 }] },
  ];

  let barIdx = 0;
  const playBar = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const bar = bars[barIdx % bars.length];
    barIdx++;
    const now = ctx.currentTime + 0.04;
    bar.lh.forEach((f, idx) => {
      playFeltPianoNote(ctx, s, f, now + idx * 0.42, 2.1, idx === 0 ? 0.042 : 0.026);
    });
    bar.rh.forEach((note) => {
      playFeltPianoNote(ctx, s, note.f, now + note.offset, note.dur, 0.036);
    });
  };
  playBar();
  s.every(2500, playBar);
}

/* -------------------------------------------------------------------------- */
/* 7. Midnight Lo-Fi Beat (36s Warm Drum Groove + Rhodes + Sub-Bass)          */
/* -------------------------------------------------------------------------- */
function startMidnightChill(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Warm vinyl dust noise floor
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1600, ctx.currentTime);
    bp.Q.setValueAtTime(0.8, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.011, ctx.currentTime);
    src.connect(bp);
    bp.connect(g);
    return g;
  });

  const triggerKick = (t: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(118, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.115, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.24);
    osc.connect(g);
    g.connect(s.dryBus);
    osc.start(t);
    osc.stop(t + 0.26);
  };

  const triggerBrushSnare = (t: number) => {
    const src = ctx.createBufferSource();
    src.buffer = assets.pinkNoise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1150, t);
    bp.Q.setValueAtTime(1.1, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.14);
    src.connect(bp);
    bp.connect(g);
    g.connect(s.dryBus);
    g.connect(s.wetBus);
    src.start(t, Math.random() * 4, 0.16);
  };

  const triggerHat = (t: number) => {
    const src = ctx.createBufferSource();
    src.buffer = assets.pinkNoise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4200, t);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(6800, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.016, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.055);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(s.dryBus);
    src.start(t, Math.random() * 4, 0.07);
  };

  // 12-bar x 3000ms = 36s chill Rhodes + sub-bass progression
  const bars = [
    { bass: 87.31, chord: [174.61, 220.0, 261.63, 329.63, 392.0] }, // Fmaj9
    { bass: 82.41, chord: [164.81, 196.0, 246.94, 293.66, 392.0] }, // Em7
    { bass: 73.42, chord: [146.83, 174.61, 220.0, 261.63, 329.63] }, // Dm9
    { bass: 98.0, chord: [196.0, 246.94, 293.66, 349.23, 440.0] },  // G13
    { bass: 110.0, chord: [220.0, 261.63, 329.63, 392.0, 493.88] }, // Am9
    { bass: 98.0, chord: [196.0, 246.94, 293.66, 349.23, 440.0] },
    { bass: 87.31, chord: [174.61, 220.0, 261.63, 329.63, 392.0] },
    { bass: 130.81, chord: [261.63, 329.63, 392.0, 493.88, 587.33] }, // Cmaj9
    { bass: 116.54, chord: [233.08, 293.66, 349.23, 440.0] }, // Bbmaj7
    { bass: 110.0, chord: [220.0, 261.63, 329.63, 392.0] },
    { bass: 73.42, chord: [146.83, 174.61, 220.0, 261.63] },
    { bass: 98.0, chord: [196.0, 246.94, 293.66, 349.23] },
  ];

  let barIdx = 0;
  const playChillBar = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const bar = bars[barIdx % bars.length];
    barIdx++;
    const now = ctx.currentTime + 0.04;
    const beat = 0.75; // 80 BPM -> 4 beats = 3000ms

    // Warm walking sub-bass
    [
      [0, bar.bass, 1.4],
      [beat * 2, bar.bass * 1.5, 0.7],
      [beat * 3, bar.bass * 1.12, 0.65],
    ].forEach(([off, f, dur]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + off);
      g.gain.setValueAtTime(0.0001, now + off);
      g.gain.linearRampToValueAtTime(0.055, now + off + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0006, now + off + dur);
      osc.connect(g);
      g.connect(s.dryBus);
      osc.start(now + off);
      osc.stop(now + off + dur + 0.03);
    });

    // Warm Rhodes chord strum on beat 1 + gentle syncopated stab on beat 3.5
    bar.chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.025);
      g.gain.setValueAtTime(0.0001, now + idx * 0.025);
      g.gain.linearRampToValueAtTime(0.017, now + idx * 0.025 + 0.035);
      g.gain.exponentialRampToValueAtTime(0.0004, now + 2.6);
      osc.connect(g);
      g.connect(s.wetBus);
      osc.start(now + idx * 0.025);
      osc.stop(now + 2.65);
    });

    // Chill drum groove (swung kicks, snares on 2 & 4, swung 8th hats)
    triggerKick(now);
    triggerKick(now + beat * 1.52);
    triggerKick(now + beat * 2.52);
    triggerBrushSnare(now + beat);
    triggerBrushSnare(now + beat * 3);
    for (let h = 0; h < 8; h++) {
      const swing = h % 2 === 1 ? 0.04 : 0;
      triggerHat(now + h * (beat * 0.5) + swing);
    }
  };

  playChillBar();
  s.every(3000, playChillBar);
}

/* -------------------------------------------------------------------------- */
/* 8. Acoustic Guitar & Meadow (36s Fingerstyle Composition)                  */
/* -------------------------------------------------------------------------- */
function playGuitarPluck(
  ctx: AudioContext,
  s: SessionTracker,
  freq: number,
  startAt: number,
  durSec: number,
  vel: number
) {
  const osc = ctx.createOscillator();
  const body = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const g = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startAt);
  body.type = 'sine';
  body.frequency.setValueAtTime(freq * 2, startAt);

  const bGain = ctx.createGain();
  bGain.gain.setValueAtTime(0.32, startAt);

  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(2800, freq * 5.2), startAt);
  lp.frequency.exponentialRampToValueAtTime(Math.max(260, freq * 1.3), startAt + durSec * 0.8);

  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.linearRampToValueAtTime(vel, startAt + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0005, startAt + durSec);

  osc.connect(lp);
  body.connect(bGain);
  bGain.connect(lp);
  lp.connect(g);
  g.connect(s.dryBus);
  g.connect(s.wetBus);
  osc.start(startAt);
  body.start(startAt);
  osc.stop(startAt + durSec + 0.03);
  body.stop(startAt + durSec + 0.03);
}

function startAcousticMeadow(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // Gentle meadow air
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, ctx.currentTime);
    bp.Q.setValueAtTime(0.6, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.024, ctx.currentTime);
    src.connect(bp);
    bp.connect(g);
    return g;
  });

  // 16 bars x 2250ms = 36s fingerstyle progression in G major
  const chords: Array<[number, number, number, number, number]> = [
    [98.0, 196.0, 246.94, 293.66, 392.0],   // G
    [92.5, 185.0, 220.0, 293.66, 369.99],   // D/F#
    [82.41, 164.81, 246.94, 293.66, 392.0], // Em7
    [130.81, 196.0, 293.66, 329.63, 392.0], // Cadd9
    [110.0, 196.0, 261.63, 329.63, 392.0],  // Am7
    [146.83, 220.0, 293.66, 369.99, 440.0], // D
    [98.0, 196.0, 246.94, 329.63, 392.0],   // G6
    [146.83, 220.0, 261.63, 329.63, 392.0], // D7sus4
    [82.41, 196.0, 246.94, 329.63, 493.88], // Em9
    [123.47, 196.0, 246.94, 293.66, 440.0], // Bm7
    [130.81, 196.0, 261.63, 329.63, 440.0], // C6
    [98.0, 196.0, 246.94, 293.66, 392.0],   // G
    [110.0, 164.81, 261.63, 329.63, 440.0], // Am
    [130.81, 196.0, 261.63, 329.63, 392.0], // C
    [146.83, 220.0, 293.66, 369.99, 440.0], // D
    [98.0, 196.0, 246.94, 293.66, 392.0],   // G resolve
  ];

  // Classic 8-step Travis fingerpicking pattern indices across chord strings
  const pickOrder = [0, 2, 3, 4, 1, 3, 2, 4];
  let idx = 0;

  const playGuitarBar = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const ch = chords[idx % chords.length];
    idx++;
    const now = ctx.currentTime + 0.04;
    const stepSec = 2.25 / 8;
    pickOrder.forEach((strIdx, i) => {
      const f = ch[strIdx];
      const vel = strIdx === 0 ? 0.045 : i === 3 || i === 7 ? 0.036 : 0.028;
      playGuitarPluck(ctx, s, f, now + i * stepSec, 1.45, vel);
    });
  };

  playGuitarBar();
  s.every(2250, playGuitarBar);
}

/* -------------------------------------------------------------------------- */
/* 9. Tibetan Temple Meditation (44s Singing Bowls + Bansuri Flute)           */
/* -------------------------------------------------------------------------- */
function startTempleMeditation(ctx: AudioContext, s: SessionTracker, assets: SharedDspAssets) {
  // High altitude mountain wind
  s.startLoopBuffer(assets.pinkNoise, (src) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(340, ctx.currentTime);
    bp.Q.setValueAtTime(1.4, ctx.currentTime);

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.setValueAtTime(0.06, ctx.currentTime);
    lfoG.gain.setValueAtTime(135, ctx.currentTime);
    lfo.connect(lfoG);
    lfoG.connect(bp.frequency);
    lfo.start();
    s.trackStop(() => { try { lfo.stop(); lfo.disconnect(); } catch {} });

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.045, ctx.currentTime);
    src.connect(bp);
    bp.connect(g);
    g.connect(s.wetBus);
    return g;
  });

  // Singing bowl strikes (11 bars x 4000ms = 44s)
  const bowlFreqs = [174.61, 220.0, 261.63, 196.0, 146.83, 220.0, 174.61, 293.66, 220.0, 196.0, 174.61];
  const flutePhrases = [
    [523.25, 587.33, 659.25],
    [659.25, 587.33, 523.25],
    [440.0, 523.25, 587.33],
    [783.99, 659.25, 587.33],
    [587.33, 523.25, 440.0],
    [659.25, 783.99, 880.0],
    [783.99, 659.25, 523.25],
    [523.25, 659.25, 587.33],
    [587.33, 440.0, 523.25],
    [440.0, 392.0, 440.0],
    [523.25, 440.0, 392.0],
  ];

  let step = 0;
  const playTempleBar = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const i = step % bowlFreqs.length;
    step++;
    const now = ctx.currentTime + 0.05;
    const baseF = bowlFreqs[i];

    // Tibetan Singing Bowl partials + natural shimmer beat
    [
      [baseF, 0.042, 6.2],
      [baseF + 0.9, 0.025, 5.8],
      [baseF * 2.756, 0.016, 4.2],
      [baseF * 5.404, 0.006, 2.4],
    ].forEach(([f, peak, dur]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0004, now + dur);
      osc.connect(g);
      g.connect(s.dryBus);
      g.connect(s.wetBus);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });

    // Expressive Bansuri Flute melody phrase
    const phrase = flutePhrases[i];
    phrase.forEach((f, idx) => {
      const startAt = now + 0.75 + idx * 0.95;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.94, startAt);
      osc.frequency.exponentialRampToValueAtTime(f, startAt + 0.14);

      const vib = ctx.createOscillator();
      const vibG = ctx.createGain();
      vib.frequency.setValueAtTime(4.8, startAt);
      vibG.gain.setValueAtTime(3.2, startAt);
      vib.connect(vibG);
      vibG.connect(osc.frequency);
      vib.start(startAt);
      vib.stop(startAt + 0.92);

      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.linearRampToValueAtTime(0.024, startAt + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0004, startAt + 0.88);
      osc.connect(g);
      g.connect(s.wetBus);
      osc.start(startAt);
      osc.stop(startAt + 0.92);
    });
  };

  playTempleBar();
  s.every(4000, playTempleBar);
}

/* -------------------------------------------------------------------------- */
/* 10. Starry Night Violin & Harp (40s Cinematic Orchestral Ambient)          */
/* -------------------------------------------------------------------------- */
function startStarryStrings(ctx: AudioContext, s: SessionTracker) {
  // 10 bars x 4000ms = 40s lush bowed string chords + harp glissandos
  const sections: Array<{ chord: number[]; harp: number[] }> = [
    { chord: [220.0, 261.63, 329.63, 440.0], harp: [523.25, 659.25, 783.99, 880.0, 1046.5] },
    { chord: [174.61, 220.0, 261.63, 349.23], harp: [523.25, 698.46, 880.0, 1046.5, 880.0] },
    { chord: [196.0, 246.94, 293.66, 392.0], harp: [587.33, 783.99, 987.77, 1174.66, 987.77] },
    { chord: [164.81, 246.94, 329.63, 392.0], harp: [493.88, 659.25, 783.99, 987.77, 783.99] },
    { chord: [146.83, 220.0, 261.63, 349.23], harp: [523.25, 587.33, 698.46, 880.0, 698.46] },
    { chord: [196.0, 246.94, 329.63, 392.0], harp: [587.33, 659.25, 783.99, 987.77, 783.99] },
    { chord: [261.63, 329.63, 392.0, 493.88], harp: [659.25, 783.99, 987.77, 1046.5, 783.99] },
    { chord: [220.0, 261.63, 329.63, 493.88], harp: [659.25, 880.0, 987.77, 880.0, 659.25] },
    { chord: [174.61, 220.0, 293.66, 349.23], harp: [587.33, 698.46, 880.0, 698.46, 587.33] },
    { chord: [220.0, 261.63, 329.63, 392.0], harp: [523.25, 659.25, 783.99, 659.25, 523.25] },
  ];

  let idx = 0;
  const playStringBar = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const sec = sections[idx % sections.length];
    idx++;
    const now = ctx.currentTime + 0.05;

    // Bowed detuned string ensemble shaped through warm formant lowpass
    sec.chord.forEach((f) => {
      [-0.6, 0.6].forEach((detuneHz) => {
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f + detuneHz, now);

        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(820, now);
        lp.Q.setValueAtTime(0.6, now);

        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.0095, now + 1.15);
        g.gain.setValueAtTime(0.0095, now + 2.6);
        g.gain.exponentialRampToValueAtTime(0.0004, now + 4.15);

        osc.connect(lp);
        lp.connect(g);
        g.connect(s.wetBus);
        osc.start(now);
        osc.stop(now + 4.2);
      });
    });

    // Sweeping concert harp notes
    sec.harp.forEach((f, hIdx) => {
      const startAt = now + 0.45 + hIdx * 0.42;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startAt);
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.linearRampToValueAtTime(0.022, startAt + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0004, startAt + 1.6);
      osc.connect(g);
      g.connect(s.wetBus);
      osc.start(startAt);
      osc.stop(startAt + 1.65);
    });
  };

  playStringBar();
  s.every(4000, playStringBar);
}

/* -------------------------------------------------------------------------- */
/* Public Factory to Start Any Distinct Natural / Musical Soundscape          */
/* -------------------------------------------------------------------------- */
export function startAmbientSoundscape(
  ctx: AudioContext,
  masterOut: AudioNode,
  trackId: MusicTrackId
): AmbientTrackSession {
  const assets = getOrCreateDspAssets(ctx, masterOut);

  const sessionGain = ctx.createGain();
  sessionGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  sessionGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.55);
  sessionGain.connect(masterOut);

  const dryBus = ctx.createGain();
  dryBus.gain.setValueAtTime(0.88, ctx.currentTime);
  dryBus.connect(sessionGain);

  const wetBus = ctx.createGain();
  wetBus.gain.setValueAtTime(0.75, ctx.currentTime);
  wetBus.connect(assets.reverb);

  const tracker = new SessionTracker(ctx, dryBus, wetBus, sessionGain);

  switch (trackId) {
    case 'ocean_waves':
      startOceanWaves(ctx, tracker, assets);
      break;
    case 'monsoon_rain':
      startMonsoonRain(ctx, tracker, assets);
      break;
    case 'mountain_stream':
      startMountainStream(ctx, tracker, assets);
      break;
    case 'campfire_night':
      startCampfireNight(ctx, tracker, assets);
      break;
    case 'rainy_piano':
      startRainyPiano(ctx, tracker, assets);
      break;
    case 'midnight_chill':
      startMidnightChill(ctx, tracker, assets);
      break;
    case 'acoustic_meadow':
      startAcousticMeadow(ctx, tracker, assets);
      break;
    case 'temple_meditation':
      startTempleMeditation(ctx, tracker, assets);
      break;
    case 'starry_strings':
      startStarryStrings(ctx, tracker);
      break;
    case 'forest_birdsong':
    default:
      startForestBirdsong(ctx, tracker, assets);
      break;
  }

  return {
    stop: () => tracker.stop(),
  };
}
