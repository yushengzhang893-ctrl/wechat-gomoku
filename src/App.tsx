import React, { useState, useEffect, useCallback } from 'react';
import Board from './components/Board';
import { Avatar } from './components/Avatar';
import { 
    createEmptyBoard, 
    checkWin, 
    isBoardFull
} from './services/gameLogic';
import { getGeminiMove } from './services/geminiService';
import { onlineService } from './services/onlineService';

// 类型导入
import type { 
    Player, 
    BoardState, 
    WinResult,
    OnlineRole,
    GameStatus,
    GameMode,
    OnlineMessage
} from './types';

// 定义常量值（替代原来的枚举值）
const GAME_MODES = {
  PVP_LOCAL: 'PVP_LOCAL',
  PVE_GEMINI: 'PVE_GEMINI', 
  PVP_ONLINE: 'PVP_ONLINE',
} as const;

const GAME_STATUS = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  ENDED: 'ENDED',
} as const;

// Icons
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
);
const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
);

const App: React.FC = () => {
  // Game State - 使用字符串字面量而不是类型
  const [status, setStatus] = useState<GameStatus>(GAME_STATUS.IDLE);
  const [mode, setMode] = useState<GameMode>(GAME_MODES.PVP_LOCAL);
  const [board, setBoard] = useState<BoardState>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [lastMove, setLastMove] = useState<{ row: number, col: number } | null>(null);
  const [winResult, setWinResult] = useState<WinResult | null>(null);
  
  // AI State
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Online State
  const [onlineRole, setOnlineRole] = useState<OnlineRole>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [inputRoomId, setInputRoomId] = useState<string>("");
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("IDLE");

  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setStatus(GAME_STATUS.PLAYING);
    setBoard(createEmptyBoard());
    setCurrentPlayer('black');
    setLastMove(null);
    setWinResult(null);
    setIsAiThinking(false);

    // Online reset
    if (selectedMode !== GAME_MODES.PVP_ONLINE) {
        setOnlineRole(null);
        setRoomId("");
        onlineService.disconnect();
    }
  };

  const returnToMenu = () => {
    if (mode === GAME_MODES.PVP_ONLINE) {
        onlineService.disconnect();
    }
    setStatus(GAME_STATUS.IDLE);
    setOnlineRole(null);
    setRoomId("");
    setIsWaitingForOpponent(false);
    setShowInviteModal(false);
    setConnectionStatus("IDLE");
  };

  // --- Online Logic ---

  const handleOnlineMessage = (msg: OnlineMessage) => {
    console.log("Received message:", msg);
    
    if (msg.type === 'JOIN') {
        // Only Host receives JOIN
        setIsWaitingForOpponent(false);
        setShowInviteModal(false);
        // Host tells Guest to start
        onlineService.sendMessage({ type: 'START_GAME' });
        startGame(GAME_MODES.PVP_ONLINE); // Reset board logic for host
    } else if (msg.type === 'START_GAME') {
        // Guest receives START_GAME
        setIsWaitingForOpponent(false);
        startGame(GAME_MODES.PVP_ONLINE); // Reset board logic for guest
    } else if (msg.type === 'MOVE') {
        const { move, player } = msg.payload;
        // Apply remote move
        applyMove(move.x, move.y, player);
    } else if (msg.type === 'LEAVE') {
        alert("对方已离开房间");
        returnToMenu();
    } else if (msg.type === 'RESTART') {
        setBoard(createEmptyBoard());
        setCurrentPlayer('black');
        setLastMove(null);
        setWinResult(null);
        setStatus(GAME_STATUS.PLAYING);
    }
  };

  const handleConnectionStatus = (status: string) => {
      setConnectionStatus(status);
  };

  const createOnlineRoom = () => {
    const newRoomId = onlineService.generateRoomId();
    setRoomId(newRoomId);
    setOnlineRole('host');
    setIsWaitingForOpponent(true);
    setMode(GAME_MODES.PVP_ONLINE);
    
    onlineService.createRoom(newRoomId, handleOnlineMessage, handleConnectionStatus);
    setShowInviteModal(true);
  };

  const joinOnlineRoom = () => {
    if (!inputRoomId || inputRoomId.length < 5) {
        alert("请输入正确的5位房间号");
        return;
    }
    const id = inputRoomId.toUpperCase();
    setRoomId(id);
    setOnlineRole('guest');
    setMode(GAME_MODES.PVP_ONLINE);
    
    // Guest joins and waits for host to say "START"
    onlineService.joinRoom(id, handleOnlineMessage, handleConnectionStatus);
  };

  // --- Core Game Logic ---

  const applyMove = (row: number, col: number, player: Player) => {
    // Explicitly copy the board to avoid reference issues
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;
    setBoard(newBoard);
    setLastMove({ row, col });

    const result = checkWin(newBoard, row, col, player);
    if (result.winner) {
      setWinResult(result);
      setStatus(GAME_STATUS.ENDED);
    } else if (isBoardFull(newBoard)) {
      setStatus(GAME_STATUS.ENDED);
    } else {
      setCurrentPlayer(player === 'black' ? 'white' : 'black');
    }
  };

  const handleCellClick = useCallback(async (row: number, col: number) => {
    // 1. Validation
    if (status !== GAME_STATUS.PLAYING || board[row][col] !== null || winResult?.winner || isAiThinking) {
      return;
    }

    // 2. Online Permission Check
    if (mode === GAME_MODES.PVP_ONLINE) {
        if (isWaitingForOpponent) return;
        // Host plays Black, Guest plays White
        if (onlineRole === 'host' && currentPlayer !== 'black') return;
        if (onlineRole === 'guest' && currentPlayer !== 'white') return;
    }

    // 3. Execute Move Locally
    applyMove(row, col, currentPlayer);

    // 4. Handle Online Sending
    if (mode === GAME_MODES.PVP_ONLINE) {
        onlineService.sendMove({ x: row, y: col }, currentPlayer);
    }

    // 5. Handle AI
    if (mode === GAME_MODES.PVE_GEMINI) {
        setIsAiThinking(true);
    }
  }, [board, currentPlayer, status, winResult, mode, isAiThinking, onlineRole, isWaitingForOpponent]);

  // AI Turn Effect
  useEffect(() => {
    if (mode === GAME_MODES.PVE_GEMINI && currentPlayer === 'white' && status === GAME_STATUS.PLAYING && !winResult?.winner && isAiThinking) {
        const makeAiMove = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 600)); 
                const move = await getGeminiMove(board);
                if (board[move.x][move.y] === null) {
                    applyMove(move.x, move.y, 'white');
                }
            } catch (e) {
                console.error("AI Move failed", e);
            } finally {
                setIsAiThinking(false);
            }
        };
        makeAiMove();
    }
  }, [isAiThinking, mode, currentPlayer, status, board, winResult]);

  // Handle Online Restart
  const handleRestart = () => {
    if (mode === GAME_MODES.PVP_ONLINE) {
        onlineService.sendMessage({ type: 'RESTART' });
    }
    setBoard(createEmptyBoard());
    setCurrentPlayer('black');
    setLastMove(null);
    setWinResult(null);
    setStatus(GAME_STATUS.PLAYING);
  };


  // ---- Renders ----

  // 1. Main Menu
  if (status === GAME_STATUS.IDLE && !onlineRole) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 space-y-12">
        <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-green-500 rounded-2xl mx-auto shadow-lg flex items-center justify-center">
                <div className="grid grid-cols-2 gap-1">
                    <div className="w-6 h-6 bg-black rounded-full"></div>
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                    <div className="w-6 h-6 bg-black rounded-full"></div>
                </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-wide">微五子棋</h1>
            <p className="text-gray-500 text-sm">Real-time Gomoku Battle</p>
        </div>

        <div className="w-full max-w-xs space-y-4">
            <button 
                onClick={() => startGame(GAME_MODES.PVP_LOCAL)}
                className="w-full py-4 bg-white active:bg-gray-50 text-gray-800 rounded-xl font-semibold shadow-sm flex items-center justify-center space-x-2 border border-gray-200"
            >
                <span>👥</span>
                <span>好友对战 (同屏)</span>
            </button>
            <button 
                onClick={() => setOnlineRole('host')} // Temporary state to show Lobby
                className="w-full py-4 bg-green-500 active:bg-green-600 text-white rounded-xl font-semibold shadow-md flex items-center justify-center space-x-2"
            >
                <span>🌏</span>
                <span>在线对战 (邀请)</span>
            </button>
            <button 
                onClick={() => startGame(GAME_MODES.PVE_GEMINI)}
                className="w-full py-4 bg-white active:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl font-semibold shadow-sm flex items-center justify-center space-x-2"
            >
                <span>🤖</span>
                <span>挑战 AI (Gemini)</span>
            </button>
        </div>
      </div>
    );
  }

  // 2. Online Lobby (Select Create or Join)
  if (status === GAME_STATUS.IDLE && onlineRole === 'host' && !roomId) {
      return (
          <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 relative">
              <button onClick={returnToMenu} className="absolute top-6 left-6 p-2 bg-white rounded-full shadow-sm text-gray-600">
                  <HomeIcon />
              </button>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-8">在线对战大厅</h2>
              
              <div className="w-full max-w-xs space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="font-semibold text-lg">创建房间</h3>
                      <p className="text-sm text-gray-500">生成房间号，邀请好友加入</p>
                      <button 
                          onClick={createOnlineRoom}
                          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium shadow-sm active:scale-95 transition-transform"
                      >
                          创建新房间
                      </button>
                  </div>

                  <div className="flex items-center justify-center text-gray-400 text-sm">
                      - OR -
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="font-semibold text-lg">加入房间</h3>
                      <input 
                          type="text" 
                          placeholder="输入5位房间号" 
                          className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                          value={inputRoomId}
                          onChange={(e) => setInputRoomId(e.target.value.toUpperCase().slice(0, 5))}
                      />
                      <button 
                          onClick={joinOnlineRoom}
                          className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                          disabled={inputRoomId.length < 5}
                      >
                          {connectionStatus === "IDLE" ? "加入房间" : "连接中..."}
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  // 3. Online Waiting Modal / Invitation
  if (showInviteModal) {
      return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-6 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center">
                        <ShareIcon />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">邀请好友对战</h3>
                        <p className="text-gray-500 text-sm mt-2">将房间号发送给好友</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Room ID</p>
                        <p className="text-4xl font-mono font-bold text-gray-800 tracking-[0.1em] uppercase">{roomId}</p>
                    </div>

                    <div className="flex flex-col space-y-3">
                        <button 
                             onClick={() => {
                                 navigator.clipboard.writeText(`来微五子棋和我对战！房间号: ${roomId}`);
                                 alert("邀请口令已复制！请发送给微信好友。");
                             }}
                            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium shadow-md flex items-center justify-center space-x-2"
                        >
                            <span>复制邀请口令</span>
                        </button>
                        <button 
                            onClick={returnToMenu}
                            className="text-gray-400 text-sm hover:text-gray-600"
                        >
                            取消
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-xs text-center text-gray-400">
                    {connectionStatus === 'WAITING' ? '等待连接服务器...' : '等待好友加入...'}
                </div>
            </div>
        </div>
      );
  }

  // 4. Main Game Board
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20">
        <button onClick={returnToMenu} className="p-2 text-gray-600 active:bg-gray-100 rounded-full">
            <HomeIcon />
        </button>
        <span className="font-semibold text-gray-800">
            {mode === GAME_MODES.PVP_ONLINE 
                ? `在线对战 (${roomId})` 
                : mode === GAME_MODES.PVP_LOCAL 
                    ? '好友对战' 
                    : '人机对战 (Level: Master)'}
        </span>
        <button onClick={handleRestart} className="p-2 text-gray-600 active:bg-gray-100 rounded-full">
            <RefreshIcon />
        </button>
      </div>

      {/* Players */}
      <div className="flex justify-between px-8 py-6 bg-white shadow-sm z-10">
        <Avatar 
            player="black" 
            isActive={currentPlayer === 'black' && !winResult} 
            name={mode === GAME_MODES.PVP_ONLINE && onlineRole === 'guest' ? "对手 (黑)" : "我方 (黑)"} 
        />
        <div className="flex items-center justify-center px-4 flex-col">
            <span className="text-2xl font-bold text-gray-300">VS</span>
            {mode === GAME_MODES.PVP_ONLINE && (
                <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-1">Live</span>
            )}
        </div>
        <Avatar 
            player="white" 
            isActive={currentPlayer === 'white' && !winResult} 
            name={
                mode === GAME_MODES.PVE_GEMINI ? "Gemini AI" : 
                mode === GAME_MODES.PVP_ONLINE ? (onlineRole === 'guest' ? "我方 (白)" : "对手 (白)") :
                "玩家 (白)"
            } 
            isAi={mode === GAME_MODES.PVE_GEMINI}
        />
      </div>

      {/* Board Area */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
         <Board 
            board={board} 
            onCellClick={handleCellClick}
            lastMove={lastMove}
            winningLine={winResult?.winningLine || null}
            disabled={
                status === GAME_STATUS.ENDED || 
                (mode === GAME_MODES.PVE_GEMINI && currentPlayer === 'white') ||
                (mode === GAME_MODES.PVP_ONLINE && onlineRole === 'host' && currentPlayer !== 'black') ||
                (mode === GAME_MODES.PVP_ONLINE && onlineRole === 'guest' && currentPlayer !== 'white')
            }
         />
      </div>

      {/* Footer / Status */}
      <div className="bg-white border-t border-gray-200 p-4 pb-8 safe-area-pb text-center min-h-[100px] flex items-center justify-center flex-col">
        {status === GAME_STATUS.ENDED ? (
            <div className="space-y-2 animate-bounce">
                <div className="text-xl font-bold">
                    {winResult?.winner === 'black' ? '⚫ 黑棋获胜!' : winResult?.winner === 'white' ? '⚪ 白棋获胜!' : '平局!'}
                </div>
                <button 
                    onClick={handleRestart}
                    className="px-6 py-2 bg-green-500 text-white rounded-full text-sm font-medium shadow-md"
                >
                    再来一局
                </button>
            </div>
        ) : (
            <div className="text-gray-500 font-medium flex items-center space-x-2">
               {isAiThinking || (mode === GAME_MODES.PVP_ONLINE && ((onlineRole === 'host' && currentPlayer === 'white') || (onlineRole === 'guest' && currentPlayer === 'black'))) ? (
                   <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-2">对手思考中...</span>
                   </>
               ) : (
                   <span>
                       {mode === GAME_MODES.PVP_ONLINE ? '你的回合' : `轮到 ${currentPlayer === 'black' ? '黑棋 (⚫)' : '白棋 (⚪)'} 落子`}
                   </span>
               )}
            </div>
        )}
      </div>
    </div>
  );
};

export default App;