import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, findRollDestination, applyRoll, calculateProgress, resetBoard, getValidDirections } from './mazeLogic';
import { LevelData } from './types';

const testLevel: LevelData = {
  id: 1,
  name: 'Test Room',
  difficulty: 'Easy',
  grid: [
    '#####',
    '#P..#',
    '#...#',
    '#...#',
    '#####'
  ]
};

test('parseLevel extracts correct dimensions, spawn point and total floor count', () => {
  const board = parseLevel(testLevel);
  assert.equal(board.width, 5);
  assert.equal(board.height, 5);
  assert.deepEqual(board.spawn, { x: 1, y: 1 });
  // In a 5x5 box with walls on perimeter, interior is 3x3 = 9 floor tiles
  assert.equal(board.totalFloorCount, 9);
  // Spawn tile is initially painted
  assert.equal(board.tiles[1][1].painted, true);
  // Other floor tiles unpainted initially
  assert.equal(board.tiles[1][2].painted, false);
});

test('findRollDestination rolls in a straight line until hitting wall', () => {
  const board = parseLevel(testLevel);
  // Rolling RIGHT from (1, 1):
  // (1, 1) -> (2, 1) -> (3, 1), wall is at (4, 1)
  const result = findRollDestination(board, { x: 1, y: 1 }, 'RIGHT');
  assert.equal(result.didMove, true);
  assert.deepEqual(result.endPos, { x: 3, y: 1 });
  assert.equal(result.traversed.length, 3);
  assert.deepEqual(result.traversed[1], { x: 2, y: 1 });
  assert.deepEqual(result.traversed[2], { x: 3, y: 1 });
  assert.equal(result.newlyPaintedCount, 2);
});

test('findRollDestination returns didMove=false when already facing wall', () => {
  const board = parseLevel(testLevel);
  // (1,1) UP is wall at (1,0)
  const result = findRollDestination(board, { x: 1, y: 1 }, 'UP');
  assert.equal(result.didMove, false);
  assert.deepEqual(result.endPos, { x: 1, y: 1 });
  assert.equal(result.newlyPaintedCount, 0);
});

test('applyRoll updates painted state along the path', () => {
  const board = parseLevel(testLevel);
  const result = applyRoll(board, { x: 1, y: 1 }, 'RIGHT');
  assert.equal(result.didMove, true);
  assert.equal(board.tiles[1][2].painted, true);
  assert.equal(board.tiles[1][3].painted, true);

  const progress = calculateProgress(board);
  // 3 out of 9 tiles painted: 33%
  assert.equal(progress.painted, 3);
  assert.equal(progress.total, 9);
  assert.equal(progress.percentage, 33);
  assert.equal(progress.isComplete, false);
});

test('calculateProgress identifies 100% completion when all floor tiles painted', () => {
  const board = parseLevel(testLevel);
  for (let y = 1; y <= 3; y++) {
    for (let x = 1; x <= 3; x++) {
      board.tiles[y][x].painted = true;
    }
  }
  const progress = calculateProgress(board);
  assert.equal(progress.painted, 9);
  assert.equal(progress.percentage, 100);
  assert.equal(progress.isComplete, true);
});

test('resetBoard resets all tiles back except spawn tile', () => {
  const board = parseLevel(testLevel);
  applyRoll(board, { x: 1, y: 1 }, 'RIGHT');
  applyRoll(board, { x: 3, y: 1 }, 'DOWN');
  assert.ok(calculateProgress(board).painted > 1);

  resetBoard(board);
  const progress = calculateProgress(board);
  assert.equal(progress.painted, 1);
  assert.equal(board.tiles[board.spawn.y][board.spawn.x].painted, true);
});

test('getValidDirections returns only open walkable directions', () => {
  const board = parseLevel(testLevel);
  // At spawn (1, 1), UP is wall (1, 0), LEFT is wall (0, 1)
  // Walkable: RIGHT to (2, 1) and DOWN to (1, 2)
  const validDirs = getValidDirections(board, { x: 1, y: 1 });
  assert.deepEqual(validDirs.sort(), ['DOWN', 'RIGHT'].sort());
});

