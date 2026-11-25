import {
  AmazeGoLevel,
  ArrowPath,
  DifficultyTier,
  Direction,
  GridCoord,
  assignSpecialArrows,
  getDirectionOffset,
  getMaxHeartsForLevel,
  isLevelSolvable,
} from './amazeGoLogic';

/**
 * Curated high-contrast single-color ink palette cycled across all 500 levels
 * so consecutive levels always look distinctly colored on the warm cream board.
 */
export const LEVEL_MONOCHROME_COLORS = [
  '#18181b', // 1: Pure Ink Black
  '#1d4ed8', // 2: Deep Cobalt Blue
  '#be123c', // 3: Crimson Rose
  '#047857', // 4: Forest Emerald
  '#6d28d9', // 5: Royal Violet
  '#0f766e', // 6: Deep Ocean Teal
  '#9a3412', // 7: Burnt Sienna
  '#3730a3', // 8: Midnight Indigo
  '#86198f', // 9: Deep Plum
  '#0369a1', // 10: Sapphire Azure
  '#991b1b', // 11: Oxblood Ruby
  '#15803d', // 12: Pine Green
  '#7e22ce', // 13: Imperial Purple
  '#1e3a8a', // 14: Classic Navy
  '#b45309', // 15: Warm Ochre Bronze
  '#0e7490', // 16: Slate Cyan
  '#9d174d', // 17: Berry Magenta
  '#365314', // 18: Deep Olive Moss
  '#4338ca', // 19: Electric Indigo
  '#7c2d12', // 20: Dark Mahogany
  '#166534', // 21: Deep Spruce
  '#701a75', // 22: Aubergine Wine
  '#334155', // 23: Steel Slate
  '#a21caf', // 24: Rich Fuchsia Ink
];

export const PURE_BLACK_COLOR = '#18181b';

const DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

