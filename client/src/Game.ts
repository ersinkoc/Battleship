// Main Game class - orchestrates the entire application

import { SceneManager } from './scenes/SceneManager';
import { GameBoard } from './scenes/GameBoard';
import { UIController } from './components/UIController';
import { GameState } from './services/GameState';
import { apiService } from './services/api.service';
import { socketService } from './services/socket.service';
import { GamePhase, Coordinate } from './types';

export class Game {
  private sceneManager: SceneManager;
  private myBoard: GameBoard;
  private opponentBoard: GameBoard;
  private ui: UIController;
  private state: GameState;

  private currentHoverCoord: Coordinate | null = null;

  constructor() {
    this.ui = new UIController();
    this.state = new GameState();

    // Initialize scene
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');

    this.sceneManager = new SceneManager(container);

    // Create boards
    this.myBoard = new GameBoard();
    this.myBoard.setPosition(-6, 0, 0);
    this.sceneManager.add(this.myBoard.getGroup());

    this.opponentBoard = new GameBoard();
    this.opponentBoard.setPosition(6, 0, 0);
    this.sceneManager.add(this.opponentBoard.getGroup());

    // Setup event listeners
    this.setupUIEventListeners();
    this.setupSocketEventListeners();

    // Start animation loop
    this.sceneManager.startAnimation(() => this.update());

    // Check for existing token
    if (this.state.isAuthenticated()) {
      this.autoLogin();
    }
  }

  /**
   * Update loop
   */
  private update(): void {
    // Animate water
    const time = Date.now();
    this.myBoard.animateWater(time);
    this.opponentBoard.animateWater(time);

    // Handle mouse interaction based on phase
    const phase = this.ui.getCurrentPhase();

    if (phase === GamePhase.SHIP_PLACEMENT) {
      this.handleShipPlacementInteraction();
    } else if (phase === GamePhase.BATTLE && this.state.isMyTurn) {
      this.handleBattleInteraction();
    }
  }

  /**
   * Handle ship placement interaction
   */
  private handleShipPlacementInteraction(): void {
    const currentShip = this.state.getCurrentShip();
    if (!currentShip) return;

    const intersects = this.sceneManager.getIntersects(this.myBoard.getInteractiveCells());

    if (intersects.length > 0) {
      const cell = intersects[0].object;
      const gridX = cell.userData.gridX;
      const gridY = cell.userData.gridY;

      const coord = { x: gridX, y: gridY };

      // Check if we can place ship here
      const canPlace = this.state.canPlaceShip(
        coord,
        currentShip.size,
        this.state.currentOrientation
      );

      if (canPlace) {
        this.myBoard.showTargetingReticle(coord);
        this.currentHoverCoord = coord;
      } else {
        this.myBoard.hideTargetingReticle();
        this.currentHoverCoord = null;
      }
    } else {
      this.myBoard.hideTargetingReticle();
      this.currentHoverCoord = null;
    }
  }

  /**
   * Handle battle phase interaction
   */
  private handleBattleInteraction(): void {
    const intersects = this.sceneManager.getIntersects(this.opponentBoard.getInteractiveCells());

    if (intersects.length > 0) {
      const cell = intersects[0].object;
      const gridX = cell.userData.gridX;
      const gridY = cell.userData.gridY;

      const coord = { x: gridX, y: gridY };

      // Check if already attacked
      if (!this.state.hasBeenAttacked(coord)) {
        this.opponentBoard.highlightCell(coord);
        this.opponentBoard.showTargetingReticle(coord);
        this.currentHoverCoord = coord;
      } else {
        this.opponentBoard.highlightCell(null);
        this.opponentBoard.hideTargetingReticle();
        this.currentHoverCoord = null;
      }
    } else {
      this.opponentBoard.highlightCell(null);
      this.opponentBoard.hideTargetingReticle();
      this.currentHoverCoord = null;
    }
  }

