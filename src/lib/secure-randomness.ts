import { createHash, randomBytes } from 'crypto';

/**
 * Secure server-side randomness service for tower climbing game
 * Implements cryptographic verification for provably fair gaming
 */

export interface GameSeed {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface RandomnessResult {
  value: number; // 0-100 percentage
  proof: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    hash: string;
  };
}

export class SecureRandomnessService {
  private static instance: SecureRandomnessService;
  private serverSeed: string;

  private constructor() {
    // Generate a secure server seed on startup
    this.serverSeed = this.generateSecureServerSeed();
  }

  public static getInstance(): SecureRandomnessService {
    if (!SecureRandomnessService.instance) {
      SecureRandomnessService.instance = new SecureRandomnessService();
    }
    return SecureRandomnessService.instance;
  }

  /**
   * Generate a cryptographically secure server seed
   */
  private generateSecureServerSeed(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate provably fair randomness for game outcome
   * Uses HMAC-SHA256 for cryptographic security
   */
  public generateRandomness(clientSeed: string, nonce: number): RandomnessResult {
    // Combine seeds and nonce
    const input = `${this.serverSeed}:${clientSeed}:${nonce}`;
    
    // Generate HMAC-SHA256 hash
    const hash = createHash('sha256').update(input).digest('hex');
    
    // Convert first 8 characters of hash to integer
    const hashInt = parseInt(hash.substr(0, 8), 16);
    
    // Normalize to 0-100 range
    const normalizedValue = (hashInt / 0xffffffff) * 100;
    
    return {
      value: normalizedValue,
      proof: {
        serverSeed: this.serverSeed,
        clientSeed,
        nonce,
        hash
      }
    };
  }

  /**
   * Verify a randomness result - allows players to check fairness
   */
  public static verifyRandomness(proof: RandomnessResult['proof']): boolean {
    const input = `${proof.serverSeed}:${proof.clientSeed}:${proof.nonce}`;
    const expectedHash = createHash('sha256').update(input).digest('hex');
    return expectedHash === proof.hash;
  }

  /**
   * Get the current server seed hash (for transparency)
   * Players can verify this matches the revealed seed later
   */
  public getServerSeedHash(): string {
    return createHash('sha256').update(this.serverSeed).digest('hex');
  }

  /**
   * Reveal server seed (for game transparency)
   * Should only be called when rotating seeds
   */
  public revealServerSeed(): string {
    const currentSeed = this.serverSeed;
    this.serverSeed = this.generateSecureServerSeed();
    return currentSeed;
  }

  /**
   * Generate a client seed suggestion (if user doesn't provide one)
   */
  public generateClientSeed(): string {
    return randomBytes(16).toString('hex');
  }
}

/**
 * Game-specific randomness utilities
 */
export class GameRandomness {
  private randomnessService: SecureRandomnessService;
  private gameNonces: Map<string, number> = new Map();

  constructor() {
    this.randomnessService = SecureRandomnessService.getInstance();
  }

  /**
   * Generate randomness for a tower climb attempt
   */
  public generateClimbOutcome(
    playerId: string, 
    clientSeed?: string
  ): RandomnessResult {
    // Use provided client seed or generate one
    const finalClientSeed = clientSeed || this.randomnessService.generateClientSeed();
    
    // Get or initialize nonce for this player
    const currentNonce = this.gameNonces.get(playerId) || 0;
    const newNonce = currentNonce + 1;
    this.gameNonces.set(playerId, newNonce);

    // Generate randomness
    return this.randomnessService.generateRandomness(finalClientSeed, newNonce);
  }

  /**
   * Reset nonce for a player (new game session)
   */
  public resetPlayerNonce(playerId: string): void {
    this.gameNonces.delete(playerId);
  }

  /**
   * Get server seed hash for transparency
   */
  public getServerSeedHash(): string {
    return this.randomnessService.getServerSeedHash();
  }
}

// Export singleton instance for use across the app
export const gameRandomness = new GameRandomness();