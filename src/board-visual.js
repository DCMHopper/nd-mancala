import * as THREE from "three";
import { distributeStones } from "./distribution.js";

const PIT_RADIUS = 0.5;
const PIT_HEIGHT = 0.3;
const PIT_SEGMENTS = 32;
const MANCALA_SCALE = 1.5;
const ROW_SPACING = 1.5;
const PIT_SPACING = 1.2;
const MANCALA_OFFSET = 2.0;

// Add new constants for stones
const STONE_RADIUS = 0.1;
const STONE_SEGMENTS = 16;
const STONE_HEIGHT = 0.15; // Height above pit bottom
const TEXT_HEIGHT = 0.5; // Height of the count labels above pits

/**
 * Creates a stone mesh
 * @returns {THREE.Mesh} Stone mesh
 */
function createStone() {
  const geometry = new THREE.SphereGeometry(
    STONE_RADIUS,
    STONE_SEGMENTS,
    STONE_SEGMENTS
  );
  const material = new THREE.MeshPhongMaterial({
    color: 0xd4af37, // Golden color for stones
    shininess: 100,
    specular: 0x444444,
  });
  return new THREE.Mesh(geometry, material);
}

/**
 * Creates a text label for stone count
 * @param {number} count - Number of stones
 * @returns {THREE.Mesh} Text mesh
 */
function createCountLabel(count) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 64;
  canvas.height = 64;

  // Draw text
  context.fillStyle = "white";
  context.font = "bold 48px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(count.toString(), 32, 32);

  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.5, 0.5, 1);

  return sprite;
}

/**
 * Updates the visual representation of stones in a pit
 * @param {THREE.Mesh} pit - The pit mesh
 * @param {number} count - Number of stones
 * @param {THREE.Scene} scene - The Three.js scene
 */
function updatePitStones(pit, count, scene) {
  // Remove existing stones and labels
  pit.children.forEach((child) => {
    scene.remove(child);
    child.geometry?.dispose();
    child.material?.dispose();
  });
  pit.children.length = 0;

  if (count > 0) {
    // Add count label
    const label = createCountLabel(count);
    label.position.set(0, TEXT_HEIGHT, -0.5);
    pit.add(label);

    // Get stone positions
    const stonePositions = distributeStones({
      pitCenter: { x: 0, y: -PIT_HEIGHT / 2 + STONE_HEIGHT, z: 0 },
      pitRadius: PIT_RADIUS * 0.8, // Use 80% of pit radius for stones
      stoneRadius: STONE_RADIUS,
      stoneCount: count,
      maxAttempts: 50,
    });

    // Create and position stones
    stonePositions.forEach((pos) => {
      const stone = createStone();
      stone.position.set(pos.x, pos.y, pos.z);
      pit.add(stone);
    });
  }
}

/**
 * Creates a visual representation of the mancala board
 * @param {Object} boardState - Current state of the game board
 * @param {Matrix} boardState.board - The main board array
 * @param {Object} boardState.mancalas - Player mancala counts
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {Object} References to the visual elements
 */
