export const ADMIN_EMAILS = [
  'arifhabib.arg@gmail.com',
  'arif.habib.arg@gmail.com',
];

export const TOTAL_GAME_LEVELS = 500;

export interface LevelCompletionRecord {
  stars: number;
  bestMoves: number;
  bestTimeSeconds?: number;
  minBumps?: number;
}

export type CompletedLevelsMap = Record<number, LevelCompletionRecord>;

export interface RankTier {
  index: number;
  name: string;
  bnName: string;
  minCompleted: number;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

/**
 * 7 Progressive Rank Tiers (Bronze -> Silver -> Gold -> Platinum -> Diamond -> Master -> Crown)
 */
export const RANK_TIERS: RankTier[] = [
  {
    index: 0,
    name: 'Bronze',
    bnName: 'ব্রোঞ্জ',
    minCompleted: 0,
    color: '#b45309',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    badgeBorder: '#f59e0b',
  },
  {
    index: 1,
    name: 'Silver',
    bnName: 'সিলভার',
    minCompleted: 10,
    color: '#64748b',
    badgeBg: '#f1f5f9',
    badgeText: '#334155',
    badgeBorder: '#94a3b8',
  },
  {
    index: 2,
    name: 'Gold',
    bnName: 'গোল্ড',
    minCompleted: 30,
    color: '#d97706',
    badgeBg: '#fef9c3',
    badgeText: '#854d0e',
    badgeBorder: '#eab308',
  },
  {
    index: 3,
    name: 'Platinum',
    bnName: 'প্লাটিনাম',
    minCompleted: 70,
    color: '#0891b2',
    badgeBg: '#cffafe',
    badgeText: '#155e75',
    badgeBorder: '#06b6d4',
  },
  {
    index: 4,
    name: 'Diamond',
    bnName: 'ডায়মন্ড',
    minCompleted: 130,
    color: '#2563eb',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
    badgeBorder: '#3b82f6',
  },
  {
    index: 5,
    name: 'Master',
    bnName: 'মাস্টার',
    minCompleted: 200,
    color: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
    badgeBorder: '#8b5cf6',
  },
  {
    index: 6,
    name: 'Crown',
    bnName: 'ক্রাউন',
    minCompleted: 260,
    color: '#be123c',
    badgeBg: '#ffe4e6',
    badgeText: '#9f1239',
    badgeBorder: '#f43f5e',
  },
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function getRankTier(completedCount: number): RankTier & {
  nextTier: RankTier | null;
  levelsToNext: number;
} {
  const safeCount = Math.max(0, Math.floor(completedCount));
  let current = RANK_TIERS[0];
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (safeCount >= RANK_TIERS[i].minCompleted) {
      current = RANK_TIERS[i];
    }
  }
  const nextTier =
    current.index < RANK_TIERS.length - 1 ? RANK_TIERS[current.index + 1] : null;
  const levelsToNext = nextTier ? Math.max(0, nextTier.minCompleted - safeCount) : 0;
  return { ...current, nextTier, levelsToNext };
}

/**
 * Sequential level progression:
 * Level 1 is unlocked from start. Clearing level K unlocks K + 1.
 * Admin email unlocks all 300 levels immediately.
 */
export function computeHighestUnlockedLevel(
  completedLevels: CompletedLevelsMap,
  isAdmin: boolean
): number {
  if (isAdmin) return TOTAL_GAME_LEVELS;
  let seqMax = 1;
  while (seqMax < TOTAL_GAME_LEVELS && completedLevels[seqMax]) {
    seqMax++;
  }
  return seqMax;
}

export function isLevelUnlocked(
  levelId: number,
  highestUnlockedLevel: number,
  isAdmin: boolean
): boolean {
  if (levelId < 1 || levelId > TOTAL_GAME_LEVELS) return false;
  if (isAdmin) return true;
  return levelId <= Math.max(1, highestUnlockedLevel);
}

export interface AuthCompletedMergeResult {
  mergedCompleted: CompletedLevelsMap;
  newlyMergedIds: number[];
}

/**
 * Resolves level completion records when a Google account authenticates.
 * Brand-new accounts (isNewCloudAccount) or account switches (previousUid !== currentUid)
 * NEVER inherit stale local completions from prior device playtesting or another account —
 * new players always begin cleanly at Level 1 and unlock sequentially by playing.
 */
export function resolveAuthCompletedMerge(params: {
  isNewCloudAccount: boolean;
  previousUid: string | null;
  currentUid: string;
  cloudCompleted: CompletedLevelsMap;
  localCompleted: CompletedLevelsMap;
}): AuthCompletedMergeResult {
  const { isNewCloudAccount, previousUid, currentUid, cloudCompleted, localCompleted } = params;
  const mergedCompleted: CompletedLevelsMap = { ...cloudCompleted };
  const newlyMergedIds: number[] = [];

  const allowLocalMerge =
    !isNewCloudAccount && previousUid !== null && previousUid === currentUid;

  if (!allowLocalMerge) {
    return { mergedCompleted, newlyMergedIds };
  }

  for (const keyStr of Object.keys(localCompleted)) {
    const lvlId = Number(keyStr);
    if (lvlId < 1 || lvlId > TOTAL_GAME_LEVELS) continue;
    const loc = localCompleted[lvlId];
    if (!loc) continue;
    const prev = mergedCompleted[lvlId];
    if (!prev) {
      mergedCompleted[lvlId] = { ...loc };
      newlyMergedIds.push(lvlId);
    } else {
      const bestStars = Math.max(prev.stars || 1, loc.stars || 1);
      const bestMoves = Math.min(prev.bestMoves || 9999, loc.bestMoves || 9999);
      const bestTime =
        prev.bestTimeSeconds !== undefined && loc.bestTimeSeconds !== undefined
          ? Math.min(prev.bestTimeSeconds, loc.bestTimeSeconds)
          : prev.bestTimeSeconds ?? loc.bestTimeSeconds;
      const minBumps =
        prev.minBumps !== undefined && loc.minBumps !== undefined
          ? Math.min(prev.minBumps, loc.minBumps)
          : prev.minBumps ?? loc.minBumps;
      if (
        bestStars !== prev.stars ||
        bestMoves !== prev.bestMoves ||
        bestTime !== prev.bestTimeSeconds ||
        minBumps !== prev.minBumps
      ) {
        mergedCompleted[lvlId] = {
          stars: bestStars,
          bestMoves,
          ...(bestTime !== undefined ? { bestTimeSeconds: bestTime } : {}),
          ...(minBumps !== undefined ? { minBumps } : {}),
        };
        newlyMergedIds.push(lvlId);
      }
    }
  }

  return { mergedCompleted, newlyMergedIds };
}

export function formatDurationShort(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export interface GlobalLeaderboardRow {
  uid: string;
  displayName: string;
  photoUrl: string;
  completedCount: number;
  highestUnlockedLevel: number;
  totalStars: number;
  totalTimeSeconds: number;
  tierIndex: number;
}

export function sortGlobalLeaderboard<T extends GlobalLeaderboardRow>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
    if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
    return a.totalTimeSeconds - b.totalTimeSeconds;
  });
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
}

