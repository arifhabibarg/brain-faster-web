import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RANK_TIERS,
  isAdminEmail,
  getRankTier,
  computeHighestUnlockedLevel,
  isLevelUnlocked,
  resolveAuthCompletedMerge,
  formatDurationShort,
  sortGlobalLeaderboard,
  sortLevelRecords,
  canUseUnlimitedMode,
  sortAdminPlayers,
  MAX_HINTS_PER_LEVEL,
  consumeHintAllowance,
} from './playerProgression';
import {
  BACKGROUND_MUSIC_TRACKS,
  SOUND_PRESETS,
  amazeGoAudio,
  getMusicTrackCycleDurationMs,
} from './amazeGoAudio';

test('20 soothing new arrow sound presets exist (all old presets removed) and switching works', () => {
  assert.equal(SOUND_PRESETS.length, 20);
  const ids = new Set(SOUND_PRESETS.map((p) => p.id));
  assert.equal(ids.size, 20);

  for (const oldId of ['marimba', 'droplet', 'kalimba', 'crystal', 'wood', 'bubble']) {
    assert.equal(ids.has(oldId as never), false, `Old preset ${oldId} must be removed`);
  }

  amazeGoAudio.setPreset('rain_pearl');
  assert.equal(amazeGoAudio.getPreset(), 'rain_pearl');
  amazeGoAudio.setPreset('singing_bowl');
  assert.equal(amazeGoAudio.getPreset(), 'singing_bowl');
  amazeGoAudio.setPreset('silk_harp');
  assert.equal(amazeGoAudio.getPreset(), 'silk_harp');
});

test('sequential level unlocking unlocks level K+1 after completing K, while admin unlocks all 500', () => {
  assert.equal(computeHighestUnlockedLevel({}, false), 1);
  assert.equal(isLevelUnlocked(1, 1, false), true);
  assert.equal(isLevelUnlocked(2, 1, false), false);

  const afterL1 = { 1: { stars: 3, bestMoves: 12, bestTimeSeconds: 25 } };
  const unlocked2 = computeHighestUnlockedLevel(afterL1, false);
  assert.equal(unlocked2, 2);
  assert.equal(isLevelUnlocked(2, unlocked2, false), true);
  assert.equal(isLevelUnlocked(3, unlocked2, false), false);

  const afterL2 = { ...afterL1, 2: { stars: 2, bestMoves: 15, bestTimeSeconds: 40 } };
  assert.equal(computeHighestUnlockedLevel(afterL2, false), 3);

  assert.equal(isAdminEmail('arifhabib.arg@gmail.com'), true);
  assert.equal(isAdminEmail('ARIFHABIB.ARG@GMAIL.COM'), true);
  assert.equal(isAdminEmail('player@gmail.com'), false);
  assert.equal(computeHighestUnlockedLevel({}, true), 500);
  assert.equal(isLevelUnlocked(500, 1, true), true);
});

