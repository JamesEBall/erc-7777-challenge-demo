const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Generate new robot wallet
  const robotWallet = ethers.Wallet.createRandom();
  const robotPublicKeyBytes32 = ethers.keccak256(
    ethers.toUtf8Bytes(robotWallet.address)
  );

  console.log("\nGenerated robot wallet:", robotWallet.address);

  // Fund the robot wallet with initial BASE
  console.log("\nFunding robot wallet with initial BASE...");
  const fundingTx = await deployer.sendTransaction({
    to: robotWallet.address,
    value: ethers.parseEther("0.01") // Send 0.01 BASE
  });
  await fundingTx.wait();
  console.log("Funded robot wallet with 0.01 BASE");

  // Get the contract factory
  const MockRobot = await ethers.getContractFactory("MockRobot");
  
  console.log("\nDeploying robot contract...");
  const robot = await MockRobot.deploy(
    robotPublicKeyBytes32,
    "JetsonBot",
    "PhysicalOperator",
    "Jetson-1",
    "JETSON001"
  );

  await robot.waitForDeployment();
  const robotAddress = await robot.getAddress();
  console.log("Robot deployed to:", robotAddress);

  // Save the robot configuration
  const robotConfig = {
    network: hre.network.name,
    robotAddress: robotAddress,
    robotPrivateKey: robotWallet.privateKey,
    publicKeyHash: robotPublicKeyBytes32,
    rpcUrl: "https://sepolia.base.org",
    timestamp: new Date().toISOString()
  };

  // Ensure robot directory exists
  const configDir = path.join(__dirname, '..', 'robot');
  if (!fs.existsSync(configDir)){
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, 'config.json'),
    JSON.stringify(robotConfig, null, 2)
  );

  console.log("\nRobot configuration saved to robot/config.json");
  console.log("Robot wallet funded with 0.01 BASE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });