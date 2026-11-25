export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridCoord {
  x: number;
  y: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export type SpecialArrowType = 'yellow_burst' | 'golden_key';

export interface ArrowPath {
  id: string;
  /** Ordered grid coordinates from tail (index 0) to head (last index) */
  path: GridCoord[];
  /** Head coordinate (same as path[path.length - 1]) */
  head: GridCoord;
  /** Escape direction pointing from previous cell to head */
  direction: Direction;
  /** Display stroke & arrowhead color */
  color: string;
  /** Optional special gameplay powerup/objective type */
  specialType?: SpecialArrowType;
}

export type ArrowDef = ArrowPath;

export type DifficultyTier = 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Master';

export interface AmazeGoLevelMeta {
  id: number;
  name: string;
  width: number;
  height: number;
  maxHearts: number;
  arrowColor: string;
  difficulty: DifficultyTier;
  /** True on every 5th level (5, 10, 15, ..., 500) shaped art silhouette puzzle */
  isArtLevel?: boolean;
  /** Name of the shaped silhouette art template */
  artThemeName?: string;
  /** True on every 10th level after 200 (210, 220, ..., 500) with animated creature intro & multi-color silhouette */
  isAnimatedShowcase?: boolean;
  showcaseThemeId?: string;
  showcaseCategory?: 'water' | 'roar' | 'wing' | 'mystic';
  showcaseAnimStyle?: string;
  showcasePalette?: [string, string, string];
  showcaseIntroPalette?: [string, string, string];
}

export interface AmazeGoLevel extends AmazeGoLevelMeta {
  arrows: ArrowPath[];
  /** Optional 0/1 mask (length = width * height) for shaped picture puzzles */
  activeMask?: Uint8Array;
  /** Optional 0/1/2/3 anatomical color-zone mask for animated showcase creatures */
  colorMask?: Uint8Array;
}

export interface EscapeCheckResult {
  canEscape: boolean;
  blockedByArrowId?: string;
  blockingCell?: GridCoord;
  trajectory: GridCoord[];
}

export function getDirectionOffset(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case 'UP':
      return { dx: 0, dy: -1 };
    case 'DOWN':
      return { dx: 0, dy: 1 };
    case 'LEFT':
      return { dx: -1, dy: 0 };
    case 'RIGHT':
      return { dx: 1, dy: 0 };
  }
}

/**
 * Returns max allowed hearts based on level number:
 * Levels 1–100: 3 hearts
 * Levels 101–200: 2 hearts
 * Levels 201–500: 1 heart ("One Chance")
 */
export function getMaxHeartsForLevel(levelId: number): number {
  if (levelId <= 100) return 3;
  if (levelId <= 200) return 2;
  return 1;
}

/**
 * Golden Key levels start at Level 28 (after Level 20) and repeat every 10 levels (28, 38, 48, ..., 498).
 * Freeing the deep shimmering golden arrow immediately completes the level.
 */
export function isGoldenKeyLevel(levelId: number): boolean {
  return levelId >= 28 && (levelId - 8) % 10 === 0;
}

/**
 * Special Yellow Burst arrows unlock starting at Level 21 (Levels 1–20 have no yellow arrows).
 */
export function hasYellowBurstArrows(levelId: number): boolean {
  return levelId > 20;
}

/**
 * Checks if a given multi-dot arrow has an unobstructed ray from its head to the edge of the board.
 * Checks against all other active arrows AND the arrow's own body segments.
 */
export function checkArrowEscape(
  levelWidth: number,
  levelHeight: number,
  activeArrows: ArrowPath[],
  targetArrowId: string
): EscapeCheckResult {
  const target = activeArrows.find((a) => a.id === targetArrowId);
  if (!target) {
    return { canEscape: false, trajectory: [] };
  }

  // Map every occupied dot on the board (including target's own body except its head)
  const occupied = new Map<string, string>();
  for (const arrow of activeArrows) {
    for (let i = 0; i < arrow.path.length; i++) {
      const cell = arrow.path[i];
      if (arrow.id === targetArrowId && i === arrow.path.length - 1) {
        continue; // Skip target's own head
      }
      occupied.set(`${cell.x},${cell.y}`, arrow.id);
    }
  }

  const { dx, dy } = getDirectionOffset(target.direction);
  let curX = target.head.x + dx;
  let curY = target.head.y + dy;
  const trajectory: GridCoord[] = [];

  while (curX >= 0 && curX < levelWidth && curY >= 0 && curY < levelHeight) {
    trajectory.push({ x: curX, y: curY });
    const blockerId = occupied.get(`${curX},${curY}`);
    if (blockerId) {
      return {
        canEscape: false,
        blockedByArrowId: blockerId,
        blockingCell: { x: curX, y: curY },
        trajectory,
      };
    }
    curX += dx;
    curY += dy;
  }

  return {
    canEscape: true,
    trajectory,
  };
}

