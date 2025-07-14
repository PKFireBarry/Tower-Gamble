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
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid amount parameter' },
        { status: 400 }
      );
    }

    // Check if treasury is available
    const treasuryKeypair = getTreasuryKeypair();
    if (!treasuryKeypair) {
      return NextResponse.json(
        { error: 'Token burning is currently unavailable - treasury not configured' },
        { status: 503 }
      );
    }

    // Create the burn transaction
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;

    // Get treasury token account
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      TREASURY_WALLET
    );

    // Calculate burn amount with decimals (6 decimals)
    const burnAmount = Math.floor(amount * Math.pow(10, 6));

    // Create burn instruction (transfer to null address / burn address)
    // Since Solana doesn't have a built-in burn instruction for SPL tokens,
    // we transfer to a known burn address that no one controls
    const BURN_ADDRESS = new PublicKey('11111111111111111111111111111112'); // System Program ID (uncontrolled)
    
    // Get burn address token account
    const burnTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      BURN_ADDRESS
    );

    // Check if burn account exists, if not create it
    try {
      await getAccount(connection, burnTokenAccount);
    } catch {
      // Account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          treasuryKeypair.publicKey, // payer (treasury pays)
          burnTokenAccount, // token account
          BURN_ADDRESS, // owner (system program - uncontrolled)
          new PublicKey(TOWER_TOKEN_MINT_ADDRESS) // mint
        )
      );
    }

    // Add transfer instruction from treasury to burn address (effectively burning)
    transaction.add(
      createTransferInstruction(
        treasuryTokenAccount,
        burnTokenAccount,
        treasuryKeypair.publicKey,
        burnAmount
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
      message: `Ready to burn ${amount} TOWER tokens from treasury`
    });

  } catch (error) {
    console.error('Burn API error:', error);
    return NextResponse.json(
      { error: 'Failed to create burn transaction' },
      { status: 500 }
    );
  }
} 