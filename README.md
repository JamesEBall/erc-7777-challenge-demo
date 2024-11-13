# Robot Challenge-Response Authentication Demo

This project demonstrates how to implement and test hardware-based challenge-response authentication for robots on the Base network, based on ERC-7777. The demo shows how to distinguish between an authentic robot and an impostor using cryptographic signatures.

## Prerequisites

- Node.js (v14+ recommended)
- npm (comes with Node.js)
- A wallet with some test ETH on BASE Sepolia Testnet

## Setup

1. Clone this repository:

```bash
git clone <your-repo-url>
cd robot-demo
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```bash
touch .env
```

4. Add the following to your `.env` file:

```
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="your-wallet-private-key-without-0x"
```

To get these values:

- For RPC URL: [Chainlist](https://chainlist.org/chain/8453)
- For wallet: Export your private key from MetaMask (without the '0x' prefix)
- Get test ETH from a BASE Faucet

## Project Structure

```
robot-demo/
├── contracts/
│   └── MockRobot.sol       # Robot identity contract
├── scripts/
│   ├── deploy.js           # Basic deployment script
│   └── robot-challenge-demo.js  # Challenge-response demo
├── hardhat.config.js       # Hardhat configuration
├── .env                    # Environment variables
└── README.md              # This file
```

## Commands

1. Compile contracts:

```bash
npx hardhat compile
```

2. Deploy single robot:

```bash
npx hardhat run scripts/deploy.js --network base-sepolia
```

3. Run full challenge-response demo:

```bash
px hardhat run scripts/robot-challenge-demo.js --network base-sepolia
```

## What the Demo Does

1. Deploys two robot contracts:

   - A "real" robot with authentic hardware credentials
   - An "impostor" robot with copied metadata but different hardware keys
2. Demonstrates the challenge-response process:

   - Generates a random challenge
   - Both robots attempt to sign the challenge
   - Verifies signatures to prove authenticity
3. Shows how hardware-based authentication can:

   - Verify genuine robots
   - Detect impostors even if they copy visible identifiers

## Important Notes

- Save the deployed contract addresses and private keys that are output during deployment
- Never use the test private keys on mainnet
- The demo uses test tokens - no real value is at risk
- Gas prices may need adjustment based on network conditions

## License

MIT
