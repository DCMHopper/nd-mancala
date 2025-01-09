# N-Dimensional Mancala

A multi-dimensional implementation of the Mancala board game using Three.js and Math.js.

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL shown in the terminal (usually http://localhost:5173)

## Building and Deploying

1. Build the project:

   ```bash
   npm run build
   ```

2. To deploy on Vercel:
   - Install Vercel CLI: `npm install -g vercel`
   - Run `vercel` in the project directory
   - Or connect your GitHub repository to Vercel for automatic deployments

Note: Vercel will automatically detect that this is a Vite project and use the correct build settings.

## Project Structure

- `/src/main.js` - Three.js setup and main game loop
- `/src/game-logic.js` - Mancala game logic and board operations
