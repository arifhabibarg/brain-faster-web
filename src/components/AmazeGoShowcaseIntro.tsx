import React, { useEffect, useRef, useState } from 'react';
import { ChevronsRight } from 'lucide-react';
import { AmazeGoLevel } from '../game/amazeGoLogic';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface AmazeGoShowcaseIntroProps {
  level: AmazeGoLevel;
  onComplete: () => void;
}

interface GlyphParticle {
  /** Normalized position in [-1, 1] inside creature box */
  nx: number;
  ny: number;
  /** Grid coordinate inside board */
  gx: number;
  gy: number;
  /** Anatomical color zone 1..3 */
  zone: 1 | 2 | 3;
  /** Pre-seeded deterministic glyph shape & phase */
  phase: number;
  shape: number; // 0 = L-turn, 1 = straight arrow, 2 = U-hook, 3 = Z-bend
  angle: number;
}

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hueIdx: number;
  life: number;
  maxLife: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [255, 160, 60];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * u);
  const g = Math.round(a[1] + (b[1] - a[1]) * u);
  const bl = Math.round(a[2] + (b[2] - a[2]) * u);
  return `rgb(${r}, ${g}, ${bl})`;
}

function easeInOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

const TOTAL_INTRO_MS = 3700;
const DARK_BG: [number, number, number] = [43, 51, 50]; // #2b3332
const LIGHT_BG: [number, number, number] = [237, 246, 239]; // #edf6ef

