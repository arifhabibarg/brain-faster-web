export type ShowcaseCategory = 'water' | 'roar' | 'wing' | 'mystic';

export type ShowcaseAnimStyle =
  | 'swim_turn'
  | 'leap_roar'
  | 'arc_splash'
  | 'soar_dive'
  | 'flutter_figure8'
  | 'glide_bubbles'
  | 'stomp_trumpet'
  | 'spiral_rise'
  | 'prowl_howl'
  | 'cruise_snap'
  | 'waddle_hop'
  | 'glide_blink'
  | 'strut_fan'
  | 'breach_splash'
  | 'dart_hover'
  | 'bound_glow'
  | 'pulse_tentacles'
  | 'arc_pounce'
  | 'hover_flash'
  | 'coil_breath';

export interface ShowcaseThemeDef {
  id: string;
  name: string;
  category: ShowcaseCategory;
  animStyle: ShowcaseAnimStyle;
  /** High-contrast 3 colors for light mint/cream puzzle board: [primary, secondary, accent/outline] */
  boardPalette: [string, string, string];
  /** Luminous 3 colors for dark charcoal (#2b3332) animation stage */
  introPalette: [string, string, string];
  /**
   * Returns:
   * 0 = outside creature silhouette
   * 1 = primary body region
   * 2 = secondary region (stripes / belly / inner wings)
   * 3 = outline / mane / fins / beak / antlers accent
   */
  regionFn: (nx: number, ny: number) => 0 | 1 | 2 | 3;
}

export interface ShowcaseMaskResult {
  mask: Uint8Array;
  colorMask: Uint8Array;
  theme: ShowcaseThemeDef;
}

function distSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

function inEllipse(px: number, py: number, cx: number, cy: number, rx: number, ry: number, angle = 0): boolean {
  const dx = px - cx;
  const dy = py - cy;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;
  return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
}

function inCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  return Math.hypot(px - cx, py - cy) <= r;
}

// 1. Clownfish (Matches Level 320 video: orange body, bright gold/cream vertical bands, dark fin/outline accents)
function regionClownfish(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, 0.05, 0.02, 0.62, 0.44);
  const snout = inEllipse(nx, ny, 0.58, 0.04, 0.24, 0.24);
  const dorsalTop = inEllipse(nx, ny, 0.02, -0.38, 0.34, 0.2);
  const dorsalRear = inEllipse(nx, ny, -0.34, -0.26, 0.18, 0.16);
  const tail = distSeg(nx, ny, -0.5, 0.02, -0.84, -0.26) < 0.14 || distSeg(nx, ny, -0.5, 0.02, -0.84, 0.28) < 0.14 || inEllipse(nx, ny, -0.74, 0.01, 0.18, 0.3);
  const pecFin = inEllipse(nx, ny, 0.06, 0.32, 0.18, 0.22, 0.4);
  const pelvicFin = inEllipse(nx, ny, -0.26, 0.42, 0.14, 0.16, -0.2);
  const eyeCut = inCircle(nx, ny, 0.48, -0.08, 0.065);
  if (eyeCut) return 0;
  if (!(body || snout || dorsalTop || dorsalRear || tail || pecFin || pelvicFin)) return 0;

  // Classic clownfish triple stripe pattern + dark fin tips
  if (tail && nx < -0.74) return 3;
  if (dorsalTop && ny < -0.48) return 3;
  if (pecFin && ny > 0.42) return 3;
  const stripe1 = Math.abs(nx - 0.32 + ny * 0.12) < 0.085;
  const stripe2 = Math.abs(nx + 0.04 + ny * 0.06) < 0.09;
  const stripe3 = Math.abs(nx + 0.42) < 0.07;
  if (stripe1 || stripe2 || stripe3) return 2;
  return 1;
}

// 2. Lion (Matches Level 380 video: roaring lion stride, golden ochre body, dark espresso mane & tail tuft)
function regionLion(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const torso = inEllipse(nx, ny, -0.08, 0.06, 0.48, 0.26, -0.05);
  const chest = inCircle(nx, ny, 0.26, -0.02, 0.25);
  const mane = inCircle(nx, ny, 0.42, -0.24, 0.33);
  const snout = inEllipse(nx, ny, 0.68, -0.22, 0.18, 0.13);
  const jawOpen = inEllipse(nx, ny, 0.66, -0.08, 0.14, 0.08, 0.25);
  const ear = inCircle(nx, ny, 0.36, -0.54, 0.09);
  const frontLeg1 = distSeg(nx, ny, 0.24, 0.18, 0.44, 0.72) < 0.095;
  const frontLeg2 = distSeg(nx, ny, 0.12, 0.2, 0.18, 0.74) < 0.09;
  const backLeg1 = distSeg(nx, ny, -0.38, 0.16, -0.56, 0.74) < 0.1;
  const backLeg2 = distSeg(nx, ny, -0.3, 0.18, -0.24, 0.74) < 0.09;
  const tail = distSeg(nx, ny, -0.5, -0.02, -0.82, 0.18) < 0.055 || inCircle(nx, ny, -0.84, 0.24, 0.09);
  if (!(torso || chest || mane || snout || jawOpen || ear || frontLeg1 || frontLeg2 || backLeg1 || backLeg2 || tail)) return 0;

  if (inCircle(nx, ny, -0.84, 0.24, 0.09)) return 3;
  if (mane && !snout && Math.hypot(nx - 0.44, ny + 0.24) > 0.15) return 3;
  if (ny > 0.16 && torso) return 2;
  if (snout || jawOpen) return 2;
  return 1;
}

