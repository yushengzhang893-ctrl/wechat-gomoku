export type Player = 'black' | 'white';
export type CellValue = Player | null;
export type BoardState = CellValue[][];

export enum GameMode {
  PVP_LOCAL = 'PVP_LOCAL',
  PVE_GEMINI = 'PVE_GEMINI',
  PVP_ONLINE = 'PVP_ONLINE',
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

export interface WinResult {
  winner: Player | null;
  winningLine: [number, number][] | null;
}

export interface Move {
  x: number;
  y: number;
}

// Online specific types
export type OnlineRole = 'host' | 'guest' | null;

export interface OnlineMessage {
  type: 'JOIN' | 'START_GAME' | 'MOVE' | 'RESTART' | 'LEAVE';
  payload?: any;
}