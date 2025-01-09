import * as THREE from "three";
import { matrix } from "mathjs";
import { initializeBoard } from "./game-logic.js";
import { renderBoard } from "./board-visual.js";

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111); // Dark gray background
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(1, 1, 1);
scene.add(mainLight);

// Add a light from below to illuminate the pit interiors
const bottomLight = new THREE.DirectionalLight(0xffffff, 0.5);
bottomLight.position.set(0, -1, 0);
scene.add(bottomLight);

// Add a softer fill light from the opposite side
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-1, 0, -1);
scene.add(fillLight);

// Initialize and render board
const initialBoardState = initializeBoard(2, 6);
const boardVisuals = renderBoard(initialBoardState, scene);

// Position camera to see the whole board
camera.position.set(12, 12, 0);
camera.lookAt(0, 0, 0);

// Animation/render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