// 3. Dolphin (Matches Level 350 video: leaping curved dolphin, ocean blue back, teal belly, deep navy dorsal/flukes)
function regionDolphin(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const arch = inEllipse(nx, ny, 0.02, -0.06, 0.64, 0.3, -0.32) || inEllipse(nx, ny, -0.24, 0.26, 0.48, 0.22, 0.65);
  const head = inCircle(nx, ny, 0.42, -0.24, 0.23);
  const beak = distSeg(nx, ny, 0.52, -0.22, 0.84, -0.08) < 0.085;
  const dorsal = distSeg(nx, ny, -0.05, -0.25, -0.28, -0.62) < 0.12 || inEllipse(nx, ny, -0.14, -0.44, 0.14, 0.22, 0.35);
  const pecFin = distSeg(nx, ny, 0.22, 0.06, 0.08, 0.42) < 0.095;
  const flukeTop = distSeg(nx, ny, -0.5, 0.56, -0.84, 0.48) < 0.095;
  const flukeBot = distSeg(nx, ny, -0.5, 0.56, -0.62, 0.86) < 0.095;
  const eyeCut = inCircle(nx, ny, 0.48, -0.26, 0.05);
  if (eyeCut) return 0;
  if (!(arch || head || beak || dorsal || pecFin || flukeTop || flukeBot)) return 0;

  if (dorsal || flukeTop || flukeBot || pecFin) return 3;
  if (nx * 0.35 - ny < 0.12 && ny > -0.18) return 2;
  return 1;
}

// 4. Monarch Butterfly
function regionButterfly(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const ax = Math.abs(nx);
  const body = inEllipse(nx, ny, 0, 0.05, 0.085, 0.52);
  const head = inCircle(nx, ny, 0, -0.5, 0.09);
  const ant = distSeg(ax, ny, 0.03, -0.54, 0.2, -0.78) < 0.045;
  const upWing = inEllipse(ax, ny, 0.46, -0.24, 0.42, 0.34, -0.28);
  const lowWing = inEllipse(ax, ny, 0.35, 0.32, 0.32, 0.28, 0.32);
  const eyeSpot = inCircle(ax, ny, 0.52, -0.28, 0.075);
  if (eyeSpot) return 0;
  if (!(body || head || ant || upWing || lowWing)) return 0;

  if (body || head || ant) return 3;
  if (ax > 0.68 || ny < -0.52 || ny > 0.54) return 3;
  if (inCircle(ax, ny, 0.34, -0.18, 0.2) || inCircle(ax, ny, 0.3, 0.32, 0.14)) return 2;
  return 1;
}

// 5. Sea Turtle
function regionTurtle(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const shell = inEllipse(nx, ny, -0.04, 0.05, 0.46, 0.54);
  const head = inEllipse(nx, ny, 0.0, -0.62, 0.18, 0.22);
  const flL = distSeg(nx, ny, -0.34, -0.28, -0.82, -0.56) < 0.13;
  const flR = distSeg(nx, ny, 0.28, -0.28, 0.78, -0.56) < 0.13;
  const blL = distSeg(nx, ny, -0.3, 0.48, -0.58, 0.8) < 0.11;
  const blR = distSeg(nx, ny, 0.22, 0.48, 0.5, 0.8) < 0.11;
  if (!(shell || head || flL || flR || blL || blR)) return 0;

  if (head || flL || flR || blL || blR) return 2;
  const hexCenter = inEllipse(nx, ny, -0.04, 0.05, 0.24, 0.3);
  if (hexCenter) return 3;
  return 1;
}

// 6. Golden Eagle
function regionEagle(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const ax = Math.abs(nx);
  const body = inEllipse(nx, ny, 0, 0.12, 0.22, 0.44);
  const head = inCircle(nx, ny, 0.04, -0.38, 0.16);
  const beak = distSeg(nx, ny, 0.14, -0.4, 0.32, -0.34) < 0.07;
  const wing = distSeg(ax, ny, 0.14, -0.12, 0.88, -0.54) < 0.2 || inEllipse(ax, ny, 0.54, -0.22, 0.38, 0.22, -0.45);
  const tail = inEllipse(nx, ny, 0, 0.62, 0.24, 0.2);
  if (!(body || head || beak || wing || tail)) return 0;

  if (head || tail) return 2;
  if (beak || ax > 0.72) return 3;
  return 1;
}

// 7. Moon Wolf
function regionWolf(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const torso = inEllipse(nx, ny, -0.06, 0.14, 0.44, 0.24, -0.12);
  const chest = inEllipse(nx, ny, 0.26, -0.02, 0.24, 0.26, 0.2);
  const neck = distSeg(nx, ny, 0.26, -0.14, 0.38, -0.44) < 0.15;
  const head = inCircle(nx, ny, 0.4, -0.48, 0.16);
  const snout = distSeg(nx, ny, 0.42, -0.52, 0.62, -0.78) < 0.085;
  const ear = distSeg(nx, ny, 0.3, -0.56, 0.24, -0.78) < 0.065;
  const leg1 = distSeg(nx, ny, 0.28, 0.18, 0.42, 0.78) < 0.085;
  const leg2 = distSeg(nx, ny, 0.14, 0.22, 0.18, 0.78) < 0.08;
  const leg3 = distSeg(nx, ny, -0.36, 0.2, -0.52, 0.78) < 0.09;
  const tail = distSeg(nx, ny, -0.48, 0.16, -0.78, 0.48) < 0.11;
  if (!(torso || chest || neck || head || snout || ear || leg1 || leg2 || leg3 || tail)) return 0;

  if (snout || ear || tail) return 3;
  if (chest || ny > 0.24) return 2;
  return 1;
}

// 8. Fire Phoenix
function regionPhoenix(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const ax = Math.abs(nx);
  const body = inEllipse(nx, ny, 0, 0.05, 0.16, 0.36);
  const head = inCircle(nx, ny, 0.04, -0.38, 0.13);
  const crest = distSeg(nx, ny, 0, -0.46, -0.18, -0.74) < 0.065;
  const wing = inEllipse(ax, ny, 0.48, -0.28, 0.42, 0.24, -0.52) || distSeg(ax, ny, 0.14, -0.08, 0.86, -0.58) < 0.15;
  const tail1 = distSeg(nx, ny, 0, 0.36, -0.28, 0.86) < 0.095;
  const tail2 = distSeg(nx, ny, 0, 0.36, 0.02, 0.9) < 0.095;
  const tail3 = distSeg(nx, ny, 0, 0.36, 0.3, 0.84) < 0.095;
  if (!(body || head || crest || wing || tail1 || tail2 || tail3)) return 0;

  if (ny < -0.36 || ny > 0.62) return 2;
  if (ax > 0.56 || crest) return 3;
  return 1;
}