/**
 * Returns all arrows that currently have a clear path to escape off the board
 */
export function getEscapableArrows(
  levelWidth: number,
  levelHeight: number,
  activeArrows: ArrowPath[]
): ArrowPath[] {
  const occupied = new Int32Array(levelWidth * levelHeight);
  occupied.fill(-1);

  for (let idx = 0; idx < activeArrows.length; idx++) {
    const path = activeArrows[idx].path;
    for (let j = 0; j < path.length; j++) {
      occupied[path[j].y * levelWidth + path[j].x] = idx;
    }
  }

  const result: ArrowPath[] = [];
  for (let idx = 0; idx < activeArrows.length; idx++) {
    const arrow = activeArrows[idx];
    const { dx, dy } = getDirectionOffset(arrow.direction);
    let rx = arrow.head.x + dx;
    let ry = arrow.head.y + dy;
    let clear = true;
    while (rx >= 0 && rx < levelWidth && ry >= 0 && ry < levelHeight) {
      const occ = occupied[ry * levelWidth + rx];
      if (occ !== -1) {
        clear = false;
        break;
      }
      rx += dx;
      ry += dy;
    }
    if (clear) {
      result.push(arrow);
    }
  }

  return result;
}

/**
 * Fast O(N * gridSpan) verification that a level has a valid sequence to clear every arrow (100% solvable)
 */
export function isLevelSolvable(level: AmazeGoLevel): boolean {
  const n = level.arrows.length;
  if (n === 0) return true;

  const w = level.width;
  const h = level.height;
  const occupied = new Int32Array(w * h);
  occupied.fill(-1);

  const alive = new Uint8Array(n);
  alive.fill(1);

  for (let i = 0; i < n; i++) {
    const path = level.arrows[i].path;
    for (let j = 0; j < path.length; j++) {
      occupied[path[j].y * w + path[j].x] = i;
    }
  }

  let remaining = n;
  while (remaining > 0) {
    let freedThisPass = 0;
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      const arrow = level.arrows[i];
      const { dx, dy } = getDirectionOffset(arrow.direction);
      let rx = arrow.head.x + dx;
      let ry = arrow.head.y + dy;
      let clear = true;
      while (rx >= 0 && rx < w && ry >= 0 && ry < h) {
        if (occupied[ry * w + rx] !== -1) {
          clear = false;
          break;
        }
        rx += dx;
        ry += dy;
      }
      if (clear) {
        alive[i] = 0;
        remaining--;
        freedThisPass++;
        for (let j = 0; j < arrow.path.length; j++) {
          occupied[arrow.path[j].y * w + arrow.path[j].x] = -1;
        }
      }
    }
    if (freedThisPass === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Checks that no two arrows share the same dot and every step within a path is orthogonally adjacent
 */
export function validateArrowLevel(level: AmazeGoLevel): { valid: boolean; reason?: string } {
  const seen = new Set<string>();
  for (const arrow of level.arrows) {
    if (arrow.path.length < 2) {
      return { valid: false, reason: `Arrow ${arrow.id} has fewer than 2 dots` };
    }
    for (let i = 0; i < arrow.path.length; i++) {
      const c = arrow.path[i];
      if (c.x < 0 || c.x >= level.width || c.y < 0 || c.y >= level.height) {
        return { valid: false, reason: `Arrow ${arrow.id} out of bounds at (${c.x},${c.y})` };
      }
      if (level.activeMask && level.activeMask[c.y * level.width + c.x] === 0) {
        return { valid: false, reason: `Arrow ${arrow.id} outside art mask at (${c.x},${c.y})` };
      }
      const key = `${c.x},${c.y}`;
      if (seen.has(key)) {
        return { valid: false, reason: `Dot overlap at (${c.x},${c.y})` };
      }
      seen.add(key);

      if (i > 0) {
        const prev = arrow.path[i - 1];
        const dist = Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y);
        if (dist !== 1) {
          return { valid: false, reason: `Non-adjacent step in arrow ${arrow.id}` };
        }
      }
    }
  }
  if (!isLevelSolvable(level)) {
    return { valid: false, reason: 'Level has a blocking deadlock' };
  }
  return { valid: true };
}

export const COLLISION_IMPACT_AT = 0.42;

function quadInLinear(p: number, ramp = 0.22): number {
  const clamped = Math.max(0, Math.min(1, p));
  if (clamped <= ramp) {
    return (clamped * clamped) / (ramp * (2 - ramp));
  }
  return (2 * clamped - ramp) / (2 - ramp);
}

/**
 * Returns a clearly distinct warning color after a wrong-clicked arrow collides and returns home.
 */
export function getCollisionWarningColor(baseColor: string): string {
  const hex = baseColor.trim().replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      // If the arrow is already red/crimson-toned, shift to crisp violet so color change is unmistakable
      if (r >= 175 && g <= 95 && b <= 110) {
        return '#7c3aed';
      }
    }
  }
  return '#dc2626';
}