test('new Google logins and account switches always start cleanly at Level 1 without inheriting stale local levels', () => {
  const staleLocal23: Record<number, { stars: number; bestMoves: number; bestTimeSeconds: number }> = {};
  for (let i = 1; i <= 23; i++) {
    staleLocal23[i] = { stars: 3, bestMoves: 10, bestTimeSeconds: 20 };
  }
  assert.equal(computeHighestUnlockedLevel(staleLocal23, false), 24);

  // Brand-new Google user logging in with 23 stale levels in browser storage
  const newAccountRes = resolveAuthCompletedMerge({
    isNewCloudAccount: true,
    previousUid: null,
    currentUid: 'new-user-123',
    cloudCompleted: {},
    localCompleted: staleLocal23,
  });
  assert.equal(Object.keys(newAccountRes.mergedCompleted).length, 0);
  assert.equal(newAccountRes.newlyMergedIds.length, 0);
  assert.equal(computeHighestUnlockedLevel(newAccountRes.mergedCompleted, false), 1);

  // Different Google account logging in on same browser
  const switchAccountRes = resolveAuthCompletedMerge({
    isNewCloudAccount: false,
    previousUid: 'old-user-999',
    currentUid: 'other-user-456',
    cloudCompleted: { 1: { stars: 3, bestMoves: 8, bestTimeSeconds: 15 } },
    localCompleted: staleLocal23,
  });
  assert.equal(computeHighestUnlockedLevel(switchAccountRes.mergedCompleted, false), 2);
  assert.equal(switchAccountRes.newlyMergedIds.length, 0);

  // Same signed-in user syncing a newly completed offline level
  const sameUserRes = resolveAuthCompletedMerge({
    isNewCloudAccount: false,
    previousUid: 'user-same',
    currentUid: 'user-same',
    cloudCompleted: { 1: { stars: 3, bestMoves: 8, bestTimeSeconds: 15 } },
    localCompleted: {
      1: { stars: 3, bestMoves: 8, bestTimeSeconds: 15 },
      2: { stars: 3, bestMoves: 11, bestTimeSeconds: 22 },
    },
  });
  assert.equal(computeHighestUnlockedLevel(sameUserRes.mergedCompleted, false), 3);
  assert.deepEqual(sameUserRes.newlyMergedIds, [2]);
});

test('7 game rank tiers progress cleanly from Bronze up to Gold, Diamond, and Crown', () => {
  assert.equal(RANK_TIERS.length, 7);
  assert.equal(getRankTier(0).name, 'Bronze');
  assert.equal(getRankTier(10).name, 'Silver');
  assert.equal(getRankTier(30).name, 'Gold');
  assert.equal(getRankTier(70).name, 'Platinum');
  assert.equal(getRankTier(130).name, 'Diamond');
  assert.equal(getRankTier(200).name, 'Master');
  assert.equal(getRankTier(260).name, 'Crown');
  assert.equal(getRankTier(300).nextTier, null);
});

test('10 distinct natural soundscapes and multi-genre tracks exist, old sine loops removed, and every track is >= 30s', () => {
  assert.equal(BACKGROUND_MUSIC_TRACKS.length, 10);
  const trackIds = new Set(BACKGROUND_MUSIC_TRACKS.map((t) => t.id));
  assert.equal(trackIds.size, 10);

  const expectedNaturalTracks = [
    'forest_birdsong',
    'ocean_waves',
    'monsoon_rain',
    'mountain_stream',
    'campfire_night',
    'rainy_piano',
    'midnight_chill',
    'acoustic_meadow',
    'temple_meditation',
    'starry_strings',
  ];
  for (const id of expectedNaturalTracks) {
    assert.equal(trackIds.has(id as never), true, `Expected natural track ${id} to exist`);
  }

  const oldSineLoopTracks = [
    'moonlit_sanctuary',
    'emerald_river',
    'velvet_horizon',
    'celestial_harp',
    'bamboo_courtyard',
    'misty_highlands',
    'amber_twilight',
    'lotus_pond',
    'nordic_aurora',
    'silk_lullaby',
  ];
  for (const oldId of oldSineLoopTracks) {
    assert.equal(trackIds.has(oldId as never), false, `Old repetitive track ${oldId} must be removed`);
  }

  for (const track of BACKGROUND_MUSIC_TRACKS) {
    const cycleMs = getMusicTrackCycleDurationMs(track.id);
    assert.ok(
      cycleMs >= 30_000,
      `Music track ${track.id} must be >= 30000ms (30s+), got ${cycleMs}ms`
    );
    assert.ok(track.durationSeconds >= 30);
  }

  amazeGoAudio.setMusicTrack('ocean_waves');
  assert.equal(amazeGoAudio.getMusicTrack(), 'ocean_waves');
  amazeGoAudio.setMusicTrack('rainy_piano');
  assert.equal(amazeGoAudio.getMusicTrack(), 'rainy_piano');
  amazeGoAudio.setMusicTrack('forest_birdsong');
  assert.equal(amazeGoAudio.getMusicTrack(), 'forest_birdsong');
});