// 9. Royal Elephant
function regionElephant(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.16, 0.04, 0.5, 0.38);
  const head = inCircle(nx, ny, 0.34, -0.14, 0.28);
  const ear = inEllipse(nx, ny, 0.12, -0.16, 0.22, 0.32, 0.15);
  const trunk = distSeg(nx, ny, 0.56, -0.12, 0.72, -0.52) < 0.1 || distSeg(nx, ny, 0.72, -0.52, 0.56, -0.72) < 0.085;
  const tusk = distSeg(nx, ny, 0.52, 0.02, 0.78, -0.06) < 0.065;
  const legF = distSeg(nx, ny, 0.22, 0.3, 0.24, 0.76) < 0.12;
  const legB = distSeg(nx, ny, -0.44, 0.28, -0.46, 0.76) < 0.125;
  const tail = distSeg(nx, ny, -0.64, 0.02, -0.8, 0.34) < 0.055;
  const eyeCut = inCircle(nx, ny, 0.44, -0.24, 0.055);
  if (eyeCut) return 0;
  if (!(body || head || ear || trunk || tusk || legF || legB || tail)) return 0;

  if (tusk) return 2;
  if (ear || trunk) return 3;
  return 1;
}

// 10. Emperor Penguin
function regionPenguin(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, 0, 0.14, 0.42, 0.58);
  const head = inCircle(nx, ny, 0, -0.46, 0.25);
  const beak = distSeg(nx, ny, 0.2, -0.48, 0.44, -0.42) < 0.075;
  const wingL = inEllipse(nx, ny, -0.44, 0.12, 0.12, 0.36, 0.32);
  const wingR = inEllipse(nx, ny, 0.44, 0.12, 0.12, 0.36, -0.32);
  const footL = inEllipse(nx, ny, -0.2, 0.74, 0.16, 0.08);
  const footR = inEllipse(nx, ny, 0.2, 0.74, 0.16, 0.08);
  if (!(body || head || beak || wingL || wingR || footL || footR)) return 0;

  if (beak || footL || footR) return 2;
  const belly = inEllipse(nx, ny, 0, 0.18, 0.24, 0.4);
  if (belly) return 3;
  return 1;
}

// 11. Great Shark
function regionShark(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, 0.04, 0.05, 0.68, 0.26, -0.06);
  const snout = inEllipse(nx, ny, 0.64, 0.04, 0.24, 0.15);
  const dorsal = distSeg(nx, ny, -0.02, -0.18, -0.16, -0.62) < 0.13 || inEllipse(nx, ny, -0.06, -0.38, 0.14, 0.24, 0.28);
  const pecFin = distSeg(nx, ny, 0.12, 0.18, -0.06, 0.56) < 0.11;
  const tailUp = distSeg(nx, ny, -0.58, 0.06, -0.88, -0.36) < 0.11;
  const tailDn = distSeg(nx, ny, -0.58, 0.06, -0.82, 0.34) < 0.095;
  const eyeCut = inCircle(nx, ny, 0.54, -0.02, 0.05);
  if (eyeCut) return 0;
  if (!(body || snout || dorsal || pecFin || tailUp || tailDn)) return 0;

  if (dorsal || tailUp || pecFin) return 3;
  if (ny > 0.08 && body) return 2;
  return 1;
}

// 12. Night Owl
function regionOwl(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const ax = Math.abs(nx);
  const body = inEllipse(nx, ny, 0, 0.16, 0.46, 0.54);
  const head = inEllipse(nx, ny, 0, -0.34, 0.42, 0.3);
  const ear = distSeg(ax, ny, 0.24, -0.52, 0.46, -0.78) < 0.09;
  const eyeCut = inCircle(ax, ny, 0.18, -0.36, 0.085);
  if (eyeCut) return 0;
  if (!(body || head || ear)) return 0;

  if (inEllipse(nx, ny, 0, 0.24, 0.24, 0.34)) return 2;
  if (ear || ax > 0.36 || inCircle(nx, ny, 0, -0.24, 0.08)) return 3;
  return 1;
}

// 13. Sky Griffin (Level 300 milestone)
function regionGriffin(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.1, 0.16, 0.44, 0.24, -0.1);
  const chest = inCircle(nx, ny, 0.28, 0.02, 0.22);
  const head = inCircle(nx, ny, 0.44, -0.28, 0.18);
  const beak = distSeg(nx, ny, 0.54, -0.3, 0.78, -0.22) < 0.08;
  const wing = distSeg(nx, ny, 0.06, -0.02, -0.54, -0.68) < 0.19 || inEllipse(nx, ny, -0.22, -0.34, 0.34, 0.2, 0.7);
  const legF = distSeg(nx, ny, 0.3, 0.2, 0.48, 0.74) < 0.09;
  const legB = distSeg(nx, ny, -0.4, 0.22, -0.54, 0.74) < 0.095;
  const tail = distSeg(nx, ny, -0.5, 0.16, -0.82, -0.08) < 0.075;
  if (!(body || chest || head || beak || wing || legF || legB || tail)) return 0;

  if (wing || head || beak) return 2;
  if (tail || legF) return 3;
  return 1;
}

// 14. Royal Peacock
function regionPeacock(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const fanDist = Math.hypot(nx, ny - 0.18);
  const inFan = fanDist <= 0.84 && ny <= 0.26 && Math.abs(nx) <= 0.86;
  const body = inEllipse(nx, ny, 0, 0.22, 0.18, 0.42);
  const neck = distSeg(nx, ny, 0, -0.14, 0.08, -0.52) < 0.1;
  const head = inCircle(nx, ny, 0.12, -0.54, 0.12);
  const crest = distSeg(nx, ny, 0.1, -0.62, 0.02, -0.8) < 0.05;
  if (!(inFan || body || neck || head || crest)) return 0;

  if (body || neck || head) return 3;
  if (inFan && fanDist > 0.58) return 2;
  return 1;
}

