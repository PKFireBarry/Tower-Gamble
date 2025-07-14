import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PublicKey } from "@solana/web3.js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a Solana Explorer URL for a given address
 * @param address - The wallet address or public key
 * @param network - The network (devnet, testnet, mainnet-beta)
 * @returns The Solana Explorer URL
 */
export function getSolanaExplorerUrl(address: string | PublicKey, network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet'): string {
  const addressString = typeof address === 'string' ? address : address.toString()
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `https://explorer.solana.com/address/${addressString}${cluster}`
}

/**
 * Truncate a wallet address for display
 * @param address - The wallet address
 * @param startLength - Number of characters to show at the start
 * @param endLength - Number of characters to show at the end
 * @returns Truncated address string
 */
export function truncateAddress(address: string, startLength: number = 4, endLength: number = 4): string {
  if (address.length <= startLength + endLength) {
    return address
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}
