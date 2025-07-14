import { calculatePayout, calculateWinProbability, GAME_CONFIG } from './config';

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost' | 'cashed-out';

export interface GameState {
  status: GameStatus;
  currentFloor: number;
  stake: number;
  riskLevel: number;
  currentPayout: number;
  winProbability: number;
  gameHistory: GameResult[];
  tokenBalance: number;
}

export interface GameResult {
  id: string;
  stake: number;
  riskLevel: number;
  finalFloor: number;
  finalPayout: number;
  status: 'won' | 'lost' | 'cashed-out';
  timestamp: number;
  proof?: GameProof;
}

export interface GameProof {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  hash: string;
  randomValue: number;
  winProbability: number;
}

export const initialGameState: GameState = {
  status: 'idle',
  currentFloor: 0,
  stake: GAME_CONFIG.minStake,
  riskLevel: 3, // Default to 50% win chance
  currentPayout: 0,
  winProbability: 50, // Default probability
  gameHistory: [],
  tokenBalance: 0,
};

export class GameEngine {
  private state: GameState;
  private listeners: Array<(state: GameState) => void> = [];
  private playerId: string;
  private clientSeed: string;
  private currentGameProof: GameProof | null = null;

  constructor(initialState: GameState = initialGameState) {
    this.state = { ...initialState };
    this.updateProbabilityAndPayout();
    
    // Generate unique player ID and client seed for this session
    this.playerId = this.generatePlayerId();
    this.clientSeed = this.generateClientSeed();
  }

  // Generate unique player ID for this session
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate client seed for provably fair gaming
  private generateClientSeed(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  // Get player ID for API calls
  private getPlayerId(): string {
    return this.playerId;
  }

  // Get client seed for API calls
  private getClientSeed(): string {
    return this.clientSeed;
  }

  // Store game proof for transparency
  private storeGameProof(proof: any, randomValue: number, winProbability: number): void {
    this.currentGameProof = {
      serverSeed: proof.serverSeed,
      clientSeed: proof.clientSeed,
      nonce: proof.nonce,
      hash: proof.hash,
      randomValue,
      winProbability
    };
  }

  // Get current game proof for verification
  public getGameProof(): GameProof | null {
    return this.currentGameProof;
  }

  // Allow players to set their own client seed
  public setClientSeed(newClientSeed: string): void {
    this.clientSeed = newClientSeed;
  }

  // Subscribe to state changes
  subscribe(listener: (state: GameState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of state changes
  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Update probability and payout based on current state
  private updateProbabilityAndPayout() {
    if (this.state.status === 'playing') {
      this.state.winProbability = calculateWinProbability(
        this.state.currentFloor,
        this.state.riskLevel,
        this.state.stake
      );
      this.state.currentPayout = calculatePayout(
        this.state.stake,
        this.state.currentFloor,
        this.state.riskLevel
      );
    } else if (this.state.status === 'idle') {
      // Show probability for first floor when idle
      this.state.winProbability = calculateWinProbability(
        0,
        this.state.riskLevel,
        this.state.stake
      );
      this.state.currentPayout = this.state.stake;
    }
  }

  // Get current state
  getState(): GameState {
    return { ...this.state };
  }

  // Start a new game
  startGame(stake: number, riskLevel: number = this.state.riskLevel): boolean {
    if (this.state.status !== 'idle') {
      return false;
    }

    if (stake < GAME_CONFIG.minStake || stake > GAME_CONFIG.maxStake) {
      return false;
    }

    if (riskLevel < 1 || riskLevel > 10) {
      return false;
    }

    this.state = {
      ...this.state,
      status: 'playing',
      currentFloor: 0,
      stake,
      riskLevel,
    };

    this.updateProbabilityAndPayout();
    this.notify();
    return true;
  }

  // Attempt to ascend to the next floor using secure server-side randomness
  async ascend(): Promise<'success' | 'failure' | 'invalid' | 'error'> {
    if (this.state.status !== 'playing') {
      return 'invalid';
    }

    if (this.state.currentFloor >= GAME_CONFIG.maxFloors) {
      return 'invalid';
    }

    try {
      // Call server-side randomness API for secure outcome determination
      const response = await fetch('/api/game/climb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: this.getPlayerId(),
          currentFloor: this.state.currentFloor,
          riskLevel: this.state.riskLevel,
          stake: this.state.stake,
          clientSeed: this.getClientSeed()
        }),
      });

      if (!response.ok) {
        console.error('Server randomness API error:', response.statusText);
        return 'error';
      }

      const result = await response.json();
      
      // Store proof for transparency and player verification
      this.storeGameProof(result.proof, result.randomValue, result.winProbability);
      
      if (result.result === 'win') {
        // Success - move to next floor
        const newFloor = this.state.currentFloor + 1;
        this.state = {
          ...this.state,
          currentFloor: newFloor,
        };

        this.updateProbabilityAndPayout();

        // Check if reached max floors (auto-win)
        if (newFloor >= GAME_CONFIG.maxFloors) {
          this.endGame('won');
        } else {
          this.notify();
        }

        return 'success';
      } else {
        // Failure - game over
        this.endGame('lost');
        return 'failure';
      }

    } catch (error) {
      console.error('Error getting game outcome from server:', error);
      return 'error';
    }
  }