// 15. Forest Stag
function regionStag(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.1, 0.16, 0.42, 0.22, -0.08);
  const neck = distSeg(nx, ny, 0.22, 0.08, 0.38, -0.28) < 0.13;
  const head = inEllipse(nx, ny, 0.46, -0.3, 0.18, 0.12, -0.2);
  const antlerMain = distSeg(nx, ny, 0.36, -0.38, 0.18, -0.78) < 0.06 || distSeg(nx, ny, 0.42, -0.38, 0.56, -0.76) < 0.06;
  const antlerTine = distSeg(nx, ny, 0.28, -0.58, 0.06, -0.68) < 0.05 || distSeg(nx, ny, 0.5, -0.58, 0.7, -0.66) < 0.05;
  const legF = distSeg(nx, ny, 0.22, 0.24, 0.34, 0.78) < 0.08;
  const legB = distSeg(nx, ny, -0.4, 0.22, -0.5, 0.78) < 0.085;
  if (!(body || neck || head || antlerMain || antlerTine || legF || legB)) return 0;

  if (antlerMain || antlerTine) return 2;
  if (legF || legB) return 3;
  return 1;
}

// 16. Hummingbird
function regionHummingbird(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, 0.06, 0.12, 0.22, 0.38, 0.45);
  const head = inCircle(nx, ny, 0.26, -0.2, 0.15);
  const beak = distSeg(nx, ny, 0.36, -0.24, 0.86, -0.42) < 0.055;
  const wingUp = inEllipse(nx, ny, -0.28, -0.32, 0.46, 0.2, 0.65);
  const wingBk = inEllipse(nx, ny, -0.42, -0.02, 0.38, 0.16, 0.25);
  const tail = distSeg(nx, ny, -0.14, 0.36, -0.46, 0.78) < 0.1;
  if (!(body || head || beak || wingUp || wingBk || tail)) return 0;

  if (inCircle(nx, ny, 0.2, -0.06, 0.16)) return 2;
  if (wingUp || wingBk || beak) return 3;
  return 1;
}

// 17. Swift Fox
function regionFox(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.06, 0.12, 0.42, 0.22, -0.25);
  const head = inCircle(nx, ny, 0.36, -0.22, 0.2);
  const snout = distSeg(nx, ny, 0.44, -0.22, 0.7, -0.18) < 0.085;
  const ear1 = distSeg(nx, ny, 0.26, -0.36, 0.22, -0.62) < 0.075;
  const ear2 = distSeg(nx, ny, 0.42, -0.36, 0.46, -0.6) < 0.07;
  const legF = distSeg(nx, ny, 0.26, 0.12, 0.48, 0.62) < 0.08;
  const legB = distSeg(nx, ny, -0.36, 0.24, -0.54, 0.72) < 0.085;
  const tail = inEllipse(nx, ny, -0.58, 0.04, 0.32, 0.16, -0.45);
  if (!(body || head || snout || ear1 || ear2 || legF || legB || tail)) return 0;

  if (tail && nx < -0.66) return 2;
  if (ear1 || ear2 || legF || legB) return 3;
  return 1;
}

// 18. Reef Octopus
function regionOctopus(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const mantle = inEllipse(nx, ny, 0, -0.36, 0.36, 0.4);
  const t1 = distSeg(nx, ny, -0.24, 0.0, -0.72, 0.46) < 0.095;
  const t2 = distSeg(nx, ny, -0.12, 0.02, -0.44, 0.74) < 0.095;
  const t3 = distSeg(nx, ny, 0.0, 0.04, 0.0, 0.8) < 0.1;
  const t4 = distSeg(nx, ny, 0.12, 0.02, 0.44, 0.74) < 0.095;
  const t5 = distSeg(nx, ny, 0.24, 0.0, 0.72, 0.46) < 0.095;
  const eyeL = inCircle(nx, ny, -0.14, -0.18, 0.06);
  const eyeR = inCircle(nx, ny, 0.14, -0.18, 0.06);
  if (eyeL || eyeR) return 0;
  if (!(mantle || t1 || t2 || t3 || t4 || t5)) return 0;

  if (ny > 0.32) return 2;
  if (inEllipse(nx, ny, 0, -0.46, 0.2, 0.22)) return 3;
  return 1;
}

// 19. Blue Whale (Breaching)
function regionWhale(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const angle = 0.54;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rx = nx * cos - ny * sin;
  const ry = nx * sin + ny * cos;
  const bodyCenterY = 0.16 * rx * rx - 0.08;
  const halfW = rx > 0.7 ? Math.max(0, (0.94 - rx) * 1.55) : 0.36 - 0.08 * Math.abs(rx);
  const body = rx >= -0.78 && rx <= 0.94 && Math.abs(ry - bodyCenterY) <= halfW;
  const fin1 = distSeg(nx, ny, -0.02, -0.26, -0.74, -0.02) < 0.13;
  const fin2 = distSeg(nx, ny, 0.04, 0.06, -0.74, 0.38) < 0.13;
  const fluke1 = distSeg(nx, ny, 0.42, 0.58, 0.78, 0.44) < 0.12;
  const fluke2 = distSeg(nx, ny, 0.42, 0.58, 0.62, 0.86) < 0.12;
  const eye = inCircle(nx, ny, 0.3, -0.36, 0.065);
  if (eye) return 0;
  if (!(body || fin1 || fin2 || fluke1 || fluke2)) return 0;

  if (fin1 || fin2 || fluke1 || fluke2) return 3;
  if (ry > bodyCenterY + 0.05) return 2;
  return 1;
}

// 20. Emerald Dragonfly
function regionDragonfly(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const ax = Math.abs(nx);
  const head = inCircle(nx, ny, 0, -0.48, 0.13);
  const thorax = inEllipse(nx, ny, 0, -0.18, 0.13, 0.22);
  const abdomen = distSeg(nx, ny, 0, 0.02, 0, 0.82) < 0.08;
  const wingTop = inEllipse(ax, ny, 0.48, -0.24, 0.42, 0.15, -0.22);
  const wingBot = inEllipse(ax, ny, 0.44, 0.04, 0.38, 0.14, 0.18);
  if (!(head || thorax || abdomen || wingTop || wingBot)) return 0;

  if (wingTop || wingBot) return 2;
  if (head || thorax) return 3;
  return 1;
}