function createRng(seed: number) {
  let s = (Math.abs(Math.floor(seed)) || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface GenerateOptions {
  id: number;
  name: string;
  width: number;
  height: number;
  difficulty: DifficultyTier;
  arrowColor: string;
  maxHearts?: number;
  seed: number;
  /** Target density of playable cells (0.88 to 0.98) */
  targetDensity?: number;
  /** Optional 0.0 (gentle) to 1.0 (extreme interlocking single-key bottleneck chains) */
  hardBias?: number;
  /** Maximum dots per arrow (scales from 4-5 on Level 1 up to 8-13 on hard/boss levels) */
  maxArrowLen?: number;
  /** Target number of initially escapable arrows (high on early easy levels, strictly 1 on hard/boss) */
  targetOpenCap?: number;
  /** Maximum open branches allowed before forcing locks */
  flexCeiling?: number;
  /** Target single-arrow choke-point waves */
  targetBottlenecks?: number;
  /** Favors higher density of smaller/medium arrows while keeping mixed giant coils (for 10th hard levels) */
  compactCountBias?: boolean;
  /** Optional 0/1 mask for shaped silhouette puzzles */
  activeMask?: Uint8Array;
  /** Optional 0/1 mask identifying outer frame dots for tonal shading */
  frameMask?: Uint8Array;
  /** Optional tonal shades [frame, mid, inner] for art levels > 100 */
  tonalPalette?: [string, string, string];
  /** Optional 0/1/2/3 anatomical color-zone mask for animated showcase creatures */
  colorMask?: Uint8Array;
  showcasePalette?: [string, string, string];
  showcaseIntroPalette?: [string, string, string];
  isArtLevel?: boolean;
  artThemeName?: string;
  isAnimatedShowcase?: boolean;
  showcaseThemeId?: string;
  showcaseCategory?: 'water' | 'roar' | 'wing' | 'mystic';
  showcaseAnimStyle?: string;
}

function resolveShowcaseColor(
  cells: GridCoord[],
  width: number,
  colorMask: Uint8Array,
  palette: [string, string, string],
  fallback: string
): string {
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  for (let i = 0; i < cells.length; i++) {
    const zone = colorMask[cells[i].y * width + cells[i].x];
    if (zone === 1) c1++;
    else if (zone === 2) c2++;
    else if (zone === 3) c3++;
  }
  if (c3 >= c1 && c3 >= c2 && c3 > 0) return palette[2];
  if (c2 >= c1 && c2 > 0) return palette[1];
  if (c1 > 0) return palette[0];
  return fallback;
}

export interface DifficultyMetrics {
  initialFree: number;
  singleBottlenecks: number;
  waves: number;
  multiLockedRatio: number;
  avgJumpDist: number;
  maxWaveBurst: number;
}

export function evaluatePuzzleDifficulty(level: AmazeGoLevel): DifficultyMetrics {
  const n = level.arrows.length;
  if (n === 0) {
    return {
      initialFree: 0,
      singleBottlenecks: 0,
      waves: 0,
      multiLockedRatio: 0,
      avgJumpDist: 0,
      maxWaveBurst: 0,
    };
  }

  const w = level.width;
  const h = level.height;
  const occ = new Int32Array(w * h);
  occ.fill(-1);
  for (let i = 0; i < n; i++) {
    const p = level.arrows[i].path;
    for (let j = 0; j < p.length; j++) {
      occ[p[j].y * w + p[j].x] = i;
    }
  }

  // Count how many arrows are blocked by >= 2 distinct other arrows
  let multiLocked = 0;
  const seenStamp = new Int32Array(n);
  let stamp = 1;
  for (let i = 0; i < n; i++) {
    const a = level.arrows[i];
    const { dx, dy } = getDirectionOffset(a.direction);
    let rx = a.head.x + dx;
    let ry = a.head.y + dy;
    let distinct = 0;
    stamp++;
    while (rx >= 0 && rx < w && ry >= 0 && ry < h) {
      const owner = occ[ry * w + rx];
      if (owner !== -1 && seenStamp[owner] !== stamp) {
        seenStamp[owner] = stamp;
        distinct++;
        if (distinct >= 2) break;
      }
      rx += dx;
      ry += dy;
    }
    if (distinct >= 2) multiLocked++;
  }

  const alive = new Uint8Array(n);
  alive.fill(1);
  let remaining = n;
  let waves = 0;
  let singleBottlenecks = 0;
  let initialFree = 0;
  let maxWaveBurst = 0;
  let jumpDistSum = 0;
  let jumpSamples = 0;
  let prevWaveHeads: GridCoord[] = [];

  while (remaining > 0) {
    const waveIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      const a = level.arrows[i];
      const { dx, dy } = getDirectionOffset(a.direction);
      let rx = a.head.x + dx;
      let ry = a.head.y + dy;
      let clear = true;
      while (rx >= 0 && rx < w && ry >= 0 && ry < h) {
        if (occ[ry * w + rx] !== -1) {
          clear = false;
          break;
        }
        rx += dx;
        ry += dy;
      }
      if (clear) waveIndices.push(i);
    }

    if (waveIndices.length === 0) break;
    if (waves === 0) initialFree = waveIndices.length;
    if (waveIndices.length === 1) singleBottlenecks++;
    if (waveIndices.length > maxWaveBurst) maxWaveBurst = waveIndices.length;

    if (prevWaveHeads.length > 0) {
      for (let k = 0; k < waveIndices.length; k++) {
        const hd = level.arrows[waveIndices[k]].head;
        let minDist = Infinity;
        for (let p = 0; p < prevWaveHeads.length; p++) {
          const d = Math.hypot(hd.x - prevWaveHeads[p].x, hd.y - prevWaveHeads[p].y);
          if (d < minDist) minDist = d;
        }
        jumpDistSum += minDist;
        jumpSamples++;
      }
    }

    prevWaveHeads = waveIndices.map((idxA) => level.arrows[idxA].head);
    waves++;

    for (let k = 0; k < waveIndices.length; k++) {
      const i = waveIndices[k];
      alive[i] = 0;
      remaining--;
      const p = level.arrows[i].path;
      for (let j = 0; j < p.length; j++) {
        occ[p[j].y * w + p[j].x] = -1;
      }
    }
  }

  return {
    initialFree,
    singleBottlenecks,
    waves,
    multiLockedRatio: multiLocked / n,
    avgJumpDist: jumpSamples > 0 ? jumpDistSum / jumpSamples : 0,
    maxWaveBurst,
  };
}

function generateSingleSeedPuzzle(opts: GenerateOptions): AmazeGoLevel {
  const {
    id,
    name,
    width,
    height,
    difficulty,
    arrowColor,
    maxHearts = getMaxHeartsForLevel(id),
    seed,
    hardBias = 0.75,
    maxArrowLen,
    targetOpenCap: optTargetOpenCap,
    flexCeiling: optFlexCeiling,
    compactCountBias = false,
    activeMask,
    frameMask,
    tonalPalette,
    colorMask,
    showcasePalette,
    showcaseIntroPalette,
    isArtLevel = false,
    artThemeName,
    isAnimatedShowcase = false,
    showcaseThemeId,
    showcaseCategory,
    showcaseAnimStyle,
  } = opts;

  const rnd = createRng(seed);
  const rndInt = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
  const spinDir = rnd() < 0.5 ? 1 : -1;

  const totalGrid = width * height;
  const occupied = new Uint8Array(totalGrid);
  const rayMark = new Int32Array(totalGrid);
  const selfMark = new Int32Array(totalGrid);
  let stampCounter = 1;

  const idx = (x: number, y: number) => y * width + x;
  const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
  const isPlayable = (x: number, y: number) => {
    const k = idx(x, y);
    if (occupied[k] !== 0) return false;
    if (activeMask && activeMask[k] === 0) return false;
    return true;
  };

  interface PlacedEntry {
    arrow: ArrowPath;
    rayCells: number[];
    blocked: boolean;
  }

  const placed: PlacedEntry[] = [];
  const rayListeners: number[][] = Array.from({ length: totalGrid }, () => []);
  const openIndices: number[] = [];

  const countUnblockedOnCell = (k: number): number => {
    const list = rayListeners[k];
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      if (!placed[list[i]].blocked) count++;
    }
    return count;
  };

  const countUnblockedTotal = (): number => {
    let count = 0;
    for (let i = 0; i < openIndices.length; i++) {
      if (!placed[openIndices[i]].blocked) count++;
    }
    return count;
  };

  const freeDegree = (x: number, y: number, rStamp: number, sStamp: number) => {
    let count = 0;
    for (let i = 0; i < 4; i++) {
      const { dx, dy } = getDirectionOffset(DIRECTIONS[i]);
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const nk = idx(nx, ny);
      if (
        occupied[nk] === 0 &&
        (!activeMask || activeMask[nk] === 1) &&
        rayMark[nk] !== rStamp &&
        selfMark[nk] !== sStamp
      ) {
        count++;
      }
    }
    return count;
  };

  const checkClearRay = (
    hx: number,
    hy: number,
    dir: Direction
  ): { totalLen: number; playableRayLen: number; rayCells: number[] } | null => {
    const { dx, dy } = getDirectionOffset(dir);
    let rx = hx + dx;
    let ry = hy + dy;
    let totalLen = 0;
    let playableRayLen = 0;
    const rayCells: number[] = [];
    while (inBounds(rx, ry)) {
      const k = idx(rx, ry);
      if (occupied[k] !== 0) return null;
      totalLen++;
      rayCells.push(k);
      if (!activeMask || activeMask[k] === 1) {
        playableRayLen++;
      }
      rx += dx;
      ry += dy;
    }
    return { totalLen, playableRayLen, rayCells };
  };

  const markRay = (hx: number, hy: number, dir: Direction, rStamp: number) => {
    const { dx, dy } = getDirectionOffset(dir);
    let rx = hx + dx;
    let ry = hy + dy;
    while (inBounds(rx, ry)) {
      rayMark[idx(rx, ry)] = rStamp;
      rx += dx;
      ry += dy;
    }
  };

  const defaultCap = width >= 38 ? 22 : width >= 22 ? 15 : width >= 16 ? 12 : 10;
  const maxCap = Math.max(3, Math.min(26, maxArrowLen ?? defaultCap));

  const pickMixedLength = (): number => {
    const r = rnd();
    if (maxCap <= 5) {
      if (r < 0.35) return 2;
      if (r < 0.78) return Math.min(3, maxCap);
      return rndInt(Math.min(4, maxCap), maxCap);
    }
    if (compactCountBias) {
      // Dense 10th-level & Boss mix: packed 2-7 interlocking knots + occasional 12..maxCap coils
      if (r < 0.42) return rndInt(2, 4);
      if (r < 0.78) return rndInt(5, Math.min(7, maxCap));
      if (r < 0.92) return rndInt(8, Math.min(11, maxCap));
      return rndInt(Math.min(13, maxCap), maxCap);
    }
    if (maxCap >= 16) {
      // Wide mixture: tiny 2-4 locks + short/medium 5-8 hooks + medium-long 9-12 coils + giant 13..maxCap snakes
      if (r < 0.36) return rndInt(2, 4);
      if (r < 0.7) return rndInt(5, 8);
      if (r < 0.88) return rndInt(9, Math.min(12, maxCap));
      return rndInt(Math.min(13, maxCap), maxCap);
    }
    if (r < 0.18) return rndInt(2, 3); // Tiny lock
    if (r < 0.52) return rndInt(4, Math.min(7, maxCap)); // Short hook
    if (r < 0.82) return rndInt(Math.min(8, maxCap), Math.min(11, maxCap)); // Medium zig-zag
    return rndInt(Math.min(12, maxCap), maxCap); // Long winding coil
  };

  const isBeginnerOpen = hardBias < 0.25 && (optTargetOpenCap ?? 0) >= 4;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxRad = Math.max(1, Math.hypot(cx, cy));
  const allCoords: { x: number; y: number; sortKey: number }[] = [];
  let playableCellsCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = idx(x, y);
      if (activeMask && activeMask[k] === 0) continue;
      playableCellsCount++;
      const normDist = Math.hypot(x - cx, y - cy) / maxRad;
      const radialBias = isBeginnerOpen ? 1 - normDist : normDist;
      const sortKey = radialBias + (rnd() - 0.5) * 0.22;
      allCoords.push({ x, y, sortKey });
    }
  }
  allCoords.sort((a, b) => a.sortKey - b.sortKey);

  let filledCount = 0;

  const tryPlaceArrowAt = (
    hx: number,
    hy: number,
    minLen: number,
    maxLen: number,
    minPlayableRay: number,
    requireBlocksOpen: boolean,
    minDistinctRaysToLock: number = 1
  ): boolean => {
    if (!isPlayable(hx, hy)) return false;

    const headKey = idx(hx, hy);
    const headLockCount = countUnblockedOnCell(headKey);
    const relX = hx - cx;
    const relY = hy - cy;
    const relMag = Math.max(1, Math.hypot(relX, relY));
    const tanX = (-relY * spinDir) / relMag;
    const tanY = (relX * spinDir) / relMag;

    const dirCandidates: {
      dir: Direction;
      playableRayLen: number;
      rayCells: number[];
      firstBody: GridCoord;
      bodyLockCount: number;
      score: number;
    }[] = [];

    for (let i = 0; i < 4; i++) {
      const dir = DIRECTIONS[i];
      const { dx, dy } = getDirectionOffset(dir);
      const bx = hx - dx;
      const by = hy - dy;
      if (!inBounds(bx, by) || !isPlayable(bx, by)) continue;
      const ray = checkClearRay(hx, hy, dir);
      if (!ray || ray.playableRayLen < minPlayableRay) continue;

      const bodyLockCount = countUnblockedOnCell(idx(bx, by));
      const tangentDot = dx * tanX + dy * tanY;
      const shortRayPenalty =
        ray.playableRayLen < (width >= 20 ? 6 : 5) && minPlayableRay > 0
          ? width >= 20
            ? -150
            : -75
          : 0;
      const openPhaseLockWeight =
        preferOpenStart && countUnblockedTotal() < targetOpenCap ? -85 : 95;

      const score =
        (headLockCount + bodyLockCount) * openPhaseLockWeight +
        tangentDot * 16 +
        shortRayPenalty +
        Math.min(ray.playableRayLen, 24) * 2.4 +
        (rnd() - 0.5) * 6;

      dirCandidates.push({
        dir,
        playableRayLen: ray.playableRayLen,
        rayCells: ray.rayCells,
        firstBody: { x: bx, y: by },
        bodyLockCount,
        score,
      });
    }

    if (dirCandidates.length === 0) return false;
    dirCandidates.sort((a, b) => b.score - a.score);

    const maxDirsToTry =
      requireBlocksOpen || minDistinctRaysToLock > 1
        ? dirCandidates.length
        : Math.min(2, dirCandidates.length);
    for (let dIdx = 0; dIdx < maxDirsToTry; dIdx++) {
      const chosen = dirCandidates[dIdx];
      const { dir: chosenDir, firstBody, rayCells } = chosen;

      const rStamp = ++stampCounter;
      const sStamp = ++stampCounter;
      markRay(hx, hy, chosenDir, rStamp);

      const targetLen = rndInt(minLen, Math.max(minLen, maxLen));
      const backwards: GridCoord[] = [{ x: hx, y: hy }, firstBody];
      selfMark[headKey] = sStamp;
      selfMark[idx(firstBody.x, firstBody.y)] = sStamp;

      let totalRaysLocked = headLockCount + chosen.bodyLockCount;
      let cur = firstBody;
      let prevDx = firstBody.x - hx;
      let prevDy = firstBody.y - hy;
      let straightRun = 1;
      const pickSegTarget = () =>
        targetLen <= 4
          ? 1
          : rnd() < (activeMask ? 0.62 : 0.5)
          ? 1
          : rnd() < (activeMask ? 0.92 : 0.86)
          ? 2
          : 3;
      let segTarget = pickSegTarget();
      const arrowDirOffset = placed.length % 4;

      for (let step = 2; step < targetLen; step++) {
        const neighbors: {
          x: number;
          y: number;
          dx: number;
          dy: number;
          deg: number;
          isTurn: boolean;
          rayHits: number;
          score: number;
        }[] = [];

        for (let i = 0; i < 4; i++) {
          const { dx, dy } = getDirectionOffset(DIRECTIONS[(i + arrowDirOffset) % 4]);
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (!inBounds(nx, ny)) continue;
          const nk = idx(nx, ny);
          if (!isPlayable(nx, ny) || selfMark[nk] === sStamp || rayMark[nk] === rStamp) continue;

          const deg = freeDegree(nx, ny, rStamp, sStamp);
          const isTurn = dx !== prevDx || dy !== prevDy;

          // Avoid pinching off isolated 1-dot holes next to this step
          let isolatedNeighbors = 0;
          for (let j = 0; j < 4; j++) {
            const d2 = getDirectionOffset(DIRECTIONS[j]);
            const ax = nx + d2.dx;
            const ay = ny + d2.dy;
            if (!inBounds(ax, ay)) continue;
            const ak = idx(ax, ay);
            if (occupied[ak] === 0 && (!activeMask || activeMask[ak] === 1) && selfMark[ak] !== sStamp) {
              let aFree = 0;
              for (let m = 0; m < 4; m++) {
                const d3 = getDirectionOffset(DIRECTIONS[m]);
                const bx = ax + d3.dx;
                const by = ay + d3.dy;
                if (!inBounds(bx, by) || (bx === nx && by === ny)) continue;
                const bk = idx(bx, by);
                if (occupied[bk] === 0 && (!activeMask || activeMask[bk] === 1) && selfMark[bk] !== sStamp) {
                  aFree++;
                }
              }
              if (aFree === 0) isolatedNeighbors++;
            }
          }

          const rayHits = countUnblockedOnCell(nk);
          const lockDirectionMult =
            preferOpenStart && countUnblockedTotal() < targetOpenCap ? -0.4 : 1;
          const rayLockBonus =
            rayHits *
            (minDistinctRaysToLock > 1 ? 220 : requireBlocksOpen ? 140 : 85) *
            hardBias *
            lockDirectionMult;
          const deadEndPenalty =
            deg === 0 && step < targetLen - 1 ? (step < minLen - 1 ? 450 : 38) : deg * (1.1 - hardBias * 0.3);
          const pocketPenalty = isolatedNeighbors * 15;
          const pastRun = straightRun >= segTarget;
          const straightPenalty = !isTurn
            ? (pastRun ? 5.5 + (straightRun - segTarget) * 2.2 : 0.15) * hardBias
            : 0;
          const turnBonus = isTurn
            ? -(pastRun ? 2.4 + rnd() * 2.0 : 0.2 + rnd() * 0.4) * hardBias
            : 0;
          const coilBonus = isTurn && pastRun && deg <= 2 ? -0.8 * hardBias : 0;
          const jitter = rnd() * 1.4;

          neighbors.push({
            x: nx,
            y: ny,
            dx,
            dy,
            deg,
            isTurn,
            rayHits,
            score:
              deadEndPenalty +
              pocketPenalty +
              straightPenalty +
              turnBonus +
              coilBonus -
              rayLockBonus +
              jitter,
          });
        }

        if (neighbors.length === 0) break;
        neighbors.sort((a, b) => a.score - b.score);

        const pick = neighbors[0];
        backwards.push({ x: pick.x, y: pick.y });
        selfMark[idx(pick.x, pick.y)] = sStamp;
        totalRaysLocked += pick.rayHits;
        if (pick.isTurn) {
          straightRun = 0;
          segTarget = pickSegTarget();
        } else {
          straightRun++;
        }
        prevDx = pick.dx;
        prevDy = pick.dy;
        cur = { x: pick.x, y: pick.y };
      }

      if (backwards.length < minLen) continue;
      if (requireBlocksOpen && totalRaysLocked === 0) continue;

      // Verify distinct unblocked arrows hit if minDistinctRaysToLock > 1
      if (minDistinctRaysToLock > 1) {
        const hitArrows = new Set<number>();
        for (let i = 0; i < backwards.length; i++) {
          const listeners = rayListeners[idx(backwards[i].x, backwards[i].y)];
          for (let m = 0; m < listeners.length; m++) {
            const li = listeners[m];
            if (!placed[li].blocked) hitArrows.add(li);
          }
        }
        if (hitArrows.size < minDistinctRaysToLock) continue;
      }

      const arrowIndex = placed.length;
      for (let i = 0; i < backwards.length; i++) {
        const ck = idx(backwards[i].x, backwards[i].y);
        occupied[ck] = 1;
        const listeners = rayListeners[ck];
        for (let m = 0; m < listeners.length; m++) {
          placed[listeners[m]].blocked = true;
        }
      }
      filledCount += backwards.length;

      const path = backwards.reverse();
      let resolvedColor = arrowColor;
      if (colorMask && showcasePalette) {
        resolvedColor = resolveShowcaseColor(
          path,
          width,
          colorMask,
          showcasePalette,
          arrowColor
        );
      } else if (tonalPalette && id > 100) {
        if (frameMask && frameMask[headKey] === 1) {
          resolvedColor = tonalPalette[0];
        } else {
          resolvedColor = arrowIndex % 3 === 0 ? tonalPalette[2] : tonalPalette[1];
        }
      }

      const entry: PlacedEntry = {
        arrow: {
          id: `${id}_${arrowIndex + 1}`,
          path,
          head: { x: hx, y: hy },
          direction: chosenDir,
          color: resolvedColor,
        },
        rayCells,
        blocked: false,
      };

      placed.push(entry);
      for (let i = 0; i < rayCells.length; i++) {
        rayListeners[rayCells[i]].push(arrowIndex);
      }
      openIndices.push(arrowIndex);
      return true;
    }

    return false;
  };

  // Collect candidate empty cells on or adjacent to currently open arrows' rays (avoids O(N) board scans!)
  const collectOpenRayCandidates = (radius: number): number[] => {
    const seenMark = ++stampCounter;
    const result: number[] = [];
    for (let oi = 0; oi < openIndices.length; oi++) {
      const target = placed[openIndices[oi]];
      if (target.blocked) continue;
      for (let r = 0; r < target.rayCells.length; r++) {
        const rk = target.rayCells[r];
        const rx = rk % width;
        const ry = (rk - rx) / width;
        if (isPlayable(rx, ry) && selfMark[rk] !== seenMark) {
          selfMark[rk] = seenMark;
          result.push(rk);
        }
        if (radius > 0) {
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (Math.abs(dx) + Math.abs(dy) > radius) continue;
              const ax = rx + dx;
              const ay = ry + dy;
              if (!inBounds(ax, ay)) continue;
              const ak = idx(ax, ay);
              if (isPlayable(ax, ay) && selfMark[ak] !== seenMark) {
                selfMark[ak] = seenMark;
                result.push(ak);
              }
            }
          }
        }
      }
    }
    return result;
  };

  // Open-arrow funnel cap: generous on beginner levels, strictly 1 on hard & Boss levels
  const targetOpenCap =
    optTargetOpenCap ?? (id <= 4 ? 5 : id <= 10 ? 3 : id <= 25 ? 2 : 1);
  const preferOpenStart = hardBias < 0.25 && targetOpenCap >= 4;

  // Cross-quadrant BFS bridge: connects two separate open rays across the board with one winding arrow
  const placeCrossRayBridge = (maxBridgeLen: number): boolean => {
    const activeOpenSet = new Set<number>();
    for (let i = 0; i < openIndices.length; i++) {
      if (!placed[openIndices[i]].blocked) activeOpenSet.add(openIndices[i]);
    }
    if (activeOpenSet.size < 2) return false;

    const getUnblockedArrowsAt = (cellK: number): number[] => {
      const res: number[] = [];
      const list = rayListeners[cellK];
      for (let i = 0; i < list.length; i++) {
        if (!placed[list[i]].blocked) res.push(list[i]);
      }
      return res;
    };

    // Sample empty head candidates spread across different open arrows' rays
    const headCands: { k: number; arrowOwner: number }[] = [];
    for (const oi of activeOpenSet) {
      const rc = placed[oi].rayCells;
      if (rc.length === 0) continue;
      const step = Math.max(1, Math.floor(rc.length / 8));
      for (let r = 0; r < rc.length; r += step) {
        const rk = rc[r];
        const rx = rk % width;
        const ry = (rk - rx) / width;
        if (isPlayable(rx, ry)) {
          headCands.push({ k: rk, arrowOwner: oi });
        }
      }
    }
    if (headCands.length === 0) return false;

    // Shuffle sampled candidates so bridges span arbitrary distant quadrants
    for (let i = headCands.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = headCands[i];
      headCands[i] = headCands[j];
      headCands[j] = tmp;
    }

    const parent = new Int32Array(totalGrid);
    const maxTries = Math.min(headCands.length, 32);

    for (let ci = 0; ci < maxTries; ci++) {
      const { k: headKey, arrowOwner } = headCands[ci];
      const hx = headKey % width;
      const hy = (headKey - hx) / width;
      if (!isPlayable(hx, hy)) continue;

      for (let d = 0; d < 4; d++) {
        const dir = DIRECTIONS[(d + ci) % 4];
        const { dx, dy } = getDirectionOffset(dir);
        const bx = hx - dx;
        const by = hy - dy;
        if (!inBounds(bx, by) || !isPlayable(bx, by)) continue;
        const ray = checkClearRay(hx, hy, dir);
        if (!ray || ray.playableRayLen < (totalGrid >= 1000 ? 2 : 1)) continue;

        const rStamp = ++stampCounter;
        const vStamp = ++stampCounter;
        markRay(hx, hy, dir, rStamp);

        const initialHits = new Set<number>([arrowOwner]);
        for (const aIdx of getUnblockedArrowsAt(headKey)) initialHits.add(aIdx);
        const bKey = idx(bx, by);
        for (const aIdx of getUnblockedArrowsAt(bKey)) initialHits.add(aIdx);

        // If 2 dots alone already bridge >= 2 distinct open arrows, place right away!
        let foundCell = initialHits.size >= 2 ? bKey : -1;

        if (foundCell === -1) {
          selfMark[headKey] = vStamp;
          selfMark[bKey] = vStamp;
          parent[bKey] = -1;
          const queue: number[] = [bKey];
          const depth: number[] = [2];
          let qHead = 0;

          while (qHead < queue.length && qHead < 3200) {
            const curK = queue[qHead];
            const curD = depth[qHead];
            qHead++;
            if (curD >= maxBridgeLen) continue;

            const cxCell = curK % width;
            const cyCell = (curK - cxCell) / width;

            for (let nd = 0; nd < 4; nd++) {
              const off = getDirectionOffset(DIRECTIONS[(nd + qHead) % 4]);
              const nx = cxCell + off.dx;
              const ny = cyCell + off.dy;
              if (!inBounds(nx, ny)) continue;
              const nk = idx(nx, ny);
              if (
                !isPlayable(nx, ny) ||
                selfMark[nk] === vStamp ||
                rayMark[nk] === rStamp
              ) {
                continue;
              }
              selfMark[nk] = vStamp;
              parent[nk] = curK;
              const hits = getUnblockedArrowsAt(nk);
              let hitsOther = false;
              for (let hi = 0; hi < hits.length; hi++) {
                if (!initialHits.has(hits[hi])) {
                  hitsOther = true;
                  break;
                }
              }
              if (hitsOther) {
                foundCell = nk;
                break;
              }
              queue.push(nk);
              depth.push(curD + 1);
            }
            if (foundCell !== -1) break;
          }
        }

        if (foundCell === -1) continue;

        // Reconstruct path from head -> foundCell
        const tailToBody: GridCoord[] = [];
        let trace = foundCell;
        while (trace !== -1) {
          const tx = trace % width;
          const ty = (trace - tx) / width;
          tailToBody.push({ x: tx, y: ty });
          trace = trace === bKey ? -1 : parent[trace];
        }
        tailToBody.push({ x: hx, y: hy });
        const path = tailToBody; // Already in tail -> ... -> firstBody -> head order!

        const arrowIndex = placed.length;
        for (let i = 0; i < path.length; i++) {
          const ck = idx(path[i].x, path[i].y);
          occupied[ck] = 1;
          const listeners = rayListeners[ck];
          for (let m = 0; m < listeners.length; m++) {
            placed[listeners[m]].blocked = true;
          }
        }
        filledCount += path.length;

        let resolvedColor = arrowColor;
        if (colorMask && showcasePalette) {
          resolvedColor = resolveShowcaseColor(
            path,
            width,
            colorMask,
            showcasePalette,
            arrowColor
          );
        } else if (tonalPalette && id > 100) {
          if (frameMask && frameMask[headKey] === 1) {
            resolvedColor = tonalPalette[0];
          } else {
            resolvedColor = arrowIndex % 3 === 0 ? tonalPalette[2] : tonalPalette[1];
          }
        }

        placed.push({
          arrow: {
            id: `${id}_${arrowIndex + 1}`,
            path,
            head: { x: hx, y: hy },
            direction: dir,
            color: resolvedColor,
          },
          rayCells: ray.rayCells,
          blocked: false,
        });
        for (let i = 0; i < ray.rayCells.length; i++) {
          rayListeners[ray.rayCells[i]].push(arrowIndex);
        }
        openIndices.push(arrowIndex);
        return true;
      }
    }
    return false;
  };

  // Seed initial center anchor arrow
  for (let i = 0; i < allCoords.length; i++) {
    const c = allCoords[i];
    const seedMin = Math.min(4, maxCap);
    const seedMax = Math.min(10, maxCap);
    const seedMinRay = width <= 8 ? 1 : 4;
    if (tryPlaceArrowAt(c.x, c.y, seedMin, seedMax, seedMinRay, false)) break;
  }

  let seedCursor = 0;
  let stage1Passes = 0;
  let safetySteps = playableCellsCount * 2;
  let stepCounter = 0;

  while (filledCount < playableCellsCount && safetySteps-- > 0) {
    stepCounter++;
    for (let i = openIndices.length - 1; i >= 0; i--) {
      if (placed[openIndices[i]].blocked) {
        openIndices.splice(i, 1);
      }
    }

    let placedThisStep = false;
    const len = stage1Passes === 0 ? pickMixedLength() : rndInt(2, Math.min(8, maxCap));
    const minLen = stage1Passes === 0 ? (len <= 3 ? len : Math.max(3, Math.floor(len * 0.65))) : 2;
    const isNonSerialHard = hardBias >= 0.55;
    const minRay =
      stage1Passes === 0
        ? width <= 8
          ? 1
          : isAnimatedShowcase
          ? 2
          : isNonSerialHard && width >= 20
          ? 3
          : 2
        : isNonSerialHard
        ? 1
        : 0;

    // On hard levels, run at most 2 active branches below 12% fill then merge near center with capped <=26 bridge
    const fillRatioNow = filledCount / Math.max(1, playableCellsCount);
    const branchCeilingNow = isNonSerialHard
      ? fillRatioNow < 0.12
        ? Math.min(optFlexCeiling ?? 2, 2)
        : 1
      : targetOpenCap;
    if (
      isNonSerialHard &&
      openIndices.length >= 2 &&
      (openIndices.length > branchCeilingNow || stepCounter % 5 === 0)
    ) {
      const bridgeCap = Math.min(26, Math.max(18, maxCap + 6));
      if (openIndices.length > branchCeilingNow) {
        placedThisStep = placeCrossRayBridge(bridgeCap);
      }
      if (!placedThisStep) {
        const bridgeRadius = totalGrid >= 6000 ? 1 : 2;
        const bridgeCands = collectOpenRayCandidates(bridgeRadius);
        bridgeCands.sort((a, b) => countUnblockedOnCell(b) - countUnblockedOnCell(a));
        const bridgeLimit = Math.min(bridgeCands.length, 35);
        for (let ci = 0; ci < bridgeLimit; ci++) {
          const ck = bridgeCands[ci];
          if (
            tryPlaceArrowAt(
              ck % width,
              Math.floor(ck / width),
              2,
              maxCap,
              isNonSerialHard ? 1 : 0,
              true,
              2
            )
          ) {
            placedThisStep = true;
            break;
          }
        }
      }
      if (!placedThisStep && openIndices.length >= 2) {
        placedThisStep = placeCrossRayBridge(bridgeCap);
      }
    }

    // 1. On hard levels (or once beginner open quota is met), chase open arrows non-serially across the board
    const shouldChaseOpenRay =
      !placedThisStep &&
      openIndices.length > 0 &&
      (!preferOpenStart || countUnblockedTotal() >= targetOpenCap);
    if (shouldChaseOpenRay) {
      const tryOrder: number[] = [];
      if (isNonSerialHard && openIndices.length > 1) {
        // Round-robin & random across open branches so we never build one linear serial domino line!
        tryOrder.push(openIndices[0]);
        tryOrder.push(openIndices[Math.floor(rnd() * openIndices.length)]);
        tryOrder.push(openIndices[openIndices.length - 1]);
      } else {
        tryOrder.push(openIndices[openIndices.length - 1]);
        if (openIndices.length > 1) tryOrder.push(openIndices[0]);
      }

      for (let oi = 0; oi < tryOrder.length && !placedThisStep; oi++) {
        const target = placed[tryOrder[oi]];
        if (target.blocked || target.rayCells.length === 0) continue;

        const directKeys: number[] = [];
        for (let r = 0; r < target.rayCells.length; r++) {
          const rk = target.rayCells[r];
          const rx = rk % width;
          const ry = (rk - rx) / width;
          if (isPlayable(rx, ry)) directKeys.push(rk);
        }

        if (isNonSerialHard && directKeys.length > 5) {
          // Cross-board scatter: prioritize distant ray positions & multi-ray intersections!
          for (let ci = directKeys.length - 1; ci > 0; ci--) {
            const j = Math.floor(rnd() * (ci + 1));
            const tmp = directKeys[ci];
            directKeys[ci] = directKeys[j];
            directKeys[j] = tmp;
          }
          directKeys.sort((a, b) => countUnblockedOnCell(b) - countUnblockedOnCell(a));
        } else {
          const localShuffleSpan = Math.min(directKeys.length, 6);
          for (let ci = 0; ci < localShuffleSpan; ci++) {
            const swapIdx = ci + Math.floor(rnd() * (localShuffleSpan - ci));
            const tmp = directKeys[ci];
            directKeys[ci] = directKeys[swapIdx];
            directKeys[swapIdx] = tmp;
          }
        }

        for (let ci = 0; ci < Math.min(directKeys.length, 24); ci++) {
          const ck = directKeys[ci];
          const hx = ck % width;
          const hy = (ck - hx) / width;
          if (tryPlaceArrowAt(hx, hy, minLen, len, minRay, false)) {
            placedThisStep = true;
            break;
          }
        }
      }
    }

    // 2. Advance along frontier OR collect candidates near open rays directly
    if (!placedThisStep) {
      const currentOpen = countUnblockedTotal();
      const fillRatio = filledCount / Math.max(1, playableCellsCount);
      const taperedMaxBranches = isNonSerialHard
        ? fillRatio < 0.12
          ? Math.min(optFlexCeiling ?? 2, 2)
          : 1
        : targetOpenCap;
      const requireBlock = currentOpen >= taperedMaxBranches;

      if (requireBlock) {
        const searchRadius = totalGrid >= 6000 ? 1 : stage1Passes === 0 ? 2 : 3;
        const nearRayCands = collectOpenRayCandidates(searchRadius);
        const cap = stage1Passes === 0 ? Math.min(nearRayCands.length, 110) : nearRayCands.length;
        for (let ci = 0; ci < cap && !placedThisStep; ci++) {
          const ck = nearRayCands[ci];
          const hx = ck % width;
          const hy = (ck - hx) / width;
          if (tryPlaceArrowAt(hx, hy, minLen, len, minRay, true)) {
            placedThisStep = true;
            break;
          }
        }
      } else {
        let checked = 0;
        while (seedCursor < allCoords.length && checked < 100) {
          const c = allCoords[seedCursor++];
          if (!isPlayable(c.x, c.y)) continue;
          checked++;
          if (tryPlaceArrowAt(c.x, c.y, minLen, len, Math.max(1, minRay), false)) {
            placedThisStep = true;
            break;
          }
        }
      }

      if (!placedThisStep) {
        if (currentOpen >= 2) {
          const bridgeCands = collectOpenRayCandidates(totalGrid >= 6000 ? 2 : 3);
          bridgeCands.sort((a, b) => countUnblockedOnCell(b) - countUnblockedOnCell(a));
          for (let ci = 0; ci < Math.min(bridgeCands.length, 60); ci++) {
            const ck = bridgeCands[ci];
            if (
              tryPlaceArrowAt(
                ck % width,
                Math.floor(ck / width),
                2,
                len,
                isNonSerialHard ? 1 : 0,
                true,
                2
              )
            ) {
              placedThisStep = true;
              break;
            }
          }
          if (!placedThisStep) {
            placedThisStep = placeCrossRayBridge(Math.min(26, Math.max(18, maxCap + 6)));
          }
        }
      }

      if (!placedThisStep) {
        const defaultFlex =
          isNonSerialHard
            ? fillRatio < 0.12
              ? Math.min(optFlexCeiling ?? 2, 2)
              : 1
            : optFlexCeiling ?? (id > 25 && fillRatio >= 0.45 ? 2 : 3);
        const flexCeiling = preferOpenStart ? Math.max(4, targetOpenCap + 1) : defaultFlex;
        if (currentOpen < flexCeiling) {
          while (seedCursor < allCoords.length) {
            const c = allCoords[seedCursor++];
            if (!isPlayable(c.x, c.y)) continue;
            if (tryPlaceArrowAt(c.x, c.y, minLen, len, Math.max(1, minRay), false)) {
              placedThisStep = true;
              break;
            }
          }
          if (!placedThisStep) {
            for (let i = 0; i < allCoords.length; i++) {
              const c = allCoords[i];
              if (!isPlayable(c.x, c.y)) continue;
              if (tryPlaceArrowAt(c.x, c.y, minLen, len, Math.max(1, minRay), false)) {
                placedThisStep = true;
                break;
              }
            }
          }
        }

        if (!placedThisStep) {
          if (stage1Passes === 0) {
            stage1Passes = 1;
            seedCursor = 0;
          } else {
            break;
          }
        }
      }
    }
  }

  // Exact Multi-Ray Bridge Sweep: collapses concurrent open branches all the way down toward targetOpenCap (1!)
  for (let i = openIndices.length - 1; i >= 0; i--) {
    if (placed[openIndices[i]].blocked) openIndices.splice(i, 1);
  }
  if (openIndices.length > targetOpenCap) {
    const maxSweeps = totalGrid >= 6000 ? 24 : 18;
    const pinchRadius = totalGrid >= 6000 ? 2 : 4;
    for (let pass = 0; pass < maxSweeps; pass++) {
      for (let i = openIndices.length - 1; i >= 0; i--) {
        if (placed[openIndices[i]].blocked) openIndices.splice(i, 1);
      }
      if (openIndices.length <= targetOpenCap) break;

      let lockedAny = placeCrossRayBridge(Math.min(26, Math.max(20, maxCap + 6)));
      if (!lockedAny) {
        const pinchCands = collectOpenRayCandidates(pinchRadius);
        pinchCands.sort((a, b) => countUnblockedOnCell(b) - countUnblockedOnCell(a));
        for (let ci = 0; ci < Math.min(pinchCands.length, 150); ci++) {
          const ck = pinchCands[ci];
          const rx = ck % width;
          const ry = (ck - rx) / width;
          if (
            tryPlaceArrowAt(
              rx,
              ry,
              2,
              Math.max(maxCap, 22),
              hardBias >= 0.55 ? 1 : 0,
              true,
              2
            )
          ) {
            lockedAny = true;
            break;
          }
        }
      }
      if (!lockedAny) break;
    }
  }

  // Reverse so outer/blocking arrows escape first
  const forwardArrows: ArrowPath[] = [];
  for (let i = placed.length - 1; i >= 0; i--) {
    forwardArrows.push(placed[i].arrow);
  }

  // Pass 2 (O(1) Topology-Safe Tail-Stitcher): absorbs adjacent pockets onto nearby tails
  const nArrows = forwardArrows.length;
  if (nArrows > 0) {
    const earliestRayUser = new Int32Array(totalGrid);
    earliestRayUser.fill(nArrows);
    const tailOwner = new Int32Array(totalGrid);
    tailOwner.fill(-1);

    for (let i = 0; i < nArrows; i++) {
      const arr = forwardArrows[i];
      tailOwner[idx(arr.path[0].x, arr.path[0].y)] = i;
      const { dx, dy } = getDirectionOffset(arr.direction);
      let rx = arr.head.x + dx;
      let ry = arr.head.y + dy;
      while (inBounds(rx, ry)) {
        const rk = idx(rx, ry);
        if (i < earliestRayUser[rk]) {
          earliestRayUser[rk] = i;
        }
        rx += dx;
        ry += dy;
      }
    }

    const stitchCap = maxCap <= 7 ? maxCap + 1 : Math.min(26, maxCap + 2);
    const maxStitchedLen = Math.max(4, Math.min(width >= 38 ? 26 : width >= 14 ? 16 : 10, stitchCap));
    for (let sweep = 0; sweep < 10; sweep++) {
      let stitched = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const k = idx(x, y);
          if (occupied[k] !== 0) continue;
          if (activeMask && activeMask[k] === 0) continue;

          let bestIdx = -1;
          let bestLen = Infinity;
          for (let d = 0; d < 4; d++) {
            const { dx, dy } = getDirectionOffset(DIRECTIONS[d]);
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny)) continue;
            const owner = tailOwner[idx(nx, ny)];
            if (owner === -1 || owner >= earliestRayUser[k]) continue;
            const len = forwardArrows[owner].path.length;
            if (len < maxStitchedLen && len < bestLen) {
              bestLen = len;
              bestIdx = owner;
            }
          }

          if (bestIdx !== -1) {
            const oldTail = forwardArrows[bestIdx].path[0];
            tailOwner[idx(oldTail.x, oldTail.y)] = -1;
            forwardArrows[bestIdx].path.unshift({ x, y });
            tailOwner[k] = bestIdx;
            occupied[k] = 1;
            filledCount++;
            stitched = true;
          }
        }
      }
      if (!stitched) break;
    }
  }

  return {
    id,
    name,
    width,
    height,
    difficulty,
    maxHearts,
    arrowColor,
    isArtLevel,
    artThemeName,
    isAnimatedShowcase,
    showcaseThemeId,
    showcaseCategory,
    showcaseAnimStyle,
    showcasePalette,
    showcaseIntroPalette,
    activeMask,
    colorMask,
    arrows: forwardArrows,
  };
}

