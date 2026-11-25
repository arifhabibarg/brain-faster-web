import { BoardTile, Direction, GridCoord, LevelData, ParsedBoard, RollResult } from './types';

export function parseLevel(levelData: LevelData): ParsedBoard {
  const height = levelData.grid.length;
  const width = Math.max(...levelData.grid.map(row => row.length));

  const tiles: BoardTile[][] = [];
  let spawn: GridCoord = { x: 1, y: 1 };
  let totalFloorCount = 0;

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    const row = levelData.grid[y];
    for (let x = 0; x < width; x++) {
      const char = x < row.length ? row[x] : '#';
      if (char === '#') {
        tiles[y][x] = { x, y, type: 'wall', painted: false };
      } else if (char === ' ') {
        tiles[y][x] = { x, y, type: 'void', painted: false };
      } else if (char === 'P') {
        spawn = { x, y };
        tiles[y][x] = { x, y, type: 'floor', painted: true };
        totalFloorCount++;
      } else {
        // Floor tile ('.')
        tiles[y][x] = { x, y, type: 'floor', painted: false };
        totalFloorCount++;
      }
    }
  }

  return {
    width,
    height,
    tiles,
    spawn,
    totalFloorCount
  };
}

export function getDirectionOffset(direction: Direction): { dx: number; dy: number } {
  switch (direction) {
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

export function isWalkable(board: ParsedBoard, x: number, y: number): boolean {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
    return false;
  }
  const tile = board.tiles[y]?.[x];
  return !!tile && tile.type === 'floor';
}

export function getValidDirections(board: ParsedBoard, pos: GridCoord): Direction[] {
  const allDirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  return allDirs.filter(dir => {
    const { dx, dy } = getDirectionOffset(dir);
    return isWalkable(board, pos.x + dx, pos.y + dy);
  });
}

export function findRollDestination(
  board: ParsedBoard,
  currentPos: GridCoord,
  direction: Direction
): RollResult {
  const { dx, dy } = getDirectionOffset(direction);
  let curX = currentPos.x;
  let curY = currentPos.y;
  const traversed: GridCoord[] = [{ x: curX, y: curY }];
  let newlyPaintedCount = 0;

  while (true) {
    const nextX = curX + dx;
    const nextY = curY + dy;

    if (!isWalkable(board, nextX, nextY)) {
      break;
    }

    curX = nextX;
    curY = nextY;
    traversed.push({ x: curX, y: curY });

    const tile = board.tiles[curY][curX];
    if (!tile.painted) {
      newlyPaintedCount++;
    }
  }

  const didMove = curX !== currentPos.x || curY !== currentPos.y;

  return {
    startPos: { ...currentPos },
    endPos: { x: curX, y: curY },
    traversed,
    newlyPaintedCount,
    didMove
  };
}

export function applyRoll(
  board: ParsedBoard,
  currentPos: GridCoord,
  direction: Direction
): RollResult {
  const result = findRollDestination(board, currentPos, direction);

  if (result.didMove) {
    for (const pos of result.traversed) {
      const tile = board.tiles[pos.y][pos.x];
      if (tile && tile.type === 'floor') {
        tile.painted = true;
      }
    }
  }

  return result;
}

export function calculateProgress(board: ParsedBoard): {
  total: number;
  painted: number;
  percentage: number;
  isComplete: boolean;
} {
  let painted = 0;
  let total = 0;

  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const tile = board.tiles[y][x];
      if (tile.type === 'floor') {
        total++;
        if (tile.painted) {
          painted++;
        }
      }
    }
  }

  const percentage = total > 0 ? Math.round((painted / total) * 100) : 0;
  const isComplete = total > 0 && painted === total;

  return {
    total,
    painted,
    percentage,
    isComplete
  };
}

export function resetBoard(board: ParsedBoard): void {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const tile = board.tiles[y][x];
      if (tile.type === 'floor') {
        tile.painted = (x === board.spawn.x && y === board.spawn.y);
      }
    }
  }
}
