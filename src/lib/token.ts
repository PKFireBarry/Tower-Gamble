import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createTransferInstruction,
} from '@solana/spl-token';
import { connection, TOWER_TOKEN_MINT_ADDRESS } from './config';

// Tower Game Token Configuration
export const TOWER_TOKEN_CONFIG = {
  name: 'Tower Gamble Token',
  symbol: 'TOWER',
  decimals: 6,
  totalSupply: 1_000_000_000, // 1 billion tokens
  description: 'The native token for Tower Gamble game - stake to play and win!',
  image: 'https://your-domain.com/tower-token-logo.png', // You'll need to host this
  initialPrice: 0.001, // Starting price in SOL
} as const;

// Token mint address
export const TOWER_TOKEN_MINT = new PublicKey(TOWER_TOKEN_MINT_ADDRESS);

// Create the Tower Game Token
export async function createTowerToken(
  payer: Keypair,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null = null
): Promise<PublicKey> {
  try {
    console.log('Creating Tower Game Token...');
    
    const mint = await createMint(
      connection,
      payer,
      mintAuthority,
      freezeAuthority,
      TOWER_TOKEN_CONFIG.decimals,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    console.log('Tower Token Mint Address:', mint.toBase58());
    
    return mint;
  } catch (error) {
    console.error('Error creating Tower token:', error);
    throw error;
  }
}

// Get or create associated token account for a wallet
export async function getOrCreateTowerTokenAccount(
  walletPublicKey: PublicKey,
  payer?: Keypair
): Promise<PublicKey> {
  if (!TOWER_TOKEN_MINT) {
    throw new Error('Tower token mint not set. Please create token first.');
  }

  try {
    const associatedTokenAddress = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      walletPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Check if account exists
    try {
      await getAccount(connection, associatedTokenAddress);
      return associatedTokenAddress;
    } catch {
      // Account doesn't exist, create it
      if (payer) {
        const account = await getOrCreateAssociatedTokenAccount(
          connection,
          payer,
          TOWER_TOKEN_MINT,
          walletPublicKey
        );
        return account.address;
      } else {
        // Return the address anyway, the transaction will create it
        return associatedTokenAddress;
      }
    }
  } catch (error) {
    console.error('Error getting/creating token account:', error);
    throw error;
  }
}

// Get token balance for a wallet
export async function getTowerTokenBalance(walletPublicKey: PublicKey): Promise<number> {
  if (!TOWER_TOKEN_MINT) {
    return 0;
  }

  try {
    const tokenAccountAddress = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      walletPublicKey
    );
    
    // Check if the token account exists
    try {
      const account = await getAccount(connection, tokenAccountAddress);
      return Number(account.amount) / Math.pow(10, TOWER_TOKEN_CONFIG.decimals);
    } catch (error) {
      // Token account doesn't exist, balance is 0
      if (error instanceof Error && error.name === 'TokenAccountNotFoundError') {
        return 0;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

// Mint tokens to a wallet (for initial distribution/rewards)
export async function mintTowerTokens(
  mintAuthority: Keypair,
  destinationWallet: PublicKey,
  amount: number
): Promise<string> {
  if (!TOWER_TOKEN_MINT) {
    throw new Error('Tower token mint not set');
  }

  try {
    const destinationTokenAccount = await getOrCreateTowerTokenAccount(
      destinationWallet,
      mintAuthority
    );

    const mintAmount = amount * Math.pow(10, TOWER_TOKEN_CONFIG.decimals);

    const signature = await mintTo(
      connection,
      mintAuthority,
      TOWER_TOKEN_MINT,
      destinationTokenAccount,
      mintAuthority,
      mintAmount
    );

    console.log('Minted', amount, 'TOWER tokens to', destinationWallet.toBase58());
    return signature;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
}

// Transfer tokens between wallets
export async function transferTowerTokens(
  fromWallet: Keypair,
  toWallet: PublicKey,
  amount: number
): Promise<string> {
  if (!TOWER_TOKEN_MINT) {
    throw new Error('Tower token mint not set');
  }

  try {
    const fromTokenAccount = await getOrCreateTowerTokenAccount(fromWallet.publicKey);
    const toTokenAccount = await getOrCreateTowerTokenAccount(toWallet);

    const transferAmount = amount * Math.pow(10, TOWER_TOKEN_CONFIG.decimals);

    const signature = await transfer(
      connection,
      fromWallet,
      fromTokenAccount,
      toTokenAccount,
      fromWallet,
      transferAmount
    );

    console.log('Transferred', amount, 'TOWER tokens');
    return signature;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
}

// Create a transaction to buy TOWER tokens with SOL
export async function createBuyTokenTransaction(
  buyerWallet: PublicKey,
  solAmount: number
): Promise<Transaction> {
  if (!TOWER_TOKEN_MINT) {
    throw new Error('Tower token mint not set');
  }

  const transaction = new Transaction();
  
  // Create associated token account if needed
  const buyerTokenAccount = await getAssociatedTokenAddress(
    TOWER_TOKEN_MINT,
    buyerWallet
  );

  try {
    await getAccount(connection, buyerTokenAccount);
  } catch {
    // Account doesn't exist, add instruction to create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyerWallet, // payer
        buyerTokenAccount, // associated token account
        buyerWallet, // owner
        TOWER_TOKEN_MINT // mint
      )
    );
  }

  // Add transfer SOL instruction (to treasury/game wallet)
  // Note: In production, you'd transfer to your treasury wallet
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: buyerWallet,
      toPubkey: buyerWallet, // Placeholder - replace with treasury
      lamports: solAmount * LAMPORTS_PER_SOL,
    })
  );

  return transaction;
}

// Token metadata for exchanges
export const TOKEN_METADATA = {
  name: TOWER_TOKEN_CONFIG.name,
  symbol: TOWER_TOKEN_CONFIG.symbol,
  description: TOWER_TOKEN_CONFIG.description,
  decimals: TOWER_TOKEN_CONFIG.decimals,
  image: TOWER_TOKEN_CONFIG.image,
  external_url: 'https://your-domain.com', // Your game URL
  attributes: [
    {
      trait_type: 'Type',
      value: 'Gaming Token'
    },
    {
      trait_type: 'Blockchain',
      value: 'Solana'
    },
    {
      trait_type: 'Use Case',
      value: 'Tower Gamble Game'
    }
  ],
  properties: {
    files: [
      {
        uri: TOWER_TOKEN_CONFIG.image,
        type: 'image/png'
      }
    ],
    category: 'image'
  }
};

// Utility function to format token amounts
export function formatTokenAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

// Calculate game rewards based on floor reached
export function calculateGameReward(stake: number, floorsClimbed: number): number {
  const baseReward = stake * Math.pow(1.5, floorsClimbed);
  return Math.round(baseReward * 100) / 100; // Round to 2 decimal places
} 

// Burn tokens when player loses (reduces total supply)
export async function burnTowerTokens(
  walletPublicKey: PublicKey,
  amount: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  if (!TOWER_TOKEN_MINT) {
    return { success: false, message: 'Tower token mint not set' };
  }

  try {
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPublicKey;

    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      walletPublicKey
    );

    // Calculate burn amount with decimals
    const burnAmount = Math.floor(amount * Math.pow(10, TOWER_TOKEN_CONFIG.decimals));

    // Create burn instruction (transfer to null address / burn address)
    // Since Solana doesn't have a built-in burn instruction for SPL tokens,
    // we transfer to a known burn address that no one controls
    const BURN_ADDRESS = new PublicKey('11111111111111111111111111111112'); // System Program ID (uncontrolled)
    
    // Get burn address token account
    const burnTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      BURN_ADDRESS
    );

    // Check if burn account exists, if not create it
    try {
      await getAccount(connection, burnTokenAccount);
    } catch {
      // Account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey, // payer
          burnTokenAccount, // token account
          BURN_ADDRESS, // owner (system program - uncontrolled)
          TOWER_TOKEN_MINT // mint
        )
      );
    }

    // Add transfer instruction to burn address (effectively burning)
    transaction.add(
      createTransferInstruction(
        userTokenAccount,
        burnTokenAccount,
        walletPublicKey,
        burnAmount
      )
    );

    // Send transaction
    const txHash = await sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction(txHash, 'confirmed');

    return {
      success: true,
      message: `Burned ${amount} TOWER tokens`,
      txHash
    };
  } catch (error) {
    console.error('Error burning tokens:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to burn tokens'
    };
  }
}