export const AmazeGoShowcaseIntro: React.FC<AmazeGoShowcaseIntroProps> = ({
  level,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  const finishIntro = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 180);
  };

  useEffect(() => {
    doneRef.current = false;
    setExiting(false);

    amazeGoAudio.playShowcaseIntro(level.showcaseCategory || 'water');

    // Build deterministic sampled glyph particles from colorMask / activeMask
    const particles: GlyphParticle[] = [];
    const w = level.width;
    const h = level.height;
    const mask = level.colorMask || level.activeMask;
    const rawCells: { gx: number; gy: number; zone: 1 | 2 | 3 }[] = [];

    if (mask) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const val = mask[y * w + x];
          if (val > 0) {
            const z: 1 | 2 | 3 = val === 3 ? 3 : val === 2 ? 2 : 1;
            rawCells.push({ gx: x, gy: y, zone: z });
          }
        }
      }
    }

    const maxParticles = 960;
    const step = Math.max(1, rawCells.length / maxParticles);
    let seed = level.id * 9973 + 17;
    const nextRnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let f = 0; f < rawCells.length; f += step) {
      const cell = rawCells[Math.floor(f)];
      const nx = ((cell.gx + 0.5) / w) * 2 - 1;
      const ny = ((cell.gy + 0.5) / h) * 2 - 1;
      particles.push({
        nx,
        ny,
        gx: cell.gx,
        gy: cell.gy,
        zone: cell.zone,
        phase: nextRnd() * Math.PI * 2,
        shape: Math.floor(nextRnd() * 4),
        angle: Math.floor(nextRnd() * 4) * (Math.PI / 2),
      });
    }

    const introPalette = level.showcaseIntroPalette || ['#fb923c', '#fde047', '#38bdf8'];
    const boardPalette = level.showcasePalette || ['#dc4a1c', '#ca8a04', '#292524'];
    const introRgb = introPalette.map(hexToRgb) as [
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ];
    const boardRgb = boardPalette.map(hexToRgb) as [
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ];

    // Pooled ambient sparks / bubbles / dust
    const ambient: AmbientParticle[] = Array.from({ length: 42 }, () => ({
      x: (nextRnd() - 0.5) * 1.4,
      y: (nextRnd() - 0.5) * 1.4,
      vx: (nextRnd() - 0.5) * 0.25,
      vy: (nextRnd() - 0.5) * 0.25,
      size: 1.8 + nextRnd() * 3.5,
      alpha: 0.2 + nextRnd() * 0.65,
      hueIdx: Math.floor(nextRnd() * 3),
      life: nextRnd(),
      maxLife: 0.8 + nextRnd() * 1.1,
    }));

    // Upward light streaks (matching 0:04 in videos)
    const streaks = Array.from({ length: 12 }, (_, i) => ({
      xFrac: 0.08 + ((i * 0.618) % 0.84),
      delay: (i % 5) * 0.14,
      len: 42 + (i % 3) * 28,
      speed: 1.15 + (i % 4) * 0.2,
    }));

    const startTime = performance.now();
    let revealChimePlayed = false;
    let rafId = 0;

    const animStyle = level.showcaseAnimStyle || 'swim_turn';
    const category = level.showcaseCategory || 'water';

    const drawFrame = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = window.innerWidth;
      const ch = window.innerHeight;

      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);

      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / TOTAL_INTRO_MS);

      // Phase split:
      // 0.00 -> 0.72: Dynamic creature choreography on dark #2b3332
      // 0.72 -> 1.00: Smooth morph to playable board shape + brighten background + rising arrows
      const morphT = p > 0.72 ? easeInOutCubic((p - 0.72) / 0.28) : 0;
      const sec = elapsed / 1000;

      if (p >= 0.76 && !revealChimePlayed) {
        revealChimePlayed = true;
        amazeGoAudio.playShowcaseReveal();
      }

      // Background interpolation (#2b3332 -> #edf6ef)
      ctx.fillStyle = lerpRgb(DARK_BG, LIGHT_BG, morphT);
      ctx.fillRect(0, 0, cw, ch);

      // Compute final playable board screen rectangle to match AmazeGoBoard
      const hudOffset = 104;
      const availW = Math.max(260, cw - 24);
      const availH = Math.max(240, ch - hudOffset - 16);
      const cellSize = Math.max(
        2.5,
        Math.min(38, Math.floor(Math.min(availW / w, availH / h) * 4) / 4)
      );
      const boardW = w * cellSize;
      const boardH = h * cellSize;
      const boardCenterX = cw / 2;
      const boardCenterY = hudOffset + (ch - hudOffset) / 2;

      const heroSize = Math.min(cw * 0.78, ch * 0.56, 360);
      const cx = cw / 2;
      const cy = ch * 0.48;

      // Subtle atmospheric aura behind creature during dark phase
      if (morphT < 0.95) {
        const auraAlpha = (1 - morphT) * 0.2;
        const grad = ctx.createRadialGradient(cx, cy, heroSize * 0.08, cx, cy, heroSize * 0.78);
        grad.addColorStop(0, `rgba(${introRgb[0][0]}, ${introRgb[0][1]}, ${introRgb[0][2]}, ${auraAlpha})`);
        grad.addColorStop(1, 'rgba(43, 51, 50, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
      }

      // Compute global creature kinematic pose for phase 1 (0..0.72)
      let globalOffX = 0;
      let globalOffY = 0;
      let globalScaleX = 1;
      let globalScaleY = 1;
      let globalRot = 0;

      const phaseP = Math.min(1, p / 0.72);
      if (animStyle === 'swim_turn') {
        // Clownfish / Seahorse / Koi: Enter from left, 3D yaw turn & fin wobble
        const enter = easeOutBack(Math.min(1, phaseP / 0.38));
        globalOffX = (enter - 1) * cw * 0.42;
        globalOffY = Math.sin(sec * 3.4) * 14;
        const turnAngle = phaseP > 0.35 && phaseP < 0.82 ? ((phaseP - 0.35) / 0.47) * Math.PI * 2 : 0;
        globalScaleX = Math.max(0.24, Math.abs(Math.cos(turnAngle * 0.5)));
        globalRot = Math.sin(sec * 4.2) * 0.08;
      } else if (animStyle === 'arc_splash' || animStyle === 'breach_splash') {
        // Dolphin / Whale: Swim from right & leap in high graceful arc
        const enter = Math.min(1, phaseP / 0.82);
        globalOffX = (1 - enter) * cw * 0.34;
        globalOffY = -Math.sin(enter * Math.PI) * Math.min(110, ch * 0.16);
        globalRot = Math.cos(enter * Math.PI) * -0.28;
      } else if (animStyle === 'leap_roar' || animStyle === 'arc_pounce') {
        // Lion / Tiger / Fox: Leap arc then proud roar pulse
        if (phaseP < 0.48) {
          const lp = phaseP / 0.48;
          globalOffX = (lp - 1) * cw * 0.32;
          globalOffY = -Math.sin(lp * Math.PI) * 85;
          globalRot = (1 - lp) * -0.18;
        } else {
          const rp = (phaseP - 0.48) / 0.52;
          const pulse = Math.sin(rp * Math.PI * 2.5) * (1 - rp) * 0.1;
          globalScaleX = 1 + pulse;
          globalScaleY = 1 + pulse;
        }
      } else if (animStyle === 'spiral_rise' || animStyle === 'coil_breath') {
        // Phoenix / Dragon: Rise from sparks with majestic swirl
        const rise = easeOutBack(Math.min(1, phaseP / 0.65));
        globalOffY = (1 - rise) * ch * 0.22;
        globalRot = (1 - rise) * 0.45;
        globalScaleX = 0.72 + rise * 0.28;
        globalScaleY = 0.72 + rise * 0.28;
      } else if (animStyle === 'soar_dive' || animStyle === 'flutter_figure8' || animStyle === 'hover_flash' || animStyle === 'dart_hover') {
        // Birds & winged insects: Swoop or figure-8 flight
        const enter = Math.min(1, phaseP / 0.6);
        globalOffX = Math.sin(phaseP * Math.PI * 2) * (1 - phaseP) * 65;
        globalOffY = (1 - enter) * -ch * 0.18 + Math.cos(sec * 5) * 10;
        globalRot = Math.sin(phaseP * Math.PI * 2) * 0.14;
      } else {
        // Prowl / Stomp / Waddle / Strut / Bound / Pulse
        const enter = easeOutBack(Math.min(1, phaseP / 0.5));
        globalOffX = (enter - 1) * cw * 0.28;
        globalOffY = Math.abs(Math.sin(sec * 5.2)) * -12 * (1 - morphT);
        globalScaleX = 0.9 + enter * 0.1;
        globalScaleY = 0.9 + enter * 0.1;
      }

      // Draw roar/shockwave rings or water ripples when appropriate
      if (morphT < 0.7) {
        const ringAlpha = (1 - morphT) * 0.38;
        if ((animStyle === 'leap_roar' || animStyle === 'prowl_howl' || animStyle === 'coil_breath') && phaseP > 0.48) {
          const rp = ((phaseP - 0.48) / 0.52);
          ctx.strokeStyle = `rgba(${introRgb[1][0]}, ${introRgb[1][1]}, ${introRgb[1][2]}, ${ringAlpha * (1 - rp)})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx + heroSize * 0.18, cy - heroSize * 0.1, rp * heroSize * 0.65, 0, Math.PI * 2);
          ctx.stroke();
        } else if (category === 'water' && phaseP > 0.2) {
          const wp = (phaseP * 1.4) % 1;
          ctx.strokeStyle = `rgba(${introRgb[0][0]}, ${introRgb[0][1]}, ${introRgb[0][2]}, ${ringAlpha * (1 - wp) * 0.65})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(cx, cy + heroSize * 0.36, wp * heroSize * 0.52, wp * heroSize * 0.14, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw ambient particles (bubbles / embers / dust)
      if (morphT < 0.85) {
        const ambFade = 1 - morphT;
        for (let i = 0; i < ambient.length; i++) {
          const ap = ambient[i];
          const tLoop = ((sec * 0.65 + ap.life) % ap.maxLife) / ap.maxLife;
          const ax = cx + (ap.x + ap.vx * sec * 0.35) * heroSize * 0.62;
          const ay =
            category === 'water' || category === 'mystic'
              ? cy + ap.y * heroSize * 0.55 - tLoop * 65
              : cy + (ap.y + ap.vy * sec * 0.4) * heroSize * 0.55;
          const c = introRgb[ap.hueIdx];
          ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${ap.alpha * ambFade * (1 - tLoop)})`;
          ctx.beginPath();
          ctx.arc(ax, ay, ap.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw creature swarm of tiny colored arrow-maze segments morphing cleanly to board cells
      const segSizeBase = Math.max(3.4, heroSize * 0.022);
      const boardSegSize = Math.max(2.6, cellSize * 0.52);
      const segSize = segSizeBase + (boardSegSize - segSizeBase) * morphT;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const cosR = Math.cos(globalRot * (1 - morphT));
      const sinR = Math.sin(globalRot * (1 - morphT));

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];

        // Local per-particle organic flutter/swim/tentacle animation
        let lnx = pt.nx;
        let lny = pt.ny;

        if (morphT < 0.99) {
          const fadeMotion = 1 - morphT;
          if (animStyle === 'swim_turn' || animStyle === 'cruise_snap') {
            lny += Math.sin(sec * 9.5 - pt.nx * 4.5 + pt.phase * 0.2) * 0.045 * fadeMotion;
          } else if (
            animStyle === 'soar_dive' ||
            animStyle === 'flutter_figure8' ||
            animStyle === 'hover_flash' ||
            animStyle === 'dart_hover' ||
            animStyle === 'glide_blink'
          ) {
            if (Math.abs(pt.nx) > 0.18) {
              const flap = Math.sin(sec * (animStyle === 'hover_flash' ? 18 : 9) + Math.abs(pt.nx) * 2.5);
              lny += flap * Math.abs(pt.nx) * 0.18 * fadeMotion;
            }
          } else if (animStyle === 'pulse_tentacles') {
            if (pt.ny > 0.05) {
              lnx += Math.sin(sec * 7 + pt.ny * 6) * 0.07 * fadeMotion;
            }
          } else if (animStyle === 'strut_fan' && pt.ny < 0.22) {
            const fanScale = 0.72 + Math.min(1, phaseP * 1.4) * 0.28;
            lnx *= 1 + (fanScale - 1) * fadeMotion;
            lny *= 1 + (fanScale - 1) * fadeMotion;
          }
        }

        // Animated creature screen position
        const sxLocal = lnx * (heroSize * 0.48) * (globalScaleX + (1 - globalScaleX) * morphT);
        const syLocal = lny * (heroSize * 0.56) * (globalScaleY + (1 - globalScaleY) * morphT);
        const rx = sxLocal * cosR - syLocal * sinR;
        const ry = sxLocal * sinR + syLocal * cosR;
        const animX = cx + globalOffX * (1 - morphT) + rx;
        const animY = cy + globalOffY * (1 - morphT) + ry;

        // Exact final board cell position
        const targetX = boardCenterX - boardW / 2 + (pt.gx + 0.5) * cellSize;
        const targetY = boardCenterY - boardH / 2 + (pt.gy + 0.5) * cellSize;

        const drawX = animX + (targetX - animX) * morphT;
        const drawY = animY + (targetY - animY) * morphT;

        const zIdx = pt.zone - 1;
        ctx.strokeStyle = lerpRgb(introRgb[zIdx], boardRgb[zIdx], morphT);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = Math.max(1.25, segSize * 0.26);

        // Draw crisp tiny maze-arrow stroke segment
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(pt.angle + (1 - morphT) * Math.sin(sec * 2 + pt.phase) * 0.12);
        const s = segSize;
        ctx.beginPath();
        if (pt.shape === 0) {
          ctx.moveTo(-s * 0.45, -s * 0.4);
          ctx.lineTo(-s * 0.45, s * 0.35);
          ctx.lineTo(s * 0.45, s * 0.35);
        } else if (pt.shape === 1) {
          ctx.moveTo(-s * 0.5, 0);
          ctx.lineTo(s * 0.45, 0);
        } else if (pt.shape === 2) {
          ctx.moveTo(-s * 0.4, -s * 0.35);
          ctx.lineTo(s * 0.3, -s * 0.35);
          ctx.lineTo(s * 0.3, s * 0.35);
          ctx.lineTo(-s * 0.15, s * 0.35);
        } else {
          ctx.moveTo(-s * 0.45, -s * 0.35);
          ctx.lineTo(0, -s * 0.35);
          ctx.lineTo(0, s * 0.35);
          ctx.lineTo(s * 0.45, s * 0.35);
        }
        ctx.stroke();

        // Tiny arrowhead tip
        ctx.beginPath();
        ctx.arc(s * 0.45, pt.shape === 1 ? 0 : s * 0.35, Math.max(0.9, s * 0.16), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw rising vertical arrow streaks during bright morph transition (matching 0:04 in videos)
      if (morphT > 0.05) {
        const stAlpha = Math.sin(morphT * Math.PI) * 0.45;
        ctx.strokeStyle = `rgba(120, 140, 130, ${stAlpha})`;
        ctx.fillStyle = `rgba(120, 140, 130, ${stAlpha})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < streaks.length; i++) {
          const st = streaks[i];
          const localP = Math.max(0, Math.min(1, (morphT - st.delay * 0.35) * st.speed));
          if (localP <= 0 || localP >= 1) continue;
          const sx = st.xFrac * cw;
          const sy = ch * (1.05 - localP * 1.25);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + st.len);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(sx, sy - 6);
          ctx.lineTo(sx - 4, sy + 2);
          ctx.lineTo(sx + 4, sy + 2);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();

      if (p < 1) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        finishIntro();
      }
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [level]);

  return (
    <div
      className={`fixed inset-0 z-40 select-none transition-opacity duration-200 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      data-testid="showcase-intro-overlay"
      aria-label={`Animated Intro: ${level.artThemeName || level.name}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Top-right Skip button matching reference videos */}
      <button
        type="button"
        onClick={() => {
          amazeGoAudio.playClick();
          finishIntro();
        }}
        className="fixed top-4 right-4 z-50 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/12 hover:bg-white/22 text-white/90 text-xs font-extrabold tracking-wide border border-white/20 active:scale-95 transition-all"
        aria-label="Skip Animation"
      >
        <span>Skip</span>
        <ChevronsRight className="w-4 h-4" />
      </button>

      {/* Bottom subtle level & creature caption */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-300">
          Boss Level {level.id}
        </p>
        <p className="text-base font-black text-white/95 drop-shadow-sm">
          {level.artThemeName}
        </p>
      </div>
    </div>
  );
};
