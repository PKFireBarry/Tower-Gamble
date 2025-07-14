# Tower Gamble - Solana Game

A thrilling tower climbing game built on Solana blockchain where players stake tokens to climb a tower and win bigger rewards!

## 🎮 Game Overview

Tower Gamble is a simple yet addictive game where players:
- Stake tokens to start climbing a 10-floor tower
- Each floor has a 49% chance of success (51% house edge)
- Players can cash out at any time to secure their winnings
- Payouts increase exponentially with each floor climbed
- Reach the top for maximum rewards!

## 🛠 Tech Stack

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS + Shadcn UI
- **Blockchain**: Solana Web3.js
- **Wallet**: Solana Wallet Adapter
- **Language**: TypeScript

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solana-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and connect your Solana wallet
2. **Set Stake**: Use the slider to set your stake amount (0.1 - 100 tokens)
3. **Start Game**: Click "Start Game" to begin climbing
4. **Make Decisions**: At each floor, choose to:
   - **Ascend**: Risk it all for higher rewards
   - **Cash Out**: Secure your current winnings
5. **Win or Lose**: Each ascent has a 49% success rate

## 🎲 Game Mechanics

- **House Edge**: 51% (49% player win rate)
- **Floors**: 10 total floors
- **Multiplier**: 1.5x per floor
- **Stake Range**: 0.1 - 100 tokens
- **Payout Formula**: `stake × (1.5 ^ floor)`

## 🔧 Configuration

Game settings can be modified in `src/lib/config.ts`:

```typescript
export const GAME_CONFIG = {
  name: 'Tower Gamble',
  houseEdge: 51,
  minStake: 0.1,
  maxStake: 100,
  maxFloors: 10,
  baseMultiplier: 1.5,
} as const;
```

## 📱 Features

- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Live game state updates
- **Game History**: Track your recent games
- **Wallet Integration**: Seamless Solana wallet connection
- **Toast Notifications**: User-friendly feedback
- **Progressive Web App**: Installable on mobile devices

## 🔮 Future Enhancements

- [ ] Implement actual Solana program for on-chain randomness
- [ ] Add SPL token integration
- [ ] Create leaderboards
- [ ] Add sound effects and animations
- [ ] Implement multiplayer tournaments
- [ ] Add achievement system

## 🛡 Security Note

This is a demo version using client-side randomness. For production use, implement:
- On-chain Solana program for verifiable randomness
- Proper token escrow mechanisms
- Audit smart contracts
- Implement proper access controls

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