function sampleTrackAt(track: Point2D[], cumDist: number[], d: number): Point2D {
  const clamped = Math.max(0, Math.min(cumDist[cumDist.length - 1], d));
  for (let i = 1; i < track.length; i++) {
    if (clamped <= cumDist[i]) {
      const segLen = cumDist[i] - cumDist[i - 1];
      const ratio = segLen > 0 ? (clamped - cumDist[i - 1]) / segLen : 0;
      return {
        x: track[i - 1].x + (track[i].x - track[i - 1].x) * ratio,
        y: track[i - 1].y + (track[i].y - track[i - 1].y) * ratio,
      };
    }
  }
  return track[track.length - 1];
}

function slicePolylineAlongTrack(
  track: Point2D[],
  cumDist: number[],
  tailDist: number,
  headDist: number
): { points: Point2D[]; headTip: Point2D } {
  const sliced: Point2D[] = [sampleTrackAt(track, cumDist, tailDist)];
  for (let i = 1; i < track.length - 1; i++) {
    if (cumDist[i] > tailDist && cumDist[i] < headDist) {
      sliced.push(track[i]);
    }
  }
  const headTip = sampleTrackAt(track, cumDist, headDist);
  sliced.push(headTip);
  return { points: sliced, headTip };
}

/**
 * Computes the slithering polyline points as an arrow glides smoothly along its track
 * all the way past the visible mobile display edge (when extraExitPx is supplied).
 */
export function getSlidingArrowPoints(
  arrow: ArrowPath,
  levelWidth: number,
  levelHeight: number,
  cellSize: number,
  progress: number,
  extraExitPx: number = 0
): { points: Point2D[]; headTip: Point2D; opacity: number } {
  const toPx = (c: GridCoord): Point2D => ({
    x: c.x * cellSize + cellSize / 2,
    y: c.y * cellSize + cellSize / 2,
  });

  const bodyPx = arrow.path.map(toPx);
  if (progress <= 0) {
    return {
      points: bodyPx,
      headTip: bodyPx[bodyPx.length - 1],
      opacity: 1,
    };
  }

  const { dx, dy } = getDirectionOffset(arrow.direction);
  const bodyLength = (arrow.path.length - 1) * cellSize;

  const cellsToEdge =
    dx > 0
      ? levelWidth - arrow.head.x + 1
      : dx < 0
      ? arrow.head.x + 2
      : dy > 0
      ? levelHeight - arrow.head.y + 1
      : arrow.head.y + 2;

  const defaultTravel = cellsToEdge * cellSize + bodyLength * 0.85;
  const targetTravel =
    extraExitPx > 0 ? Math.max(defaultTravel, extraExitPx + bodyLength + cellSize) : defaultTravel;

  const headPx = bodyPx[bodyPx.length - 1];
  const farEnd: Point2D = {
    x: headPx.x + dx * (targetTravel + cellSize),
    y: headPx.y + dy * (targetTravel + cellSize),
  };

  const track: Point2D[] = [...bodyPx, farEnd];
  const cumDist: number[] = [0];
  for (let i = 1; i < track.length; i++) {
    const seg = Math.hypot(track[i].x - track[i - 1].x, track[i].y - track[i - 1].y);
    cumDist.push(cumDist[i - 1] + seg);
  }

  const eased =
    extraExitPx > 0
      ? quadInLinear(progress, 0.22)
      : progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const travel = eased * targetTravel;
  const { points, headTip } = slicePolylineAlongTrack(
    track,
    cumDist,
    travel,
    bodyLength + travel
  );

  // Stay 100% solid across the entire mobile display; only fade out after clearing screen edge
  const opacity =
    extraExitPx > 0
      ? progress > 0.94
        ? Math.max(0, 1 - (progress - 0.94) / 0.06)
        : 1
      : progress > 0.65
      ? Math.max(0, 1 - (progress - 0.65) / 0.35)
      : 1;

  return { points, headTip, opacity };
}

