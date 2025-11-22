// Main entry point for Voxel Battleship client
import { Game } from './Game';

console.log('🚢 Voxel Battleship - Initializing...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize the game
    const game = new Game();
    console.log('✅ Game initialized successfully');

    // Handle cleanup on page unload
    window.addEventListener('beforeunload', () => {
      game.dispose();
    });

    // Expose to window for debugging (optional)
    (window as any).game = game;
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
    alert('Failed to initialize game. Please refresh the page.');
  }
});
