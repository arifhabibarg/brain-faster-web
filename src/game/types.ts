export type TileType = 'floor' | 'wall' | 'void';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridCoord {
  x: number;
  y: number;
}

export interface BoardTile {
  x: number;
  y: number;
  type: TileType;
  painted: boolean;
}

export interface LevelData {
  id: number;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  grid: string[];
}

export interface ParsedBoard {
  width: number;
  height: number;
  tiles: BoardTile[][];
  spawn: GridCoord;
  totalFloorCount: number;
}

export interface RollResult {
  startPos: GridCoord;
  endPos: GridCoord;
  traversed: GridCoord[];
  newlyPaintedCount: number;
  didMove: boolean;
}

export interface ColorTheme {
  id: string;
  name: string;
  ballColor: string;
  paintColor: string;
  trailColor: string;
  wallColor: string;
  wallTopColor: string;
  floorColor: string;
  bgColor: string;
  bgGradient: [string, string];
}

export type BallSkin = 'classic' | 'star' | 'donut' | 'stripes' | 'gem';
