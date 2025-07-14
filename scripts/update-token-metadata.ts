import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { createNft, fetchMetadata, updateMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { fromWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import fs from 'fs';
import path from 'path';

// Load configuration
const tokenConfig = JSON.parse(fs.readFileSync('scripts/token-config.json', 'utf8'));
const authorityKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('scripts/token-authority.json', 'utf8')))
);

// Configuration
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const TOKEN_MINT = new PublicKey(tokenConfig.mintAddress);

// Updated metadata for exchange listings
const UPDATED_METADATA = {
  name: 'Tower Gamble Token',
  symbol: 'TOWER',
  description: 'The native utility token for Tower Gamble - a skill-based blockchain game where players stake TOWER tokens to climb a 10-floor tower for exponential rewards. Features deflationary tokenomics with progressive risk tiers and 51% house edge.',
  image: 'https://your-domain.com/tower-token-logo.png', // Update with your actual logo URL
  external_url: 'https://your-domain.com', // Update with your actual domain
  attributes: [
    {
      trait_type: 'Type',
      value: 'Gaming Utility Token'
    },
    {
      trait_type: 'Blockchain',
      value: 'Solana'
    },
    {
      trait_type: 'Use Case',
      value: 'Tower Gamble Game Stakes'
    },
    {
      trait_type: 'Token Model',
      value: 'Deflationary'
    },
    {
      trait_type: 'Max Supply',
      value: '1,000,000,000'
    },
    {
      trait_type: 'Game Mechanics',
      value: 'Progressive Risk Tiers'
    },
    {
      trait_type: 'Win Rate',
      value: '49% (51% house edge)'
    },
    {
      trait_type: 'Network',
      value: 'Solana DevNet'
    }
  ],
  properties: {
    files: [
      {
        uri: 'https://your-domain.com/tower-token-logo.png',
        type: 'image/png'
      }
    ],
    category: 'image'
  },
  extensions: {
    website: 'https://your-domain.com',
    twitter: 'https://twitter.com/towergamble',
    telegram: 'https://t.me/towergamble',
    discord: 'https://discord.gg/towergamble',
    github: 'https://github.com/your-username/solana-game'
  }
};

async function uploadMetadataToIPFS(metadata: any): Promise<string> {
  console.log('📝 Uploading metadata to IPFS...');
  
  // For now, save to local file - you'll need to upload to IPFS manually
  const metadataPath = path.join(process.cwd(), 'public', 'updated-token-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  console.log('✅ Metadata saved to:', metadataPath);
  console.log('📋 Next steps:');
  console.log('1. Upload this file to IPFS (https://ipfs.io/)');
  console.log('2. Update the metadataUri below with your IPFS hash');
  console.log('3. Run this script again with the updated URI');
  
  // Return placeholder - replace with actual IPFS hash
  return 'https://ipfs.io/ipfs/QmYourMetadataHashHere';
}

async function updateTokenMetadata() {
  try {
    console.log('🚀 Starting token metadata update...');
    console.log('Token Mint:', TOKEN_MINT.toString());
    
    // Initialize Umi
    const umi = createUmi(SOLANA_RPC_URL);
    const umiKeypair = fromWeb3JsKeypair(authorityKeypair);
    umi.use(keypairIdentity(umiKeypair));
    
    // Upload metadata to IPFS
    const metadataUri = await uploadMetadataToIPFS(UPDATED_METADATA);
    
    // Check if metadata already exists
    try {
      const existingMetadata = await fetchMetadata(umi, {
        mint: fromWeb3JsKeypair(authorityKeypair).publicKey,
      });
      
      if (existingMetadata) {
        console.log('📝 Updating existing metadata...');
        
        await updateMetadata(umi, {
          mint: fromWeb3JsKeypair(authorityKeypair).publicKey,
          name: UPDATED_METADATA.name,
          symbol: UPDATED_METADATA.symbol,
          uri: metadataUri,
        });
        
        console.log('✅ Token metadata updated successfully!');
      }
    } catch (error) {
      console.log('📝 Creating new metadata...');
      
      // Create new metadata
      await createNft(umi, {
        mint: fromWeb3JsKeypair(authorityKeypair).publicKey,
        name: UPDATED_METADATA.name,
        symbol: UPDATED_METADATA.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: umiKeypair.publicKey,
            verified: true,
            share: 100,
          },
        ],
      });
      
      console.log('✅ Token metadata created successfully!');
    }
    
    // Update token config
    const updatedConfig = {
      ...tokenConfig,
      metadataUri,
      updatedAt: new Date().toISOString(),
      exchangeReady: true,
    };
    
    fs.writeFileSync('scripts/token-config.json', JSON.stringify(updatedConfig, null, 2));
    
    console.log('🎉 Token is now ready for exchange listings!');
    console.log('📋 Next steps:');
    console.log('1. Create a professional logo (256x256px PNG)');
    console.log('2. Upload logo and metadata to IPFS');
    console.log('3. Update the URLs in this script');
    console.log('4. Run the script again');
    console.log('5. Follow the exchange listing guide');
    
  } catch (error) {
    console.error('❌ Error updating token metadata:', error);
    process.exit(1);
  }
}

// Run the update
updateTokenMetadata(); 