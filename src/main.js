import * as THREE from "three";
import { GameState } from "./game-state.js";
import { renderBoard, updateBoard, highlightMoveSequence, clearHighlights, animateMove } from "./board-visual.js";

/**
 * Manages the game's 3D scene and rendering
 */
class GameRenderer {
  constructor() {
    this.setupScene();
    this.setupLighting();
    this.setupCamera();
    this.setupInteraction();
    this.setupResizeHandler();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x111111); // Dark gray background
    document.body.appendChild(this.renderer.domElement);
  }

  setupLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(1, 1, 1);
    this.scene.add(mainLight);

    // Bottom light for pit interiors
    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.5);
    bottomLight.position.set(0, -1, 0);
    this.scene.add(bottomLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-1, 0, -1);
    this.scene.add(fillLight);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(12, 12, 0);
    this.camera.lookAt(0, 0, 0);
  }

  setupInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  setupResizeHandler() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * Manages the game state and user interaction
 */
class Game {
  constructor() {
    this.renderer = new GameRenderer();
    this.initialStones = 4; // Default number of stones
    this.gameState = new GameState(2, 6);
    this.boardVisuals = renderBoard(this.gameState, this.renderer.scene);
    this.setupClickHandler();
    this.setupHoverHandler();
    this.setupMenuHandlers();
    this.renderer.animate();
  }

  setupMenuHandlers() {
    // Menu toggle button
    const menuButton = document.getElementById('menuButton');
    const menuPanel = document.getElementById('menuPanel');
    menuButton.addEventListener('click', () => {
      const isVisible = menuPanel.style.display === 'block';
      menuPanel.style.display = isVisible ? 'none' : 'block';
    });

    // Stones slider
    const stonesSlider = document.getElementById('stonesSlider');
    const stonesValue = document.getElementById('stonesValue');
    stonesSlider.addEventListener('input', (event) => {
      const value = event.target.value;
      stonesValue.textContent = value;
      this.initialStones = parseInt(value);
    });

    // Restart button
    const restartButton = document.getElementById('restartButton');
    restartButton.addEventListener('click', () => {
      this.restartGame();
    });
  }

  restartGame() {
    // Create a new game state with the current number of initial stones
    this.gameState = new GameState(2, 6);
    
    // Update the initial stones in the game state
    for (let player = 1; player <= 2; player++) {
      for (let pos = 0; pos < this.gameState.pocketsPerSide; pos++) {
        this.gameState.setStonesAt(player, pos, this.initialStones);
      }
    }
    
    // Reset mancalas
    this.gameState.mancalas.player1 = 0;
    this.gameState.mancalas.player2 = 0;
    
    // Reset current player to 1
    this.gameState.currentPlayer = 1;
    
    // Update the visual board
    updateBoard(this.boardVisuals, this.gameState, this.renderer.scene);
    clearHighlights(this.boardVisuals);
  }

  setupClickHandler() {
    window.addEventListener("click", (event) => this.handleClick(event));
  }

  setupHoverHandler() {
    window.addEventListener("mousemove", (event) => this.handleHover(event));
  }

  handleHover(event) {
    // Calculate mouse position in normalized device coordinates
    this.renderer.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.renderer.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray
    this.renderer.raycaster.setFromCamera(
      this.renderer.mouse,
      this.renderer.camera
    );

    // Get clickable objects
    const clickableObjects = [
      ...this.boardVisuals.player1Pits,
      ...this.boardVisuals.player2Pits,
    ];

    // Find intersections using bounding boxes
    const intersects = clickableObjects.filter(pit => 
      this.renderer.raycaster.ray.intersectsBox(pit.boundingBox)
    );

    if (intersects.length > 0) {
      const hoveredPit = intersects[0];
      
      // Determine hovered position and player
      if (this.boardVisuals.player1Pits.includes(hoveredPit)) {
        const position = this.boardVisuals.player1Pits.indexOf(hoveredPit);
        // Only show preview if it's player 1's turn
        if (this.gameState.currentPlayer === 1) {
          const sequence = this.gameState.simulateMove(position);
          highlightMoveSequence(this.boardVisuals, sequence);
        }
      } else if (this.boardVisuals.player2Pits.includes(hoveredPit)) {
        const position = this.boardVisuals.player2Pits.indexOf(hoveredPit);
        // Only show preview if it's player 2's turn
        if (this.gameState.currentPlayer === 2) {
          const sequence = this.gameState.simulateMove(position);
          highlightMoveSequence(this.boardVisuals, sequence);
        }
      }
    } else {
      // Clear highlights when not hovering over any pit
      clearHighlights(this.boardVisuals);
    }
  }

  handleClick(event) {
    // Calculate mouse position in normalized device coordinates
    this.renderer.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.renderer.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray
    this.renderer.raycaster.setFromCamera(
      this.renderer.mouse,
      this.renderer.camera
    );

    // Get clickable objects
    const clickableObjects = [
      ...this.boardVisuals.player1Pits,
      ...this.boardVisuals.player2Pits,
    ];

    // Find intersections using bounding boxes
    const intersects = clickableObjects.filter(pit => 
      this.renderer.raycaster.ray.intersectsBox(pit.boundingBox)
    );

    if (intersects.length > 0) {
      const clickedPit = intersects[0];
      
      // Determine clicked position and player
      if (this.boardVisuals.player1Pits.includes(clickedPit)) {
        const position = this.boardVisuals.player1Pits.indexOf(clickedPit);
        // Only allow moves if it's player 1's turn
        if (this.gameState.currentPlayer === 1) {
          if (this.gameState.isValidMove(position)) {
            this.gameState.performMove(position);
            animateMove(this.boardVisuals, this.gameState, this.renderer.scene);
          }
        }
      } else if (this.boardVisuals.player2Pits.includes(clickedPit)) {
        const position = this.boardVisuals.player2Pits.indexOf(clickedPit);
        // Only allow moves if it's player 2's turn
        if (this.gameState.currentPlayer === 2) {
          if (this.gameState.isValidMove(position)) {
            this.gameState.performMove(position);
            animateMove(this.boardVisuals, this.gameState, this.renderer.scene);
          }
        }
      }
    }
  }
}

// Start the game
new Game();
