import { matrix } from "mathjs";

/**
 * Represents the state of a Mancala game
 */
export class GameState {
  /**
   * @param {number} dimensions - Number of dimensions for the board
   * @param {number} pocketsPerSide - Number of pockets per player
   */
  constructor(dimensions, pocketsPerSide) {
    this.dimensions = dimensions;
    this.pocketsPerSide = pocketsPerSide;
    this.currentPlayer = 1; // 1 or 2
    this.initialize();
  }

  /**
   * Initialize the game state
   * @private
   */
  initialize() {
    const initialStones = 4;
    
    // Create separate matrices for each player
    this.player1Board = matrix(Array(this.pocketsPerSide).fill(initialStones));
    this.player2Board = matrix(Array(this.pocketsPerSide).fill(initialStones));
    
    // Initialize mancalas
    this.mancalas = {
      player1: 0,
      player2: 0
    };
  }

  /**
   * Get the number of stones in a pit
   * @param {number} player - Player number (1 or 2)
   * @param {number} position - Position in player's board (0 to pocketsPerSide-1)
   * @returns {number} Number of stones
   */
  getStonesAt(player, position) {
    const board = player === 1 ? this.player1Board : this.player2Board;
    return board.get([position]);
  }

  /**
   * Set the number of stones in a pit
   * @param {number} player - Player number (1 or 2)
   * @param {number} position - Position in player's board (0 to pocketsPerSide-1)
   * @param {number} count - Number of stones
   */
  setStonesAt(player, position, count) {
    const board = player === 1 ? this.player1Board : this.player2Board;
    board._data[position] = count;
  }

  /**
   * Get the current player's mancala count
   * @returns {number} Number of stones in current player's mancala
   */
  getCurrentMancalaCount() {
    return this.mancalas[`player${this.currentPlayer}`];
  }

  /**
   * Check if a move is valid
   * @param {number} position - Position in current player's board (0 to pocketsPerSide-1)
   * @returns {boolean} Whether the move is valid
   */
  isValidMove(position) {
    if (position < 0 || position >= this.pocketsPerSide) {
      return false;
    }
    const stones = this.getStonesAt(this.currentPlayer, position);
    return stones > 0;
  }

  /**
   * Perform a move on the board
   * @param {number} position - Position in current player's board (0 to pocketsPerSide-1)
   * @returns {boolean} Whether the player gets another turn
   */
  performMove(position) {
    if (!this.isValidMove(position)) {
      return false;
    }

    const isPlayer1 = this.currentPlayer === 1;
    let stones = this.getStonesAt(this.currentPlayer, position);
    this.setStonesAt(this.currentPlayer, position, 0);
    
    // Track position in both boards
    let currentPlayer = this.currentPlayer;
    let currentPos = position;
    let lastStoneInMancala = false;
    
    while (stones > 0) {
      // Move to next position/board
      currentPos++;
      
      // If we reach the end of current player's board
      if (currentPos >= this.pocketsPerSide) {
        // Check if we should add to mancala
        if (currentPlayer === this.currentPlayer) {
          this.mancalas[`player${currentPlayer}`]++;
          stones--;
          lastStoneInMancala = stones === 0;
          if (lastStoneInMancala) break;
        }
        // Switch to other player's board
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        currentPos = 0;
      }
      
      // Place stone in current pit
      this.setStonesAt(currentPlayer, currentPos, 
        this.getStonesAt(currentPlayer, currentPos) + 1);
      stones--;
      
      // Handle capture on last stone
      if (stones === 0 && currentPlayer === this.currentPlayer) {
        const landedInEmptyPit = this.getStonesAt(currentPlayer, currentPos) === 1;
        if (landedInEmptyPit) {
          const oppositePlayer = currentPlayer === 1 ? 2 : 1;
          const oppositeStones = this.getStonesAt(oppositePlayer, this.pocketsPerSide - 1 - currentPos);
          
          if (oppositeStones > 0) {
            const capturedStones = oppositeStones + 1; // +1 for the landing stone
            this.setStonesAt(oppositePlayer, this.pocketsPerSide - 1 - currentPos, 0);
            this.setStonesAt(currentPlayer, currentPos, 0);
            this.mancalas[`player${currentPlayer}`] += capturedStones;
          }
        }
      }
    }
    
    // Switch turns if last stone wasn't in player's mancala
    if (!lastStoneInMancala) {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }
    
    return lastStoneInMancala;
  }

  /**
   * Simulate a move to get the sequence of positions that would be affected
   * @param {number} position - Position in current player's board (0 to pocketsPerSide-1)
   * @returns {Array<{player: number, position: number, isMancala: boolean}>} Sequence of affected positions
   */
  simulateMove(position) {
    if (!this.isValidMove(position)) {
      return [];
    }

    const sequence = [];
    const stones = this.getStonesAt(this.currentPlayer, position);
    let currentPlayer = this.currentPlayer;
    let currentPos = position;
    
    for (let i = 0; i < stones; i++) {
      // Move to next position/board
      currentPos++;
      
      // If we reach the end of current player's board
      if (currentPos >= this.pocketsPerSide) {
        // Check if we should add mancala
        if (currentPlayer === this.currentPlayer) {
          sequence.push({
            player: currentPlayer,
            position: -1, // Special position for mancala
            isMancala: true
          });
          // Switch to other player's board
          currentPlayer = currentPlayer === 1 ? 2 : 1;
          currentPos = -1;
          continue;
        }
        // Switch to other player's board
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        currentPos = 0;
      }
      
      sequence.push({
        player: currentPlayer,
        position: currentPos,
        isMancala: false
      });
    }
    
    return sequence;
  }
} 