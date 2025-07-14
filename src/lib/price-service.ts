// Price service for dynamic token conversion
// $1 USD = 10 TOWER tokens (constant)
// SOL price changes, so TOWER/SOL rate adjusts accordingly

interface PriceData {
  solPriceUSD: number;
  towerPerSOL: number;
  solPerTower: number;
  lastUpdated: number;
}

class PriceService {
  private cache: PriceData | null = null;
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds
  private readonly SOL_PER_TOWER = 0.0001; // 0.0001 SOL = 1 TOWER token
  private readonly TOWER_PER_SOL = 10000; // 10000 TOWER = 1 SOL (1 TOWER = 0.0001 SOL)

  // Fetch current SOL price from multiple sources for reliability
  async fetchSOLPrice(): Promise<number> {
    const sources = [
      // CoinGecko API
      async () => {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        return data.solana.usd;
      },
      // Jupiter API (Solana-based)
      async () => {
        const response = await fetch('https://price.jup.ag/v4/price?ids=SOL');
        const data = await response.json();
        return data.data.SOL.price;
      },
      // Fallback to hardcoded value if APIs fail
      async () => {
        console.warn('Using fallback SOL price');
        return 240; // Fallback price in USD
      }
    ];

    // Try each source until one succeeds
    for (const source of sources) {
      try {
        const price = await source();
        if (price && price > 0) {
          return price;
        }
      } catch (error) {
        console.warn('Price source failed:', error);
        continue;
      }
    }

    // If all sources fail, use fallback
    return 240;
  }

  // Get current pricing data with caching
  async getPriceData(): Promise<PriceData> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache && (now - this.cache.lastUpdated) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // Fetch fresh SOL price
      const solPriceUSD = await this.fetchSOLPrice();
      
      // Calculate conversion rates
      // Fixed backing: 0.0001 SOL = 1 TOWER token
      // Therefore: 1 SOL = 10000 TOWER tokens
      const towerPerSOL = this.TOWER_PER_SOL;
      const solPerTower = this.SOL_PER_TOWER;

      const priceData: PriceData = {
        solPriceUSD,
        towerPerSOL,
        solPerTower,
        lastUpdated: now
      };

      // Cache the result
      this.cache = priceData;
      return priceData;
    } catch (error) {
      console.error('Error fetching price data:', error);
      
      // Return cached data if available, otherwise use fallback
      if (this.cache) {
        return this.cache;
      }
      
      // Fallback pricing
      const fallbackPrice = 240;
      const fallbackData: PriceData = {
        solPriceUSD: fallbackPrice,
        towerPerSOL: this.TOWER_PER_SOL,
        solPerTower: this.SOL_PER_TOWER,
        lastUpdated: now
      };
      
      this.cache = fallbackData;
      return fallbackData;
    }
  }

  // Calculate how many TOWER tokens for given SOL amount
  async calculateTowerForSOL(solAmount: number): Promise<number> {
    const { towerPerSOL } = await this.getPriceData();
    return solAmount * towerPerSOL;
  }

  // Calculate how much SOL needed for given TOWER amount
  async calculateSOLForTower(towerAmount: number): Promise<number> {
    const { solPerTower } = await this.getPriceData();
    return towerAmount * solPerTower;
  }

  // Get current conversion rate (TOWER per SOL)
  async getConversionRate(): Promise<number> {
    const { towerPerSOL } = await this.getPriceData();
    return towerPerSOL;
  }

  // Get current SOL price in USD
  async getSOLPriceUSD(): Promise<number> {
    const { solPriceUSD } = await this.getPriceData();
    return solPriceUSD;
  }

  // Get formatted price display
  async getPriceDisplay(): Promise<{
    solPriceUSD: string;
    towerPerSOL: string;
    solPerTower: string;
    usdPerTower: string;
    towerPriceFormatted: string; // New: Combined SOL/USD format
  }> {
    const { solPriceUSD, towerPerSOL, solPerTower } = await this.getPriceData();
    const usdPerTower = solPerTower * solPriceUSD;
    
    return {
      solPriceUSD: `$${solPriceUSD.toFixed(2)}`,
      towerPerSOL: `${towerPerSOL.toFixed(0)} TOWER`,
      solPerTower: `${solPerTower.toFixed(6)} SOL`,
      usdPerTower: `$${usdPerTower.toFixed(4)}`,
      towerPriceFormatted: `${solPerTower.toFixed(4)} SOL / $${usdPerTower.toFixed(4)} USD` // Combined format
    };
  }

  // Get formatted token amount with SOL/USD values
  async getTokenAmountFormatted(tokenAmount: number): Promise<string> {
    const { solPriceUSD, solPerTower } = await this.getPriceData();
    const solValue = tokenAmount * solPerTower;
    const usdValue = solValue * solPriceUSD;
    
    return `${tokenAmount.toFixed(2)} TOWER (${solValue.toFixed(4)} SOL / $${usdValue.toFixed(2)} USD)`;
  }

  // Get formatted SOL amount with USD equivalent
  async getSOLAmountFormatted(solAmount: number): Promise<string> {
    const { solPriceUSD } = await this.getPriceData();
    const usdValue = solAmount * solPriceUSD;
    
    return `${solAmount.toFixed(4)} SOL / $${usdValue.toFixed(2)} USD`;
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache = null;
  }
}

// Export singleton instance
export const priceService = new PriceService();

// Export utility functions
export async function getTowerForSOL(solAmount: number): Promise<number> {
  return priceService.calculateTowerForSOL(solAmount);
}

export async function getSOLForTower(towerAmount: number): Promise<number> {
  return priceService.calculateSOLForTower(towerAmount);
}

export async function getCurrentConversionRate(): Promise<number> {
  return priceService.getConversionRate();
}

export async function getSOLPriceUSD(): Promise<number> {
  return priceService.getSOLPriceUSD();
}

export async function getPriceDisplay() {
  return priceService.getPriceDisplay();
}

export async function getTokenAmountFormatted(tokenAmount: number): Promise<string> {
  return priceService.getTokenAmountFormatted(tokenAmount);
}

export async function getSOLAmountFormatted(solAmount: number): Promise<string> {
  return priceService.getSOLAmountFormatted(solAmount);
} 