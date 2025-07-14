import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction
} from '@solana/spl-token';
import { connection, TOWER_TOKEN_MINT_ADDRESS } from '@/lib/config';
import { getSOLForTower } from '@/lib/price-service';
import { getTreasuryKeypair } from '@/lib/env-utils';

// Treasury wallet address
const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');

export async function POST(request: NextRequest) {
  try {
    const { sellerWallet, tokenAmount } = await request.json();

    if (!sellerWallet || !tokenAmount || tokenAmount <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters: sellerWallet, tokenAmount' },
        { status: 400 }
      );
    }

    // Check if treasury is available
    const treasuryKeypair = getTreasuryKeypair();
    if (!treasuryKeypair) {
      return NextResponse.json(
        { error: 'Token selling is currently unavailable - treasury not configured' },
        { status: 503 }
      );
    }

    const sellerPublicKey = new PublicKey(sellerWallet);
    const solAmount = await getSOLForTower(tokenAmount);
    
    // Create the sell transaction
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sellerPublicKey;
    
    // Get seller's token account
    const sellerTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      sellerPublicKey
    );
    
    // Calculate token amount to transfer (with decimals)
    const tokenAmountWithDecimals = Math.floor(tokenAmount * Math.pow(10, 6));
    
    // Transfer tokens from seller to treasury (effectively burning them)
    transaction.add(
      createTransferInstruction(
        sellerTokenAccount,
        await getAssociatedTokenAddress(new PublicKey(TOWER_TOKEN_MINT_ADDRESS), TREASURY_WALLET),
        sellerPublicKey,
        tokenAmountWithDecimals
      )
    );
    
    // Transfer SOL from treasury to seller
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: sellerPublicKey,
        lamports: Math.floor(solAmount * LAMPORTS_PER_SOL),
      })
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
      solAmount: solAmount,
      message: `Ready to sell ${tokenAmount} TOWER tokens for ${solAmount.toFixed(4)} SOL`
    });

  } catch (error) {
    console.error('Sell API error:', error);
    return NextResponse.json(
      { error: 'Failed to create sell transaction' },
      { status: 500 }
    );
  }
} 