/**
 * Pass 3: Fast wave-proven pocket finishing on the selected best puzzle.
 * Proves tail absorptions & 2-5 dot pocket insertions in O(1) via peel-wave bounds.
 */
function fillRemainingPockets(level: AmazeGoLevel, opts: GenerateOptions): AmazeGoLevel {
  const {
    id,
    width,
    height,
    arrowColor,
    maxArrowLen,
    activeMask,
    frameMask,
    tonalPalette,
    colorMask,
    showcasePalette,
    isArtLevel,
  } = opts;
  const totalGrid = width * height;
  const idx = (x: number, y: number) => y * width + x;
  const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;

  const occupied = new Uint8Array(totalGrid);
  const cellOwner = new Int32Array(totalGrid);
  cellOwner.fill(-1);
  const tailOwner = new Int32Array(totalGrid);
  tailOwner.fill(-1);
  const selfMark = new Int32Array(totalGrid);
  let pStamp = 1;

  for (let i = 0; i < level.arrows.length; i++) {
    const a = level.arrows[i];
    for (let j = 0; j < a.path.length; j++) {
      const ck = idx(a.path[j].x, a.path[j].y);
      occupied[ck] = 1;
      cellOwner[ck] = i;
    }
    tailOwner[idx(a.path[0].x, a.path[0].y)] = i;
  }

  const waveOf: number[] = new Array(level.arrows.length).fill(999999);
  const waveCounts: number[] = [];
  const minRayWave = new Int32Array(totalGrid);

  const recomputeWaveBounds = () => {
    while (waveOf.length < level.arrows.length) waveOf.push(999999);
    waveOf.fill(999999);
    waveCounts.length = 0;
    const simOcc = new Int32Array(cellOwner);
    const nInit = level.arrows.length;
    const alive = new Uint8Array(nInit);
    alive.fill(1);
    let rem = nInit;
    let wave = 0;
    while (rem > 0) {
      const freed: number[] = [];
      for (let i = 0; i < nInit; i++) {
        if (!alive[i]) continue;
        const a = level.arrows[i];
        const { dx, dy } = getDirectionOffset(a.direction);
        let rx = a.head.x + dx;
        let ry = a.head.y + dy;
        let clear = true;
        while (inBounds(rx, ry)) {
          if (simOcc[idx(rx, ry)] !== -1) {
            clear = false;
            break;
          }
          rx += dx;
          ry += dy;
        }
        if (clear) freed.push(i);
      }
      if (freed.length === 0) break;
      waveCounts[wave] = freed.length;
      for (let k = 0; k < freed.length; k++) {
        const i = freed[k];
        alive[i] = 0;
        rem--;
        waveOf[i] = wave;
        const p = level.arrows[i].path;
        for (let j = 0; j < p.length; j++) {
          simOcc[idx(p[j].x, p[j].y)] = -1;
        }
      }
      wave++;
    }

    minRayWave.fill(999999);
    for (let i = 0; i < level.arrows.length; i++) {
      const a = level.arrows[i];
      const wv = waveOf[i];
      const { dx, dy } = getDirectionOffset(a.direction);
      let rx = a.head.x + dx;
      let ry = a.head.y + dy;
      while (inBounds(rx, ry)) {
        const rk = idx(rx, ry);
        if (wv < minRayWave[rk]) minRayWave[rk] = wv;
        rx += dx;
        ry += dy;
      }
    }
  };

  recomputeWaveBounds();

  const registerRayWaves = (arrowIdx: number, wv: number) => {
    const a = level.arrows[arrowIdx];
    const { dx, dy } = getDirectionOffset(a.direction);
    let rx = a.head.x + dx;
    let ry = a.head.y + dy;
    while (inBounds(rx, ry)) {
      const rk = idx(rx, ry);
      if (wv < minRayWave[rk]) minRayWave[rk] = wv;
      rx += dx;
      ry += dy;
    }
  };

  const isPlayable = (x: number, y: number) => {
    const k = idx(x, y);
    if (occupied[k] !== 0) return false;
    if (activeMask && activeMask[k] === 0) return false;
    return true;
  };

  const defaultCap = width >= 38 ? 26 : width >= 14 ? 16 : 10;
  const stitchCap =
    maxArrowLen !== undefined
      ? Math.min(defaultCap, maxArrowLen + 3)
      : defaultCap;
  const maxStitchedLen = Math.max(4, Math.min(defaultCap, stitchCap));
  let solvableChecks = 0;
  const maxFallbackChecks =
    totalGrid >= 12000
      ? 360
      : totalGrid >= 8000
      ? 290
      : totalGrid >= 3000
      ? 280
      : totalGrid >= 2400
      ? 280
      : isArtLevel
      ? 360
      : width >= 30
      ? 300
      : 220;

  for (let sweep = 0; sweep < (totalGrid >= 12000 ? 8 : 7); sweep++) {
    let changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const k = idx(x, y);
        if (occupied[k] !== 0) continue;
        if (activeMask && activeMask[k] === 0) continue;

        const cands: number[] = [];
        for (let d = 0; d < 4; d++) {
          const { dx, dy } = getDirectionOffset(DIRECTIONS[d]);
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(nx, ny)) continue;
          const owner = tailOwner[idx(nx, ny)];
          if (owner !== -1 && level.arrows[owner].path.length < maxStitchedLen) {
            cands.push(owner);
          }
        }
        cands.sort((a, b) => level.arrows[a].path.length - level.arrows[b].path.length);

        let absorbed = false;
        for (let c = 0; c < cands.length; c++) {
          const owner = cands[c];
          const target = level.arrows[owner];
          const ownerWave = waveOf[owner];

          if (ownerWave < minRayWave[k]) {
            const oldTail = target.path[0];
            target.path.unshift({ x, y });
            tailOwner[idx(oldTail.x, oldTail.y)] = -1;
            tailOwner[k] = owner;
            cellOwner[k] = owner;
            occupied[k] = 1;
            changed = true;
            absorbed = true;
            break;
          }

          if (sweep >= 2 && solvableChecks < maxFallbackChecks && ownerWave <= minRayWave[k] + 5) {
            target.path.unshift({ x, y });
            solvableChecks++;
            if (isLevelSolvable(level)) {
              const oldTail = target.path[1];
              tailOwner[idx(oldTail.x, oldTail.y)] = -1;
              tailOwner[k] = owner;
              cellOwner[k] = owner;
              occupied[k] = 1;
              recomputeWaveBounds();
              changed = true;
              absorbed = true;
              break;
            } else {
              target.path.shift();
            }
          }
        }

        if (!absorbed) {
          // Evaluate all 4 directions and pick the deepest multi-blocker direction (prevents Wave-1 avalanches!)
          let bestDir: Direction | null = null;
          let bestDirScore = -Infinity;
          let bestBlockerWave = 0;
          let bestBx = 0;
          let bestBy = 0;

          for (let d = 0; d < 4; d++) {
            const dir = DIRECTIONS[d];
            const { dx, dy } = getDirectionOffset(dir);
            const bx = x - dx;
            const by = y - dy;
            if (!inBounds(bx, by) || !isPlayable(bx, by)) continue;

            let blockerCount = 0;
            let blockerWave = 0;
            let lastOwner = -1;
            let rx = x + dx;
            let ry = y + dy;
            while (inBounds(rx, ry)) {
              const ownerAt = cellOwner[idx(rx, ry)];
              if (ownerAt !== -1) {
                if (ownerAt !== lastOwner) {
                  blockerCount++;
                  lastOwner = ownerAt;
                }
                if (waveOf[ownerAt] >= blockerWave) {
                  blockerWave = waveOf[ownerAt] + 1;
                }
              }
              rx += dx;
              ry += dy;
            }
            if (blockerCount === 0) continue;

            const bk = idx(bx, by);
            if (minRayWave[k] <= blockerWave || minRayWave[bk] <= blockerWave) continue;

            const dilutesChoke = (waveCounts[blockerWave] ?? 0) === 1 ? -400 : 0;
            const dirScore = blockerCount * 100 + blockerWave * 14 + dilutesChoke;
            if (dirScore > bestDirScore) {
              bestDirScore = dirScore;
              bestDir = dir;
              bestBlockerWave = blockerWave;
              bestBx = bx;
              bestBy = by;
            }
          }

          if (bestDir) {
            const dir = bestDir;
            const { dx, dy } = getDirectionOffset(dir);
            const bx = bestBx;
            const by = bestBy;
            const bk = idx(bx, by);
            const blockerWave = bestBlockerWave;

            const isOnOwnRay = (px: number, py: number) => {
              if (dx > 0) return py === y && px > x;
              if (dx < 0) return py === y && px < x;
              if (dy > 0) return px === x && py > y;
              return px === x && py < y;
            };
            if (!isOnOwnRay(bx, by)) {
              const pocketBack: GridCoord[] = [
                { x, y },
                { x: bx, y: by },
              ];
              const st = ++pStamp;
              selfMark[k] = st;
              selfMark[bk] = st;
              let pCur = { x: bx, y: by };
              let prevStepDx = bx - x;
              let prevStepDy = by - y;
              const maxPocketLen = Math.max(3, Math.min(10, maxStitchedLen));
              const seedHash = level.arrows.length + x + y;
              for (let s = 2; s < maxPocketLen; s++) {
                let nextP: GridCoord | null = null;
                let nextStepDx = 0;
                let nextStepDy = 0;
                for (let passTurn = 0; passTurn < 2 && !nextP; passTurn++) {
                  for (let d2 = 0; d2 < 4; d2++) {
                    const off = getDirectionOffset(DIRECTIONS[(d2 + seedHash) % 4]);
                    const isTurn = off.dx !== prevStepDx || off.dy !== prevStepDy;
                    if (passTurn === 0 && !isTurn) continue;
                    const nx = pCur.x + off.dx;
                    const ny = pCur.y + off.dy;
                    if (!inBounds(nx, ny) || isOnOwnRay(nx, ny)) continue;
                    const nk = idx(nx, ny);
                    if (isPlayable(nx, ny) && selfMark[nk] !== st && minRayWave[nk] > blockerWave) {
                      nextP = { x: nx, y: ny };
                      nextStepDx = off.dx;
                      nextStepDy = off.dy;
                      break;
                    }
                  }
                }
                if (!nextP) break;
                pocketBack.push(nextP);
                selfMark[idx(nextP.x, nextP.y)] = st;
                prevStepDx = nextStepDx;
                prevStepDy = nextStepDy;
                pCur = nextP;
              }

              const pocketPath = pocketBack.slice().reverse();
              const pocketColor =
                colorMask && showcasePalette
                  ? resolveShowcaseColor(
                      pocketPath,
                      width,
                      colorMask,
                      showcasePalette,
                      arrowColor
                    )
                  : tonalPalette && id > 100
                  ? frameMask && frameMask[k] === 1
                    ? tonalPalette[0]
                    : tonalPalette[1]
                  : arrowColor;
              const newArrow: ArrowPath = {
                id: `${id}_p${level.arrows.length + 1}`,
                path: pocketPath,
                head: { x, y },
                direction: dir,
                color: pocketColor,
              };
              const newIdx = level.arrows.length;
              level.arrows.push(newArrow);
              waveOf.push(blockerWave);
              waveCounts[blockerWave] = (waveCounts[blockerWave] ?? 0) + 1;
              registerRayWaves(newIdx, blockerWave);
              for (let pi = 0; pi < pocketPath.length; pi++) {
                const pk = idx(pocketPath[pi].x, pocketPath[pi].y);
                occupied[pk] = 1;
                cellOwner[pk] = newIdx;
              }
              tailOwner[idx(pocketPath[0].x, pocketPath[0].y)] = newIdx;
              changed = true;
              absorbed = true;
            }
          }
        }
      }
    }
    if (!changed) break;
  }

  return level;
}