/**
 * Computes forward lunge-into-blocker and smooth bounce-back track points for wrong-clicked arrows.
 */
export function getCollisionBounceArrowPoints(
  arrow: ArrowPath,
  blockingCell: GridCoord | undefined,
  cellSize: number,
  progress: number,
  zoom: number = 1
): { points: Point2D[]; headTip: Point2D; hasImpacted: boolean; impactTravelPx: number } {
  const toPx = (c: GridCoord): Point2D => ({
    x: c.x * cellSize + cellSize / 2,
    y: c.y * cellSize + cellSize / 2,
  });

  const bodyPx = arrow.path.map(toPx);
  const { dx, dy } = getDirectionOffset(arrow.direction);
  const bodyLength = (arrow.path.length - 1) * cellSize;

  const cellsGap = blockingCell
    ? Math.abs(blockingCell.x - arrow.head.x) + Math.abs(blockingCell.y - arrow.head.y)
    : 1;

  // Ensure even adjacent 1-cell bumps visibly collide at 1x zoomed-out view, and multi-cell rays glide all the way to the blocker
  const impactTravelPx =
    cellsGap <= 1
      ? Math.max(cellSize * 0.62, Math.min(cellSize * 1.15, 3.6 / Math.max(1, zoom)))
      : Math.max(cellSize * 0.65, (cellsGap - 0.36) * cellSize);

  const clamped = Math.max(0, Math.min(1, progress));
  const hasImpacted = clamped >= COLLISION_IMPACT_AT;

  if (clamped <= 0 || clamped >= 1) {
    return {
      points: bodyPx,
      headTip: bodyPx[bodyPx.length - 1],
      hasImpacted,
      impactTravelPx,
    };
  }

  let factor = 0;
  if (clamped <= COLLISION_IMPACT_AT) {
    const u = clamped / COLLISION_IMPACT_AT;
    factor = u * u;
  } else {
    const v = (clamped - COLLISION_IMPACT_AT) / (1 - COLLISION_IMPACT_AT);
    const easeOut = 1 - Math.pow(1 - v, 3);
    factor = 1 - easeOut;
  }

  const headPx = bodyPx[bodyPx.length - 1];
  const farEnd: Point2D = {
    x: headPx.x + dx * (impactTravelPx + cellSize),
    y: headPx.y + dy * (impactTravelPx + cellSize),
  };

  const track: Point2D[] = [...bodyPx, farEnd];
  const cumDist: number[] = [0];
  for (let i = 1; i < track.length; i++) {
    const seg = Math.hypot(track[i].x - track[i - 1].x, track[i].y - track[i - 1].y);
    cumDist.push(cumDist[i - 1] + seg);
  }

  const travel = factor * impactTravelPx;
  const { points, headTip } = slicePolylineAlongTrack(
    track,
    cumDist,
    travel,
    bodyLength + travel
  );

  return { points, headTip, hasImpacted, impactTravelPx };
}

/**
 * Computes exact peel-wave depth (0 = initially open, higher = buried deeper behind blockers)
 * for every arrow in a solvable puzzle.
 */
