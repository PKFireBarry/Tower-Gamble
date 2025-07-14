import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createTransferInstruction
} from '@solana/spl-token';
import { connection, TOWER_TOKEN_MINT_ADDRESS } from '@/lib/config';
import { getTreasuryKeypair } from '@/lib/env-utils';

// Treasury wallet address
const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');

export async function POST(request: NextRequest) {
  try {
    const { playerWallet, amount } = await request.json();

    if (!playerWallet || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters: playerWallet, amount' },
        { status: 400 }
      );
    }

    // Check if treasury is available
    const treasuryKeypair = getTreasuryKeypair();
    if (!treasuryKeypair) {
      return NextResponse.json(
        { error: 'Token transfer is currently unavailable - treasury not configured' },
        { status: 503 }
      );
    }

    const playerPublicKey = new PublicKey(playerWallet);
    
    // Create the transaction
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = playerPublicKey;

    // Treasury wallet (where game stakes are held)
    const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');
    
    // Get treasury token account
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      TREASURY_WALLET
    );

    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      playerPublicKey
    );

    // Check if user's token account exists
    try {
      await getAccount(connection, userTokenAccount);
    } catch {
      // Account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          playerPublicKey, // payer
          userTokenAccount, // token account
          playerPublicKey, // owner
          new PublicKey(TOWER_TOKEN_MINT_ADDRESS) // mint
        )
      );
    }

    // Calculate transfer amount with decimals (6 decimals)
    const transferAmount = Math.floor(amount * Math.pow(10, 6));

    // Add transfer instruction from treasury to player
    transaction.add(
      createTransferInstruction(
        treasuryTokenAccount,
        userTokenAccount,
        treasuryKeypair.publicKey,
        transferAmount
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
      message: `Ready to transfer ${amount} TOWER tokens from treasury to player`
    });

  } catch (error) {
    console.error('Transfer to player API error:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer transaction' },
      { status: 500 }
    );
  }
} 