export function renderBoard(boardState, scene) {
  const pitsPerPlayer = boardState.board.size() / 2;

  const createBowlGeometry = (radius, height, segments, sizeScale = 1) => {
    const geometry = new THREE.CylinderGeometry(
      radius * sizeScale, // top radius
      radius * sizeScale, // keep top and bottom radius the same initially
      height * sizeScale,
      segments, // radial segments
      segments, // height segments
      true // open-ended
    );

    // Modify vertices to create a curved profile
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      // Get the current y position and normalize it to 0 to 1 (top to bottom)
      const normalizedY = -positions[i + 1] / (height * sizeScale) + 0.5;

      // Quadratic curve that flattens at the bottom: y = 1 - x^2
      const radiusScale = 1 - Math.pow(normalizedY, 5);

      // Scale x and z to create the bowl curve
      positions[i] *= radiusScale; // x
      positions[i + 2] *= radiusScale; // z
    }

    geometry.computeVertexNormals();
    return geometry;
  };

  const pitGeometry = createBowlGeometry(PIT_RADIUS, PIT_HEIGHT, PIT_SEGMENTS);
  const mancalaGeometry = createBowlGeometry(
    PIT_RADIUS,
    PIT_HEIGHT,
    PIT_SEGMENTS,
    MANCALA_SCALE
  );

  // Create materials with different colors for each player
  const player1Material = new THREE.MeshPhongMaterial({
    color: 0x6699cc,
    side: THREE.DoubleSide, // Enable double-sided rendering
  });
  const player2Material = new THREE.MeshPhongMaterial({
    color: 0xcc6666,
    side: THREE.DoubleSide,
  });
  const mancalaMaterial = new THREE.MeshPhongMaterial({
    color: 0x44aa88,
    side: THREE.DoubleSide,
  });

  const visualElements = {
    player1Pits: [],
    player2Pits: [],
    player1Mancala: null,
    player2Mancala: null,
  };

  // Create Player 1's pits with stones
  for (let i = 0; i < pitsPerPlayer; i++) {
    const pit = new THREE.Mesh(pitGeometry, player1Material);
    pit.position.set(
      -ROW_SPACING,
      0,
      (i - (pitsPerPlayer - 1) / 2) * PIT_SPACING
    );
    pit.rotation.y = Math.PI / 2;
    scene.add(pit);
    visualElements.player1Pits.push(pit);

    // Add stones based on board state
    const stoneCount = boardState.board.get([i]);
    updatePitStones(pit, stoneCount, scene);
  }

  // Create Player 2's pits with stones
  for (let i = 0; i < pitsPerPlayer; i++) {
    const pit = new THREE.Mesh(pitGeometry, player2Material);
    pit.position.set(
      ROW_SPACING,
      0,
      (i - (pitsPerPlayer - 1) / 2) * PIT_SPACING
    );
    pit.rotation.y = Math.PI / 2;
    scene.add(pit);
    visualElements.player2Pits.push(pit);

    // Add stones based on board state
    const stoneCount = boardState.board.get([i + pitsPerPlayer]);
    updatePitStones(pit, stoneCount, scene);
  }

  // Create mancalas with stone counts
  const player1Mancala = new THREE.Mesh(mancalaGeometry, mancalaMaterial);
  player1Mancala.position.set(
    -ROW_SPACING,
    0,
    -(pitsPerPlayer * PIT_SPACING) / 2 - MANCALA_OFFSET
  );
  player1Mancala.rotation.y = Math.PI / 2;
  scene.add(player1Mancala);
  updatePitStones(player1Mancala, boardState.mancalas.player1, scene);
  visualElements.player1Mancala = player1Mancala;

  const player2Mancala = new THREE.Mesh(mancalaGeometry, mancalaMaterial);
  player2Mancala.position.set(
    ROW_SPACING,
    0,
    (pitsPerPlayer * PIT_SPACING) / 2 + MANCALA_OFFSET
  );
  player2Mancala.rotation.y = Math.PI / 2;
  scene.add(player2Mancala);
  updatePitStones(player2Mancala, boardState.mancalas.player2, scene);
  visualElements.player2Mancala = player2Mancala;

  return visualElements;
}

/**
 * Updates the visual state of the board
 * @param {Object} visualElements - References to board visual elements
 * @param {Object} boardState - Current state of the game board
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function updateBoard(visualElements, boardState, scene) {
  const pitsPerPlayer = boardState.board.size() / 2;

  // Update Player 1's pits
  visualElements.player1Pits.forEach((pit, i) => {
    const stoneCount = boardState.board.get([i]);
    updatePitStones(pit, stoneCount, scene);
  });

  // Update Player 2's pits
  visualElements.player2Pits.forEach((pit, i) => {
    const stoneCount = boardState.board.get([i + pitsPerPlayer]);
    updatePitStones(pit, stoneCount, scene);
  });

  // Update mancalas
  updatePitStones(
    visualElements.player1Mancala,
    boardState.mancalas.player1,
    scene
  );
  updatePitStones(
    visualElements.player2Mancala,
    boardState.mancalas.player2,
    scene
  );
}
