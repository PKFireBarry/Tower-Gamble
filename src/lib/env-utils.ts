import { Keypair } from '@solana/web3.js';

/**
 * Utility to safely load treasury keypair from environment variables
 * Returns null during build time to prevent deployment errors
 */
export function getTreasuryKeypair(): Keypair | null {
  // Don't load environment variables during build time
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.TREASURY_PRIVATE_KEY) {
    console.warn('Treasury keypair not available during build time');
    return null;
  }

  const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
  if (!TREASURY_PRIVATE_KEY) {
    if (typeof window === 'undefined') {
      // Server-side: log warning but don't throw during build
      console.warn('TREASURY_PRIVATE_KEY environment variable not set');
      return null;
    } else {
      // Client-side: this shouldn't happen
      throw new Error('TREASURY_PRIVATE_KEY environment variable not set');
    }
  }

  try {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(TREASURY_PRIVATE_KEY)));
  } catch (error) {
    console.error('Failed to parse treasury private key:', error);
    return null;
  }
}

/**
 * Check if treasury operations are available
 */
export function isTreasuryAvailable(): boolean {
  return getTreasuryKeypair() !== null;
}