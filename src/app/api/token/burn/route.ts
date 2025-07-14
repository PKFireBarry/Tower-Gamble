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

    console.log('Burn API called with amount:', amount);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid amount parameter' },
        { status: 400 }
      );
    }

    // Check if treasury is available
    const treasuryKeypair = getTreasuryKeypair();
    console.log('Treasury keypair result:', treasuryKeypair ? 'available' : 'null');
    
    if (!treasuryKeypair) {
      console.error('Treasury keypair not available');
      return NextResponse.json(
        { error: 'Token burning is currently unavailable - treasury not configured' },
        { status: 503 }
      );
    }

    console.log('Treasury keypair available, public key:', treasuryKeypair.publicKey.toString());
    console.log('TOWER_TOKEN_MINT_ADDRESS:', TOWER_TOKEN_MINT_ADDRESS);

    // Create the burn transaction
    const transaction = new Transaction();
    
    console.log('Getting latest blockhash...');
    // Get recent blockhash
    try {
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = treasuryKeypair.publicKey;
      console.log('Blockhash obtained successfully');
    } catch (error) {
      console.error('Failed to get blockhash:', error);
      throw new Error(`Failed to get blockhash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('Getting treasury token account...');
    // Get treasury token account
    let treasuryTokenAccount;
    try {
      treasuryTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
        TREASURY_WALLET
      );
      console.log('Treasury token account:', treasuryTokenAccount.toString());
    } catch (error) {
      console.error('Failed to get treasury token account:', error);
      throw new Error(`Failed to get treasury token account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Calculate burn amount with decimals (6 decimals)
    const burnAmount = Math.floor(amount * Math.pow(10, 6));
    console.log('Burn amount with decimals:', burnAmount);

    // Create burn instruction (transfer to null address / burn address)
    // Since Solana doesn't have a built-in burn instruction for SPL tokens,
    // we transfer to a known burn address that no one controls
    const BURN_ADDRESS = new PublicKey('11111111111111111111111111111112'); // System Program ID (uncontrolled)
    
    console.log('Getting burn token account...');
    // Get burn address token account
    const burnTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(TOWER_TOKEN_MINT_ADDRESS),
      BURN_ADDRESS
    );
    console.log('Burn token account:', burnTokenAccount.toString());

    // Check if burn account exists, if not create it
    try {
      console.log('Checking if burn account exists...');
      await getAccount(connection, burnTokenAccount);
      console.log('Burn account exists');
    } catch (error) {
      console.log('Burn account does not exist, creating it...');
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

    console.log('Adding transfer instruction...');
    // Add transfer instruction from treasury to burn address (effectively burning)
    transaction.add(
      createTransferInstruction(
        treasuryTokenAccount,
        burnTokenAccount,
        treasuryKeypair.publicKey,
        burnAmount
      )
    );

    console.log('Signing transaction with treasury keypair...');
    // Sign with treasury keypair
    transaction.partialSign(treasuryKeypair);
    
    console.log('Serializing transaction...');
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { error: `Failed to create burn transaction: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 