export function computeArrowWaveDepths(
  levelWidth: number,
  levelHeight: number,
  arrows: ArrowPath[]
): { waveById: Map<string, number>; maxWave: number } {
  const n = arrows.length;
  const waveById = new Map<string, number>();
  if (n === 0) return { waveById, maxWave: 0 };

  const occ = new Int32Array(levelWidth * levelHeight);
  occ.fill(-1);
  for (let i = 0; i < n; i++) {
    const p = arrows[i].path;
    for (let j = 0; j < p.length; j++) {
      occ[p[j].y * levelWidth + p[j].x] = i;
    }
  }

  const alive = new Uint8Array(n);
  alive.fill(1);
  let remaining = n;
  let wave = 0;
  let maxWave = 0;

  while (remaining > 0) {
    const freed: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      const a = arrows[i];
      const { dx, dy } = getDirectionOffset(a.direction);
      let rx = a.head.x + dx;
      let ry = a.head.y + dy;
      let clear = true;
      while (rx >= 0 && rx < levelWidth && ry >= 0 && ry < levelHeight) {
        if (occ[ry * levelWidth + rx] !== -1) {
          clear = false;
          break;
        }
        rx += dx;
        ry += dy;
      }
      if (clear) freed.push(i);
    }

    if (freed.length === 0) break;

    maxWave = wave;
    for (let k = 0; k < freed.length; k++) {
      const idxA = freed[k];
      alive[idxA] = 0;
      remaining--;
      waveById.set(arrows[idxA].id, wave);
      const p = arrows[idxA].path;
      for (let j = 0; j < p.length; j++) {
        occ[p[j].y * levelWidth + p[j].x] = -1;
      }
    }
    wave++;
  }

  // Fallback for any non-peeled arrow (should not happen in valid levels)
  for (let i = 0; i < n; i++) {
    if (!waveById.has(arrows[i].id)) {
      waveById.set(arrows[i].id, maxWave);
    }
  }

  return { waveById, maxWave };
}

function getArrowCentroid(arrow: ArrowPath): Point2D {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < arrow.path.length; i++) {
    sx += arrow.path[i].x;
    sy += arrow.path[i].y;
  }
  const len = Math.max(1, arrow.path.length);
  return { x: sx / len, y: sy / len };
}

/**
 * Assigns 5 spatially distributed Special Yellow Burst arrows from Level 21 onward
 * (Levels 1–20 have zero yellow arrows), plus 1 deeply buried subtle Golden Key
 * arrow on levels 28, 38, 48, ..., 498.
 */