// Transfer tokens from treasury to player when they win
export async function transferTowerTokensToPlayer(
  walletPublicKey: PublicKey,
  amount: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  if (!TOWER_TOKEN_MINT) {
    return { success: false, message: 'Tower token mint not set' };
  }

  try {
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPublicKey;

    // Treasury wallet (where game stakes are held)
    const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');
    
    // Get treasury token account
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      TREASURY_WALLET
    );

    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      walletPublicKey
    );

    // Check if user's token account exists
    try {
      await getAccount(connection, userTokenAccount);
    } catch {
      // Account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey, // payer
          userTokenAccount, // token account
          walletPublicKey, // owner
          TOWER_TOKEN_MINT // mint
        )
      );
    }

    // Calculate transfer amount with decimals
    const transferAmount = Math.floor(amount * Math.pow(10, TOWER_TOKEN_CONFIG.decimals));

    // Load treasury keypair from environment variables
    const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
    if (!TREASURY_PRIVATE_KEY) {
      throw new Error('TREASURY_PRIVATE_KEY environment variable not set');
    }
    const TREASURY_KEYPAIR = Keypair.fromSecretKey(new Uint8Array(JSON.parse(TREASURY_PRIVATE_KEY)));

    // Add transfer instruction from treasury to player
    transaction.add(
      createTransferInstruction(
        treasuryTokenAccount,
        userTokenAccount,
        TREASURY_KEYPAIR.publicKey,
        transferAmount
      )
    );

    // Sign with treasury keypair
    transaction.partialSign(TREASURY_KEYPAIR);

    // Send transaction
    const txHash = await sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction(txHash, 'confirmed');

    return {
      success: true,
      message: `Transferred ${amount} TOWER tokens from treasury`,
      txHash
    };
  } catch (error) {
    console.error('Error transferring tokens from treasury:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to transfer tokens from treasury'
    };
  }
}

