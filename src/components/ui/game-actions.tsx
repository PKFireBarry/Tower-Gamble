'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameState, GameStatus } from '@/lib/game-state';
import { 
  ArrowUp, 
  DollarSign, 
  Trophy, 
  X, 
  RefreshCw, 
  Play,
  ShoppingCart,
  Clock
} from 'lucide-react';

interface GameActionsProps {
  gameState: GameState;
  isLoading: boolean;
  onStartGame: () => void;
  onAscend: () => void;
  onCashOut: () => void;
  onReset: () => void;
  onBuyTokens: () => void;
  insufficientBalanceFormatted: string;
}

export function GameActions({
  gameState,
  isLoading,
  onStartGame,
  onAscend,
  onCashOut,
  onReset,
  onBuyTokens,
  insufficientBalanceFormatted
}: GameActionsProps) {
  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case 'playing': return 'text-info';
      case 'won': return 'text-success';
      case 'lost': return 'text-destructive';
      case 'cashed-out': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

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

  return (
    <div className="space-y-6 p-4">
      {/* Game Status */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className={`text-center ${getStatusColor(gameState.status)}`}>
            {getStatusText(gameState.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameState.status === 'idle' && (
            <div className="space-y-4">
              {gameState.tokenBalance < gameState.stake ? (
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-destructive font-medium mb-2">
                      Insufficient Balance
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Need {insufficientBalanceFormatted} more TOWER tokens
                    </p>
                  </div>
                  <Button
                    onClick={onBuyTokens}
                    className="w-full btn-success"
                    size="lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy Tokens
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={onStartGame}
                  disabled={isLoading}
                  className="w-full btn-primary text-lg py-6"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Game
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {gameState.status === 'playing' && (
            <div className="space-y-4">
              <Button
                onClick={onAscend}
                disabled={isLoading}
                className="w-full btn-primary text-lg py-6 pulse-glow"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Climbing...
                  </>
                ) : (
                  <>
                    <ArrowUp className="w-5 h-5 mr-2" />
                    Ascend
                  </>
                )}
              </Button>
              <Button
                onClick={onCashOut}
                disabled={isLoading}
                variant="outline"
                className="w-full border-success text-success hover:bg-success hover:text-white transition-all duration-200"
                size="lg"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Cash Out ({gameState.currentPayout} TOWER)
              </Button>
            </div>
          )}

          {(gameState.status === 'won' || gameState.status === 'lost' || gameState.status === 'cashed-out') && (
            <div className="space-y-4">
              {gameState.status === 'won' && (
                <div className="text-center p-6 rounded-lg bg-success/10 border border-success/20">
                  <Trophy className="w-16 h-16 text-success mx-auto mb-4" />
                  <p className="text-success text-lg font-bold">
                    You won {gameState.currentPayout} TOWER!
                  </p>
                </div>
              )}
              {gameState.status === 'lost' && (
                <div className="text-center p-6 rounded-lg bg-destructive/10 border border-destructive/20">
                  <X className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <p className="text-destructive text-lg font-bold">
                    Tower collapsed! You lost {gameState.stake} TOWER.
                  </p>
                </div>
              )}
              {gameState.status === 'cashed-out' && (
                <div className="text-center p-6 rounded-lg bg-warning/10 border border-warning/20">
                  <DollarSign className="w-16 h-16 text-warning mx-auto mb-4" />
                  <p className="text-warning text-lg font-bold">
                    Cashed out {gameState.currentPayout} TOWER!
                  </p>
                </div>
              )}
              <Button
                onClick={onReset}
                className="w-full btn-primary"
                size="lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Play Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game History */}
      {gameState.gameHistory.length > 0 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {gameState.gameHistory.map((game) => (
                <div
                  key={game.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200"
                >
                  <div className="text-sm">
                    <div className="text-foreground font-medium">
                      Floor {game.finalFloor + 1} • Risk {game.riskLevel}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {game.stake} TOWER stake
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
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
  );
} 