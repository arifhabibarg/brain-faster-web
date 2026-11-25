/**
 * Procedural Smooth Audio Synthesizer for Brain Faster™
 * - 20 brand-new relaxing, mind-refreshing Arrow Escape Sound Styles
 * - 10 genuinely distinct Natural Soundscapes & Multi-Genre Music Engines (36s–44s)
 */

import {
  BACKGROUND_MUSIC_TRACKS,
  getMusicTrackCycleDurationMs,
  startAmbientSoundscape,
  type AmbientTrackSession,
  type MusicTrackId,
  type MusicTrackInfo,
} from './ambientMusicEngine';

export {
  BACKGROUND_MUSIC_TRACKS,
  getMusicTrackCycleDurationMs,
  type MusicTrackId,
  type MusicTrackInfo,
};

export type SoundPresetId =
  | 'silk_harp'
  | 'rain_pearl'
  | 'bamboo_flute'
  | 'singing_bowl'
  | 'velvet_piano'
  | 'handpan_breeze'
  | 'jade_chime'
  | 'santoor_bloom'
  | 'moon_kalimba'
  | 'dew_celesta'
  | 'warm_cello'
  | 'lotus_bell'
  | 'ocean_shell'
  | 'amber_lyre'
  | 'cloud_ocarina'
  | 'star_glock'
  | 'cedar_marimba'
  | 'morning_sitar'
  | 'aqua_vibraphone'
  | 'mist_panpipe';

export interface SoundPresetInfo {
  id: SoundPresetId;
  name: string;
  bnName: string;
  description: string;
  accent: string;
}

export const SOUND_PRESETS: SoundPresetInfo[] = [
  {
    id: 'silk_harp',
    name: 'Silk Harp',
    bnName: 'সিল্ক হার্প',
    description: 'কোমল ও স্নিগ্ধ ডাবল-স্ট্রিং হার্প ধ্বনি',
    accent: '#7c3aed',
  },
  {
    id: 'rain_pearl',
    name: 'Rain Pearl',
    bnName: 'বৃষ্টির মুক্তা',
    description: 'স্বচ্ছ বৃষ্টির ফোঁটার মতো নির্মল জল-সুর',
    accent: '#0284c7',
  },
  {
    id: 'bamboo_flute',
    name: 'Bamboo Flute',
    bnName: 'বাঁশির সুর',
    description: 'হালকা বাতাসের স্পর্শে শান্ত বাঁশির টান',
    accent: '#059669',
  },
  {
    id: 'singing_bowl',
    name: 'Singing Bowl',
    bnName: 'তিব্বতি বোল',
    description: 'মন শান্ত করা গভীর মেডিটেশন রেজোন্যান্স',
    accent: '#b45309',
  },
  {
    id: 'velvet_piano',
    name: 'Velvet Piano',
    bnName: 'ভেলভেট পিয়ানো',
    description: 'নরম অনুভূতির মেলো গ্র্যান্ড পিয়ানো নোট',
    accent: '#334155',
  },
  {
    id: 'handpan_breeze',
    name: 'Handpan Breeze',
    bnName: 'হ্যান্ডপ্যান বাতাস',
    description: 'রিল্যাক্সিং স্টিল হ্যান্ডপ্যান ও অক্টেভ সুর',
    accent: '#0d9488',
  },
  {
    id: 'jade_chime',
    name: 'Jade Chime',
    bnName: 'জেড উইন্ডচাইম',
    description: 'বাতাসে দোলা কাঁচ ও জেড চাইমের মধুর ধ্বনি',
    accent: '#16a34a',
  },
  {
    id: 'santoor_bloom',
    name: 'Santoor Bloom',
    bnName: 'সন্তুরের ঝংকার',
    description: 'মিষ্টি তারের ছোঁয়ায় প্রাণবন্ত সন্তুর সুর',
    accent: '#c026d3',
  },
  {
    id: 'moon_kalimba',
    name: 'Moon Kalimba',
    bnName: 'জোছনা কালিম্বা',
    description: 'রাতের স্নিগ্ধতায় ভরা কাঠের থাম্ব-পিয়ানো',
    accent: '#4f46e5',
  },
  {
    id: 'dew_celesta',
    name: 'Dew Celesta',
    bnName: 'শিশির সেলেস্টা',
    description: 'ভোরের শিশিরের মতো মিষ্টি মিউজিক-বক্স টোন',
    accent: '#2563eb',
  },
  {
    id: 'warm_cello',
    name: 'Warm Cello',
    bnName: 'পিজিকাটো চেলো',
    description: 'উষ্ণ কাঠের স্ট্রিং প্লাক — গভীর ও আরামদায়ক',
    accent: '#9a3412',
  },
  {
    id: 'lotus_bell',
    name: 'Lotus Bell',
    bnName: 'পদ্মঘণ্টা',
    description: 'পবিত্র ও নির্মল সোনালি ঘণ্টার মৃদু রেশ',
    accent: '#d97706',
  },
  {
    id: 'ocean_shell',
    name: 'Ocean Shell',
    bnName: 'সমুদ্র শঙ্খ',
    description: 'ঢেউ ও শঙ্খের প্রশান্ত জলীয় অনুরণন',
    accent: '#0369a1',
  },
  {
    id: 'amber_lyre',
    name: 'Amber Lyre',
    bnName: 'সোনালি বীণা',
    description: 'দুটি কোমল সুরের আরপিজিও বীণার টান',
    accent: '#ea580c',
  },
  {
    id: 'cloud_ocarina',
    name: 'Cloud Ocarina',
    bnName: 'মেঘের ওকারিনা',
    description: 'মাটির বাঁশির মতো গোলগাল ও কোমল ধ্বনি',
    accent: '#0891b2',
  },
  {
    id: 'star_glock',
    name: 'Starlight Chime',
    bnName: 'তারার গ্লকেন',
    description: 'নরম ম্যালেট ছোঁয়ায় স্বপ্নময় মেলোডি বেল',
    accent: '#6d28d9',
  },
  {
    id: 'cedar_marimba',
    name: 'Cedar Rosewood',
    bnName: 'সিডার রোজউড',
    description: 'গভীর রোজউড কাঠের পরিষ্কার ও স্নিগ্ধ টোকা',
    accent: '#78350f',
  },
  {
    id: 'morning_sitar',
    name: 'Morning Sitara',
    bnName: 'প্রভাতী সিতার',
    description: 'হালকা রাগিণীর অনুরণনসহ সিতার প্লাক',
    accent: '#be185d',
  },
  {
    id: 'aqua_vibraphone',
    name: 'Aqua Vibraphone',
    bnName: 'অ্যাকোয়া ভাইব্রাফোন',
    description: 'মৃদু তরঙ্গায়িত জ্যাজ ভাইব্রাফোন অনুভূতি',
    accent: '#0f766e',
  },
  {
    id: 'mist_panpipe',
    name: 'Mist Panpipe',
    bnName: 'কুয়াশা প্যানপাইপ',
    description: 'পাহাড়ি বাতাসের মতো কোমল প্যানপাইপ সুর',
    accent: '#475569',
  },
];