// Transfer tokens from user (for game stakes)
export async function transferTowerTokensFromUser(
  walletPublicKey: PublicKey,
  amount: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  if (!TOWER_TOKEN_MINT) {
    return { success: false, message: 'Tower token mint not set' };
  }

  try {
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPublicKey;

    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      walletPublicKey
    );

    // Treasury wallet (where game stakes go)
    const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');
    
    // Get treasury token account
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      TREASURY_WALLET
    );

    // Check if treasury token account exists
    try {
      await getAccount(connection, treasuryTokenAccount);
    } catch {
      // Account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey, // payer (user pays for account creation)
          treasuryTokenAccount, // token account
          TREASURY_WALLET, // owner
          TOWER_TOKEN_MINT // mint
        )
      );
    }

    // Calculate transfer amount with decimals
    const transferAmount = Math.floor(amount * Math.pow(10, TOWER_TOKEN_CONFIG.decimals));

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        userTokenAccount,
        treasuryTokenAccount,
        walletPublicKey,
        transferAmount
      )
    );

    // Send transaction
    const txHash = await sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction(txHash, 'confirmed');

    return {
      success: true,
      message: `Transferred ${amount} TOWER tokens to game treasury`,
      txHash
    };
  } catch (error) {
    console.error('Error transferring tokens:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to transfer tokens'
    };
  }
}

// Burn tokens from treasury when player loses (reduces total supply)
export async function burnTowerTokensFromTreasury(
  amount: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  if (!TOWER_TOKEN_MINT) {
    return { success: false, message: 'Tower token mint not set' };
  }

  try {
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Treasury wallet (where game stakes are held)
    const TREASURY_WALLET = new PublicKey('HXccFqisBhUHCxPD2fSGZPyZaYJhxufie6we2fehx2NB');
    
    // Load treasury keypair from environment variables
    const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
    if (!TREASURY_PRIVATE_KEY) {
      throw new Error('TREASURY_PRIVATE_KEY environment variable not set');
    }
    const TREASURY_KEYPAIR = Keypair.fromSecretKey(new Uint8Array(JSON.parse(TREASURY_PRIVATE_KEY)));
    
    // Set treasury as fee payer
    transaction.feePayer = TREASURY_KEYPAIR.publicKey;

    // Get treasury token account
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      TREASURY_WALLET
    );

    // Calculate burn amount with decimals
    const burnAmount = Math.floor(amount * Math.pow(10, TOWER_TOKEN_CONFIG.decimals));

    // Create burn instruction (transfer to null address / burn address)
    // Since Solana doesn't have a built-in burn instruction for SPL tokens,
    // we transfer to a known burn address that no one controls
    const BURN_ADDRESS = new PublicKey('11111111111111111111111111111112'); // System Program ID (uncontrolled)
    
    // Get burn address token account
    const burnTokenAccount = await getAssociatedTokenAddress(
      TOWER_TOKEN_MINT,
      BURN_ADDRESS
    );

    // Check if burn account exists, if not create it
    try {
      await getAccount(connection, burnTokenAccount);
    } catch {
      // Account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          TREASURY_KEYPAIR.publicKey, // payer (treasury pays)
          burnTokenAccount, // token account
          BURN_ADDRESS, // owner (system program - uncontrolled)
          TOWER_TOKEN_MINT // mint
        )
      );
    }

    // Add transfer instruction from treasury to burn address (effectively burning)
    transaction.add(
      createTransferInstruction(
        treasuryTokenAccount,
        burnTokenAccount,
        TREASURY_KEYPAIR.publicKey,
        burnAmount
      )
    );

    // Sign with treasury keypair
    transaction.partialSign(TREASURY_KEYPAIR);

    // Send transaction
    const txHash = await sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction(txHash, 'confirmed');

    return {
      success: true,
      message: `Burned ${amount} TOWER tokens from treasury`,
      txHash
    };
  } catch (error) {
    console.error('Error burning tokens from treasury:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to burn tokens from treasury'
    };
  }
}