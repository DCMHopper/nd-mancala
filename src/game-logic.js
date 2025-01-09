import { matrix } from "mathjs";

/**
 * Initialize a mancala board with given dimensions
 * @param {number} dimensions - Number of dimensions
 * @param {number} pocketsPerSide - Number of pockets per player
 * @returns {Matrix} - n-dimensional matrix representing the board
 */
export function initializeBoard(dimensions, pocketsPerSide) {
  // For now, just create a 2D board as proof of concept
  // Later we'll expand this to handle n dimensions
  const boardSize = pocketsPerSide * 2; // no mancalas
  const initialStones = 4;

  // Create a 1D array and fill with initial stones
  const board = Array(boardSize).fill(initialStones);
  // Add mancalas as separate counters (not part of the main array)
  const mancalas = {
    player1: 0,
    player2: 0,
  };

  // Return both the board and mancalas
  return {
    board: matrix(board),
    mancalas,
  };
}

/**
 * Perform a move on the board
 * @param {Matrix} board - Current board state
 * @param {Array} position - Position to move from (coordinates depend on dimensions)
 * @returns {Matrix} - New board state after move
 */
export function performMove(board, position) {
  // TODO: Implement move logic
  // This will need to handle:
  // 1. Picking up stones from selected position
  // 2. Distributing them according to mancala rules
  // 3. Handling captures
  // 4. Special rules for landing in mancala
  console.log("Move not yet implemented");
  return board;
}