  /**
   * Setup UI event listeners
   */
  private setupUIEventListeners(): void {
    // Login/Register
    document.getElementById('show-register-btn')?.addEventListener('click', () => {
      this.ui.showRegisterForm();
      this.ui.hideAuthError();
    });

    document.getElementById('show-login-btn')?.addEventListener('click', () => {
      this.ui.showLoginForm();
      this.ui.hideAuthError();
    });

    document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
    document.getElementById('register-btn')?.addEventListener('click', () => this.handleRegister());

    // Enter key for login/register
    document.getElementById('login-password')?.addEventListener('keypress', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.handleLogin();
    });
    document.getElementById('register-password')?.addEventListener('keypress', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.handleRegister();
    });

    // Lobby
    document.getElementById('create-room-btn')?.addEventListener('click', () => this.createRoom());
    document.getElementById('join-room-btn')?.addEventListener('click', () => {
      this.ui.showJoinRoomInput();
    });
    document.getElementById('cancel-join-btn')?.addEventListener('click', () => {
      this.ui.hideJoinRoomInput();
    });
    document.getElementById('submit-join-btn')?.addEventListener('click', () => this.joinRoom());
    document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

    // Waiting room
    document.getElementById('cancel-room-btn')?.addEventListener('click', () => this.leaveRoom());

    // Ship placement
    document.getElementById('rotate-ship-btn')?.addEventListener('click', () => this.rotateShip());
    document.getElementById('confirm-placement-btn')?.addEventListener('click', () =>
      this.confirmPlacement()
    );

    // Keyboard controls
    window.addEventListener('keypress', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (this.ui.getCurrentPhase() === GamePhase.SHIP_PLACEMENT) {
          this.rotateShip();
        }
      }
    });

    // Click on board
    this.sceneManager.getRenderer().domElement.addEventListener('click', (e) => this.handleBoardClick(e));

    // Game over
    document.getElementById('play-again-btn')?.addEventListener('click', () => {
      this.ui.showScreen(GamePhase.LOBBY);
      this.resetGame();
    });
    document.getElementById('back-to-lobby-btn')?.addEventListener('click', () => {
      this.ui.showScreen(GamePhase.LOBBY);
      this.resetGame();
    });
  }

  /**
   * Setup Socket.io event listeners
   */
  private setupSocketEventListeners(): void {
    socketService.onError((message) => {
      console.error('Socket error:', message);
      this.ui.showNotification(message, 'error');
    });

    socketService.onRoomCreated((roomCode) => {
      this.state.setRoomCode(roomCode);
      this.ui.displayRoomCode(roomCode);
      this.ui.showScreen(GamePhase.WAITING);
      this.ui.updateHUD('Waiting for opponent...', '-');
    });

    socketService.onPlayerJoined((data) => {
      this.state.opponentEmail = data.email;
      this.ui.showNotification(`${data.email} joined the game!`, 'success');
    });

    socketService.onGameStarted(() => {
      this.ui.showScreen(GamePhase.SHIP_PLACEMENT);
      this.ui.updateHUD('Place your ships', '-');
      this.ui.initializeShipList();
      this.myBoard.clear();
      this.opponentBoard.clear();
    });

    socketService.onShipsPlaced((data) => {
      if (data.playerId !== this.state.getUserId()) {
        this.ui.showNotification('Opponent has placed their ships', 'info');
      }
    });

    socketService.onBothPlayersReady((data) => {
      this.ui.showScreen(GamePhase.BATTLE);
      const isMyTurn = data.firstPlayer === this.state.getUserId();
      this.state.isMyTurn = isMyTurn;
      this.ui.updateHUD(
        'Battle!',
        isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'
      );

      if (isMyTurn) {
        this.ui.showNotification('Your turn! Click on opponent board to attack', 'info');
      }
    });

    socketService.onShotResult((data) => {
      const isMyShot = data.attacker === this.state.getUserId();

      if (isMyShot) {
        // My attack result
        if (data.result === 'hit' || data.result === 'sunk') {
          this.state.addHit(data.coordinate);
          this.opponentBoard.addHitMarker(data.coordinate, this.sceneManager.getScene());
          this.ui.showNotification(
            data.result === 'sunk' ? `You sunk ${data.shipName}!` : 'Hit!',
            'success'
          );
        } else {
          this.state.addMiss(data.coordinate);
          this.opponentBoard.addMissMarker(data.coordinate);
          this.ui.showNotification('Miss!', 'info');
        }
      } else {
        // Opponent's attack result
        if (data.result === 'hit' || data.result === 'sunk') {
          this.state.addOpponentHit(data.coordinate);
          this.myBoard.addHitMarker(data.coordinate, this.sceneManager.getScene());
          this.ui.showNotification(
            data.result === 'sunk' ? `Your ${data.shipName} was sunk!` : 'Your ship was hit!',
            'error'
          );
        } else {
          this.state.addOpponentMiss(data.coordinate);
          this.myBoard.addMissMarker(data.coordinate);
          this.ui.showNotification('Opponent missed', 'info');
        }
      }
    });

    socketService.onTurnChanged((data) => {
      this.state.isMyTurn = data.isYourTurn;
      this.ui.updateHUD(
        'Battle!',
        data.isYourTurn ? 'Your Turn' : 'Opponent\'s Turn'
      );

      if (data.isYourTurn) {
        this.ui.showNotification('Your turn!', 'info');
      }
    });

    socketService.onShipSunk((data) => {
      this.ui.showNotification(`Ship sunk: ${data.shipName}`, 'info');
    });

    socketService.onGameOver((data) => {
      const isVictory = data.winnerId === this.state.getUserId();
      const myStats = data.stats[this.state.getUserId()!];
      this.ui.showGameOver(isVictory, data.winnerEmail, myStats);
    });

    socketService.onOpponentLeft(() => {
      this.ui.showNotification('Opponent left the game', 'error');
      setTimeout(() => {
        this.ui.showScreen(GamePhase.LOBBY);
        this.resetGame();
      }, 3000);
    });
  }

  /**
   * Auto-login with saved token
   */
  private async autoLogin(): Promise<void> {
    try {
      const response = await apiService.getProfile();
      this.state.setUser(response.user, this.state.token!);
      this.ui.updateLobby(response.user);
      this.ui.showScreen(GamePhase.LOBBY);

      // Connect to socket
      await socketService.connect(this.state.token!);
    } catch (error) {
      console.error('Auto-login failed:', error);
      this.state.clearUser();
    }
  }

  /**
   * Handle login
   */
  private async handleLogin(): Promise<void> {
    this.ui.hideAuthError();

    const email = this.ui.getLoginEmail();
    const password = this.ui.getLoginPassword();

    if (!email || !password) {
      this.ui.showAuthError('Please enter email and password');
      return;
    }

    try {
      const response = await apiService.login({ email, password });

      if (response.success && response.token && response.user) {
        this.state.setUser(response.user, response.token);
        this.ui.clearLoginInputs();
        this.ui.updateLobby(response.user);
        this.ui.showScreen(GamePhase.LOBBY);

        // Connect to socket
        await socketService.connect(response.token);
      } else {
        this.ui.showAuthError(response.message || 'Login failed');
      }
    } catch (error: any) {
      this.ui.showAuthError(error.message || 'Login failed');
    }
  }

  /**
   * Handle register
   */
  private async handleRegister(): Promise<void> {
    this.ui.hideAuthError();

    const email = this.ui.getRegisterEmail();
    const password = this.ui.getRegisterPassword();

    if (!email || !password) {
      this.ui.showAuthError('Please enter email and password');
      return;
    }

    if (password.length < 8) {
      this.ui.showAuthError('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await apiService.register({ email, password });

      if (response.success && response.token && response.user) {
        this.state.setUser(response.user, response.token);
        this.ui.clearRegisterInputs();
        this.ui.updateLobby(response.user);
        this.ui.showScreen(GamePhase.LOBBY);

        // Connect to socket
        await socketService.connect(response.token);
      } else {
        this.ui.showAuthError(response.message || 'Registration failed');
      }
    } catch (error: any) {
      this.ui.showAuthError(error.message || 'Registration failed');
    }
  }

  /**
   * Logout
   */
  private logout(): void {
    socketService.disconnect();
    apiService.logout();
    this.state.clearUser();
    this.state.clearRoom();
    this.ui.showScreen(GamePhase.LOGIN);
    this.resetGame();
  }

  /**
   * Create room
   */
  private createRoom(): void {
    socketService.createRoom();
  }

  /**
   * Join room
   */
  private joinRoom(): void {
    const roomCode = this.ui.getRoomCode();

    if (roomCode.length !== 6) {
      this.ui.showNotification('Room code must be 6 characters', 'error');
      return;
    }

    socketService.joinRoom(roomCode);
    this.ui.hideJoinRoomInput();
  }

  /**
   * Leave room
   */
  private leaveRoom(): void {
    socketService.leaveRoom();
    this.ui.showScreen(GamePhase.LOBBY);
    this.resetGame();
  }

  /**
   * Rotate ship orientation
   */
  private rotateShip(): void {
    this.state.toggleOrientation();
    const orientation = this.state.currentOrientation;
    this.ui.showNotification(`Orientation: ${orientation}`, 'info');
  }

  /**
   * Handle board click
   */
  private handleBoardClick(_event: MouseEvent): void {
    const phase = this.ui.getCurrentPhase();

    if (phase === GamePhase.SHIP_PLACEMENT && this.currentHoverCoord) {
      this.placeShip(this.currentHoverCoord);
    } else if (phase === GamePhase.BATTLE && this.state.isMyTurn && this.currentHoverCoord) {
      this.fireShot(this.currentHoverCoord);
    }
  }

  /**
   * Place ship at coordinate
   */
  private placeShip(coord: Coordinate): void {
    const currentShip = this.state.getCurrentShip();
    if (!currentShip) return;

    if (this.state.canPlaceShip(coord, currentShip.size, this.state.currentOrientation)) {
      const placement = {
        id: currentShip.id,
        name: currentShip.name,
        size: currentShip.size,
        startCoordinate: coord,
        orientation: this.state.currentOrientation,
      };

      this.state.addShipPlacement(placement);
      this.ui.markShipAsPlaced(currentShip.id);
      this.ui.showNotification(`${currentShip.name} placed!`, 'success');

      // Update visual board
      this.myBoard.placeShips([
        {
          id: placement.id,
          name: placement.name,
          size: placement.size,
          coordinates: this.getShipCoordinates(placement),
          hits: 0,
          isSunk: false,
        },
      ]);

      // Check if all ships placed
      if (this.state.allShipsPlaced) {
        this.ui.enableConfirmPlacement();
      } else {
        const nextShip = this.state.getCurrentShip();
        if (nextShip) {
          this.ui.selectShip(nextShip.id);
        }
      }
    }
  }

  /**
   * Confirm ship placement
   */
  private confirmPlacement(): void {
    socketService.placeShips(this.state.myShips);
    this.ui.showNotification('Waiting for opponent...', 'info');
    this.ui.disableConfirmPlacement();
  }

  /**
   * Fire shot at coordinate
   */
  private fireShot(coord: Coordinate): void {
    if (!this.state.hasBeenAttacked(coord)) {
      socketService.fireShot(coord);
      this.opponentBoard.hideTargetingReticle();
      this.opponentBoard.highlightCell(null);
    }
  }

  /**
   * Reset game state
   */
  private resetGame(): void {
    this.state.clearRoom();
    this.myBoard.clear();
    this.opponentBoard.clear();
    this.currentHoverCoord = null;
  }

  /**
   * Get ship coordinates from placement
   */
  private getShipCoordinates(placement: any): Coordinate[] {
    const coordinates: Coordinate[] = [];
    for (let i = 0; i < placement.size; i++) {
      if (placement.orientation === 'horizontal') {
        coordinates.push({
          x: placement.startCoordinate.x + i,
          y: placement.startCoordinate.y,
        });
      } else {
        coordinates.push({
          x: placement.startCoordinate.x,
          y: placement.startCoordinate.y + i,
        });
      }
    }
    return coordinates;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.sceneManager.dispose();
    socketService.disconnect();
  }
}
