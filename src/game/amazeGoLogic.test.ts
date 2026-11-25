import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkArrowEscape,
  getEscapableArrows,
  isLevelSolvable,
  validateArrowLevel,
  getSlidingArrowPoints,
  getCollisionBounceArrowPoints,
  getCollisionWarningColor,
  COLLISION_IMPACT_AT,
  getMaxHeartsForLevel,
  isGoldenKeyLevel,
  hasYellowBurstArrows,
  computeArrowWaveDepths,
  resolveYellowBurstEscapes,
  AmazeGoLevel,
} from './amazeGoLogic';
import {
  AMAZE_GO_LEVEL_METAS,
  TOTAL_LEVELS,
  getAmazeGoLevel,
  createRandomBoard,
} from './amazeGoLevels';
import { PURE_BLACK_COLOR, evaluatePuzzleDifficulty } from './amazeGoGenerator';
import { findBestTappedArrow } from './arrowHitTest';

const sampleDotLevel: AmazeGoLevel = {
  id: 1,
  name: 'Sample Bend',
  width: 6,
  height: 6,
  maxHearts: 3,
  arrowColor: PURE_BLACK_COLOR,
  difficulty: 'Easy',
  arrows: [
    {
      id: 'a1',
      path: [
        { x: 2, y: 4 },
        { x: 2, y: 3 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
      head: { x: 3, y: 2 },
      direction: 'RIGHT',
      color: PURE_BLACK_COLOR,
    },
    {
      id: 'a2',
      path: [
        { x: 4, y: 3 },
        { x: 4, y: 2 },
      ],
      head: { x: 4, y: 2 },
      direction: 'UP',
      color: PURE_BLACK_COLOR,
    },
  ],
};

test('checkArrowEscape detects blocking arrow and unlocks once cleared', () => {
  const blocked = checkArrowEscape(sampleDotLevel.width, sampleDotLevel.height, sampleDotLevel.arrows, 'a1');
  assert.equal(blocked.canEscape, false);
  assert.equal(blocked.blockedByArrowId, 'a2');

  const free = checkArrowEscape(sampleDotLevel.width, sampleDotLevel.height, sampleDotLevel.arrows, 'a2');
  assert.equal(free.canEscape, true);

  const escapable = getEscapableArrows(sampleDotLevel.width, sampleDotLevel.height, sampleDotLevel.arrows);
  assert.equal(escapable.length, 1);
  assert.equal(escapable[0].id, 'a2');
  assert.equal(isLevelSolvable(sampleDotLevel), true);
});

test('getSlidingArrowPoints moves bent arrow smoothly across viewport and collision-bounce hits blocker then returns', () => {
  const a1 = sampleDotLevel.arrows[0];
  const a2 = sampleDotLevel.arrows[1];
  const cellSize = 20;
  const start = getSlidingArrowPoints(a2, 6, 6, cellSize, 0);
  assert.equal(start.points.length, 2);
  assert.equal(start.opacity, 1);

  const mid = getSlidingArrowPoints(a2, 6, 6, cellSize, 0.5);
  assert.ok(mid.headTip.y < start.headTip.y);

  const end = getSlidingArrowPoints(a1, 6, 6, cellSize, 1);
  assert.ok(end.headTip.x > 6 * cellSize);
  assert.equal(end.opacity, 0);

  // Full mobile viewport exit glide: remains opacity 1 through 0.85 and clears extraExitPx by end
  const extraExitPx = 420;
  const viewportMid = getSlidingArrowPoints(a2, 6, 6, cellSize, 0.85, extraExitPx);
  assert.equal(viewportMid.opacity, 1, 'Arrow must remain opaque until off mobile display');
  assert.ok(viewportMid.headTip.y < 0);

  const viewportEnd = getSlidingArrowPoints(a2, 6, 6, cellSize, 1, extraExitPx);
  assert.ok(viewportEnd.points[0].y < start.headTip.y - extraExitPx * 0.9);
  assert.equal(viewportEnd.opacity, 0);

  // Collision bounce: lunges forward to blocking cell then returns home and swaps warning color
  const blockedCheck = checkArrowEscape(6, 6, sampleDotLevel.arrows, 'a1');
  assert.equal(blockedCheck.canEscape, false);
  const preHit = getCollisionBounceArrowPoints(a1, blockedCheck.blockingCell, cellSize, 0.25);
  assert.equal(preHit.hasImpacted, false);
  assert.ok(preHit.headTip.x > a1.head.x * cellSize + cellSize / 2);

  const atImpact = getCollisionBounceArrowPoints(
    a1,
    blockedCheck.blockingCell,
    cellSize,
    COLLISION_IMPACT_AT
  );
  assert.equal(atImpact.hasImpacted, true);
  assert.ok(atImpact.headTip.x > preHit.headTip.x);

  const returnedHome = getCollisionBounceArrowPoints(a1, blockedCheck.blockingCell, cellSize, 1);
  assert.equal(returnedHome.hasImpacted, true);
  assert.equal(returnedHome.headTip.x, a1.head.x * cellSize + cellSize / 2);
  assert.equal(returnedHome.points[0].y, a1.path[0].y * cellSize + cellSize / 2);

  assert.equal(getCollisionWarningColor('#111827'), '#dc2626');
  assert.notEqual(getCollisionWarningColor('#dc2626'), '#dc2626');
});

test('500 levels exist with proper heart tiers and steep difficulty jump past level 40-50', () => {
  assert.equal(TOTAL_LEVELS, 500);
  assert.equal(AMAZE_GO_LEVEL_METAS.length, 500);

  assert.equal(getMaxHeartsForLevel(1), 3);
  assert.equal(getMaxHeartsForLevel(100), 3);
  assert.equal(getMaxHeartsForLevel(101), 2);
  assert.equal(getMaxHeartsForLevel(200), 2);
  assert.equal(getMaxHeartsForLevel(201), 1);
  assert.equal(getMaxHeartsForLevel(225), 1);
  assert.equal(getMaxHeartsForLevel(350), 1);
  assert.equal(getMaxHeartsForLevel(500), 1);

  const lvl45 = AMAZE_GO_LEVEL_METAS[44];
  assert.ok(lvl45.width * lvl45.height >= 900, `Expected >= 900 dots at level 45, got ${lvl45.width * lvl45.height}`);

  const lvl500 = AMAZE_GO_LEVEL_METAS[499];
  assert.ok(lvl500.width * lvl500.height >= 10000, `Expected >= 10000 dots at Boss level 500, got ${lvl500.width * lvl500.height}`);
});

test('Every 5th level is a valid art silhouette puzzle, every consecutive level has a distinct arrow color, and all sample levels are 100% solvable', () => {
  for (let i = 0; i < AMAZE_GO_LEVEL_METAS.length - 1; i++) {
    const cur = AMAZE_GO_LEVEL_METAS[i];
    const nxt = AMAZE_GO_LEVEL_METAS[i + 1];
    assert.notEqual(
      cur.arrowColor.toLowerCase(),
      nxt.arrowColor.toLowerCase(),
      `Level ${cur.id} and Level ${nxt.id} must have different colors (both ${cur.arrowColor})`
    );
  }

  const sampleIds = [1, 2, 3, 5, 10, 41, 50, 100, 101, 150, 200, 201, 225, 226, 230, 320, 350, 380, 455, 500];
  for (const id of sampleIds) {
    const lvl = getAmazeGoLevel(id);
    const check = validateArrowLevel(lvl);
    assert.equal(check.valid, true, `Level ${id} invalid: ${check.reason}`);

    if (id % 5 === 0) {
      assert.equal(lvl.isArtLevel, true, `Level ${id} should be an art level`);
      assert.ok(lvl.activeMask, `Level ${id} should have an activeMask`);
    } else {
      assert.equal(!!lvl.isArtLevel, false);
      const uniqueColors = new Set(lvl.arrows.map((a) => a.color));
      assert.equal(uniqueColors.size, 1, `Standard level ${id} should have only 1 arrow color`);
      assert.equal(lvl.arrows[0].color, lvl.arrowColor);
    }

    let playableCount = lvl.width * lvl.height;
    if (lvl.activeMask) {
      playableCount = 0;
      for (let i = 0; i < lvl.activeMask.length; i++) {
        if (lvl.activeMask[i] === 1) playableCount++;
      }
    }

    const covered = lvl.arrows.reduce((acc, a) => acc + a.path.length, 0);
    const density = covered / playableCount;
    assert.ok(density >= 0.72, `Level ${id} density ${density.toFixed(2)} too low`);
  }

  const randomArtLvl = createRandomBoard(AMAZE_GO_LEVEL_METAS[224]);
  assert.equal(validateArrowLevel(randomArtLvl).valid, true);
});

test('findBestTappedArrow resolves nearest segment, ignores far background, and rescues nearby escapable arrows when a blocked arrow is tapped', () => {
  // Tap squarely on a1 far tail (x=2.5, y=3.5), >1.65 cells away from a2 -> stays blocked a1
  const tapA1 = findBestTappedArrow(2.5, 3.5, sampleDotLevel.arrows, 6, 6);
  assert.equal(tapA1?.id, 'a1');

  // Tap far away in empty corner (0.2, 0.2) -> null (no wasted heart)
  const tapEmpty = findBestTappedArrow(0.2, 0.2, sampleDotLevel.arrows, 6, 6);
  assert.equal(tapEmpty, null);

  // Borderline tap right between blocked a1 head (x=3.5, y=2.5) and escapable a2 head (x=4.5, y=2.5)
  const borderline = findBestTappedArrow(3.92, 2.5, sampleDotLevel.arrows, 6, 6);
  assert.equal(borderline?.id, 'a2');

  // Tap dead-center on blocked a1 head (x=3.5, y=2.5) when escapable a2 is nearby (<= 1.65 cells) -> rescues a2, NO foul!
  const directOnBlockedNearCorrect = findBestTappedArrow(3.5, 2.5, sampleDotLevel.arrows, 6, 6);
  assert.equal(directOnBlockedNearCorrect?.id, 'a2');

  // On dense mobile screens (effectiveCellPx = 8), touching blocked a1 tail (x=2.5, y=3.5) with a2 at 2.0 cells rescues a2 cleanly
  const denseMobileAssist = findBestTappedArrow(2.5, 3.5, sampleDotLevel.arrows, 6, 6, 1.2, 8);
  assert.equal(denseMobileAssist?.id, 'a2');

  // If NO escapable arrow exists nearby (e.g., two mutually locked arrows), tapping blocked arrow still resolves to blocked arrow
  const mutuallyBlocked: AmazeGoLevel['arrows'] = [
    {
      id: 'b1',
      path: [{ x: 1, y: 2 }, { x: 2, y: 2 }],
      head: { x: 2, y: 2 },
      direction: 'RIGHT',
      color: PURE_BLACK_COLOR,
    },
    {
      id: 'b2',
      path: [{ x: 4, y: 2 }, { x: 3, y: 2 }],
      head: { x: 3, y: 2 },
      direction: 'LEFT',
      color: PURE_BLACK_COLOR,
    },
  ];
  const isolatedWrong = findBestTappedArrow(1.5, 2.5, mutuallyBlocked, 6, 6);
  assert.equal(isolatedWrong?.id, 'b1');
});

test('Hard levels generate non-serial cross-locked mazes with wide mixed arrow sizes, high density, and multi-layer choke points', () => {
  for (const id of [50, 51, 100, 150, 226, 301, 499]) {
    const lvl = getAmazeGoLevel(id);
    const diff = evaluatePuzzleDifficulty(lvl);
    let totalTurns = 0;
    let maxLen = 0;
    let minLen = Infinity;
    let covered = 0;
    for (const a of lvl.arrows) {
      covered += a.path.length;
      if (a.path.length > maxLen) maxLen = a.path.length;
      if (a.path.length < minLen) minLen = a.path.length;
      for (let i = 2; i < a.path.length; i++) {
        const dx1 = a.path[i - 1].x - a.path[i - 2].x;
        const dy1 = a.path[i - 1].y - a.path[i - 2].y;
        const dx2 = a.path[i].x - a.path[i - 1].x;
        const dy2 = a.path[i].y - a.path[i - 1].y;
        if (dx1 !== dx2 || dy1 !== dy2) totalTurns++;
      }
    }
    let playableCount = lvl.width * lvl.height;
    if (lvl.activeMask) {
      playableCount = 0;
      for (let i = 0; i < lvl.activeMask.length; i++) {
        if (lvl.activeMask[i] === 1) playableCount++;
      }
    }
    const avgTurns = totalTurns / lvl.arrows.length;
    const density = covered / playableCount;
    const minDensity = lvl.isArtLevel ? 0.84 : 0.85;
    assert.ok(maxLen >= 14 && maxLen <= 28, `Level ${id} max arrow length ${maxLen} out of expected 14..28 mixed range`);
    assert.ok(minLen <= 3 && maxLen >= 14, `Level ${id} should mix tiny and giant arrows (${minLen}..${maxLen})`);
    assert.ok(density >= minDensity, `Level ${id} density ${density.toFixed(3)} left too many gaps`);
    assert.ok(avgTurns >= 1.5, `Level ${id} avgTurns=${avgTurns.toFixed(2)} is too straight`);
    assert.ok(diff.initialFree <= 2, `Level ${id} initialFree=${diff.initialFree} is too open at start`);
    assert.ok(diff.singleBottlenecks >= 4, `Level ${id} singleBottlenecks=${diff.singleBottlenecks} needs >= 4 choke points`);
    assert.ok(diff.multiLockedRatio >= 0.65, `Level ${id} multiLockedRatio=${diff.multiLockedRatio.toFixed(2)} too low`);
    assert.ok(diff.avgJumpDist >= 3.0, `Level ${id} avgJumpDist=${diff.avgJumpDist.toFixed(2)} too serial`);
  }

  // Verify Flower, Bengali, Alphabet, and distinct themes on 225 vs 230
  assert.equal(getAmazeGoLevel(5).artThemeName, 'Lotus Bloom');
  assert.equal(getAmazeGoLevel(10).artThemeName, 'বাংলা অ');
  assert.equal(getAmazeGoLevel(15).artThemeName, 'Letter A');
  assert.notEqual(getAmazeGoLevel(225).artThemeName, getAmazeGoLevel(230).artThemeName);
});

test('Difficulty scales smoothly from ultra-simple Level 1 to massive hard Level 499/500 with progressively fewer open arrows', () => {
  const lvl1 = getAmazeGoLevel(1);
  const diff1 = evaluatePuzzleDifficulty(lvl1);
  assert.equal(lvl1.width, 5);
  assert.equal(lvl1.height, 6);
  assert.ok(lvl1.arrows.length <= 12, `Level 1 should have very few arrows, got ${lvl1.arrows.length}`);
  assert.ok(
    diff1.initialFree >= 3,
    `Level 1 should be easy with >=3 initially open arrows, got ${diff1.initialFree}`
  );

  const lvl12 = getAmazeGoLevel(12);
  const lvl60 = getAmazeGoLevel(60);
  const diff60 = evaluatePuzzleDifficulty(lvl60);
  const lvl250 = getAmazeGoLevel(250);
  const lvl499 = getAmazeGoLevel(499);
  const diff499 = evaluatePuzzleDifficulty(lvl499);

  assert.ok(lvl12.arrows.length > lvl1.arrows.length, 'Level 12 must have more arrows than Level 1');
  assert.ok(lvl60.arrows.length > lvl12.arrows.length, 'Level 60 must have more arrows than Level 12');
  assert.ok(lvl250.arrows.length > lvl60.arrows.length, 'Level 250 must have more arrows than Level 60');
  assert.ok(lvl499.arrows.length > lvl250.arrows.length, 'Level 499 must have more arrows than Level 250');
  assert.ok(lvl499.arrows.length >= 600, `Level 499 expected >= 600 arrows, got ${lvl499.arrows.length}`);
  assert.ok(diff60.initialFree <= 2, `Level 60 initialFree=${diff60.initialFree} should be <= 2`);
  assert.ok(diff499.initialFree <= 2, `Level 499 initialFree=${diff499.initialFree} should be <= 2`);
  assert.ok(
    diff499.initialFree / lvl499.arrows.length < diff1.initialFree / lvl1.arrows.length,
    'Open arrow ratio must tighten dramatically from Level 1 to Level 499'
  );
});

test('All 30 animated showcase Boss levels (210, 220, ..., 500) are colossal zoomable Boss boards with mixed sizes and tight bottlenecks', () => {
  const seenThemeIds = new Set<string>();
  for (let id = 210; id <= 500; id += 10) {
    const lvl = getAmazeGoLevel(id);
    assert.equal(lvl.isAnimatedShowcase, true, `Level ${id} must be animated showcase`);
    assert.ok(lvl.width >= 90 && lvl.height >= 118, `Boss Level ${id} grid ${lvl.width}x${lvl.height} too small`);
    assert.ok(lvl.showcaseThemeId, `Level ${id} missing showcaseThemeId`);
    assert.ok(lvl.showcasePalette && lvl.showcasePalette.length === 3, `Level ${id} missing showcasePalette`);
    assert.ok(lvl.showcaseIntroPalette && lvl.showcaseIntroPalette.length === 3, `Level ${id} missing showcaseIntroPalette`);
    assert.ok(lvl.colorMask, `Level ${id} missing colorMask`);

    seenThemeIds.add(lvl.showcaseThemeId!);

    const check = validateArrowLevel(lvl);
    assert.equal(check.valid, true, `Showcase Level ${id} (${lvl.artThemeName}) invalid: ${check.reason}`);

    let playableCount = 0;
    if (lvl.activeMask) {
      for (let i = 0; i < lvl.activeMask.length; i++) {
        if (lvl.activeMask[i] === 1) playableCount++;
      }
    }
    const covered = lvl.arrows.reduce((acc, a) => acc + a.path.length, 0);
    const density = covered / Math.max(1, playableCount);
    assert.ok(density >= 0.78, `Showcase Level ${id} (${lvl.artThemeName}) density ${density.toFixed(3)} < 0.78`);

    let minLen = Infinity;
    let maxLen = 0;
    for (const a of lvl.arrows) {
      if (a.path.length < minLen) minLen = a.path.length;
      if (a.path.length > maxLen) maxLen = a.path.length;
    }
    assert.ok(minLen <= 3 && maxLen >= 14, `Boss Level ${id} should mix small and giant arrows (${minLen}..${maxLen})`);

    assert.ok(
      lvl.arrows.length >= 225,
      `Boss Level ${id} (${lvl.artThemeName}) expected >= 225 arrows, got ${lvl.arrows.length}`
    );

    const diff = evaluatePuzzleDifficulty(lvl);
    assert.ok(
      diff.initialFree <= 2,
      `Boss Level ${id} (${lvl.artThemeName}) initialFree=${diff.initialFree} is too open`
    );
    assert.ok(
      diff.singleBottlenecks >= 8,
      `Boss Level ${id} (${lvl.artThemeName}) singleBottlenecks=${diff.singleBottlenecks} < 8`
    );
    assert.ok(
      diff.waves >= 50,
      `Boss Level ${id} (${lvl.artThemeName}) waves=${diff.waves} < 50 (too avalanche-prone)`
    );
    assert.ok(
      diff.multiLockedRatio >= 0.8,
      `Boss Level ${id} (${lvl.artThemeName}) multiLockedRatio=${diff.multiLockedRatio.toFixed(2)} < 0.80`
    );

    const usedColors = new Set(lvl.arrows.map((a) => a.color));
    assert.ok(usedColors.size >= 2, `Showcase Level ${id} (${lvl.artThemeName}) should use >= 2 colors, got ${usedColors.size}`);
  }

  assert.equal(seenThemeIds.size, 30, 'All 30 animated showcase levels must have unique themes');
  assert.equal(getAmazeGoLevel(320).artThemeName, 'Clownfish');
  assert.equal(getAmazeGoLevel(350).artThemeName, 'Ocean Dolphin');
  assert.equal(getAmazeGoLevel(380).artThemeName, 'Savanna Lion');
  assert.equal(getAmazeGoLevel(500).artThemeName, 'Celestial Dragon');
});

test('Levels 1-20 have zero special arrows, levels 21+ have 5 yellow_burst arrows, and levels 28, 38, 48, ..., 498 bury a deep golden_key arrow', () => {
  // 1. Golden key & yellow burst schedule check
  assert.equal(isGoldenKeyLevel(7), false);
  assert.equal(isGoldenKeyLevel(8), false);
  assert.equal(isGoldenKeyLevel(10), false);
  assert.equal(isGoldenKeyLevel(18), false);
  assert.equal(isGoldenKeyLevel(28), true);
  assert.equal(isGoldenKeyLevel(38), true);
  assert.equal(isGoldenKeyLevel(48), true);
  assert.equal(isGoldenKeyLevel(498), true);
  assert.equal(isGoldenKeyLevel(500), false);

  assert.equal(hasYellowBurstArrows(1), false);
  assert.equal(hasYellowBurstArrows(20), false);
  assert.equal(hasYellowBurstArrows(21), true);
  assert.equal(hasYellowBurstArrows(500), true);

  // 2a. Every single level from 1 to 20 must have ZERO yellow_burst and ZERO golden_key arrows
  for (let id = 1; id <= 20; id++) {
    const lvl = getAmazeGoLevel(id);
    const yellows = lvl.arrows.filter((a) => a.specialType === 'yellow_burst');
    const goldens = lvl.arrows.filter((a) => a.specialType === 'golden_key');
    assert.equal(yellows.length, 0, `Level ${id} must have 0 yellow_burst arrows, got ${yellows.length}`);
    assert.equal(goldens.length, 0, `Level ${id} must have 0 golden_key arrows, got ${goldens.length}`);
  }

  // 2b. Verify 5 yellow_burst arrows on levels 21+ and deep golden_key on 28, 38, 108, 498
  for (const id of [21, 25, 28, 38, 50, 108, 210, 498, 500]) {
    const lvl = getAmazeGoLevel(id);
    const yellows = lvl.arrows.filter((a) => a.specialType === 'yellow_burst');
    const goldens = lvl.arrows.filter((a) => a.specialType === 'golden_key');

    assert.equal(yellows.length, 5, `Level ${id} must have 5 yellow_burst arrows, got ${yellows.length}`);

    if (isGoldenKeyLevel(id)) {
      assert.equal(goldens.length, 1, `Golden level ${id} must have exactly 1 golden_key arrow`);
      const { waveById, maxWave } = computeArrowWaveDepths(lvl.width, lvl.height, lvl.arrows);
      const goldenWave = waveById.get(goldens[0].id) ?? 0;
      assert.ok(goldenWave > 0, `Golden arrow on level ${id} must not be wave 0`);
      assert.ok(
        goldenWave >= Math.floor(maxWave * 0.6),
        `Golden arrow on level ${id} must be buried deep (wave ${goldenWave}/${maxWave})`
      );
    } else {
      assert.equal(goldens.length, 0, `Non-golden level ${id} must not have golden_key arrow`);
    }
  }

  // 3. Yellow burst cascade test: opening y1 sweeps nearby open arrows (n1 + unlocked n2) while leaving far arrow untouched
  const burstArrows: AmazeGoLevel['arrows'] = [
    {
      id: 'y1',
      path: [{ x: 4, y: 4 }, { x: 4, y: 3 }],
      head: { x: 4, y: 3 },
      direction: 'UP',
      color: PURE_BLACK_COLOR,
      specialType: 'yellow_burst',
    },
    {
      id: 'n1',
      path: [{ x: 5, y: 4 }, { x: 6, y: 4 }],
      head: { x: 6, y: 4 },
      direction: 'RIGHT',
      color: PURE_BLACK_COLOR,
    },
    {
      id: 'n2',
      path: [{ x: 4, y: 6 }, { x: 4, y: 5 }],
      head: { x: 4, y: 5 },
      direction: 'UP', // was blocked by y1!
      color: PURE_BLACK_COLOR,
    },
    {
      id: 'farOpen',
      path: [{ x: 18, y: 18 }, { x: 19, y: 18 }],
      head: { x: 19, y: 18 },
      direction: 'RIGHT',
      color: PURE_BLACK_COLOR,
    },
  ];
  const swept = resolveYellowBurstEscapes(20, 20, burstArrows, burstArrows[0]);
  const sweptIds = new Set(swept.map((a) => a.id));
  assert.equal(sweptIds.has('n1'), true, 'Nearby already-open arrow must fly out with yellow burst');
  assert.equal(sweptIds.has('n2'), true, 'Nearby arrow unlocked by yellow arrow must fly out too');
  assert.equal(sweptIds.has('farOpen'), false, 'Distant arrow outside burst radius must remain on board');
});

test('Every 10th level has greatly increased arrow counts and higher difficulty', () => {
  const lvl10 = getAmazeGoLevel(10);
  const lvl50 = getAmazeGoLevel(50);
  const lvl100 = getAmazeGoLevel(100);
  const lvl210 = getAmazeGoLevel(210);
  const lvl500 = getAmazeGoLevel(500);

  assert.ok(lvl10.arrows.length >= 60, `Level 10 expected >= 60 arrows, got ${lvl10.arrows.length}`);
  assert.ok(lvl50.arrows.length >= 110, `Level 50 expected >= 110 arrows, got ${lvl50.arrows.length}`);
  assert.ok(lvl100.arrows.length >= 180, `Level 100 expected >= 180 arrows, got ${lvl100.arrows.length}`);
  assert.ok(lvl210.arrows.length >= 450, `Level 210 expected >= 450 arrows, got ${lvl210.arrows.length}`);
  assert.ok(lvl500.arrows.length >= 850, `Level 500 expected >= 850 arrows, got ${lvl500.arrows.length}`);

  for (const lvl of [lvl10, lvl50, lvl100, lvl210, lvl500]) {
    const diff = evaluatePuzzleDifficulty(lvl);
    assert.equal(diff.initialFree, 1, `10th level ${lvl.id} must have strict single-key start (initialFree=1)`);
  }
});
