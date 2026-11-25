import { ArrowPath, checkArrowEscape, getDirectionOffset } from './amazeGoLogic';

/**
 * Exact perpendicular distance from point (px, py) to segment (ax, ay)-(bx, by)
 */
function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 1e-9) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lenSq));
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Computes minimum distance (in grid units) from tap point (tapX, tapY) to an arrow's body + head.
 * Coordinates are in grid space where cell (cx, cy) has center (cx + 0.5, cy + 0.5).
 */
export function distanceToArrowInGrid(
  tapX: number,
  tapY: number,
  arrow: ArrowPath
): number {
  const path = arrow.path;
  if (path.length === 0) return Infinity;

  let minDist = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i].x + 0.5;
    const ay = path[i].y + 0.5;
    const bx = path[i + 1].x + 0.5;
    const by = path[i + 1].y + 0.5;
    const d = distToSegment(tapX, tapY, ax, ay, bx, by);
    if (d < minDist) minDist = d;
  }

  // Give a slight precision bonus to tapping directly on the arrowhead tip
  const { dx, dy } = getDirectionOffset(arrow.direction);
  const tipX = arrow.head.x + 0.5 + dx * 0.18;
  const tipY = arrow.head.y + 0.5 + dy * 0.18;
  const tipDist = Math.hypot(tapX - tipX, tapY - tipY) * 0.88;
  if (tipDist < minDist) minDist = tipDist;

  return minDist;
}

/**
 * Resolves the intended arrow from a touch/click in dense dot grids.
 * 1. Ignores taps far into empty background (> tapRadius grid units from any arrow).
 * 2. Picks the physically closest arrow geometry (not SVG DOM order).
 * 3. If the tapped arrow is blocked (wrong arrow), searches the nearby neighborhood
 *    (rescueRadius: at least 1.65 grid cells, and up to 2.75 cells on dense small-cell screens)
 *    for the nearest escapable arrow — launching it cleanly with NO foul if found.
 *    Only triggers a blocked foul if no escapable arrow exists nearby.
 */
export function findBestTappedArrow(
  tapGridX: number,
  tapGridY: number,
  activeArrows: ArrowPath[],
  gridWidth: number,
  gridHeight: number,
  maxRadius = 1.2,
  effectiveCellPx?: number
): ArrowPath | null {
  if (activeArrows.length === 0) return null;

  const screenAssistGrid =
    effectiveCellPx && effectiveCellPx > 0 ? 22 / effectiveCellPx : 1.65;
  const tapRadius = Math.max(maxRadius, Math.min(2.4, screenAssistGrid));
  const rescueRadius = Math.max(1.65, Math.min(2.75, screenAssistGrid));
  const searchRadius = Math.max(tapRadius, rescueRadius);

  const candidates: { arrow: ArrowPath; dist: number }[] = [];
  for (let i = 0; i < activeArrows.length; i++) {
    const arrow = activeArrows[i];
    const dist = distanceToArrowInGrid(tapGridX, tapGridY, arrow);
    if (dist <= searchRadius) {
      candidates.push({ arrow, dist });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dist - b.dist);

  const best = candidates[0];
  if (best.dist > tapRadius) return null;
  if (candidates.length === 1) return best.arrow;

  // If the directly tapped arrow is escapable, launch it right away
  const bestCheck = checkArrowEscape(gridWidth, gridHeight, activeArrows, best.arrow.id);
  if (bestCheck.canEscape) {
    return best.arrow;
  }

  // Directly tapped arrow is blocked: rescue the closest escapable arrow in the nearby area
  for (let i = 1; i < candidates.length; i++) {
    const cand = candidates[i];
    if (cand.dist > rescueRadius) break;
    const candCheck = checkArrowEscape(gridWidth, gridHeight, activeArrows, cand.arrow.id);
    if (candCheck.canEscape) {
      return cand.arrow;
    }
  }

  return best.arrow;
}
