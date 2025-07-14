import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

// Load configuration
const tokenConfig = JSON.parse(fs.readFileSync('scripts/token-config.json', 'utf8'));
const authorityKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('scripts/token-authority.json', 'utf8')))
);

// Configuration
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
const TOKEN_MINT = new PublicKey(tokenConfig.mintAddress);

// Pool configuration
const POOL_CONFIG = {
  tokenAmount: 100000, // 100,000 TOWER tokens
  solAmount: 10, // 10 SOL
  tokenPrice: 0.0001, // 0.0001 SOL per TOWER
};

async function checkBalances() {
  console.log('🔍 Checking balances...');
  
  try {
    // Check SOL balance
    const solBalance = await connection.getBalance(authorityKeypair.publicKey);
    const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;
    
    console.log(`💰 SOL Balance: ${solBalanceFormatted.toFixed(4)} SOL`);
    
    // Check TOWER token balance
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(TOKEN_MINT, authorityKeypair.publicKey);
      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      const tokenBalance = Number(tokenAccount.amount) / Math.pow(10, tokenConfig.decimals);
      
      console.log(`🏗️ TOWER Balance: ${tokenBalance.toFixed(2)} TOWER`);
      
      // Check if we have enough for pool
      const hasEnoughSOL = solBalanceFormatted >= POOL_CONFIG.solAmount;
      const hasEnoughTokens = tokenBalance >= POOL_CONFIG.tokenAmount;
      
      console.log('\n📋 Pool Requirements:');
      console.log(`SOL Needed: ${POOL_CONFIG.solAmount} SOL ${hasEnoughSOL ? '✅' : '❌'}`);
      console.log(`TOWER Needed: ${POOL_CONFIG.tokenAmount} TOWER ${hasEnoughTokens ? '✅' : '❌'}`);
      
      if (!hasEnoughSOL || !hasEnoughTokens) {
        console.log('\n❌ Insufficient funds for pool creation!');
        if (!hasEnoughSOL) {
          console.log(`Need ${(POOL_CONFIG.solAmount - solBalanceFormatted).toFixed(4)} more SOL`);
        }
        if (!hasEnoughTokens) {
          console.log(`Need ${(POOL_CONFIG.tokenAmount - tokenBalance).toFixed(2)} more TOWER`);
        }
        return false;
      }
      
      console.log('\n✅ Ready to create liquidity pool!');
      return true;
      
    } catch (error) {
      console.log('🏗️ TOWER Balance: 0 TOWER (No token account found)');
      console.log('\n❌ No TOWER tokens found! Please mint some tokens first.');
      console.log('Run: npm run create-token');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error checking balances:', error);
    return false;
  }
}

async function createPoolInstructions() {
  console.log('\n🏊 Creating Liquidity Pool Instructions...');
  
  const poolInfo = {
    tokenMint: TOKEN_MINT.toString(),
    tokenAmount: POOL_CONFIG.tokenAmount,
    solAmount: POOL_CONFIG.solAmount,
    tokenPrice: POOL_CONFIG.tokenPrice,
    authority: authorityKeypair.publicKey.toString(),
  };
  
  console.log('\n📊 Pool Configuration:');
  console.log(`Token Mint: ${poolInfo.tokenMint}`);
  console.log(`Token Amount: ${poolInfo.tokenAmount.toLocaleString()} TOWER`);
  console.log(`SOL Amount: ${poolInfo.solAmount} SOL`);
  console.log(`Initial Price: ${poolInfo.tokenPrice} SOL per TOWER`);
  console.log(`Market Cap: $${(poolInfo.tokenAmount * poolInfo.tokenPrice * 240).toLocaleString()}`);
  
  // Save pool configuration
  fs.writeFileSync('scripts/pool-config.json', JSON.stringify(poolInfo, null, 2));
  
  return poolInfo;
}

async function generateRaydiumInstructions() {
  console.log('\n🌊 Raydium Pool Creation Instructions:');
  console.log('1. Visit: https://raydium.io/liquidity/create/');
  console.log('2. Connect your wallet');
  console.log('3. Select "Create Pool"');
  console.log('4. Configuration:');
  console.log(`   - Base Token: TOWER (${TOKEN_MINT.toString()})`);
  console.log(`   - Quote Token: SOL`);
  console.log(`   - Base Amount: ${POOL_CONFIG.tokenAmount.toLocaleString()} TOWER`);
  console.log(`   - Quote Amount: ${POOL_CONFIG.solAmount} SOL`);
  console.log(`   - Initial Price: ${POOL_CONFIG.tokenPrice} SOL per TOWER`);
  console.log('5. Review and confirm transaction');
  console.log('6. Wait for confirmation');
  console.log('7. Share pool address for listings');
}

async function generateOrcaInstructions() {
  console.log('\n🐋 Orca Pool Creation Instructions:');
  console.log('1. Visit: https://orca.so/liquidity');
  console.log('2. Connect your wallet');
  console.log('3. Select "Create Pool"');
  console.log('4. Configuration:');
  console.log(`   - Token A: TOWER (${TOKEN_MINT.toString()})`);
  console.log(`   - Token B: SOL`);
  console.log(`   - Fee Tier: 0.3% (Standard)`);
  console.log(`   - Price Range: 0.00005 - 0.0002 SOL`);
  console.log(`   - Amount A: ${POOL_CONFIG.tokenAmount.toLocaleString()} TOWER`);
  console.log(`   - Amount B: ${POOL_CONFIG.solAmount} SOL`);
  console.log('5. Review and confirm transaction');
}

async function main() {
  console.log('🚀 TOWER Token DEX Pool Creation');
  console.log('=================================');
  
  try {
    // Check if we have enough funds
    const hasEnoughFunds = await checkBalances();
    
    if (!hasEnoughFunds) {
      console.log('\n💡 To get more funds:');
      console.log('1. Get devnet SOL: https://faucet.solana.com/');
      console.log('2. Mint more TOWER tokens: npm run create-token');
      return;
    }
    
    // Create pool configuration
    await createPoolInstructions();
    
    // Generate instructions for different DEXs
    await generateRaydiumInstructions();
    await generateOrcaInstructions();
    
    console.log('\n📋 Next Steps:');
    console.log('1. Create logo (see LOGO_CREATION_GUIDE.md)');
    console.log('2. Upload metadata to IPFS');
    console.log('3. Update token metadata: npm run update-metadata');
    console.log('4. Create liquidity pools on DEXs');
    console.log('5. Apply to token registries');
    console.log('6. Submit to CoinGecko/CoinMarketCap');
    
    console.log('\n🎉 Your token is ready for exchange listings!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 