import React from 'react';
import type { Player } from '../types';

interface AvatarProps {
  player: Player;
  isActive: boolean;
  name: string;
  isAi?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ player, isActive, name, isAi }) => {
  return (
    <div className={`flex flex-col items-center transition-opacity duration-300 ${isActive ? 'opacity-100 scale-110' : 'opacity-60 scale-100'}`}>
      <div className={`
        w-14 h-14 rounded-lg flex items-center justify-center mb-2 border-2 shadow-sm
        ${player === 'black' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}
        ${isActive ? 'ring-2 ring-green-500 ring-offset-2' : ''}
      `}>
         {isAi ? (
             <span className="text-2xl">🤖</span>
         ) : (
            <div className={`w-8 h-8 rounded-full ${player === 'black' ? 'bg-black' : 'bg-gray-200 border border-gray-400'}`} />
         )}
      </div>
      <span className="text-xs font-medium text-gray-700">{name}</span>
      {isActive && <span className="text-[10px] text-green-600 font-bold mt-1">思考中...</span>}
    </div>
  );
};