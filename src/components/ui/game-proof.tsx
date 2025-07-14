'use client';

import { useState } from 'react';
import { GameProof } from '@/lib/game-state';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { toast } from 'sonner';

interface GameProofProps {
  proof: GameProof;
  isVisible: boolean;
  onClose: () => void;
}

export function GameProofViewer({ proof, isVisible, onClose }: GameProofProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyProof = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/game/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverSeed: proof.serverSeed,
          clientSeed: proof.clientSeed,
          nonce: proof.nonce,
          expectedHash: proof.hash
        }),
      });

      const result = await response.json();
      
      if (result.valid) {
        toast.success('✅ Proof verified! This game result is provably fair.');
      } else {
        toast.error('❌ Proof verification failed!');
      }
    } catch (error) {
      toast.error('Error verifying proof');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Game Proof - Provably Fair Verification</CardTitle>
          <CardDescription>
            This cryptographic proof ensures your game result was fair and unmanipulated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium text-gray-600">Server Seed:</label>
              <div className="font-mono bg-gray-100 p-2 rounded text-xs break-all">
                {proof.serverSeed}
              </div>
            </div>
            <div>
              <label className="font-medium text-gray-600">Client Seed:</label>
              <div className="font-mono bg-gray-100 p-2 rounded text-xs break-all">
                {proof.clientSeed}
              </div>
            </div>
            <div>
              <label className="font-medium text-gray-600">Nonce:</label>
              <div className="font-mono bg-gray-100 p-2 rounded">
                {proof.nonce}
              </div>
            </div>
            <div>
              <label className="font-medium text-gray-600">Random Value:</label>
              <div className="font-mono bg-gray-100 p-2 rounded">
                {proof.randomValue.toFixed(4)}%
              </div>
            </div>
          </div>
          
          <div>
            <label className="font-medium text-gray-600">SHA256 Hash:</label>
            <div className="font-mono bg-gray-100 p-2 rounded text-xs break-all">
              {proof.hash}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">How to verify:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Combine: server_seed + ":" + client_seed + ":" + nonce</li>
              <li>Calculate SHA256 hash of the combined string</li>
              <li>Take first 8 characters, convert to integer</li>
              <li>Normalize to 0-100 range: (value / 0xffffffff) * 100</li>
              <li>Compare with win probability: {proof.winProbability.toFixed(2)}%</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button onClick={verifyProof} disabled={isVerifying} className="flex-1">
              {isVerifying ? 'Verifying...' : 'Verify Proof'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface GameHistoryWithProofProps {
  gameHistory: Array<{ proof?: GameProof; id: string; status: string; finalFloor: number; stake: number }>;
}

export function GameHistoryWithProof({ gameHistory }: GameHistoryWithProofProps) {
  const [selectedProof, setSelectedProof] = useState<GameProof | null>(null);

  return (
    <>
      <div className="space-y-2">
        {gameHistory.map((game) => (
          <div key={game.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">
              Floor {game.finalFloor} • {game.stake} tokens • {game.status}
            </span>
            {game.proof && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProof(game.proof!)}
              >
                View Proof
              </Button>
            )}
          </div>
        ))}
      </div>

      {selectedProof && (
        <GameProofViewer
          proof={selectedProof}
          isVisible={true}
          onClose={() => setSelectedProof(null)}
        />
      )}
    </>
  );
}