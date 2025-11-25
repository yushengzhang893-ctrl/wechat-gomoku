import React, { useMemo } from 'react';
import { BoardState, Player } from '../types';
import { BOARD_SIZE } from '../services/gameLogic';

interface BoardProps {
  board: BoardState;
  onCellClick: (row: number, col: number) => void;
  lastMove: { row: number, col: number } | null;
  winningLine: [number, number][] | null;
  disabled: boolean;
}

const Board: React.FC<BoardProps> = ({ board, onCellClick, lastMove, winningLine, disabled }) => {
  
  // Memoize grid rendering for performance
  const gridLines = useMemo(() => {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Horizontal Lines */}
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <div 
            key={`h-${i}`} 
            className="absolute bg-slate-800"
            style={{ 
              height: '1px', 
              width: '100%', 
              top: `${(i / (BOARD_SIZE - 1)) * 100}%`,
              opacity: 0.6
            }} 
          />
        ))}
        {/* Vertical Lines */}
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <div 
            key={`v-${i}`} 
            className="absolute bg-slate-800"
            style={{ 
              width: '1px', 
              height: '100%', 
              left: `${(i / (BOARD_SIZE - 1)) * 100}%`,
              opacity: 0.6
            }} 
          />
        ))}
        {/* Star Points (Tengen and Hoshi) */}
        {[3, 7, 11].map(r => [3, 7, 11].map(c => (
             <div 
                key={`dot-${r}-${c}`}
                className="absolute bg-slate-900 rounded-full"
                style={{
                    width: '6px',
                    height: '6px',
                    top: `calc(${(r / (BOARD_SIZE - 1)) * 100}% - 3px)`,
                    left: `calc(${(c / (BOARD_SIZE - 1)) * 100}% - 3px)`
                }}
             />
        )))}
      </div>
    );
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[600px] wood-texture shadow-xl rounded-sm p-4 select-none">
      <div className="relative w-full h-full">
        {gridLines}

        {/* Clickable Area Layer */}
        <div 
            className="absolute inset-0 grid" 
            style={{ 
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`
            }}
        >
          {board.map((row, rIndex) => (
            row.map((cell, cIndex) => {
              const isLastMove = lastMove?.row === rIndex && lastMove?.col === cIndex;
              const isWinningPiece = winningLine?.some(([wr, wc]) => wr === rIndex && wc === cIndex);

              return (
                <div 
                  key={`${rIndex}-${cIndex}`}
                  className="relative flex items-center justify-center cursor-pointer"
                  onClick={() => !disabled && onCellClick(rIndex, cIndex)}
                >
                  {/* Invisible Hitbox: Slightly larger than visual grid cell for better touch target */}
                  <div className="w-[90%] h-[90%] z-10" />

                  {/* Piece Rendering */}
                  {cell && (
                    <div 
                      className={`
                        absolute w-[80%] h-[80%] rounded-full shadow-md z-20 transition-all duration-300 transform scale-100
                        ${cell === 'black' 
                            ? 'bg-gradient-to-br from-gray-700 to-black' 
                            : 'bg-gradient-to-br from-white to-gray-200 border border-gray-300'
                        }
                        ${isWinningPiece ? 'ring-2 ring-red-500 ring-offset-2 animate-pulse' : ''}
                      `}
                    >
                        {/* Last Move Marker */}
                        {isLastMove && (
                            <div className={`
                                absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full
                                ${cell === 'black' ? 'bg-white/50' : 'bg-black/50'}
                            `} />
                        )}
                    </div>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
};

export default Board;