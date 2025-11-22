// Main entry point for Voxel Battleship client
console.log('Voxel Battleship - Client Initializing...');

// This will be populated in later steps
// Step 4 will add Three.js scene setup
// Step 5 will add Socket.io integration

const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
  }, 1000);
}
