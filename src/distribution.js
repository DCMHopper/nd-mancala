/**
 * Calculate distance between two 3D points
 */
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Generate a random position within the pit radius
 */
function randomPosition(pitCenter, radius) {
  // Use rejection sampling to get uniform distribution in circle
  while (true) {
    const x = (Math.random() * 2 - 1) * radius;
    const z = (Math.random() * 2 - 1) * radius;
    if (x * x + z * z <= radius * radius) {
      return {
        x: pitCenter.x + x,
        y: pitCenter.y,
        z: pitCenter.z + z,
      };
    }
  }
}

/**
 * Check if a position collides with any existing stones
 */
function hasCollision(position, placedStones, minDistance) {
  return placedStones.some((stone) => distance(position, stone) < minDistance);
}

/**
 * Distribute stones within a pit using pseudo-physics
 */
export function distributeStones({
  pitCenter,
  pitRadius,
  stoneRadius,
  stoneCount,
  maxAttempts = 50,
}) {
  const positions = [];
  const effectiveRadius = pitRadius - stoneRadius;
  const minDistance = stoneRadius * 2; // Minimum distance between stone centers

  for (let i = 0; i < stoneCount; i++) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < maxAttempts) {
      const pos = randomPosition(pitCenter, effectiveRadius);
      if (!hasCollision(pos, positions, minDistance)) {
        positions.push(pos);
        placed = true;
      }
      attempts++;
    }

    // Fallback: If we couldn't place the stone after max attempts,
    // try placing it in the center with a slight offset
    if (!placed) {
      const fallbackPos = {
        x: pitCenter.x + (Math.random() * 0.1 - 0.05),
        y: pitCenter.y,
        z: pitCenter.z + (Math.random() * 0.1 - 0.05),
      };
      positions.push(fallbackPos);
    }
  }

  return positions;
}
