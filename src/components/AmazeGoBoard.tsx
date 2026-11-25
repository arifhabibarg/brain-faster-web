import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowPath,
  AmazeGoLevel,
  Point2D,
  GridCoord,
  Direction,
  checkArrowEscape,
  getDirectionOffset,
  getSlidingArrowPoints,
  getCollisionBounceArrowPoints,
  getCollisionWarningColor,
  resolveYellowBurstEscapes,
  COLLISION_IMPACT_AT,
} from '../game/amazeGoLogic';
import { findBestTappedArrow } from '../game/arrowHitTest';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface AmazeGoBoardProps {
  level: AmazeGoLevel;
  activeArrows: ArrowPath[];
  customArrowColor?: string | null;
  hintArrowId: string | null;
  showGuideline: boolean;
  boardResetNonce?: number;
  isInteractionLocked?: boolean;
  onArrowEscape: (arrow: ArrowPath, burstArrows?: ArrowPath[]) => void;
  onArrowBlocked: (arrow: ArrowPath, blockerId?: string, impactDurationMs?: number) => void;
}

interface FlyingArrowEntry {
  arrow: ArrowPath;
  startTime: number;
  durationMs: number;
  extraExitPx: number;
  progress: number;
}

interface CollidingArrowEntry {
  arrow: ArrowPath;
  blockerId?: string;
  blockingCell?: GridCoord;
  startTime: number;
  durationMs: number;
  progress: number;
  impacted: boolean;
}

interface BurstWaveEntry {
  id: string;
  cx: number;
  cy: number;
  maxRadiusPx: number;
  startTime: number;
  durationMs: number;
  progress: number;
}

/**
 * Builds an SVG path string with crisp, tight rounded 90-degree corners
 */
