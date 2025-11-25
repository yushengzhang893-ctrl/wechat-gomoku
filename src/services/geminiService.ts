import { GoogleGenAI, Type } from "@google/genai";
import { BoardState, Move } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiMove = async (board: BoardState): Promise<Move> => {
  // Simplify board for token efficiency
  // 0 = empty, 1 = black (user), 2 = white (AI)
  const simpleBoard = board.map(row => 
    row.map(cell => {
      if (cell === 'black') return 1;
      if (cell === 'white') return 2;
      return 0;
    })
  );

  const prompt = `
    You are a Gomoku (Five-in-a-Row) expert. You are playing as White (2). 
    Black (1) is the opponent.
    The board is 15x15.
    
    Current board state (0=empty, 1=Black, 2=White):
    ${JSON.stringify(simpleBoard)}
    
    Analyze the board and find the absolute best move to either win or block Black from winning.
    Return ONLY the coordinate of your move.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.INTEGER, description: "Row index (0-14)" },
            y: { type: Type.INTEGER, description: "Column index (0-14)" }
          },
          required: ["x", "y"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");
    
    const move = JSON.parse(jsonText) as Move;
    
    // Validate move
    if (move.x < 0 || move.x >= 15 || move.y < 0 || move.y >= 15 || board[move.x][move.y] !== null) {
        console.warn("AI returned invalid move, falling back to random");
        return getRandomMove(board);
    }
    
    return move;

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return getRandomMove(board);
  }
};

const getRandomMove = (board: BoardState): Move => {
  const emptyCells: Move[] = [];
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15; j++) {
      if (board[i][j] === null) {
        emptyCells.push({ x: i, y: j });
      }
    }
  }
  if (emptyCells.length === 0) return { x: 0, y: 0 }; // Should be handled by game over check
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};