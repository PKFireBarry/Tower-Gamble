import { Keypair } from '@solana/web3.js';

/**
 * Utility to safely load treasury keypair from environment variables
 * Returns null during build time to prevent deployment errors
 */
export function getTreasuryKeypair(): Keypair | null {
  // Client-side: Treasury keypair should never be accessed from client
  if (typeof window !== 'undefined') {
    console.warn('Treasury keypair should not be accessed from client side');
    return null;
  }

  // Server-side: Handle missing environment variable gracefully
  const TREASURY_PRIVATE_KEY = process.env.NEXT_TREASURY_PRIVATE_KEY;
  if (!TREASURY_PRIVATE_KEY) {
    console.warn('NEXT_TREASURY_PRIVATE_KEY environment variable not set');
    return null;
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