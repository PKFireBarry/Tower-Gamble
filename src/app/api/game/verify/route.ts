import { NextRequest, NextResponse } from 'next/server';
import { SecureRandomnessService } from '@/lib/secure-randomness';

export interface VerifyRequest {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  expectedHash: string;
}

export interface VerifyResponse {
  valid: boolean;
  computedHash: string;
  expectedHash: string;
  randomValue: number;
}

/**
 * API endpoint for players to verify game fairness
 * Allows verification of any past game result
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: VerifyRequest = await request.json();
    
    // Validate input
    if (!body.serverSeed || !body.clientSeed || 
        typeof body.nonce !== 'number' || !body.expectedHash) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      );
    }

    // Create proof object for verification
    const proof = {
      serverSeed: body.serverSeed,
      clientSeed: body.clientSeed,
      nonce: body.nonce,
      hash: body.expectedHash
    };

    // Verify the proof
    const isValid = SecureRandomnessService.verifyRandomness(proof);

    // Recompute the hash to show the process
    const { createHash } = await import('crypto');
    const input = `${body.serverSeed}:${body.clientSeed}:${body.nonce}`;
    const computedHash = createHash('sha256').update(input).digest('hex');
    
    // Recompute the random value
    const hashInt = parseInt(computedHash.substr(0, 8), 16);
    const randomValue = (hashInt / 0xffffffff) * 100;

    const response: VerifyResponse = {
      valid: isValid,
      computedHash,
      expectedHash: body.expectedHash,
      randomValue
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}