export interface LevelSpeedRecordRow {
  uid: string;
  levelId: number;
  displayName: string;
  photoUrl: string;
  bestTimeSeconds: number;
  stars: number;
  bestMoves: number;
  minBumps: number;
}

export function sortLevelRecords<T extends LevelSpeedRecordRow>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.bestTimeSeconds !== b.bestTimeSeconds) return a.bestTimeSeconds - b.bestTimeSeconds;
    if (b.stars !== a.stars) return b.stars - a.stars;
    return a.bestMoves - b.bestMoves;
  });
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
}

/**
 * Unlimited (Zen) Mode is restricted to Admins and players explicitly
 * granted `unlimitedModeAllowed` permission by an Admin.
 */
export function canUseUnlimitedMode(
  isAdmin: boolean,
  unlimitedModeAllowed: boolean
): boolean {
  return Boolean(isAdmin || unlimitedModeAllowed);
}

export interface AdminPlayerRow {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  completedCount: number;
  highestUnlockedLevel: number;
  totalStars: number;
  unlimitedModeAllowed: boolean;
  updatedAtMs: number;
  createdAtMs: number;
}

export function sortAdminPlayers<T extends AdminPlayerRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.updatedAtMs !== a.updatedAtMs) return b.updatedAtMs - a.updatedAtMs;
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
    return a.displayName.localeCompare(b.displayName);
  });
}

export const MAX_HINTS_PER_LEVEL = 3;

export function consumeHintAllowance(
  remainingHints: number,
  hasEscapableArrow: boolean
): { allowed: boolean; nextRemaining: number } {
  const safeRemaining = Math.max(0, Math.floor(remainingHints));
  if (safeRemaining <= 0 || !hasEscapableArrow) {
    return { allowed: false, nextRemaining: safeRemaining };
  }
  return { allowed: true, nextRemaining: safeRemaining - 1 };
}


