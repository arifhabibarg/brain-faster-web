import {
  AmazeGoLevel,
  AmazeGoLevelMeta,
  DifficultyTier,
  getMaxHeartsForLevel,
} from './amazeGoLogic';
import {
  generateDotArrowLevel,
  LEVEL_MONOCHROME_COLORS,
} from './amazeGoGenerator';
import { ART_THEMES, buildArtPuzzleMask } from './amazeGoArtMasks';
import {
  buildShowcasePuzzleMask,
  getShowcaseThemeForLevel,
  isAnimatedShowcaseLevel,
} from './amazeGoShowcaseThemes';

export const TOTAL_LEVELS = 500;

export function getLevelMeta(id: number): AmazeGoLevelMeta {
  const safeId = Math.max(1, Math.min(TOTAL_LEVELS, id));
  const maxHearts = getMaxHeartsForLevel(safeId);
  const isAnimatedShowcase = isAnimatedShowcaseLevel(safeId);
  const isArtLevel = safeId % 5 === 0;

  let width = 5;
  let height = 6;
  let difficulty: DifficultyTier = 'Easy';

  const lerpInt = (a: number, b: number, t: number) =>
    Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));

  // True monotonic progression from Level 1 (tiny 5x6 = 30 dots) to Level 500 (massive 78x106 / 114x148 Boss)
  if (safeId === 1) {
    width = 5;
    height = 6; // 30 dots (~6-8 ultra-simple arrows)
    difficulty = 'Easy';
  } else if (safeId === 2) {
    width = 6;
    height = 7; // 42 dots
    difficulty = 'Easy';
  } else if (safeId === 3) {
    width = 6;
    height = 8; // 48 dots
    difficulty = 'Easy';
  } else if (safeId === 4) {
    width = 7;
    height = 9; // 63 dots
    difficulty = 'Easy';
  } else if (safeId <= 10) {
    const t = (safeId - 5) / 5;
    width = lerpInt(8, 12, t);
    height = lerpInt(11, 16, t); // 88..192 dots
    difficulty = 'Easy';
  } else if (safeId <= 25) {
    const t = (safeId - 11) / 14;
    width = lerpInt(13, 20, t);
    height = lerpInt(18, 28, t); // 234..560 dots
    difficulty = 'Medium';
  } else if (safeId <= 40) {
    const t = (safeId - 26) / 14;
    width = lerpInt(21, 26, t);
    height = lerpInt(29, 36, t); // 609..936 dots
    difficulty = 'Hard';
  } else if (safeId <= 65) {
    const t = (safeId - 41) / 24;
    width = lerpInt(27, 33, t);
    height = lerpInt(37, 45, t); // 999..1,485 dots (lvl 45 >= 900)
    difficulty = 'Hard';
  } else if (safeId <= 120) {
    const t = (safeId - 66) / 54;
    width = lerpInt(34, 42, t);
    height = lerpInt(46, 56, t); // 1,564..2,352 dots
    difficulty = 'Expert';
  } else if (safeId <= 220) {
    const t = (safeId - 121) / 99;
    width = lerpInt(43, 56, t);
    height = lerpInt(57, 75, t); // 2,451..4,200 dots
    difficulty = 'Master';
  } else if (safeId <= 350) {
    const t = (safeId - 221) / 129;
    width = lerpInt(57, 68, t);
    height = lerpInt(76, 92, t); // 4,332..6,256 dots
    difficulty = 'Master';
  } else {
    const t = (safeId - 351) / 149;
    width = lerpInt(69, 78, t);
    height = lerpInt(93, 106, t); // 6,417..8,268 dots (zoom-to-play marathon!)
    difficulty = 'Master';
  }

  // Ensure every 5th art puzzle (starting at Level 5) has crisp silhouette + frame resolution
  if (isArtLevel && width < 22) {
    width = safeId <= 10 ? 22 : 24;
    height = safeId <= 10 ? 30 : 34;
  }

  // Every 10th level (10, 20, ..., 200): upscale art silhouette resolution so arrow counts & difficulty exceed neighboring standard levels
  if (safeId % 10 === 0 && !isAnimatedShowcase) {
    const scale = safeId >= 90 ? 1.65 : 1.5;
    width = Math.max(28, Math.round(width * scale));
    height = Math.max(38, Math.round(height * scale));
    if (safeId >= 20 && difficulty === 'Easy') difficulty = 'Medium';
    if (safeId >= 30 && difficulty === 'Medium') difficulty = 'Hard';
    if (safeId >= 60 && difficulty === 'Hard') difficulty = 'Expert';
    if (safeId >= 120) difficulty = 'Master';
  }

  // Animated showcase creature Boss levels (210, 220, ..., 500): colossal high-res zoom-to-play Boss boards
  if (isAnimatedShowcase) {
    const slot = Math.max(0, Math.floor((safeId - 210) / 10));
    const t = slot / 29;
    width = lerpInt(114, 156, t); // 114..156 columns
    height = lerpInt(148, 204, t); // 148..204 rows (dense 600..1,300+ arrow zoom Boss!)
    difficulty = 'Master';
  }

  let artThemeName: string | undefined;
  let artPrimaryShade: string | undefined;
  let showcaseThemeId: string | undefined;
  let showcaseCategory: 'water' | 'roar' | 'wing' | 'mystic' | undefined;
  let showcaseAnimStyle: string | undefined;
  let showcasePalette: [string, string, string] | undefined;
  let showcaseIntroPalette: [string, string, string] | undefined;

  if (isAnimatedShowcase) {
    const theme = getShowcaseThemeForLevel(safeId);
    artThemeName = theme.name;
    artPrimaryShade = theme.boardPalette[0];
    showcaseThemeId = theme.id;
    showcaseCategory = theme.category;
    showcaseAnimStyle = theme.animStyle;
    showcasePalette = theme.boardPalette;
    showcaseIntroPalette = theme.introPalette;
  } else if (isArtLevel) {
    const artIndex = Math.floor((safeId - 1) / 5) % ART_THEMES.length;
    artThemeName = ART_THEMES[artIndex].name;
    artPrimaryShade = ART_THEMES[artIndex].shades[1];
  }

  function getThemedShade(levelId: number): string | null {
    if (isAnimatedShowcaseLevel(levelId)) {
      return getShowcaseThemeForLevel(levelId).boardPalette[0];
    }
    if (levelId % 5 === 0) {
      const artIdx = Math.floor((levelId - 1) / 5) % ART_THEMES.length;
      return ART_THEMES[artIdx].shades[1];
    }
    return null;
  }

  function resolveStandardColor(levelId: number): string {
    const forbidden = new Set<string>();
    if (levelId > 1) {
      const prevThemed = getThemedShade(levelId - 1);
      forbidden.add((prevThemed ?? resolveStandardColor(levelId - 1)).toLowerCase());
    }
    if (levelId < TOTAL_LEVELS) {
      const nextThemed = getThemedShade(levelId + 1);
      if (nextThemed) forbidden.add(nextThemed.toLowerCase());
    }
    const baseIdx = (levelId - 1) % LEVEL_MONOCHROME_COLORS.length;
    for (let step = 0; step < LEVEL_MONOCHROME_COLORS.length; step++) {
      const candidate = LEVEL_MONOCHROME_COLORS[(baseIdx + step) % LEVEL_MONOCHROME_COLORS.length];
      if (!forbidden.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return LEVEL_MONOCHROME_COLORS[baseIdx];
  }

  // Every level (1–500) gets its own distinct cohesive ink color (or art/showcase theme palette)
  const arrowColor =
    (isAnimatedShowcase || isArtLevel) && artPrimaryShade
      ? artPrimaryShade
      : resolveStandardColor(safeId);

  const totalDots = width * height;
  const name = isAnimatedShowcase
    ? `Boss: ${artThemeName}`
    : isArtLevel
    ? `Art: ${artThemeName}`
    : safeId <= 10
    ? `${width}×${height} Matrix`
    : safeId <= 40
    ? `Ink Maze ${width}×${height}`
    : safeId <= 100
    ? `Hard Grid ${totalDots.toLocaleString()} Dots`
    : safeId <= 200
    ? `Brutal ${totalDots.toLocaleString()} Dots`
    : `Master ${width}×${height}`;

  return {
    id: safeId,
    name,
    width,
    height,
    maxHearts,
    arrowColor,
    difficulty,
    isArtLevel,
    artThemeName,
    isAnimatedShowcase,
    showcaseThemeId,
    showcaseCategory,
    showcaseAnimStyle,
    showcasePalette,
    showcaseIntroPalette,
  };
}

/** Precomputed metadata for all 500 levels (0ms) */
export const AMAZE_GO_LEVEL_METAS: AmazeGoLevelMeta[] = Array.from(
  { length: TOTAL_LEVELS },
  (_, idx) => getLevelMeta(idx + 1)
);

const levelCache = new Map<number, AmazeGoLevel>();

interface LevelDifficultyProfile {
  hardBias: number;
  targetDensity: number;
  maxArrowLen: number;
  targetOpenCap: number;
  flexCeiling: number;
  targetBottlenecks: number;
  compactCountBias?: boolean;
}

function getLevelDifficultyProfile(
  id: number,
  isAnimatedShowcase?: boolean
): LevelDifficultyProfile {
  if (isAnimatedShowcase) {
    const slot = Math.max(0, Math.floor((id - 210) / 10));
    return {
      hardBias: 1.0,
      targetDensity: 0.975,
      // Dense mixture: packed 2-6 locks + 7-11 hooks + 13-15 coils (~600-1,300+ arrows!)
      maxArrowLen: 15,
      targetOpenCap: 1,
      flexCeiling: 1,
      targetBottlenecks: 22 + Math.floor(slot * 0.5),
      compactCountBias: true,
    };
  }

  if (id % 10 === 0) {
    return {
      hardBias: id === 10 ? 0.85 : 1.0,
      targetDensity: 0.97,
      maxArrowLen: id === 10 ? 9 : 15,
      targetOpenCap: 1,
      flexCeiling: 1,
      targetBottlenecks: id === 10 ? 6 : Math.max(12, Math.round(id * 0.14)),
      compactCountBias: true,
    };
  }

  if (id === 1) {
    return {
      hardBias: 0.05,
      targetDensity: 0.85,
      maxArrowLen: 4,
      targetOpenCap: 5,
      flexCeiling: 6,
      targetBottlenecks: 0,
    };
  }
  if (id <= 4) {
    return {
      hardBias: 0.08 + (id - 2) * 0.04,
      targetDensity: 0.88,
      maxArrowLen: id === 2 ? 5 : 6,
      targetOpenCap: id === 2 ? 5 : 4,
      flexCeiling: 5,
      targetBottlenecks: 0,
    };
  }
  if (id <= 10) {
    return {
      hardBias: 0.22 + ((id - 5) / 5) * 0.16,
      targetDensity: 0.91,
      maxArrowLen: id === 5 ? 9 : 7,
      targetOpenCap: id === 5 ? 4 : 3,
      flexCeiling: id === 5 ? 5 : 4,
      targetBottlenecks: 1,
    };
  }
  if (id <= 25) {
    const t = (id - 11) / 14;
    return {
      hardBias: 0.42 + t * 0.34,
      targetDensity: 0.94,
      maxArrowLen: 12,
      targetOpenCap: id <= 18 ? 3 : 2,
      flexCeiling: 3,
      targetBottlenecks: 3 + Math.round(t * 2),
    };
  }
  if (id <= 55) {
    const t = (id - 26) / 29;
    return {
      hardBias: 0.8 + t * 0.15,
      targetDensity: 0.955,
      maxArrowLen: 15,
      targetOpenCap: 1,
      flexCeiling: 4,
      targetBottlenecks: 6 + Math.round(t * 3),
    };
  }
  if (id <= 150) {
    const t = (id - 56) / 94;
    return {
      hardBias: 0.96 + t * 0.03,
      targetDensity: 0.965,
      maxArrowLen: 18,
      targetOpenCap: 1,
      flexCeiling: 4,
      targetBottlenecks: 10 + Math.round(t * 4),
    };
  }
  if (id <= 350) {
    return {
      hardBias: 0.99,
      targetDensity: 0.97,
      maxArrowLen: 20,
      targetOpenCap: 1,
      flexCeiling: 1,
      targetBottlenecks: 18,
    };
  }
  // 351..500: Colossal cross-locked master mazes with wide mixed sizes (2..22 dots)
  return {
    hardBias: 1.0,
    targetDensity: 0.975,
    maxArrowLen: 22,
    targetOpenCap: 1,
    flexCeiling: 1,
    targetBottlenecks: 22,
  };
}

/**
 * Returns the full generated puzzle for any level 1..500 (cached for instant re-entry)
 */
export function getAmazeGoLevel(id: number): AmazeGoLevel {
  const safeId = Math.max(1, Math.min(TOTAL_LEVELS, id));
  const cached = levelCache.get(safeId);
  if (cached) return cached;

  const meta = getLevelMeta(safeId);
  const profile = getLevelDifficultyProfile(safeId, meta.isAnimatedShowcase);

  let activeMask: Uint8Array | undefined;
  let frameMask: Uint8Array | undefined;
  let tonalPalette: [string, string, string] | undefined;
  let colorMask: Uint8Array | undefined;

  if (meta.isAnimatedShowcase) {
    const showcase = buildShowcasePuzzleMask(meta.id, meta.width, meta.height);
    activeMask = showcase.mask;
    colorMask = showcase.colorMask;
  } else if (meta.isArtLevel) {
    const art = buildArtPuzzleMask(meta.id, meta.width, meta.height);
    activeMask = art.mask;
    frameMask = art.frameMask;
    tonalPalette = art.tonalPalette;
  }

  const generated = generateDotArrowLevel({
    id: meta.id,
    name: meta.name,
    width: meta.width,
    height: meta.height,
    difficulty: meta.difficulty,
    arrowColor: meta.arrowColor,
    maxHearts: meta.maxHearts,
    seed: meta.id * 31337 + 4242,
    targetDensity: profile.targetDensity,
    hardBias: profile.hardBias,
    maxArrowLen: profile.maxArrowLen,
    targetOpenCap: profile.targetOpenCap,
    flexCeiling: profile.flexCeiling,
    targetBottlenecks: profile.targetBottlenecks,
    compactCountBias: profile.compactCountBias,
    activeMask,
    frameMask,
    tonalPalette,
    colorMask,
    showcasePalette: meta.showcasePalette,
    showcaseIntroPalette: meta.showcaseIntroPalette,
    isArtLevel: meta.isArtLevel,
    artThemeName: meta.artThemeName,
    isAnimatedShowcase: meta.isAnimatedShowcase,
    showcaseThemeId: meta.showcaseThemeId,
    showcaseCategory: meta.showcaseCategory,
    showcaseAnimStyle: meta.showcaseAnimStyle,
  });

  levelCache.set(safeId, generated);
  return generated;
}

export function createRandomBoard(meta: AmazeGoLevelMeta, customColor?: string): AmazeGoLevel {
  const seed = Math.floor(Math.random() * 99999999) + 1;
  const profile = getLevelDifficultyProfile(meta.id, meta.isAnimatedShowcase);
  let activeMask: Uint8Array | undefined;
  let frameMask: Uint8Array | undefined;
  let tonalPalette: [string, string, string] | undefined;
  let colorMask: Uint8Array | undefined;

  if (meta.isAnimatedShowcase) {
    const showcase = buildShowcasePuzzleMask(meta.id, meta.width, meta.height);
    activeMask = showcase.mask;
    if (!customColor) {
      colorMask = showcase.colorMask;
    }
  } else if (meta.isArtLevel) {
    const art = buildArtPuzzleMask(meta.id, meta.width, meta.height);
    activeMask = art.mask;
    frameMask = art.frameMask;
    if (!customColor) {
      tonalPalette = art.tonalPalette;
    }
  }

  return generateDotArrowLevel({
    id: meta.id,
    name: meta.isAnimatedShowcase
      ? `Boss: ${meta.artThemeName} (Mix)`
      : meta.isArtLevel
      ? `Art: ${meta.artThemeName} (Mix)`
      : `${meta.width}×${meta.height} Hard Mix`,
    width: meta.width,
    height: meta.height,
    difficulty: meta.difficulty,
    arrowColor: customColor || meta.arrowColor,
    maxHearts: meta.maxHearts,
    seed,
    targetDensity: profile.targetDensity,
    hardBias: profile.hardBias,
    maxArrowLen: profile.maxArrowLen,
    targetOpenCap: profile.targetOpenCap,
    flexCeiling: profile.flexCeiling,
    targetBottlenecks: profile.targetBottlenecks,
    compactCountBias: profile.compactCountBias,
    activeMask,
    frameMask,
    tonalPalette,
    colorMask,
    showcasePalette: customColor ? undefined : meta.showcasePalette,
    showcaseIntroPalette: meta.showcaseIntroPalette,
    isArtLevel: meta.isArtLevel,
    artThemeName: meta.artThemeName,
    isAnimatedShowcase: meta.isAnimatedShowcase,
    showcaseThemeId: meta.showcaseThemeId,
    showcaseCategory: meta.showcaseCategory,
    showcaseAnimStyle: meta.showcaseAnimStyle,
  });
}