// Background music tracks and DSP engines are provided by ./ambientMusicEngine

const PRESET_STORAGE_KEY = 'amazego_sound_preset';
const MUTED_STORAGE_KEY = 'amazego_sound_muted';
const VIBRATION_STORAGE_KEY = 'amazego_vibration_enabled';
const MUSIC_STORAGE_KEY = 'amazego_music_enabled';
const MUSIC_TRACK_STORAGE_KEY = 'amazego_music_track';

function readSavedPreset(): SoundPresetId {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY) as SoundPresetId | null;
      if (saved && SOUND_PRESETS.some((p) => p.id === saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return 'silk_harp';
}

function readSavedMusicTrack(): MusicTrackId {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(MUSIC_TRACK_STORAGE_KEY) as MusicTrackId | null;
      if (saved && BACKGROUND_MUSIC_TRACKS.some((t) => t.id === saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore
  }
  return 'forest_birdsong';
}

function readSavedBool(key: string, defaultVal: boolean): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
    }
  } catch {
    // Ignore
  }
  return defaultVal;
}

class AmazeGoSoundEngine {
  private ctx: AudioContext | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private isMuted: boolean = readSavedBool(MUTED_STORAGE_KEY, false);
  private vibrationEnabled: boolean = readSavedBool(VIBRATION_STORAGE_KEY, true);
  private musicEnabled: boolean = readSavedBool(MUSIC_STORAGE_KEY, true);
  private musicTrack: MusicTrackId = readSavedMusicTrack();
  private ambientSession: AmbientTrackSession | null = null;
  private musicUnlockInstalled: boolean = false;
  private comboCount: number = 0;
  private preset: SoundPresetId = readSavedPreset();

