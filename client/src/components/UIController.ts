// UI Controller for managing screens and user interactions

import { User, GamePhase, SHIP_TYPES } from '../types';

export class UIController {
  private currentPhase: GamePhase = GamePhase.LOGIN;

  // Screen elements
  private loginScreen: HTMLElement;
  private lobbyScreen: HTMLElement;
  private waitingScreen: HTMLElement;
  private gameHud: HTMLElement;
  private shipPlacementUI: HTMLElement;
  private gameOverScreen: HTMLElement;

  constructor() {
    // Get screen elements
    this.loginScreen = this.getElement('login-screen');
    this.lobbyScreen = this.getElement('lobby-screen');
    this.waitingScreen = this.getElement('waiting-screen');
    this.gameHud = this.getElement('game-hud');
    this.shipPlacementUI = this.getElement('ship-placement-ui');
    this.gameOverScreen = this.getElement('game-over-screen');

    // Show login screen by default
    this.showScreen(GamePhase.LOGIN);
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Element with id '${id}' not found`);
    return element;
  }

  /**
   * Show a specific screen and hide others
   */
  public showScreen(phase: GamePhase): void {
    this.currentPhase = phase;

    // Hide all screens
    this.loginScreen.classList.add('hidden');
    this.lobbyScreen.classList.add('hidden');
    this.waitingScreen.classList.add('hidden');
    this.gameHud.classList.add('hidden');
    this.shipPlacementUI.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');

    // Show appropriate screen
    switch (phase) {
      case GamePhase.LOGIN:
        this.loginScreen.classList.remove('hidden');
        break;
      case GamePhase.LOBBY:
        this.lobbyScreen.classList.remove('hidden');
        break;
      case GamePhase.WAITING:
        this.waitingScreen.classList.remove('hidden');
        this.gameHud.classList.remove('hidden');
        break;
      case GamePhase.SHIP_PLACEMENT:
        this.shipPlacementUI.classList.remove('hidden');
        this.gameHud.classList.remove('hidden');
        break;
      case GamePhase.BATTLE:
        this.gameHud.classList.remove('hidden');
        break;
      case GamePhase.GAME_OVER:
        this.gameOverScreen.classList.remove('hidden');
        break;
    }
  }

  /**
   * Show login form
   */
  public showLoginForm(): void {
    this.getElement('login-form').classList.remove('hidden');
    this.getElement('register-form').classList.add('hidden');
  }

  /**
   * Show register form
   */
  public showRegisterForm(): void {
    this.getElement('login-form').classList.add('hidden');
    this.getElement('register-form').classList.remove('hidden');
  }

  /**
   * Show authentication error
   */
  public showAuthError(message: string): void {
    const errorElement = this.getElement('auth-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }

  /**
   * Hide authentication error
   */
  public hideAuthError(): void {
    this.getElement('auth-error').classList.add('hidden');
  }

  /**
   * Update lobby with user information
   */
  public updateLobby(user: User): void {
    this.getElement('user-email').textContent = user.email;
    this.getElement('stat-games').textContent = user.stats.gamesPlayed.toString();
    this.getElement('stat-wins').textContent = user.stats.gamesWon.toString();
    this.getElement('stat-losses').textContent = user.stats.gamesLost.toString();

    const accuracy =
      user.stats.totalShots > 0
        ? ((user.stats.totalHits / user.stats.totalShots) * 100).toFixed(1)
        : '0.0';
    this.getElement('stat-accuracy').textContent = `${accuracy}%`;
  }

  /**
   * Show join room input
   */
  public showJoinRoomInput(): void {
    this.getElement('join-room-input').classList.remove('hidden');
  }

  /**
   * Hide join room input
   */
  public hideJoinRoomInput(): void {
    this.getElement('join-room-input').classList.add('hidden');
    (this.getElement('room-code-input') as HTMLInputElement).value = '';
  }

  /**
   * Display room code in waiting screen
   */
  public displayRoomCode(roomCode: string): void {
    this.getElement('room-code-display').textContent = roomCode;
    this.getElement('hud-room-code').textContent = roomCode;
  }

  /**
   * Update game HUD
   */
  public updateHUD(status: string, turn: string): void {
    this.getElement('hud-status').textContent = status;
    this.getElement('hud-turn').textContent = turn;
  }

  /**
   * Show notification
   */
  public showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = this.getElement('notification-area');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 5000);
  }

  /**
   * Hide notification
   */
  public hideNotification(): void {
    this.getElement('notification-area').classList.add('hidden');
  }

  /**
   * Initialize ship list for placement
   */
  public initializeShipList(): void {
    const shipList = this.getElement('ship-list');
    shipList.innerHTML = '';

    Object.values(SHIP_TYPES).forEach((ship) => {
      const shipItem = document.createElement('div');
      shipItem.className = 'ship-item';
      shipItem.dataset.shipId = ship.id;

      shipItem.innerHTML = `
        <div class="ship-item-name">${ship.name}</div>
        <div class="ship-item-size">Size: ${ship.size}</div>
      `;

      shipList.appendChild(shipItem);
    });
  }

  /**
   * Mark ship as selected in UI
   */
  public selectShip(shipId: string): void {
    const shipItems = document.querySelectorAll('.ship-item');
    shipItems.forEach((item) => {
      if ((item as HTMLElement).dataset.shipId === shipId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  /**
   * Mark ship as placed in UI
   */
  public markShipAsPlaced(shipId: string): void {
    const shipItems = document.querySelectorAll('.ship-item');
    shipItems.forEach((item) => {
      if ((item as HTMLElement).dataset.shipId === shipId) {
        item.classList.add('placed');
        item.classList.remove('selected');
      }
    });
  }

  /**
   * Enable confirm placement button
   */
  public enableConfirmPlacement(): void {
    (this.getElement('confirm-placement-btn') as HTMLButtonElement).disabled = false;
  }

  /**
   * Disable confirm placement button
   */
  public disableConfirmPlacement(): void {
    (this.getElement('confirm-placement-btn') as HTMLButtonElement).disabled = true;
  }

  /**
   * Show game over screen with results
   */
  public showGameOver(isVictory: boolean, winnerEmail: string, stats: any): void {
    const title = this.getElement('game-over-title');
    title.textContent = isVictory ? '🎉 Victory!' : '💀 Defeat';
    title.className = isVictory ? 'victory' : 'defeat';

    const statsContainer = this.getElement('game-over-stats');
    statsContainer.innerHTML = `
      <div><strong>Winner:</strong> ${winnerEmail}</div>
      <div><strong>Your Shots:</strong> ${stats.shots || 0}</div>
      <div><strong>Your Hits:</strong> ${stats.hits || 0}</div>
      <div><strong>Your Accuracy:</strong> ${
        stats.shots > 0 ? ((stats.hits / stats.shots) * 100).toFixed(1) : '0'
      }%</div>
    `;

    this.showScreen(GamePhase.GAME_OVER);
  }

  /**
   * Get input values
   */
  public getLoginEmail(): string {
    return (this.getElement('login-email') as HTMLInputElement).value;
  }

  public getLoginPassword(): string {
    return (this.getElement('login-password') as HTMLInputElement).value;
  }

  public getRegisterEmail(): string {
    return (this.getElement('register-email') as HTMLInputElement).value;
  }

  public getRegisterPassword(): string {
    return (this.getElement('register-password') as HTMLInputElement).value;
  }

  public getRoomCode(): string {
    return (this.getElement('room-code-input') as HTMLInputElement).value.toUpperCase();
  }

  /**
   * Clear input values
   */
  public clearLoginInputs(): void {
    (this.getElement('login-email') as HTMLInputElement).value = '';
    (this.getElement('login-password') as HTMLInputElement).value = '';
  }

  public clearRegisterInputs(): void {
    (this.getElement('register-email') as HTMLInputElement).value = '';
    (this.getElement('register-password') as HTMLInputElement).value = '';
  }

  /**
   * Get current phase
   */
  public getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }
}
