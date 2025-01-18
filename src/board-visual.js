import * as THREE from "three";
import { distributeStones } from "./distribution.js";

// Board layout constants
const BOARD_CONSTANTS = {
  PIT: {
    RADIUS: 0.5,
    HEIGHT: 0.3,
    SEGMENTS: 32,
  },
  MANCALA: {
    SCALE: 1.5,
    OFFSET: 2.0,
  },
  SPACING: {
    ROW: 1.5,
    PIT: 1.2,
  },
  STONE: {
    RADIUS: 0.1,
    SEGMENTS: 16,
    HEIGHT: 0.15,
  },
  TEXT: {
    HEIGHT: 0.5,
  },
};

// Debug flags - set these to true to enable logging
const DEBUG = {
  ENABLED: false,
  PIT_CREATION: false,
  HOVER: false,
  HIGHLIGHTS: false,
};

function debugLog(category, ...args) {
  if (DEBUG.ENABLED && DEBUG[category]) {
    console.log(...args);
  }
}

// Material colors
const COLORS = {
  PLAYER1: 0x6699cc,
  PLAYER2: 0xcc6666,
  MANCALA: 0x44aa88,
  STONE_BASE: 0xd4af37,
  HIGHLIGHT: 0xffffff,
};

// Glow shader
const glowVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;
  varying vec2 vUv;
  void main() {
    float dist = length(vUv - vec2(0.5));
    float alpha = smoothstep(0.4, 0.0, dist) * intensity;
    vec3 softGlow = mix(glowColor, vec3(1.0), 0.3);
    gl_FragColor = vec4(softGlow, alpha * 0.7);
  }
