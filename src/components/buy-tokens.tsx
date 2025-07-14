'use client';

import React, { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTowerTokenBalance } from '@/lib/token';
import { connection } from '@/lib/config';
import { executePurchaseTransaction, sellTowerTokens, calculateSOLForTokens } from '@/lib/token-purchase';
import { getPriceDisplay, getTowerForSOL, getSOLPriceUSD } from '@/lib/price-service';
import { 
  Coins, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  Wallet,
  ArrowUpDown,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface BuyTokensProps {
  onTokensPurchased?: (amount: number) => void;
}

export function BuyTokens({ onTokensPurchased }: BuyTokensProps) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [solAmount, setSolAmount] = useState(0.1);
  const [sellTokenAmount, setSellTokenAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [solBalance, setSolBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [sellSOLAmount, setSellSOLAmount] = useState(0);
  const [calculatedTokens, setCalculatedTokens] = useState(0);
  const [solPriceUSD, setSolPriceUSD] = useState(240);
  const [calculatedUSDValue, setCalculatedUSDValue] = useState(0);


  // Get SOL balance with debouncing
  const getSolBalance = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      // If rate limited, don't retry immediately
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('Rate limited - skipping balance update');
        return;
      }
    }
  }, [publicKey]);

  // Get token balance with debouncing
  const getTokenBalance = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const balance = await getTowerTokenBalance(publicKey);
      setTokenBalance(balance);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      // If rate limited, don't retry immediately
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('Rate limited - skipping token balance update');
        return;
      }
    }
  }, [publicKey]);

  // Update price data with longer intervals
  const updatePriceData = useCallback(async () => {
    try {
      await getPriceDisplay();
    } catch (error) {
      console.error('Error fetching price data:', error);
      // Don't show toast for rate limit errors
      if (!error || !error.toString().includes('429')) {
        toast.error('Failed to fetch current prices');
      }
    }
  }, []);

  // Calculate sell SOL amount when token amount changes (debounced)
  const updateSellSOLAmount = useCallback(async () => {
    if (sellTokenAmount > 0) {
      try {
        const sol = await calculateSOLForTokens(sellTokenAmount);
        setSellSOLAmount(sol);
      } catch (error) {
        console.error('Error calculating SOL amount:', error);
        setSellSOLAmount(0);
      }
    } else {
      setSellSOLAmount(0);
    }
  }, [sellTokenAmount]);

  // Update balance when wallet connects
  React.useEffect(() => {
    if (connected && publicKey) {
      getSolBalance();
      getTokenBalance();
    }
  }, [connected, publicKey, getSolBalance, getTokenBalance]);

  // Update price data on mount and periodically (reduced frequency)
  React.useEffect(() => {
    updatePriceData();
    const interval = setInterval(updatePriceData, 60000); // Increased from 30s to 60s
    return () => clearInterval(interval);
  }, [updatePriceData]);

  // Initialize calculations on mount
  React.useEffect(() => {
    const initializeCalculations = async () => {
      try {
        const tokens = await getTowerForSOL(solAmount);
        const usdPrice = await getSOLPriceUSD();
        const usdValue = solAmount * usdPrice;
        
        setCalculatedTokens(tokens);
        setSolPriceUSD(usdPrice);
        setCalculatedUSDValue(usdValue);
      } catch (error) {
        console.error('Error initializing calculations:', error);
      }
    };

    initializeCalculations();
  }, []); // Run once on mount



  // Update sell SOL amount when token amount changes (debounced)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSellSOLAmount();
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [sellTokenAmount, updateSellSOLAmount]);

  // Calculate token amounts and USD values when SOL amount changes
  React.useEffect(() => {
    const updateCalculations = async () => {
      if (solAmount > 0) {
        try {
          const tokens = await getTowerForSOL(solAmount);
          const usdPrice = await getSOLPriceUSD();
          const usdValue = solAmount * usdPrice;
          
          setCalculatedTokens(tokens);
          setSolPriceUSD(usdPrice);
          setCalculatedUSDValue(usdValue);
        } catch (error) {
          console.error('Error calculating token amounts:', error);
        }
      } else {
        setCalculatedTokens(0);
        setCalculatedUSDValue(0);
      }
    };

    updateCalculations();
  }, [solAmount, getTowerForSOL, getSOLPriceUSD]);

  // Handle SOL amount change
  const handleSolAmountChange = useCallback((value: number[]) => {
    setSolAmount(value[0]);
  }, []);





  // Buy tokens with actual SOL transaction
  const handleBuyTokens = useCallback(async () => {
    if (!connected || !publicKey || !sendTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (solAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (solAmount > solBalance) {
      toast.error('Insufficient SOL balance');
      return;
    }

    setIsLoading(true);

    try {
      const result = await executePurchaseTransaction(
        publicKey,
        solAmount,
        sendTransaction
      );
      
      if (result.success) {
        toast.success(result.message);
        await getSolBalance();
        if (onTokensPurchased) {
          onTokensPurchased(result.tokenAmount);
        }
      } else {
        toast.error(result.message);
      }
      
    } catch (error) {
      console.error('Error buying tokens:', error);
      toast.error('Failed to purchase tokens. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, sendTransaction, solAmount, solBalance, getSolBalance, onTokensPurchased]);

  // Sell tokens
  const handleSellTokens = useCallback(async () => {
    if (!connected || !publicKey || !sendTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (sellTokenAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (sellTokenAmount > tokenBalance) {
      toast.error('Insufficient TOWER tokens');
      return;
    }

    setIsSelling(true);

    try {
      const result = await sellTowerTokens(
        publicKey,
        sellTokenAmount,
        sendTransaction
      );
      
      if (result.success) {
        toast.success(result.message);
        await getSolBalance();
        await getTokenBalance();
      } else {
        toast.error(result.message);
      }
      
    } catch (error) {
      console.error('Error selling tokens:', error);
      toast.error('Failed to sell tokens. Please try again.');
    } finally {
      setIsSelling(false);
    }
  }, [connected, publicKey, sendTransaction, sellTokenAmount, tokenBalance, getSolBalance, getTokenBalance]);

  return (
    <div className="flex gap-4 h-[500px]">
      {/* Left Column - Market Data & Portfolio */}
      <div className="w-1/3 space-y-3">
        <Card className="modern-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Live Market Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SOL Price</span>
                <span className="font-bold text-success">${solPriceUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TOWER Price</span>
                <div className="text-right">
                  <div className="font-bold text-sm">0.0001 SOL</div>
                  <div className="text-xs text-muted-foreground">${(0.0001 * solPriceUSD).toFixed(4)} USD</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium">Conversion Rates</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>1 SOL = 10,000 TOWER</div>
                <div>Fixed Rate: 0.0001 SOL / ${(0.0001 * solPriceUSD).toFixed(4)} USD per TOWER token</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-success" />
              Your Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SOL Balance</span>
              <span className="font-medium">{solBalance.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TOWER Balance</span>
              <span className="font-medium">{tokenBalance.toFixed(2)} TOWER</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border text-sm">
              <span className="text-muted-foreground">Total Portfolio Value</span>
              <span className="font-bold text-success">
                ≈ {((solBalance * 240) + (tokenBalance * 240 * 0.0001)).toFixed(2)} USD
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center Column - Buy/Sell Interface */}
      <div className="w-1/3 space-y-3">
        {/* Tab Buttons */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'buy'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Buy TOWER
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'sell'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sell TOWER
          </button>
        </div>

        {activeTab === 'buy' && (
          <Card className="modern-card">
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  SOL Amount:
                </label>
                <div className="space-y-2">
                  <div className="text-xl font-bold">{solAmount.toFixed(4)} SOL</div>
                  <div className="text-sm text-muted-foreground">≈ ${calculatedUSDValue.toFixed(2)} USD</div>
                </div>
                <Slider
                  value={[solAmount]}
                  onValueChange={handleSolAmountChange}
                  min={0.001}
                  max={solBalance}
                  step={0.001}
                  className="mt-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <div>
                    <div>0.001</div>
                    <div>SOL</div>
                  </div>
                  <div>
                    <div>${(0.001 * solPriceUSD).toFixed(2)}</div>
                    <div>USD</div>
                  </div>
                  <div>
                    <div>{solBalance.toFixed(3)}</div>
                    <div>SOL</div>
                  </div>
                  <div>
                    <div>${(solBalance * solPriceUSD).toFixed(2)}</div>
                    <div>USD</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">You will receive</span>
                </div>
                <div className="text-2xl font-bold text-primary">{calculatedTokens.toFixed(2)} TOWER</div>
                <div className="text-sm text-muted-foreground">≈ ${calculatedUSDValue.toFixed(2)} USD value</div>
              </div>

              <Button
                onClick={handleBuyTokens}
                disabled={isLoading || solAmount <= 0}
                className="w-full btn-primary h-10 text-sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    Buy {calculatedTokens.toFixed(2)} TOWER
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'sell' && (
          <Card className="modern-card">
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  TOWER Amount:
                </label>
                <Input
                  type="number"
                  value={sellTokenAmount}
                  onChange={(e) => setSellTokenAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter TOWER amount"
                  className="h-10"
                />
                <div className="text-sm text-muted-foreground mt-2">
                  Available: {tokenBalance} TOWER
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">You will receive</span>
                </div>
                <div className="text-2xl font-bold text-primary">{sellSOLAmount.toFixed(4)} SOL</div>
                <div className="text-sm text-muted-foreground">≈ ${(sellSOLAmount * solPriceUSD).toFixed(2)} USD</div>
              </div>

              <Button
                onClick={handleSellTokens}
                disabled={isSelling || sellTokenAmount <= 0}
                className="w-full btn-primary h-10 text-sm"
              >
                {isSelling ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Sell {sellTokenAmount} TOWER
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Transactions */}
      <div className="w-1/3 space-y-3">


      </div>
    </div>
  );
} 