// 21. Graceful Swan
function regionSwan(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.12, 0.28, 0.54, 0.28);
  const wing = inEllipse(nx, ny, -0.24, 0.14, 0.42, 0.22, -0.22);
  const neck1 = distSeg(nx, ny, 0.34, 0.18, 0.42, -0.32) < 0.1;
  const neck2 = distSeg(nx, ny, 0.42, -0.32, 0.26, -0.58) < 0.095;
  const head = inCircle(nx, ny, 0.34, -0.58, 0.12);
  const beak = distSeg(nx, ny, 0.42, -0.58, 0.62, -0.5) < 0.065;
  if (!(body || wing || neck1 || neck2 || head || beak)) return 0;

  if (beak) return 2;
  if (wing) return 3;
  return 1;
}

// 22. Coral Seahorse
function regionSeahorse(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const head = inCircle(nx, ny, 0.08, -0.46, 0.22);
  const snout = distSeg(nx, ny, 0.24, -0.44, 0.54, -0.36) < 0.075;
  const crest = distSeg(nx, ny, -0.02, -0.62, -0.2, -0.78) < 0.075;
  const belly = inEllipse(nx, ny, 0.08, 0.02, 0.28, 0.36);
  const dorsalFin = inEllipse(nx, ny, -0.26, 0.04, 0.16, 0.24);
  const tailCurl = distSeg(nx, ny, 0.02, 0.36, -0.1, 0.72) < 0.1 || distSeg(nx, ny, -0.1, 0.72, 0.2, 0.76) < 0.085;
  const eyeCut = inCircle(nx, ny, 0.14, -0.5, 0.05);
  if (eyeCut) return 0;
  if (!(head || snout || crest || belly || dorsalFin || tailCurl)) return 0;

  if (dorsalFin || crest) return 3;
  if (nx > 0.16 && belly) return 2;
  return 1;
}

// 23. Bengal Tiger
function regionTiger(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.1, 0.12, 0.48, 0.26, -0.05);
  const head = inCircle(nx, ny, 0.42, -0.22, 0.24);
  const snout = inEllipse(nx, ny, 0.62, -0.16, 0.16, 0.13);
  const ear = inCircle(nx, ny, 0.34, -0.46, 0.085);
  const legF = distSeg(nx, ny, 0.26, 0.22, 0.4, 0.76) < 0.1;
  const legB = distSeg(nx, ny, -0.42, 0.2, -0.54, 0.76) < 0.1;
  const tail = distSeg(nx, ny, -0.52, 0.06, -0.82, -0.18) < 0.07;
  if (!(body || head || snout || ear || legF || legB || tail)) return 0;

  // Tiger stripes along body & tail
  const stripe = Math.sin(nx * 24 + ny * 4) > 0.55;
  if (stripe) return 3;
  if (snout || ny > 0.24) return 2;
  return 1;
}

// 24. Pink Flamingo
function regionFlamingo(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.08, -0.02, 0.38, 0.24, -0.12);
  const neck1 = distSeg(nx, ny, 0.24, -0.06, 0.34, -0.48) < 0.085;
  const neck2 = distSeg(nx, ny, 0.34, -0.48, 0.14, -0.68) < 0.085;
  const head = inCircle(nx, ny, 0.22, -0.66, 0.11);
  const beak = distSeg(nx, ny, 0.28, -0.66, 0.48, -0.56) < 0.065;
  const legSt = distSeg(nx, ny, -0.08, 0.18, -0.08, 0.84) < 0.065;
  const legBn = distSeg(nx, ny, 0.04, 0.18, 0.28, 0.44) < 0.06 || distSeg(nx, ny, 0.28, 0.44, -0.02, 0.56) < 0.06;
  if (!(body || neck1 || neck2 || head || beak || legSt || legBn)) return 0;

  if (beak || legSt || legBn) return 3;
  if (inEllipse(nx, ny, -0.16, -0.04, 0.24, 0.14)) return 2;
  return 1;
}

// 25. Shadow Panther
function regionPanther(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.08, 0.08, 0.48, 0.22, -0.15);
  const head = inCircle(nx, ny, 0.44, -0.22, 0.2);
  const snout = inEllipse(nx, ny, 0.62, -0.18, 0.14, 0.11);
  const ear = inCircle(nx, ny, 0.38, -0.42, 0.075);
  const legF = distSeg(nx, ny, 0.24, 0.14, 0.48, 0.66) < 0.085;
  const legB = distSeg(nx, ny, -0.42, 0.16, -0.62, 0.68) < 0.095;
  const tail = distSeg(nx, ny, -0.52, 0.12, -0.84, 0.38) < 0.065;
  const eye = inCircle(nx, ny, 0.5, -0.26, 0.05);
  if (eye) return 0;
  if (!(body || head || snout || ear || legF || legB || tail)) return 0;

  if (ear || snout) return 2;
  if (ny > 0.2) return 3;
  return 1;
}

// 26. King Crab
function regionCrab(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const ax = Math.abs(nx);
  const shell = inEllipse(nx, ny, 0, 0.16, 0.44, 0.3);
  const arm = distSeg(ax, ny, 0.36, 0.0, 0.66, -0.34) < 0.09;
  const claw = inCircle(ax, ny, 0.56, -0.48, 0.18) && !(ax < 0.58 && ny < -0.54);
  const leg1 = distSeg(ax, ny, 0.36, 0.18, 0.82, 0.12) < 0.07;
  const leg2 = distSeg(ax, ny, 0.34, 0.3, 0.78, 0.42) < 0.07;
  const leg3 = distSeg(ax, ny, 0.26, 0.4, 0.6, 0.68) < 0.07;
  if (!(shell || arm || claw || leg1 || leg2 || leg3)) return 0;

  if (claw) return 3;
  if (inEllipse(nx, ny, 0, 0.16, 0.24, 0.16)) return 2;
  return 1;
}

