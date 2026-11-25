export interface ArtMaskResult {
  mask: Uint8Array;
  /** Separate outer frame mask (0/1) for tonal outline shading on art levels */
  frameMask: Uint8Array;
  themeName: string;
  /** Cohesive tonal shades [outerFrameColor, primaryBodyColor, innerAccentColor] */
  tonalPalette: [string, string, string];
}

export interface ArtThemeDef {
  id: string;
  name: string;
  /** Tonal 3-shade palette [frame/outline, mid-body, bright-inner] for levels 101-300 */
  shades: [string, string, string];
  shapeFn: (nx: number, ny: number) => boolean;
}

/**
 * Signed/normalized shape predicates in [-1, 1] x [-1, 1]
 */
function distPointToSeg(
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

function isInsideWhale(nx: number, ny: number): boolean {
  // Large breaching whale filling inner art frame (inspired by Level 226 screenshot)
  // Rotate space so head sweeps to top-right and curved back sweeps down to tail at bottom-right
  const angle = 0.58;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rx = nx * cos - ny * sin;
  const ry = nx * sin + ny * cos;

  // Main sweeping whale torso from tail-stem (-0.85) to snout (+0.95)
  const bodyCenterY = 0.16 * rx * rx - 0.08;
  const halfWidth =
    rx > 0.72
      ? Math.max(0, (0.96 - rx) * 1.65)
      : rx < -0.5
      ? Math.max(0.11, 0.31 + (rx + 0.5) * 0.42)
      : 0.36 - 0.08 * Math.abs(rx);
  const inBody = rx >= -0.82 && rx <= 0.96 && Math.abs(ry - bodyCenterY) <= halfWidth;

  // Two bold pectoral fins extending left
  const fin1 = distPointToSeg(nx, ny, -0.02, -0.28, -0.78, -0.02) < 0.135;
  const fin2 = distPointToSeg(nx, ny, 0.04, 0.06, -0.78, 0.38) < 0.135;

  // Thick tail stem overlapping lower torso cleanly into dual flukes
  const tailStem = distPointToSeg(nx, ny, -0.14, 0.32, 0.48, 0.62) < 0.155;
  const tailUpperFluke = distPointToSeg(nx, ny, 0.44, 0.60, 0.78, 0.46) < 0.12;
  const tailLowerFluke = distPointToSeg(nx, ny, 0.44, 0.60, 0.64, 0.88) < 0.13;

  // Small eye cutout near top-right head
  const inEye = Math.hypot(nx - 0.30, ny + 0.36) < 0.07;

  return (inBody || fin1 || fin2 || tailStem || tailUpperFluke || tailLowerFluke) && !inEye;
}

function isInsideHeart(nx: number, ny: number): boolean {
  const x = nx * 1.28;
  const y = -ny * 1.25 + 0.14;
  const eq = Math.pow(x * x + y * y - 0.58, 3) - x * x * Math.pow(y, 3) * 1.15;
  const innerCut = Math.hypot(nx, ny + 0.1) < 0.12;
  return eq <= 0 && !innerCut;
}

function isInsideCrown(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  if (ny > 0.52 || ny < -0.58) return false;
  // Base band
  if (ny >= 0.2 && ax <= 0.72) return true;
  // Center spike
  if (ax <= (ny + 0.58) * 0.46 && ny <= 0.25) return true;
  // Side spikes
  const sideY = -0.38 + Math.abs(ax - 0.58) * 1.35;
  if (ax >= 0.26 && ax <= 0.76 && ny >= sideY && ny <= 0.25) return true;
  return false;
}

function isInsideButterfly(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const body = ax < 0.09 && Math.abs(ny) < 0.62;
  const upperWing = Math.hypot((ax - 0.44) * 1.1, (ny + 0.24) * 1.15) < 0.42;
  const lowerWing = Math.hypot((ax - 0.34) * 1.25, (ny - 0.34) * 1.2) < 0.32;
  const wingEye = Math.hypot(ax - 0.48, ny + 0.26) < 0.09;
  return body || ((upperWing || lowerWing) && !wingEye);
}

function isInsideDiamond(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const outer = ax * 1.1 + ay * 0.92 <= 0.86;
  const hollowCenter = ax + ay < 0.24;
  return outer && !hollowCenter;
}

function isInsideRocket(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  // Fuselage
  const noseWidth = ny < -0.2 ? Math.max(0, (ny + 0.78) * 0.55) : 0.31;
  const body = ny >= -0.78 && ny <= 0.46 && ax <= noseWidth;
  // Fins
  const fin = ny >= 0.12 && ny <= 0.62 && ax >= 0.22 && ax <= 0.22 + (ny - 0.12) * 0.85;
  // Flame
  const flame = ny > 0.46 && ny <= 0.8 && ax <= (0.8 - ny) * 0.65;
  // Porthole window
  const windowCut = Math.hypot(nx, ny + 0.1) < 0.11;
  return (body || fin || flame) && !windowCut;
}

function isInsideShield(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  if (ny < -0.68 || ny > 0.74) return false;
  if (ny <= 0.05) {
    return ax <= 0.68;
  }
  const maxW = 0.68 * Math.pow(Math.max(0, 1 - (ny - 0.05) / 0.7), 0.72);
  return ax <= maxW;
}

function isInsideBrain(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const leftLobe = Math.hypot((ax - 0.3) * 1.15, ny * 0.96) < 0.46;
  const lowerLobe = Math.hypot((ax - 0.22) * 1.25, (ny - 0.25) * 1.2) < 0.34;
  const stem = ax < 0.12 && ny >= 0.35 && ny <= 0.68;
  // Central fissure notch
  const fissure = ax < 0.045 && ny < 0.42;
  return (leftLobe || lowerLobe || stem) && !fissure;
}

function isInsideHourglass(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  if (ay > 0.72) return false;
  if (ay >= 0.58) return ax <= 0.66;
  const slopeW = 0.1 + (ay / 0.58) * 0.5;
  return ax <= slopeW;
}

function isInsideMoonStar(nx: number, ny: number): boolean {
  const inOuterMoon = Math.hypot(nx + 0.12, ny) < 0.68;
  const inInnerCut = Math.hypot(nx - 0.16, ny + 0.06) < 0.56;
  const crescent = inOuterMoon && !inInnerCut;

  // Star at top-right
  const sx = nx - 0.36;
  const sy = ny + 0.16;
  const star = Math.abs(sx) + Math.abs(sy) * 0.38 < 0.24 || Math.abs(sy) + Math.abs(sx) * 0.38 < 0.24;
  return crescent || star;
}

function isInsideOwl(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const body = Math.hypot(ax * 1.25, (ny - 0.12) * 0.95) < 0.58;
  const head = Math.hypot(ax * 1.1, (ny + 0.3) * 1.25) < 0.48;
  const ear = ax >= 0.26 && ax <= 0.56 && ny >= -0.74 && ny <= -0.35 && ny >= -0.74 + (0.56 - ax) * 0.9;
  const eyeCut = Math.hypot(ax - 0.2, ny + 0.34) < 0.1;
  return (body || head || ear) && !eyeCut;
}

function isInsideAnchor(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const shaft = ax <= 0.1 && ny >= -0.68 && ny <= 0.58;
  const crossBar = ax <= 0.46 && ny >= -0.42 && ny <= -0.26;
  const ring = Math.hypot(nx, ny + 0.58) < 0.22 && Math.hypot(nx, ny + 0.58) > 0.09;
  const curveDist = Math.hypot(nx, ny - 0.18);
  const arc = curveDist >= 0.42 && curveDist <= 0.62 && ny >= 0.16;
  return shaft || crossBar || ring || arc;
}

function isInsideLightning(nx: number, ny: number): boolean {
  const d1 = distPointToSeg(nx, ny, 0.28, -0.76, -0.28, 0.02) < 0.18;
  const d2 = Math.abs(ny - 0.02) < 0.12 && nx >= -0.28 && nx <= 0.3;
  const d3 = distPointToSeg(nx, ny, 0.26, 0.02, -0.28, 0.76) < 0.18;
  return d1 || d2 || d3;
}

function isInsideCastle(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  if (ny > 0.68 || ny < -0.68) return false;
  const base = ny >= -0.16 && ax <= 0.72;
  const leftTower = ax >= 0.38 && ax <= 0.74 && ny >= -0.58;
  const centerKeep = ax <= 0.26 && ny >= -0.68;
  const gateCut = ax <= 0.16 && ny >= 0.32;
  return (base || leftTower || centerKeep) && !gateCut;
}

function isInsideDragonWing(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const spine = ax <= 0.12 && ny >= -0.68 && ny <= 0.72;
  const wingTop = distPointToSeg(ax, ny, 0.08, -0.2, 0.76, -0.56) < 0.17;
  const wingMid = distPointToSeg(ax, ny, 0.08, 0.02, 0.68, -0.16) < 0.16;
  const wingLow = distPointToSeg(ax, ny, 0.08, 0.22, 0.52, 0.22) < 0.14;
  return spine || wingTop || wingMid || wingLow;
}

function isInsideCompass(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const mainPoints = ax * 2.1 + ay <= 0.82 || ay * 2.1 + ax <= 0.82;
  const diag = (ax + ay <= 0.45) && !(ax + ay < 0.12);
  const ringDist = Math.hypot(nx, ny);
  const ring = ringDist >= 0.56 && ringDist <= 0.7;
  return mainPoints || diag || ring;
}

function isInsideLotus(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  const centerPetal = Math.hypot(ax * 1.9, ny * 0.95) < 0.42;
  const sidePetal1 = Math.hypot((ax - 0.32) * 1.4, (ny - 0.08) * 1.2) < 0.34;
  const sidePetal2 = Math.hypot((ax - 0.48) * 1.2, (ny - 0.34) * 1.6) < 0.28;
  const baseArc = ax <= 0.54 && ny >= 0.46 && ny <= 0.64;
  return centerPetal || sidePetal1 || sidePetal2 || baseArc;
}

function isInsideSunflower(nx: number, ny: number): boolean {
  const cy = ny + 0.14;
  const r = Math.hypot(nx, cy);
  const theta = Math.atan2(cy, nx);
  const petalRadius = 0.56 + 0.24 * Math.cos(8 * theta);
  const inFlowerHead = r <= petalRadius && r >= 0.14;
  const inStem = Math.abs(nx) <= 0.095 && ny >= 0.32 && ny <= 0.84;
  const inLeafLeft = distPointToSeg(nx, ny, -0.05, 0.64, -0.46, 0.46) < 0.125;
  const inLeafRight = distPointToSeg(nx, ny, 0.05, 0.56, 0.46, 0.38) < 0.125;
  return inFlowerHead || inStem || inLeafLeft || inLeafRight;
}

function isInsideRoseBlossom(nx: number, ny: number): boolean {
  const cy = ny + 0.16;
  const r = Math.hypot(nx, cy);
  const theta = Math.atan2(cy, nx);
  // 5-petal rounded blossom with hollow core
  const petalOuter = 0.54 + 0.22 * Math.sin(5 * theta);
  const inPetals = r <= petalOuter && r >= 0.13;
  const inStem = Math.abs(nx) <= 0.09 && ny >= 0.34 && ny <= 0.84;
  const inLeaf = distPointToSeg(nx, ny, 0.02, 0.62, 0.48, 0.44) < 0.14;
  return inPetals || inStem || inLeaf;
}

function isInsideTulip(nx: number, ny: number): boolean {
  const ax = Math.abs(nx);
  // Cupped tulip bloom in upper half
  const cup = ny >= -0.46 && ny <= 0.26 && ax <= 0.52 - Math.max(0, (ny - 0.04) * 0.7);
  const leftTip = ny < -0.35 && ny >= -0.74 && ax >= 0.2 && ax <= 0.52 && ny >= -0.74 + Math.abs(ax - 0.36) * 1.4;
  const centerTip = ny < -0.35 && ny >= -0.78 && ax <= 0.22 && ny >= -0.78 + ax * 1.4;
  const notch = ny < -0.36 && ax >= 0.14 && ax <= 0.24 && ny < -0.42;
  const stem = ax <= 0.09 && ny >= 0.22 && ny <= 0.84;
  const leaves =
    distPointToSeg(ax, ny, 0.06, 0.74, 0.56, 0.34) < 0.12;
  return ((cup || leftTip || centerTip) && !notch) || stem || leaves;
}

function isInsideDaisyStar(nx: number, ny: number): boolean {
  const cy = ny + 0.12;
  const r = Math.hypot(nx, cy);
  const theta = Math.atan2(cy, nx);
  const petalR = 0.52 + 0.28 * Math.cos(6 * theta);
  const head = r <= petalR && r >= 0.14;
  const stem = Math.abs(nx) <= 0.09 && ny >= 0.34 && ny <= 0.84;
  const leafL = distPointToSeg(nx, ny, -0.05, 0.66, -0.5, 0.48) < 0.12;
  const leafR = distPointToSeg(nx, ny, 0.05, 0.66, 0.5, 0.48) < 0.12;
  return head || stem || leafL || leafR;
}

/**
 * Renders crisp 14x16 ASCII glyph bitmaps into [-0.88, 0.88] x [-0.84, 0.84]
 */
function isInsideBitmapGlyph(nx: number, ny: number, rows: string[]): boolean {
  const h = rows.length;
  const w = rows[0].length;
  const gx = Math.floor(((nx + 0.88) / 1.76) * w);
  const gy = Math.floor(((ny + 0.84) / 1.68) * h);
  if (gx < 0 || gx >= w || gy < 0 || gy >= h) return false;
  return rows[gy][gx] === '#';
}

const GLYPH_BANGLA_O = [
  '##############',
  '##############',
  '.........##...',
  '...####..##...',
  '..######.##...',
  '..##..##.##...',
  '..##..##.##...',
  '.....###.##...',
  '.##..##..##...',
  '.##..##..##...',
  '.##...#####...',
  '.###....###...',
  '..####..##....',
  '...#######....',
  '.....####.....',
  '..............',
];

const GLYPH_BANGLA_AA = [
  '##############',
  '##############',
  '......##...##.',
  '..###.##...##.',
  '.#######...##.',
  '.##.#.##...##.',
  '....#.##...##.',
  '.##.#.##...##.',
  '.##.#.##...##.',
  '.##..###...##.',
  '..######...##.',
  '...####....##.',
  '...........##.',
  '...........##.',
  '..............',
  '..............',
];

const GLYPH_BANGLA_KO = [
  '##############',
  '##############',
  '......##......',
  '.....####.....',
  '....##..##....',
  '...##...##....',
  '..##....#####.',
  '.##.....##.##.',
  '.#########.##.',
  '..###...####..',
  '....##..##....',
  '.....####.....',
  '......##......',
  '......##......',
  '..............',
  '..............',
];

const GLYPH_BANGLA_MA = [
  '##############',
  '##############',
  '..##.......##.',
  '..##.......##.',
  '..######...##.',
  '..##..##...##.',
  '..##..##...##.',
  '......##...##.',
  '..######...##.',
  '.###..##...##.',
  '.###..##...##.',
  '..######...##.',
  '......##...##.',
  '......##...##.',
  '..............',
  '..............',
];

const GLYPH_BANGLA_BO = [
  '##############',
  '##############',
  '.........##...',
  '.......####...',
  '.....###.##...',
  '...###...##...',
  '..##.....##...',
  '..##.....##...',
  '...###...##...',
  '.....###.##...',
  '.......####...',
  '.........##...',
  '.........##...',
  '.........##...',
  '..............',
  '..............',
];

const GLYPH_ALPHA_A = [
  '.....####.....',
  '....######....',
  '...###..###...',
  '...##....##...',
  '..###....###..',
  '..##......##..',
  '.###......###.',
  '.############.',
  '.############.',
  '.##........##.',
  '.##........##.',
  '###........###',
  '###........###',
  '###........###',
  '..............',
  '..............',
];

const GLYPH_ALPHA_B = [
  '.##########...',
  '.###########..',
  '.##.......##..',
  '.##.......##..',
  '.##......###..',
  '.##########...',
  '.##########...',
  '.##......###..',
  '.##.......##..',
  '.##.......##..',
  '.##.......##..',
  '.###########..',
  '.##########...',
  '..............',
  '..............',
  '..............',
];

const GLYPH_ALPHA_H = [
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.############.',
  '.############.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '..............',
  '..............',
  '..............',
];

const GLYPH_ALPHA_M = [
  '.##........##.',
  '.###......###.',
  '.####....####.',
  '.#####..#####.',
  '.##.######.##.',
  '.##..####..##.',
  '.##...##...##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '.##........##.',
  '..............',
  '..............',
  '..............',
];

const GLYPH_ALPHA_S = [
  '...########...',
  '..##########..',
  '.###......##..',
  '.##...........',
  '.###..........',
  '..########....',
  '....#######...',
  '.........###..',
  '..........##..',
  '..........##..',
  '.##......###..',
  '..#########...',
  '...#######....',
  '..............',
  '..............',
  '..............',
];

const GLYPH_ALPHA_K = [
  '.##.......##..',
  '.##......###..',
  '.##.....###...',
  '.##....###....',
  '.##...###.....',
  '.#######......',
  '.######.......',
  '.#######......',
  '.##...###.....',
  '.##....###....',
  '.##.....###...',
  '.##......###..',
  '.##.......##..',
  '..............',
  '..............',
  '..............',
];

const GLYPH_ALPHA_G = [
  '...########...',
  '..##########..',
  '.###......##..',
  '.##...........',
  '.##...........',
  '.##...........',
  '.##....#####..',
  '.##....#####..',
  '.##.......##..',
  '.###......##..',
  '..##########..',
  '...########...',
  '..............',
  '..............',
  '..............',
  '..............',
];

export const ART_THEMES: ArtThemeDef[] = [
  { id: 'lotus', name: 'Lotus Bloom', shades: ['#831843', '#be185d', '#db2777'], shapeFn: isInsideLotus },
  { id: 'bangla_o', name: 'বাংলা অ', shades: ['#14532d', '#15803d', '#16a34a'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_BANGLA_O) },
  { id: 'alpha_a', name: 'Letter A', shades: ['#1e3a8a', '#1d4ed8', '#2563eb'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_ALPHA_A) },
  { id: 'sunflower', name: 'Sunflower', shades: ['#78350f', '#b45309', '#d97706'], shapeFn: isInsideSunflower },
  { id: 'bangla_ma', name: 'বাংলা মা', shades: ['#881337', '#be123c', '#e11d48'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_BANGLA_MA) },
  { id: 'alpha_h', name: 'Letter H', shades: ['#312e81', '#4338ca', '#4f46e5'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_ALPHA_H) },
  { id: 'rose', name: 'Rose Flower', shades: ['#7f1d1d', '#b91c1c', '#dc2626'], shapeFn: isInsideRoseBlossom },
  { id: 'bangla_ko', name: 'বাংলা ক', shades: ['#134e4a', '#0f766e', '#0d9488'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_BANGLA_KO) },
  { id: 'alpha_b', name: 'Letter B', shades: ['#581c87', '#7e22ce', '#9333ea'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_ALPHA_B) },
  { id: 'whale', name: 'Blue Whale', shades: ['#1e3a8a', '#0284c7', '#0ea5e9'], shapeFn: isInsideWhale },
  { id: 'tulip', name: 'Tulip Bloom', shades: ['#831843', '#db2777', '#ec4899'], shapeFn: isInsideTulip },
  { id: 'bangla_aa', name: 'বাংলা আ', shades: ['#14532d', '#047857', '#059669'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_BANGLA_AA) },
  { id: 'alpha_m', name: 'Letter M', shades: ['#7c2d12', '#c2410c', '#ea580c'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_ALPHA_M) },
  { id: 'crown', name: 'Royal Crown', shades: ['#78350f', '#b45309', '#d97706'], shapeFn: isInsideCrown },
  { id: 'daisy', name: 'Daisy Star', shades: ['#4c1d95', '#6d28d9', '#7c3aed'], shapeFn: isInsideDaisyStar },
  { id: 'bangla_bo', name: 'বাংলা ব', shades: ['#0c4a6e', '#0369a1', '#0284c7'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_BANGLA_BO) },
  { id: 'alpha_s', name: 'Letter S', shades: ['#3730a3', '#4f46e5', '#6366f1'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_ALPHA_S) },
  { id: 'heart', name: 'Twin Heart', shades: ['#881337', '#be123c', '#e11d48'], shapeFn: isInsideHeart },
  { id: 'alpha_k', name: 'Letter K', shades: ['#1e293b', '#334155', '#475569'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_ALPHA_K) },
  { id: 'butterfly', name: 'Monarch', shades: ['#581c87', '#7e22ce', '#9333ea'], shapeFn: isInsideButterfly },
  { id: 'alpha_g', name: 'Letter G', shades: ['#064e3b', '#047857', '#059669'], shapeFn: (nx, ny) => isInsideBitmapGlyph(nx, ny, GLYPH_ALPHA_G) },
  { id: 'brain', name: 'Brain Core', shades: ['#312e81', '#4338ca', '#6366f1'], shapeFn: isInsideBrain },
  { id: 'moon', name: 'Crescent', shades: ['#1e3a8a', '#1d4ed8', '#3b82f6'], shapeFn: isInsideMoonStar },
  { id: 'diamond', name: 'Prism Gem', shades: ['#134e4a', '#0f766e', '#0d9488'], shapeFn: isInsideDiamond },
  { id: 'rocket', name: 'Starship', shades: ['#1e293b', '#334155', '#0284c7'], shapeFn: isInsideRocket },
  { id: 'shield', name: 'Knight Crest', shades: ['#7c2d12', '#c2410c', '#ea580c'], shapeFn: isInsideShield },
  { id: 'hourglass', name: 'Time Glass', shades: ['#4c1d95', '#6d28d9', '#7c3aed'], shapeFn: isInsideHourglass },
  { id: 'owl', name: 'Night Owl', shades: ['#3f3f46', '#52525b', '#71717a'], shapeFn: isInsideOwl },
  { id: 'anchor', name: 'Sea Anchor', shades: ['#0c4a6e', '#0369a1', '#0284c7'], shapeFn: isInsideAnchor },
  { id: 'bolt', name: 'Volt Strike', shades: ['#713f12', '#a16207', '#ca8a04'], shapeFn: isInsideLightning },
  { id: 'castle', name: 'Citadel', shades: ['#3730a3', '#4f46e5', '#6366f1'], shapeFn: isInsideCastle },
  { id: 'dragon', name: 'Phoenix', shades: ['#7f1d1d', '#b91c1c', '#dc2626'], shapeFn: isInsideDragonWing },
  { id: 'compass', name: 'North Star', shades: ['#064e3b', '#047857', '#059669'], shapeFn: isInsideCompass },
];

/**
 * Generates an ornate stepped outer border + inner silhouette mask on a W x H grid.
 * Prunes any single isolated cell with 0 orthogonal neighbors so 100% of dots can form >=2-dot arrows.
 */
export function buildArtPuzzleMask(
  levelId: number,
  width: number,
  height: number
): ArtMaskResult {
  // Cycle cleanly across Flowers, Bengali script, English Alphabet, and Classic Art every 5th level!
  const artIndex = Math.floor((levelId - 1) / 5) % ART_THEMES.length;
  const theme = ART_THEMES[artIndex];

  const mask = new Uint8Array(width * height);
  const frameMask = new Uint8Array(width * height);
  const idx = (x: number, y: number) => y * width + x;

  const hasFrame = width >= 18 && height >= 24;
  const frameThickness = width >= 30 ? 3 : 2;
  const innerPad = hasFrame ? frameThickness + 2 : 0;

  // Inner bounding box for the silhouette
  const ix0 = innerPad;
  const ix1 = width - 1 - innerPad;
  const iy0 = innerPad;
  const iy1 = height - 1 - innerPad;
  const iw = Math.max(1, ix1 - ix0);
  const ih = Math.max(1, iy1 - iy0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check ornate symmetrical outer border frame (with decorative corner notches like screenshot)
      if (hasFrame) {
        const edgeDist = Math.min(x, width - 1 - x, y, height - 1 - y);
        const cx = Math.abs(x - (width - 1) / 2);
        const cy = Math.abs(y - (height - 1) / 2);
        const isCornerCut =
          (x < 2 || x > width - 3) && (y < 2 || y > height - 3);
        const isMidNotch =
          (cx < 1.2 && (y === 0 || y === height - 1)) ||
          (cy < 1.2 && (x === 0 || x === width - 1));

        // Stepped decorative wave along vertical sides
        const stepWave = Math.floor(Math.sin((y / height) * Math.PI * 4) * 1.2);
        const sideBand =
          (x >= Math.max(0, stepWave) && x < Math.max(0, stepWave) + frameThickness) ||
          (x <= width - 1 - Math.max(0, stepWave) &&
            x > width - 1 - Math.max(0, stepWave) - frameThickness);
        const topBottomBand = edgeDist < frameThickness && (cx > 2 || cy > 2);

        if (!isCornerCut && !isMidNotch && (sideBand || topBottomBand)) {
          mask[idx(x, y)] = 1;
          frameMask[idx(x, y)] = 1;
          continue;
        }
      }

      // Check inner silhouette
      if (x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1) {
        const nx = ((x - ix0) / iw) * 2 - 1;
        const ny = ((y - iy0) / ih) * 2 - 1;
        if (theme.shapeFn(nx, ny)) {
          mask[idx(x, y)] = 1;
        }
      }
    }
  }

  // Prune isolated single-dot pixels that have 0 orthogonal neighbors inside mask
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
          frameMask[k] = 0;
          changed = true;
        }
      }
    }
  }

  return {
    mask,
    frameMask,
    themeName: theme.name,
    tonalPalette: theme.shades,
  };
}
