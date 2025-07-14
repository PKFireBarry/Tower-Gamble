'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { GameState } from '@/lib/game-state';
import { GAME_CONFIG, RISK_PRESETS, getRiskInfo } from '@/lib/config';
import { Settings, Target, TrendingUp, Coins, ShoppingCart } from 'lucide-react';

interface GameControlsProps {
  gameState: GameState;
  onStakeChange: (value: number[]) => void;
  onRiskChange: (value: number[]) => void;
  onRiskPreset: (preset: 'conservative' | 'balanced' | 'aggressive') => void;
  onBuyTokens: () => void;
  tokenBalanceFormatted: string;
  stakeFormatted: string;
  minStakeFormatted: string;
  maxStakeFormatted: string;
  currentPayoutFormatted: string;
}

export function GameControls({
  gameState,
  onStakeChange,
  onRiskChange,
  onRiskPreset,
  onBuyTokens,
  tokenBalanceFormatted,
  stakeFormatted,
  minStakeFormatted,
  maxStakeFormatted,
  currentPayoutFormatted
}: GameControlsProps) {
  const riskInfo = getRiskInfo(gameState.riskLevel);

  return (
    <div className="space-y-6 p-4">
      {/* Token Balance */}
      <Card className="modern-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5 text-success" />
            Token Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success mb-4">
            {tokenBalanceFormatted || '0 TOWER'}
          </div>
          <Button
            onClick={onBuyTokens}
            className="w-full btn-success"
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy More Tokens
          </Button>
        </CardContent>
      </Card>

      {/* Risk Settings */}
      <Card className="modern-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-warning" />
            Risk Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Risk Presets */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(RISK_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={gameState.riskLevel === preset.risk ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onRiskPreset(key as 'conservative' | 'balanced' | 'aggressive')}
                  disabled={gameState.status !== 'idle'}
                  className={`text-xs transition-all duration-200 ${
                    gameState.riskLevel === preset.risk
                      ? 'btn-primary'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Risk Slider */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Risk Level: {gameState.riskLevel}
            </label>
            <Slider
              value={[gameState.riskLevel]}
              onValueChange={onRiskChange}
              min={1}
              max={10}
              step={1}
              disabled={gameState.status !== 'idle'}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Safe</span>
              <span className={`font-medium ${riskInfo.color}`}>{riskInfo.name}</span>
              <span>Extreme</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stake Settings */}
      <Card className="modern-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-info" />
            Stake Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Stake: {gameState.stake} TOWER
            </label>
            <Slider
              value={[gameState.stake]}
              onValueChange={onStakeChange}
              min={GAME_CONFIG.minStake}
              max={Math.min(GAME_CONFIG.maxStake, gameState.tokenBalance)}
              step={1}
              disabled={gameState.status !== 'idle'}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{minStakeFormatted}</span>
              <span>{maxStakeFormatted}</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Value: {stakeFormatted}
          </div>
        </CardContent>
      </Card>

      {/* Game Stats */}
      <Card className="modern-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Game Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Win Chance:</span>
              <span className="text-foreground font-medium">
                {gameState.winProbability.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Floor:</span>
              <span className="text-foreground font-medium">
                {gameState.currentFloor + 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Potential Payout:</span>
              <span className="text-success font-medium">
                {currentPayoutFormatted || stakeFormatted}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 