/**
 * Generates an ultra-dense, deeply tangled, 100% solvable dot-grid arrow puzzle
 * with mixed arrow sizes, minimal empty pockets, and >= 4-5 single-arrow bottlenecks on hard levels.
 */
export function generateDotArrowLevel(opts: GenerateOptions): AmazeGoLevel {
  const hardBias = opts.hardBias ?? 0.75;
  const totalGrid = opts.width * opts.height;
  const targetBottlenecks = opts.targetBottlenecks ?? (hardBias >= 0.9 ? 10 : 5);
  const targetOpenCap =
    opts.targetOpenCap ?? (opts.id <= 4 ? 5 : opts.id <= 10 ? 3 : opts.id <= 25 ? 2 : 1);

  const maxAttempts =
    hardBias < 0.3
      ? 10
      : hardBias < 0.7
      ? 4
      : totalGrid >= 7000
      ? 5
      : totalGrid >= 3000
      ? 6
      : 7;

  let bestLevel: AmazeGoLevel | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateSingleSeedPuzzle({
      ...opts,
      seed: opts.seed + attempt * 104729,
    });

    const metrics = evaluatePuzzleDifficulty(candidate);
    let playableCount = candidate.width * candidate.height;
    if (candidate.activeMask) {
      playableCount = 0;
      for (let i = 0; i < candidate.activeMask.length; i++) {
        if (candidate.activeMask[i] === 1) playableCount++;
      }
    }
    const covered = candidate.arrows.reduce((acc, a) => acc + a.path.length, 0);
    const density = covered / Math.max(1, playableCount);

    let score = 0;
    if (hardBias < 0.3) {
      score =
        density * 80 +
        Math.min(metrics.initialFree, 6) * 85 +
        (metrics.initialFree >= 3 ? 140 : 0) -
        metrics.singleBottlenecks * 15;
    } else {
      const openDiff = Math.max(0, metrics.initialFree - targetOpenCap);
      const excessFreePenalty = openDiff * (hardBias >= 0.9 ? 240 : 140);
      const singleKeyBonus =
        metrics.initialFree === 1 ? 240 : metrics.initialFree === 2 ? 75 : 0;
      const bottleneckScore =
        metrics.singleBottlenecks >= targetBottlenecks
          ? 220 + Math.min(metrics.singleBottlenecks - targetBottlenecks, 18) * 14
          : metrics.singleBottlenecks * 22 -
            140 -
            (targetBottlenecks >= 12 && metrics.singleBottlenecks < 8
              ? (8 - metrics.singleBottlenecks) * 110
              : 0);
      const jumpScore = Math.min(metrics.avgJumpDist, 32) * 5.5;
      const multiLockScore = metrics.multiLockedRatio * 220;
      const burstCap = Math.max(8, Math.round(candidate.arrows.length * 0.04));
      const avalanchePenalty = Math.max(0, metrics.maxWaveBurst - burstCap) * 7;
      const minWantedDensity = opts.isAnimatedShowcase ? 0.8 : opts.activeMask ? 0.86 : 0.87;
      const densityFloorPenalty =
        density < minWantedDensity ? (minWantedDensity - density) * 1600 : 0;

      score =
        density * 260 +
        bottleneckScore +
        metrics.waves * 1.8 +
        jumpScore +
        multiLockScore +
        singleKeyBonus -
        metrics.initialFree * 40 -
        excessFreePenalty -
        avalanchePenalty -
        densityFloorPenalty;
    }

    if (score > bestScore) {
      bestScore = score;
      bestLevel = candidate;
    }

    if (hardBias < 0.3) {
      if (density >= 0.72 && metrics.initialFree >= Math.min(3, targetOpenCap)) break;
    } else if (
      density >= 0.89 &&
      metrics.initialFree <= targetOpenCap &&
      metrics.singleBottlenecks >= targetBottlenecks &&
      metrics.avgJumpDist >= 5
    ) {
      break;
    }
  }

  const filled = fillRemainingPockets(bestLevel!, opts);
  return assignSpecialArrows(filled);
}