// 27. Starlight Unicorn
function regionUnicorn(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const body = inEllipse(nx, ny, -0.1, 0.18, 0.44, 0.24, -0.06);
  const neck = distSeg(nx, ny, 0.22, 0.1, 0.36, -0.32) < 0.15;
  const head = inEllipse(nx, ny, 0.46, -0.34, 0.2, 0.13, 0.25);
  const horn = distSeg(nx, ny, 0.48, -0.44, 0.72, -0.78) < 0.06;
  const mane = distSeg(nx, ny, 0.28, -0.44, 0.02, -0.02) < 0.11;
  const legF = distSeg(nx, ny, 0.22, 0.24, 0.4, 0.78) < 0.085;
  const legB = distSeg(nx, ny, -0.4, 0.22, -0.54, 0.78) < 0.09;
  const tail = distSeg(nx, ny, -0.52, 0.14, -0.82, 0.48) < 0.11;
  if (!(body || neck || head || horn || mane || legF || legB || tail)) return 0;

  if (horn) return 2;
  if (mane || tail) return 3;
  return 1;
}

// 28. Golden Koi
function regionKoi(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const curveX = nx - 0.12 * Math.sin(ny * 3.2);
  const body = inEllipse(curveX, ny, 0, -0.06, 0.26, 0.54);
  const finL = distSeg(nx, ny, -0.2, -0.12, -0.56, 0.14) < 0.11;
  const finR = distSeg(nx, ny, 0.22, -0.16, 0.56, 0.08) < 0.11;
  const tail = distSeg(nx, ny, -0.04, 0.44, -0.34, 0.82) < 0.13 || distSeg(nx, ny, -0.04, 0.44, 0.24, 0.82) < 0.13;
  if (!(body || finL || finR || tail)) return 0;

  if (finL || finR || tail) return 2;
  if (inCircle(nx, ny, 0.04, -0.3, 0.16) || inCircle(nx, ny, -0.06, 0.14, 0.13)) return 3;
  return 1;
}

// 29. Night Bat
function regionBat(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const ax = Math.abs(nx);
  const body = inEllipse(nx, ny, 0, 0.08, 0.16, 0.34);
  const head = inCircle(nx, ny, 0, -0.3, 0.15);
  const ear = distSeg(ax, ny, 0.08, -0.4, 0.16, -0.62) < 0.06;
  const wingUpper = distSeg(ax, ny, 0.12, -0.12, 0.88, -0.44) < 0.15;
  const wingMem = inEllipse(ax, ny, 0.48, -0.04, 0.38, 0.26, -0.2);
  if (!(body || head || ear || wingUpper || wingMem)) return 0;

  if (body || head || ear) return 3;
  if (ax > 0.6) return 2;
  return 1;
}

// 30. Grand Celestial Dragon (Level 500 Finale!)
function regionDragon(nx: number, ny: number): 0 | 1 | 2 | 3 {
  const torso = inEllipse(nx, ny, -0.08, 0.14, 0.42, 0.26, -0.12);
  const neck = distSeg(nx, ny, 0.2, 0.06, 0.42, -0.36) < 0.15;
  const head = inEllipse(nx, ny, 0.48, -0.42, 0.22, 0.14, -0.1);
  const horns = distSeg(nx, ny, 0.38, -0.52, 0.18, -0.78) < 0.065;
  const wing1 = distSeg(nx, ny, 0.06, -0.02, -0.56, -0.74) < 0.18;
  const wing2 = inEllipse(nx, ny, -0.26, -0.36, 0.36, 0.22, 0.65);
  const tail = distSeg(nx, ny, -0.44, 0.16, -0.82, 0.56) < 0.1 || distSeg(nx, ny, -0.82, 0.56, -0.62, 0.82) < 0.085;
  const legF = distSeg(nx, ny, 0.24, 0.24, 0.44, 0.78) < 0.09;
  const legB = distSeg(nx, ny, -0.38, 0.24, -0.46, 0.78) < 0.095;
  if (!(torso || neck || head || horns || wing1 || wing2 || tail || legF || legB)) return 0;

  if (horns || wing1 || wing2) return 2;
  if (ny > 0.22 || tail) return 3;
  return 1;
}

