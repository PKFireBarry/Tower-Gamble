import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTowerToken, mintTowerTokens, TOWER_TOKEN_CONFIG } from '../src/lib/token';
import { connection } from '../src/lib/config';
import fs from 'fs';
import path from 'path';

async function createAndDeployToken() {
  console.log('🚀 Creating TOWER Game Token...\n');

  // Create or load keypair for token authority
  const keypairPath = path.join(__dirname, 'token-authority.json');
  let authority: Keypair;

  try {
    if (fs.existsSync(keypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
      authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
      console.log('✅ Loaded existing token authority:', authority.publicKey.toBase58());
    } else {
      authority = Keypair.generate();
      fs.writeFileSync(keypairPath, JSON.stringify(Array.from(authority.secretKey)));
      console.log('✅ Generated new token authority:', authority.publicKey.toBase58());
    }
  } catch (error) {
    console.error('❌ Error with token authority:', error);
    return;
  }

  // Check authority balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log('💰 Authority balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('⚠️  Low balance! Please fund the authority wallet with some SOL:');
    console.log('   Address:', authority.publicKey.toBase58());
    console.log('   You can get devnet SOL from: https://faucet.solana.com/');
    return;
  }

  try {
    // Create the token
    console.log('\n🏗️  Creating TOWER token...');
    const mintAddress = await createTowerToken(
      authority,
      authority.publicKey, // mint authority
      authority.publicKey  // freeze authority (optional)
    );

    console.log('✅ Token created successfully!');
    console.log('📍 Mint Address:', mintAddress.toBase58());

    // Initial token supply to mint
    const initialSupply = 100_000_000; // 100 million tokens for initial distribution
    
    console.log('\n💎 Minting initial supply...');
    const mintSignature = await mintTowerTokens(
      authority,
      authority.publicKey,
      initialSupply
    );

    console.log('✅ Minted', initialSupply.toLocaleString(), 'TOWER tokens');
    console.log('📝 Mint Transaction:', mintSignature);

    // Save token configuration
    const tokenConfig = {
      mintAddress: mintAddress.toBase58(),
      authority: authority.publicKey.toBase58(),
      network: 'devnet',
      createdAt: new Date().toISOString(),
      ...TOWER_TOKEN_CONFIG
    };

    const configPath = path.join(__dirname, 'token-config.json');
    fs.writeFileSync(configPath, JSON.stringify(tokenConfig, null, 2));

    console.log('\n📋 Token Summary:');
    console.log('   Name:', TOWER_TOKEN_CONFIG.name);
    console.log('   Symbol:', TOWER_TOKEN_CONFIG.symbol);
    console.log('   Decimals:', TOWER_TOKEN_CONFIG.decimals);
    console.log('   Total Supply:', TOWER_TOKEN_CONFIG.totalSupply.toLocaleString());
    console.log('   Initial Minted:', initialSupply.toLocaleString());
    console.log('   Mint Address:', mintAddress.toBase58());
    console.log('   Authority:', authority.publicKey.toBase58());

    console.log('\n🎯 Next Steps:');
    console.log('1. Add this mint address to your .env file:');
    console.log('   NEXT_PUBLIC_TOWER_TOKEN_MINT=' + mintAddress.toBase58());
    console.log('2. Update your game to use real token transactions');
    console.log('3. Create token metadata for exchanges');
    console.log('4. Set up liquidity pools on DEXs like Raydium or Orca');

    console.log('\n💼 For Exchange Listings:');
    console.log('   - Token Contract:', mintAddress.toBase58());
    console.log('   - Network: Solana');
    console.log('   - Decimals:', TOWER_TOKEN_CONFIG.decimals);
    console.log('   - Total Supply:', TOWER_TOKEN_CONFIG.totalSupply.toLocaleString());

  } catch (error) {
    console.error('❌ Error creating token:', error);
  }
}

// Run the script
createAndDeployToken().catch(console.error); 