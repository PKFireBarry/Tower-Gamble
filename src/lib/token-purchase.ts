import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Keypair
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createTransferInstruction
} from '@solana/spl-token';
import { connection, TOWER_TOKEN_MINT_ADDRESS } from './config';
import { getTowerForSOL, getSOLForTower } from './price-service';
import { getTreasuryKeypair, isTreasuryAvailable } from './env-utils';

// This is your treasury wallet - in production, store this securely
const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');

// Use the shared treasury keypair utility
const getTokenAuthorityKeypairLazy = () => {
  return getTreasuryKeypair();
};

export async function createTokenPurchaseTransaction(
  buyerWallet: PublicKey,
  solAmount: number
): Promise<Transaction> {
  const transaction = new Transaction();
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyerWallet;
  
  // Calculate token amount to mint using dynamic pricing (6 decimals)
  const tokenAmountFloat = await getTowerForSOL(solAmount);
  const tokenAmount = Math.floor(tokenAmountFloat * Math.pow(10, 6));
  
  // Get buyer's token account address
  const buyerTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
    buyerWallet
  );
  
  // Check if buyer's token account exists
  try {
    await getAccount(connection, buyerTokenAccount);
  } catch {
    // Account doesn't exist, add instruction to create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyerWallet, // payer
        buyerTokenAccount, // token account
        buyerWallet, // owner
        new PublicKey(TOWER_TOKEN_MINT_ADDRESS) // mint
      )
    );
  }
  
  // Add instruction to transfer SOL to treasury
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: buyerWallet,
      toPubkey: TREASURY_WALLET,
      lamports: Math.floor(solAmount * LAMPORTS_PER_SOL),
    })
  );
  
  // Get treasury token account
  const treasuryTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
    TREASURY_WALLET
  );

  // Add instruction to transfer tokens from treasury to buyer
  transaction.add(
    createTransferInstruction(
      treasuryTokenAccount, // from treasury
      buyerTokenAccount, // to buyer
      getTokenAuthorityKeypairLazy()?.publicKey || TREASURY_WALLET, // treasury authority
      tokenAmount // amount (with decimals)
    )
  );
  
  return transaction;
}

export async function executePurchaseTransaction(
  buyerWallet: PublicKey,
  solAmount: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: any
): Promise<{ success: boolean; tokenAmount: number; message: string; txHash?: string }> {
  try {
    const tokenAmount = await getTowerForSOL(solAmount);
    
    // Create the purchase transaction
    const transaction = await createTokenPurchaseTransaction(buyerWallet, solAmount);
    
    // Add the token authority as a signer for the mint instruction
    const authorityKeypair = getTokenAuthorityKeypairLazy();
    if (authorityKeypair) {
      transaction.partialSign(authorityKeypair);
    }
    
    // Send the transaction
    const txHash = await sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction(txHash, 'confirmed');
    
    return {
      success: true,
      tokenAmount,
      message: `Successfully purchased ${tokenAmount.toFixed(2)} TOWER tokens!`,
      txHash
    };
  } catch (error) {
    console.error('Purchase error:', error);
    return {
      success: false,
      tokenAmount: 0,
      message: error instanceof Error ? error.message : 'Purchase failed. Please try again.'
    };
  }
}

// Get token purchase rate (dynamic)
export async function getTokenPurchaseRate(): Promise<number> {
  const tokenAmount = await getTowerForSOL(1); // 1 SOL = ? TOWER
  return tokenAmount;
}

// Calculate tokens for SOL amount (dynamic)
export async function calculateTokensForSOL(solAmount: number): Promise<number> {
  return getTowerForSOL(solAmount);
}

// Calculate SOL needed for token amount (dynamic)
export async function calculateSOLForTokens(tokenAmount: number): Promise<number> {
  return getSOLForTower(tokenAmount);
} 

// Sell TOWER tokens for SOL (burn tokens + send SOL from treasury)
export async function sellTowerTokens(
  sellerWallet: PublicKey,
  tokenAmount: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: any
): Promise<{ success: boolean; solAmount: number; message: string; txHash?: string }> {
  try {
    const solAmount = await getSOLForTower(tokenAmount);
    
    // Create the sell transaction
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sellerWallet;
    
    // Get seller's token account
    const sellerTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      sellerWallet
    );
    
    // Calculate token amount to transfer (with decimals)
    const tokenAmountWithDecimals = Math.floor(tokenAmount * Math.pow(10, 6));
    
    // Transfer tokens from seller to treasury (effectively burning them)
    transaction.add(
      createTransferInstruction(
        sellerTokenAccount,
        await getAssociatedTokenAddress(new PublicKey(TOWER_TOKEN_MINT_ADDRESS), TREASURY_WALLET),
        sellerWallet,
        tokenAmountWithDecimals
      )
    );
    
    // Load treasury keypair from environment variables
    const TREASURY_KEYPAIR = getTreasuryKeypair();
    if (!TREASURY_KEYPAIR) {
      throw new Error('Treasury keypair not available - check environment configuration');
    }
    
    // Transfer SOL from treasury to seller
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: TREASURY_KEYPAIR.publicKey,
        toPubkey: sellerWallet,
        lamports: Math.floor(solAmount * LAMPORTS_PER_SOL),
      })
    );
    
    // Sign with treasury keypair
    transaction.partialSign(TREASURY_KEYPAIR);
    
    // Send the transaction
    const txHash = await sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction(txHash, 'confirmed');
    
    return {
      success: true,
      solAmount,
      message: `Successfully sold ${tokenAmount.toFixed(2)} TOWER tokens for ${solAmount.toFixed(4)} SOL!`,
      txHash
    };
  } catch (error) {
    console.error('Sell error:', error);
    return {
      success: false,
      solAmount: 0,
      message: error instanceof Error ? error.message : 'Sale failed. Please try again.'
    };
  }
}