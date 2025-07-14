'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { GameEngine, GameState, GameStatus } from '@/lib/game-state';
import { GAME_CONFIG, RISK_PRESETS, getRiskInfo, calculatePayout } from '@/lib/config';
import { 
  ArrowUp, 
  DollarSign, 
  Trophy, 
  X, 
  Wallet, 
  RefreshCw, 
  Settings, 
  Target, 
  Coins,
  ShoppingCart,
  Play,
  Clock,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { BuyTokens } from './buy-tokens';
import { ModernHeader } from './ui/modern-header';
import { getTowerTokenBalance, transferTowerTokensFromUser, transferTowerTokensToPlayer, burnTowerTokensFromTreasury } from '@/lib/token';
import { getTokenAmountFormatted } from '@/lib/price-service';
import Image from 'next/image';

export function TowerGame() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [gameEngine] = useState(() => new GameEngine());
  const [gameState, setGameState] = useState<GameState>(() => gameEngine.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [showBuyTokens, setShowBuyTokens] = useState(false);
  const [currentPayoutFormatted, setCurrentPayoutFormatted] = useState('');
  const [tokenBalanceFormatted, setTokenBalanceFormatted] = useState('');
  const [stakeFormatted, setStakeFormatted] = useState('');
  const [insufficientBalanceFormatted, setInsufficientBalanceFormatted] = useState('');
  const [minStakeFormatted, setMinStakeFormatted] = useState('');
  const [maxStakeFormatted, setMaxStakeFormatted] = useState('');

  // Subscribe to game state changes
  useEffect(() => {
    const unsubscribe = gameEngine.subscribe(setGameState);
    return unsubscribe;
  }, [gameEngine]);

  // Update formatted values when game state changes
  useEffect(() => {
    const updateFormattedValues = async () => {
      if (gameState.currentPayout > 0) {
        const payoutFormatted = await getTokenAmountFormatted(gameState.currentPayout);
        setCurrentPayoutFormatted(payoutFormatted);
      }
      
      if (gameState.tokenBalance > 0) {
        const balanceFormatted = await getTokenAmountFormatted(gameState.tokenBalance);
        setTokenBalanceFormatted(balanceFormatted);
      }
      
      if (gameState.stake > 0) {
        const stakeFormattedValue = await getTokenAmountFormatted(gameState.stake);
        setStakeFormatted(stakeFormattedValue);
      }
      
      if (gameState.tokenBalance < gameState.stake) {
        const insufficientAmount = gameState.stake - gameState.tokenBalance;
        const insufficientFormatted = await getTokenAmountFormatted(insufficientAmount);
        setInsufficientBalanceFormatted(insufficientFormatted);
      }
      
      // Format min and max stake values
      const minStakeFormattedValue = await getTokenAmountFormatted(GAME_CONFIG.minStake);
      setMinStakeFormatted(minStakeFormattedValue);
      
      const maxStakeValue = Math.min(GAME_CONFIG.maxStake, gameState.tokenBalance);
      const maxStakeFormattedValue = await getTokenAmountFormatted(maxStakeValue);
      setMaxStakeFormatted(maxStakeFormattedValue);
    };
    
    updateFormattedValues();
  }, [gameState.currentPayout, gameState.tokenBalance, gameState.stake]);

  // Fetch token balance and SOL price when wallet connects
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (connected && publicKey) {
        try {
          const balance = await getTowerTokenBalance(publicKey);
          gameEngine.updateTokenBalance(balance);
        } catch (error) {
          console.error('Error fetching token balance:', error);
          // Set balance to 0 if error (token account doesn't exist yet)
          gameEngine.updateTokenBalance(0);
        }
      }
    };

    fetchTokenBalance();
  }, [connected, publicKey, gameEngine]);

  // Refresh token balance when game returns to idle state
  useEffect(() => {
    const refreshTokenBalance = async () => {
      if (connected && publicKey && gameState.status === 'idle') {
        try {
          const balance = await getTowerTokenBalance(publicKey);
          gameEngine.updateTokenBalance(balance);
        } catch (error) {
          console.error('Error refreshing token balance:', error);
        }
      }
    };

    // Add a small delay to ensure blockchain state is updated
    const timer = setTimeout(refreshTokenBalance, 1000);
    return () => clearTimeout(timer);
  }, [connected, publicKey, gameEngine, gameState.status]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showBuyTokens) {
        setShowBuyTokens(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showBuyTokens]);

  // Handle stake change
  const handleStakeChange = useCallback((value: number[]) => {
    if (gameState.status === 'idle') {
      gameEngine.updateStake(value[0]);
    }
  }, [gameEngine, gameState.status]);

  // Handle risk level change
  const handleRiskChange = useCallback((value: number[]) => {
    if (gameState.status === 'idle') {
      gameEngine.updateRiskLevel(value[0]);
    }
  }, [gameEngine, gameState.status]);

  // Handle risk preset selection
  const handleRiskPreset = useCallback((preset: 'conservative' | 'balanced' | 'aggressive') => {
    if (gameState.status === 'idle') {
      gameEngine.setRiskPreset(preset);
    }
  }, [gameEngine, gameState.status]);

  // Start a new game
  const handleStartGame = useCallback(async () => {
    if (!connected || !publicKey || !sendTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!gameEngine.canAffordStake()) {
      toast.error('Insufficient TOWER tokens! Please buy more tokens.');
      setShowBuyTokens(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // Transfer tokens from user to game treasury (real blockchain transaction)
      const result = await transferTowerTokensFromUser(
        publicKey,
        gameState.stake,
        sendTransaction
      );
      
      if (result.success) {
        const success = gameEngine.startGame(gameState.stake, gameState.riskLevel);
        if (success) {
          // Update local balance after successful transfer
          const newBalance = await getTowerTokenBalance(publicKey);
          gameEngine.updateTokenBalance(newBalance);
          toast.success('Game started! Tokens staked on blockchain!');
        } else {
          toast.error('Failed to start game');
        }
      } else {
        toast.error(`Failed to stake tokens: ${result.message}`);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game. Please try again.');
    }
    
    setIsLoading(false);
  }, [connected, publicKey, sendTransaction, gameEngine, gameState.stake, gameState.riskLevel]);

  // Ascend to next floor
  const handleAscend = useCallback(async () => {
    if (!connected || !publicKey || !sendTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    
    // Add some suspense delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result = await gameEngine.ascend();
    
    if (result === 'success') {
      toast.success(`Climbed to floor ${gameState.currentFloor + 1}!`);
    } else if (result === 'failure') {
      // Burn the staked tokens from treasury (deflationary mechanism)
      try {
        const burnResult = await burnTowerTokensFromTreasury(
          gameState.stake,
          sendTransaction
        );
        
        if (burnResult.success) {
          toast.error('Tower collapsed! Your tokens were burned (removed from supply).');
        } else {
          toast.error(`Tower collapsed! Failed to burn tokens: ${burnResult.message}`);
        }
        
        // Refresh token balance after losing
        const newBalance = await getTowerTokenBalance(publicKey);
        gameEngine.updateTokenBalance(newBalance);
      } catch (error) {
        console.error('Error burning tokens:', error);
        toast.error('Tower collapsed! Error processing token burn.');
      }
    } else if (result === 'error') {
      toast.error('Network error - please try again');
    } else {
      toast.error('Invalid move');
    }
    
    setIsLoading(false);
  }, [gameEngine, gameState.currentFloor, gameState.stake, connected, publicKey, sendTransaction]);

  // Cash out current winnings
  const handleCashOut = useCallback(async () => {
    if (!connected || !publicKey || !sendTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    
    try {
      // Transfer tokens from treasury to player (real blockchain transaction)
      const result = await transferTowerTokensToPlayer(
        publicKey,
        gameState.currentPayout,
        sendTransaction
      );
      
      if (result.success) {
        const success = gameEngine.cashOut();
        if (success) {
          // Update local balance after successful mint
          const newBalance = await getTowerTokenBalance(publicKey);
          gameEngine.updateTokenBalance(newBalance);
          toast.success(`Cashed out ${gameState.currentPayout} TOWER tokens on blockchain!`);
        } else {
          toast.error('Failed to cash out');
        }
      } else {
        toast.error(`Failed to transfer tokens: ${result.message}`);
      }
    } catch (error) {
      console.error('Error cashing out:', error);
      toast.error('Failed to cash out. Please try again.');
    }
    
    setIsLoading(false);
  }, [connected, publicKey, sendTransaction, gameEngine, gameState.currentPayout]);

  // Reset game
  const handleReset = useCallback(() => {
    gameEngine.reset();
    toast.success('Game reset! Ready for a new round.');
  }, [gameEngine]);

  // Handle tokens purchased
  const handleTokensPurchased = useCallback(async (amount: number) => {
    if (publicKey) {
      try {
        const newBalance = await getTowerTokenBalance(publicKey);
        gameEngine.updateTokenBalance(newBalance);
        toast.success(`Successfully purchased ${amount} TOWER tokens!`);
      } catch (error) {
        console.error('Error updating token balance:', error);
      }
    }
    setShowBuyTokens(false);
  }, [publicKey, gameEngine]);

  // Render the tower visualization
    const renderTower = () => {
    const rows = [];
    const maxFloors = GAME_CONFIG.maxFloors;
    
    // Create rows with alternating floors: left column has even floors, right column has odd floors
    for (let row = 0; row < maxFloors / 2; row++) {
      const leftFloor = maxFloors - (row * 2) - 1; // 9, 7, 5, 3, 1 (0-indexed: 8, 6, 4, 2, 0)
      const rightFloor = maxFloors - (row * 2) - 2; // 8, 6, 4, 2, 0 (0-indexed: 7, 5, 3, 1, -1)
      
      const renderFloorTile = (floorIndex: number) => {
        if (floorIndex < 0) return null;
        
        const isCurrentFloor = floorIndex === gameState.currentFloor && gameState.status === 'playing';
        const isCompletedFloor = floorIndex < gameState.currentFloor && (gameState.status === 'playing' || gameState.status === 'won' || gameState.status === 'cashed-out');
        const isNextFloor = floorIndex === gameState.currentFloor + 1 && gameState.status === 'playing';
        
        // Calculate actual dynamic payout for this floor using real game logic
        const floorPayout = calculatePayout(gameState.stake, floorIndex, gameState.riskLevel);
        const multiplier = floorPayout / gameState.stake;
        
        return (
          <div
            className={`
              relative h-16 rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all duration-300
              ${isCompletedFloor ? 'bg-success/20 text-success border border-success/30' : ''}
              ${isCurrentFloor ? 'bg-primary/20 text-primary border border-primary/30 animate-pulse' : ''}
              ${isNextFloor ? 'bg-warning/20 text-warning border border-warning/30' : ''}
              ${!isCurrentFloor && !isCompletedFloor && !isNextFloor ? 'bg-muted/10 text-muted-foreground border border-muted/20' : ''}
            `}
          >
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1
              ${isCompletedFloor ? 'bg-success text-white' : ''}
              ${isCurrentFloor ? 'bg-primary text-white' : ''}
              ${isNextFloor ? 'bg-warning text-white' : ''}
              ${!isCurrentFloor && !isCompletedFloor && !isNextFloor ? 'bg-muted text-muted-foreground' : ''}
            `}>
              {floorIndex + 1}
            </div>
            <div className="text-xs font-bold">{multiplier.toFixed(2)}x</div>
            <div className="text-[10px] opacity-75">multiplier</div>
          </div>
        );
      };
      
      rows.push(
        <div key={row} className="grid grid-cols-2 gap-2 mb-2">
          {renderFloorTile(leftFloor)}
          {renderFloorTile(rightFloor)}
        </div>
      );
    }
    
    return <div className="w-full">{rows}</div>;
  };

  // Get status color
  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case 'playing': return 'text-info';
      case 'won': return 'text-success';
      case 'lost': return 'text-destructive';
      case 'cashed-out': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  // Get status text
  const getStatusText = (status: GameStatus) => {
    switch (status) {
      case 'idle': return 'Ready to Play';
      case 'playing': return 'Climbing Tower';
      case 'won': return 'Victory!';
      case 'lost': return 'Tower Collapsed';
      case 'cashed-out': return 'Cashed Out';
      default: return 'Unknown';
    }
  };

  if (!connected) {
  return (
      <div className="min-h-screen animated-bg">
        <ModernHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <Card className="modern-card">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
            <Image 
              src="/logo.png" 
              alt="Tower Gamble Logo" 
              width={48}
              height={48}
              className="object-contain"
                  />
                  <Wallet className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-muted-foreground mb-6">
                  Connect your Solana wallet to start playing Tower Gamble and earn TOWER tokens!
                </p>
                <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground !border-none !rounded-lg !px-6 !py-3 !text-base !font-medium transition-all duration-200 hover:scale-105" />
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
    );
  }

  const riskInfo = getRiskInfo(gameState.riskLevel);

  return (
    <div className="min-h-screen animated-bg">
      <ModernHeader />
      
      <div className="container mx-auto px-4 py-4">
        {/* Main Layout - Proper proportions matching mockup */}
        <div className="flex gap-4 min-h-[calc(100vh-120px)]">
          {/* Left Column - Game Controls (25% width) */}
          <div className="w-1/4 space-y-4">
              {/* Token Balance */}
            <Card className="modern-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="w-4 h-4 text-success" />
                    Token Balance
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-lg font-bold text-success">
                  {gameState.tokenBalance.toFixed(2)} TOWER
                </div>
                <div className="text-sm text-muted-foreground">
                  {tokenBalanceFormatted || '0.00 TOWER (0.0000 SOL / $0.00 USD)'}
                  </div>
                  <Button
                    onClick={() => setShowBuyTokens(true)}
                  className="w-full btn-success h-8 text-sm"
                  >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Buy Tokens
                  </Button>
                </CardContent>
              </Card>

              {/* Risk Settings */}
            <Card className="modern-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4 text-warning" />
                    Risk Settings
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-3">
                  <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                      Quick Presets
                    </label>
                  <div className="grid grid-cols-3 gap-1">
                      {Object.entries(RISK_PRESETS).map(([key, preset]) => (
                        <Button
                          key={key}
                          variant={gameState.riskLevel === preset.risk ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleRiskPreset(key as 'conservative' | 'balanced' | 'aggressive')}
                          disabled={gameState.status !== 'idle'}
                        className={`text-xs h-7 ${
                            gameState.riskLevel === preset.risk
                            ? 'btn-primary'
                            : 'border-border text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                      Risk Level: {gameState.riskLevel}
                    </label>
                    <Slider
                      value={[gameState.riskLevel]}
                      onValueChange={handleRiskChange}
                      min={1}
                      max={10}
                      step={1}
                      disabled={gameState.status !== 'idle'}
                    className="mb-1"
                    />
                  <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Safe</span>
                    <span className={`font-medium ${riskInfo.color}`}>Low Risk</span>
                      <span>Extreme</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stake Settings */}
            <Card className="modern-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-info" />
                    Stake Amount
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-lg font-bold">{gameState.stake} TOWER</div>
                  <div className="text-sm text-muted-foreground">
                    {stakeFormatted}
                  </div>
                </div>
                    <Slider
                      value={[gameState.stake]}
                      onValueChange={handleStakeChange}
                      min={GAME_CONFIG.minStake}
                      max={Math.min(GAME_CONFIG.maxStake, gameState.tokenBalance)}
                      step={1}
                      disabled={gameState.status !== 'idle'}
                  className="mb-1"
                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{minStakeFormatted}</span>
                  <span>{maxStakeFormatted}</span>
                </div>
                </CardContent>
              </Card>
            </div>

          {/* Center Column - Tower (50% width) */}
          <div className="w-1/2">
            <Card className="modern-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-center text-base flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                    Tower Progress
                  </CardTitle>
                <div className="text-center text-sm text-muted-foreground">
                  {gameState.status === 'idle' && 'Ready to climb'}
                  {gameState.status === 'playing' && `Floor ${gameState.currentFloor + 1} - ${currentPayoutFormatted}`}
                  {gameState.status === 'won' && `Victory! ${currentPayoutFormatted} won`}
                  {gameState.status === 'lost' && 'Tower collapsed'}
                  {gameState.status === 'cashed-out' && `Cashed out: ${currentPayoutFormatted}`}
                </div>
                </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto">
                    {renderTower()}
                  </div>
                
                {/* Tower base */}
                <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted text-center">
                  <div className="text-sm text-muted-foreground">Ground Floor</div>
                  <div className="text-xs text-muted-foreground mt-1">Start your climb here</div>
                </div>
                </CardContent>
              </Card>
            </div>

          {/* Right Column - Game Actions (25% width) */}
          <div className="w-1/4 space-y-4">
              {/* Game Status */}
            <Card className="modern-card">
              <CardHeader className="pb-2">
                <CardTitle className={`text-center text-base ${getStatusColor(gameState.status)}`}>
                    {getStatusText(gameState.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Win Percentage Display (always visible) */}
                  <div className="flex flex-col items-center mb-2">
                    <span className="text-xs text-muted-foreground">Win chance if you hit:</span>
                    <span className="text-lg font-bold text-info">{gameState.winProbability.toFixed(2)}%</span>
                  </div>
                  {gameState.status === 'idle' && (
                    <div className="space-y-3">
                      {gameState.tokenBalance < gameState.stake ? (
                      <div className="text-center space-y-3">
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <p className="text-destructive text-sm font-medium mb-1">
                            Insufficient Balance
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Need {insufficientBalanceFormatted} more TOWER tokens
                          </p>
                        </div>
                          <Button
                            onClick={() => setShowBuyTokens(true)}
                          className="w-full btn-success h-8 text-sm"
                          >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                            Buy Tokens
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleStartGame}
                          disabled={isLoading}
                        className="w-full btn-primary h-10 text-sm"
                      >
                        {isLoading ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Game
                          </>
                        )}
                        </Button>
                      )}
                    </div>
                  )}

                  {gameState.status === 'playing' && (
                  <div className="space-y-3">
                      <Button
                        onClick={handleAscend}
                        disabled={isLoading}
                      className="w-full btn-primary h-10 text-sm"
                    >
                      {isLoading ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Climbing...
                        </>
                      ) : (
                        <>
                          <ArrowUp className="w-4 h-4 mr-2" />
                          Ascend
                        </>
                      )}
                      </Button>
                      <Button
                        onClick={handleCashOut}
                        disabled={isLoading}
                        variant="outline"
                      className="w-full border-success text-success hover:bg-success hover:text-white h-8 text-sm"
                      >
                      <DollarSign className="w-4 h-4 mr-1" />
                        {gameState.currentFloor === 0
                          ? `Cancel (Return Stake)`
                          : `Cash Out (${gameState.currentPayout} TOWER)`}
                      </Button>
                    </div>
                  )}

                  {(gameState.status === 'won' || gameState.status === 'lost' || gameState.status === 'cashed-out') && (
                  <div className="space-y-3">
                      {gameState.status === 'won' && (
                      <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
                        <Trophy className="w-12 h-12 text-success mx-auto mb-2" />
                        <p className="text-success text-sm font-bold">
                            You won {gameState.currentPayout} TOWER!
                          </p>
                        </div>
                      )}
                      {gameState.status === 'lost' && (
                      <div className="text-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <X className="w-12 h-12 text-destructive mx-auto mb-2" />
                        <p className="text-destructive text-sm font-bold">
                            Tower collapsed! You lost {gameState.stake} TOWER.
                          </p>
                        </div>
                      )}
                      {gameState.status === 'cashed-out' && (
                      <div className="text-center p-4 rounded-lg bg-warning/10 border border-warning/20">
                        <DollarSign className="w-12 h-12 text-warning mx-auto mb-2" />
                        <p className="text-warning text-sm font-bold">
                            Cashed out {gameState.currentPayout} TOWER!
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={handleReset}
                      className="w-full btn-primary h-8 text-sm"
                      >
                      <RefreshCw className="w-4 h-4 mr-1" />
                        Play Again
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>


            {/* Recent Games */}
              {gameState.gameHistory.length > 0 && (
              <Card className="modern-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Games</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                      {gameState.gameHistory.map((game) => (
                        <div
                          key={game.id}
                        className="flex justify-between items-center p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200"
                        >
                        <div className="text-xs">
                          <div className="text-foreground font-medium">
                              Floor {game.finalFloor + 1} • Risk {game.riskLevel}
                            </div>
                          <div className="text-muted-foreground">
                              {game.stake} TOWER stake
                            </div>
                          </div>
                        <div className={`text-xs font-bold ${
                            game.status === 'won' || game.status === 'cashed-out'
                            ? 'text-success'
                            : 'text-destructive'
                          }`}>
                            {game.status === 'won' || game.status === 'cashed-out'
                              ? `+${game.finalPayout}`
                              : `-${game.stake}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
      </div>

      {/* Buy Tokens Modal */}
      {showBuyTokens && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto modern-card">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Buy TOWER Tokens</h2>
              <button
                onClick={() => setShowBuyTokens(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <BuyTokens onTokensPurchased={handleTokensPurchased} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 