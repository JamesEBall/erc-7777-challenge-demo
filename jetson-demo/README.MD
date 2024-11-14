# Jetson Robot Demo

This demo shows how to deploy a robot contract, run the verifier, and test the challenge-response system on Base Sepolia.

## Prerequisites

- Python 3.11+
- Node.js 14+
- Account with BASE Sepolia testnet ETH
- `.env` file with:
  ```bash
  BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
  PRIVATE_KEY="your-wallet-private-key"
  ```


## Steps

**Deploy Robot Contract**

 First, deploy the robot contract and create its configuration:

```
npx hardhat run jetson-demo/deploy/deploy-robot.js –network base-sepolia
```

This will:

- Create a new wallet for the robot
- Deploy the contract
- Save config to `robot/config.json`
- Fund robot with initial BASE

**Run Verifier**

In a new terminal, start the robot verifier

```
cd jetson-demo
python robot/verifier.py
```

The verifier will:

- Load the robot's config
- Connect to Base Sepolia
- Monitor for incoming challenges
- Automatically sign and respond to challenges

**Run Challenge Demo**

In another terminal, run the demo script to test the challenge-response:

```
npx hardhat run jetson-demo/scripts/jetson-challenge-demo.js –network base-sepolia
```

This will:

- Generate a challenge
- Wait for the verifier to respond
- Verify the signature
- Show the results

## Expected Output

- The demo script will generate a challenge
- The verifier will detect it and sign automatically
- The demo will show if verification succeeded or failed

## Troubleshooting

- If verifier can't find config: Make sure you ran the deploy script first
- If transactions fail: Check robot wallet has enough BASE
- If verification fails: Check robot's private key in config matches deployed contract
