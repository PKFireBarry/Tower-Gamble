import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createTransferInstruction
} from '@solana/spl-token';
import { connection, TOWER_TOKEN_MINT_ADDRESS } from '@/lib/config';
import { getTowerForSOL } from '@/lib/price-service';
import { getTreasuryKeypair } from '@/lib/env-utils';

// Treasury wallet address
const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');

export async function POST(request: NextRequest) {
  try {
    const { buyerWallet, solAmount } = await request.json();

    if (!buyerWallet || !solAmount) {
      return NextResponse.json(
        { error: 'Missing required parameters: buyerWallet, solAmount' },
        { status: 400 }
      );
    }

    // Validate SOL amount
    if (solAmount <= 0 || solAmount > 100) {
      return NextResponse.json(
        { error: 'Invalid SOL amount. Must be between 0 and 100 SOL.' },
        { status: 400 }
      );
    }

    // Check if treasury is available
    const treasuryKeypair = getTreasuryKeypair();
    if (!treasuryKeypair) {
      return NextResponse.json(
        { error: 'Token purchasing is currently unavailable - treasury not configured' },
        { status: 503 }
      );
    }

    const buyerPublicKey = new PublicKey(buyerWallet);
    
    // Calculate token amount to mint using dynamic pricing (6 decimals)
    const tokenAmountFloat = await getTowerForSOL(solAmount);
    const tokenAmount = Math.floor(tokenAmountFloat * Math.pow(10, 6));
    
    // Create the transaction
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = buyerPublicKey;
    
    // Get buyer's token account address
    const buyerTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      buyerPublicKey
    );
    
    // Check if buyer's token account exists
    try {
      await getAccount(connection, buyerTokenAccount);
    } catch {
      // Account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyerPublicKey, // payer
          buyerTokenAccount, // token account
          buyerPublicKey, // owner
          new PublicKey(TOWER_TOKEN_MINT_ADDRESS) // mint
        )
      );
    }
    
    // Add instruction to transfer SOL to treasury
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyerPublicKey,
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
        treasuryKeypair.publicKey, // treasury authority
        tokenAmount // amount (with decimals)
      )
    );
    
    // Sign with treasury keypair
    transaction.partialSign(treasuryKeypair);
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    return NextResponse.json({
      success: true,
      transaction: serializedTransaction.toString('base64'),
      tokenAmount: tokenAmountFloat,
      message: `Ready to purchase ${tokenAmountFloat.toFixed(2)} TOWER tokens`
    });

  } catch (error) {
    console.error('Purchase API error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase transaction' },
      { status: 500 }
    );
  }
} 