  // Warm lush pentatonic + major 9th register (soothing on every combo step)
  private readonly notes: number[] = [
    392.0, 440.0, 493.88, 523.25, 587.33,
    659.25, 783.99, 880.0, 987.77,
  ];

  constructor() {
    this.installMusicUnlock();
  }

  private installMusicUnlock(): void {
    if (typeof window === 'undefined' || this.musicUnlockInstalled) return;
    this.musicUnlockInstalled = true;

    const handleFirstGesture = () => {
      this.initCtx();
      if (this.musicEnabled && !this.ambientSession) {
        this.startAmbientMusic();
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, this.ctx.currentTime);
        filter.Q.setValueAtTime(0.5, this.ctx.currentTime);
        filter.connect(this.ctx.destination);
        this.masterFilter = filter;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(): AudioNode | null {
    const ctx = this.initCtx();
    if (!ctx) return null;
    return this.masterFilter || ctx.destination;
  }

  public getPreset(): SoundPresetId {
    return this.preset;
  }

  public setPreset(nextPreset: SoundPresetId): void {
    this.preset = nextPreset;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PRESET_STORAGE_KEY, nextPreset);
      }
    } catch {
      // Ignore storage errors
    }
  }

  public getMusicTrack(): MusicTrackId {
    return this.musicTrack;
  }

  public setMusicTrack(nextTrack: MusicTrackId, previewNow: boolean = false): void {
    this.musicTrack = nextTrack;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MUSIC_TRACK_STORAGE_KEY, nextTrack);
      }
    } catch {
      // Ignore
    }

    if (previewNow) {
      this.setMusicEnabled(true);
    }
    if (this.musicEnabled) {
      this.stopAmbientMusic();
      this.startAmbientMusic();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
      }
    } catch {
      // Ignore
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public isVibrationEnabled(): boolean {
    return this.vibrationEnabled;
  }

  public setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(VIBRATION_STORAGE_KEY, String(enabled));
      }
    } catch {
      // Ignore
    }
  }

  public vibrate(pattern: number | number[] = 12): void {
    if (!this.vibrationEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore unsupported environments
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MUSIC_STORAGE_KEY, String(enabled));
      }
    } catch {
      // Ignore
    }
    if (enabled) {
      this.startAmbientMusic();
    } else {
      this.stopAmbientMusic();
    }
  }

  public startAmbientMusic(): void {
    if (!this.musicEnabled || typeof window === 'undefined') return;
    if (this.ambientSession) return;

    const ctx = this.initCtx();
    if (!ctx) return;
    // Route natural soundscapes directly to ctx.destination so birdsong, rain drops, crickets & strings stay crisp
    this.ambientSession = startAmbientSoundscape(ctx, ctx.destination, this.musicTrack);
  }

  public stopAmbientMusic(): void {
    if (this.ambientSession) {
      this.ambientSession.stop();
      this.ambientSession = null;
    }
  }

  public resetCombo() {
    this.comboCount = 0;
  }

  private playTone(
    ctx: AudioContext,
    out: AudioNode,
    opts: {
      startAt: number;
      wave?: OscillatorType;
      freqStart: number;
      freqEnd?: number;
      freqMid?: number;
      midAtSec?: number;
      attackSec?: number;
      decaySec: number;
      peak: number;
    }
  ) {
    const {
      startAt,
      wave = 'sine',
      freqStart,
      freqEnd,
      freqMid,
      midAtSec = 0.06,
      attackSec = 0.012,
      decaySec,
      peak,
    } = opts;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freqStart, startAt);
    if (freqMid) {
      osc.frequency.exponentialRampToValueAtTime(freqMid, startAt + midAtSec);
    }
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, startAt + decaySec * 0.85);
    }
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + attackSec);
    gain.gain.exponentialRampToValueAtTime(0.0006, startAt + decaySec);
    osc.connect(gain);
    gain.connect(out);
    osc.start(startAt);
    osc.stop(startAt + decaySec + 0.03);
  }

  /**
   * Plays one of 20 distinct, deeply pleasing arrow escape sounds
   */
  public playArrowEscape(overridePreset?: SoundPresetId) {
    if (this.isMuted && !overridePreset) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const activePreset = overridePreset || this.preset;
    const t = ctx.currentTime;
    const noteIdx = this.comboCount % this.notes.length;
    this.comboCount++;
    const freq = this.notes[noteIdx];

    switch (activePreset) {
      case 'rain_pearl': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.82,
          freqEnd: freq * 1.48,
          attackSec: 0.01,
          decaySec: 0.24,
          peak: 0.125,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.025,
          wave: 'sine',
          freqStart: freq * 1.5,
          freqEnd: freq * 2.0,
          attackSec: 0.01,
          decaySec: 0.19,
          peak: 0.045,
        });
        break;
      }

      case 'bamboo_flute': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.94,
          freqEnd: freq * 1.02,
          attackSec: 0.038,
          decaySec: 0.29,
          peak: 0.12,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.015,
          wave: 'triangle',
          freqStart: freq * 2,
          attackSec: 0.04,
          decaySec: 0.18,
          peak: 0.02,
        });
        break;
      }

      case 'singing_bowl': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.52,
          attackSec: 0.022,
          decaySec: 0.44,
          peak: 0.12,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.008,
          wave: 'sine',
          freqStart: freq * 1.04,
          attackSec: 0.03,
          decaySec: 0.34,
          peak: 0.048,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.015,
          wave: 'sine',
          freqStart: freq * 1.56,
          attackSec: 0.03,
          decaySec: 0.24,
          peak: 0.022,
        });
        break;
      }

      case 'velvet_piano': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'triangle',
          freqStart: freq * 0.75,
          attackSec: 0.008,
          decaySec: 0.32,
          peak: 0.115,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.004,
          wave: 'sine',
          freqStart: freq * 1.5,
          attackSec: 0.01,
          decaySec: 0.22,
          peak: 0.038,
        });
        break;
      }

      case 'handpan_breeze': {
        const root = freq * 0.68;
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: root * 0.99,
          freqEnd: root,
          attackSec: 0.011,
          decaySec: 0.36,
          peak: 0.13,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.006,
          wave: 'sine',
          freqStart: root * 2,
          attackSec: 0.016,
          decaySec: 0.24,
          peak: 0.045,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.014,
          wave: 'sine',
          freqStart: root * 3,
          attackSec: 0.016,
          decaySec: 0.14,
          peak: 0.016,
        });
        break;
      }

      case 'jade_chime': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 1.12,
          attackSec: 0.01,
          decaySec: 0.34,
          peak: 0.088,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.032,
          wave: 'sine',
          freqStart: freq * 1.68,
          attackSec: 0.012,
          decaySec: 0.3,
          peak: 0.052,
        });
        break;
      }

      case 'santoor_bloom': {
        [1, 1.25, 1.5].forEach((mult, idx) => {
          this.playTone(ctx, out, {
            startAt: t + idx * 0.018,
            wave: idx === 0 ? 'triangle' : 'sine',
            freqStart: freq * 0.85 * mult,
            attackSec: 0.008,
            decaySec: 0.28 - idx * 0.04,
            peak: idx === 0 ? 0.1 : 0.042,
          });
        });
        break;
      }

      case 'moon_kalimba': {
        const root = freq * 0.65;
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: root * 1.03,
          freqEnd: root,
          attackSec: 0.009,
          decaySec: 0.31,
          peak: 0.135,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.005,
          wave: 'triangle',
          freqStart: root * 2,
          attackSec: 0.008,
          decaySec: 0.11,
          peak: 0.032,
        });
        break;
      }

      case 'dew_celesta': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 1.25,
          attackSec: 0.009,
          decaySec: 0.33,
          peak: 0.095,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.01,
          wave: 'sine',
          freqStart: freq * 2.5,
          attackSec: 0.01,
          decaySec: 0.16,
          peak: 0.025,
        });
        break;
      }

      case 'warm_cello': {
        const low = freq * 0.45;
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'triangle',
          freqStart: low * 1.04,
          freqEnd: low,
          attackSec: 0.014,
          decaySec: 0.28,
          peak: 0.135,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.006,
          wave: 'sine',
          freqStart: low * 2,
          attackSec: 0.015,
          decaySec: 0.2,
          peak: 0.055,
        });
        break;
      }

      case 'lotus_bell': {
        [1, 1.5, 2.0].forEach((mult, idx) => {
          this.playTone(ctx, out, {
            startAt: t + idx * 0.008,
            wave: 'sine',
            freqStart: freq * mult * 0.9,
            attackSec: 0.01,
            decaySec: 0.38 - idx * 0.08,
            peak: idx === 0 ? 0.1 : 0.036,
          });
        });
        break;
      }

      case 'ocean_shell': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.62,
          freqMid: freq * 0.95,
          midAtSec: 0.075,
          freqEnd: freq * 0.88,
          attackSec: 0.022,
          decaySec: 0.29,
          peak: 0.12,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.02,
          wave: 'sine',
          freqStart: freq * 1.24,
          freqEnd: freq * 1.48,
          attackSec: 0.02,
          decaySec: 0.22,
          peak: 0.038,
        });
        break;
      }

      case 'amber_lyre': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.8,
          attackSec: 0.008,
          decaySec: 0.28,
          peak: 0.11,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.042,
          wave: 'sine',
          freqStart: freq * 1.2,
          attackSec: 0.01,
          decaySec: 0.26,
          peak: 0.082,
        });
        break;
      }

      case 'cloud_ocarina': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.88,
          freqEnd: freq * 1.05,
          attackSec: 0.028,
          decaySec: 0.24,
          peak: 0.125,
        });
        break;
      }

      case 'star_glock': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 1.35,
          attackSec: 0.008,
          decaySec: 0.31,
          peak: 0.09,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.024,
          wave: 'sine',
          freqStart: freq * 1.8,
          attackSec: 0.008,
          decaySec: 0.25,
          peak: 0.048,
        });
        break;
      }

      case 'cedar_marimba': {
        const f = freq * 0.72;
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: f * 1.08,
          freqEnd: f,
          attackSec: 0.006,
          decaySec: 0.22,
          peak: 0.135,
        });
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'triangle',
          freqStart: f * 3.0,
          attackSec: 0.005,
          decaySec: 0.055,
          peak: 0.032,
        });
        break;
      }

      case 'morning_sitar': {
        const f = freq * 0.78;
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'triangle',
          freqStart: f * 0.91,
          freqMid: f * 1.03,
          midAtSec: 0.05,
          freqEnd: f,
          attackSec: 0.01,
          decaySec: 0.3,
          peak: 0.095,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.016,
          wave: 'sine',
          freqStart: f * 1.5,
          attackSec: 0.015,
          decaySec: 0.25,
          peak: 0.046,
        });
        break;
      }

      case 'aqua_vibraphone': {
        const f = freq * 0.88;
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: f,
          attackSec: 0.015,
          decaySec: 0.35,
          peak: 0.105,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.004,
          wave: 'sine',
          freqStart: f + 3.2,
          attackSec: 0.018,
          decaySec: 0.34,
          peak: 0.055,
        });
        break;
      }

      case 'mist_panpipe': {
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.92,
          freqEnd: freq,
          attackSec: 0.034,
          decaySec: 0.28,
          peak: 0.11,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.022,
          wave: 'sine',
          freqStart: freq * 1.5,
          attackSec: 0.036,
          decaySec: 0.24,
          peak: 0.044,
        });
        break;
      }

      case 'silk_harp':
      default: {
        // Double-string warm harp pluck + gentle fifth bloom
        this.playTone(ctx, out, {
          startAt: t,
          wave: 'sine',
          freqStart: freq * 0.85,
          attackSec: 0.009,
          decaySec: 0.34,
          peak: 0.125,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.018,
          wave: 'sine',
          freqStart: freq * 1.275,
          attackSec: 0.012,
          decaySec: 0.28,
          peak: 0.062,
        });
        this.playTone(ctx, out, {
          startAt: t + 0.032,
          wave: 'sine',
          freqStart: freq * 1.7,
          attackSec: 0.014,
          decaySec: 0.22,
          peak: 0.028,
        });
        break;
      }
    }
  }

  /**
   * Clear impact bump + dual-pulse warning alert when a blocked arrow collides with another arrow
   */
  public playBlocked(overridePreset?: SoundPresetId) {
    if (this.isMuted && !overridePreset) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const activePreset = overridePreset || this.preset;
    const t = ctx.currentTime;

    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impactOsc.type = 'triangle';
    const baseThud = activePreset === 'cedar_marimba' || activePreset === 'moon_kalimba' ? 185 : 165;
    impactOsc.frequency.setValueAtTime(baseThud, t);
    impactOsc.frequency.exponentialRampToValueAtTime(68, t + 0.11);

    impactGain.gain.setValueAtTime(0.0001, t);
    impactGain.gain.linearRampToValueAtTime(0.16, t + 0.008);
    impactGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);

    impactOsc.connect(impactGain);
    impactGain.connect(out);
    impactOsc.start(t);
    impactOsc.stop(t + 0.15);

    const warnPairs: [number, number][] = [
      [0.018, 493.88],
      [0.105, 349.23],
    ];
    for (const [offset, freq] of warnPairs) {
      const warnOsc = ctx.createOscillator();
      const warnGain = ctx.createGain();
      const wt = t + offset;
      warnOsc.type = 'triangle';
      warnOsc.frequency.setValueAtTime(freq, wt);
      warnOsc.frequency.exponentialRampToValueAtTime(freq * 0.9, wt + 0.09);

      warnGain.gain.setValueAtTime(0.0001, wt);
      warnGain.gain.linearRampToValueAtTime(0.115, wt + 0.01);
      warnGain.gain.exponentialRampToValueAtTime(0.0008, wt + 0.125);

      warnOsc.connect(warnGain);
      warnGain.connect(out);
      warnOsc.start(wt);
      warnOsc.stop(wt + 0.135);
    }
  }

  /**
   * Warm harmonic sparkle when earning combo praises (Good! / Wow! / Awesome! / Excellent!)
   */
  public playPraise() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const chord = [523.25, 659.25, 783.99];
    const start = ctx.currentTime;
    chord.forEach((freq, i) => {
      const t = start + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.075, t + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.34);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /**
   * Gentle soft bell chime for Hint
   */
  public playHint() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.14);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.085, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.28);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Silky celebration kalimba arpeggio on Level Clear
   */
  public playVictory() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const chord = [392.0, 493.88, 587.33, 783.99, 987.77];
    const startTime = ctx.currentTime;

    chord.forEach((freq, i) => {
      const t = startTime + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.095, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  /**
   * Crisp lightweight UI button click sound (distinct from arrow escape sounds)
   */
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.028);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.072, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.048);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  /**
   * Thematic sound motif when entering an animated creature showcase level (210–500)
   */
  public playShowcaseIntro(category: 'water' | 'roar' | 'wing' | 'mystic' = 'water') {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;

    if (category === 'water') {
      [320, 440, 587, 740].forEach((f, idx) => {
        const t = now + idx * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 1.48, t + 0.12);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.075, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } else if (category === 'roar') {
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(110, now);
      bass.frequency.exponentialRampToValueAtTime(72, now + 0.65);
      bassGain.gain.setValueAtTime(0.0001, now);
      bassGain.gain.linearRampToValueAtTime(0.11, now + 0.09);
      bassGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.72);
      bass.connect(bassGain);
      bassGain.connect(out);
      bass.start(now);
      bass.stop(now + 0.75);

      [220, 329.63, 440].forEach((f, idx) => {
        const t = now + 0.18 + idx * 0.08;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.48);
      });
    } else if (category === 'wing') {
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        const t = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * 0.96, t);
        osc.frequency.exponentialRampToValueAtTime(f * 1.04, t + 0.16);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.065, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.34);
      });
    } else {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        const t = now + idx * 0.12;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.07, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.44);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.46);
      });
    }
  }

  /**
   * Bright chime when animated creature locks into playable puzzle board
   */
  public playShowcaseReveal() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.075, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.35);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  /**
   * Lush sparkling multi-arrow burst chime when a Special Yellow arrow clears nearby open arrows
   */
  public playYellowBurst(clearedExtraCount: number = 1) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const cascadeNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    const noteCount = Math.min(cascadeNotes.length, Math.max(3, 2 + clearedExtraCount));

    for (let i = 0; i < noteCount; i++) {
      const f = cascadeNotes[i];
      const t = now + i * 0.044;

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.94, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.032);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.105, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.34);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.36);

      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'triangle';
      shimmerOsc.frequency.setValueAtTime(f * 2, t + 0.01);
      shimmerGain.gain.setValueAtTime(0.0001, t + 0.01);
      shimmerGain.gain.linearRampToValueAtTime(0.025, t + 0.02);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0006, t + 0.22);
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(out);
      shimmerOsc.start(t + 0.01);
      shimmerOsc.stop(t + 0.24);
    }
  }

  /**
   * Triumphant radiant gold fanfare when freeing the deep Golden Key arrow
   */
  public playGoldenKeyVictory() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const fanfare = [392.0, 493.88, 587.33, 739.99, 880.0, 1174.66];
    fanfare.forEach((f, idx) => {
      const t = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.62);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.66);
    });
  }
}

export const amazeGoAudio = new AmazeGoSoundEngine();