`;

/**
 * Creates a glow effect mesh for highlighting
 */
function createHighlightMesh(radius, height) {
  const geometry = new THREE.PlaneGeometry(radius * 3, height * 3);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(COLORS.HIGHLIGHT) },
      intensity: { value: 0.0 }
    },
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  mesh.renderOrder = 999; // Ensure it renders last
  mesh.rotation.x = Math.PI / 2; // Face the camera
  mesh.position.y = -0.25; // Position lower to avoid clipping through pit
  return mesh;
}

/**
 * Creates a bowl-shaped geometry for pits and mancalas
 */
function createBowlGeometry(radius, height, segments, sizeScale = 1) {
  const geometry = new THREE.CylinderGeometry(
    radius * sizeScale,
    radius * sizeScale,
    height * sizeScale,
    segments,
    segments,
    true
  );

  // Modify vertices to create a curved profile
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const normalizedY = -positions[i + 1] / (height * sizeScale) + 0.5;
    const radiusScale = 1 - Math.pow(normalizedY, 5);
    positions[i] *= radiusScale;
    positions[i + 2] *= radiusScale;
  }

  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Creates a stone mesh
 */
function createStone() {
  const geometry = new THREE.SphereGeometry(
    BOARD_CONSTANTS.STONE.RADIUS,
    BOARD_CONSTANTS.STONE.SEGMENTS,
    BOARD_CONSTANTS.STONE.SEGMENTS
  );
  
  // Create a random hue variation
  const baseColor = new THREE.Color(COLORS.STONE_BASE);
  const hue = (baseColor.getHSL({}).h + (Math.random() * 0.1 - 0.05)) % 1;
  const color = new THREE.Color().setHSL(
    hue,
    0.6 + Math.random() * 0.2,  // Saturation variation
    0.5 + Math.random() * 0.1   // Lightness variation
  );

  const material = new THREE.MeshPhongMaterial({
    color: color,
    shininess: 100,
    specular: 0x444444,
  });
  return new THREE.Mesh(geometry, material);
}

/**
 * Creates a text label for stone count
 */
function createCountLabel(count) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 64;
  canvas.height = 64;

  context.fillStyle = "white";
  context.font = "bold 48px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(count.toString(), 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.5, 0.5, 1);

  return sprite;
}

/**
 * Updates the visual representation of stones in a pit
 */
function updatePitStones(pit, count, scene) {
  // Store the highlight mesh if it exists
  const highlightMesh = pit.glowMesh;
  
  // Remove existing stones and labels, but preserve the highlight
  pit.children.forEach((child) => {
    if (child !== highlightMesh) {  // Don't remove the highlight mesh
      scene.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  });
  
  // Clear children array and re-add highlight if it exists
  pit.children.length = 0;
  if (highlightMesh) {
    pit.add(highlightMesh);
  }

  if (count > 0) {
    // Add count label
    const label = createCountLabel(count);
    label.position.set(0, BOARD_CONSTANTS.TEXT.HEIGHT, -0.5);
    pit.add(label);

    // Get stone positions
    const stonePositions = distributeStones({
      pitCenter: { 
        x: 0, 
        y: -BOARD_CONSTANTS.PIT.HEIGHT / 2 + BOARD_CONSTANTS.STONE.HEIGHT, 
        z: 0 
      },
      pitRadius: BOARD_CONSTANTS.PIT.RADIUS * 0.8,
      stoneRadius: BOARD_CONSTANTS.STONE.RADIUS,
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
 * Creates a pit mesh with the specified material
 */
function createPitMesh(geometry, material) {
  const pit = new THREE.Mesh(geometry, material);
  pit.rotation.y = Math.PI / 2;

  // Add highlight effect
  const highlight = createHighlightMesh(BOARD_CONSTANTS.PIT.RADIUS, BOARD_CONSTANTS.PIT.HEIGHT);
  // Position the highlight to be centered on the pit
  highlight.position.set(0, 0, 0);
  pit.add(highlight);
  pit.glowMesh = highlight;

  return pit;
}

/**
 * Creates a row of pits for a player
 */
function createPlayerPits(gameState, isPlayer1, geometry, material, scene) {
  const pits = [];
  const pitsPerPlayer = gameState.pocketsPerSide;
  const rowPosition = isPlayer1 ? -BOARD_CONSTANTS.SPACING.ROW : BOARD_CONSTANTS.SPACING.ROW;

  for (let i = 0; i < pitsPerPlayer; i++) {
    const pit = createPitMesh(geometry, material);
    const zOffset = isPlayer1 ? 
      (i - (pitsPerPlayer - 1) / 2) * BOARD_CONSTANTS.SPACING.PIT :
      ((pitsPerPlayer - 1) / 2 - i) * BOARD_CONSTANTS.SPACING.PIT;
    
    pit.position.set(rowPosition, 0, zOffset);
    scene.add(pit);
    
    // Create bounding box with explicit dimensions
    const radius = BOARD_CONSTANTS.PIT.RADIUS;
    const height = BOARD_CONSTANTS.PIT.HEIGHT;
    pit.boundingBox = new THREE.Box3(
      new THREE.Vector3(
        pit.position.x - radius,
        pit.position.y - height/2,
        pit.position.z - radius
      ),
      new THREE.Vector3(
        pit.position.x + radius,
        pit.position.y + height/2,
        pit.position.z + radius
      )
    );
    // Make click area slightly larger
    pit.boundingBox.expandByScalar(0.2);
    
    debugLog('PIT_CREATION', 'Created pit with bounding box:', pit.boundingBox);
    
    pits.push(pit);

    const stoneCount = gameState.getStonesAt(isPlayer1 ? 1 : 2, i);
    updatePitStones(pit, stoneCount, scene);
  }

  return pits;
}

/**
 * Creates a mancala pit for a player
 */
function createMancala(gameState, isPlayer1, geometry, material, scene) {
  const mancala = new THREE.Mesh(geometry, material);
  mancala.rotation.y = Math.PI / 2;
  const rowPosition = isPlayer1 ? -BOARD_CONSTANTS.SPACING.ROW : BOARD_CONSTANTS.SPACING.ROW;
  const zOffset = (gameState.pocketsPerSide * BOARD_CONSTANTS.SPACING.PIT) / 2 + BOARD_CONSTANTS.MANCALA.OFFSET;
  
  mancala.position.set(
    rowPosition,
    0,
    isPlayer1 ? zOffset : -zOffset
  );
  scene.add(mancala);

  // Add highlight effect
  const highlight = createHighlightMesh(
    BOARD_CONSTANTS.PIT.RADIUS * BOARD_CONSTANTS.MANCALA.SCALE,
    BOARD_CONSTANTS.PIT.HEIGHT * BOARD_CONSTANTS.MANCALA.SCALE
  );
  // Position the highlight to be centered on the mancala
  highlight.position.set(0, 0, 0);
  mancala.add(highlight);
  mancala.glowMesh = highlight;
  
  const stoneCount = gameState.mancalas[`player${isPlayer1 ? 1 : 2}`];
  updatePitStones(mancala, stoneCount, scene);
  
  return mancala;
}

/**
 * Creates a visual representation of the mancala board
 */
export function renderBoard(gameState, scene) {
  // Create geometries
  const pitGeometry = createBowlGeometry(
    BOARD_CONSTANTS.PIT.RADIUS,
    BOARD_CONSTANTS.PIT.HEIGHT,
    BOARD_CONSTANTS.PIT.SEGMENTS
  );
  const mancalaGeometry = createBowlGeometry(
    BOARD_CONSTANTS.PIT.RADIUS,
    BOARD_CONSTANTS.PIT.HEIGHT,
    BOARD_CONSTANTS.PIT.SEGMENTS,
    BOARD_CONSTANTS.MANCALA.SCALE
  );

  // Create materials
  const materials = {
    player1: new THREE.MeshPhongMaterial({
      color: COLORS.PLAYER1,
      side: THREE.DoubleSide,
    }),
    player2: new THREE.MeshPhongMaterial({
      color: COLORS.PLAYER2,
      side: THREE.DoubleSide,
    }),
    mancala: new THREE.MeshPhongMaterial({
      color: COLORS.MANCALA,
      side: THREE.DoubleSide,
    }),
  };

  // Create visual elements
  const visualElements = {
    player1Pits: createPlayerPits(gameState, true, pitGeometry, materials.player1, scene),
    player2Pits: createPlayerPits(gameState, false, pitGeometry, materials.player2, scene),
    player1Mancala: createMancala(gameState, true, mancalaGeometry, materials.mancala, scene),
    player2Mancala: createMancala(gameState, false, mancalaGeometry, materials.mancala, scene),
  };

  return visualElements;
}

/**
 * Updates the visual state of the board
 */
export function updateBoard(visualElements, gameState, scene) {
  // Update Player 1's pits
  visualElements.player1Pits.forEach((pit, i) => {
    updatePitStones(pit, gameState.getStonesAt(1, i), scene);
  });

  // Update Player 2's pits
  visualElements.player2Pits.forEach((pit, i) => {
    updatePitStones(pit, gameState.getStonesAt(2, i), scene);
  });

  // Update mancalas
  updatePitStones(visualElements.player1Mancala, gameState.mancalas.player1, scene);
  updatePitStones(visualElements.player2Mancala, gameState.mancalas.player2, scene);
}

/**
 * Highlights a sequence of pits to preview a move
 */
export function highlightMoveSequence(visualElements, sequence) {
  // Reset all highlights first
  [...visualElements.player1Pits, ...visualElements.player2Pits].forEach(pit => {
    if (pit.glowMesh) {
      pit.glowMesh.visible = false;
      pit.glowMesh.material.uniforms.intensity.value = 0.0;
    }
  });
  [visualElements.player1Mancala, visualElements.player2Mancala].forEach(mancala => {
    if (mancala.glowMesh) {
      mancala.glowMesh.visible = false;
      mancala.glowMesh.material.uniforms.intensity.value = 0.0;
    }
  });

  // Apply new highlights
  sequence.forEach((pos, index) => {
    const intensity = 0.6 - (index / sequence.length) * 0.2;
    
    if (pos.isMancala) {
      const mancala = pos.player === 1 ? visualElements.player1Mancala : visualElements.player2Mancala;
      if (mancala.glowMesh) {
        mancala.glowMesh.visible = true;
        mancala.glowMesh.material.uniforms.intensity.value = intensity;
      }
    } else {
      const pits = pos.player === 1 ? visualElements.player1Pits : visualElements.player2Pits;
      const pit = pits[pos.position];
      if (pit && pit.glowMesh) {
        pit.glowMesh.visible = true;
        pit.glowMesh.material.uniforms.intensity.value = intensity;
      }
    }
  });
}

/**
 * Clears all highlights from the board
 */
export function clearHighlights(visualElements) {
  highlightMoveSequence(visualElements, []);
}

/**
 * Handles visual animations when a move is performed
 */
export function animateMove(visualElements, gameState, scene) {
  // For now, just clear highlights
  clearHighlights(visualElements);
  
  // Update the board visuals
  updateBoard(visualElements, gameState, scene);
}