export const SHOWCASE_THEMES: Record<string, ShowcaseThemeDef> = {
  clownfish: {
    id: 'clownfish',
    name: 'Clownfish',
    category: 'water',
    animStyle: 'swim_turn',
    boardPalette: ['#dc4a1c', '#ca8a04', '#292524'],
    introPalette: ['#ff6b35', '#fef08a', '#fb923c'],
    regionFn: regionClownfish,
  },
  lion: {
    id: 'lion',
    name: 'Savanna Lion',
    category: 'roar',
    animStyle: 'leap_roar',
    boardPalette: ['#d97706', '#b45309', '#451a03'],
    introPalette: ['#fbbf24', '#fde68a', '#b45309'],
    regionFn: regionLion,
  },
  dolphin: {
    id: 'dolphin',
    name: 'Ocean Dolphin',
    category: 'water',
    animStyle: 'arc_splash',
    boardPalette: ['#0284c7', '#0d9488', '#1e3a8a'],
    introPalette: ['#38bdf8', '#a5f3fc', '#2563eb'],
    regionFn: regionDolphin,
  },
  butterfly: {
    id: 'butterfly',
    name: 'Monarch Butterfly',
    category: 'wing',
    animStyle: 'flutter_figure8',
    boardPalette: ['#ea580c', '#d97706', '#292524'],
    introPalette: ['#fb923c', '#fde047', '#f97316'],
    regionFn: regionButterfly,
  },
  turtle: {
    id: 'turtle',
    name: 'Sea Turtle',
    category: 'water',
    animStyle: 'glide_bubbles',
    boardPalette: ['#047857', '#0d9488', '#14532d'],
    introPalette: ['#34d399', '#5eead4', '#10b981'],
    regionFn: regionTurtle,
  },
  eagle: {
    id: 'eagle',
    name: 'Golden Eagle',
    category: 'wing',
    animStyle: 'soar_dive',
    boardPalette: ['#78350f', '#ca8a04', '#1c1917'],
    introPalette: ['#d97706', '#fde047', '#a8a29e'],
    regionFn: regionEagle,
  },
  wolf: {
    id: 'wolf',
    name: 'Moon Wolf',
    category: 'roar',
    animStyle: 'prowl_howl',
    boardPalette: ['#334155', '#0284c7', '#0f172a'],
    introPalette: ['#94a3b8', '#7dd3fc', '#e2e8f0'],
    regionFn: regionWolf,
  },
  phoenix: {
    id: 'phoenix',
    name: 'Fire Phoenix',
    category: 'mystic',
    animStyle: 'spiral_rise',
    boardPalette: ['#dc2626', '#d97706', '#7f1d1d'],
    introPalette: ['#f87171', '#fde047', '#fb923c'],
    regionFn: regionPhoenix,
  },
  elephant: {
    id: 'elephant',
    name: 'Royal Elephant',
    category: 'roar',
    animStyle: 'stomp_trumpet',
    boardPalette: ['#475569', '#b45309', '#1e293b'],
    introPalette: ['#94a3b8', '#fef3c7', '#cbd5e1'],
    regionFn: regionElephant,
  },
  penguin: {
    id: 'penguin',
    name: 'Emperor Penguin',
    category: 'water',
    animStyle: 'waddle_hop',
    boardPalette: ['#1e293b', '#ea580c', '#0284c7'],
    introPalette: ['#cbd5e1', '#fb923c', '#38bdf8'],
    regionFn: regionPenguin,
  },
  shark: {
    id: 'shark',
    name: 'Great Shark',
    category: 'water',
    animStyle: 'cruise_snap',
    boardPalette: ['#1d4ed8', '#0f766e', '#0f172a'],
    introPalette: ['#60a5fa', '#e0f2fe', '#3b82f6'],
    regionFn: regionShark,
  },
  owl: {
    id: 'owl',
    name: 'Night Owl',
    category: 'wing',
    animStyle: 'glide_blink',
    boardPalette: ['#7c2d12', '#d97706', '#292524'],
    introPalette: ['#fdba74', '#fde047', '#d97706'],
    regionFn: regionOwl,
  },
  griffin: {
    id: 'griffin',
    name: 'Sky Griffin',
    category: 'wing',
    animStyle: 'soar_dive',
    boardPalette: ['#b45309', '#4338ca', '#451a03'],
    introPalette: ['#fbbf24', '#a5b4fc', '#f59e0b'],
    regionFn: regionGriffin,
  },
  peacock: {
    id: 'peacock',
    name: 'Royal Peacock',
    category: 'wing',
    animStyle: 'strut_fan',
    boardPalette: ['#047857', '#0284c7', '#1e3a8a'],
    introPalette: ['#34d399', '#38bdf8', '#818cf8'],
    regionFn: regionPeacock,
  },
  stag: {
    id: 'stag',
    name: 'Forest Stag',
    category: 'mystic',
    animStyle: 'bound_glow',
    boardPalette: ['#92400e', '#ca8a04', '#451a03'],
    introPalette: ['#fb923c', '#fef08a', '#d97706'],
    regionFn: regionStag,
  },
  hummingbird: {
    id: 'hummingbird',
    name: 'Hummingbird',
    category: 'wing',
    animStyle: 'hover_flash',
    boardPalette: ['#059669', '#be123c', '#1d4ed8'],
    introPalette: ['#34d399', '#fb7185', '#60a5fa'],
    regionFn: regionHummingbird,
  },
  fox: {
    id: 'fox',
    name: 'Swift Fox',
    category: 'roar',
    animStyle: 'arc_pounce',
    boardPalette: ['#c2410c', '#ca8a04', '#292524'],
    introPalette: ['#fb923c', '#fef3c7', '#ea580c'],
    regionFn: regionFox,
  },
  octopus: {
    id: 'octopus',
    name: 'Reef Octopus',
    category: 'water',
    animStyle: 'pulse_tentacles',
    boardPalette: ['#9d174d', '#db2777', '#4c1d95'],
    introPalette: ['#f472b6', '#c084fc', '#fb7185'],
    regionFn: regionOctopus,
  },
  whale: {
    id: 'whale',
    name: 'Blue Whale',
    category: 'water',
    animStyle: 'breach_splash',
    boardPalette: ['#1e40af', '#0284c7', '#0f172a'],
    introPalette: ['#60a5fa', '#7dd3fc', '#38bdf8'],
    regionFn: regionWhale,
  },
  dragonfly: {
    id: 'dragonfly',
    name: 'Emerald Dragonfly',
    category: 'wing',
    animStyle: 'dart_hover',
    boardPalette: ['#0f766e', '#0284c7', '#14532d'],
    introPalette: ['#2dd4bf', '#bae6fd', '#34d399'],
    regionFn: regionDragonfly,
  },
  swan: {
    id: 'swan',
    name: 'Graceful Swan',
    category: 'water',
    animStyle: 'glide_bubbles',
    boardPalette: ['#0369a1', '#d97706', '#1e293b'],
    introPalette: ['#e2e8f0', '#fb923c', '#7dd3fc'],
    regionFn: regionSwan,
  },
  seahorse: {
    id: 'seahorse',
    name: 'Coral Seahorse',
    category: 'water',
    animStyle: 'swim_turn',
    boardPalette: ['#be123c', '#d97706', '#7c2d12'],
    introPalette: ['#fb7185', '#fde047', '#fdba74'],
    regionFn: regionSeahorse,
  },
  tiger: {
    id: 'tiger',
    name: 'Bengal Tiger',
    category: 'roar',
    animStyle: 'leap_roar',
    boardPalette: ['#ea580c', '#ca8a04', '#18181b'],
    introPalette: ['#fb923c', '#fef08a', '#f97316'],
    regionFn: regionTiger,
  },
  flamingo: {
    id: 'flamingo',
    name: 'Pink Flamingo',
    category: 'water',
    animStyle: 'strut_fan',
    boardPalette: ['#db2777', '#be185d', '#1e293b'],
    introPalette: ['#f472b6', '#fbcfe8', '#fb7185'],
    regionFn: regionFlamingo,
  },
  panther: {
    id: 'panther',
    name: 'Shadow Panther',
    category: 'roar',
    animStyle: 'prowl_howl',
    boardPalette: ['#312e81', '#7c3aed', '#0f172a'],
    introPalette: ['#818cf8', '#c4b5fd', '#a78bfa'],
    regionFn: regionPanther,
  },
  crab: {
    id: 'crab',
    name: 'King Crab',
    category: 'water',
    animStyle: 'waddle_hop',
    boardPalette: ['#dc2626', '#ea580c', '#7f1d1d'],
    introPalette: ['#f87171', '#fdba74', '#ef4444'],
    regionFn: regionCrab,
  },
  unicorn: {
    id: 'unicorn',
    name: 'Starlight Unicorn',
    category: 'mystic',
    animStyle: 'bound_glow',
    boardPalette: ['#6d28d9', '#d97706', '#be185d'],
    introPalette: ['#c4b5fd', '#fde047', '#f472b6'],
    regionFn: regionUnicorn,
  },
  koi: {
    id: 'koi',
    name: 'Golden Koi',
    category: 'water',
    animStyle: 'swim_turn',
    boardPalette: ['#d97706', '#dc2626', '#78350f'],
    introPalette: ['#fbbf24', '#f87171', '#fde68a'],
    regionFn: regionKoi,
  },
  bat: {
    id: 'bat',
    name: 'Night Bat',
    category: 'wing',
    animStyle: 'flutter_figure8',
    boardPalette: ['#4338ca', '#7c3aed', '#1e1b4b'],
    introPalette: ['#818cf8', '#c084fc', '#a5b4fc'],
    regionFn: regionBat,
  },
  dragon: {
    id: 'dragon',
    name: 'Celestial Dragon',
    category: 'mystic',
    animStyle: 'coil_breath',
    boardPalette: ['#b91c1c', '#d97706', '#1c1917'],
    introPalette: ['#ef4444', '#fde047', '#fb923c'],
    regionFn: regionDragon,
  },
};

