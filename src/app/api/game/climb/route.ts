import { NextRequest, NextResponse } from 'next/server';
import { gameRandomness } from '@/lib/secure-randomness';
import { calculateWinProbability } from '@/lib/config';

export interface ClimbRequest {
  playerId: string;
  currentFloor: number;
  riskLevel: number;
  stake: number;
  clientSeed?: string;
}

export interface ClimbResponse {
  success: boolean;
  randomValue: number;
  winProbability: number;
  result: 'win' | 'loss';
  proof: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    hash: string;
  };
  serverSeedHash: string; // For transparency
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ClimbRequest = await request.json();
    
    // Validate input
    if (!body.playerId || typeof body.currentFloor !== 'number' || 
        typeof body.riskLevel !== 'number' || typeof body.stake !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Validate game constraints
    if (body.currentFloor < 0 || body.currentFloor >= 10) {
      return NextResponse.json(
        { error: 'Invalid floor number' },
        { status: 400 }
      );
    }

    if (body.riskLevel < 1 || body.riskLevel > 10) {
      return NextResponse.json(
        { error: 'Invalid risk level' },
        { status: 400 }
      );
    }

    if (body.stake < 1 || body.stake > 500) {
      return NextResponse.json(
        { error: 'Invalid stake amount' },
        { status: 400 }
      );
    }

    // Generate secure randomness
    const randomnessResult = gameRandomness.generateClimbOutcome(
      body.playerId,
      body.clientSeed
    );

    // Calculate win probability based on game rules
    const winProbability = calculateWinProbability(
      body.currentFloor,
      body.riskLevel,
      body.stake
    );

    // Determine outcome
    const result = randomnessResult.value <= winProbability ? 'win' : 'loss';

    const response: ClimbResponse = {
      success: true,
      randomValue: randomnessResult.value,
      winProbability,
      result,
      proof: randomnessResult.proof,
      serverSeedHash: gameRandomness.getServerSeedHash()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Climb API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve server seed hash for transparency
export async function GET(): Promise<NextResponse> {
  try {
    const serverSeedHash = gameRandomness.getServerSeedHash();
    
    return NextResponse.json({
      serverSeedHash,
      message: 'Server seed hash for provably fair verification'
    });

  } catch (error) {
    console.error('Get server seed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}