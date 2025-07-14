'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Wallet } from 'lucide-react';
import { getSolanaExplorerUrl, truncateAddress } from '@/lib/utils';
import Image from 'next/image';

export function ModernHeader() {
  const { connected, publicKey } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="Tower Gamble Logo" 
                width={40}
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold gradient-text">Tower Gamble</h1>
                <p className="text-sm text-muted-foreground">Climb the tower, win big!</p>
              </div>
            </div>
          </div>

          {/* Wallet Section */}
          <div className="flex items-center gap-4">
            {connected && publicKey && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono">
                  {truncateAddress(publicKey.toString(), 4, 4)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(getSolanaExplorerUrl(publicKey, 'devnet'), '_blank')}
                  className="p-1 h-auto hover:bg-accent"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground !border-none !rounded-lg !px-4 !py-2 !text-sm !font-medium transition-all duration-200 hover:scale-105" />
          </div>
        </div>
      </div>
    </header>
  );
} 