  // Cash out current winnings
  cashOut(): boolean {
    if (this.state.status !== 'playing') {
      return false;
    }

    this.endGame('cashed-out');
    return true;
  }

  // End the current game
  private endGame(status: 'won' | 'lost' | 'cashed-out') {
    const result: GameResult = {
      id: Date.now().toString(),
      stake: this.state.stake,
      riskLevel: this.state.riskLevel,
      finalFloor: this.state.currentFloor,
      finalPayout: status === 'lost' ? 0 : this.state.currentPayout,
      status,
      timestamp: Date.now(),
      proof: this.currentGameProof || undefined,
    };

    this.state = {
      ...this.state,
      status,
      gameHistory: [result, ...this.state.gameHistory.slice(0, 9)], // Keep last 10 games
    };

    this.notify();
  }

  // Reset to initial state
  reset() {
    this.state = {
      ...initialGameState,
      gameHistory: this.state.gameHistory,
      tokenBalance: this.state.tokenBalance,
    };
    this.updateProbabilityAndPayout();
    this.notify();
  }

  // Update stake (only when not playing)
  updateStake(stake: number): boolean {
    if (this.state.status !== 'idle') {
      return false;
    }

    if (stake < GAME_CONFIG.minStake || stake > GAME_CONFIG.maxStake) {
      return false;
    }

    this.state = {
      ...this.state,
      stake,
    };

    this.updateProbabilityAndPayout();
    this.notify();
    return true;
  }

  // Update risk level (only when not playing)
  updateRiskLevel(riskLevel: number): boolean {
    if (this.state.status !== 'idle') {
      return false;
    }

    if (riskLevel < 1 || riskLevel > 10) {
      return false;
    }

    this.state = {
      ...this.state,
      riskLevel,
    };

    this.updateProbabilityAndPayout();
    this.notify();
    return true;
  }

  // Update token balance
  updateTokenBalance(balance: number): void {
    this.state = {
      ...this.state,
      tokenBalance: balance,
    };
    this.notify();
  }

  // Check if player has enough tokens to play
  canAffordStake(): boolean {
    return this.state.tokenBalance >= this.state.stake;
  }

  // Set risk preset
  setRiskPreset(preset: 'conservative' | 'balanced' | 'aggressive'): boolean {
    if (this.state.status !== 'idle') {
      return false;
    }

    const riskLevels = {
      conservative: 3,
      balanced: 5,
      aggressive: 8,
    };

    return this.updateRiskLevel(riskLevels[preset]);
  }
} 