import type{ BoardState, Player, WinResult } from '../types';

export const BOARD_SIZE = 15;

export const createEmptyBoard = (): BoardState => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
};

export const checkWin = (board: BoardState, lastMoveRow: number, lastMoveCol: number, player: Player): WinResult => {
  const directions = [
    [0, 1],  // Horizontal
    [1, 0],  // Vertical
    [1, 1],  // Diagonal \
    [1, -1]  // Diagonal /
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    const line: [number, number][] = [[lastMoveRow, lastMoveCol]];

    // Check forward
    let r = lastMoveRow + dx;
    let c = lastMoveCol + dy;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
      count++;
      line.push([r, c]);
      r += dx;
      c += dy;
    }

    // Check backward
    r = lastMoveRow - dx;
    c = lastMoveCol - dy;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
      count++;
      line.push([r, c]);
      r -= dx;
      c -= dy;
    }

    if (count >= 5) {
      return { winner: player, winningLine: line };
    }
  }

  return { winner: null, winningLine: null };
};

export const isBoardFull = (board: BoardState): boolean => {
  return board.every(row => row.every(cell => cell !== null));
};