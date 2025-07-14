'use client';

import { GameState } from '@/lib/game-state';
import { GAME_CONFIG } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Trophy, Target } from 'lucide-react';

interface ModernTowerProps {
  gameState: GameState;
}

export function ModernTower({ gameState }: ModernTowerProps) {
  const renderTower = () => {
    const floors = [];
    const maxFloors = GAME_CONFIG.maxFloors;
    
    for (let i = maxFloors - 1; i >= 0; i--) {
      const isCurrentFloor = i === gameState.currentFloor && gameState.status === 'playing';
      const isCompletedFloor = i < gameState.currentFloor && gameState.status === 'playing';
      const isNextFloor = i === gameState.currentFloor + 1 && gameState.status === 'playing';
      
      floors.push(
        <div
          key={i}
          className={`
            relative h-12 border-2 rounded-lg mb-2 flex items-center justify-center text-sm font-medium transition-all duration-500 ease-in-out
            ${isCurrentFloor ? 'bg-primary/20 text-primary border-primary animate-pulse shadow-lg shadow-primary/20' : ''}
            ${isCompletedFloor ? 'bg-success/20 text-success border-success shadow-md shadow-success/10' : ''}
            ${isNextFloor ? 'bg-warning/20 text-warning border-warning/50' : ''}
            ${!isCurrentFloor && !isCompletedFloor && !isNextFloor ? 'bg-muted/20 text-muted-foreground border-muted' : ''}
            hover:scale-105 hover:shadow-lg
          `}
        >
          <div className="flex items-center gap-2">
            {isCurrentFloor && <Target className="w-4 h-4" />}
            {isCompletedFloor && <Trophy className="w-4 h-4" />}
            {i === maxFloors - 1 && <Building2 className="w-4 h-4" />}
            <span>Floor {i + 1}</span>
          </div>
          
          {/* Floor indicator */}
          {isCurrentFloor && (
            <div className="absolute -right-2 -top-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              Current
            </div>
          )}
        </div>
      );
    }
    
    return <div className="w-full space-y-1">{floors}</div>;
  };

  return (
    <Card className="modern-card h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-center text-foreground flex items-center justify-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          Tower Progress
        </CardTitle>
        <div className="text-center text-sm text-muted-foreground">
          {gameState.status === 'playing' ? `Floor ${gameState.currentFloor + 1} of ${GAME_CONFIG.maxFloors}` : 'Ready to climb'}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-full max-h-[600px] overflow-y-auto pr-2">
          {renderTower()}
        </div>
        
        {/* Tower base */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-muted text-center">
          <div className="text-sm text-muted-foreground">Ground Floor</div>
          <div className="text-xs text-muted-foreground mt-1">Start your climb here</div>
        </div>
      </CardContent>
    </Card>
  );
} 