export function assignSpecialArrows(level: AmazeGoLevel): AmazeGoLevel {
  const arrows = level.arrows;
  if (arrows.length === 0) return level;

  for (let i = 0; i < arrows.length; i++) {
    delete arrows[i].specialType;
  }

  const { waveById, maxWave } = computeArrowWaveDepths(level.width, level.height, arrows);

  // Compute playable centroid so interiority works cleanly on both rectangular & silhouette boards
  let sumX = 0;
  let sumY = 0;
  let countPts = 0;
  let minX = level.width;
  let maxX = 0;
  let minY = level.height;
  let maxY = 0;
  for (let i = 0; i < arrows.length; i++) {
    for (let j = 0; j < arrows[i].path.length; j++) {
      const p = arrows[i].path[j];
      sumX += p.x;
      sumY += p.y;
      countPts++;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const centerX = countPts > 0 ? sumX / countPts : (level.width - 1) / 2;
  const centerY = countPts > 0 ? sumY / countPts : (level.height - 1) / 2;
  const spanRadius = Math.max(1, Math.hypot((maxX - minX) / 2, (maxY - minY) / 2));

  let goldenId: string | null = null;
  if (isGoldenKeyLevel(level.id)) {
    const minDeepWave =
      maxWave >= 5 ? Math.max(3, Math.floor(maxWave * 0.62)) : Math.max(1, maxWave);

    let bestGolden: ArrowPath | null = null;
    let bestScore = -Infinity;

    for (let pass = 0; pass < 2 && !bestGolden; pass++) {
      const waveFloor = pass === 0 ? minDeepWave : 1;
      for (let i = 0; i < arrows.length; i++) {
        const a = arrows[i];
        const wv = waveById.get(a.id) ?? 0;
        if (wv < waveFloor) continue;

        const c = getArrowCentroid(a);
        const distFromCenter = Math.hypot(c.x - centerX, c.y - centerY) / spanRadius;
        const interiority = Math.max(0, 1 - distFromCenter);
        const edgeDist = Math.min(
          a.head.x - minX,
          maxX - a.head.x,
          a.head.y - minY,
          maxY - a.head.y
        );
        const depthNorm = maxWave > 0 ? wv / maxWave : 1;
        // Sweet spot: buried deeply (70%-95% of maxWave) and tucked well inside the interior
        const waveScore =
          depthNorm >= 0.65 && depthNorm <= 0.96
            ? 140 + depthNorm * 80
            : depthNorm * 110;
        const edgeBonus = Math.min(4, edgeDist) * 14;
        const lengthBonus = a.path.length >= 3 ? 25 : 0;
        const score = waveScore + interiority * 130 + edgeBonus + lengthBonus;

        if (score > bestScore) {
          bestScore = score;
          bestGolden = a;
        }
      }
    }

    if (bestGolden) {
      bestGolden.specialType = 'golden_key';
      goldenId = bestGolden.id;
    }
  }

  if (hasYellowBurstArrows(level.id)) {
    // Pick 5 spatially spread Special Yellow Burst arrows from non-golden arrows (Levels 21+)
    const pool = arrows.filter((a) => a.id !== goldenId);
    const targetYellow = Math.min(5, pool.length);
    const picked: ArrowPath[] = [];
    const pickedIds = new Set<string>();
    const centroids = new Map<string, Point2D>();
    for (const a of pool) {
      centroids.set(a.id, getArrowCentroid(a));
    }

    // Spread across 5 wave buckets so players encounter yellow arrows across early, mid & deep play
    for (let slot = 0; slot < targetYellow; slot++) {
      const desiredWaveNorm = targetYellow > 1 ? (slot / (targetYellow - 1)) * 0.82 : 0.2;
      let bestCand: ArrowPath | null = null;
      let bestCandScore = -Infinity;

      for (let i = 0; i < pool.length; i++) {
        const a = pool[i];
        if (pickedIds.has(a.id)) continue;

        const wv = waveById.get(a.id) ?? 0;
        const wvNorm = maxWave > 0 ? wv / maxWave : 0;
        const waveFit = 100 - Math.abs(wvNorm - desiredWaveNorm) * 110;

        const c = centroids.get(a.id)!;
        let minSpaceDist = spanRadius;
        if (picked.length > 0) {
          minSpaceDist = Infinity;
          for (const p of picked) {
            const pc = centroids.get(p.id)!;
            const d = Math.hypot(c.x - pc.x, c.y - pc.y);
            if (d < minSpaceDist) minSpaceDist = d;
          }
        }
        const spacingBonus = (minSpaceDist / spanRadius) * 120;
        // On slot 0, gently prefer an arrow reachable early (wave <= 2) if available
        const earlyAccessibilityBonus = slot === 0 && wv <= 2 ? 60 : 0;
        const score = waveFit + spacingBonus + earlyAccessibilityBonus;

        if (score > bestCandScore) {
          bestCandScore = score;
          bestCand = a;
        }
      }

      if (bestCand) {
        bestCand.specialType = 'yellow_burst';
        picked.push(bestCand);
        pickedIds.add(bestCand.id);
      }
    }
  }

  return level;
}

/**
 * When a Special Yellow Burst arrow escapes, finds all nearby open/escapable arrows
 * within the burst neighborhood around it so they all fly out together.
 */
export function resolveYellowBurstEscapes(
  levelWidth: number,
  levelHeight: number,
  activeArrows: ArrowPath[],
  triggerArrow: ArrowPath
): ArrowPath[] {
  if (triggerArrow.specialType !== 'yellow_burst') return [];

  const burstRadius = Math.max(3.5, Math.min(9.5, Math.max(levelWidth, levelHeight) * 0.14));
  const distToTrigger = new Map<string, number>();

  for (let i = 0; i < activeArrows.length; i++) {
    const other = activeArrows[i];
    if (other.id === triggerArrow.id) continue;
    let minDist = Infinity;
    for (let p1 = 0; p1 < triggerArrow.path.length; p1++) {
      const c1 = triggerArrow.path[p1];
      for (let p2 = 0; p2 < other.path.length; p2++) {
        const c2 = other.path[p2];
        const d = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        if (d < minDist) minDist = d;
      }
    }
    if (minDist <= burstRadius) {
      distToTrigger.set(other.id, minDist);
    }
  }

  if (distToTrigger.size === 0) return [];

  let remaining = activeArrows.filter((a) => a.id !== triggerArrow.id);
  const burstEscaped: ArrowPath[] = [];
  const escapedIds = new Set<string>();

  // Iteratively sweep any open arrows inside the local neighborhood around the yellow arrow
  let safety = distToTrigger.size;
  while (safety-- > 0) {
    const openNow = getEscapableArrows(levelWidth, levelHeight, remaining);
    const newlyOpened = openNow.filter(
      (a) => distToTrigger.has(a.id) && !escapedIds.has(a.id)
    );
    if (newlyOpened.length === 0) break;

    for (const arrow of newlyOpened) {
      escapedIds.add(arrow.id);
      burstEscaped.push(arrow);
    }
    remaining = remaining.filter((a) => !escapedIds.has(a.id));
  }

  burstEscaped.sort(
    (a, b) => (distToTrigger.get(a.id) ?? 0) - (distToTrigger.get(b.id) ?? 0)
  );
  return burstEscaped;
}
