import { Connection, clusterApiUrl } from '@solana/web3.js';

// Game Configuration
export const GAME_CONFIG = {
  name: 'Tower Gamble',
  minStake: 1,
  maxStake: 500,
  maxFloors: 10,
  
  // Win chance constraints
  minWinChance: 25,
  maxWinChance: 60,
  
  // Base floor difficulty (linear progression)
  baseFloorDifficulty: {
    startWinChance: 55, // Floor 1
    endWinChance: 35,   // Floor 10
  },
  
  // Risk slider configuration (1-10)
  riskSlider: {
    min: 1,
    max: 10,
    minMultiplier: 1.0,   // Risk 1 = no change
    maxMultiplier: 0.6,   // Risk 10 = 40% harder
  },
  
  // Stake penalty system
  stakePenalty: {
    minStake: 1,      // No penalty
    maxStake: 500,    // 5% penalty
    maxPenalty: 5,    // Maximum 5% penalty
  },
  
  // Payout multiplier scaling
  payoutMultiplier: {
    minRisk: 1.2,  // Risk 1 = 1.2x per floor
    maxRisk: 2.5,  // Risk 10 = 2.5x per floor
  },
} as const;

// Risk presets for easy selection
export const RISK_PRESETS = {
  conservative: {
    risk: 3,
    name: 'Conservative',
    description: 'Lower risk, steady rewards',
    color: 'text-green-600',
    recommendedStake: { min: 1, max: 50 },
  },
  balanced: {
    risk: 5,
    name: 'Balanced',
    description: 'Moderate risk, good rewards',
    color: 'text-blue-600',
    recommendedStake: { min: 10, max: 100 },
  },
  aggressive: {
    risk: 8,
    name: 'Aggressive',
    description: 'High risk, maximum rewards',
    color: 'text-red-600',
    recommendedStake: { min: 50, max: 500 },
  },
} as const;

// Solana Configuration
export const SOLANA_CONFIG = {
  network: 'devnet' as const,
  rpcUrl: clusterApiUrl('devnet'),
  // Alternative RPC endpoints for better reliability
  alternativeRpcUrls: [
    'https://api.devnet.solana.com',
    'https://devnet.helius-rpc.com',
    clusterApiUrl('devnet')
  ]
} as const;

// TOWER Token Configuration
export const TOWER_TOKEN_MINT_ADDRESS = '7zQ4Wvt66PYe4ijnjNZwGNxAjnsWYqvBQSushtbX6Rds';

// Create Solana connection with better rate limiting configuration
export const connection = new Connection(SOLANA_CONFIG.rpcUrl, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000, // 60 seconds
  disableRetryOnRateLimit: false,
  httpHeaders: {
    'User-Agent': 'TowerGamble/1.0'
  }
});

// Connection retry mechanism with fallback RPC endpoints
export class ConnectionManager {
  private connections: Connection[] = [];
  private currentIndex = 0;
  private lastFailureTime = 0;
  private readonly FAILURE_COOLDOWN = 30000; // 30 seconds