test('time formatting and global/per-level leaderboard rankings assign 1st, 2nd, 3rd accurately', () => {
  assert.equal(formatDurationShort(42), '42s');
  assert.equal(formatDurationShort(74), '1m 14s');
  assert.equal(formatDurationShort(125), '2m 05s');

  const globalRanked = sortGlobalLeaderboard([
    {
      uid: 'u2',
      displayName: 'Player B',
      photoUrl: '',
      completedCount: 10,
      highestUnlockedLevel: 11,
      totalStars: 28,
      totalTimeSeconds: 500,
      tierIndex: 1,
    },
    {
      uid: 'u1',
      displayName: 'Player A',
      photoUrl: '',
      completedCount: 15,
      highestUnlockedLevel: 16,
      totalStars: 42,
      totalTimeSeconds: 700,
      tierIndex: 1,
    },
  ]);
  assert.equal(globalRanked[0].uid, 'u1');
  assert.equal(globalRanked[0].rank, 1);
  assert.equal(globalRanked[1].uid, 'u2');
  assert.equal(globalRanked[1].rank, 2);

  const lvlRanked = sortLevelRecords([
    { uid: 'p2', levelId: 5, displayName: 'Slow', photoUrl: '', bestTimeSeconds: 95, stars: 3, bestMoves: 30, minBumps: 0 },
    { uid: 'p1', levelId: 5, displayName: 'Fast', photoUrl: '', bestTimeSeconds: 41, stars: 3, bestMoves: 28, minBumps: 0 },
  ]);
  assert.equal(lvlRanked[0].uid, 'p1');
  assert.equal(lvlRanked[0].rank, 1);
  assert.equal(lvlRanked[1].rank, 2);
});

test('Unlimited Mode is locked by default and only accessible to Admin or Admin-approved players', () => {
  assert.equal(canUseUnlimitedMode(false, false), false);
  assert.equal(canUseUnlimitedMode(false, true), true);
  assert.equal(canUseUnlimitedMode(true, false), true);
  assert.equal(canUseUnlimitedMode(true, true), true);

  const sorted = sortAdminPlayers([
    {
      uid: 'u-old',
      email: 'old@example.com',
      displayName: 'Old Player',
      photoUrl: '',
      completedCount: 5,
      highestUnlockedLevel: 6,
      totalStars: 12,
      unlimitedModeAllowed: false,
      updatedAtMs: 1000,
      createdAtMs: 500,
    },
    {
      uid: 'u-recent',
      email: 'recent@example.com',
      displayName: 'Recent Player',
      photoUrl: '',
      completedCount: 2,
      highestUnlockedLevel: 3,
      totalStars: 6,
      unlimitedModeAllowed: true,
      updatedAtMs: 5000,
      createdAtMs: 4000,
    },
  ]);
  assert.equal(sorted[0].uid, 'u-recent');
  assert.equal(sorted[1].uid, 'u-old');
});

test('per-level hint allowance starts at 3, decrements up to 3 times, and blocks a 4th click', () => {
  assert.equal(MAX_HINTS_PER_LEVEL, 3);
  let remaining = MAX_HINTS_PER_LEVEL;

  const h1 = consumeHintAllowance(remaining, true);
  assert.deepEqual(h1, { allowed: true, nextRemaining: 2 });
  remaining = h1.nextRemaining;

  const h2 = consumeHintAllowance(remaining, true);
  assert.deepEqual(h2, { allowed: true, nextRemaining: 1 });
  remaining = h2.nextRemaining;

  const h3 = consumeHintAllowance(remaining, true);
  assert.deepEqual(h3, { allowed: true, nextRemaining: 0 });
  remaining = h3.nextRemaining;

  const h4 = consumeHintAllowance(remaining, true);
  assert.deepEqual(h4, { allowed: false, nextRemaining: 0 });
});