/**
 * Curated 30 unique animated showcase themes for levels 210, 220, ..., 500
 * (with Level 320 = Clownfish, Level 350 = Dolphin, Level 380 = Lion!).
 */
export const SHOWCASE_SCHEDULE: string[] = [
  'butterfly',    // 210
  'turtle',       // 220
  'eagle',        // 230
  'wolf',         // 240
  'phoenix',      // 250
  'elephant',     // 260
  'penguin',      // 270
  'shark',        // 280
  'owl',          // 290
  'griffin',      // 300
  'peacock',      // 310
  'clownfish',    // 320 (matches Video 1)
  'stag',         // 330
  'hummingbird',  // 340
  'dolphin',      // 350 (matches Video 3)
  'fox',          // 360
  'octopus',      // 370
  'lion',         // 380 (matches Video 2)
  'whale',        // 390
  'dragonfly',    // 400
  'swan',         // 410
  'seahorse',     // 420
  'tiger',        // 430
  'flamingo',     // 440
  'panther',      // 450
  'crab',         // 460
  'unicorn',      // 470
  'koi',          // 480
  'bat',          // 490
  'dragon',       // 500 (Grand Finale)
];

export function isAnimatedShowcaseLevel(levelId: number): boolean {
  return levelId > 200 && levelId <= 500 && levelId % 10 === 0;
}

export function getShowcaseThemeForLevel(levelId: number): ShowcaseThemeDef {
  const slot = Math.max(0, Math.floor((levelId - 210) / 10)) % SHOWCASE_SCHEDULE.length;
  const key = SHOWCASE_SCHEDULE[slot];
  return SHOWCASE_THEMES[key] || SHOWCASE_THEMES.clownfish;
}

/**
 * Generates a full-board multi-colored creature silhouette mask (no outer frame box).
 * Prunes isolated 1-dot cells so 100% of dots can form valid >= 2-dot arrows.
 */
export function buildShowcasePuzzleMask(
  levelId: number,
  width: number,
  height: number
): ShowcaseMaskResult {
  const theme = getShowcaseThemeForLevel(levelId);
  const mask = new Uint8Array(width * height);
  const colorMask = new Uint8Array(width * height);
  const idx = (x: number, y: number) => y * width + x;

  const padX = 2;
  const padY = 3;
  const ix0 = padX;
  const ix1 = Math.max(ix0 + 1, width - 1 - padX);
  const iy0 = padY;
  const iy1 = Math.max(iy0 + 1, height - 1 - padY);
  const iw = Math.max(1, ix1 - ix0);
  const ih = Math.max(1, iy1 - iy0);

  for (let y = iy0; y <= iy1; y++) {
    const ny = ((y - iy0) / ih) * 2 - 1;
    for (let x = ix0; x <= ix1; x++) {
      const nx = ((x - ix0) / iw) * 2 - 1;
      const reg = theme.regionFn(nx, ny);
      if (reg > 0) {
        const k = idx(x, y);
        mask[k] = 1;
        colorMask[k] = reg;
      }
    }
  }

  // Prune isolated 0-neighbor dots so every cell can belong to >= 2-dot arrow
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const k = idx(x, y);
        if (mask[k] === 0) continue;
        let deg = 0;
        if (x > 0 && mask[idx(x - 1, y)] === 1) deg++;
        if (x < width - 1 && mask[idx(x + 1, y)] === 1) deg++;
        if (y > 0 && mask[idx(x, y - 1)] === 1) deg++;
        if (y < height - 1 && mask[idx(x, y + 1)] === 1) deg++;
        if (deg === 0) {
          mask[k] = 0;
          colorMask[k] = 0;
          changed = true;
        }
      }
    }
  }

  return { mask, colorMask, theme };
}