  constructor() {
    // Initialize connections for all RPC endpoints
    this.connections = SOLANA_CONFIG.alternativeRpcUrls.map(url => 
      new Connection(url, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'User-Agent': 'TowerGamble/1.0'
        }
      })
    );
  }

  // Get the current connection with automatic failover
  getConnection(): Connection {
    const now = Date.now();
    
    // If we recently had a failure, try the next endpoint
    if (now - this.lastFailureTime < this.FAILURE_COOLDOWN) {
      this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    }
    
    return this.connections[this.currentIndex];
  }

  // Mark current connection as failed and switch to next
  markConnectionFailed(): void {
    this.lastFailureTime = Date.now();
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    console.warn(`Switching to RPC endpoint ${this.currentIndex + 1}/${this.connections.length}`);
  }

  // Execute a function with automatic retry on different RPC endpoints
  async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const conn = this.getConnection();
        return await operation(conn);
      } catch (error) {
        lastError = error as Error;
        
        // If it's a rate limit error, try next endpoint
        if (error instanceof Error && (
          error.message.includes('429') || 
          error.message.includes('rate limit') ||
          error.message.includes('Too Many Requests')
        )) {
          this.markConnectionFailed();
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
}

// Global connection manager instance
export const connectionManager = new ConnectionManager();

// Calculate base win chance for a given floor (0-based)
export const getBaseWinChance = (floor: number): number => {
  const { startWinChance, endWinChance } = GAME_CONFIG.baseFloorDifficulty;
  const maxFloors = GAME_CONFIG.maxFloors;
  
  // Linear interpolation between start and end
  const progress = floor / (maxFloors - 1);
  const winChance = startWinChance - (progress * (startWinChance - endWinChance));
  
  return Math.max(winChance, 0);
};

// Calculate risk multiplier for given risk level (1-10)
export const getRiskMultiplier = (riskLevel: number): number => {
  const { min, max, minMultiplier, maxMultiplier } = GAME_CONFIG.riskSlider;
  
  // Clamp risk level to valid range
  const clampedRisk = Math.max(min, Math.min(max, riskLevel));
  
  // Linear interpolation between min and max multipliers
  const progress = (clampedRisk - min) / (max - min);
  const multiplier = minMultiplier - (progress * (minMultiplier - maxMultiplier));
  
  return multiplier;
};

// Calculate stake penalty for given stake amount
export const getStakePenalty = (stake: number): number => {
  const { minStake, maxStake, maxPenalty } = GAME_CONFIG.stakePenalty;
  
  // Clamp stake to valid range
  const clampedStake = Math.max(minStake, Math.min(maxStake, stake));
  
  // Linear penalty calculation
  const progress = (clampedStake - minStake) / (maxStake - minStake);
  const penalty = progress * maxPenalty;
  
  return penalty;
};

// Calculate final win probability with all modifiers
export const calculateWinProbability = (floor: number, riskLevel: number, stake: number): number => {
  // Get base win chance for this floor
  const baseWinChance = getBaseWinChance(floor);
  
  // Apply risk multiplier
  const riskMultiplier = getRiskMultiplier(riskLevel);
  const riskAdjustedChance = baseWinChance * riskMultiplier;
  
  // Apply stake penalty
  const stakePenalty = getStakePenalty(stake);
  const finalWinChance = riskAdjustedChance - stakePenalty;
  
  // Apply safety caps
  return Math.max(GAME_CONFIG.minWinChance, Math.min(GAME_CONFIG.maxWinChance, finalWinChance));
};

// Calculate payout multiplier for given risk level
export const getPayoutMultiplier = (riskLevel: number): number => {
  const { minRisk, maxRisk } = GAME_CONFIG.payoutMultiplier;
  const { min, max } = GAME_CONFIG.riskSlider;
  
  // Clamp risk level to valid range
  const clampedRisk = Math.max(min, Math.min(max, riskLevel));
  
  // Linear interpolation between min and max multipliers
  const progress = (clampedRisk - min) / (max - min);
  const multiplier = minRisk + (progress * (maxRisk - minRisk));
  
  return multiplier;
};

// Calculate payout for a given floor using risk-adjusted multipliers
export const calculatePayout = (stake: number, floor: number, riskLevel: number): number => {
  if (floor === 0) return stake;
  let totalPayout = stake;
  const floorMultiplier = getPayoutMultiplier(riskLevel);

  // Only apply multipliers starting from the second floor (floor 1)
  for (let i = 1; i <= floor; i++) {
    totalPayout *= floorMultiplier;
  }

  // Round to nearest whole number
  return Math.round(totalPayout);
};

// Get risk level name and color for display
export const getRiskInfo = (riskLevel: number): { name: string; color: string } => {
  if (riskLevel <= 3) {
    return { name: 'Low Risk', color: 'text-green-600' };
  } else if (riskLevel <= 6) {
    return { name: 'Medium Risk', color: 'text-yellow-600' };
  } else if (riskLevel <= 8) {
    return { name: 'High Risk', color: 'text-orange-600' };
  } else {
    return { name: 'Extreme Risk', color: 'text-red-600' };
  }
};

// Legacy functions for backward compatibility (deprecated)
export const getRiskTier = (floor: number) => {
  return {
    floors: [floor + 1],
    winChance: getBaseWinChance(floor),
    multiplier: 1.5, // Default multiplier
  };
};

export const getRiskTierName = (): string => {
  return getRiskInfo(5).name; // Default to medium risk
};

export const getRiskTierColor = (): string => {
  return getRiskInfo(5).color; // Default to medium risk
}; 