function buildCrispPolylinePath(points: Point2D[], radius: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 0.001 || len2 < 0.001) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const r = Math.min(radius, len1 * 0.42, len2 * 0.42);
    const startX = curr.x - (v1x / len1) * r;
    const startY = curr.y - (v1y / len1) * r;
    const endX = curr.x + (v2x / len2) * r;
    const endY = curr.y + (v2y / len2) * r;

    d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y} ${endX} ${endY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Computes crisp triangular arrowhead points centered at tip pointing in dir
 */
function getArrowheadPolygon(tip: Point2D, dir: Direction, size: number): string {
  const { dx, dy } = getDirectionOffset(dir);
  const px = -dy;
  const py = dx;

  const frontX = tip.x + dx * (size * 0.56);
  const frontY = tip.y + dy * (size * 0.56);

  const backCenterX = tip.x - dx * (size * 0.48);
  const backCenterY = tip.y - dy * (size * 0.48);

  const notchX = tip.x - dx * (size * 0.28);
  const notchY = tip.y - dy * (size * 0.28);

  const wing1X = backCenterX + px * (size * 0.54);
  const wing1Y = backCenterY + py * (size * 0.54);

  const wing2X = backCenterX - px * (size * 0.54);
  const wing2Y = backCenterY - py * (size * 0.54);

  return `${frontX},${frontY} ${wing1X},${wing1Y} ${notchX},${notchY} ${wing2X},${wing2Y}`;
}

export const AmazeGoBoard: React.FC<AmazeGoBoardProps> = ({
  level,
  activeArrows,
  customArrowColor,
  hintArrowId,
  showGuideline,
  boardResetNonce = 0,
  isInteractionLocked = false,
  onArrowEscape,
  onArrowBlocked,
}) => {
  const [hoveredArrowId, setHoveredArrowId] = useState<string | null>(null);
  const [flyingList, setFlyingList] = useState<FlyingArrowEntry[]>([]);
  const flyingRef = useRef<FlyingArrowEntry[]>([]);
  const [collidingList, setCollidingList] = useState<CollidingArrowEntry[]>([]);
  const collidingRef = useRef<CollidingArrowEntry[]>([]);
  const [burstWaves, setBurstWaves] = useState<BurstWaveEntry[]>([]);
  const burstWavesRef = useRef<BurstWaveEntry[]>([]);
  const [bumpedArrowIds, setBumpedArrowIds] = useState<Set<string>>(() => new Set());
  const [highlightBlockerId, setHighlightBlockerId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const wasPinchingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const lastSinglePointerRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewportDims, setViewportDims] = useState<{ w: number; h: number }>({ w: 460, h: 560 });

  const gridWidth = level.width;
  const gridHeight = level.height;

  // Fit ultra-dense 114x148+ Boss grids cleanly inside viewport at 1x overview (players zoom up to 8x to play!)
  const availW = Math.max(260, viewportDims.w - 16);
  const availH = Math.max(240, viewportDims.h - 16);
  const cellSize = Math.max(
    2.5,
    Math.min(38, Math.floor(Math.min(availW / gridWidth, availH / gridHeight) * 4) / 4)
  );

  const boardPixelW = gridWidth * cellSize;
  const boardPixelH = gridHeight * cellSize;

  // Crisp hairline strokes & tiny dense dots at 1x overview that expand sharply at 3x-8x zoom
  const strokeWidth = Math.max(0.7, Math.min(3.5, cellSize * 0.21));
  const cornerRadius = cellSize * 0.16;
  const headSize = Math.max(1.85, Math.min(8.5, cellSize * 0.42));

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          setViewportDims({ w: rect.width, h: rect.height });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset board view & cancel in-flight animations when level loads or restarts
  useEffect(() => {
    setHoveredArrowId(null);
    flyingRef.current = [];
    setFlyingList([]);
    collidingRef.current = [];
    setCollidingList([]);
    burstWavesRef.current = [];
    setBurstWaves([]);
    setBumpedArrowIds(new Set());
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHighlightBlockerId(null);
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    wasPinchingRef.current = false;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [level.id, level.arrows, boardResetNonce]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const startAnimationLoop = useCallback(() => {
    if (rafRef.current !== null) return;

    const tick = (now: number) => {
      const nextFly: FlyingArrowEntry[] = [];
      for (const entry of flyingRef.current) {
        const progress = Math.max(0, Math.min(1, (now - entry.startTime) / entry.durationMs));
        if (progress < 1) {
          nextFly.push({ ...entry, progress });
        }
      }
      flyingRef.current = nextFly;
      setFlyingList(nextFly);

      const nextCollide: CollidingArrowEntry[] = [];
      const finishedBumpedIds: string[] = [];
      let activeImpactBlocker: string | null = null;

      for (const entry of collidingRef.current) {
        const progress = Math.min(1, (now - entry.startTime) / entry.durationMs);
        let impacted = entry.impacted;
        if (!impacted && progress >= COLLISION_IMPACT_AT) {
          impacted = true;
          amazeGoAudio.playBlocked();
          amazeGoAudio.vibrate([26, 30, 36]);
        }
        if (progress >= COLLISION_IMPACT_AT && progress <= 0.78 && entry.blockerId) {
          activeImpactBlocker = entry.blockerId;
        }
        if (progress < 1) {
          nextCollide.push({ ...entry, progress, impacted });
        } else {
          finishedBumpedIds.push(entry.arrow.id);
        }
      }

      collidingRef.current = nextCollide;
      setCollidingList(nextCollide);
      setHighlightBlockerId(activeImpactBlocker);

      const nextWaves: BurstWaveEntry[] = [];
      for (const wave of burstWavesRef.current) {
        const progress = Math.max(0, Math.min(1, (now - wave.startTime) / wave.durationMs));
        if (progress < 1) {
          nextWaves.push({ ...wave, progress });
        }
      }
      burstWavesRef.current = nextWaves;
      setBurstWaves(nextWaves);

      if (finishedBumpedIds.length > 0) {
        setBumpedArrowIds((prev) => {
          const updated = new Set(prev);
          for (const id of finishedBumpedIds) updated.add(id);
          return updated;
        });
      }

      if (nextFly.length > 0 || nextCollide.length > 0 || nextWaves.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Rapid-fire multi-arrow tap handler: smooth viewport-exit glide or physical collision + bounce back
  const triggerArrowTap = useCallback(
    (arrow: ArrowPath) => {
      if (isInteractionLocked) return;
      if (
        flyingRef.current.some((f) => f.arrow.id === arrow.id) ||
        collidingRef.current.some((c) => c.arrow.id === arrow.id)
      ) {
        return;
      }

      const result = checkArrowEscape(gridWidth, gridHeight, activeArrows, arrow.id);

      if (result.canEscape) {
        const burstArrows =
          arrow.specialType === 'yellow_burst'
            ? resolveYellowBurstEscapes(gridWidth, gridHeight, activeArrows, arrow)
            : [];

        const hitGoldenKey =
          arrow.specialType === 'golden_key' ||
          burstArrows.some((b) => b.specialType === 'golden_key');

        if (hitGoldenKey) {
          amazeGoAudio.playGoldenKeyVictory();
          amazeGoAudio.vibrate([16, 26, 24]);
        } else if (arrow.specialType === 'yellow_burst') {
          amazeGoAudio.playYellowBurst(burstArrows.length);
          amazeGoAudio.vibrate(burstArrows.length > 0 ? [12, 22, 16] : 12);
        } else {
          amazeGoAudio.playArrowEscape();
          amazeGoAudio.vibrate(10);
        }

        const z = zoomRef.current;
        const px = panRef.current.x;
        const py = panRef.current.y;
        const rect = containerRef.current?.getBoundingClientRect();
        const viewW = rect && rect.width > 50 ? rect.width : viewportDims.w;
        const viewH = rect && rect.height > 50 ? rect.height : viewportDims.h;

        // Visible mobile display boundaries in unscaled SVG coordinates
        const visLeft = boardPixelW / 2 - (viewW / 2 + px) / z;
        const visRight = boardPixelW / 2 + (viewW / 2 - px) / z;
        const visTop = boardPixelH / 2 - (viewH / 2 + py) / z;
        const visBottom = boardPixelH / 2 + (viewH / 2 - py) / z;

        const nowMs = performance.now();
        const buildFlyEntry = (targetArrow: ArrowPath, delayMs: number): FlyingArrowEntry => {
          const headPxX = targetArrow.head.x * cellSize + cellSize / 2;
          const headPxY = targetArrow.head.y * cellSize + cellSize / 2;
          const { dx, dy } = getDirectionOffset(targetArrow.direction);

          let distToDisplayEdge = cellSize * 4;
          if (dx > 0) {
            distToDisplayEdge = Math.max(boardPixelW - headPxX, visRight - headPxX) + headSize + 20;
          } else if (dx < 0) {
            distToDisplayEdge = Math.max(headPxX, headPxX - visLeft) + headSize + 20;
          } else if (dy > 0) {
            distToDisplayEdge = Math.max(boardPixelH - headPxY, visBottom - headPxY) + headSize + 20;
          } else if (dy < 0) {
            distToDisplayEdge = Math.max(headPxY, headPxY - visTop) + headSize + 20;
          }

          const extraExitPx = Math.max(cellSize * 4, distToDisplayEdge);
          const bodyLength = (targetArrow.path.length - 1) * cellSize;
          const screenTravelPx = (extraExitPx + bodyLength + cellSize) * z;
          // Consistent ~395 CSS px/sec glide speed so tiny 2-dot arrows stay clearly visible all the way off screen
          const durationMs = Math.max(620, Math.min(1480, Math.round((screenTravelPx / 395) * 1000)));

          return {
            arrow: targetArrow,
            startTime: nowMs + delayMs,
            durationMs,
            extraExitPx,
            progress: 0.001,
          };
        };

        const newFlyEntries: FlyingArrowEntry[] = [buildFlyEntry(arrow, 0)];
        for (let bi = 0; bi < burstArrows.length; bi++) {
          newFlyEntries.push(buildFlyEntry(burstArrows[bi], 40 + bi * 32));
        }

        if (arrow.specialType === 'yellow_burst') {
          const burstGridRadius = Math.max(3.5, Math.min(9.5, Math.max(gridWidth, gridHeight) * 0.14));
          burstWavesRef.current = [
            ...burstWavesRef.current,
            {
              id: `wave-${arrow.id}-${nowMs}`,
              cx: arrow.head.x * cellSize + cellSize / 2,
              cy: arrow.head.y * cellSize + cellSize / 2,
              maxRadiusPx: burstGridRadius * cellSize,
              startTime: nowMs,
              durationMs: 520,
              progress: 0.001,
            },
          ];
          setBurstWaves(burstWavesRef.current);
        }

        flyingRef.current = [...flyingRef.current, ...newFlyEntries];
        setFlyingList(flyingRef.current);
        startAnimationLoop();
        onArrowEscape(arrow, burstArrows);
      } else {
        const z = zoomRef.current;
        const cellsGap = result.blockingCell
          ? Math.abs(result.blockingCell.x - arrow.head.x) + Math.abs(result.blockingCell.y - arrow.head.y)
          : 1;
        const bumpSvgPx =
          cellsGap <= 1
            ? Math.max(cellSize * 0.62, Math.min(cellSize * 1.15, 3.6 / Math.max(1, z)))
            : Math.max(cellSize * 0.65, (cellsGap - 0.36) * cellSize);
        const screenBumpPx = bumpSvgPx * z;
        const durationMs = Math.max(500, Math.min(880, Math.round(450 + (screenBumpPx / 420) * 420)));

        collidingRef.current = [
          ...collidingRef.current,
          {
            arrow,
            blockerId: result.blockedByArrowId,
            blockingCell: result.blockingCell,
            startTime: performance.now(),
            durationMs,
            progress: 0.001,
            impacted: false,
          },
        ];
        setCollidingList(collidingRef.current);
        startAnimationLoop();
        onArrowBlocked(arrow, result.blockedByArrowId, durationMs);
      }
    },
    [
      isInteractionLocked,
      gridWidth,
      gridHeight,
      activeArrows,
      viewportDims.w,
      viewportDims.h,
      boardPixelW,
      boardPixelH,
      cellSize,
      headSize,
      onArrowEscape,
      onArrowBlocked,
      startAnimationLoop,
    ]
  );
  const dotRadius = showGuideline
    ? Math.max(0.35, Math.min(2.0, cellSize * 0.08))
    : Math.max(0.28, Math.min(1.25, cellSize * 0.055));

  // Single-node SVG path for all up to 2,052 dots (eliminates 2,000 DOM nodes for 60fps speed!)
  const dotMatrixPath = useMemo(() => {
    const parts: string[] = [];
    const mask = level.activeMask;
    for (let y = 0; y < gridHeight; y++) {
      const cy = y * cellSize + cellSize / 2;
      for (let x = 0; x < gridWidth; x++) {
        if (mask && mask[y * gridWidth + x] === 0) continue;
        const cx = x * cellSize + cellSize / 2;
        parts.push(`M ${cx} ${cy} h 0.001`);
      }
    }
    return parts.join(' ');
  }, [gridWidth, gridHeight, cellSize, level.activeMask]);

  // Precompute stationary SVG geometry for all arrows in this level once per level/size
  const staticArrowGeo = useMemo(() => {
    const map = new Map<
      string,
      { pathD: string; headPoly: string }
    >();
    for (const arrow of level.arrows) {
      const slideData = getSlidingArrowPoints(arrow, gridWidth, gridHeight, cellSize, 0);
      const pts = slideData.points;
      const tip = slideData.headTip;
      const { dx, dy } = getDirectionOffset(arrow.direction);
      const trimmedPts = pts.map((p, idx) =>
        idx === pts.length - 1
          ? { x: p.x - dx * (headSize * 0.25), y: p.y - dy * (headSize * 0.25) }
          : p
      );
      map.set(arrow.id, {
        pathD: buildCrispPolylinePath(trimmedPts, cornerRadius),
        headPoly: getArrowheadPolygon(tip, arrow.direction, headSize),
      });
    }
    return map;
  }, [level.arrows, gridWidth, gridHeight, cellSize, headSize, cornerRadius]);

  // Trajectory preview for hovered (if guideline enabled) or hinted arrow
  const previewArrow = hintArrowId
    ? activeArrows.find((a) => a.id === hintArrowId)
    : showGuideline && hoveredArrowId
    ? activeArrows.find((a) => a.id === hoveredArrowId)
    : null;

  const trajectoryResult = previewArrow
    ? checkArrowEscape(gridWidth, gridHeight, activeArrows, previewArrow.id)
    : null;

  // Allow smooth 1-finger panning in all 4 directions across up to 8x zoom
  const clampPan = useCallback(
    (nextPan: { x: number; y: number }, targetZoom: number) => {
      const scaledW = boardPixelW * targetZoom;
      const scaledH = boardPixelH * targetZoom;
      const maxX = Math.max(120, Math.round(scaledW * 0.52));
      const maxY = Math.max(120, Math.round(scaledH * 0.52));
      return {
        x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
        y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
      };
    },
    [boardPixelW, boardPixelH]
  );

  const applyButtonZoom = useCallback(
    (targetRaw: number) => {
      const prevZoom = zoomRef.current;
      const nextZoom = Math.max(1, Math.min(8, Math.round(targetRaw * 2) / 2));
      const ratio = prevZoom > 0 ? nextZoom / prevZoom : 1;
      const nextPan =
        nextZoom <= 1.01
          ? { x: 0, y: 0 }
          : clampPan({ x: panRef.current.x * ratio, y: panRef.current.y * ratio }, nextZoom);
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
    },
    [clampPan]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore synthetic pointer events without active pointerId
    }
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      pinchStateRef.current = { dist: Math.max(10, dist), midX, midY };
      wasPinchingRef.current = true;
      lastSinglePointerRef.current = null;
    } else if (activePointersRef.current.size === 1) {
      dragDistanceRef.current = 0;
      lastSinglePointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2 && pinchStateRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const currDist = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;

      const prevZoom = zoomRef.current;
      const scaleFactor = currDist / pinchStateRef.current.dist;
      const rawNextZoom = Math.max(1, Math.min(8, prevZoom * scaleFactor));
      const nextZoom = rawNextZoom <= 1.03 ? 1 : +rawNextZoom.toFixed(3);

      // Keep pinch midpoint anchored under fingers + follow two-finger pan
      const rect = containerRef.current?.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : midX;
      const centerY = rect ? rect.top + rect.height / 2 : midY;

      const focalX = midX - centerX;
      const focalY = midY - centerY;
      const ratio = prevZoom > 0 ? nextZoom / prevZoom : 1;

      const panDx = midX - pinchStateRef.current.midX;
      const panDy = midY - pinchStateRef.current.midY;

      const rawPan = {
        x: focalX - (focalX - panRef.current.x) * ratio + panDx,
        y: focalY - (focalY - panRef.current.y) * ratio + panDy,
      };
      const nextPan =
        nextZoom === 1 && prevZoom > 1.03 ? { x: 0, y: 0 } : clampPan(rawPan, nextZoom);

      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);

      pinchStateRef.current = { dist: currDist, midX, midY };
      return;
    }

    if (
      activePointersRef.current.size === 1 &&
      lastSinglePointerRef.current &&
      lastSinglePointerRef.current.id === e.pointerId &&
      !wasPinchingRef.current
    ) {
      const dx = e.clientX - lastSinglePointerRef.current.x;
      const dy = e.clientY - lastSinglePointerRef.current.y;
      dragDistanceRef.current += Math.hypot(dx, dy);
      lastSinglePointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };

      // Pan smoothly in all directions at ANY zoom level (1x or zoomed in)
      const nextPan = clampPan(
        { x: panRef.current.x + dx, y: panRef.current.y + dy },
        zoomRef.current
      );
      panRef.current = nextPan;
      setPan(nextPan);
    }
  };

  const resolveTapAtClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) return;

      const tapGridX = ((clientX - rect.left) / rect.width) * gridWidth;
      const tapGridY = ((clientY - rect.top) / rect.height) * gridHeight;

      const bestArrow = findBestTappedArrow(
        tapGridX,
        tapGridY,
        activeArrows,
        gridWidth,
        gridHeight,
        1.2,
        cellSize * zoomRef.current
      );
      if (bestArrow) {
        triggerArrowTap(bestArrow);
      }
    },
    [activeArrows, gridWidth, gridHeight, cellSize, triggerArrowTap]
  );

  const handlePointerUpOrCancel = (e: React.PointerEvent, isPointerUp: boolean) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
    const wasTrackedSingle =
      activePointersRef.current.size === 1 &&
      activePointersRef.current.has(e.pointerId) &&
      !wasPinchingRef.current;

    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }
    if (activePointersRef.current.size === 1) {
      const [remId, remPt] = Array.from(activePointersRef.current.entries())[0];
      lastSinglePointerRef.current = { id: remId, x: remPt.x, y: remPt.y };
    } else if (activePointersRef.current.size === 0) {
      lastSinglePointerRef.current = null;

      if (isPointerUp && wasTrackedSingle && dragDistanceRef.current <= 8) {
        resolveTapAtClientPoint(e.clientX, e.clientY);
      }

      if (wasPinchingRef.current) {
        setTimeout(() => {
          wasPinchingRef.current = false;
        }, 120);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    const prevZoom = zoomRef.current;
    const rawNext = Math.max(1, Math.min(8, +(prevZoom + delta).toFixed(2)));
    const nextZoom = rawNext <= 1.03 ? 1 : rawNext;

    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX;
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY;
    const focalX = e.clientX - centerX;
    const focalY = e.clientY - centerY;
    const ratio = prevZoom > 0 ? nextZoom / prevZoom : 1;

    const nextPan =
      nextZoom === 1 && prevZoom > 1.03
        ? { x: 0, y: 0 }
        : clampPan(
            {
              x: focalX - (focalX - panRef.current.x) * ratio,
              y: focalY - (focalY - panRef.current.y) * ratio,
            },
            nextZoom
          );

    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoom(nextZoom);
    setPan(nextPan);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden px-2 py-1 select-none"
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => handlePointerUpOrCancel(e, true)}
      onPointerCancel={(e) => handlePointerUpOrCancel(e, false)}
    >
      {/* Clean Seamless Parchment Board */}
      <div
        className="relative rounded-2xl p-1"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          ref={svgRef}
          width={boardPixelW}
          height={boardPixelH}
          viewBox={`0 0 ${boardPixelW} ${boardPixelH}`}
          className="overflow-visible block"
          style={{ touchAction: 'none' }}
          data-testid="amazego-dot-board"
        >
          <defs>
            <linearGradient
              id="golden-shimmer-grad"
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={Math.max(40, boardPixelW * 0.45)}
              y2={Math.max(40, boardPixelH * 0.35)}
              spreadMethod="reflect"
            >
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="35%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#dfb042" />
              <stop offset="65%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from={`-${Math.max(40, boardPixelW * 0.5)} 0`}
                to={`${Math.max(40, boardPixelW * 0.5)} 0`}
                dur="3.6s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>

          {/* Single-Node Subtle Dot Matrix (Art/Showcase Masked) */}
          <path
            d={dotMatrixPath}
            fill="none"
            stroke={
              level.isAnimatedShowcase
                ? showGuideline
                  ? '#a7c4ae'
                  : '#c3dbc8'
                : showGuideline
                ? '#cbbba0'
                : '#dfd4be'
            }
            strokeWidth={dotRadius * 2}
            strokeLinecap="round"
            aria-hidden="true"
          />

          {/* Dashed Guideline / Hint Ray */}
          {previewArrow && trajectoryResult && (
            <g className="trajectory-ray pointer-events-none">
              <line
                x1={previewArrow.head.x * cellSize + cellSize / 2}
                y1={previewArrow.head.y * cellSize + cellSize / 2}
                x2={
                  trajectoryResult.trajectory.length > 0
                    ? trajectoryResult.trajectory[trajectoryResult.trajectory.length - 1].x *
                        cellSize +
                      cellSize / 2
                    : previewArrow.head.x * cellSize +
                      cellSize / 2 +
                      getDirectionOffset(previewArrow.direction).dx * cellSize
                }
                y2={
                  trajectoryResult.trajectory.length > 0
                    ? trajectoryResult.trajectory[trajectoryResult.trajectory.length - 1].y *
                        cellSize +
                      cellSize / 2
                    : previewArrow.head.y * cellSize +
                      cellSize / 2 +
                      getDirectionOffset(previewArrow.direction).dy * cellSize
                }
                stroke={
                  hintArrowId === previewArrow.id
                    ? '#f59e0b'
                    : trajectoryResult.canEscape
                    ? previewArrow.specialType === 'yellow_burst'
                      ? '#eab308'
                      : previewArrow.specialType === 'golden_key'
                      ? '#d97706'
                      : customArrowColor || previewArrow.color
                    : '#dc2626'
                }
                strokeWidth={Math.max(1.1, strokeWidth * 0.72)}
                strokeDasharray="3 3"
                strokeLinecap="round"
                opacity={0.78}
              />
            </g>
          )}

          {/* Stationary Active Arrows Layer (Memoized paths for zero-lag rapid tapping) */}
          <g className="arrows-layer">
            {activeArrows.map((arrow) => {
              if (collidingList.some((c) => c.arrow.id === arrow.id)) return null;
              const geo = staticArrowGeo.get(arrow.id);
              if (!geo) return null;

              const isHinted = arrow.id === hintArrowId;
              const isBlocker = arrow.id === highlightBlockerId;
              const isBumped = bumpedArrowIds.has(arrow.id);
              const isHovered = arrow.id === hoveredArrowId;
              const isYellowBurst = arrow.specialType === 'yellow_burst';
              const isGoldenKey = arrow.specialType === 'golden_key';

              const baseColor = isGoldenKey
                ? '#c98d24'
                : isYellowBurst
                ? '#facc15'
                : customArrowColor || arrow.color;
              const warningColor = getCollisionWarningColor(baseColor);
              const activeColor = isBlocker
                ? '#f59e0b'
                : isBumped
                ? warningColor
                : isHinted
                ? '#f59e0b'
                : isGoldenKey
                ? 'url(#golden-shimmer-grad)'
                : baseColor;

              return (
                <g
                  key={arrow.id}
                  id={`arrow-${arrow.id}`}
                  data-bumped={isBumped ? '1' : undefined}
                  data-special={arrow.specialType || undefined}
                  style={{ cursor: 'pointer' }}
                  className={
                    isHinted
                      ? 'filter drop-shadow-[0_0_5px_rgba(245,158,11,0.75)]'
                      : isGoldenKey
                      ? 'filter drop-shadow-[0_0_1.5px_rgba(202,138,4,0.28)]'
                      : undefined
                  }
                  onMouseEnter={() => setHoveredArrowId(arrow.id)}
                  onMouseLeave={() => setHoveredArrowId(null)}
                >
                  {isYellowBurst && !isBumped && (
                    <>
                      <path
                        d={geo.pathD}
                        fill="none"
                        stroke="#ca8a04"
                        strokeWidth={strokeWidth * 1.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.42}
                      />
                      <polygon
                        points={geo.headPoly}
                        fill="#ca8a04"
                        stroke="#ca8a04"
                        strokeWidth={Math.max(0.6, strokeWidth * 0.72)}
                        strokeLinejoin="round"
                        opacity={0.42}
                      />
                    </>
                  )}

                  <path
                    d={geo.pathD}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={
                      isHovered || isHinted || isBlocker
                        ? strokeWidth * 1.4
                        : strokeWidth
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <polygon
                    points={geo.headPoly}
                    fill={activeColor}
                    stroke={isYellowBurst && !isBumped ? '#b45309' : activeColor}
                    strokeWidth={
                      isYellowBurst && !isBumped
                        ? Math.max(0.45, strokeWidth * 0.35)
                        : Math.min(0.45, strokeWidth * 0.4)
                    }
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Expanding Golden Shockwave Rings on Yellow Burst */}
          {burstWaves.length > 0 && (
            <g className="burst-waves pointer-events-none">
              {burstWaves.map((w) => (
                <g key={w.id}>
                  <circle
                    cx={w.cx}
                    cy={w.cy}
                    r={Math.max(3, w.maxRadiusPx * (0.18 + w.progress * 0.82))}
                    fill="#fef08a"
                    fillOpacity={Math.max(0, 0.22 * (1 - w.progress))}
                    stroke="#eab308"
                    strokeWidth={Math.max(1.2, strokeWidth * 1.25)}
                    strokeOpacity={Math.max(0, 1 - w.progress)}
                  />
                </g>
              ))}
            </g>
          )}

          {/* Collision-Slide & Bounce-Back Layer for Wrong-Clicked Arrows */}
          {collidingList.length > 0 && (
            <g className="colliding-arrows pointer-events-none">
              {collidingList.map((entry) => {
                const { arrow, blockingCell, progress } = entry;
                const colData = getCollisionBounceArrowPoints(
                  arrow,
                  blockingCell,
                  cellSize,
                  progress,
                  zoom
                );
                const pts = colData.points;
                const tip = colData.headTip;
                const { dx, dy } = getDirectionOffset(arrow.direction);
                const trimmedPts = pts.map((p, idx) =>
                  idx === pts.length - 1
                    ? { x: p.x - dx * (headSize * 0.25), y: p.y - dy * (headSize * 0.25) }
                    : p
                );
                const pathD = buildCrispPolylinePath(trimmedPts, cornerRadius);
                const headPoly = getArrowheadPolygon(tip, arrow.direction, headSize);
                const baseColor = customArrowColor || arrow.color;
                const currentColor = colData.hasImpacted
                  ? getCollisionWarningColor(baseColor)
                  : baseColor;

                const showImpactRing =
                  blockingCell &&
                  progress >= COLLISION_IMPACT_AT &&
                  progress <= 0.8;
                const ringRatio = showImpactRing
                  ? (progress - COLLISION_IMPACT_AT) / (0.8 - COLLISION_IMPACT_AT)
                  : 0;

                return (
                  <g
                    key={`collide-${arrow.id}`}
                    data-testid={`colliding-arrow-${arrow.id}`}
                    data-impacted={colData.hasImpacted ? '1' : '0'}
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke={currentColor}
                      strokeWidth={strokeWidth * (colData.hasImpacted ? 1.18 : 1.05)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={headPoly}
                      fill={currentColor}
                      stroke={currentColor}
                      strokeWidth={Math.min(0.45, strokeWidth * 0.4)}
                      strokeLinejoin="round"
                    />
                    {showImpactRing && blockingCell && (
                      <circle
                        cx={blockingCell.x * cellSize + cellSize / 2}
                        cy={blockingCell.y * cellSize + cellSize / 2}
                        r={Math.max(2.5, cellSize * (0.4 + ringRatio * 1.15))}
                        fill="none"
                        stroke={currentColor}
                        strokeWidth={Math.max(1, strokeWidth * 0.85)}
                        opacity={Math.max(0, 1 - ringRatio)}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Concurrent Flying Arrows Layer (Smooth glide all the way off mobile display) */}
          {flyingList.length > 0 && (
            <g className="flying-arrows pointer-events-none">
              {flyingList.map(({ arrow, progress, extraExitPx }) => {
                const slideData = getSlidingArrowPoints(
                  arrow,
                  gridWidth,
                  gridHeight,
                  cellSize,
                  progress,
                  extraExitPx
                );
                const pts = slideData.points;
                const tip = slideData.headTip;
                const { dx, dy } = getDirectionOffset(arrow.direction);
                const trimmedPts = pts.map((p, idx) =>
                  idx === pts.length - 1
                    ? { x: p.x - dx * (headSize * 0.25), y: p.y - dy * (headSize * 0.25) }
                    : p
                );
                const pathD = buildCrispPolylinePath(trimmedPts, cornerRadius);
                const headPoly = getArrowheadPolygon(tip, arrow.direction, headSize);
                const flyColor =
                  arrow.specialType === 'golden_key'
                    ? 'url(#golden-shimmer-grad)'
                    : arrow.specialType === 'yellow_burst'
                    ? '#facc15'
                    : customArrowColor || arrow.color;

                return (
                  <g
                    key={`fly-${arrow.id}`}
                    data-testid={`flying-arrow-${arrow.id}`}
                    style={{ opacity: slideData.opacity }}
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke={flyColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={headPoly}
                      fill={flyColor}
                      stroke={arrow.specialType === 'yellow_burst' ? '#b45309' : flyColor}
                      strokeWidth={Math.min(0.45, strokeWidth * 0.4)}
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Board Cleared Overlay */}
        {activeArrows.length === 0 && flyingList.length === 0 && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl animate-fade-in ${
              level.isAnimatedShowcase ? 'bg-[#edf6ef]/95' : 'bg-[#f6eedb]/95'
            }`}
          >
            <span className="text-4xl mb-2 animate-bounce">🎉</span>
            <p className="text-base font-black text-[#6b563c]">BOARD CLEARED!</p>
          </div>
        )}
      </div>

      {/* Floating Zoom Controls for dense zoom-to-play grids */}
      {gridWidth >= 28 && (
        <div
          className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 rounded-xl bg-[#fffbf2]/90 border border-[#d8cbb2] shadow-md px-1 py-0.5 backdrop-blur-sm"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          data-testid="board-zoom-controls"
        >
          <button
            type="button"
            onClick={() => {
              amazeGoAudio.playClick();
              applyButtonZoom(zoom - 0.75);
            }}
            disabled={zoom <= 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black text-[#4a3b2c] hover:bg-[#efe4ce] disabled:opacity-35 active:scale-95 transition-all"
            aria-label="Zoom Out"
            data-testid="zoom-out-btn"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              amazeGoAudio.playClick();
              applyButtonZoom(1);
            }}
            className="px-1.5 h-7 flex items-center justify-center rounded-lg text-[11px] font-black text-[#5c4936] hover:bg-[#efe4ce] tabular-nums active:scale-95 transition-all"
            aria-label="Reset Zoom"
            data-testid="zoom-reset-btn"
          >
            {zoom.toFixed(1)}×
          </button>
          <button
            type="button"
            onClick={() => {
              amazeGoAudio.playClick();
              applyButtonZoom(zoom + 1.0);
            }}
            disabled={zoom >= 8}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black text-[#4a3b2c] hover:bg-[#efe4ce] disabled:opacity-35 active:scale-95 transition-all"
            aria-label="Zoom In"
            data-testid="zoom-in-btn"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
};
